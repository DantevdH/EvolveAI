"""
Pydantic schemas for the new training-focused database structure.
This replaces the old training-focused schemas with sports-agnostic training schemas.
"""

from pydantic import BaseModel, Field
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


class EnduranceSession(BaseModel):
    """Schema for individual endurance training sessions."""
    
    id: Optional[int] = Field(default=None, description="Database ID")
    daily_training_id: int = Field(..., description="ID of the daily training session")
    sport_type: str = Field(..., description="Sport type: running, cycling, swimming, etc.")
    training_volume: float = Field(..., description="Duration (minutes) or distance (km/miles)")
    unit: str = Field(..., description="Unit for training_volume: minutes, km, miles, meters")
    heart_rate_zone: Optional[int] = Field(default=None, description="Target heart rate zone (1-5)")
    completed: bool = Field(default=False, description="Whether the session was completed")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")


class StrengthExercise(BaseModel):
    """Schema for individual strength exercises within a daily training session."""
    
    id: Optional[int] = Field(default=None, description="Database ID")
    daily_training_id: int = Field(..., description="ID of the daily training session")
    exercise_id: int = Field(..., description="ID of the exercise from exercises table")
    sets: int = Field(..., description="Number of sets")
    reps: List[int] = Field(..., description="Reps for each set")
    weight: List[float] = Field(..., description="Weight for each set")
    weight_1rm: List[float] = Field(..., description="1-rep max estimates for each set")
    completed: bool = Field(default=False, description="Whether the exercise was completed")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")


class DailyTraining(BaseModel):
    """Schema for daily training sessions."""
    
    id: Optional[int] = Field(default=None, description="Database ID")
    weekly_schedule_id: int = Field(..., description="ID of the weekly schedule")
    day_of_week: DayOfWeek = Field(..., description="Day of the week")
    is_rest_day: bool = Field(default=False, description="Whether this is a rest day")
    training_type: str = Field(..., description="Type: strength, endurance, mixed, recovery")
    strength_exercises: List[StrengthExercise] = Field(default=[], description="Strength exercises for this day")
    endurance_sessions: List[EnduranceSession] = Field(default=[], description="Endurance sessions for this day")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")


class WeeklySchedule(BaseModel):
    """Schema for weekly training schedules."""
    
    id: Optional[int] = Field(default=None, description="Database ID")
    training_plan_id: int = Field(..., description="ID of the training plan")
    week_number: int = Field(..., description="Week number in the plan")
    daily_trainings: List[DailyTraining] = Field(default=[], description="Daily training sessions")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")


class TrainingPlan(BaseModel):
    """Schema for complete training plans."""
    
    id: Optional[int] = Field(default=None, description="Database ID")
    user_profile_id: int = Field(..., description="ID of the user profile")
    title: str = Field(..., description="Title of the training plan")
    summary: str = Field(..., description="Summary of the training plan")
    weekly_schedules: List[WeeklySchedule] = Field(default=[], description="Weekly schedules")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")


class TrainingPlanResponse(BaseModel):
    """Response schema for training plan operations."""
    
    success: bool = Field(..., description="Whether the operation was successful")
    training_plan: Optional[TrainingPlan] = Field(default=None, description="The training plan data")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")
    message: Optional[str] = Field(default=None, description="Success message")


