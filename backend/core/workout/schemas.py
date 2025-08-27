from pydantic import BaseModel, Field
from typing import List, Optional
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
    final_chat_notes: str = Field(default="", description="Additional notes from chat interaction")


class ExerciseSchema(BaseModel):
    """
    Single exercise schema for workout plans.
    Contains workout-specific data (sets, reps, weight) and references exercise database.
    """
    
    exercise_id: int = Field(..., description="ID of the exercise from the database")
    sets: int = Field(..., ge=1, le=10, description="Number of sets")
    reps: List[int] = Field(..., description="Rep targets for each set")
    description: str = Field(..., description="Description for fallback replacement")
    weight_1rm: List[int] = Field(..., description="Weight as percentage of 1RM (e.g., 80.0 for 80% of 1RM) that the AI provides as a standard reference")
    weight: Optional[List[float]] = Field(default=None, description="Weight per set (user fills in)")
    
    # Validation
    @classmethod
    def validate_reps_match_sets(cls, v, values):
        """Ensure reps list length matches sets count."""
        if 'sets' in values and len(v) != values['sets']:
            raise ValueError(f"Reps list length ({len(v)}) must match sets count ({values['sets']})")
        return v
    
    @classmethod
    def validate_weight_match_sets(cls, v, values):
        """Ensure weight list length matches sets count if provided."""
        if v is not None and 'sets' in values and len(v) != values['sets']:
            raise ValueError(f"Weight list length ({len(v)}) must match sets count ({values['sets']})")
        return v


class DailyWorkoutSchema(BaseModel):
    """Schema for a single day's workout."""

    day_of_week: DayOfWeek
    warming_up_instructions: str = Field(..., description="Warming up instructions for the day")
    is_rest_day: bool = Field(..., description="True if this is a rest day")
    exercises: List[ExerciseSchema] = Field(
        default_factory=list, description="List of exercises (empty if rest day)"
    )
    daily_justification: str = Field(
        ..., 
        description="AI explanation for exercise selection and workout structure for this specific day, including: why these specific exercises were chosen, how they work together, muscle group targeting rationale, and how this day fits into the weekly progression"
    )
    cooling_down_instructions: str = Field(..., description="Cooling down instructions for the day")

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
    weekly_justification: str = Field(
        ..., 
        description="AI explanation for the weekly training structure focusing on: workout day variety and splits, recovery considerations between training days, how this week's intensity and volume are balanced, and progression strategy within the week"
    )


class WorkoutPlanSchema(BaseModel):
    """Main workout plan schema for OpenAI API response."""

    title: str = Field(..., max_length=200, description="Catchy workout plan title")
    summary: str = Field(..., description="Brief 1-2 sentence plan summary")
    weekly_schedules: List[WeeklyScheduleSchema] = Field(
        ..., min_items=1, max_items=12, description="1-12 weeks of workout schedules"
    )
    program_justification: str = Field(
        ..., 
        description="AI explanation for the overall program design covering: resistance training phases linked to user goals and experience level, periodization strategies (linear, undulating, block), progressive overload principles, variety and overload prevention strategies, and a brief note on what the next training phase would look like and this fits in the long-term goal"
    )
