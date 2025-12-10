"""
InterviewService coordinates onboarding question generation using InterviewAgent.
This is a thin orchestration layer to match the refactoring proposal; logic is
delegated to the existing agent to keep behavior identical during migration.
"""

from typing import Optional, Dict, Any

from app.agents.interview_agent import InterviewAgent
from app.schemas.question_schemas import PersonalInfo, AIQuestionResponse


class InterviewService:
    """Orchestrates interview/question workflows."""

    def __init__(self, agent: Optional[InterviewAgent] = None):
        self.agent = agent or InterviewAgent()

    async def generate_and_store_questions(
        self,
        personal_info: PersonalInfo,
        user_profile_id: Optional[int] = None,
        question_history: Optional[str] = None,
    ) -> AIQuestionResponse:
        # Storage is already handled inside db_service via the agent calls
        return await self.agent.generate_initial_questions(
            personal_info,
            user_profile_id=user_profile_id,
            question_history=question_history,
        )
