from pydantic import BaseModel, Field
from typing import List, Optional


class UserProfileSchema(BaseModel):
    """Schema for user profile data used in training plan generation."""

    experience_level: str = Field(..., description="User's training experience level")
    age: int = Field(..., ge=13, le=100, description="User's age")
    weight: float = Field(..., ge=30.0, le=300.0, description="User's weight")
    weight_unit: str = Field(..., description="Unit for weight (kg or lbs)")
    height: float = Field(..., ge=100.0, le=250.0, description="User's height")
    height_unit: str = Field(..., description="Unit for height (cm or inches)")
    gender: str = Field(..., description="User's gender")
    final_chat_notes: str = Field(
        default="", description="Additional notes from chat interaction"
    )
