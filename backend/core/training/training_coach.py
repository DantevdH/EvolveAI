"""
Enhanced training Coach Agent with AI Question Generation and Training Plan Creation
Includes ACE (Adaptive Context Engine) pattern for personalized learning
"""

import os
import json
import openai
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from core.base.base_agent import BaseAgent
from logging_config import get_logger
from core.base.rag_service import RAGTool
from core.base.ace_telemetry import ACETelemetry
from settings import settings

# Import schemas and services
from core.training.schemas.training_schemas import (
    TrainingPlan,
    WeeklySchedule,
    DailyTraining,
    StrengthExercise,
    EnduranceSession,
    WeeklyScheduleResponse,
    WeeklyOutlinePlan,
    AIStrengthExercise,
    MainMuscleEnum,
    EquipmentEnum,
    ModalityDecision,
)
from core.training.helpers.exercise_selector import ExerciseSelector
from core.training.helpers.exercise_validator import ExerciseValidator
from core.training.helpers.database_service import db_service
from core.training.helpers.models import (
    GenerateTrainingRequest,
    GenerateTrainingResponse,
)
from core.training.schemas.question_schemas import (
    AIQuestionResponse,
    AIQuestionResponseWithFormatted,
    PersonalInfo,
    AIQuestion,
    QuestionOption,
    AthleteTypeClassification,
    QuestionContent,
    FeedbackIntentClassification,
)
from core.training.helpers.response_formatter import ResponseFormatter
from core.training.helpers.prompt_generator import PromptGenerator
from core.training.helpers.question_checklist_loader import merge_question_checklists
from core.training.helpers.mock_data import (
    create_mock_initial_questions,
    create_mock_training_plan,
)
import logging

# Import ACE pattern components
from core.base.schemas.playbook_schemas import (
    UserPlaybook,
    PlaybookLesson,
    TrainingOutcome,
    ReflectorAnalysis,
    PlaybookStats,
    LessonApplication,
)
from core.base.reflector import Reflector, ReflectorAnalysisList
from core.base.curator import Curator
from core.training.helpers.llm_client import LLMClient


class TrainingCoach(BaseAgent):
    """
    Enhanced training Coach that provides AI-generated questions and training plans.
    Includes ACE (Adaptive Context Engine) for personalized learning from feedback.
    """

    def __init__(self):
        # Initialize logger
        self.logger = get_logger(__name__)
        # Initialize the base agent with training-specific configuration
        super().__init__(
            agent_name="training Coach",
            agent_description="Expert in strength training, muscle building, weight loss routines, and training planning",
            topic="training",  # This automatically filters documents by topic
        )

        self.last_modality_rationale: Optional[str] = None

        # Initialize RAG tool for training-specific knowledge retrieval
        self.rag_service = RAGTool(self)

        # Initialize exercise services
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()

        # Initialize ACE pattern components
        # Reflector and Curator create their own LLMClient instances internally
        self.reflector = Reflector(None)
        self.curator = Curator(None)
        # Unified LLM client (supports OpenAI, Gemini, Claude, etc. via Instructor)
        self.llm = LLMClient()

    def _get_capabilities(self) -> List[str]:
        """Get the agent's capabilities."""
        return [
            "training_plan_generation",
            "exercise_recommendation",
            "training_question_generation",
            "training_plan_creation",
            "exercise_validation",
            "training_knowledge_retrieval",
        ]
    
    def _filter_valid_questions(self, questions: List[AIQuestion]) -> List[AIQuestion]:
        """
        Filter questions to only include valid ones.
        Invalid questions are logged but don't break the flow.
        
        Args:
            questions: List of AI-generated questions
            
        Returns:
            List of valid questions only
        """
        valid_questions = []
        
        def sanitize_string(s: Optional[str]) -> Optional[str]:
            """Remove common JSON artifacts from strings."""
            if not s or not isinstance(s, str):
                return s
            # Strip JSON patterns: },{ and other artifacts
            cleaned = s.replace("},{", "").replace("{", "").replace("}", "").strip()
            return cleaned if cleaned else s
        
        for question in questions:
            try:
                # Sanitize string fields to remove JSON artifacts (use getattr for optional fields)
                if hasattr(question, 'unit') and question.unit:
                    question.unit = sanitize_string(question.unit)
                if hasattr(question, 'placeholder') and question.placeholder:
                    question.placeholder = sanitize_string(question.placeholder)
                if hasattr(question, 'min_description') and question.min_description:
                    question.min_description = sanitize_string(question.min_description)
                if hasattr(question, 'max_description') and question.max_description:
                    question.max_description = sanitize_string(question.max_description)
                
                # Check basic requirements based on type
                is_valid = True
                
                if question.response_type == "slider":
                    # SLIDER must have min, max, step, unit
                    if not all([
                        question.min_value is not None,
                        question.max_value is not None,
                        question.step is not None,
                        question.unit is not None
                    ]):
                        self.logger.warning(
                            f"Invalid SLIDER question '{question.id}': missing required fields "
                            f"(min_value, max_value, step, or unit). AI may have generated incomplete question."
                        )
                        is_valid = False
                
                elif question.response_type in ["multiple_choice", "dropdown"]:
                    # Must have options with at least 2 items
                    if not question.options or len(question.options) < 2:
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': needs at least 2 options. "
                            f"AI may have generated question without proper options."
                        )
                        is_valid = False
                    # Must have multiselect explicitly set
                    if question.multiselect is None:
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': multiselect must be explicitly set. "
                            f"AI may have omitted this required field."
                        )
                        is_valid = False
                
                elif question.response_type == "rating":
                    # RATING must have min/max values and descriptions
                    if not all([
                        question.min_value is not None,
                        question.max_value is not None,
                        question.min_description is not None,
                        question.max_description is not None
                    ]):
                        self.logger.warning(
                            f"Invalid RATING question '{question.id}': missing required fields "
                            f"(min/max values or descriptions). AI may have generated incomplete question."
                        )
                        is_valid = False
                
                elif question.response_type in ["free_text", "conditional_boolean"]:
                    # Must have max_length and placeholder
                    if not all([
                        question.max_length is not None,
                        question.placeholder is not None
                    ]):
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': missing required fields "
                            f"(max_length or placeholder). AI may have generated incomplete question."
                        )
                        is_valid = False
                
                if is_valid:
                    valid_questions.append(question)
                else:
                    self.logger.warning(
                        f"Excluding invalid question '{question.id}': '{question.text}'. "
                        f"Question will be skipped to prevent frontend errors."
                    )
                    
            except Exception as e:
                self.logger.error(
                    f"Exception while validating question '{question.id}': {str(e)}. "
                    f"Question structure may be malformed. Skipping to prevent crash."
                )
                # Skip this question
                continue
        
        return valid_questions

    def _postprocess_questions(self, questions: List[AIQuestion]) -> List[AIQuestion]:
        """
        Post-process questions to convert multiple_choice with >4 options to dropdown.
        
        Args:
            questions: List of validated questions
            
        Returns:
            List of post-processed questions
        """
        postprocessed = []
        converted_count = 0
        
        for question in questions:
            # Check if it's a multiple_choice question with more than 4 options
            if (question.response_type == "multiple_choice" and 
                question.options and 
                len(question.options) > 4):
                
                # Convert to dropdown
                question.response_type = "dropdown"
                converted_count += 1
                self.logger.info(
                    f"Converted question '{question.id}' from multiple_choice to dropdown "
                    f"(had {len(question.options)} options)"
                )
            
            postprocessed.append(question)
        
        if converted_count > 0:
            self.logger.info(f"Post-processed {converted_count} question(s) from multiple_choice to dropdown")
        
        return postprocessed

    async def _decide_modalities(
        self,
        personal_info: PersonalInfo,
        user_playbook=None,
        formatted_initial_responses: Optional[str] = None,
    ) -> Tuple[bool, bool, bool]:
        """
        Lightweight LLM call to decide whether to include bodyweight strength, equipment strength, and endurance modalities.
        Falls back to bodyweight strength + endurance on failure.
        """
        self.last_modality_rationale = None
        prompt = PromptGenerator.generate_modality_selection_prompt(
            personal_info=personal_info,
            onboarding_responses=formatted_initial_responses,
            user_playbook=user_playbook,
        )

        try:
            ai_start = time.time()
            decision, completion = self.llm.parse_structured(
                prompt,
                ModalityDecision,
                model_type="lightweight",
            )
            duration = time.time() - ai_start
            await db_service.log_latency_event("modality_selection", duration, completion)

            rationale = (decision.rationale or "").strip()
            if not rationale:
                rationale = "Model returned modalities without an explicit rationale."

            self.logger.info(
                (
                    "Modality decision → bodyweight_strength=%s equipment_strength=%s "
                    "endurance=%s | rationale=%s"
                ),
                decision.include_bodyweight_strength,
                decision.include_equipment_strength,
                decision.include_endurance,
                rationale,
            )
            self.last_modality_rationale = rationale
            return (
                decision.include_bodyweight_strength,
                decision.include_equipment_strength,
                decision.include_endurance,
            )
        except Exception as exc:
            # Log detailed error info for debugging
            error_context = f"Model: {self.llm.lightweight_model_name}"
            self.logger.error(
                "Modality selection failed: %s | Context: %s | "
                "Falling back to include both modalities.",
                str(exc),
                error_context,
                exc_info=True,
            )
            self.last_modality_rationale = "Fallback: include bodyweight strength + endurance due to decision error"
            return True, False, True

    async def _generate_future_week_outlines(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        existing_plan: Dict[str, Any],
        outline_weeks: int = 12,
    ) -> Dict[str, Any]:
        """Generate lightweight focus summaries for upcoming weeks (outline only)."""
        try:
            weekly_schedules = existing_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                self.logger.warning("Cannot generate outlines—no weekly schedules available.")
                return {}

            last_week_number = max(
                ws.get("week_number", idx + 1) for idx, ws in enumerate(weekly_schedules)
            )
            start_week_number = last_week_number + 1

            completed_summary = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": weekly_schedules}
            )

            prompt = PromptGenerator.generate_future_week_outline_prompt(
                personal_info=personal_info,
                onboarding_responses=formatted_initial_responses,
                completed_weeks_summary=completed_summary,
                start_week_number=start_week_number,
                total_weeks=outline_weeks,
            )

            self.logger.info(
                "📝 Generating outline for weeks %s-%s...",
                start_week_number,
                start_week_number + outline_weeks - 1,
            )

            ai_start = time.time()
            outline_plan, completion = self.llm.parse_structured(
                prompt, WeeklyOutlinePlan, model_type="lightweight"
            )
            latency = time.time() - ai_start
            await db_service.log_latency_event("week_outline_generation", latency, completion)

            return outline_plan.model_dump()
        except Exception as exc:
            self.logger.error(f"Failed to generate future week outlines: {str(exc)}")
            return {}

    def process_request(self, user_request: str) -> str:
        """Process a user request - required by BaseAgent."""
        return self.process_training_request(user_request)

    def process_training_request(
        self, user_request: str, context: Dict[str, Any] = None
    ) -> str:
        """
        Process training-related requests using RAG-enhanced knowledge retrieval.

        Args:
            user_request: The user's training-related question or request
            context: Additional context for the request

        Returns:
            Formatted training response with relevant information
        """
        try:
            # Search for relevant training documents
            relevant_docs = self.rag_service.search_knowledge_base(
                query=user_request, max_results=5, metadata_filters=None
            )

            if relevant_docs:
                # Use RAG tool to generate response with context
                response = self.rag_service.generate_response(
                    user_request, relevant_docs, context=context
                )
                return self._format_training_response(response, relevant_docs)
            else:
                # Fallback to general training guidance
                return self._generate_fallback_response(user_request)

        except Exception as e:
            self.logger.error(
                f"Failed to process training request: {str(e)}. "
                f"Check RAG service availability and knowledge base connectivity."
            )
            return self._generate_error_response(user_request)

    async def generate_initial_questions(
        self, personal_info: PersonalInfo, user_profile_id: Optional[int] = None
    ) -> AIQuestionResponse:
        """
        Generate initial questions using the new 4-step flow:
        Step 1: Athlete Type Classification
        Step 2: Load & Merge Question Checklists
        Step 3: Generate Question Content
        Step 4: Format Questions
        """
        try:
            # Check if debug mode is enabled
            if settings.DEBUG:
                initial_questions = create_mock_initial_questions()
                return initial_questions

            # ===== STEP 1: Athlete Type Classification =====
            self.logger.info("Step 1: Classifying athlete type...")
            classification_prompt = PromptGenerator.generate_athlete_type_classification_prompt(
                personal_info.goal_description
            )
            
            ai_start = time.time()
            classification, completion = self.llm.parse_structured(
                classification_prompt,
                AthleteTypeClassification,
                model_type="lightweight",
            )
            classification_duration = time.time() - ai_start
            
            await db_service.log_latency_event(
                "athlete_type_classification", classification_duration, completion
            )
            
            athlete_type_dict = {
                "primary_type": classification.primary_type,
                "secondary_types": list(classification.secondary_types),
                "confidence": classification.confidence,
                "reasoning": classification.reasoning,
            }
            
            self.logger.info(
                f"Classified as: {athlete_type_dict['primary_type']} "
                f"(confidence: {classification.confidence:.2f}) "
                f"Reasoning: {classification.reasoning}"
            )

            # ===== STEP 2: Load & Merge Question Themes =====
            self.logger.info("Step 2: Loading and merging question themes...")
            unified_checklist = merge_question_checklists(
                primary_type=athlete_type_dict["primary_type"],
                secondary_types=athlete_type_dict["secondary_types"],
                confidence=classification.confidence,
                personal_info=personal_info,
            )
            self.logger.info(f"Merged themes have {len(unified_checklist)} items")

            # ===== STEP 3: Generate Question Content =====
            self.logger.info("Step 3: Generating question content...")
            content_prompt = PromptGenerator.generate_question_content_prompt_initial(
                personal_info=personal_info,
                unified_checklist=unified_checklist,
                athlete_type=athlete_type_dict,
            )
            
            ai_start = time.time()
            question_content, completion = self.llm.parse_structured(
                content_prompt, QuestionContent, model_type="lightweight"
            )
            content_duration = time.time() - ai_start
            
            await db_service.log_latency_event(
                "initial_question_generation", content_duration, completion
            )
            

            
            self.logger.info(f"Generated {len(question_content.questions_content)} question content items")

            # ===== STEP 4: Format Questions =====
            self.logger.info("Step 4: Formatting questions into schema...")
            # Sort questions by order field, then convert to dict for prompt
            sorted_questions = sorted(question_content.questions_content, key=lambda x: x.order)
            content_dicts = [
                {
                    "question_text": item.question_text,
                    "order": item.order,
                }
                for item in sorted_questions
            ]
            
            formatting_prompt = PromptGenerator.generate_question_formatting_prompt(
                question_content=content_dicts,
                personal_info=personal_info,
                is_initial=True,
            )
            
            ai_start = time.time()
            questions_response, completion = self.llm.parse_structured(
                formatting_prompt, AIQuestionResponse, model_type="lightweight"
            )
            formatting_duration = time.time() - ai_start
            
            await db_service.log_latency_event(
                "initial_question_formatting", formatting_duration, completion
            )
            
            # Filter out invalid questions
            valid_questions = self._filter_valid_questions(questions_response.questions)
            
            if len(valid_questions) < len(questions_response.questions):
                self.logger.warning(
                    f"Filtered out {len(questions_response.questions) - len(valid_questions)} invalid questions"
                )
            
            # Post-process: convert multiple_choice with >4 options to dropdown
            postprocessed_questions = self._postprocess_questions(valid_questions)
            
    
            # Sort by order field to maintain logical ordering (frontend can use this)
            valid_questions_sorted = sorted(
                postprocessed_questions, 
                key=lambda q: q.order if q.order is not None else 999
            )
            
            # Update response with valid questions only
            questions_response.questions = valid_questions_sorted
            questions_response.total_questions = len(valid_questions_sorted)
            
            total_duration = classification_duration + content_duration + formatting_duration
            self.logger.info(
                f"Successfully generated {len(valid_questions_sorted)} questions "
                f"(total: {total_duration:.2f}s)"
            )

            return questions_response

        except Exception as e:
            self.logger.error(
                f"Failed to generate initial questions: {str(e)}. "
                f"Check AI model availability, prompt generation, or question formatting."
            )
            # Return a fallback response
            fallback_response = AIQuestionResponse(
                questions=[
                    AIQuestion(
                        id="fallback_1",
                        text="What is your primary training goal?",
                        response_type="multiple_choice",
                        options=[
                            QuestionOption(
                                id="goal_1", text="Build Muscle", value="build_muscle"
                            ),
                            QuestionOption(
                                id="goal_2", text="Lose Weight", value="lose_weight"
                            ),
                            QuestionOption(
                                id="goal_3",
                                text="Improve Strength",
                                value="improve_strength",
                            ),
                            QuestionOption(
                                id="goal_4",
                                text="General training",
                                value="general_training",
                            ),
                        ],
                    )
                ],
                total_questions=1,
                estimated_time_minutes=2,
                ai_message="I'm here to help you create the perfect training plan! Let's start with understanding your goals. 💪",
            )
            return fallback_response

    # follow-up question generation removed (feature deprecated)

    async def generate_initial_training_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        user_profile_id: int,
        jwt_token: str = None,
    ) -> Dict[str, Any]:
        """
        Generate the initial training plan (Week 1) during onboarding.
        
        Creates full TrainingPlan structure (title, summary, justification) with ONLY Week 1.
        The AI generates the plan title, summary, and justification.
        We re-assess by week and adjust.
        
        Uses formatted_initial_responses directly for plan generation.
        
        Args:
            personal_info: User's personal information and goals
            formatted_initial_responses: Formatted string of user responses
            user_profile_id: Database ID of the user profile (also used for latency tracking)
            jwt_token: JWT token for database authentication
            
        Returns:
            Dict with "success" (bool), "training_plan" (dict), and optional "error" (str)
        """
        try:
            # Check if debug mode is enabled
            if settings.DEBUG:
                self.logger.debug("DEBUG MODE: Using mock training plan")
                training_plan = create_mock_training_plan()
                training_dict = training_plan.model_dump()
                
                return {
                    "success": True,
                    "training_plan": training_dict,
                    "metadata": {
                        "validation_messages": ["Debug mode: Using mock data"],
                        "generation_method": "Mock Data (Debug Mode)",
                    },
                }
            
            # Determine modalities to include
            (
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            ) = await self._decide_modalities(
                personal_info,
                formatted_initial_responses=formatted_initial_responses,
            )

            # Step 2: Generate prompt for initial Week 1
            self.logger.info(
                "📝 Generating training plan prompt (bodyweight_strength=%s equipment_strength=%s endurance=%s)...",
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            )
            rationale = self.last_modality_rationale or "Default: include both modalities for balanced development."
            prompt = PromptGenerator.generate_initial_training_plan_prompt(
                personal_info=personal_info,
                onboarding_responses=formatted_initial_responses,
                include_bodyweight_strength=include_bodyweight_strength,
                include_equipment_strength=include_equipment_strength,
                include_endurance=include_endurance,
                modality_rationale=rationale,
            )
            
            # Step 4: Generate full TrainingPlan with AI (but only Week 1 in weekly_schedules)
            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"🤖 Generating training plan with AI ({model_name})...")
            
            ai_start = time.time()
            training_plan, completion = self.llm.parse_structured(
                prompt, TrainingPlan, model_type="complex"
            )
            ai_duration = time.time() - ai_start
            training_dict = training_plan.model_dump()
            
            # Post-process LLM response: Fix reps/weight arrays to match sets count and sort (high->low)
            training_dict = self.exercise_validator.normalize_reps_weight_arrays(training_dict)
            
            training_dict["user_profile_id"] = user_profile_id
            
            # Verify only Week 1 is generated
            num_weeks = len(training_dict.get("weekly_schedules", []))
            if num_weeks != 1:
                self.logger.warning(
                    f"AI generated {num_weeks} weeks instead of 1. "
                    f"Using only first week to maintain single-week generation policy."
                )
                training_dict["weekly_schedules"] = training_dict.get("weekly_schedules", [])[:1]
            
            # Ensure Week 1 has week_number = 1
            if training_dict.get("weekly_schedules"):
                training_dict["weekly_schedules"][0]["week_number"] = 1
            
            # Step 5: Post-process and validate exercises
            self.logger.info("🔍 Matching AI exercises to database...")
            validated_plan = self.exercise_validator.post_process_strength_exercises(training_dict)
            
            self.logger.info("✅ Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                validated_plan
            )
            
            # Ensure user_profile_id is set
            validated_plan["user_profile_id"] = user_profile_id
            
            # Step 6: Track latency
            await db_service.log_latency_event("initial_week", ai_duration, completion)
            
            return {
                "success": True,
                "training_plan": validated_plan,  # Full plan structure with title, summary, justification (only Week 1)
                "completion_message": validated_plan.get("ai_message"),  # Extract from plan if available
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                },
            }
            
        except Exception as e:
            self.logger.error(
                f"Failed to generate initial training plan: {str(e)}. "
                f"Check AI model availability and prompt generation."
            )
            return {"success": False, "error": str(e)}
    
    async def update_weekly_schedule(
        self,
        personal_info: PersonalInfo,
        feedback_message: str,
        week_number: int,
        current_week: Dict[str, Any],
        user_profile_id: int,
        user_playbook,
        jwt_token: str = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Update an existing week based on user feedback.
        
        Updates ONLY the specified week and returns only the updated week.
        The frontend is responsible for merging it back into the full plan.
        We re-assess by week and adjust.
        
        Args:
            personal_info: User's personal information and goals
            feedback_message: User's feedback message requesting week changes
            week_number: Week number to update (e.g., 1, 2, 3, etc.)
            current_week: Current week data (WeeklySchedule dict) to update
            user_profile_id: Database ID of the user profile
            user_playbook: User's playbook with learned lessons (instead of onboarding responses)
            jwt_token: JWT token for database authentication
            conversation_history: Optional conversation history for context-aware updates
            
        Returns:
            Dict with "success", "training_plan" (containing only the updated week in weekly_schedules),
            and "ai_message"
        """
        try:
            # Build week summary - data should already be in backend format with enriched fields
            week_summary = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": [current_week]}
            )
            
            # Format conversation history for prompt
            conversation_history_str = None
            if conversation_history and len(conversation_history) > 0:
                conversation_lines = []
                for msg in conversation_history[-10:]:  # Last 10 messages for context
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        conversation_lines.append(f"{role.capitalize()}: {content}")
                if conversation_lines:
                    conversation_history_str = "\n".join(conversation_lines)

            (
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            ) = await self._decide_modalities(
                personal_info, user_playbook
            )

            # Step 2: Generate prompt for updating week (uses user_playbook instead of onboarding responses)
            self.logger.info(
                "📝 Generating update prompt for Week %s (bodyweight_strength=%s equipment_strength=%s endurance=%s)...",
                week_number,
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            )
            rationale = self.last_modality_rationale or "Default: include both modalities for balanced development."
            prompt = PromptGenerator.update_weekly_schedule_prompt(
                personal_info=personal_info,
                feedback_message=feedback_message,
                week_number=week_number,
                current_week_summary=week_summary,
                user_playbook=user_playbook,
                include_bodyweight_strength=include_bodyweight_strength,
                include_equipment_strength=include_equipment_strength,
                include_endurance=include_endurance,
                modality_rationale=rationale,
                conversation_history=conversation_history_str,
            )
            
            # Step 4: Generate updated WeeklySchedule with AI (using response schema that includes ai_message)
            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"🤖 Updating Week {week_number} with AI ({model_name})...")
            
            ai_start = time.time()
            
            # Extract ai_message from response, then convert to WeeklySchedule (without ai_message)
            ws_response, completion = self.llm.parse_structured(
                prompt, WeeklyScheduleResponse, model_type="complex"
            )
            ai_duration = time.time() - ai_start
            
            # Extract ai_message before converting to WeeklySchedule
            ai_message = ws_response.ai_message
            # Convert to WeeklySchedule (without ai_message)
            week_dict = ws_response.model_dump(exclude={'ai_message'})
            week_dict["week_number"] = week_number
            
            # Post-process LLM response: Fix reps/weight arrays to match sets count and sort (high->low)
            temp_plan_for_normalization = {"weekly_schedules": [week_dict]}
            normalized_plan = self.exercise_validator.normalize_reps_weight_arrays(temp_plan_for_normalization)
            week_dict = normalized_plan.get("weekly_schedules", [week_dict])[0]
            
            # Step 5: Post-process and validate exercises
            self.logger.info("🔍 Matching AI exercises to database...")
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]
            
            self.logger.info("✅ Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                {"weekly_schedules": [validated_week]}
            )
            updated_week = validated_plan.get("weekly_schedules", [validated_week])[0]
            
            # Step 6: Track latency
            await db_service.log_latency_event("update_week", ai_duration, completion)
            
            # Return only the updated week (frontend will merge it back into the full plan)
            return {
                "success": True,
                "training_plan": {
                    "weekly_schedules": [updated_week],  # Return only the updated week
                },
                "ai_message": ai_message,  # Return AI message explaining the changes
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                },
            }
            
        except Exception as e:
            self.logger.error(
                f"Failed to update Week {week_number}: {str(e)}. "
                f"Check AI model response, exercise matching, or database connectivity."
            )
            return {"success": False, "error": str(e)}
    
    async def create_new_weekly_schedule(
        self,
        personal_info: PersonalInfo,
        user_profile_id: int,
        existing_training_plan: Dict[str, Any],
        jwt_token: str = None,
    ) -> Dict[str, Any]:
        """
        Create a new week when previous week is completed.
        
        Creates ONLY the next week (Week 2, 3, 4, etc.), but returns the full TrainingPlan structure
        with the new week added to the existing plan.
        
        Automatically calculates next_week_number from existing plan (max week number + 1).
        Uses all existing weeks as completed weeks (everything is already completed).
        
        Based on:
        - Previous weeks' training history (all existing weeks)
        - Playbook lessons learned from training
        
        Args:
            personal_info: User's personal information and goals
            user_profile_id: Database ID of the user profile
            existing_training_plan: Full training plan from request (already fetched from frontend)
            jwt_token: JWT token for database authentication
        """
        try:
            # Load current playbook from database
            self.logger.info("📚 Loading user playbook...")
            playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)
            
            if not playbook:
                self.logger.warning(
                    "No playbook found in database. "
                    "Creating empty playbook - user may be new or playbook not initialized."
                )
                playbook = UserPlaybook(
                    user_id=personal_info.user_id,
                    lessons=[],
                    total_lessons=0,
                )
            
            # Use existing training plan from request (no need to fetch from database)
            existing_plan = existing_training_plan
            existing_weekly_schedules = existing_plan.get("weekly_schedules", [])
            
            if not existing_weekly_schedules:
                self.logger.error(
                    "No existing weekly schedules found in training plan. "
                    "Cannot create new week without Week 1. User must complete initial plan generation first."
                )
                return {
                    "success": False,
                    "error": "No existing weekly schedules found. Create Week 1 first.",
                }
            
            # Calculate next_week_number from existing weeks (max week number + 1)
            week_numbers = [w.get("week_number", 0) for w in existing_weekly_schedules if w.get("week_number")]
            next_week_number = max(week_numbers) + 1 if week_numbers else 1
            
            self.logger.info(f"Calculated next_week_number: {next_week_number} from {len(existing_weekly_schedules)} existing weeks")
            
            # Use all existing weeks as completed weeks (everything is already completed)
            completed_weeks = existing_weekly_schedules
            
            # Build completed weeks context
            completed_weeks_context = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": completed_weeks}
            )
            
            # Step 2: Use playbook for personalized context
            active_lessons = playbook.get_active_lessons(min_confidence=0.3) if playbook else []
            playbook_lessons_dict = (
                [
                    {
                        "text": lesson.text,
                        "positive": lesson.positive,
                        "confidence": lesson.confidence,
                        "helpful_count": lesson.helpful_count,
                        "harmful_count": lesson.harmful_count,
                        "tags": lesson.tags,
                    }
                    for lesson in active_lessons
                ]
                if active_lessons
                else None
            )

            (
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            ) = await self._decide_modalities(
                personal_info, playbook
            )

            # Step 3: Generate prompt for creating new week
            self.logger.info(
                "📝 Generating prompt for Week %s (bodyweight_strength=%s equipment_strength=%s endurance=%s)...",
                next_week_number,
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
            )
            rationale = self.last_modality_rationale or "Default: include both modalities for balanced development."
            prompt = PromptGenerator.create_new_weekly_schedule_prompt(
                personal_info=personal_info,
                completed_weeks_context=completed_weeks_context,
                progress_summary="",  # Not needed - context is in completed_weeks
                playbook_lessons=playbook_lessons_dict,
                include_bodyweight_strength=include_bodyweight_strength,
                include_equipment_strength=include_equipment_strength,
                include_endurance=include_endurance,
                modality_rationale=rationale,
            )

            # Step 4: Generate new WeeklySchedule with AI
            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"🤖 Creating Week {next_week_number} with AI ({model_name})...")
            
            ai_start = time.time()
            weekly_schedule, completion = self.llm.parse_structured(
                prompt, WeeklySchedule, model_type="complex"
            )
            ai_duration = time.time() - ai_start
            week_dict = weekly_schedule.model_dump()
            week_dict["week_number"] = next_week_number
            
            # Post-process LLM response: Fix reps/weight arrays to match sets count and sort (high->low)
            temp_plan_for_normalization = {"weekly_schedules": [week_dict]}
            normalized_plan = self.exercise_validator.normalize_reps_weight_arrays(temp_plan_for_normalization)
            week_dict = normalized_plan.get("weekly_schedules", [week_dict])[0]

            # Step 5: Post-process and validate exercises
            self.logger.info("🔍 Matching AI exercises to database...")
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]
            
            self.logger.info("✅ Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                {"weekly_schedules": [validated_week]}
            )
            new_week = validated_plan.get("weekly_schedules", [validated_week])[0]
            
            # Step 6: Add new week to existing plan
            updated_weekly_schedules = existing_weekly_schedules.copy()
            updated_weekly_schedules.append(new_week)
            
            # Sort by week_number
            updated_weekly_schedules.sort(key=lambda x: x.get("week_number", 0))
            
            # Build full TrainingPlan structure with new week added
            full_training_plan = {
                **existing_plan,  # Keep all existing plan fields (id, title, summary, etc.)
                "weekly_schedules": updated_weekly_schedules,
            }
            
            # Step 7: Track latency
            await db_service.log_latency_event("create_week", ai_duration, completion)
            
            return {
                "success": True,
                "training_plan": full_training_plan,  # Return full plan with new week added
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                    "next_week_number": next_week_number,  # Include for API response
                },
            }

        except Exception as e:
            self.logger.error(
                f"Failed to create new weekly schedule: {str(e)}. "
                f"Check AI model response, exercise matching, or database connectivity."
            )
            return {"success": False, "error": str(e)}

    def _format_training_response(
        self, response: str, relevant_docs: List[Dict[str, Any]]
    ) -> str:
        """Format the training response with additional context."""
        formatted_response = f"🏋️‍♂️ **training Coach Response**\n\n{response}\n\n"

        # Add source information
        if relevant_docs:
            formatted_response += "📚 **Sources:**\n"
            for i, doc in enumerate(relevant_docs[:3], 1):
                title = doc.get("document_title", "Unknown")
                formatted_response += f"{i}. {title}\n"

        return formatted_response

    def _generate_fallback_response(self, user_request: str) -> str:
        """Generate a fallback response when no relevant documents are found."""
        return f"""
            I understand you're asking about: "{user_request}"

            While I don't have specific information about this in my knowledge base yet, I can provide general training guidance based on best practices.

            For more personalized advice, please try:
            - Being more specific about your goals
            - Mentioning your experience level
            - Specifying available equipment

            Would you like me to create a general training plan or recommend some basic exercises?
        """

    def _generate_error_response(self, user_request: str) -> str:
        """Generate an error response when processing fails."""
        return f"""
            I apologize, but I encountered an error while processing your request: "{user_request}"

            This might be due to:
            - Temporary system issues
            - Knowledge base access problems
            - Complex request format

            Please try rephrasing your request or contact support if the issue persists.
        """
    
    # ============================================================================
    # ACE PATTERN METHODS (Adaptive Context Engine)
    # ============================================================================
    
    async def extract_initial_lessons_from_onboarding(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
    ) -> List[ReflectorAnalysis]:
        """
        Extract initial "seed" lessons from onboarding Q&A responses.
        
        This is a wrapper around reflector.extract_initial_lessons that maintains
        a clean API for the TrainingCoach.
        
        Returns ReflectorAnalysis objects that should be passed through Curator
        for deduplication before being saved to the playbook.
        
        Args:
            personal_info: User's personal information
            formatted_initial_responses: Formatted responses from initial questions
            
        Returns:
            List of ReflectorAnalysis objects (will be processed by Curator)
        """
        return await self.reflector.extract_initial_lessons(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
        )
    
    async def extract_lessons_from_conversation_history(
        self,
        conversation_history: List[Dict[str, str]],
        personal_info: PersonalInfo,
        accepted_training_plan: Dict[str, Any],
        existing_playbook: UserPlaybook,
    ) -> List["ReflectorAnalysis"]:
        """
        Extract lessons from conversation history when user accepts the plan.
        
        This is a wrapper around reflector.extract_lessons_from_conversation_history
        that maintains a clean API for the TrainingCoach.
        
        Args:
            conversation_history: List of conversation messages [{role, content}, ...]
            personal_info: User's personal information
            accepted_training_plan: The training plan that satisfied the user
            existing_playbook: User's current playbook (for context only)
            
        Returns:
            List of ReflectorAnalysis objects extracted from conversation
            (Curator will process these and convert to PlaybookLesson)
        """
        return await self.reflector.extract_lessons_from_conversation_history(
            conversation_history=conversation_history,
            personal_info=personal_info,
            accepted_training_plan=accepted_training_plan,
            existing_playbook=existing_playbook,
        )

    async def get_playbook_stats(self, user_id: str) -> Optional[PlaybookStats]:
        """
        Get statistics about a user's playbook.

        Args:
            user_id: The user's identifier

        Returns:
            PlaybookStats object or None if no playbook exists
        """
        try:
            # Get user_profile_id from user_id
            user_profile = await db_service.get_user_profile_by_user_id(user_id)
            if not user_profile.get("success") or not user_profile.get("data"):
                return None

            user_profile_id = user_profile["data"].get("id")
            playbook = await db_service.load_user_playbook(user_profile_id)

            if not playbook or not playbook.lessons:
                return None

            # Calculate statistics
            positive_count = sum(1 for l in playbook.lessons if l.positive)
            warning_count = len(playbook.lessons) - positive_count
            avg_conf = sum(l.confidence for l in playbook.lessons) / len(
                playbook.lessons
            )

            # Get most common tags
            tag_counts = {}
            for lesson in playbook.lessons:
                for tag in lesson.tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

            most_common = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[
                :5
            ]
            most_common_tags = [tag for tag, _ in most_common]

            # Priority distribution (based on confidence and usage)
            priority_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}

            for lesson in playbook.lessons:
                total_uses = lesson.helpful_count + lesson.harmful_count
                if not lesson.positive:
                    priority_dist["critical"] += 1
                elif lesson.confidence >= 0.8 and total_uses >= 3:
                    priority_dist["high"] += 1
                elif lesson.confidence >= 0.5:
                    priority_dist["medium"] += 1
                else:
                    priority_dist["low"] += 1

            return PlaybookStats(
                total_lessons=len(playbook.lessons),
                positive_lessons=positive_count,
                warning_lessons=warning_count,
                avg_confidence=avg_conf,
                most_common_tags=most_common_tags,
                lessons_by_priority=priority_dist,
                last_updated=playbook.last_updated,
            )

        except Exception as e:
            self.logger.error(
                f"Failed to get playbook stats: {str(e)}. "
                f"Check database connectivity or user profile lookup."
            )
            return None


    async def classify_feedback_intent_lightweight(
        self,
        feedback_message: str,
        conversation_history: List[Dict[str, str]],
        training_plan: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        STAGE 1: Lightweight intent classification (no operations parsing).
        
        Fast and efficient - uses feedback, conversation history, and training plan.
        Includes plan details so AI can answer questions about the plan.
        
        Args:
            feedback_message: User's feedback message
            conversation_history: Conversation context
            training_plan: Current training plan (optional, for answering questions)
        
        Returns:
            Classification result with intent, action, ai_message (no operations)
        """
        try:
            # Build conversation context
            context = self._build_conversation_context(conversation_history)
            
            # Get lightweight prompt (includes plan for answering questions)
            prompt = PromptGenerator.generate_lightweight_intent_classification_prompt(
                feedback_message=feedback_message,
                conversation_context=context,
                training_plan=training_plan
            )
            
            # Use structured parsing with Pydantic model - TRACK AI CALL
            ai_start = time.time()
            parsed_obj, completion = self.llm.parse_structured(
                prompt, FeedbackIntentClassification, model_type="lightweight"
            )
            duration = time.time() - ai_start
            result = parsed_obj.model_dump() if hasattr(parsed_obj, 'model_dump') else parsed_obj
            result['_classify_duration'] = duration
            
            # Track latency with tokens
            await db_service.log_latency_event("feedback_classify", duration, completion)
            
            self.logger.info(
                f"✅ Intent classified: {result['intent']} "
                f"(confidence: {result['confidence']:.2f}, {duration:.2f}s)"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(
                f"Failed to classify feedback intent: {str(e)}. "
                f"Check AI model availability or prompt format. Using safe fallback response."
            )
            # Default to safe response
            return {
                "intent": "unclear",
                "confidence": 0.5,
                "action": "respond_only",
                "reasoning": "Error in classification, asking for clarification",
                "needs_plan_update": False,
                "navigate_to_main_app": False,
                "ai_message": "I'm having trouble understanding your feedback. Could you please be more specific about what you'd like to change or know? 😊"
            }

    def _build_conversation_context(self, conversation_history: List[Dict[str, str]]) -> str:
        """Build conversation context from history."""
        if not conversation_history:
            return "No previous conversation."
        
        context_lines = []
        for msg in conversation_history[-5:]:  # Last 5 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            context_lines.append(f"{role.upper()}: {content}")
        
        return "\n".join(context_lines)