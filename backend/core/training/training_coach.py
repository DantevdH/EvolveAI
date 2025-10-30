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
                    # Generate questions using OpenAI - TRACK AI LATENCY
                    ai_start = time.time()
                    completion = self.openai_client.chat.completions.parse(
                        model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4"),
                        messages=[{"role": "system", "content": prompt}],
                        response_format=AIQuestionResponse,
                        temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
                    )
                    ai_duration = time.time() - ai_start
                    
                    # Track AI latency and token usage (tokens extracted automatically from completion)
                    await db_service.log_latency_event("initial_questions", ai_duration, completion)

                    questions_response = completion.choices[0].message.parsed
                    
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
                    # Generate questions using OpenAI - TRACK AI LATENCY
                    ai_start = time.time()
                    completion = self.openai_client.chat.completions.parse(
                        model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4"),
                        messages=[{"role": "system", "content": prompt}],
                        response_format=AIQuestionResponse,
                        temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
                    )
                    ai_duration = time.time() - ai_start
                    
                    # Track AI latency and token usage (tokens extracted automatically from completion)
                    await db_service.log_latency_event("followup_questions", ai_duration, completion)

                    # Get the parsed response
                    question_response = completion.choices[0].message.parsed
                    
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
        playbook: Optional[UserPlaybook] = None,
    ) -> Dict[str, Any]:
        """
        Generate the initial training plan during onboarding.
        
        1. Loads playbook with Q&A lessons (created during plan generation)
        2. Generates plan using lessons (does NOT mark as "applied" - no history yet)
        3. AI generates exercises with metadata which are then matched to database
        
        Args:
            personal_info: User's personal information and goals
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions
            user_profile_id: Database ID of the user profile (also used for latency tracking)
            jwt_token: JWT token for database authentication
            playbook: Optional pre-loaded playbook (avoids duplicate DB call if already loaded)
        """
        # Load current playbook from database only if not provided
        if not playbook:
            playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)
        
        if not playbook:
            self.logger.warning("No playbook found - creating empty playbook")
            playbook = UserPlaybook(
                user_id=personal_info.user_id,
                lessons=[],
                total_lessons=0,
            )
        
        # Pass the playbook to internal method (AI will generate exercises with metadata for matching)
        return await self._generate_training_plan_internal(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            playbook=playbook,
            jwt_token=jwt_token,
            is_regeneration=False,
            user_profile_id=user_profile_id,
        )
    
    async def regenerate_training_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        user_profile_id: int,
        jwt_token: str = None,
    ) -> Dict[str, Any]:
        """
        Regenerate training plan after user has trained and provided feedback.
        
        Uses playbook lessons from training history AND marks which lessons
        were applied in the new plan.
        
        Args:
            personal_info: User's personal information and goals
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions
            user_profile_id: Database ID of the user profile (also used for latency tracking)
            jwt_token: JWT token for database authentication
        """
        # Load current playbook from database
        playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)
        
        if not playbook:
            self.logger.warning("No playbook found - creating empty playbook")
            playbook = UserPlaybook(
                user_id=personal_info.user_id,
                lessons=[],
                total_lessons=0,
            )
        
        # Pass the playbook to internal method
        return await self._generate_training_plan_internal(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            playbook=playbook,
            jwt_token=jwt_token,
            is_regeneration=True,
            user_profile_id=user_profile_id,
        )
    
    async def _generate_training_plan_internal(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        playbook: UserPlaybook,
        jwt_token: str = None,
        is_regeneration: bool = False,
        user_profile_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Internal method to generate training plans.
        
        Args:
            personal_info: User's personal information and goals
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions
            playbook: UserPlaybook with lessons to use in plan generation
            jwt_token: JWT token for database authentication
            is_regeneration: If True, marks playbook lessons as applied and updates playbook.
                           If False (onboarding), uses playbook but doesn't update it.
            user_profile_id: User profile ID for latency tracking (optional)
        """
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                self.logger.debug("DEBUG MODE: Using mock training plan")
                from core.training.helpers.mock_data import create_mock_training_plan

                training_plan = create_mock_training_plan()
                training_dict = training_plan.model_dump()
                self.logger.debug(
                    f"DEBUG MODE: Generated mock training plan with {len(training_dict.get('weekly_schedules', []))} weeks"
                )
                return {
                    "success": True,
                    "training_plan": training_dict,
                    "metadata": {
                        "exercises_candidates": 0,
                        "validation_messages": ["Debug mode: Using mock data"],
                        "generation_method": "Mock Data (Debug Mode)",
                    },
                }

            # Step 1: Get metadata options from database (equipment, main_muscles)
            self.logger.info("Fetching exercise metadata options from database...")
            metadata_options = self.exercise_selector.get_metadata_options()
            self.logger.info(
                f"Metadata options: {len(metadata_options.get('equipment', []))} equipment types, "
                f"{len(metadata_options.get('main_muscles', []))} muscle groups"
            )

            # Step 2: Use playbook for personalized context (passed as parameter)
            self.logger.info(f"Using playbook with {len(playbook.lessons)} lessons for plan generation")
            
            active_lessons = (
                playbook.get_active_lessons(min_confidence=0.3) if playbook else []
            )

            if active_lessons:
                self.logger.info(
                    f"Using {len(active_lessons)} active lessons in plan generation"
                )
            else:
                self.logger.info("No active lessons found")

            # Convert lessons to dict format for prompt
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

            # Step 3: Generate plan with metadata options (AI will generate name + metadata)
            prompt = PromptGenerator.generate_training_plan_prompt(
                personal_info,
                formatted_initial_responses,
                formatted_follow_up_responses,
                metadata_options=metadata_options,
                playbook_lessons=playbook_lessons_dict,
            )

            # Step 4: Get the training plan - TRACK AI LATENCY
            model_name = os.getenv("OPENAI_MODEL", "gpt-4o")
            self.logger.info(f"🤖 Generating training plan with AI model: {model_name} (AI will generate exercise name + metadata)...")
            
            ai_start_plan = time.time()
            # Note: No max_completion_tokens - structured output requires complete JSON.
            # Token reduction comes from prompt word limits (MAX 40/30/20 words per justification)
            completion = self.openai_client.chat.completions.parse(
                model=model_name,
                messages=[{"role": "system", "content": prompt}],
                response_format=TrainingPlan,
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
            )
            plan_gen_duration = time.time() - ai_start_plan

            training_plan = completion.choices[0].message.parsed
            training_dict = training_plan.model_dump()
            
            # Verify plan structure (should be exactly 1 week)
            num_weeks = len(training_dict.get("weekly_schedules", []))
            num_days_per_week = [len(week.get("daily_trainings", [])) for week in training_dict.get("weekly_schedules", [])]
            self.logger.info(f"📊 Generated plan structure: {num_weeks} weekly_schedule(s), days per week: {num_days_per_week}")
            if num_weeks != 1:
                self.logger.warning(f"⚠️ AI generated {num_weeks} weeks instead of 1! Prompt enforcement may need adjustment.")

            # Step 5: Post-process strength exercises (match AI-generated metadata to database)
            self.logger.info("Post-processing strength exercises (matching to database)...")
            validated_training = self.exercise_validator.post_process_strength_exercises(training_dict)
            
            # Step 6: Validate the training plan with exercise_validator (checks exercise_id existence)
            validation_messages = []
            self.logger.info("Validating training plan...")
            validated_training, validation_messages = (
                self.exercise_validator.validate_training_plan(validated_training)
            )

            self.logger.info(
                f"Validation complete: {len(validation_messages)} messages"
            )
            for message in validation_messages:
                self.logger.debug(f"   {message}")

            # Step 7: Identify which lessons were applied & update playbook (only for regeneration)
            applied_lesson_ids = []
            identify_duration = 0.0
            
            if is_regeneration and playbook_lessons_dict and len(playbook_lessons_dict) > 0:
                self.logger.info(
                    "Identifying which lessons were applied in the plan (regeneration mode)..."
                )
                # Track AI call for identify_applied_lessons
                ai_start_identify = time.time()
                applied_lesson_ids = self.reflector.identify_applied_lessons(
                    training_plan=validated_training,
                    playbook_lessons=playbook_lessons_dict,
                    personal_info=personal_info,
                )
                identify_duration = time.time() - ai_start_identify
                self.logger.info(f"Identify applied lessons AI call took {identify_duration:.2f}s")

                # Update playbook with application counts
                if applied_lesson_ids and playbook:
                    playbook = self.curator.mark_lessons_as_applied(
                        playbook, applied_lesson_ids
                    )
                    self.logger.info(
                        f"Updated playbook: {len(applied_lesson_ids)} lessons marked as applied [[memory:8636680]]"
                    )
            elif not is_regeneration and playbook_lessons_dict:
                self.logger.info(
                    f"Skipping playbook update (initial plan): {len(playbook_lessons_dict)} lessons used as constraints"
                )
            
            # Track latency for initial_plan or regenerate_plan
            if is_regeneration:
                # regenerate_plan: track both AI calls (plan generation + identify)
                # Note: identify_lessons doesn't return token usage, so we only log plan generation tokens
                total_ai_duration = plan_gen_duration + identify_duration
                await db_service.log_latency_event("regenerate_plan", total_ai_duration, completion)
                self.logger.info(f"Regenerate plan total AI calls: {total_ai_duration:.2f}s (plan: {plan_gen_duration:.2f}s, identify: {identify_duration:.2f}s)")
            else:
                # initial_plan: track only plan generation AI call
                await db_service.log_latency_event("initial_plan", plan_gen_duration, completion)
                self.logger.info(f"Initial plan AI call: {plan_gen_duration:.2f}s")

            # The AI message is now generated within the TrainingPlan by the LLM
            # Extract it from the training plan for the API response
            ai_message = validated_training.get("ai_message") if isinstance(validated_training, dict) else getattr(validated_training, "ai_message", None)
            
            # Fallback message if AI didn't generate one
            if not ai_message:
                ai_message = f"🎉 Amazing! I've created your personalized plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨"
                # Add fallback to the training plan
                if isinstance(validated_training, dict):
                    validated_training["ai_message"] = ai_message

            # Save playbook to the training plan (will be saved when plan is saved to DB)
            result_dict = {
                "success": True,
                "training_plan": validated_training,
                "user_playbook": (
                    playbook.model_dump() if playbook else None
                ),  # Include playbook for saving
                "completion_message": ai_message,  # Keep for backward compatibility with API
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                    "metadata_options_count": {
                        "equipment": len(metadata_options.get("equipment", [])),
                        "main_muscles": len(metadata_options.get("main_muscles", []))
                    },
                    "playbook_lessons_count": len(playbook.lessons) if playbook else 0,
                    "playbook_initialized": (
                        len(playbook.lessons) > 0 if playbook else False
                    ),
                    "lessons_applied_count": len(applied_lesson_ids),
                    "lessons_applied_ids": applied_lesson_ids,
                    "formatted_initial_responses": formatted_initial_responses,  # Store for feedback updates
                    "formatted_follow_up_responses": formatted_follow_up_responses,  # Store for feedback updates
                },
            }

            return result_dict

        except Exception as e:
            self.logger.error(f"Error generating training plan: {e}")
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
    ) -> List[PlaybookLesson]:
        """
        Extract initial "seed" lessons from onboarding Q&A responses.
        
        This is a wrapper around reflector.extract_initial_lessons that maintains
        a clean API for the TrainingCoach.
        
        Args:
            personal_info: User's personal information
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions
            
        Returns:
            List of PlaybookLesson objects representing initial constraints/preferences
        """
        return self.reflector.extract_initial_lessons(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
        )
        
    async def process_training_feedback(
        self, outcome: TrainingOutcome, personal_info: PersonalInfo, plan_context: str
    ) -> Dict[str, Any]:
        """
        Process training feedback using the ACE pattern: Reflector → Curator → Update Playbook.
        
        DEPRECATED: Use process_daily_training_feedback for daily feedback loop.

        Args:
            outcome: TrainingOutcome with completion data, feedback, HR, etc.
            personal_info: User's personal information
            plan_context: Context about the training plan (description, structure, etc.)

        Returns:
            Dictionary with results of the feedback processing
        """
        try:
            self.logger.info(
                f"Processing feedback for plan {outcome.plan_id}, week {outcome.week_number} [[memory:8636680]]"
            )

            # Step 0: Get user_profile_id from user_id
            user_profile = await db_service.get_user_profile_by_user_id(outcome.user_id)
            if not user_profile.get("success") or not user_profile.get("data"):
                self.logger.error(
                    f"Failed to get user profile for user_id {outcome.user_id}"
                )
                return {"success": False, "message": "User profile not found"}

            user_profile_id = user_profile["data"].get("id")

            # Step 1: Load current playbook from user_profiles
            playbook = await db_service.load_user_playbook(user_profile_id)

            # Step 2: Reflector - analyze outcome and generate lessons
            self.logger.info("Reflector analyzing outcome...")
            analyses = self.reflector.analyze_outcome(
                outcome=outcome,
                personal_info=personal_info,
                plan_context=plan_context,
                previous_lessons=playbook.lessons if playbook else [],
            )

            if not analyses:
                self.logger.info("No lessons generated from this outcome")
                return {
                    "success": True,
                    "lessons_generated": 0,
                    "playbook_updated": False,
                    "message": "No actionable lessons from this feedback cycle",
                }

            self.logger.info(f"Reflector generated {len(analyses)} lessons")

            # Step 3: Curator - process each lesson and decide what to do
            self.logger.info("Curator processing lessons...")
            decisions = []
            for analysis in analyses:
                decision, lesson = self.curator.process_new_lesson(
                    analysis=analysis,
                    existing_playbook=playbook,
                    source_plan_id=outcome.plan_id,
                )
                decisions.append((decision, lesson))
                self.logger.info(
                    f"Curator decision: {decision.action} - {decision.reasoning}"
                )

            # Step 4: Update playbook with curator decisions
            updated_playbook = self.curator.update_playbook(playbook, decisions)

            # Step 5: Save updated playbook to user_profiles
            saved = await db_service.save_user_playbook(
                user_profile_id, updated_playbook.model_dump()
            )

            return {
                "success": True,
                "lessons_generated": len(analyses),
                "lessons_added": sum(1 for d, _ in decisions if d.action == "add_new"),
                "lessons_updated": sum(
                    1
                    for d, _ in decisions
                    if d.action in ["merge_with_existing", "update_existing"]
                ),
                "lessons_rejected": sum(
                    1 for d, _ in decisions if d.action == "reject"
                ),
                "total_lessons_in_playbook": len(updated_playbook.lessons),
                "playbook_updated": saved,
                "decisions": [
                    {
                        "action": d.action,
                        "reasoning": d.reasoning,
                        "similarity": d.similarity_score,
                    }
                    for d, _ in decisions
                ],
                "message": f"Processed {len(analyses)} lessons, playbook now has {len(updated_playbook.lessons)} total lessons",
            }

        except Exception as e:
            self.logger.error(f"Error processing training feedback: {e}")
            return {"success": False, "error": str(e)}

    async def process_daily_training_feedback(
        self,
        outcome: "DailyTrainingOutcome",
        original_training: Dict[str, Any],
        actual_training: Dict[str, Any],
        personal_info: PersonalInfo,
        session_context: str,
        user_profile_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Process DAILY training feedback using the ACE pattern with modification tracking.

        This is the main feedback loop for the new daily feedback system. It:
        1. Compares original vs actual training to detect modifications (no LLM needed)
        2. Uses Reflector to analyze the session outcome and modifications
        3. Uses Curator to integrate lessons into the playbook
        4. Updates the training status in database ONLY after feedback is processed

        Args:
            outcome: DailyTrainingOutcome with session data and feedback
            original_training: Original planned training from database
            actual_training: What user actually did from frontend
            personal_info: User's personal information
            session_context: Brief description of the session

        Returns:
            Dictionary with results of the feedback processing
        """
        try:
            from core.base.schemas.playbook_schemas import DailyTrainingOutcome
            from core.training.helpers.training_comparison import TrainingComparison

            self.logger.info(
                f"Processing daily feedback: plan {outcome.plan_id}, week {outcome.week_number}, {outcome.day_of_week} [[memory:8636680]]"
            )

            # Step 0: Get user_profile_id from user_id
            user_profile = await db_service.get_user_profile_by_user_id(outcome.user_id)
            if not user_profile.get("success") or not user_profile.get("data"):
                self.logger.error(
                    f"Failed to get user profile for user_id {outcome.user_id}"
                )
                return {"success": False, "message": "User profile not found"}

            user_profile_id = user_profile["data"].get("id")

            # Step 1: Compare original vs actual training (detect modifications)
            self.logger.info("Comparing original vs actual training for modifications...")
            modifications = TrainingComparison.compare_daily_training(
                original_training, actual_training
            )
            modifications_summary = TrainingComparison.format_modifications_for_analysis(
                modifications
            )

            self.logger.info(f"Detected {len(modifications)} modification(s)")

            # Step 2: Load current playbook
            playbook = await db_service.load_user_playbook(user_profile_id)

            # Step 3: Decide if we should analyze (skip if feedback skipped AND no modifications)
            should_analyze = (
                outcome.feedback_provided
                or len(modifications) > 0
                or outcome.injury_reported
                or not outcome.session_completed
            )

            analyses = []
            reflector_duration = 0.0
            
            if should_analyze:
                # Step 4: Reflector - analyze daily outcome - TRACK AI CALL
                self.logger.info("Reflector analyzing daily session...")
                ai_start_reflector = time.time()
                analyses = self.reflector.analyze_daily_outcome(
                    outcome=outcome,
                    personal_info=personal_info,
                    session_context=session_context,
                    modifications_summary=modifications_summary,
                    previous_lessons=playbook.lessons if playbook else [],
                )
                reflector_duration = time.time() - ai_start_reflector
                self.logger.info(f"Reflector AI call took {reflector_duration:.2f}s, generated {len(analyses)} lessons")
            else:
                self.logger.info(
                    "No analysis needed - feedback skipped and no significant signals"
                )

            # Step 5: Curator - process lessons (if any) - TRACK AI CALLS
            decisions = []
            curator_ai_duration = 0.0
            
            if analyses:
                self.logger.info("Curator processing lessons...")
                for analysis in analyses:
                    # Curator may make AI calls for similarity checking
                    ai_start_curator = time.time()
                    decision, lesson = self.curator.process_new_lesson(
                        analysis=analysis,
                        existing_playbook=playbook,
                        source_plan_id=outcome.plan_id,
                    )
                    curator_ai_duration += (time.time() - ai_start_curator)
                    decisions.append((decision, lesson))
                    self.logger.info(
                        f"Curator decision: {decision.action} - {decision.reasoning}"
                    )
                
                if curator_ai_duration > 0:
                    self.logger.info(f"Curator AI calls took {curator_ai_duration:.2f}s total")

                # Step 6: Update playbook with curator decisions
                updated_playbook = self.curator.update_playbook(playbook, decisions)

                # Step 7: Save updated playbook
                saved = await db_service.save_user_playbook(
                    user_profile_id, updated_playbook.model_dump()
                )
            else:
                saved = False

            # Step 8: Update training status in database (NOW after feedback)
            # Mark the daily training as completed in Supabase
            await db_service.update_daily_training_status(
                daily_training_id=outcome.daily_training_id,
                completed=outcome.session_completed,
                completion_percentage=outcome.completion_percentage,
                modifications=modifications,
                feedback_provided=outcome.feedback_provided,
            )

            self.logger.info(
                f"✅ Daily training {outcome.daily_training_id} status updated in database"
            )

            # Calculate metrics for return and telemetry
            lessons_added_count = sum(1 for d, _ in decisions if d.action == "add_new")
            lessons_updated_count = sum(
                1 for d, _ in decisions if d.action in ["merge_with_existing", "update_existing"]
            )
            
            # Track playbook AI latency (Reflector + Curator)
            # TODO: Add token tracking - requires refactoring Reflector/Curator to return usage
            total_playbook_ai = reflector_duration + curator_ai_duration
            await db_service.log_latency_event("playbook", total_playbook_ai)
            self.logger.info(f"Playbook total AI calls: {total_playbook_ai:.2f}s (reflector: {reflector_duration:.2f}s, curator: {curator_ai_duration:.2f}s)")
            
            # For telemetry, calculate total duration including all processing
            duration_ms = int(total_playbook_ai * 1000)  # Use AI duration for consistency

            # Track telemetry - feedback session
            ACETelemetry.track_feedback_session(
                user_id=outcome.user_id,
                feedback_provided=outcome.feedback_provided,
                lessons_generated=len(analyses),
                lessons_added=lessons_added_count,
                lessons_updated=lessons_updated_count,
                modifications_detected=len(modifications),
                session_duration_ms=duration_ms
            )

            # Track telemetry - playbook state (if updated)
            if analyses and decisions:
                updated_playbook = locals().get('updated_playbook')
                if updated_playbook and hasattr(updated_playbook, 'lessons'):
                    positive_count = sum(1 for l in updated_playbook.lessons if l.positive)
                    warning_count = len(updated_playbook.lessons) - positive_count
                    avg_conf = sum(l.confidence for l in updated_playbook.lessons) / len(updated_playbook.lessons) if updated_playbook.lessons else 0
                    max_applied = max((l.times_applied for l in updated_playbook.lessons), default=0)
                    
                    ACETelemetry.track_playbook_state(
                        user_id=outcome.user_id,
                        total_lessons=len(updated_playbook.lessons),
                        positive_lessons=positive_count,
                        warning_lessons=warning_count,
                        avg_confidence=avg_conf,
                        most_applied_lesson_times=max_applied
                    )

            return {
                "success": True,
                "lessons_generated": len(analyses),
                "lessons_added": lessons_added_count,
                "lessons_updated": lessons_updated_count,
                "lessons_rejected": sum(
                    1 for d, _ in decisions if d.action == "reject"
                ),
                "modifications_detected": len(modifications),
                "total_lessons_in_playbook": len(playbook.lessons),
                "playbook_updated": saved,
                "training_status_updated": True,
                "decisions": [
                    {
                        "action": d.action,
                        "reasoning": d.reasoning,
                        "similarity": d.similarity_score,
                    }
                    for d, _ in decisions
                ],
                "message": f"Processed daily session: {len(analyses)} lessons generated, {len(modifications)} modifications detected",
            }

        except Exception as e:
            self.logger.error(f"Error processing daily training feedback: {e}")
            return {"success": False, "error": str(e)}

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

    def _summarize_plan_for_context(self, current_plan: Dict[str, Any]) -> str:
        """
        Create a brief summary of the current plan for context in prompts.
        
        Used for operation parsing to give AI context about what exercises/days exist.
        """
        try:
            weekly_schedules = current_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                return "Empty plan"
            
            week = weekly_schedules[0]
            daily_trainings = week.get("daily_trainings", [])
            
            summary_lines = []
            for day in daily_trainings:
                day_name = day.get("day_of_week", "Unknown")
                is_rest = day.get("is_rest_day", False)
                
                if is_rest:
                    summary_lines.append(f"- {day_name}: Rest")
                else:
                    # Count exercises
                    strength_count = len(day.get("strength_exercises", []))
                    endurance_count = len(day.get("endurance_sessions", []))
                    
                    if strength_count > 0:
                        # List first 2-3 exercise names
                        exercise_names = [ex.get("exercise_name", "Unknown") for ex in day.get("strength_exercises", [])[:3]]
                        exercises_str = ", ".join(exercise_names)
                        if strength_count > 3:
                            exercises_str += f" (+{strength_count - 3} more)"
                        summary_lines.append(f"- {day_name}: Strength ({strength_count} exercises: {exercises_str})")
                    
                    if endurance_count > 0:
                        sessions = day.get("endurance_sessions", [])
                        session_names = [s.get("name", "Endurance") for s in sessions[:2]]
                        sessions_str = ", ".join(session_names)
                        if endurance_count > 2:
                            sessions_str += f" (+{endurance_count - 2} more)"
                        summary_lines.append(f"- {day_name}: Endurance ({endurance_count} sessions: {sessions_str})")
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            self.logger.warning(f"Error summarizing plan: {e}")
            return "Unable to summarize plan"

    async def classify_feedback_intent_lightweight(
        self,
        feedback_message: str,
        conversation_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        STAGE 1: Lightweight intent classification (no operations parsing).
        
        Fast and efficient - only uses feedback and conversation history.
        No plan details, assessment data, or metadata needed.
        
        Args:
            feedback_message: User's feedback message
            conversation_history: Conversation context
        
        Returns:
            Classification result with intent, action, ai_message (no operations)
        """
        try:
            # Build conversation context
            context = self._build_conversation_context(conversation_history)
            
            # Get lightweight prompt
            prompt = PromptGenerator.generate_lightweight_intent_classification_prompt(
                feedback_message=feedback_message,
                conversation_context=context
            )
            
            # Use structured parsing with Pydantic model - TRACK AI CALL
            from core.training.schemas.question_schemas import FeedbackIntentClassification
            ai_start = time.time()
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o"),
                messages=[{"role": "user", "content": prompt}],
                response_format=FeedbackIntentClassification
            )
            duration = time.time() - ai_start
            
            parsed_obj = completion.choices[0].message.parsed
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

    async def parse_feedback_operations(
        self,
        feedback_message: str,
        current_plan: Dict[str, Any],
        personal_info: PersonalInfo,
        formatted_initial_responses: str = "",
        formatted_follow_up_responses: str = ""
    ) -> Dict[str, Any]:
        """
        STAGE 2: Parse operations from feedback (only for update_request intent).
        
        Uses full context: assessment data, plan details, metadata options.
        Only called when Stage 1 determined intent is "update_request".
        
        Args:
            feedback_message: User's feedback message
            current_plan: Current training plan dict
            personal_info: User's personal information
            formatted_initial_responses: Formatted initial question responses
            formatted_follow_up_responses: Formatted follow-up question responses
        
        Returns:
            Operations result with list of operations and ai_message
        """
        try:
            # Summarize plan
            plan_summary = self._summarize_plan_for_context(current_plan)
            
            # Get metadata options from database (cached after first call)
            metadata_options = self.exercise_selector.get_metadata_options()
            
            # Get operation parsing prompt
            prompt = PromptGenerator.generate_operation_parsing_prompt(
                feedback_message=feedback_message,
                personal_info=personal_info,
                current_plan_summary=plan_summary,
                formatted_initial_responses=formatted_initial_responses,
                formatted_follow_up_responses=formatted_follow_up_responses,
                metadata_options=metadata_options
            )
            
            # Use structured parsing with Pydantic model - TRACK AI CALL
            from core.training.schemas.question_schemas import FeedbackOperations
            ai_start = time.time()
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o"),
                messages=[{"role": "user", "content": prompt}],
                response_format=FeedbackOperations
            )
            duration = time.time() - ai_start
            
            parsed_obj = completion.choices[0].message.parsed
            # Use mode='json' to properly serialize Enums to string values
            result = parsed_obj.model_dump(mode='json') if hasattr(parsed_obj, 'model_dump') else parsed_obj
            result['_parse_duration'] = duration
            
            # Track latency with tokens
            await db_service.log_latency_event("feedback_parse_operations", duration, completion)
            
            ops_count = len(result.get('operations', []))
            self.logger.info(f"⚙️ Operation parsing took {duration:.2f}s ({ops_count} operation(s) parsed)")
            
            if ops_count > 0:
                self.logger.info(f"🔍 Parsed operations:")
                for idx, op in enumerate(result.get('operations', [])):
                    self.logger.info(f"  Op {idx+1}: type={op.get('type')}, keys={list(op.keys())}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error parsing operations: {str(e)}")
            # Return empty operations to fallback to "unclear"
            return {
                "operations": [],
                "ai_message": "I'm having trouble parsing your requested changes. Could you be more specific?"
            }

    async def classify_feedback_intent(
        self,
        feedback_message: str,
        conversation_history: List[Dict[str, str]],
        current_plan: Optional[Dict[str, Any]] = None,
        personal_info: Optional[PersonalInfo] = None,
        formatted_initial_responses: str = "",
        formatted_follow_up_responses: str = ""
    ) -> Dict[str, Any]:
        """
        LEGACY: Single-stage classification with operations (combined approach).
        
        Use classify_feedback_intent_lightweight() + parse_feedback_operations() instead.
        Keeping this for backward compatibility during migration.
        
        Args:
            feedback_message: User's feedback message
            conversation_history: Conversation context
            current_plan: Current training plan dict (for summarizing in prompt)
            personal_info: User's personal information (age, goals, equipment, etc.)
            formatted_initial_responses: Formatted initial question responses
            formatted_follow_up_responses: Formatted follow-up question responses
        
        Returns:
            Classification result with intent, confidence, action, and operations
        """
        try:
            # Build conversation context
            context = self._build_conversation_context(conversation_history)
            
            # Summarize plan if provided
            plan_summary = ""
            if current_plan:
                plan_summary = self._summarize_plan_for_context(current_plan)
            
            # Get metadata options from database (for operation parsing)
            # This allows the AI to extract main_muscle and equipment for exercise swaps
            self.logger.info("Fetching exercise metadata options for operation parsing...")
            metadata_options = self.exercise_selector.get_metadata_options()
            
            # Get prompt from PromptGenerator (with full context like plan generation)
            prompt = PromptGenerator.generate_feedback_classification_with_operations_prompt(
                feedback_message=feedback_message,
                personal_info=personal_info,
                conversation_context=context,
                formatted_initial_responses=formatted_initial_responses,
                formatted_follow_up_responses=formatted_follow_up_responses,
                plan_summary=plan_summary,
                metadata_options=metadata_options
            )
            
            # Use structured parsing with Pydantic model - TRACK AI CALL
            from core.training.schemas.question_schemas import FeedbackClassification
            ai_start_classify = time.time()
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o"),
                messages=[{"role": "user", "content": prompt}],
                response_format=FeedbackClassification
            )
            classify_duration = time.time() - ai_start_classify

            # Debug: Log raw completion content
            raw_content = completion.choices[0].message.content
            self.logger.debug(f"🤖 Raw AI response content: {raw_content[:500]}..." if len(raw_content or "") > 500 else f"🤖 Raw AI response content: {raw_content}")
            
            parsed_obj = completion.choices[0].message.parsed
            result = parsed_obj.model_dump() if hasattr(parsed_obj, 'model_dump') else parsed_obj
            result['_classify_duration'] = classify_duration  # Store duration in result for later tracking
            
            # Track classification AI latency with tokens (logged separately, combined later for intent-based flow)
            await db_service.log_latency_event("feedback_classify", classify_duration, completion)
            
            # Log with operations count if present
            ops_count = len(result.get('operations', []))
            ops_info = f", {ops_count} operation(s) parsed" if ops_count > 0 else ""
            self.logger.info(f"Feedback classification AI call took {classify_duration:.2f}s (intent: {result['intent']}, confidence: {result['confidence']}{ops_info})")
            
            # Debug: Log full classification result
            if ops_count > 0:
                self.logger.info(f"🔍 Operations details from AI:")
                for idx, op in enumerate(result.get('operations', [])):
                    self.logger.info(f"  Op {idx+1}: {op}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error classifying feedback: {str(e)}")
            # Default to safe response
            return {
                "intent": "general",
                "confidence": 0.5,
                "action": "respond_only",
                "reasoning": "Error in classification, defaulting to safe response",
                "needs_plan_update": False,
                "specific_changes": []
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
