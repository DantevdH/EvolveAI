"""
Pydantic schemas for the new training-focused database structure.
This replaces the old training-focused schemas with sports-agnostic training schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum


class DayOfWeek(str, Enum):
    """Enum for days of the week to ensure consistency."""

    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class TrainingType(str, Enum):
    """Enum for training types to ensure consistency with database constraints."""

    STRENGTH = "strength"
    ENDURANCE = "endurance"
    MIXED = "mixed"
    REST = "rest"


class EnduranceType(str, Enum):
    """Enum for endurance/cardio activity types."""

    RUNNING = "running"
    CYCLING = "cycling"
    SWIMMING = "swimming"
    ROWING = "rowing"
    HIKING = "hiking"
    WALKING = "walking"
    ELLIPTICAL = "elliptical"
    STAIR_CLIMBING = "stair_climbing"
    JUMP_ROPE = "jump_rope"
    OTHER = "other"


class VolumeUnit(str, Enum):
    """Enum for training volume units."""

    MINUTES = "minutes"
    KILOMETERS = "km"
    MILES = "miles"
    METERS = "meters"


class EnduranceSession(BaseModel):
    """Schema for individual endurance training sessions."""

    id: Optional[int] = Field(default=None, description="Database ID")
    name: str = Field(..., description="Concise name of the endurance session")
    sport_type: Union[EnduranceType, str] = Field(
        ..., 
        description="Endurance activity type (use EnduranceType enum values: running, cycling, swimming, rowing, hiking, walking, elliptical, stair_climbing, jump_rope, or other)"
    )
    training_volume: float = Field(
        ..., description="Duration (minutes) or distance (km/miles)"
    )
    unit: Union[VolumeUnit, str] = Field(
        ..., description="Unit for training_volume (use VolumeUnit enum: minutes, km, miles, meters)"
    )
    heart_rate_zone: Optional[int] = Field(
        default=None, description="Target heart rate zone (1-5)"
    )
    description: Optional[str] = Field(
        default=None, description="Description of the context of the endurance session"
    )
    completed: bool = Field(
        default=False, description="Whether the session was completed"
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )

    @field_validator('sport_type')
    @classmethod
    def validate_sport_type(cls, v):
        """Validate that sport_type is a valid EnduranceType value."""
        # If it's already an EnduranceType enum, it's valid
        if isinstance(v, EnduranceType):
            return v.value
        
        # If it's a string, check if it's a valid EnduranceType value
        if isinstance(v, str):
            valid_values = [e.value for e in EnduranceType]
            if v.lower() in valid_values:
                return v.lower()
            
            # Provide helpful error message
            raise ValueError(
                f"Invalid endurance type: '{v}'. Must be one of: {', '.join(valid_values)}"
            )
        
        return v

    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v):
        """Validate that unit is a valid VolumeUnit value."""
        # If it's already a VolumeUnit enum, it's valid
        if isinstance(v, VolumeUnit):
            return v.value
        
        # If it's a string, check if it's a valid VolumeUnit value
        if isinstance(v, str):
            valid_values = [e.value for e in VolumeUnit]
            if v.lower() in valid_values:
                return v.lower()
            
            # Provide helpful error message
            raise ValueError(
                f"Invalid volume unit: '{v}'. Must be one of: {', '.join(valid_values)}"
            )
        
        return v


class StrengthExercise(BaseModel):
    """Schema for individual strength exercises within a daily training session."""

    id: Optional[int] = Field(default=None, description="Database ID")
    daily_training_id: int = Field(..., description="ID of the daily training session")
    exercise_id: int = Field(..., description="ID of the exercise from exercises table")
    sets: int = Field(..., description="Number of sets")
    reps: List[int] = Field(..., description="Reps for each set")
    weight: List[float] = Field(..., description="Weight for each set")
    weight_1rm: List[float] = Field(..., description="1-rep max estimates for each set")
    completed: bool = Field(
        default=False, description="Whether the exercise was completed"
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class DailyTraining(BaseModel):
    """Schema for daily training sessions."""

    id: Optional[int] = Field(default=None, description="Database ID")
    weekly_schedule_id: int = Field(..., description="ID of the weekly schedule")
    day_of_week: DayOfWeek = Field(..., description="Day of the week")
    is_rest_day: bool = Field(default=False, description="Whether this is a rest day")
    training_type: TrainingType = Field(
        ..., description="Type of training: strength, endurance, mixed, or rest"
    )
    strength_exercises: List[StrengthExercise] = Field(
        default=[], description="Strength exercises for this day"
    )
    endurance_sessions: List[EnduranceSession] = Field(
        default=[], description="Endurance sessions for this day"
    )
    motivation: str = Field(
        ...,
        description="AI-generated motivation explaining the training choices for this day",
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class WeeklySchedule(BaseModel):
    """Schema for weekly training schedules."""

    id: Optional[int] = Field(default=None, description="Database ID")
    training_plan_id: int = Field(..., description="ID of the training plan")
    week_number: int = Field(..., description="Week number in the plan")
    daily_trainings: List[DailyTraining] = Field(
        default=[], description="Daily training sessions"
    )
    motivation: str = Field(
        ...,
        description="AI motivation: this week's purpose and how it progresses toward the goal",
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class TrainingPlan(BaseModel):
    """Schema for training plans (1-week schedule duplicated to 4 weeks)."""

    id: Optional[int] = Field(default=None, description="Database ID")
    user_profile_id: int = Field(..., description="ID of the user profile")
    title: str = Field(
        ..., 
        description="Descriptive phase title (e.g., 'Foundation Building', 'Base Endurance Development')"
    )
    summary: str = Field(
        ..., 
        description="Summary of this training phase's purpose"
    )
    weekly_schedules: List[WeeklySchedule] = Field(
        default=[], description="Weekly schedules (1-week template duplicated to 4 weeks)"
    )
    motivation: str = Field(
        ...,
        description="AI motivation: phase name, what this training accomplishes, how next phase will adapt based on progress",
    )
    ai_message: Optional[str] = Field(
        default=None, 
        description="AI message explaining the plan or recent changes"
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class TrainingPlanResponse(BaseModel):
    """Response schema for training plan operations."""

    success: bool = Field(..., description="Whether the operation was successful")
    training_plan: Optional[TrainingPlan] = Field(
        default=None, description="The training plan data"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if unsuccessful"
    )
    message: Optional[str] = Field(default=None, description="Success message")
