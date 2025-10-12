"""
Request and response models for training plan generation API.

These models define the data structures for API communication.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from core.training.schemas.training_schemas import TrainingPlan


class GenerateTrainingRequest(BaseModel):
    """Request model for training plan generation."""

    primaryGoal: str = Field(..., description="Primary training goal")
    primaryGoalDescription: str = Field(
        ..., description="Detailed description of the goal"
    )
    experienceLevel: str = Field(..., description="User's experience level")
    daysPerWeek: int = Field(..., description="Number of training days per week")
    minutesPerSession: int = Field(..., description="Duration of each training session")
    equipment: str = Field(..., description="Available equipment")
    age: int = Field(..., description="User's age")
    weight: float = Field(..., description="User's weight")
    weightUnit: str = Field(..., description="Weight unit (kg/lbs)")
    height: float = Field(..., description="User's height")
    heightUnit: str = Field(..., description="Height unit (cm/inches)")
    gender: str = Field(..., description="User's gender")
    hasLimitations: bool = Field(
        ..., description="Whether user has physical limitations"
    )
    limitationsDescription: Optional[str] = Field(
        None, description="Description of limitations"
    )
    finalChatNotes: Optional[str] = Field(
        None, description="Additional notes from chat"
    )
    user_id: Optional[str] = Field(None, description="User ID for database storage")
    user_profile_id: Optional[int] = Field(
        None, description="User profile ID for direct database storage"
    )


class GenerateTrainingResponse(BaseModel):
    """Response model for training plan generation."""

    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    training_plan: TrainingPlan = Field(..., description="Generated training plan")


class MockDataRequest(BaseModel):
    """Request model for mock data generation."""

    debug_mode: bool = Field(False, description="Whether to return mock data")
    user_profile: Optional[dict] = Field(None, description="Custom user profile data")


class MockDataResponse(BaseModel):
    """Response model for mock data generation."""

    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    mock_data: dict = Field(..., description="Generated mock data")
    data_type: str = Field(..., description="Type of mock data generated")
