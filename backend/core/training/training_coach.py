"""
Enhanced training Coach Agent with AI Question Generation and Training Plan Creation
Includes ACE (Adaptive Context Engine) pattern for personalized learning
"""

import os
import json
import openai
from typing import List, Dict, Any, Optional

from core.base.base_agent import BaseAgent
from logging_config import get_logger
from core.base.rag_tool import RAGTool

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
    TrainingPlanOutline,
    ExerciseRetrievalDecision,
)
from core.training.helpers.response_formatter import ResponseFormatter
from core.training.helpers.mock_data import create_mock_training_plan_outline
from core.training.helpers.prompt_generator import PromptGenerator

# Import ACE pattern components
from core.base.schemas.playbook_schemas import (
    UserPlaybook,
    PlaybookLesson,
    TrainingOutcome,
    ReflectorAnalysis,
    PlaybookStats,
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

    def generate_initial_questions(
        self, personal_info: PersonalInfo
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

            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7,
            )

            questions_response = completion.choices[0].message.parsed

            return questions_response

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

    def generate_follow_up_questions(
        self,
        personal_info: PersonalInfo,
        formatted_responses: str,
        initial_questions: List[AIQuestion] = None,
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

            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7,
            )

            # Get the parsed response
            question_response = completion.choices[0].message.parsed

            # Return with formatted responses and AI message
            return AIQuestionResponseWithFormatted(
                questions=question_response.questions,
                total_questions=question_response.total_questions,
                estimated_time_minutes=question_response.estimated_time_minutes,
                formatted_responses=formatted_responses,  # Already formatted by API
                ai_message=question_response.ai_message,
            )

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
                    )
                ],
                total_questions=1,
                estimated_time_minutes=1,
                formatted_responses=formatted_responses,  # Already formatted by API
                ai_message="I need to ask a few more questions to create your perfect training plan. 💪",
            )

    def generate_training_plan_outline(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        initial_questions: List[AIQuestion] = None,
        follow_up_questions: List[AIQuestion] = None,
        playbook: UserPlaybook = None,
    ) -> Dict[str, Any]:
        """Generate a training plan outline before creating the final detailed plan."""
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                self.logger.debug("DEBUG MODE: Using mock training plan outline")
                outline = create_mock_training_plan_outline()

                # Extract ai_message from outline to prevent duplication
                outline_dict = outline.model_dump()
                ai_message = outline_dict.pop("ai_message", None)

                return {
                    "success": True,
                    "outline": outline_dict,
                    "ai_message": ai_message,
                    "metadata": {
                        "generation_method": "Mock Data (Debug Mode)",
                        "user_goals": personal_info.goal_description,
                    },
                }

            # Log playbook context for outline generation
            if playbook and playbook.lessons:
                self.logger.info(
                    f"Generating outline with {len(playbook.lessons)} playbook lessons"
                )

            # Create a comprehensive prompt for outline generation
            prompt = PromptGenerator.generate_training_plan_outline_prompt(
                personal_info,
                formatted_initial_responses,
                formatted_follow_up_responses,
                playbook=playbook,
            )

            # Generate the outline using OpenAI with structured output
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert training coach creating training plan outlines. Provide structured, detailed outlines that give users a clear preview of their upcoming training plan.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=TrainingPlanOutline,
                temperature=0.7,
            )

            # Parse the structured response
            outline = completion.choices[0].message.parsed

            # Extract ai_message from outline to prevent duplication
            outline_dict = outline.model_dump()
            ai_message = outline_dict.pop("ai_message", None)

            return {
                "success": True,
                "outline": outline_dict,
                "ai_message": ai_message,
                "metadata": {
                    "generation_method": "AI Generated",
                    "user_goals": personal_info.goal_description,
                    "experience_level": personal_info.experience_level,
                },
            }

        except Exception as e:
            self.logger.error(f"Error generating training plan outline: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate training plan outline: {str(e)}",
            }

    async def generate_training_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        plan_outline: dict = None,
        initial_questions: List[AIQuestion] = None,
        follow_up_questions: List[AIQuestion] = None,
    ) -> Dict[str, Any]:
        """Generate a comprehensive training plan with AI-decided exercise retrieval."""
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

            # Step 1: Let AI decide if we need exercises
            self.logger.info("AI analyzing if exercises are needed...")

            combined_responses = (
                f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
            )
            decision_prompt = PromptGenerator.generate_exercise_decision_prompt(
                personal_info, combined_responses, plan_outline
            )

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": decision_prompt}],
                response_format=ExerciseRetrievalDecision,
                temperature=0.3,  # Lower temp for consistent decisions
            )

            decision = completion.choices[0].message.parsed

            self.logger.info(
                f"AI Decision: {'Retrieve exercises' if decision.retrieve_exercises else 'No exercises needed'}"
            )
            self.logger.info(f"Reasoning: {decision.reasoning}")

            # Step 2: Retrieve exercises if needed
            exercise_info = ""
            exercises_retrieved = 0

            if decision.retrieve_exercises:
                self.logger.info("Retrieving exercises with AI-decided parameters...")
                self.logger.info(
                    f"   - Difficulty: {decision.difficulty or personal_info.experience_level}"
                )

                # Extract equipment strings from enum values for SQL search
                equipment_list = (
                    [eq.value for eq in decision.equipment]
                    if decision.equipment
                    else None
                )
                self.logger.info(f"   - Equipment: {equipment_list}")

                # Use AI-decided parameters or fallback to defaults
                difficulty = (
                    decision.difficulty or personal_info.experience_level or "beginner"
                )

                # Get exercises using existing exercise_selector
                all_exercises = self.exercise_selector.get_exercise_candidates(
                    difficulty=difficulty, equipment=equipment_list
                )

                exercises_retrieved = len(all_exercises)
                self.logger.info(f"Retrieved {exercises_retrieved} exercise candidates")

                # Check if we have exercises available
                if not all_exercises:
                    return {
                        "success": False,
                        "error": "No exercises available for the specified difficulty level and equipment. Please try different parameters.",
                    }

                # Get formatted exercises for AI prompt
                exercise_info = self.exercise_selector.get_formatted_exercises_for_ai(
                    difficulty=difficulty, equipment=equipment_list
                )

                # Check if formatting was successful
                if exercise_info == "No exercises available":
                    return {
                        "success": False,
                        "error": "Failed to format exercises for AI. Please try again.",
                    }
            else:
                self.logger.info("Skipping exercise retrieval (not needed)")
                exercise_info = f"No exercises needed - {decision.alternative_approach or 'focus on sport-specific training sessions'}"

            # Step 3: Load user's playbook for personalized context
            # First try to load from user_profile.initial_playbook (set during outline generation)
            self.logger.info("Loading user playbook for personalized guidance...")

            # Try to get from user profile first (where we stored it during outline)
            user_profile = await db_service.get_user_profile_by_user_id(
                personal_info.user_id
            )
            initial_playbook_data = None

            if user_profile.get("success") and user_profile.get("data"):
                initial_playbook_data = user_profile["data"].get("initial_playbook")

            if initial_playbook_data:
                # Use the playbook from outline generation
                playbook = UserPlaybook(**initial_playbook_data)
                self.logger.info(
                    f"Loaded playbook from outline generation with {len(playbook.lessons)} lessons"
                )
            else:
                # Fallback: try loading from training_plans table
                playbook = await db_service.load_user_playbook(personal_info.user_id)

                # Last resort: extract lessons now
                if not playbook or len(playbook.lessons) == 0:
                    self.logger.warning(
                        "Playbook not found - extracting initial lessons now (should have been done during outline generation)"
                    )
                    initial_lessons = self.extract_initial_lessons_from_onboarding(
                        personal_info,
                        formatted_initial_responses,
                        formatted_follow_up_responses,
                    )

                    # Initialize playbook with onboarding lessons
                    playbook = UserPlaybook(
                        user_id=personal_info.user_id,
                        lessons=initial_lessons,
                        total_lessons=len(initial_lessons),
                    )
                    self.logger.info(
                        f"Initialized playbook with {len(initial_lessons)} onboarding lessons"
                    )

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

            # Step 4: Generate plan with playbook context
            prompt = PromptGenerator.generate_training_plan_prompt(
                personal_info,
                formatted_initial_responses,
                formatted_follow_up_responses,
                plan_outline,
                exercise_info,
                playbook_lessons=playbook_lessons_dict,
            )

            # Step 5: Get the training plan
            self.logger.info("Generating training plan with AI...")
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                messages=[{"role": "system", "content": prompt}],
                response_format=TrainingPlan,
                temperature=0.7,
                max_completion_tokens=15_500,  # Leave buffer below 16,384 max to ensure completion
            )

            training_plan = completion.choices[0].message.parsed
            training_dict = training_plan.model_dump()

            # Step 6: Validate the training plan with exercise_validator (only if exercises were used)
            validation_messages = []
            if decision.retrieve_exercises and exercises_retrieved > 0:
                self.logger.info("Validating training plan...")
                validated_training, validation_messages = (
                    self.exercise_validator.validate_training_plan(training_dict)
                )

                self.logger.info(
                    f"Validation complete: {len(validation_messages)} messages"
                )
                for message in validation_messages:
                    self.logger.debug(f"   {message}")
            else:
                self.logger.info("Skipping exercise validation (no exercises used)")
                validated_training = training_dict

            # Save playbook to the training plan (will be saved when plan is saved to DB)
            result_dict = {
                "success": True,
                "training_plan": validated_training,
                "user_playbook": playbook.model_dump(),  # Include playbook for saving
                "metadata": {
                    "exercises_candidates": exercises_retrieved,
                    "validation_messages": validation_messages,
                    "generation_method": (
                        "AI + Smart Exercise Selection"
                        if decision.retrieve_exercises
                        else "AI + Sport-Specific Training"
                    ),
                    "ai_decision": {
                        "retrieve_exercises": decision.retrieve_exercises,
                        "reasoning": decision.reasoning,
                        "alternative_approach": decision.alternative_approach,
                    },
                    "playbook_lessons_count": len(playbook.lessons) if playbook else 0,
                    "playbook_initialized": (
                        len(playbook.lessons) > 0 if playbook else False
                    ),
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
        return f"""I understand you're asking about: "{user_request}"

While I don't have specific information about this in my knowledge base yet, I can provide general training guidance based on best practices.

For more personalized advice, please try:
- Being more specific about your goals
- Mentioning your experience level
- Specifying available equipment

Would you like me to create a general training plan or recommend some basic exercises?"""

    def _generate_error_response(self, user_request: str) -> str:
        """Generate an error response when processing fails."""
        return f"""I apologize, but I encountered an error while processing your request: "{user_request}"

This might be due to:
- Temporary system issues
- Knowledge base access problems
- Complex request format

Please try rephrasing your request or contact support if the issue persists."""

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
        Extract initial lessons from onboarding Q&A before any training begins.

        This creates the "seed" playbook with constraints, preferences, and context
        that we learned during onboarding (injuries, equipment, schedule, etc.)

        Args:
            personal_info: User's personal information
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions

        Returns:
            List of PlaybookLesson objects representing initial constraints/preferences
        """
        try:
            self.logger.info("Extracting initial lessons from onboarding responses...")

            combined_responses = (
                f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
            )

            prompt = f"""
You are analyzing a user's onboarding responses to extract actionable lessons for their training plan.

**USER PROFILE:**
- Name: {personal_info.username}
- Age: {personal_info.age}
- Goal: {personal_info.goal_description}
- Experience: {personal_info.experience_level}

**COMPLETE ONBOARDING RESPONSES:**
{combined_responses}

**YOUR TASK:**
Extract 3-7 actionable lessons from these responses that should guide ALL future training plans.
These are "seed lessons" - constraints, preferences, and context we learned during onboarding.

**TYPES OF LESSONS TO EXTRACT:**

1. **Physical Constraints** (priority: critical)
   - Injuries, pain, limitations
   - Example: "Avoid high-impact exercises due to knee pain"

2. **Equipment Availability** (priority: high)
   - What equipment they have/don't have
   - Example: "Limited to dumbbells and bodyweight exercises only"

3. **Schedule Constraints** (priority: high)
   - When they can train, how long sessions can be
   - Example: "Can only train early mornings, max 45 minutes per session"

4. **Experience-Based Guidelines** (priority: medium)
   - Skill level appropriate starting points
   - Example: "Beginner level - start with fundamental movement patterns"

5. **Preferences & Motivations** (priority: medium)
   - Training style preferences, what they enjoy/avoid
   - Example: "Prefers varied workouts to prevent boredom"

6. **Goal-Specific Context** (priority: high)
   - Specific requirements for their goal
   - Example: "Targeting fat loss - needs caloric burn focus with heart rate monitoring"

**FORMATTING RULES:**
- Each lesson should be specific and actionable (not generic advice)
- Use imperative language ("Avoid...", "Focus on...", "Include...", "Limit to...")
- Reference specific constraints from their responses
- Mark physical constraints as positive=false (warnings)
- Mark preferences/capabilities as positive=true (guidance)
- Assign appropriate priority levels
- Add relevant tags

**IMPORTANT:**
- These lessons apply to ALL future plans, not just the first one
- Focus on unchanging constraints (injuries, equipment) and strong preferences
- Don't create lessons for things that might change week-to-week

Generate 3-7 lessons in ReflectorAnalysisList format.
"""

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting actionable training constraints and preferences from user responses.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=0.3,
            )

            analyses = completion.choices[0].message.parsed.analyses

            # Convert analyses to PlaybookLessons
            import uuid

            lessons = []
            for analysis in analyses:
                lesson = PlaybookLesson(
                    id=f"onboarding_{uuid.uuid4().hex[:8]}",
                    text=analysis.lesson,
                    tags=analysis.tags + ["onboarding", "initial_constraint"],
                    helpful_count=0,  # Not proven yet
                    harmful_count=0,
                    confidence=analysis.confidence,
                    positive=analysis.positive,
                    source_plan_id="onboarding",
                )
                lessons.append(lesson)

            self.logger.info(
                f"Extracted {len(lessons)} initial lessons from onboarding"
            )
            for lesson in lessons:
                self.logger.info(
                    f"  - [{('✅' if lesson.positive else '⚠️ ')}] {lesson.text}"
                )

            return lessons

        except Exception as e:
            self.logger.error(f"Error extracting initial lessons: {e}")
            return []

    def extract_outline_feedback_lesson(
        self, personal_info: PersonalInfo, outline: dict, feedback: str
    ) -> Optional[PlaybookLesson]:
        """
        Extract a preference lesson from user's outline feedback.

        Args:
            personal_info: User's personal information
            outline: The training plan outline they reviewed
            feedback: User's feedback on the outline

        Returns:
            PlaybookLesson or None if feedback is too vague
        """
        try:
            if not feedback or not feedback.strip():
                return None

            self.logger.info(
                f"Extracting lesson from outline feedback: {feedback[:50]}..."
            )

            prompt = f"""
Analyze user feedback on their training plan outline and extract an actionable preference lesson.

**USER PROFILE:**
- Name: {personal_info.username}
- Goal: {personal_info.goal_description}
- Experience: {personal_info.experience_level}

**OUTLINE THEY REVIEWED:**
Title: {outline.get('title', 'N/A')}
Duration: {outline.get('duration_weeks', 'N/A')} weeks
Approach: {outline.get('explanation', 'N/A')}

**THEIR FEEDBACK:**
"{feedback}"

**YOUR TASK:**
Extract ONE actionable preference lesson from this feedback that should be applied to their training plan.

**EXAMPLES:**
- Feedback: "I prefer cycling over running" 
  → Lesson: "Prioritize cycling for cardio sessions instead of running"

- Feedback: "Can we do more upper body work?"
  → Lesson: "Increase upper body training frequency - user wants more upper focus"

- Feedback: "This looks too intense for me"
  → Lesson: "Reduce training intensity and volume - user prefers moderate progression"

- Feedback: "Looks great!" or "Perfect!"
  → Return None (no specific preference to extract)

**RULES:**
- Only extract if feedback contains a specific preference or concern
- Make it actionable and specific
- Tag appropriately (preferences, volume, intensity, etc.)
- Set confidence to 0.7 (medium - based on one statement)
- Mark as positive=true (it's a preference, not a warning)
- Priority: medium (user preference, not safety concern)

If the feedback is too vague or just approval, return None by setting lesson to empty string.

Return in ReflectorAnalysis format.
"""

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting actionable training preferences from user feedback.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysis,
                temperature=0.3,
            )

            analysis = completion.choices[0].message.parsed

            # Check if we got a valid lesson
            if not analysis.lesson or analysis.lesson.strip() == "":
                self.logger.info(
                    "No actionable lesson from outline feedback (too vague or just approval)"
                )
                return None

            # Convert to PlaybookLesson
            import uuid

            lesson = PlaybookLesson(
                id=f"outline_feedback_{uuid.uuid4().hex[:8]}",
                text=analysis.lesson,
                tags=analysis.tags + ["outline_feedback", "user_preference"],
                helpful_count=0,
                harmful_count=0,
                confidence=0.7,  # Medium confidence from single feedback
                positive=True,  # Preferences are positive guidance
                source_plan_id="outline_feedback",
            )

            self.logger.info(f"Extracted outline feedback lesson: {lesson.text}")
            return lesson

        except Exception as e:
            self.logger.error(f"Error extracting outline feedback lesson: {e}")
            return None

    async def process_training_feedback(
        self, outcome: TrainingOutcome, personal_info: PersonalInfo, plan_context: str
    ) -> Dict[str, Any]:
        """
        Process training feedback using the ACE pattern: Reflector → Curator → Update Playbook.

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

            # Step 1: Load current playbook
            playbook = await db_service.load_user_playbook(outcome.user_id)

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

            # Step 5: Save updated playbook
            saved = await db_service.save_user_playbook(
                outcome.plan_id, updated_playbook.model_dump()
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

    async def get_playbook_stats(self, user_id: str) -> Optional[PlaybookStats]:
        """
        Get statistics about a user's playbook.

        Args:
            user_id: The user's identifier

        Returns:
            PlaybookStats object or None if no playbook exists
        """
        try:
            playbook = await db_service.load_user_playbook(user_id)

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
