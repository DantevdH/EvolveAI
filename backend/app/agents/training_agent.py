"""
TrainingAgent handles plan generation and updates extracted from the legacy TrainingCoach.
"""

import time
from typing import Dict, Any, Optional, List

from logging_config import get_logger
from settings import settings

from app.agents.base_agent import BaseAgent
from app.services.rag_service import RAGService
from app.schemas.question_schemas import PersonalInfo
from app.schemas.training_schemas import (
    TrainingPlan,
    WeeklySchedule,
    WeeklyScheduleResponse,
    WeeklyOutlinePlan,
)
from app.schemas.playbook_schemas import UserPlaybook
from app.helpers.exercise.exercise_selector import ExerciseSelector
from app.helpers.exercise.exercise_validator import ExerciseValidator
from app.services.database_service import db_service
from app.helpers.ai.prompt_generator import PromptGenerator
from app.helpers.utils.mock_data import create_mock_training_plan
from app.helpers.ai.llm_client import LLMClient


class TrainingAgent(BaseAgent):
    """Specialized agent for training plan generation and updates."""

    def __init__(self):
        self.logger = get_logger(__name__)
        super().__init__(
            agent_name="Training Agent",
            agent_description="Generates and updates training plans",
            topic="training",
        )
        self.rag_service = RAGService(self)
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()
        # Override llm to keep parity with legacy coach initialization
        self.llm = LLMClient()
        self.last_modality_rationale: Optional[str] = None

    def _get_capabilities(self) -> List[str]:
        return [
            "training_plan_generation",
            "exercise_recommendation",
            "training_plan_updates",
            "training_plan_creation",
            "exercise_validation",
            "training_knowledge_retrieval",
        ]

    # ------------------------------------------------------------------ #
    # Plan generation/update flows
    # ------------------------------------------------------------------ #
    async def generate_initial_training_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        user_profile_id: int,
        jwt_token: str = None,
    ) -> Dict[str, Any]:
        """Generate initial Week 1 training plan."""
        try:
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

            include_bodyweight_strength, include_equipment_strength, include_endurance = await self._decide_modalities(
                personal_info,
                formatted_initial_responses=formatted_initial_responses,
            )

            self.logger.info(
                "Generating training plan prompt (bodyweight_strength=%s equipment_strength=%s endurance=%s)...",
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

            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"Generating training plan with AI ({model_name})...")

            ai_start = time.time()
            training_plan, completion = self.llm.parse_structured(
                prompt, TrainingPlan, model_type="complex"
            )
            ai_duration = time.time() - ai_start
            training_dict = training_plan.model_dump()

            training_dict = self.exercise_validator.normalize_reps_weight_arrays(training_dict)
            training_dict["user_profile_id"] = user_profile_id

            num_weeks = len(training_dict.get("weekly_schedules", []))
            if num_weeks != 1:
                self.logger.warning(
                    f"AI generated {num_weeks} weeks instead of 1. Using only first week to maintain policy."
                )
                training_dict["weekly_schedules"] = training_dict.get("weekly_schedules", [])[:1]

            if training_dict.get("weekly_schedules"):
                training_dict["weekly_schedules"][0]["week_number"] = 1

            self.logger.info("Matching AI exercises to database...")
            validated_plan = self.exercise_validator.post_process_strength_exercises(training_dict)

            self.logger.info("Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                validated_plan
            )

            validated_plan["user_profile_id"] = user_profile_id
            await db_service.log_latency_event("initial_week", ai_duration, completion)

            return {
                "success": True,
                "training_plan": validated_plan,
                "completion_message": validated_plan.get("ai_message"),
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
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Update an existing week based on user feedback (returns updated week only)."""
        try:
            week_summary = PromptGenerator.format_current_plan_summary({"weekly_schedules": [current_week]})

            conversation_history_str = None
            if conversation_history and len(conversation_history) > 0:
                conversation_lines = []
                for msg in conversation_history[-10:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        conversation_lines.append(f"{role.capitalize()}: {content}")
                if conversation_lines:
                    conversation_history_str = "\n".join(conversation_lines)

            include_bodyweight_strength = True
            include_equipment_strength = True
            include_endurance = True

            self.logger.info("Generating update prompt for Week %s (default modalities)...", week_number)
            rationale = "Default modalities: strength + endurance (modality selection disabled)."
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

            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"Updating Week {week_number} with AI ({model_name})...")

            ai_start = time.time()
            ws_response, completion = self.llm.parse_structured(
                prompt, WeeklyScheduleResponse, model_type="complex"
            )
            ai_duration = time.time() - ai_start

            ai_message = ws_response.ai_message
            week_dict = ws_response.model_dump(exclude={"ai_message"})
            week_dict["week_number"] = week_number

            temp_plan_for_normalization = {"weekly_schedules": [week_dict]}
            normalized_plan = self.exercise_validator.normalize_reps_weight_arrays(temp_plan_for_normalization)
            week_dict = normalized_plan.get("weekly_schedules", [week_dict])[0]

            self.logger.info("Matching AI exercises to database...")
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]

            self.logger.info("Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                {"weekly_schedules": [validated_week]}
            )
            updated_week = validated_plan.get("weekly_schedules", [validated_week])[0]

            await db_service.log_latency_event("update_week", ai_duration, completion)

            return {
                "success": True,
                "training_plan": {"weekly_schedules": [updated_week]},
                "ai_message": ai_message,
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
        """Create a new week based on completed weeks and playbook."""
        try:
            self.logger.info("Loading user playbook...")
            playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)

            if not playbook:
                self.logger.warning(
                    "No playbook found in database. Creating empty playbook - user may be new or uninitialized."
                )
                playbook = UserPlaybook(
                    user_id=personal_info.user_id,
                    lessons=[],
                    total_lessons=0,
                )

            existing_plan = existing_training_plan
            existing_weekly_schedules = existing_plan.get("weekly_schedules", [])

            if not existing_weekly_schedules:
                self.logger.error(
                    "No existing weekly schedules found in training plan. "
                    "Cannot create new week without Week 1."
                )
                return {
                    "success": False,
                    "error": "No existing weekly schedules found. Create Week 1 first.",
                }

            week_numbers = [w.get("week_number", 0) for w in existing_weekly_schedules if w.get("week_number")]
            next_week_number = max(week_numbers) + 1 if week_numbers else 1

            self.logger.info("Calculated next_week_number: %s from %s existing weeks", next_week_number, len(existing_weekly_schedules))

            completed_weeks = existing_weekly_schedules
            completed_weeks_context = PromptGenerator.format_current_plan_summary(
                {"weekly_schedules": completed_weeks}
            )

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

            include_bodyweight_strength = True
            include_equipment_strength = True
            include_endurance = True

            self.logger.info("Generating prompt for Week %s (default modalities)...", next_week_number)
            rationale = "Default modalities: strength + endurance (modality selection disabled)."
            prompt = PromptGenerator.create_new_weekly_schedule_prompt(
                personal_info=personal_info,
                completed_weeks_context=completed_weeks_context,
                progress_summary="",
                playbook_lessons=playbook_lessons_dict,
                include_bodyweight_strength=include_bodyweight_strength,
                include_equipment_strength=include_equipment_strength,
                include_endurance=include_endurance,
                modality_rationale=rationale,
            )

            model_name = settings.LLM_MODEL_COMPLEX
            self.logger.info(f"Creating Week {next_week_number} with AI ({model_name})...")

            ai_start = time.time()
            weekly_schedule, completion = self.llm.parse_structured(
                prompt, WeeklySchedule, model_type="complex"
            )
            ai_duration = time.time() - ai_start
            week_dict = weekly_schedule.model_dump()
            week_dict["week_number"] = next_week_number

            temp_plan_for_normalization = {"weekly_schedules": [week_dict]}
            normalized_plan = self.exercise_validator.normalize_reps_weight_arrays(temp_plan_for_normalization)
            week_dict = normalized_plan.get("weekly_schedules", [week_dict])[0]

            self.logger.info("Matching AI exercises to database...")
            temp_plan_dict = {"weekly_schedules": [week_dict]}
            validated_plan = self.exercise_validator.post_process_strength_exercises(temp_plan_dict)
            validated_week = validated_plan.get("weekly_schedules", [week_dict])[0]

            self.logger.info("Validating training plan structure...")
            validated_plan, validation_messages = self.exercise_validator.validate_training_plan(
                {"weekly_schedules": [validated_week]}
            )
            new_week = validated_plan.get("weekly_schedules", [validated_week])[0]

            updated_weekly_schedules = existing_weekly_schedules.copy()
            updated_weekly_schedules.append(new_week)
            updated_weekly_schedules.sort(key=lambda x: x.get("week_number", 0))

            full_training_plan = {
                **existing_plan,
                "weekly_schedules": updated_weekly_schedules,
            }

            await db_service.log_latency_event("create_week", ai_duration, completion)

            return {
                "success": True,
                "training_plan": full_training_plan,
                "metadata": {
                    "validation_messages": validation_messages,
                    "generation_method": "AI + Metadata-Based Exercise Matching",
                    "next_week_number": next_week_number,
                },
            }

        except Exception as e:
            self.logger.error(
                f"Failed to create new weekly schedule: {str(e)}. "
                f"Check AI model response, exercise matching, or database connectivity."
            )
            return {"success": False, "error": str(e)}

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
                "Generating outline for weeks %s-%s...",
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

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    async def _decide_modalities(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
    ) -> tuple[bool, bool, bool]:
        """
        Placeholder modality decision logic. Keeps previous behavior (all modalities enabled)
        but tracks rationale for prompt construction.
        """
        self.last_modality_rationale = "Default: include both modalities for balanced development."
        return True, True, True

    def process_request(self, user_request: str) -> str:
        # Delegate to a basic RAG response for compliance with BaseAgent contract
        return f"TrainingAgent is focused on plan generation; no chat handler implemented for '{user_request}'."
