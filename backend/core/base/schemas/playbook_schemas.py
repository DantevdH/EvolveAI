"""
Playbook schemas for the ACE (Adaptive Context Engine) pattern.

This module defines the data structures for:
- User playbooks (personalized lessons learned)
- Training outcomes (feedback signals)
- Reflector analysis (lesson generation)
- Curator operations (playbook management)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class OutcomeType(str, Enum):
    """Types of outcomes that can be tracked."""

    COMPLETION = "completion"
    FEEDBACK = "feedback"
    HEART_RATE = "heart_rate"
    RATING = "rating"
    INJURY = "injury"
    ENERGY = "energy"
    PROGRESS = "progress"


class PlaybookLesson(BaseModel):
    """A single lesson in the user's playbook."""

    id: str = Field(..., description="Unique identifier for the lesson")
    text: str = Field(
        ..., description="The lesson text that will be used in future prompts"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorizing lessons (e.g., 'beginner', 'progression', 'injury_prevention')",
    )
    helpful_count: int = Field(
        default=0, description="Number of times this lesson led to positive outcomes"
    )
    harmful_count: int = Field(
        default=0, description="Number of times this lesson led to negative outcomes"
    )
    confidence: float = Field(default=0.5, description="Confidence score 0.0-1.0")
    positive: bool = Field(
        default=True,
        description="Whether this lesson represents positive guidance (True) or a warning (False)",
    )
    created_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="When the lesson was created",
    )
    last_used_at: Optional[str] = Field(
        None, description="When the lesson was last used in generation"
    )
    source_plan_id: Optional[str] = Field(
        None, description="ID of the training plan that generated this lesson"
    )


class UserPlaybook(BaseModel):
    """Complete playbook for a user containing all learned lessons."""

    user_id: str = Field(..., description="User identifier")
    lessons: List[PlaybookLesson] = Field(
        default_factory=list, description="List of all lessons"
    )
    total_lessons: int = Field(default=0, description="Total number of lessons")
    last_updated: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Last update timestamp",
    )

    def get_active_lessons(self, min_confidence: float = 0.3) -> List[PlaybookLesson]:
        """Get lessons with confidence above threshold."""
        return [
            lesson for lesson in self.lessons if lesson.confidence >= min_confidence
        ]

    def get_lessons_by_tags(self, tags: List[str]) -> List[PlaybookLesson]:
        """Get lessons matching any of the provided tags."""
        return [
            lesson for lesson in self.lessons if any(tag in lesson.tags for tag in tags)
        ]


class TrainingOutcome(BaseModel):
    """Signals and feedback from a completed training period."""

    plan_id: str = Field(..., description="ID of the training plan being evaluated")
    user_id: str = Field(..., description="User identifier")
    week_number: int = Field(..., description="Which week of the plan")

    # Completion metrics
    sessions_completed: int = Field(..., description="Number of sessions completed")
    sessions_planned: int = Field(..., description="Number of sessions planned")
    completion_rate: float = Field(..., description="Percentage completed (0.0-1.0)")

    # User feedback
    user_feedback: Optional[str] = Field(
        None, description="Free-text feedback from user"
    )
    user_rating: Optional[int] = Field(None, ge=1, le=5, description="User rating 1-5")

    # Physiological data
    avg_heart_rate: Optional[float] = Field(
        None, description="Average heart rate during sessions"
    )
    max_heart_rate: Optional[float] = Field(
        None, description="Maximum heart rate recorded"
    )
    target_heart_rate_zone: Optional[str] = Field(
        None, description="Target HR zone (e.g., 'Zone 2', '<155 bpm')"
    )

    # Qualitative signals
    energy_level: Optional[int] = Field(
        None, ge=1, le=5, description="Self-reported energy level 1-5"
    )
    soreness_level: Optional[int] = Field(
        None, ge=1, le=5, description="Muscle soreness 1-5"
    )
    injury_reported: bool = Field(
        default=False, description="Whether user reported pain/injury"
    )
    injury_description: Optional[str] = Field(
        None, description="Description of injury if reported"
    )

    # Progress indicators
    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any performance data (weight lifted, distance, time)",
    )
    notes: Optional[str] = Field(None, description="Additional notes or context")

    collected_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="When feedback was collected",
    )


class ReflectorAnalysis(BaseModel):
    """Output from the Reflector analyzing training outcomes."""

    lesson: str = Field(..., description="The actionable lesson learned")
    tags: List[str] = Field(..., description="Tags categorizing this lesson")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence in this lesson"
    )
    positive: bool = Field(
        ..., description="True for positive patterns, False for warnings/corrections"
    )
    reasoning: str = Field(
        ..., description="Explanation of why this lesson was generated"
    )
    related_outcomes: List[str] = Field(
        default_factory=list, description="Which outcome types influenced this lesson"
    )
    priority: str = Field(
        default="medium",
        description="Priority level: 'low', 'medium', 'high', 'critical'",
    )


class CuratorDecision(BaseModel):
    """Decision made by the Curator about a new lesson."""

    action: str = Field(
        ...,
        description="Action to take: 'add_new', 'merge_with_existing', 'update_existing', 'reject'",
    )
    target_lesson_id: Optional[str] = Field(
        None, description="ID of existing lesson if merging/updating"
    )
    similarity_score: float = Field(
        default=0.0, description="Similarity to most similar existing lesson (0.0-1.0)"
    )
    reasoning: str = Field(..., description="Why this decision was made")
    merged_lesson: Optional[PlaybookLesson] = Field(
        None, description="The final lesson after merging/updating"
    )


class PlaybookStats(BaseModel):
    """Statistics about a user's playbook."""

    total_lessons: int
    positive_lessons: int
    warning_lessons: int
    avg_confidence: float
    most_common_tags: List[str]
    lessons_by_priority: Dict[str, int]
    last_updated: str
