"""
Curator component for the ACE pattern.

The Curator manages the user's playbook by:
- Analyzing new lessons against existing playbook using LLM
- Detecting and merging duplicate/similar lessons
- Handling contradictions (user evolution)
- Returning a curated, deduplicated playbook
"""

import uuid
from typing import List, Optional, Any
from datetime import datetime
from logging_config import get_logger

from core.base.schemas.playbook_schemas import (
    PlaybookLesson,
    UserPlaybook,
    ReflectorAnalysis,
    UpdatedUserPlaybook,
)
from core.training.helpers.llm_client import LLMClient


class Curator:
    """
    Manages the user's playbook by curating lessons from the Reflector.

    The Curator ensures playbook quality by:
    - Preventing duplicate lessons
    - Merging similar lessons
    - Updating lesson confidence over time
    - Removing low-value lessons
    """

    MAX_PLAYBOOK_SIZE = 20  # Maximum lessons per user

    def __init__(self, openai_client: Optional[Any] = None):
        """
        Initialize the Curator.

        Args:
            openai_client: OpenAI client instance (unused - kept for backward compatibility)
        """
        self.logger = get_logger(__name__)
        self.llm = LLMClient()

    async def process_batch_lessons(
        self,
        analyses: List[ReflectorAnalysis],
        existing_playbook: UserPlaybook,
        source_plan_id: Optional[str] = None,
    ) -> UpdatedUserPlaybook:
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
                You are the Curator - the guardian of the user's institutional memory. Your playbook is the knowledge base that guides the TrainingCoach to create personalized training plans. These lessons represent long-term, persistent insights about the user's constraints, preferences, and proven patterns - not temporary or daily changes.
                
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
                Analyze each proposed lesson against ALL existing lessons and decide:
                1. **MERGE** - If it's a duplicate or very similar to an existing lesson
                2. **REPLACE** - If it contradicts an existing lesson (user evolution/change in long-term circumstances)
                3. **ADD** - If it's unique and adds new long-term value
                
                **CRITICAL FILTER: LONG-TERM LESSONS ONLY**
                - Focus on persistent patterns, not temporary states
                - Capture long-term constraints (injuries, equipment access, schedule patterns, etc.)
                - Capture proven preferences that have been consistent over time
                - Avoid lessons about daily fluctuations or one-time events
                - If a proposed lesson seems temporary or situation-specific, it may not belong in the playbook

                ═══════════════════════════════════════════════════════════════════════════════
                DECISION FRAMEWORK: MERGE, REPLACE, OR ADD?
                ═══════════════════════════════════════════════════════════════════════════════

                **MERGE:**
                Merge the proposed lesson into an existing lesson if they are exactly the same OR if they are related and should be combined into a single enhanced lesson.
                
                **How to Merge:**
                - **Preserve existing lesson ID** - Keep the existing lesson's ID (NEVER change existing IDs)
                - **Keep or refine text** - Keep or refine the existing lesson's text to incorporate both perspectives (use existing text OR combine for clarity)
                - **Combine all tags** - Combine tags from both lessons (merge tags from both lessons, remove duplicates)
                - **Update confidence** - Use the higher confidence value for exact duplicates, or weighted average (existing * 0.6 + proposed * 0.4) for related lessons (use: max(existing, proposed) OR weighted average)
                - **Increment counters** - Add proposed lesson's helpful_count or harmful_count to existing lesson's counters (add proposed lesson's helpful_count/harmful_count to existing)
                - **Update timestamps** - Update last_used_at to current timestamp (set last_used_at to current timestamp)

                **REPLACE:**
                Replace an existing lesson if the proposed lesson contradicts it (opposite guidance) or if the user's long-term situation has changed (equipment, injuries, preferences, availability) and the new lesson reflects current reality while the old lesson is outdated. Only replace if the change represents a persistent shift, not a temporary variation.
                
                **How to Replace:**
                - REMOVE the contradicted existing lesson entirely (delete it from the playbook)
                - ADD the new lesson with a new ID (generate new ID for the replacement lesson)
                - Keep the new lesson's values as-is (use proposed confidence, counters, tags as-is)
                - Document reasoning (explain why replacement occurred in reasoning field - emphasize it's a long-term change)
                - This reflects user evolution/change in long-term circumstances

                **ADD:**
                Add the proposed lesson as a new lesson if it is completely unique, represents a long-term insight, and adds new actionable value not covered by any existing lesson (no overlap or relation to existing lessons).
                
                **How to Add:**
                - **Verify long-term value** - Ensure the lesson represents a persistent pattern or constraint, not a temporary state
                - **Generate new ID** - Format: "lesson_{{random_hex}}" (8-character hex)
                - **Keep proposed lesson** - Keep proposed lesson as-is with all original values (use as-is with all original values)
                - **Preserve all existing lessons** - Preserve all existing lessons unchanged (don't modify existing lessons)
                
                **QUALITY CHECK:**
                Before adding, verify the lesson is:
                - Actionable (specific enough to guide future plan generation)
                - Long-term (represents a persistent pattern, not temporary)
                - Valuable (adds unique insight not already captured)
                - If the playbook exceeds {self.MAX_PLAYBOOK_SIZE} lessons, prioritize lessons with higher confidence and proven usefulness

                **OUTPUT REQUIREMENTS:**
                - Return ALL lessons (existing + new, after deduplication)
                - Each lesson must:
                - Have a unique ID (preserve existing IDs, generate new for truly new lessons)
                - Text must start with "The user..."
                - Include tags, confidence (0.0-1.0), positive (bool), helpful_count, harmful_count
                - Include created_at, last_used_at (current timestamp if newly used)
                - Include source_plan_id if provided
                - Set total_lessons to the count of final lessons
                - Provide reasoning explaining what was added, merged, removed, and why

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
            updated_playbook_result, _ = self.llm.chat_parse(prompt, UpdatedUserPlaybook)
            
            # Handle both Pydantic model instance and dict (depending on LLM provider)
            if updated_playbook_result is None:
                raise ValueError("LLM returned None - unable to parse playbook")
            
            if isinstance(updated_playbook_result, UpdatedUserPlaybook):
                updated_playbook = updated_playbook_result
            elif isinstance(updated_playbook_result, dict):
                # Convert dict to UpdatedUserPlaybook if needed
                updated_playbook = UpdatedUserPlaybook(**updated_playbook_result)
            else:
                # Fallback: try to validate as Pydantic model
                updated_playbook = UpdatedUserPlaybook.model_validate(updated_playbook_result)
            
            # Generate proper IDs for new lessons (those that don't match existing IDs)
            # Filter out None/empty IDs when building existing_ids set
            existing_ids = {lesson.id for lesson in existing_playbook.lessons if lesson.id}
            
            # Ensure all lessons have valid IDs
            if not updated_playbook.lessons:
                self.logger.warning("LLM returned empty lessons list - using existing playbook")
                updated_playbook.lessons = existing_playbook.lessons
                updated_playbook.total_lessons = len(existing_playbook.lessons)
            else:
                for lesson in updated_playbook.lessons:
                    # Safety check: ensure lesson has a valid ID (not None, not empty)
                    if not lesson.id or not str(lesson.id).strip():
                        lesson.id = f"lesson_{uuid.uuid4().hex[:8]}"
                    # If lesson has a temporary ID or ID doesn't exist in existing playbook, generate new one
                    elif str(lesson.id).startswith("new_") or lesson.id not in existing_ids:
                        lesson.id = f"lesson_{uuid.uuid4().hex[:8]}"
                
                # Update total_lessons to match actual lesson count after ID generation
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
            
            # Ensure total_lessons matches actual lesson count (safety check)
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

    def mark_lessons_as_applied(
        self, playbook: UserPlaybook, applied_lesson_ids: List[str]
    ) -> UserPlaybook:
        """
        Mark lessons as having been applied during plan generation.
        Increments times_applied counter and updates last_used_at.

        Args:
            playbook: User's playbook
            applied_lesson_ids: IDs of lessons that were used in plan generation

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

        return playbook

    def update_lesson_effectiveness(
        self, lesson: PlaybookLesson, was_helpful: bool
    ) -> PlaybookLesson:
        """
        Update a lesson's effectiveness counters based on outcome.

        Args:
            lesson: The lesson to update
            was_helpful: True if the lesson led to good outcomes, False otherwise

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
