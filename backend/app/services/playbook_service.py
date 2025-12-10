"""
PlaybookService orchestrates lesson extraction/curation using ReflectorAgent and CuratorAgent.
This preserves existing behavior via TrainingCoach helper methods while giving a dedicated service layer.
"""

from typing import List, Dict, Any, Optional

from app.agents.reflector_agent import ReflectorAgent
from app.agents.curator_agent import CuratorAgent
from app.schemas.playbook_schemas import PlaybookStats, UserPlaybook, ReflectorAnalysis
from app.schemas.question_schemas import PersonalInfo
from app.services.database_service import db_service


class PlaybookService:
    """Coordinates playbook lesson extraction and curation."""

    def __init__(
        self,
        reflector_agent: Optional[ReflectorAgent] = None,
        curator_agent: Optional[CuratorAgent] = None,
    ):
        self.reflector_agent = reflector_agent or ReflectorAgent(None)
        self.curator_agent = curator_agent or CuratorAgent(None)

    async def extract_and_curate_onboarding_lessons(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        existing_playbook: UserPlaybook,
    ) -> UserPlaybook:
        analyses = await self.reflector_agent.extract_initial_lessons(
            personal_info, formatted_initial_responses
        )
        curated = await self.curator_agent.process_batch_lessons(
            analyses, existing_playbook, source_plan_id="onboarding"
        )
        # Convert UpdatedUserPlaybook to UserPlaybook
        return self.curator_agent.update_playbook_from_curated(
            curated, personal_info.user_id
        )

    async def extract_and_curate_conversation_lessons(
        self,
        conversation_history: List[Dict[str, str]],
        personal_info: PersonalInfo,
        accepted_training_plan: Dict[str, Any],
        existing_playbook: UserPlaybook,
    ) -> UserPlaybook:
        analyses = await self.reflector_agent.extract_lessons_from_conversation_history(
            conversation_history, personal_info, accepted_training_plan, existing_playbook
        )
        curated = await self.curator_agent.process_batch_lessons(
            analyses, existing_playbook, source_plan_id=str(accepted_training_plan.get("id", "unknown"))
        )
        # Convert UpdatedUserPlaybook to UserPlaybook
        return self.curator_agent.update_playbook_from_curated(
            curated, personal_info.user_id
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
            from logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(
                f"Failed to get playbook stats: {str(e)}. "
                f"Check database connectivity or user profile lookup."
            )
            return None
