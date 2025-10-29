"""
Curator component for the ACE pattern.

The Curator manages the user's playbook by:
- Adding new lessons from Reflector analysis
- Detecting and merging duplicate/similar lessons using semantic embeddings
- Updating confidence scores based on outcomes
- Managing lesson lifecycle (promotion/demotion/removal)
- Supporting both lazy and proactive refinement
- Parallel delta processing for batch updates
"""

import os
import uuid
import openai
import asyncio
import numpy as np
from typing import List, Optional, Tuple
from datetime import datetime
from logging_config import get_logger
from core.base.ace_telemetry import ACETelemetry

from core.base.schemas.playbook_schemas import (
    PlaybookLesson,
    UserPlaybook,
    ReflectorAnalysis,
    CuratorDecision,
)
from pydantic import BaseModel, Field


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

    # Embedding-based de-duplication thresholds
    EMBEDDING_HIGH_SIMILARITY = 0.90  # Very similar (likely duplicate)
    EMBEDDING_LOW_SIMILARITY = 0.75  # Possibly similar (needs LLM verification)
    EMBEDDING_CONTRADICTION = -0.3  # Potential contradiction (needs LLM analysis)

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
        self._embedding_cache = {}  # Cache embeddings to reduce API calls

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

            # Check similarity with existing lessons (negative = contradiction)
            most_similar, similarity = self._find_most_similar_lesson(
                analysis, existing_playbook.lessons
            )

            self.logger.info(f"Most relevant lesson has score: {similarity:.2f}")

            # Handle contradictions (negative similarity scores)
            if similarity < 0 and most_similar:
                decision = self._handle_contradiction(
                    analysis, most_similar, similarity
                )
                
                # Track telemetry for contradiction resolution
                ACETelemetry.track_lesson_decision(
                    user_id=existing_playbook.user_id,
                    decision_type=decision.action,
                    similarity_score=similarity,
                    lesson_tags=analysis.tags,
                    is_contradiction=True
                )
                
                return decision, decision.merged_lesson

            # Handle similarities (positive scores)
            elif similarity >= self.HIGH_SIMILARITY_THRESHOLD and most_similar:
                # Very similar - merge/strengthen existing
                decision = self._merge_with_existing(analysis, most_similar, similarity)
                
                # Track telemetry for merge decision
                ACETelemetry.track_lesson_decision(
                    user_id=existing_playbook.user_id,
                    decision_type=decision.action,
                    similarity_score=similarity,
                    lesson_tags=analysis.tags,
                    is_contradiction=False
                )
                
                return decision, decision.merged_lesson

            elif similarity >= self.MEDIUM_SIMILARITY_THRESHOLD and most_similar:
                # Somewhat similar - update confidence
                decision = self._update_existing(analysis, most_similar, similarity)
                
                # Track telemetry for update decision
                ACETelemetry.track_lesson_decision(
                    user_id=existing_playbook.user_id,
                    decision_type=decision.action,
                    similarity_score=similarity,
                    lesson_tags=analysis.tags,
                    is_contradiction=False
                )
                
                return decision, decision.merged_lesson

            else:
                # Different enough - add as new
                decision = self._add_as_new(analysis, similarity, source_plan_id)
                new_lesson = self._create_lesson_from_analysis(analysis, source_plan_id)
                
                # Track telemetry for new lesson
                ACETelemetry.track_lesson_decision(
                    user_id=existing_playbook.user_id,
                    decision_type=decision.action,
                    similarity_score=similarity,
                    lesson_tags=analysis.tags,
                    is_contradiction=False
                )
                
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

    async def process_batch_lessons(
        self,
        analyses: List[ReflectorAnalysis],
        existing_playbook: UserPlaybook,
        source_plan_id: Optional[str] = None,
    ) -> List[Tuple[CuratorDecision, Optional[PlaybookLesson]]]:
        """
        Process multiple new lessons in parallel for batch updates.

        Args:
            analyses: List of ReflectorAnalysis objects to process
            existing_playbook: The user's current playbook
            source_plan_id: ID of the plan that generated these lessons

        Returns:
            List of (CuratorDecision, PlaybookLesson) tuples
        """
        try:
            self.logger.info(f"Processing batch of {len(analyses)} lessons in parallel")

            # Process all lessons in parallel
            tasks = [
                asyncio.to_thread(
                    self.process_new_lesson, analysis, existing_playbook, source_plan_id
                )
                for analysis in analyses
            ]

            results = await asyncio.gather(*tasks)
            self.logger.info(f"Completed batch processing of {len(results)} lessons")

            return results

        except Exception as e:
            self.logger.error(f"Error in batch processing: {e}")
            # Fall back to sequential processing
            return [
                self.process_new_lesson(analysis, existing_playbook, source_plan_id)
                for analysis in analyses
            ]

    def update_playbook(
        self,
        playbook: UserPlaybook,
        decisions: List[Tuple[CuratorDecision, Optional[PlaybookLesson]]],
        lazy_refine: bool = False,
    ) -> UserPlaybook:
        """
        Apply curator decisions to update the playbook.

        Args:
            playbook: Current user playbook
            decisions: List of (CuratorDecision, PlaybookLesson) tuples
            lazy_refine: If True, only cleanup when exceeding max size;
                        If False, cleanup proactively

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

        # Cleanup strategy based on lazy_refine flag
        if lazy_refine:
            # Lazy: only cleanup when exceeding maximum size
            if len(playbook.lessons) > self.MAX_PLAYBOOK_SIZE:
                self.logger.info(
                    f"Lazy refinement triggered: {len(playbook.lessons)} > {self.MAX_PLAYBOOK_SIZE}"
                )
                playbook = self._cleanup_playbook(playbook)
        else:
            # Proactive: cleanup if approaching max size (80% threshold)
            threshold = int(self.MAX_PLAYBOOK_SIZE * 0.8)
            if len(playbook.lessons) > threshold:
                self.logger.info(
                    f"Proactive refinement at {len(playbook.lessons)} lessons (threshold: {threshold})"
                )
                playbook = self._cleanup_playbook(playbook)

        # Update metadata
        playbook.total_lessons = len(playbook.lessons)
        playbook.last_updated = datetime.utcnow().isoformat()

        return playbook

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

    def _get_embedding(self, text: str) -> np.ndarray:
        """
        Get embedding vector for text using OpenAI's embedding model.
        Uses caching to reduce API calls.

        Args:
            text: Text to embed

        Returns:
            Numpy array of embedding vector
        """
        # Check cache first
        cache_key = hash(text)
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small", input=text  # Cost-effective model
            )
            embedding = np.array(response.data[0].embedding)

            # Cache the embedding
            self._embedding_cache[cache_key] = embedding

            return embedding

        except Exception as e:
            self.logger.error(f"Error getting embedding: {e}")
            # Return zero vector on error
            return np.zeros(1536)  # text-embedding-3-small dimension

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score between -1.0 and 1.0
        """
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            return float(dot_product / (norm1 * norm2))

        except Exception as e:
            self.logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0

    def _find_most_similar_lesson(
        self, analysis: ReflectorAnalysis, existing_lessons: List[PlaybookLesson]
    ) -> Tuple[Optional[PlaybookLesson], float]:
        """
        Find the most similar existing lesson using hybrid approach:
        1. Fast embedding-based similarity for filtering
        2. LLM-based analysis for borderline cases and contradictions

        This is 80% faster than pure LLM approach while maintaining accuracy.

        Returns:
            Tuple of (most_similar_lesson, similarity_score)
            Note: Negative similarity scores indicate contradictions
        """
        if not existing_lessons:
            return None, 0.0

        try:
            # Step 1: Get embedding for new lesson
            new_lesson_text = (
                f"{analysis.lesson} [{'positive' if analysis.positive else 'warning'}]"
            )
            new_embedding = self._get_embedding(new_lesson_text)

            # Step 2: Calculate embedding similarities with all existing lessons
            similarities = []
            for lesson in existing_lessons:
                lesson_text = (
                    f"{lesson.text} [{'positive' if lesson.positive else 'warning'}]"
                )
                lesson_embedding = self._get_embedding(lesson_text)
                similarity = self._cosine_similarity(new_embedding, lesson_embedding)
                similarities.append((lesson, similarity))

            # Find most similar
            most_similar_lesson, embedding_similarity = max(
                similarities, key=lambda x: x[1]
            )

            self.logger.info(f"Embedding similarity: {embedding_similarity:.3f}")

            # Step 3: Decision logic based on embedding similarity

            # Case 1: Very high similarity -> likely duplicate, merge without LLM
            if embedding_similarity >= self.EMBEDDING_HIGH_SIMILARITY:
                self.logger.info(
                    f"High embedding similarity ({embedding_similarity:.3f}) - treating as duplicate"
                )
                return most_similar_lesson, embedding_similarity

            # Case 2: Very low similarity -> clearly different, add as new without LLM
            elif embedding_similarity < self.EMBEDDING_LOW_SIMILARITY:
                self.logger.info(
                    f"Low embedding similarity ({embedding_similarity:.3f}) - treating as unique"
                )
                return most_similar_lesson, embedding_similarity

            # Case 3: Borderline (0.75-0.90) -> use LLM for precise analysis
            else:
                self.logger.info(
                    f"Borderline similarity ({embedding_similarity:.3f}) - using LLM verification"
                )
                # First check for contradictions
                contradicting_lesson, contradiction_score = self._check_contradiction(
                    analysis, existing_lessons
                )
                if contradicting_lesson:
                    return contradicting_lesson, contradiction_score
                
                # If no contradiction, check similarity
                return self._check_similarity(
                    analysis, most_similar_lesson, existing_lessons
                )

        except Exception as e:
            self.logger.error(
                f"Error in embedding-based similarity, falling back to LLM: {e}"
            )
            # Fallback to full LLM analysis
            contradicting_lesson, contradiction_score = self._check_contradiction(
                analysis, existing_lessons
            )
            if contradicting_lesson:
                return contradicting_lesson, contradiction_score
            return self._check_similarity(analysis, None, existing_lessons)

    def _check_contradiction(
        self,
        analysis: ReflectorAnalysis,
        all_lessons: List[PlaybookLesson],
    ) -> Tuple[Optional[PlaybookLesson], float]:
        """
        Check if new lesson contradicts any existing lesson using LLM.
        
        Args:
            analysis: New lesson to check
            all_lessons: All existing lessons
            
        Returns:
            Tuple of (contradicting_lesson, negative_score) or (None, 0.0) if no contradiction
        """
        if not all_lessons:
            return None, 0.0
            
        try:
            self.logger.info("Checking for contradictions with existing lessons...")
            
            # Build lessons list
            lessons_text = "\n".join(
                [
                    f"        {i+1}. [{lesson.id}] {lesson.text}\n           (confidence: {lesson.confidence:.0%}, created: {lesson.created_at[:10]})"
                    for i, lesson in enumerate(all_lessons)
                ]
            )

            prompt = f"""
        **WORKFLOW STATUS:**
        ✅ New Lesson Generated → ✅ Existing Playbook Loaded
        🎯 **CURRENT STEP:** Check for Contradictions (User Evolution Detection)
        
        **NEW LESSON TO EVALUATE:**
        • Text: {analysis.lesson}
        • Type: {'Positive Guidance' if analysis.positive else 'Warning/Constraint'}
        
        **EXISTING PLAYBOOK LESSONS:**
        {lessons_text}
        
        **YOUR TASK:**
        Check if the new lesson **CONTRADICTS** any existing lesson.
        Contradictions indicate user evolution (injury healed, fitness improved, capacity increased).
        
        **CONTRADICTION DEFINITION:**
        A contradiction occurs when lessons give **opposite or conflicting guidance**:
        • Old: "Avoid running due to knee pain" ↔ New: "Knee recovered - can include running"
        • Old: "Beginner - focus on basics" ↔ New: "Intermediate level - ready for advanced work"
        • Old: "Limit to 3 days/week" ↔ New: "Can handle 5 training days comfortably"
        
        **CONTRADICTION SCORING:**
        • **-1.0**: Direct contradiction - completely opposite guidance
        • **-0.8**: Strong conflict - incompatible recommendations
        • **-0.6**: Moderate conflict - different intensity/volume levels
        • **-0.4**: Mild conflict - slightly incompatible approaches
        
        **NOT CONTRADICTIONS (Don't flag these):**
        • Complementary lessons on different topics
        • Same general topic with different specific focus
        • Similar lessons with slightly different wording
        
        **DECISION LOGIC:**
        1. Scan all existing lessons for contradictions
        2. If contradiction found → Return lesson_id with NEGATIVE score
        3. If no contradiction found → Return "none" with 0.0
        
        **OUTPUT FORMAT:**
        Return in ContradictionCheck format:
        • lesson_id: ID of contradicting lesson, or "none"
        • contradiction_score: -1.0 to 0.0 (negative = contradiction, 0.0 = no contradiction)
        • reasoning: Brief explanation (1 sentence)
        """

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at detecting contradictions in training guidance, especially those indicating user evolution.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ContradictionCheck,
                temperature=os.getenv("OPENAI_TEMPERATURE", 0.7),
            )

            result = completion.choices[0].message.parsed

            if result.lesson_id == "none":
                return None, 0.0

            # Find the matching lesson
            contradicting_lesson = next(
                (l for l in all_lessons if l.id == result.lesson_id), None
            )

            return contradicting_lesson, result.contradiction_score

        except Exception as e:
            self.logger.error(f"Error checking contradiction: {e}")
            return None, 0.0

    def _check_similarity(
        self,
        analysis: ReflectorAnalysis,
        candidate_lesson: Optional[PlaybookLesson],
        all_lessons: List[PlaybookLesson],
    ) -> Tuple[Optional[PlaybookLesson], float]:
        """
        Check similarity between new lesson and existing lessons using LLM.
        
        Args:
            analysis: New lesson to check
            candidate_lesson: Most similar lesson from embedding search (focus on this if provided)
            all_lessons: All existing lessons
            
        Returns:
            Tuple of (most_similar_lesson, similarity_score)
        """
        if not all_lessons:
            return None, 0.0
            
        try:
            self.logger.info("Checking similarity with existing lessons...")
            
            # Build lessons list
            lessons_text = "\n".join(
                [
                    f"        {i+1}. [{lesson.id}] {lesson.text}\n           (confidence: {lesson.confidence:.0%}, helpful: {lesson.helpful_count}x)"
                    for i, lesson in enumerate(all_lessons)
                ]
            )

            prompt = f"""
        **WORKFLOW STATUS:**
        ✅ New Lesson Generated → ✅ No Contradictions Found
        🎯 **CURRENT STEP:** Find Most Similar Existing Lesson
        
        **NEW LESSON TO EVALUATE:**
        • Text: {analysis.lesson}
        • Tags: {', '.join(analysis.tags)}
        • Type: {'Positive Guidance' if analysis.positive else 'Warning/Constraint'}
        
        **EXISTING PLAYBOOK LESSONS:**
        {lessons_text}
        
        **YOUR TASK:**
        Find the most similar existing lesson to the new lesson.
        
        **SIMILARITY SCORING GUIDE:**
        
        • **0.95-1.0**: Nearly identical - just different wording
          Example: "Avoid overhead pressing" ↔ "No overhead movements due to shoulder injury"
        
        • **0.85-0.95**: Same core concept - minor detail differences
          Example: "Limited to dumbbells only" ↔ "Can use dumbbells and bodyweight exercises"
        
        • **0.70-0.85**: Related concepts - different aspects of same topic
          Example: "Beginner - focus on technique" ↔ "Start with fundamentals before adding load"
        
        • **0.50-0.70**: Same topic area - distinct insights
          Example: "Can train 3x/week" ↔ "Prefers Monday/Wednesday/Friday schedule"
        
        • **0.30-0.50**: Loosely related - different focus
          Example: "Avoid high-impact movements" ↔ "Prefers strength training over endurance"
        
        • **0.00-0.30**: Unrelated - completely different topics
          Example: "Has dumbbells only" ↔ "Dislikes early morning training"
        
        **DECISION LOGIC:**
        1. Compare new lesson with all existing lessons
        2. Find the one with highest similarity
        3. Return lesson_id with similarity score (0.0-1.0)
        4. If all similarities are very low (<0.3) → Return "none" with 0.0
        
        **OUTPUT FORMAT:**
        Return in SimilarityCheck format:
        • lesson_id: ID of most similar lesson, or "none"
        • similarity_score: 0.0 to 1.0 (how similar they are)
        • reasoning: Brief explanation (1 sentence)
        """

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at identifying similar training lessons and determining how closely they align.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=SimilarityCheck,
                temperature=os.getenv("OPENAI_TEMPERATURE", 1.0),
            )

            result = completion.choices[0].message.parsed

            if result.lesson_id == "none":
                return None, 0.0

            # Find the matching lesson
            matching_lesson = next(
                (l for l in all_lessons if l.id == result.lesson_id), None
            )

            return matching_lesson, result.similarity_score

        except Exception as e:
            self.logger.error(f"Error checking similarity: {e}")
            return None, 0.0

    def _handle_contradiction(
        self,
        analysis: ReflectorAnalysis,
        contradicting: PlaybookLesson,
        similarity: float,
    ) -> CuratorDecision:
        """
        Handle a contradiction between new and existing lesson.

        Strategy: Accept new lesson (represents user evolution).
        Contradictions typically indicate user progress:
        - Injury healed
        - Fitness level increased  
        - Preferences changed
        - Capacity evolved
        
        The new lesson reflects current reality, so it replaces the old one.
        """
        self.logger.info(
            f"Contradiction detected! Replacing old lesson with new (user evolution)"
        )

        # New lesson wins - replace the contradicting one
        new_lesson = PlaybookLesson(
            id=contradicting.id,  # Keep same ID to replace
            text=analysis.lesson,  # Use new text
            tags=list(set(contradicting.tags + analysis.tags)),  # Merge tags
            helpful_count=0,  # Reset counters for new lesson
            harmful_count=0,
            confidence=analysis.confidence,
            positive=analysis.positive,
            created_at=datetime.utcnow().isoformat(),  # New creation date
            last_used_at=datetime.utcnow().isoformat(),
            source_plan_id=contradicting.source_plan_id,
        )

        return CuratorDecision(
            action="merge_with_existing",  # This will replace via update_playbook
            target_lesson_id=contradicting.id,
            similarity_score=similarity,
            reasoning=f"CONTRADICTION RESOLVED: New lesson replaces old (user evolution). Old: '{contradicting.text[:50]}...' → New: '{analysis.lesson[:50]}...'",
            merged_lesson=new_lesson,
        )

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


class ContradictionCheck(BaseModel):
    """Result of checking for contradictions between new and existing lessons."""

    lesson_id: str = Field(
        ..., description="ID of contradicting existing lesson, or 'none'"
    )
    contradiction_score: float = Field(
        ...,
        ge=-1.0,
        le=0.0,
        description="Contradiction score: -1.0 (direct contradiction) to 0.0 (no contradiction)",
    )
    reasoning: str = Field(
        ..., description="Brief explanation of the contradiction (1 sentence)"
    )


class SimilarityCheck(BaseModel):
    """Result of checking similarity between new and existing lessons."""

    lesson_id: str = Field(
        ..., description="ID of most similar existing lesson, or 'none'"
    )
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Similarity score: 0.0 (unrelated) to 1.0 (identical)",
    )
    reasoning: str = Field(
        ..., description="Brief explanation of the similarity (1 sentence)"
    )


class SimilarityComparison(BaseModel):
    """[DEPRECATED] Result of comparing a new lesson with existing lessons."""

    lesson_id: str = Field(
        ..., description="ID of most similar/contradicting existing lesson, or 'none'"
    )
    similarity_score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Similarity score: -1.0 (direct contradiction) to 1.0 (identical). Negative = contradiction, Positive = similar",
    )
    reasoning: str = Field(
        ...,
        description="Brief explanation of the relationship (similarity or contradiction)",
    )
