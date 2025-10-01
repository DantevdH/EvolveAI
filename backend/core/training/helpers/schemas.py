from pydantic import BaseModel, Field
from typing import List, Optional


class UserProfileSchema(BaseModel):
    """Schema for user profile data used in training plan generation."""
    
    primary_goal: str = Field(..., description="User's primary training goal")
    primary_goal_description: str = Field(..., description="Detailed description of the goal")
    experience_level: str = Field(..., description="User's training experience level")
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