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


class UserProfileSchema(BaseModel):
    """Schema for user profile data used in workout plan generation."""
    
    primary_goal: str = Field(..., description="User's primary fitness goal")
    primary_goal_description: str = Field(..., description="Detailed description of the goal")
    experience_level: str = Field(..., description="User's fitness experience level")
    days_per_week: int = Field(..., ge=1, le=7, description="Number of training days per week")
    minutes_per_session: int = Field(..., ge=15, le=180, description="Minutes per training session")
    equipment: str = Field(..., description="Available equipment")
    age: int = Field(..., ge=13, le=100, description="User's age")
    weight: float = Field(..., ge=30.0, le=300.0, description="User's weight")
    weight_unit: str = Field(..., description="Unit for weight (kg or lbs)")
    height: float = Field(..., ge=100.0, le=250.0, description="User's height")
    height_unit: str = Field(..., description="Unit for height (cm or inches)")
    gender: str = Field(..., description="User's gender")
    has_limitations: bool = Field(..., description="Whether user has physical limitations")
    limitations_description: str = Field(default="", description="Description of limitations")
    training_schedule: str = Field(..., description="Preferred training schedule")
    final_chat_notes: str = Field(default="", description="Additional notes from chat interaction")


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
