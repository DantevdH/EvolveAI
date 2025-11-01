"""
Enhanced training Coach Agent with AI Question Generation and Training Plan Creation
Includes ACE (Adaptive Context Engine) pattern for personalized learning
"""

import os
import json
import openai
import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from core.base.base_agent import BaseAgent
from logging_config import get_logger
from core.base.rag_tool import RAGTool
from core.base.ace_telemetry import ACETelemetry

# Import schemas and services
from core.training.schemas.training_schemas import (
    TrainingPlan,
    WeeklySchedule,
    DailyTraining,
    StrengthExercise,
    EnduranceSession,
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
    QuestionType,
    AIQuestion,
    QuestionOption,
)
from core.training.helpers.response_formatter import ResponseFormatter
from core.training.helpers.prompt_generator import PromptGenerator

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

        # Initialize RAG tool for training-specific knowledge retrieval
        self.rag_tool = RAGTool(self)

        # Initialize exercise services
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()

        # Initialize ACE pattern components
        self.reflector = Reflector(self.openai_client)
        self.curator = Curator(self.openai_client)
        # Unified LLM client (OpenAI or Gemini based on env)
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
                
                if question.response_type == QuestionType.SLIDER:
                    # SLIDER must have min, max, step, unit
                    if not all([
                        question.min_value is not None,
                        question.max_value is not None,
                        question.step is not None,
                        question.unit is not None
                    ]):
                        self.logger.warning(
                            f"Invalid SLIDER question '{question.id}': missing required fields"
                        )
                        is_valid = False
                
                elif question.response_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN]:
                    # Must have options with at least 2 items
                    if not question.options or len(question.options) < 2:
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': needs at least 2 options"
                        )
                        is_valid = False
                
                elif question.response_type == QuestionType.RATING:
                    # RATING must have min/max values and descriptions
                    if not all([
                        question.min_value is not None,
                        question.max_value is not None,
                        question.min_description is not None,
                        question.max_description is not None
                    ]):
                        self.logger.warning(
                            f"Invalid RATING question '{question.id}': missing required fields"
                        )
                        is_valid = False
                
                elif question.response_type in [QuestionType.FREE_TEXT, QuestionType.CONDITIONAL_BOOLEAN]:
                    # Must have max_length and placeholder
                    if not all([
                        question.max_length is not None,
                        question.placeholder is not None
                    ]):
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': missing required fields"
                        )
                        is_valid = False
                
                if is_valid:
                    valid_questions.append(question)
                else:
                    self.logger.warning(f"Excluding invalid question: {question.text}")
                    
            except Exception as e:
                self.logger.error(f"Error validating question '{question.id}': {e}")
                # Skip this question
                continue
        
        return valid_questions

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
            relevant_docs = self.search_knowledge_base(
                query=user_request, max_results=5, metadata_filters=None
            )

            if relevant_docs:
                # Use RAG tool to generate response with context
                response = self.rag_tool.generate_response(
                    user_request, relevant_docs, context=context
                )
                return self._format_training_response(response, relevant_docs)
            else:
                # Fallback to general training guidance
                return self._generate_fallback_response(user_request)

        except Exception as e:
            self.logger.error(f"Error processing training request: {e}")
            return self._generate_error_response(user_request)

    async def generate_initial_questions(
        self, personal_info: PersonalInfo, user_profile_id: Optional[int] = None
    ) -> AIQuestionResponse:
        """Generate initial questions for onboarding based on personal information."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.training.helpers.mock_data import (
                    create_mock_initial_questions,
                )

                initial_questions = create_mock_initial_questions()
                return initial_questions

            # Create a comprehensive prompt for initial questions
            prompt = PromptGenerator.generate_initial_questions_prompt(personal_info)

            # Retry logic for validation errors
            max_retries = 2
            last_error = None

            for attempt in range(max_retries):
                try:
                    # Generate questions via unified LLM - TRACK AI LATENCY
                    ai_start = time.time()
                    from core.training.schemas.question_schemas import GeminiAIQuestionResponse
                    parsed_obj, completion = self.llm.parse_structured(
                        prompt, AIQuestionResponse, GeminiAIQuestionResponse
                    )
                    # Coerce to domain model (works for both providers)
                    questions_response = AIQuestionResponse.model_validate(parsed_obj.model_dump())
                    ai_duration = time.time() - ai_start
                    
                    # Track AI latency
                    await db_service.log_latency_event("initial_questions", ai_duration, completion)
                    
                    # Filter out invalid questions instead of failing
                    valid_questions = self._filter_valid_questions(questions_response.questions)
                    
                    if len(valid_questions) < len(questions_response.questions):
                        self.logger.warning(
                            f"Filtered out {len(questions_response.questions) - len(valid_questions)} invalid questions"
                        )
                    
                    # Update response with valid questions only
                    questions_response.questions = valid_questions
                    questions_response.total_questions = len(valid_questions)

                    # If we get here, validation passed
                    if attempt > 0:
                        self.logger.info(
                            f"Successfully generated questions after {attempt + 1} attempts"
                        )

                    return questions_response

                except ValueError as ve:
                    # Validation error from our custom validator
                    last_error = ve
                    self.logger.warning(
                        f"Validation error on attempt {attempt + 1}/{max_retries}: {ve}"
                    )

                    if attempt < max_retries - 1:
                        # Add error feedback to prompt for retry
                        prompt += f"\n\n⚠️ PREVIOUS ATTEMPT FAILED: {str(ve)}\nPlease fix this error and try again."
                    else:
                        # Last attempt failed, will fall through to fallback
                        self.logger.error(
                            f"All {max_retries} attempts failed validation: {ve}"
                        )
                        raise

        except Exception as e:
            self.logger.error(f"Error generating initial questions: {e}")
            # Return a fallback response
            return AIQuestionResponse(
                questions=[
                    AIQuestion(
                        id="fallback_1",
                        text="What is your primary training goal?",
                        response_type=QuestionType.MULTIPLE_CHOICE,
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

    async def generate_follow_up_questions(
        self,
        personal_info: PersonalInfo,
        formatted_responses: str,
        initial_questions: List[AIQuestion] = None,
        user_profile_id: Optional[int] = None,
    ) -> AIQuestionResponseWithFormatted:
        """Generate follow-up questions based on initial responses."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.training.helpers.mock_data import (
                    create_mock_follow_up_questions,
                )

                follow_up_questions = create_mock_follow_up_questions()
                self.logger.debug(
                    f"DEBUG MODE: User responses for follow-up questions: {formatted_responses}"
                )
                return AIQuestionResponseWithFormatted(
                    questions=follow_up_questions.questions,
                    total_questions=follow_up_questions.total_questions,
                    estimated_time_minutes=follow_up_questions.estimated_time_minutes,
                    formatted_responses=formatted_responses,
                    ai_message=follow_up_questions.ai_message,
                )

            # Create a comprehensive prompt for follow-up questions
            prompt = PromptGenerator.generate_followup_questions_prompt(
                personal_info, formatted_responses
            )

            # Retry logic for validation errors
            max_retries = 2
            last_error = None

            for attempt in range(max_retries):
                try:
                    # Generate questions via unified LLM - TRACK AI LATENCY
                    ai_start = time.time()
                    from core.training.schemas.question_schemas import GeminiAIQuestionResponse
                    parsed_obj, completion = self.llm.parse_structured(
                        prompt, AIQuestionResponse, GeminiAIQuestionResponse
                    )
                    question_response = AIQuestionResponse.model_validate(parsed_obj.model_dump())
                    ai_duration = time.time() - ai_start
                    
                    # Track AI latency
                    await db_service.log_latency_event("followup_questions", ai_duration, completion)
                    
                    # Filter out invalid questions instead of failing
                    valid_questions = self._filter_valid_questions(question_response.questions)
                    
                    if len(valid_questions) < len(question_response.questions):
                        self.logger.warning(
                            f"Filtered out {len(question_response.questions) - len(valid_questions)} invalid follow-up questions"
                        )

                    # If we get here, validation passed
                    if attempt > 0:
                        self.logger.info(
                            f"Successfully generated follow-up questions after {attempt + 1} attempts"
                        )

                    # Return with formatted responses and AI message
                    return AIQuestionResponseWithFormatted(
                        questions=valid_questions,
                        total_questions=len(valid_questions),
                        estimated_time_minutes=question_response.estimated_time_minutes,
                        formatted_responses=formatted_responses,
                        ai_message=question_response.ai_message,
                    )

                except ValueError as ve:
                    # Validation error from our custom validator
                    last_error = ve
                    self.logger.warning(
                        f"Validation error on attempt {attempt + 1}/{max_retries}: {ve}"
                    )

                    if attempt < max_retries - 1:
                        # Add error feedback to prompt for retry
                        prompt += f"\n\n⚠️ PREVIOUS ATTEMPT FAILED: {str(ve)}\nPlease fix this error and try again."
                    else:
                        # Last attempt failed, will fall through to fallback
                        self.logger.error(
                            f"All {max_retries} attempts failed validation: {ve}"
                        )
                        raise

        except Exception as e:
            self.logger.error(f"Error generating follow-up questions: {e}")
            # Return a fallback response
            return AIQuestionResponseWithFormatted(
                questions=[
                    AIQuestion(
                        id="followup_1",
                        text="How many days per week can you commit to training?",
                        response_type=QuestionType.SLIDER,
                        min_value=1,
                        max_value=7,
                        step=1,
                        unit="days",
                    )
                ],
                total_questions=1,
                estimated_time_minutes=1,
                formatted_responses=formatted_responses,
                ai_message="I need to ask a few more questions to create your perfect training plan. 💪",
            )

    async def generate_initial_training_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        user_profile_id: int,
        jwt_token: str = None,
    ) -> Dict[str, Any]:
        """
        Generate the initial training plan (Week 1) during onboarding.
        
        Creates full TrainingPlan structure (title, summary, justification) with ONLY Week 1.
        The AI generates the plan title, summary, and justification.
        We re-assess by week and adjust.
        
        NOTE: This function does NOT use playbook lessons in the prompt.
        The playbook is created during onboarding but used later in create_new_weekly_schedule.
        This function uses only the onboarding responses (initial + follow-up questions).
        
        Args:
            personal_info: User's personal information and goals
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions
            user_profile_id: Database ID of the user profile (also used for latency tracking)
            jwt_token: JWT token for database authentication
        """
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                self.logger.debug("DEBUG MODE: Using mock training plan")
                from core.training.helpers.mock_data import create_mock_training_plan
                
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
            
            # Step 1: Get metadata options from database
            self.logger.info("Fetching exercise metadata options from database...")
            metadata_options = self.exercise_selector.get_metadata_options()
            
            # Step 2: Generate prompt for initial Week 1
            prompt = PromptGenerator.generate_initial_training_plan_prompt(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
                metadata_options=metadata_options,
            )
            
            # Step 4: Generate full TrainingPlan with AI (but only Week 1 in weekly_schedules)
            model_name = os.getenv("LLM_MODEL_CHAT", os.getenv("LLM_MODEL", "gpt-4o"))
            self.logger.info(f"🤖 Generating full training plan (Week 1 only) with AI model: {model_name}...")
            
            ai_start = time.time()
            
            if self.llm.provider == "gemini":
                from core.training.schemas.training_schemas import GeminiTrainingPlan
                parsed_obj, completion = self.llm.parse_structured(
                    prompt, TrainingPlan, GeminiTrainingPlan
                )
                tp_input = parsed_obj.model_dump()
                tp_input["user_profile_id"] = user_profile_id
                # Skip TrainingPlan.model_validate() - IDs don't exist yet, will be added after database save
                # GeminiTrainingPlan already validated the structure
                ai_duration = time.time() - ai_start
                training_dict = tp_input
            else:
                # OpenAI path: validate with TrainingPlan (will fail if IDs missing, but OpenAI may include them differently)
                training_plan, completion = self.llm.chat_parse(prompt, TrainingPlan)
                ai_duration = time.time() - ai_start
                training_dict = training_plan.model_dump()
                training_dict["user_profile_id"] = user_profile_id
            
            # Verify only Week 1 is generated
            num_weeks = len(training_dict.get("weekly_schedules", []))
            if num_weeks != 1:
                self.logger.warning(f"⚠️ AI generated {num_weeks} weeks instead of 1! Using only first week.")
                training_dict["weekly_schedules"] = training_dict.get("weekly_schedules", [])[:1]
            
            # Ensure Week 1 has week_number = 1
            if training_dict.get("weekly_schedules"):
                training_dict["weekly_schedules"][0]["week_number"] = 1
            
            # Step 5: Post-process and validate exercises
            validated_plan = self.exercise_validator.post_process_strength_exercises(training_dict)
            
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
            self.logger.error(f"Error generating initial weekly schedule: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_weekly_schedule(
        self,
        personal_info: PersonalInfo,
        feedback_message: str,
        week_number: int,
        current_week: Dict[str, Any],
        user_profile_id: int,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        existing_training_plan: Dict[str, Any],
        jwt_token: str = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        
    ) -> Dict[str, Any]:
        """
        Update an existing week based on user feedback.
        
        Updates ONLY the specified week, but returns the full TrainingPlan structure
        with the updated week inserted into the existing plan.
        We re-assess by week and adjust.
        
        Args:
            personal_info: User's personal information and goals
            feedback_message: User's feedback message requesting week changes
            week_number: Week number to update (e.g., 1, 2, 3, etc.)
            current_week: Current week data (WeeklySchedule dict) to update
            user_profile_id: Database ID of the user profile
            formatted_initial_responses: Formatted responses from initial questions 
            formatted_follow_up_responses: Formatted responses from follow-up questions 
            existing_training_plan: Full training plan from request (already fetched)
            jwt_token: JWT token for database authentication
            conversation_history: Optional conversation history for context-aware updates
            
        """
        try:
            # Use existing training plan from request (no need to fetch from database)
            existing_plan = existing_training_plan
            existing_weekly_schedules = existing_plan.get("weekly_schedules", [])
        
            # Build week summary
            week_summary = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": [current_week]}
            )
            
            # Step 1: Get metadata options
            self.logger.info("Fetching exercise metadata options from database...")
            metadata_options = self.exercise_selector.get_metadata_options()
        
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

            # Step 2: Generate prompt for updating week (includes onboarding responses like initial generation)
            prompt = PromptGenerator.update_weekly_schedule_prompt(
            personal_info=personal_info,
            feedback_message=feedback_message,
                week_number=week_number,
                current_week_summary=week_summary,
                formatted_initial_responses=formatted_initial_responses,
                formatted_follow_up_responses=formatted_follow_up_responses,
                metadata_options=metadata_options,
                conversation_history=conversation_history_str,
            )
            
            # Step 4: Generate updated WeeklySchedule with AI (using response schema that includes ai_message)
            model_name = os.getenv("LLM_MODEL_CHAT", os.getenv("LLM_MODEL", "gpt-4o"))
            self.logger.info(f"🤖 Updating Week {week_number} schedule with AI model: {model_name}...")
            
            ai_start = time.time()
            
            # Extract ai_message from response, then convert to WeeklySchedule (without ai_message)
            ai_message = None
            if self.llm.provider == "gemini":
                from core.training.schemas.training_schemas import WeeklyScheduleResponse, GeminiWeeklyScheduleResponse
                parsed_obj, completion = self.llm.parse_structured(
                    prompt, WeeklyScheduleResponse, GeminiWeeklyScheduleResponse
                )
                ws_dict = parsed_obj.model_dump()
                
                # Validate that required fields are present
                if not ws_dict or ws_dict == {}:
                    self.logger.error("❌ Gemini returned empty response for WeeklyScheduleResponse")
                    raise ValueError("AI returned empty response - missing required fields (daily_trainings, justification, ai_message)")
                
                # Check for missing required fields
                missing_fields = []
                if not ws_dict.get("daily_trainings"):
                    missing_fields.append("daily_trainings")
                if not ws_dict.get("justification"):
                    missing_fields.append("justification")
                if not ws_dict.get("ai_message"):
                    missing_fields.append("ai_message")
                
                if missing_fields:
                    self.logger.error(f"❌ Gemini response missing required fields: {missing_fields}")
                    self.logger.error(f"Received keys: {list(ws_dict.keys())}")
                    raise ValueError(f"AI response missing required fields: {missing_fields}")
                
                # Extract ai_message (GeminiWeeklyScheduleResponse already validated structure)
                ai_message = ws_dict.get("ai_message")
                # Skip WeeklyScheduleResponse.model_validate() - IDs don't exist yet, will be added after database save
                # Skip WeeklySchedule.model_validate() - IDs don't exist yet
                # Convert to WeeklySchedule dict (without ai_message)
                week_dict = {k: v for k, v in ws_dict.items() if k != "ai_message"}
                week_dict["week_number"] = week_number
                ai_duration = time.time() - ai_start
            else:
                from core.training.schemas.training_schemas import WeeklyScheduleResponse
                ws_response, completion = self.llm.chat_parse(prompt, WeeklyScheduleResponse)
                ai_duration = time.time() - ai_start
                # Extract ai_message before converting to WeeklySchedule
                ai_message = ws_response.ai_message
                # Convert to WeeklySchedule (without ai_message)
                week_dict = ws_response.model_dump(exclude={'ai_message'})
                week_dict["week_number"] = week_number
            
            # Step 5: Post-process and validate exercises
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]
            
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                {"weekly_schedules": [validated_week]}
            )
            updated_week = validated_plan.get("weekly_schedules", [validated_week])[0]
            
            # Step 6: Insert updated week into existing plan
            updated_weekly_schedules = []
            week_updated = False
            for week in existing_weekly_schedules:
                if week.get("week_number") == week_number:
                    updated_weekly_schedules.append(updated_week)
                    week_updated = True
                else:
                    updated_weekly_schedules.append(week)
            
            if not week_updated:
                self.logger.warning(f"Week {week_number} not found in existing plan, appending updated week")
                updated_weekly_schedules.append(updated_week)
            
            # Sort by week_number
            updated_weekly_schedules.sort(key=lambda x: x.get("week_number", 0))
            
            # Build full TrainingPlan structure with updated week
            full_training_plan = {
                **existing_plan,  # Keep all existing plan fields (id, title, summary, etc.)
                "weekly_schedules": updated_weekly_schedules,
            }
            
            # Step 7: Track latency
            await db_service.log_latency_event("update_week", ai_duration, completion)
            
            return {
                "success": True,
                "training_plan": full_training_plan,  # Return full plan with updated week
                "ai_message": ai_message,  # Return AI message explaining the changes
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                },
            }
            
        except Exception as e:
            self.logger.error(f"Error updating weekly schedule: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_new_weekly_schedule(
        self,
        personal_info: PersonalInfo,
        user_profile_id: int,
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
            jwt_token: JWT token for database authentication
        """
        try:
            # Load current playbook from database
            playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)
            
            if not playbook:
                self.logger.warning("No playbook found - creating empty playbook")
                playbook = UserPlaybook(
                    user_id=personal_info.user_id,
                    lessons=[],
                    total_lessons=0,
                )
            
            # Fetch existing full training plan
            existing_plan_result = await db_service.get_training_plan(user_profile_id)
            if not existing_plan_result.get("success"):
                return {
                    "success": False,
                    "error": "No existing training plan found. Create Week 1 first.",
                }
            
            existing_plan = existing_plan_result.get("data", {})
            existing_weekly_schedules = existing_plan.get("weekly_schedules", [])
            
            # Calculate next_week_number from existing weeks (max week number + 1)
            if existing_weekly_schedules:
                week_numbers = [w.get("week_number", 0) for w in existing_weekly_schedules if w.get("week_number")]
                next_week_number = max(week_numbers) + 1 if week_numbers else 1
            else:
                next_week_number = 1
            
            self.logger.info(f"Calculated next_week_number: {next_week_number} from {len(existing_weekly_schedules)} existing weeks")
            
            # Use all existing weeks as completed weeks (everything is already completed)
            completed_weeks = existing_weekly_schedules
            
            # Build completed weeks context
            completed_weeks_context = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": completed_weeks}
            )
            
            # Step 1: Get metadata options
            self.logger.info("Fetching exercise metadata options from database...")
            metadata_options = self.exercise_selector.get_metadata_options()

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

            # Step 3: Generate prompt for creating new week
            prompt = PromptGenerator.create_new_weekly_schedule_prompt(
                personal_info=personal_info,
                completed_weeks_context=completed_weeks_context,
                progress_summary="",  # Not needed - context is in completed_weeks
                metadata_options=metadata_options,
                playbook_lessons=playbook_lessons_dict,
            )

            # Step 4: Generate new WeeklySchedule with AI
            model_name = os.getenv("LLM_MODEL_CHAT", os.getenv("LLM_MODEL", "gpt-4o"))
            self.logger.info(f"🤖 Creating Week {next_week_number} schedule with AI model: {model_name}...")
            
            ai_start = time.time()
            
            if self.llm.provider == "gemini":
                from core.training.schemas.training_schemas import GeminiWeeklySchedule
                parsed_obj, completion = self.llm.parse_structured(
                    prompt, WeeklySchedule, GeminiWeeklySchedule
                )
                ws_input = parsed_obj.model_dump()
                ws_input["week_number"] = next_week_number
                # Skip WeeklySchedule.model_validate() - IDs don't exist yet, will be added after database save
                # GeminiWeeklySchedule already validated the structure
                ai_duration = time.time() - ai_start
                week_dict = ws_input
            else:
                weekly_schedule, completion = self.llm.chat_parse(prompt, WeeklySchedule)
                ai_duration = time.time() - ai_start
                week_dict = weekly_schedule.model_dump()
                week_dict["week_number"] = next_week_number

            # Step 5: Post-process and validate exercises
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]
            
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
            self.logger.error(f"Error creating new weekly schedule: {e}")
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
    
    def extract_initial_lessons_from_onboarding(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
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
            formatted_follow_up_responses: Formatted responses from follow-up questions
            
        Returns:
            List of ReflectorAnalysis objects (will be processed by Curator)
        """
        return self.reflector.extract_initial_lessons(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
        )
    
    def extract_lessons_from_conversation_history(
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
        return self.reflector.extract_lessons_from_conversation_history(
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
            self.logger.error(f"Error getting playbook stats: {e}")
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
            from core.training.schemas.question_schemas import FeedbackIntentClassification, GeminiFeedbackIntentClassification
            ai_start = time.time()
            parsed_any, completion = self.llm.parse_structured(
                prompt, FeedbackIntentClassification, GeminiFeedbackIntentClassification
            )
            parsed_obj = FeedbackIntentClassification.model_validate(parsed_any.model_dump())
            duration = time.time() - ai_start
            result = parsed_obj.model_dump() if hasattr(parsed_obj, 'model_dump') else parsed_obj
            result['_classify_duration'] = duration
            
            # Track latency with tokens
            await db_service.log_latency_event("feedback_classify", duration, completion)
            
            self.logger.info(f"✨ Lightweight intent classification took {duration:.2f}s (intent: {result['intent']}, confidence: {result['confidence']})")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error in lightweight classification: {str(e)}")
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

    def _clean_for_json_serialization(self, data: Any) -> Any:
        """
        Clean data to ensure it's JSON serializable by converting datetime objects
        and other non-serializable types to strings or basic types.
        """
        if isinstance(data, dict):
            return {key: self._clean_for_json_serialization(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._clean_for_json_serialization(item) for item in data]
        elif isinstance(data, datetime):
            return data.isoformat()
        elif hasattr(data, 'model_dump'):
            # Handle Pydantic models
            return self._clean_for_json_serialization(data.model_dump())
        elif hasattr(data, 'dict'):
            # Handle older Pydantic models
            return self._clean_for_json_serialization(data.dict())
        elif isinstance(data, (str, int, float, bool, type(None))):
            return data
        else:
            # Convert other types to string as fallback
            return str(data)

    @staticmethod
    def _extract_json_text(text: str) -> str:
        """
        Extract a JSON string from possible markdown-fenced output.
        - Removes ```json ... ``` fences
        - If extra prose surrounds JSON, slice from first '{' to last '}'
        """
        if not text:
            return text
        cleaned = text.strip()
        # Remove triple backtick fences
        if cleaned.startswith("```"):
            cleaned = cleaned.lstrip("`")
            # Drop optional language label like json\n
            newline_idx = cleaned.find("\n")
            if newline_idx != -1:
                cleaned = cleaned[newline_idx + 1 :]
            # Remove trailing closing fence if present
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        # If there is still surrounding prose, extract outermost JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return cleaned[start : end + 1]
        return cleaned

    @staticmethod
    def _normalize_gemini_training_plan_input(tp: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a GeminiTrainingPlan dict to satisfy domain TrainingPlan requirements:
        - Inject training_plan_id=0 for each weekly_schedule (placeholder before DB save)
        - Inject weekly_schedule_id=0 for each daily_training
        - Normalize training_type to expected enum lowercase; map synonyms
        """
        schedules = tp.get("weekly_schedules") or []
        weekday_map = {
            "monday": "Monday",
            "tuesday": "Tuesday",
            "wednesday": "Wednesday",
            "thursday": "Thursday",
            "friday": "Friday",
            "saturday": "Saturday",
            "sunday": "Sunday",
        }
        for ws in schedules:
            # Ensure required FK placeholder
            ws.setdefault("training_plan_id", 0)
            dailies = ws.get("daily_trainings") or []
            for dt in dailies:
                dt.setdefault("weekly_schedule_id", 0)
                tt = dt.get("training_type")
                if isinstance(tt, str):
                    tt_norm = tt.strip().lower()
                    # Map common synonyms to enum values
                    if tt_norm in {"active recovery", "active_recovery", "recovery", "rest day", "rest_day"}:
                        tt_norm = "rest"
                    dt["training_type"] = tt_norm
                # Normalize day_of_week capitalization
                dow = dt.get("day_of_week")
                if isinstance(dow, str):
                    dt["day_of_week"] = weekday_map.get(dow.strip().lower(), dow)
        return tp
