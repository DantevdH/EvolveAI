"""
ChatService handles chat intent classification and routing.
Currently delegates to InterviewAgent for classification; further routing can
be layered in as plan/playbook services evolve.
"""

from typing import Dict, Any, List, Optional

from app.agents.interview_agent import InterviewAgent
from app.services.plan_service import PlanService
from app.services.playbook_service import PlaybookService


class ChatService:
    """Intent classification and chat handling orchestrator."""

    def __init__(
        self,
        interview_agent: Optional[InterviewAgent] = None,
        plan_service: Optional[PlanService] = None,
        playbook_service: Optional[PlaybookService] = None,
    ):
        self.interview_agent = interview_agent or InterviewAgent()
        self.plan_service = plan_service or PlanService()
        self.playbook_service = playbook_service or PlaybookService()

    async def process_chat_message(
        self,
        feedback_message: str,
        conversation_history: List[Dict[str, str]],
        training_plan: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        # For now, return the classification result directly; routing will be added later.
        return await self.interview_agent.classify_feedback_intent_lightweight(
            feedback_message, conversation_history, training_plan
        )
