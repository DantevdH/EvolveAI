"""
PlaybookService orchestrates lesson extraction/curation using ReflectorAgent and CuratorAgent.
This preserves existing behavior via TrainingCoach helper methods while giving a dedicated service layer.
"""

from typing import List, Dict, Any, Optional

from app.agents.reflector_agent import ReflectorAgent
from app.agents.curator_agent import CuratorAgent
from app.schemas.playbook_schemas import (
    PlaybookStats,
    UserPlaybook,
    ReflectorAnalysis,
    StructuredPlaybookUpdate,
    PlaybookOperation,
)
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
        playbook = self.curator_agent.update_playbook_from_curated(
            curated, personal_info.user_id
        )

        # Enrich lessons with context from knowledge base
        playbook = await self.curator_agent.enrich_lessons_with_context(playbook)

        return playbook

    async def extract_and_curate_conversation_lessons(
        self,
        conversation_history: List[Dict[str, str]],
        personal_info: PersonalInfo,
        accepted_training_plan: Dict[str, Any],
        existing_playbook: UserPlaybook,
    ) -> StructuredPlaybookUpdate:
        """
        Extract and curate lessons from conversation history using structured operations.
        
        Returns StructuredPlaybookUpdate with KEEP/ADJUST/REMOVE/ADD operations.
        RAG enrichment should be run separately using enrich_operations_with_context.
        """
        analyses = await self.reflector_agent.extract_lessons_from_conversation_history(
            conversation_history, personal_info, accepted_training_plan, existing_playbook
        )
        structured_update = await self.curator_agent.process_batch_lessons(
            analyses,
            existing_playbook,
            source_plan_id=str(accepted_training_plan.get("id", "unknown")),
            use_structured_operations=True
        )
        
        return structured_update

    async def enrich_operations_with_context(
        self,
        operations: List[PlaybookOperation],
        rag_service: Optional[Any] = None,
    ) -> List[PlaybookOperation]:
        """
        Enrich ADJUST and ADD operations with RAG context (if requires_context=True).
        
        KEEP operations are skipped (context already exists).
        REMOVE operations are skipped (no lesson data).
        
        **Operation Order Preservation:**
        This method preserves the original order of operations. Enrichment happens
        in-place on the operations list, and asyncio.gather maintains task order,
        so the returned list maintains the same order as the input.
        
        Args:
            operations: List of PlaybookOperation objects (order will be preserved)
            rag_service: RAGService instance (optional, uses curator's RAG service if None)
            
        Returns:
            List of enriched PlaybookOperation objects (same order as input)
        """
        if not operations:
            return operations
        
        # Validate input structure
        if not isinstance(operations, list):
            from logging_config import get_logger
            logger = get_logger(__name__)
            logger.warning(f"Invalid operations input - expected list, got {type(operations)}")
            return operations
        
        if not rag_service:
            rag_service = self.curator_agent.rag_service
        
        if not rag_service:
            from logging_config import get_logger
            logger = get_logger(__name__)
            logger.warning("No RAGService available - cannot enrich operations with context")
            return operations
        
        import asyncio
        
        # Filter operations that need RAG enrichment (ADJUST and ADD with requires_context=True)
        operations_to_enrich = [
            op for op in operations
            if op.operation in ["ADJUST", "ADD"]
            and op.lesson
            and op.lesson.requires_context is True
        ]
        
        if not operations_to_enrich:
            return operations
        
        from logging_config import get_logger
        logger = get_logger(__name__)
        logger.info(f"Enriching {len(operations_to_enrich)} operations with context (ADJUST/ADD only)")
        
        # Store original operation order and indices for validation
        operation_indices = {id(op): i for i, op in enumerate(operations)}
        
        # Process operations in parallel with concurrency limit
        # Note: We iterate over operations_to_enrich, but modify operations in place
        # This ensures order is preserved since we're modifying the original list
        MAX_CONCURRENT_ENRICHMENTS = 5
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_ENRICHMENTS)
        
        async def enrich_operation(op: PlaybookOperation) -> None:
            """Enrich a single operation's lesson with context."""
            async with semaphore:
                try:
                    if not op.lesson:
                        return
                    
                    validated_context = await asyncio.to_thread(
                        rag_service.validate_and_retrieve_context,
                        lesson_text=op.lesson.text,
                        max_sentences=10
                    )
                    
                    # Modify operation in place (preserves order in original list)
                    op.lesson.context = validated_context
                    
                    if validated_context != "context not found":
                        logger.info(
                            f"✅ Context retrieved for {op.operation} operation {op.lesson_id} "
                            f"({len(validated_context)} chars)"
                        )
                    else:
                        logger.info(f"⚠️  No context found for {op.operation} operation {op.lesson_id}")
                        
                except Exception as e:
                    logger.error(f"Error retrieving context for {op.operation} operation {op.lesson_id}: {e}")
                    if op.lesson:
                        op.lesson.context = "context not found"
        
        # Process all operations in parallel
        # asyncio.gather preserves the order of tasks, so operations are enriched in order
        tasks = [enrich_operation(op) for op in operations_to_enrich]
        await asyncio.gather(*tasks)
        
        # Validate that operation order is preserved (operations list should be unchanged)
        current_indices = {id(op): i for i, op in enumerate(operations)}
        if current_indices != operation_indices:
            logger.warning(
                "Operation order may have changed during enrichment - this should not happen. "
                "Operations are modified in place, so order should be preserved."
            )
        
        logger.info(f"✅ Enriched {len(operations_to_enrich)} operations with context (order preserved)")
        return operations

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
