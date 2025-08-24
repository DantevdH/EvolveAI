"""
Request and response models for workout plan generation API.

These models define the data structures for API communication.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from .schemas import WorkoutPlanSchema

class GenerateWorkoutRequest(BaseModel):
    """Request model for workout plan generation."""
    
    primaryGoal: str = Field(..., description="Primary fitness goal")
    primaryGoalDescription: str = Field(..., description="Detailed description of the goal")
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
    hasLimitations: bool = Field(..., description="Whether user has physical limitations")
    limitationsDescription: Optional[str] = Field(None, description="Description of limitations")
    finalChatNotes: Optional[str] = Field(None, description="Additional notes from chat")

class GenerateWorkoutResponse(BaseModel):
    """Response model for workout plan generation."""
    
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    workout_plan: WorkoutPlanSchema = Field(..., description="Generated workout plan")

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
