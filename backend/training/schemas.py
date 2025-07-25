from pydantic import BaseModel, Field
from typing import List
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


class ExerciseSchema(BaseModel):
    """Schema for individual exercises in the workout plan."""

    name: str = Field(
        ..., description="The name of the exercise, e.g., 'Barbell Squat'"
    )
    sets: int = Field(..., ge=1, le=10, description="Number of sets (1-10)")
    reps: str = Field(
        ..., description="Rep range or duration, e.g., '8-12' or '45 seconds'"
    )


class DailyWorkoutSchema(BaseModel):
    """Schema for a single day's workout."""

    day_of_week: DayOfWeek
    is_rest_day: bool = Field(..., description="True if this is a rest day")
    exercises: List[ExerciseSchema] = Field(
        default_factory=list, description="List of exercises (empty if rest day)"
    )

    def validate_rest_day(self):
        """Ensure rest days have no exercises."""
        if self.is_rest_day and self.exercises:
            raise ValueError("Rest days should not have exercises")
        if not self.is_rest_day and not self.exercises:
            raise ValueError("Training days must have exercises")


class WeeklyScheduleSchema(BaseModel):
    """Schema for a week's workout schedule."""

    week_number: int = Field(..., ge=1, le=52, description="Week number (1-52)")
    daily_workouts: List[DailyWorkoutSchema] = Field(
        ...,
        min_items=7,
        max_items=7,
        description="Exactly 7 daily workouts (one for each day)",
    )


class WorkoutPlanSchema(BaseModel):
    """Main workout plan schema for OpenAI API response."""

    title: str = Field(..., max_length=200, description="Catchy workout plan title")
    summary: str = Field(..., description="Brief 1-2 sentence plan summary")
    weekly_schedules: List[WeeklyScheduleSchema] = Field(
        ..., min_items=1, max_items=12, description="1-12 weeks of workout schedules"
    )
