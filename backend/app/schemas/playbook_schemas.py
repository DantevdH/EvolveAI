"""
Playbook schemas for the ACE (Adaptive Context Engine) pattern.

This module defines the data structures for:
- User playbooks (personalized lessons learned)
- Training outcomes (feedback signals)
- Reflector analysis (lesson generation)
- Curator operations (playbook management)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

# Create Literal types for unified schemas
# These generate JSON Schema with inline enum constraints, forcing ALL providers to use only valid values
OutcomeTypeLiteral = Literal["completion", "feedback", "heart_rate", "rating", "injury", "energy", "progress"]


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
    times_applied: int = Field(
        default=0, description="Number of times this lesson was used in plan generation"
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
    requires_context: bool = Field(
        default=False,
        description="Whether this lesson requires additional context from knowledge base. Determined by Curator."
    )
    context: Optional[str] = Field(
        None,
        description="Validated context retrieved from knowledge base for this lesson. Set to 'context not found' if no relevant context exists. Populated after curator step."
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
    """Signals and feedback from a completed training period (DEPRECATED - use DailyTrainingOutcome)."""

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


class TrainingModification(BaseModel):
    """Details about how the user modified their planned training."""

    field: str = Field(..., description="Field that was modified (e.g., 'sets', 'reps', 'weight', 'distance')")
    original_value: Any = Field(..., description="Originally planned value")
    actual_value: Any = Field(..., description="What the user actually did")
    exercise_name: Optional[str] = Field(None, description="Name of exercise/session that was modified")


class DailyTrainingOutcome(BaseModel):
    """Signals and feedback from a single completed training session (daily)."""

    # Identifiers
    plan_id: str = Field(..., description="ID of the training plan")
    user_id: str = Field(..., description="User identifier")
    daily_training_id: int = Field(..., description="ID of the specific daily training session")
    week_number: int = Field(..., description="Which week of the plan")
    day_of_week: str = Field(..., description="Day of week (Monday-Sunday)")
    training_date: str = Field(..., description="Actual date of training (ISO format)")
    
    # Session details
    training_type: str = Field(..., description="Type: strength, endurance, mixed, rest")
    session_completed: bool = Field(..., description="Whether the session was fully completed")
    completion_percentage: float = Field(default=1.0, ge=0.0, le=1.0, description="How much was completed (0.0-1.0)")
    
    # Training modifications (detected by comparing original vs actual)
    was_modified: bool = Field(default=False, description="Whether user modified the planned training")
    modifications: List[TrainingModification] = Field(
        default_factory=list, 
        description="List of all modifications made by user"
    )
    
    # User feedback (can be skipped)
    feedback_provided: bool = Field(default=False, description="Whether user provided feedback (or skipped)")
    user_feedback: Optional[str] = Field(None, description="Free-text feedback from user")
    user_rating: Optional[int] = Field(None, ge=1, le=5, description="Session rating 1-5 (how did it feel?)")
    
    # Physiological data (from wearables or manual entry)
    avg_heart_rate: Optional[float] = Field(None, description="Average heart rate during session")
    max_heart_rate: Optional[float] = Field(None, description="Maximum heart rate recorded")
    target_heart_rate_zone: Optional[str] = Field(None, description="Target HR zone")
    
    # Immediate post-session signals
    energy_level: Optional[int] = Field(None, ge=1, le=5, description="Energy level immediately after (1=exhausted, 5=energized)")
    difficulty: Optional[int] = Field(None, ge=1, le=5, description="Difficulty rating (1=too easy, 5=too hard)")
    enjoyment: Optional[int] = Field(None, ge=1, le=5, description="Enjoyment rating (1=hated it, 5=loved it)")
    soreness_level: Optional[int] = Field(None, ge=1, le=5, description="Muscle soreness during/after (1=none, 5=severe)")
    
    # Safety signals
    injury_reported: bool = Field(default=False, description="Whether user reported pain/injury during session")
    injury_description: Optional[str] = Field(None, description="Description of injury/pain if reported")
    pain_location: Optional[str] = Field(None, description="Where pain occurred (e.g., 'right knee', 'lower back')")
    
    # Performance data
    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Performance data (weights lifted, distance, pace, duration, etc.)",
    )
    
    # Metadata
    notes: Optional[str] = Field(None, description="Additional notes or context")
    collected_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="When feedback was collected",
    )
    feedback_skipped_at: Optional[str] = Field(None, description="When user skipped feedback (if applicable)")


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


class LessonApplication(BaseModel):
    """Record of a lesson being applied during plan generation."""

    lesson_id: str = Field(..., description="ID of the lesson that was applied")
    lesson_text: str = Field(..., description="Text of the lesson")
    impact_description: str = Field(
        ..., description="How this lesson influenced the plan"
    )
    was_helpful: bool = Field(
        default=True, description="Whether the lesson was helpful in plan generation"
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


# ===== Batch Playbook Curation Schema =====

class UpdatedUserPlaybook(BaseModel):
    """
    Updated playbook after analyzing new lessons against existing playbook.
    
    The LLM analyzes all new lessons, compares them with existing lessons,
    performs deduplication (merging duplicates), handles contradictions,
    and returns the final curated playbook.
    """
    
    lessons: List[PlaybookLesson] = Field(
        ...,
        description="Complete list of lessons in the updated playbook (existing + new, after deduplication/merging)"
    )
    total_lessons: int = Field(..., description="Total number of lessons in the updated playbook")
    reasoning: str = Field(
        ...,
        description="Brief explanation of what changes were made (what was added, merged, removed, and why)"
    )
