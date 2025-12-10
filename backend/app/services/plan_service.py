"""
PlanService orchestrates training plan generation and updates via TrainingAgent.
Thin wrapper to align with the new layered architecture while preserving current behavior.
"""

from typing import Dict, Any, Optional, List

from app.agents.training_agent import TrainingAgent
from app.schemas.question_schemas import PersonalInfo


class PlanService:
    """Coordinates plan generation and week updates."""

    def __init__(self, agent: Optional[TrainingAgent] = None):
        self.agent = agent or TrainingAgent()

    async def generate_initial_plan(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        user_profile_id: int,
        jwt_token: str | None = None,
    ) -> Dict[str, Any]:
        return await self.agent.generate_initial_training_plan(
            personal_info,
            formatted_initial_responses,
            user_profile_id,
            jwt_token=jwt_token,
        )

    async def update_plan_week(
        self,
        personal_info: PersonalInfo,
        feedback_message: str,
        week_number: int,
        current_week: Dict[str, Any],
        user_profile_id: int,
        user_playbook,
        jwt_token: str | None = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        return await self.agent.update_weekly_schedule(
            personal_info,
            feedback_message,
            week_number,
            current_week,
            user_profile_id,
            user_playbook,
            jwt_token=jwt_token,
            conversation_history=conversation_history,
        )

    async def create_next_week(
        self,
        personal_info: PersonalInfo,
        user_profile_id: int,
        existing_training_plan: Dict[str, Any],
        jwt_token: str | None = None,
    ) -> Dict[str, Any]:
        return await self.agent.create_new_weekly_schedule(
            personal_info,
            user_profile_id,
            existing_training_plan,
            jwt_token=jwt_token,
        )
