"""
Curator component for the ACE pattern.

The Curator manages the user's playbook by:
- Analyzing new lessons against existing playbook using LLM
- Detecting and merging duplicate/similar lessons
- Handling contradictions (user evolution)
- Returning a curated, deduplicated playbook
"""

import uuid
import asyncio
import time
from typing import List, Optional, Any
from datetime import datetime
from logging_config import get_logger

from app.schemas.playbook_schemas import (
    PlaybookLesson,
    UserPlaybook,
    ReflectorAnalysis,
    UpdatedUserPlaybook,
    StructuredPlaybookUpdate,
    PlaybookOperation,
)
from app.agents.base_agent import BaseAgent
from app.services.rag_service import RAGService
from app.helpers.ai.llm_client import LLMClient
from app.services.database_service import db_service


class Curator(BaseAgent):
    """
    CuratorAgent manages the user's playbook by curating lessons from the Reflector.

    The Curator ensures playbook quality by:
    - Preventing duplicate lessons
    - Merging similar lessons
    - Updating lesson confidence over time
    - Removing low-value lessons
    - Enriching lessons with knowledge base context
    """

    MAX_PLAYBOOK_SIZE = 20  # Maximum lessons per user

    def __init__(self, openai_client: Optional[Any] = None):
        """
        Initialize the CuratorAgent.

        Args:
            openai_client: OpenAI client instance (unused - kept for backward compatibility)
        """
        self.logger = get_logger(__name__)
        # Initialize as BaseAgent for RAG capabilities
        super().__init__(
            agent_name="Curator Agent",
            agent_description="Curates and manages user playbook lessons with deduplication and quality control",
            topic="training",
        )
        # Initialize RAG service for knowledge base context
        self.rag_service = RAGService(self)
        # Unified LLM client (OpenAI or Gemini) - override from BaseAgent
        self.llm = LLMClient()
    
    def _get_capabilities(self) -> List[str]:
        """Return list of agent capabilities."""
        return [
            "lesson_curation",
            "playbook_deduplication",
            "lesson_merging",
            "contradiction_handling",
            "knowledge_base_enrichment",
        ]
    
    def process_request(self, user_request: str) -> str:
        """Process a user request - required by BaseAgent."""
        return f"CuratorAgent is focused on playbook curation; no chat handler for '{user_request}'."

    async def process_batch_lessons(
        self,
        analyses: List[ReflectorAnalysis],
        existing_playbook: UserPlaybook,
        source_plan_id: Optional[str] = None,
        use_structured_operations: bool = False,
    ) -> StructuredPlaybookUpdate | UpdatedUserPlaybook:
        """
        Process multiple new lessons using a single LLM call.
        
        The LLM analyzes all new lessons against the existing playbook,
        performs deduplication (merging duplicates), handles contradictions,
        and returns the final curated playbook.

        Args:
            analyses: List of ReflectorAnalysis objects to process
            existing_playbook: The user's current playbook
            source_plan_id: ID of the plan that generated these lessons

        Returns:
            UpdatedUserPlaybook with all lessons after curation
        """
        try:
            # Handle empty analyses list
            if not analyses or len(analyses) == 0:
                self.logger.warning("No analyses provided - returning existing playbook unchanged")
                if use_structured_operations:
                    # Return KEEP operations for all existing lessons
                    keep_operations = [
                        PlaybookOperation(
                            operation="KEEP",
                            lesson_id=lesson.id,
                            lesson=lesson,
                            reasoning="No new lessons to process - keeping existing lesson"
                        )
                        for lesson in existing_playbook.lessons
                    ]
                    return StructuredPlaybookUpdate(
                        operations=keep_operations,
                        total_lessons=existing_playbook.total_lessons,
                        reasoning="No new lessons to process"
                    )
                else:
                    return UpdatedUserPlaybook(
                        lessons=existing_playbook.lessons,
                        total_lessons=existing_playbook.total_lessons,
                        reasoning="No new lessons to process"
                    )
            
            self.logger.info(f"Processing batch of {len(analyses)} lessons with single LLM call")

            # Convert analyses to proposed lessons (without IDs yet)
            proposed_lessons = []
            for i, analysis in enumerate(analyses):
                lesson = PlaybookLesson(
                    id=f"new_{i}",  # Temporary ID for reference
                    text=analysis.lesson,
                    tags=analysis.tags,
                    helpful_count=1 if analysis.positive else 0,
                    harmful_count=0 if analysis.positive else 1,
                    confidence=analysis.confidence,
                    positive=analysis.positive,
                    created_at=datetime.utcnow().isoformat(),
                    source_plan_id=source_plan_id,
                )
                proposed_lessons.append(lesson)

            # Format existing lessons for prompt
            existing_lessons_text = ""
            if existing_playbook.lessons:
                existing_lessons_text = "\n".join(
                    [
                        f"  [{i+1}] [{lesson.id}] {lesson.text}\n"
                        f"       Tags: {', '.join(lesson.tags) if lesson.tags else 'none'}\n"
                        f"       Confidence: {lesson.confidence:.0%} | "
                        f"Type: {'Positive' if lesson.positive else 'Warning'} | "
                        f"Applied: {lesson.times_applied}x"
                        for i, lesson in enumerate(existing_playbook.lessons)
                    ]
                )
            else:
                existing_lessons_text = "  (No existing lessons)"

            # Format proposed lessons for prompt
            proposed_lessons_text = "\n".join(
                [
                    f"  [{i+1}] {lesson.text}\n"
                    f"       Tags: {', '.join(lesson.tags) if lesson.tags else 'none'}\n"
                    f"       Confidence: {lesson.confidence:.0%} | "
                    f"Type: {'Positive' if lesson.positive else 'Warning'}"
                    for i, lesson in enumerate(proposed_lessons)
                ]
            )

            prompt = f"""
                **WORKFLOW STATUS:**
                ✅ New Lessons Generated ({len(proposed_lessons)} lessons)
                ✅ Existing Playbook Loaded ({len(existing_playbook.lessons)} lessons)
                🎯 **CURRENT STEP:** Curate Playbook (Deduplication & Integration)

                **YOUR ROLE IN THE ACE FRAMEWORK:**
                You are the Curator - the guardian of the user's institutional memory. Your playbook is the knowledge base that guides the TrainingCoach to create personalized training plans. 
                These lessons represent long-term, persistent insights about the user's constraints, preferences, and proven patterns - not temporary or daily changes.
                
                **THE PLAYBOOK'S PURPOSE:**
                - **Institutional Memory:** Captures what works and what doesn't for this specific user over time
                - **Actionable Knowledge:** Each lesson should be specific and actionable for future plan generation
                - **Long-Term Focus:** We capture persistent patterns, constraints, and preferences, etc. - not temporary states or daily fluctuations
                - **Quality over Quantity:** The playbook is limited to {self.MAX_PLAYBOOK_SIZE} lessons - prioritize high-value, proven insights

                **EXISTING PLAYBOOK LESSONS ({len(existing_playbook.lessons)}):**
                {existing_lessons_text}

                **PROPOSED NEW LESSONS ({len(proposed_lessons)}):**
                {proposed_lessons_text}

                **YOUR PRIMARY TASK:**
                Analyze each proposed lesson against ALL existing lessons and decide on operations:
                1. **KEEP** - Existing lesson unchanged (preserve all metadata: helpful_count, harmful_count, times_applied, last_used_at, context)
                2. **ADJUST** - Existing lesson modified (update text/tags/confidence, preserve ID and usage stats, may need new RAG)
                3. **REMOVE** - Delete existing lesson (user evolution or contradiction)
                4. **ADD** - New lesson (generate new ID, needs RAG if requires_context=True)
                
                For each existing lesson, decide: KEEP (unchanged) or REMOVE (contradicted/outdated).
                For each proposed lesson, decide: ADJUST (merge into existing) or ADD (new unique lesson).
                
                **CRITICAL FILTER: LONG-TERM LESSONS ONLY**
                - Focus on persistent patterns, not temporary states
                - Capture long-term constraints (injuries, equipment access, schedule patterns, etc.)
                - Capture proven preferences that have been consistent over time
                - Avoid lessons about daily fluctuations or one-time events
                - If a proposed lesson seems temporary or situation-specific, it may not belong in the playbook

                ═══════════════════════════════════════════════════════════════════════════════
                DECISION FRAMEWORK: KEEP, ADJUST, REMOVE, OR ADD?
                ═══════════════════════════════════════════════════════════════════════════════

                **KEEP:**
                Keep an existing lesson unchanged if it's still valid and no proposed lesson relates to it.
                - **Operation:** KEEP
                - **Preserve ALL metadata:** helpful_count, harmful_count, times_applied, last_used_at, context (all unchanged)
                - **Include full lesson:** Return the existing lesson exactly as-is
                - **No RAG needed:** Context already exists, no re-enrichment needed

                **ADJUST:**
                Adjust an existing lesson if a proposed lesson is similar/related and should be merged into it.
                - **Operation:** ADJUST
                - **Preserve lesson ID:** Keep the existing lesson's ID (NEVER change existing IDs)
                - **Update fields:** Refine text, combine tags, update confidence (weighted average: existing * 0.6 + proposed * 0.4)
                - **Preserve usage stats:** Keep helpful_count, harmful_count, times_applied from existing (don't reset)
                - **Update timestamp:** Set last_used_at to current timestamp
                - **RAG may be needed:** If requires_context=True, re-run RAG (context may need update)
                - **Include full adjusted lesson:** Return complete lesson with all fields

                **REMOVE:**
                Remove an existing lesson if it's contradicted by a proposed lesson or is outdated.
                - **Operation:** REMOVE
                - **Lesson ID required:** Must specify which existing lesson to remove
                - **Lesson field:** Set to None (no lesson data needed for removal)
                - **Reasoning:** Explain why lesson is being removed (contradiction, user evolution, etc.)

                **ADD:**
                Add a proposed lesson as new if it's completely unique and adds new long-term value.
                - **Operation:** ADD
                - **Generate new ID:** Format: "lesson_{{random_hex}}" (8-character hex)
                - **Include full lesson:** Return complete lesson with all fields from proposed
                - **Set requires_context:** Determine if lesson needs knowledge base context
                - **RAG needed:** If requires_context=True, will run RAG enrichment
                
                **QUALITY CHECK:**
                Before adding, verify the lesson is:
                - Actionable (specific enough to guide future plan generation)
                - Long-term (represents a persistent pattern, not temporary)
                - Valuable (adds unique insight not already captured)
                - If the playbook exceeds {self.MAX_PLAYBOOK_SIZE} lessons, prioritize lessons with higher confidence and proven usefulness

                **OUTPUT REQUIREMENTS (STRUCTURED OPERATIONS):**
                - Return a list of operations (one per lesson in final playbook)
                - For each existing lesson: Output KEEP (if unchanged) or REMOVE (if contradicted/outdated)
                - For each proposed lesson: Output ADJUST (if merging into existing) or ADD (if new unique)
                - Each operation must include:
                  - **operation:** KEEP, ADJUST, REMOVE, or ADD
                  - **lesson_id:** Existing ID for KEEP/ADJUST/REMOVE, new generated ID for ADD
                  - **lesson:** Full lesson data for KEEP/ADJUST/ADD, None for REMOVE
                  - **reasoning:** Why this operation was chosen
                - For KEEP operations: Include existing lesson exactly as-is (preserve all metadata)
                - For ADJUST operations: Include adjusted lesson with updated fields
                - For ADD operations: Include new lesson with generated ID
                - For REMOVE operations: lesson field is None
                - Set total_lessons to count after all operations
                - Provide overall reasoning explaining all changes
                
                **LESSON FIELD REQUIREMENTS:**
                - Text must start with "The user..."
                - Include tags, confidence (0.0-1.0), positive (bool), helpful_count, harmful_count
                - Include created_at, last_used_at (current timestamp if newly used/adjusted)
                - Include source_plan_id if provided
                - **Set requires_context field**: Determine if this lesson can be backed by documentation/knowledge base
                  - If lesson involves training methodologies, best practices, or general principles → set `requires_context=True`
                  - If lesson is user-specific preference/constraint → set `requires_context=False`

                **CRITICAL RULES:**
                - **Preserve existing lesson IDs** - NEVER change existing IDs when merging/updating
                - **Only generate new IDs** - For truly new lessons only
                - **Lesson text format** - All lesson text must start with "The user..."
                - **No duplicates** - Ensure no duplicate lessons in final playbook
                - **Long-term focus** - Prioritize lessons that represent persistent patterns over temporary states
                - **Confidence matters** - Higher confidence and proven usefulness (helpful_count) indicate more valuable lessons
                - **Playbook size limit** - If playbook exceeds {self.MAX_PLAYBOOK_SIZE} lessons, prioritize lessons with highest confidence × usage (helpful_count + harmful_count)
                
                **WHY CONFIDENCE AND COUNTERS MATTER:**
                - **Confidence** (0.0-1.0): Higher confidence = more certain/verified insight
                - **helpful_count**: Number of times this lesson led to positive outcomes - proven usefulness
                - **harmful_count**: Number of times ignoring this lesson led to negative outcomes - proven importance
                - Lessons with high confidence and high usage counts are the most valuable institutional memory
            """

            # Call LLM with schema (returns validated Pydantic model or dict)
            ai_start = time.time()
            if use_structured_operations:
                updated_playbook_result, completion = self.llm.parse_structured(prompt, StructuredPlaybookUpdate, model_type="complex")
            else:
                updated_playbook_result, completion = self.llm.parse_structured(prompt, UpdatedUserPlaybook, model_type="lightweight")
            ai_duration = time.time() - ai_start
            
            # Track latency
            await db_service.log_latency_event("curator_process_batch", ai_duration, completion)
            
            # Handle both Pydantic model instance and dict (depending on LLM provider)
            if updated_playbook_result is None:
                raise ValueError("LLM returned None - unable to parse playbook")
            
            if use_structured_operations:
                # Handle StructuredPlaybookUpdate
                if isinstance(updated_playbook_result, StructuredPlaybookUpdate):
                    structured_update = updated_playbook_result
                elif isinstance(updated_playbook_result, dict):
                    structured_update = StructuredPlaybookUpdate(**updated_playbook_result)
                else:
                    structured_update = StructuredPlaybookUpdate.model_validate(updated_playbook_result)
                
                # Validate and fix operations
                existing_ids = {lesson.id for lesson in existing_playbook.lessons if lesson.id}
                validated_operations = []
                used_ids = set(existing_ids)  # Track all IDs used so far (existing + new)
                
                for op in structured_update.operations:
                    # Ensure lesson_id is valid
                    if not op.lesson_id or not str(op.lesson_id).strip():
                        if op.operation == "ADD":
                            op.lesson_id = f"lesson_{uuid.uuid4().hex[:8]}"
                        else:
                            self.logger.warning(f"Invalid lesson_id for {op.operation} operation, skipping")
                            continue
                    
                    # For ADD operations, generate ID if needed
                    if op.operation == "ADD":
                        # Regenerate ID if it's a placeholder, exists in playbook, or is a duplicate
                        if op.lesson_id.startswith("new_") or op.lesson_id in used_ids:
                            # Generate new unique ID
                            while True:
                                new_id = f"lesson_{uuid.uuid4().hex[:8]}"
                                if new_id not in used_ids:
                                    op.lesson_id = new_id
                                    break
                        # Ensure lesson is provided
                        if not op.lesson:
                            self.logger.warning(f"ADD operation missing lesson data, skipping")
                            continue
                        # Ensure lesson has correct ID
                        op.lesson.id = op.lesson_id
                        # Track this ID to prevent duplicates
                        used_ids.add(op.lesson_id)
                    
                    # For KEEP/ADJUST operations, ensure lesson is provided and ID matches
                    if op.operation in ["KEEP", "ADJUST"]:
                        if not op.lesson:
                            self.logger.warning(f"{op.operation} operation missing lesson data, skipping")
                            continue
                        if op.lesson.id != op.lesson_id:
                            op.lesson.id = op.lesson_id
                    
                    # For REMOVE operations, ensure lesson_id exists
                    if op.operation == "REMOVE":
                        if op.lesson_id not in existing_ids:
                            self.logger.warning(f"REMOVE operation for non-existent lesson_id {op.lesson_id}, skipping")
                            continue
                    
                    validated_operations.append(op)
                
                # Check playbook size limit
                final_lesson_count = len([op for op in validated_operations if op.operation != "REMOVE"])
                if final_lesson_count > self.MAX_PLAYBOOK_SIZE:
                    self.logger.info(
                        f"Playbook exceeds max size ({final_lesson_count} > {self.MAX_PLAYBOOK_SIZE}), cleaning up..."
                    )
                    # Prioritize KEEP and ADJUST operations, then ADD by confidence
                    keep_adjust_ops = [op for op in validated_operations if op.operation in ["KEEP", "ADJUST"]]
                    add_ops = sorted(
                        [op for op in validated_operations if op.operation == "ADD"],
                        key=lambda x: x.lesson.confidence if x.lesson else 0.0,
                        reverse=True
                    )
                    remove_ops = [op for op in validated_operations if op.operation == "REMOVE"]
                    
                    # Keep all KEEP/ADJUST, then top ADD operations
                    slots_remaining = self.MAX_PLAYBOOK_SIZE - len(keep_adjust_ops)
                    validated_operations = keep_adjust_ops + add_ops[:slots_remaining] + remove_ops
                    final_lesson_count = len([op for op in validated_operations if op.operation != "REMOVE"])
                
                structured_update.operations = validated_operations
                structured_update.total_lessons = final_lesson_count
                
                self.logger.info(
                    f"✅ Structured playbook update: {len(existing_playbook.lessons)} existing → "
                    f"{final_lesson_count} final ({len(proposed_lessons)} proposed, "
                    f"{len([op for op in validated_operations if op.operation == 'KEEP'])} KEEP, "
                    f"{len([op for op in validated_operations if op.operation == 'ADJUST'])} ADJUST, "
                    f"{len([op for op in validated_operations if op.operation == 'REMOVE'])} REMOVE, "
                    f"{len([op for op in validated_operations if op.operation == 'ADD'])} ADD)"
                )
                
                return structured_update
            else:
                # Handle UpdatedUserPlaybook (legacy)
                if isinstance(updated_playbook_result, UpdatedUserPlaybook):
                    updated_playbook = updated_playbook_result
                elif isinstance(updated_playbook_result, dict):
                    updated_playbook = UpdatedUserPlaybook(**updated_playbook_result)
                else:
                    updated_playbook = UpdatedUserPlaybook.model_validate(updated_playbook_result)
                
                # Generate proper IDs for new lessons
                existing_ids = {lesson.id for lesson in existing_playbook.lessons if lesson.id}
                
                if not updated_playbook.lessons:
                    self.logger.warning("LLM returned empty lessons list - using existing playbook")
                    updated_playbook.lessons = existing_playbook.lessons
                    updated_playbook.total_lessons = len(existing_playbook.lessons)
                else:
                    for lesson in updated_playbook.lessons:
                        if not lesson.id or not str(lesson.id).strip():
                            lesson.id = f"lesson_{uuid.uuid4().hex[:8]}"
                        elif str(lesson.id).startswith("new_") or lesson.id not in existing_ids:
                            lesson.id = f"lesson_{uuid.uuid4().hex[:8]}"
                    
                    updated_playbook.total_lessons = len(updated_playbook.lessons)
                
                # Clean up playbook if too large
                if len(updated_playbook.lessons) > self.MAX_PLAYBOOK_SIZE:
                    self.logger.info(
                        f"Playbook exceeds max size ({len(updated_playbook.lessons)} > {self.MAX_PLAYBOOK_SIZE}), cleaning up..."
                    )
                    cleaned_lessons = self._cleanup_lessons(updated_playbook.lessons)
                    updated_playbook = UpdatedUserPlaybook(
                        lessons=cleaned_lessons,
                        total_lessons=len(cleaned_lessons),
                        reasoning=f"{updated_playbook.reasoning} (Cleaned up to max size: {self.MAX_PLAYBOOK_SIZE})"
                    )
                
                if updated_playbook.total_lessons != len(updated_playbook.lessons):
                    self.logger.warning(
                        f"total_lessons mismatch: {updated_playbook.total_lessons} != {len(updated_playbook.lessons)}. Correcting..."
                    )
                    updated_playbook.total_lessons = len(updated_playbook.lessons)
                
                self.logger.info(
                    f"✅ Curated playbook: {len(existing_playbook.lessons)} existing → "
                    f"{len(updated_playbook.lessons)} final ({len(proposed_lessons)} proposed)"
                )
                
                return updated_playbook

        except Exception as e:
            self.logger.error(f"Error in batch processing: {e}", exc_info=True)
            # Fallback: return existing playbook unchanged
            if use_structured_operations:
                keep_operations = [
                    PlaybookOperation(
                        operation="KEEP",
                        lesson_id=lesson.id,
                        lesson=lesson,
                        reasoning=f"Error during curation, keeping existing lesson: {str(e)}"
                    )
                    for lesson in existing_playbook.lessons
                ]
                return StructuredPlaybookUpdate(
                    operations=keep_operations,
                    total_lessons=existing_playbook.total_lessons,
                    reasoning=f"Error during curation, returning existing playbook: {str(e)}"
                )
            else:
                return UpdatedUserPlaybook(
                    lessons=existing_playbook.lessons,
                    total_lessons=existing_playbook.total_lessons,
                    reasoning=f"Error during curation, returning existing playbook: {str(e)}"
                )

    def update_playbook_from_curated(
        self,
        updated_playbook: UpdatedUserPlaybook,
        user_id: str,
    ) -> UserPlaybook:
        """
        Convert UpdatedUserPlaybook (from LLM curation) to UserPlaybook format.
        
        This is a simple conversion - the LLM already did all the curation work.

        Args:
            updated_playbook: The curated playbook from LLM
            user_id: User ID for the playbook

        Returns:
            UserPlaybook ready for database storage
        """
        return UserPlaybook(
            user_id=user_id,
            lessons=updated_playbook.lessons,
            total_lessons=updated_playbook.total_lessons,
            last_updated=datetime.utcnow().isoformat(),
        )

    async def enrich_lessons_with_context(
        self,
        playbook: UserPlaybook,
        rag_service: Optional[Any] = None,
    ) -> UserPlaybook:
        """
        Enrich playbook lessons with validated context from knowledge base.
        
        This method runs AFTER curation and processes lessons with requires_context=True
        to retrieve and validate relevant context from the knowledge base.
        
        Args:
            playbook: UserPlaybook with curated lessons (requires_context field already set)
            rag_service: RAGService instance for context retrieval (optional, will use TrainingCoach if None)
            
        Returns:
            UserPlaybook with context field populated for lessons that require it
        """
        # Use self.rag_service if no rag_service provided
        if not rag_service:
            rag_service = self.rag_service
        
        if not rag_service:
            self.logger.warning("No RAGService available - cannot enrich lessons with context")
            return playbook
        
        try:
            self.logger.info(f"Enriching playbook lessons with context...")
            
            # Filter lessons that require context
            lessons_requiring_context = [
                lesson for lesson in playbook.lessons 
                if lesson.requires_context is True
            ]
            
            if not lessons_requiring_context:
                self.logger.info("No lessons require context - skipping enrichment")
                return playbook
            
            self.logger.info(f"Found {len(lessons_requiring_context)} lessons requiring context")
            
            # Process lessons in parallel with concurrency limit
            # Semaphore limits concurrent operations to prevent API rate limits
            MAX_CONCURRENT_ENRICHMENTS = 5
            semaphore = asyncio.Semaphore(MAX_CONCURRENT_ENRICHMENTS)
            
            async def process_lesson(lesson: PlaybookLesson) -> None:
                """Process a single lesson's context enrichment."""
                async with semaphore:  # Limit concurrent operations
                    try:
                        # Run sync operation in thread pool (non-blocking)
                        validated_context = await asyncio.to_thread(
                            rag_service.validate_and_retrieve_context,
                            lesson_text=lesson.text,
                            max_sentences=10
                        )
                        
                        # Set context field on lesson
                        lesson.context = validated_context
                        
                        if validated_context != "context not found":
                            self.logger.info(
                                f"✅ Context retrieved for lesson {lesson.id} ({len(validated_context)} chars)"
                            )
                        else:
                            self.logger.info(f"⚠️  No context found for lesson {lesson.id}")
                            
                    except Exception as e:
                        self.logger.error(f"Error retrieving context for lesson {lesson.id}: {e}")
                        lesson.context = "context not found"
            
            # Process all lessons in parallel
            tasks = [process_lesson(lesson) for lesson in lessons_requiring_context]
            await asyncio.gather(*tasks)
            
            self.logger.info(f"✅ Enriched {len(lessons_requiring_context)} lessons with context (parallel processing)")
            return playbook
            
        except Exception as e:
            self.logger.error(f"Error enriching lessons with context: {e}", exc_info=True)
            # Return playbook unchanged on error
            return playbook

    async def mark_lessons_as_applied(
        self, playbook: UserPlaybook, applied_lesson_ids: List[str], user_profile_id: Optional[int] = None
    ) -> UserPlaybook:
        """
        Mark lessons as having been applied during plan generation.
        Increments times_applied counter and updates last_used_at.
        Also persists updates to database.

        Args:
            playbook: User's playbook
            applied_lesson_ids: IDs of lessons that were used in plan generation
            user_profile_id: Optional user profile ID for database persistence

        Returns:
            Updated UserPlaybook
        """
        for lesson in playbook.lessons:
            if lesson.id in applied_lesson_ids:
                lesson.times_applied += 1
                lesson.last_used_at = datetime.utcnow().isoformat()
                self.logger.info(
                    f"Lesson {lesson.id} applied (total: {lesson.times_applied}x)"
                )
                
                # Persist to database if user_profile_id provided
                if user_profile_id:
                    try:
                        await db_service.update_lesson_usage(
                            lesson_id=lesson.id,
                            user_profile_id=user_profile_id,
                            times_applied=lesson.times_applied,
                            last_used_at=lesson.last_used_at,
                        )
                    except Exception as e:
                        self.logger.error(f"Error persisting lesson usage for {lesson.id}: {e}")

        return playbook

    async def update_lesson_effectiveness(
        self, lesson: PlaybookLesson, was_helpful: bool, user_profile_id: Optional[int] = None
    ) -> PlaybookLesson:
        """
        Update a lesson's effectiveness counters based on outcome.
        Also persists updates to database.

        Args:
            lesson: The lesson to update
            was_helpful: True if the lesson led to good outcomes, False otherwise
            user_profile_id: Optional user profile ID for database persistence

        Returns:
            Updated PlaybookLesson
        """
        if was_helpful:
            lesson.helpful_count += 1
        else:
            lesson.harmful_count += 1

        # Recalculate confidence based on effectiveness
        total_uses = lesson.helpful_count + lesson.harmful_count
        if total_uses > 0:
            success_rate = lesson.helpful_count / total_uses
            # Weighted average: keep some of original confidence
            lesson.confidence = (lesson.confidence * 0.3) + (success_rate * 0.7)

        lesson.last_used_at = datetime.utcnow().isoformat()
        
        # Persist to database if user_profile_id provided
        if user_profile_id:
            try:
                await db_service.update_lesson_effectiveness(
                    lesson_id=lesson.id,
                    user_profile_id=user_profile_id,
                    helpful_count=lesson.helpful_count,
                    harmful_count=lesson.harmful_count,
                    confidence=lesson.confidence,
                )
            except Exception as e:
                self.logger.error(f"Error persisting lesson effectiveness for {lesson.id}: {e}")

        return lesson


    def _cleanup_lessons(self, lessons: List[PlaybookLesson]) -> List[PlaybookLesson]:
        """Remove low-value lessons when playbook is too large."""
        # Sort by confidence * usage (helpful + harmful counts)
        scored_lessons = [
            (
                lesson,
                lesson.confidence * (lesson.helpful_count + lesson.harmful_count + 1),
            )
            for lesson in lessons
        ]

        # Sort by score descending
        scored_lessons.sort(key=lambda x: x[1], reverse=True)

        # Keep top MAX_PLAYBOOK_SIZE lessons
        cleaned_lessons = [
            lesson for lesson, _ in scored_lessons[: self.MAX_PLAYBOOK_SIZE]
        ]

        self.logger.info(f"Cleaned up lessons, kept {len(cleaned_lessons)} out of {len(lessons)}")

        return cleaned_lessons


# Alias for the refactored agent naming
CuratorAgent = Curator
