"""
Shared FastAPI dependencies for agents and services (refactor scaffold).
"""

from app.agents.interview_agent import InterviewAgent
from app.agents.training_agent import TrainingAgent
from app.agents.reflector_agent import ReflectorAgent
from app.agents.curator_agent import CuratorAgent
from app.services.interview_service import InterviewService
from app.services.plan_service import PlanService
from app.services.chat_service import ChatService
from app.services.playbook_service import PlaybookService


def get_interview_agent() -> InterviewAgent:
    return InterviewAgent()


def get_training_agent() -> TrainingAgent:
    return TrainingAgent()


def get_reflector_agent() -> ReflectorAgent:
    return ReflectorAgent(None)


def get_curator_agent() -> CuratorAgent:
    return CuratorAgent(None)


def get_interview_service() -> InterviewService:
    return InterviewService()


def get_plan_service() -> PlanService:
    return PlanService()


def get_chat_service() -> ChatService:
    return ChatService()


def get_playbook_service() -> PlaybookService:
    return PlaybookService()
