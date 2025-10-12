"""
Curator component for the ACE pattern.

The Curator manages the user's playbook by:
- Adding new lessons from Reflector analysis
- Detecting and merging duplicate/similar lessons
- Updating confidence scores based on outcomes
- Managing lesson lifecycle (promotion/demotion/removal)
"""

import os
import uuid
import openai
from typing import List, Optional, Tuple
from datetime import datetime
from logging_config import get_logger

from core.base.schemas.playbook_schemas import (
    PlaybookLesson,
    UserPlaybook,
    ReflectorAnalysis,
    CuratorDecision,
)


class Curator:
    """
    Manages the user's playbook by curating lessons from the Reflector.

    The Curator ensures playbook quality by:
    - Preventing duplicate lessons
    - Merging similar lessons
    - Updating lesson confidence over time
    - Removing low-value lessons
    """

    # Thresholds for curator decisions
    HIGH_SIMILARITY_THRESHOLD = 0.85  # Merge if similarity > this
    MEDIUM_SIMILARITY_THRESHOLD = 0.65  # Update if similarity > this
    MIN_CONFIDENCE_THRESHOLD = 0.2  # Remove if confidence < this
    MAX_PLAYBOOK_SIZE = 20  # Maximum lessons per user

    def __init__(self, openai_client: Optional[openai.OpenAI] = None):
        """
        Initialize the Curator.

        Args:
            openai_client: OpenAI client instance (creates new one if not provided)
        """
        self.logger = get_logger(__name__)
        self.openai_client = openai_client or openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    def process_new_lesson(
        self,
        analysis: ReflectorAnalysis,
        existing_playbook: UserPlaybook,
        source_plan_id: Optional[str] = None,
    ) -> Tuple[CuratorDecision, Optional[PlaybookLesson]]:
        """
        Process a new lesson from the Reflector and decide how to add it to the playbook.

        Args:
            analysis: The ReflectorAnalysis containing the new lesson
            existing_playbook: The user's current playbook
            source_plan_id: ID of the plan that generated this lesson

        Returns:
            Tuple of (CuratorDecision, Updated/New PlaybookLesson or None)
        """
        try:
            self.logger.info(f"Processing new lesson: {analysis.lesson[:50]}...")

            # Check similarity with existing lessons
            most_similar, similarity = self._find_most_similar_lesson(
                analysis, existing_playbook.lessons
            )

            self.logger.info(f"Most similar lesson has similarity: {similarity:.2f}")

            # Decide action based on similarity
            if similarity >= self.HIGH_SIMILARITY_THRESHOLD and most_similar:
                # Very similar - merge/strengthen existing
                decision = self._merge_with_existing(analysis, most_similar, similarity)
                return decision, decision.merged_lesson

            elif similarity >= self.MEDIUM_SIMILARITY_THRESHOLD and most_similar:
                # Somewhat similar - update confidence
                decision = self._update_existing(analysis, most_similar, similarity)
                return decision, decision.merged_lesson

            else:
                # Different enough - add as new
                decision = self._add_as_new(analysis, similarity, source_plan_id)
                new_lesson = self._create_lesson_from_analysis(analysis, source_plan_id)
                return decision, new_lesson

        except Exception as e:
            self.logger.error(f"Error processing new lesson: {e}")
            # Return reject decision on error
            decision = CuratorDecision(
                action="reject",
                reasoning=f"Error during processing: {str(e)}",
                similarity_score=0.0,
            )
            return decision, None

    def update_playbook(
        self,
        playbook: UserPlaybook,
        decisions: List[Tuple[CuratorDecision, Optional[PlaybookLesson]]],
    ) -> UserPlaybook:
        """
        Apply curator decisions to update the playbook.

        Args:
            playbook: Current user playbook
            decisions: List of (CuratorDecision, PlaybookLesson) tuples

        Returns:
            Updated UserPlaybook
        """
        for decision, lesson in decisions:
            if decision.action == "add_new" and lesson:
                playbook.lessons.append(lesson)
                self.logger.info(f"Added new lesson: {lesson.id}")

            elif (
                decision.action in ["merge_with_existing", "update_existing"]
                and decision.merged_lesson
            ):
                # Find and replace the existing lesson
                for i, existing in enumerate(playbook.lessons):
                    if existing.id == decision.target_lesson_id:
                        playbook.lessons[i] = decision.merged_lesson
                        self.logger.info(f"Updated lesson: {decision.target_lesson_id}")
                        break

            elif decision.action == "reject":
                self.logger.info(f"Rejected lesson: {decision.reasoning}")

        # Cleanup: remove low-confidence lessons if playbook is too large
        if len(playbook.lessons) > self.MAX_PLAYBOOK_SIZE:
            playbook = self._cleanup_playbook(playbook)

        # Update metadata
        playbook.total_lessons = len(playbook.lessons)
        playbook.last_updated = datetime.utcnow().isoformat()

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

    def _find_most_similar_lesson(
        self, analysis: ReflectorAnalysis, existing_lessons: List[PlaybookLesson]
    ) -> Tuple[Optional[PlaybookLesson], float]:
        """
        Find the most similar existing lesson using AI semantic comparison.

        Returns:
            Tuple of (most_similar_lesson, similarity_score)
        """
        if not existing_lessons:
            return None, 0.0

        try:
            # Build comparison prompt
            lessons_text = "\n".join(
                [
                    f"{i+1}. [{lesson.id}] {lesson.text}"
                    for i, lesson in enumerate(existing_lessons)
                ]
            )

            prompt = f"""
Compare this new lesson with existing lessons and find the most similar one.

**NEW LESSON:**
{analysis.lesson}
Tags: {', '.join(analysis.tags)}

**EXISTING LESSONS:**
{lessons_text}

**YOUR TASK:**
1. Identify which existing lesson (if any) is most similar to the new lesson
2. Rate similarity from 0.0 (completely different) to 1.0 (essentially identical)

**SIMILARITY CRITERIA:**
- 0.9-1.0: Nearly identical, just different wording
- 0.7-0.9: Same core concept, minor differences
- 0.5-0.7: Related but distinct insights
- 0.3-0.5: Same topic area, different focus
- 0.0-0.3: Unrelated

Return the lesson ID and similarity score in SimilarityComparison format.
If no lesson is similar (all < 0.3), return "none" as lesson_id.
"""

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at comparing fitness training lessons and identifying semantic similarity.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=SimilarityComparison,
                temperature=0.2,
            )

            result = completion.choices[0].message.parsed

            if result.lesson_id == "none":
                return None, 0.0

            # Find the matching lesson
            matching_lesson = next(
                (l for l in existing_lessons if l.id == result.lesson_id), None
            )

            return matching_lesson, result.similarity_score

        except Exception as e:
            self.logger.error(f"Error finding similar lesson: {e}")
            return None, 0.0

    def _merge_with_existing(
        self, analysis: ReflectorAnalysis, existing: PlaybookLesson, similarity: float
    ) -> CuratorDecision:
        """Merge a new lesson with a very similar existing one."""
        # Strengthen the existing lesson
        merged = PlaybookLesson(
            id=existing.id,
            text=existing.text,  # Keep original wording
            tags=list(set(existing.tags + analysis.tags)),  # Merge tags
            helpful_count=existing.helpful_count + 1,  # Increment as reinforcement
            harmful_count=existing.harmful_count,
            confidence=min(1.0, existing.confidence + 0.1),  # Boost confidence
            positive=existing.positive,
            created_at=existing.created_at,
            last_used_at=datetime.utcnow().isoformat(),
            source_plan_id=existing.source_plan_id,
        )

        return CuratorDecision(
            action="merge_with_existing",
            target_lesson_id=existing.id,
            similarity_score=similarity,
            reasoning=f"Very similar to existing lesson (similarity: {similarity:.2f}). Reinforcing existing lesson.",
            merged_lesson=merged,
        )

    def _update_existing(
        self, analysis: ReflectorAnalysis, existing: PlaybookLesson, similarity: float
    ) -> CuratorDecision:
        """Update an existing lesson with new evidence."""
        # Update the lesson with new information
        merged = PlaybookLesson(
            id=existing.id,
            text=existing.text,  # Keep original text
            tags=list(set(existing.tags + analysis.tags)),
            helpful_count=existing.helpful_count,
            harmful_count=existing.harmful_count,
            confidence=min(
                1.0, (existing.confidence + analysis.confidence) / 2
            ),  # Average confidence
            positive=existing.positive,
            created_at=existing.created_at,
            last_used_at=datetime.utcnow().isoformat(),
            source_plan_id=existing.source_plan_id,
        )

        return CuratorDecision(
            action="update_existing",
            target_lesson_id=existing.id,
            similarity_score=similarity,
            reasoning=f"Related to existing lesson (similarity: {similarity:.2f}). Updating confidence.",
            merged_lesson=merged,
        )

    def _add_as_new(
        self,
        analysis: ReflectorAnalysis,
        similarity: float,
        source_plan_id: Optional[str],
    ) -> CuratorDecision:
        """Add as a new lesson."""
        return CuratorDecision(
            action="add_new",
            target_lesson_id=None,
            similarity_score=similarity,
            reasoning=f"Sufficiently unique (max similarity: {similarity:.2f}). Adding as new lesson.",
        )

    def _create_lesson_from_analysis(
        self, analysis: ReflectorAnalysis, source_plan_id: Optional[str]
    ) -> PlaybookLesson:
        """Create a PlaybookLesson from ReflectorAnalysis."""
        return PlaybookLesson(
            id=f"lesson_{uuid.uuid4().hex[:8]}",
            text=analysis.lesson,
            tags=analysis.tags,
            helpful_count=1 if analysis.positive else 0,
            harmful_count=0 if analysis.positive else 1,
            confidence=analysis.confidence,
            positive=analysis.positive,
            created_at=datetime.utcnow().isoformat(),
            source_plan_id=source_plan_id,
        )

    def _cleanup_playbook(self, playbook: UserPlaybook) -> UserPlaybook:
        """Remove low-value lessons when playbook is too large."""
        # Sort by confidence * usage (helpful + harmful counts)
        scored_lessons = [
            (
                lesson,
                lesson.confidence * (lesson.helpful_count + lesson.harmful_count + 1),
            )
            for lesson in playbook.lessons
        ]

        # Sort by score descending
        scored_lessons.sort(key=lambda x: x[1], reverse=True)

        # Keep top MAX_PLAYBOOK_SIZE lessons
        playbook.lessons = [
            lesson for lesson, _ in scored_lessons[: self.MAX_PLAYBOOK_SIZE]
        ]

        self.logger.info(f"Cleaned up playbook, kept {len(playbook.lessons)} lessons")

        return playbook


# Schema for similarity comparison
from pydantic import BaseModel, Field


class SimilarityComparison(BaseModel):
    """Result of comparing a new lesson with existing lessons."""

    lesson_id: str = Field(
        ..., description="ID of most similar existing lesson, or 'none'"
    )
    similarity_score: float = Field(
        ..., ge=0.0, le=1.0, description="Similarity score 0.0-1.0"
    )
    reasoning: str = Field(
        ..., description="Brief explanation of the similarity assessment"
    )
