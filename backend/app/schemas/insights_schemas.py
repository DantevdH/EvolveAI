"""
Pydantic schemas for simplified insights API.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class TopExercise(BaseModel):
    """Top performing exercise information."""
    
    name: str = Field(..., description="Exercise name")
    trend: Literal["improving", "stable", "declining"] = Field(
        ...,
        json_schema_extra={"type": "string"},
        description="Performance trend"
    )
    change: Optional[str] = Field(None, description="Change description (e.g., '+5kg', '+10%')")


class WeakPoint(BaseModel):
    """Muscle group weak point information."""
    
    muscle_group: str = Field(..., description="Muscle group name")
    issue: Literal["plateau", "declining", "inconsistent", "low_frequency"] = Field(
        ...,
        json_schema_extra={"type": "string"},
        description="Issue type"
    )
    severity: Literal["high", "medium", "low"] = Field(
        ...,
        json_schema_extra={"type": "string"},
        description="Severity level"
    )


class InsightsSummaryRequest(BaseModel):
    """Request model for insights summary generation."""
    
    user_profile_id: int = Field(..., description="User profile ID")
    jwt_token: str = Field(..., description="JWT token for authentication")
    training_plan: Optional[dict] = Field(
        None, 
        description="Optional training plan data (if provided, uses this instead of fetching from database)"
    )
    # Optional: Frontend can pass pre-calculated metrics to avoid duplication
    weak_points: Optional[List[WeakPoint]] = Field(
        None,
        description="Pre-calculated weak points from frontend (optional, backend will calculate if not provided)"
    )
    top_exercises: Optional[List[TopExercise]] = Field(
        None,
        description="Pre-calculated top exercises from frontend (optional, backend will calculate if not provided)"
    )


class InsightsMetrics(BaseModel):
    """Simple metrics for insights display."""
    
    volume_progress: str = Field(..., description="Volume progress description (e.g., '+15% from last week')")
    training_frequency: str = Field(..., description="Training frequency description (e.g., '4/4 days (on track)')")
    training_intensity: str = Field(..., description="Training intensity description based on RPE (e.g., 'Average RPE: 3.0/5 (manageable)')")
    intensity_trend: Literal["improving", "stable", "declining"] = Field(
        ...,
        json_schema_extra={"type": "string"},
        description="Training intensity trend (improving = lower RPE, declining = higher RPE)"
    )
    weak_points: List[WeakPoint] = Field(default_factory=list, description="Top 2-3 weak points from MSI")
    top_exercises: List[TopExercise] = Field(default_factory=list, description="Top performing exercises")


class AIInsightsSummary(BaseModel):
    """AI-generated insights summary."""
    
    summary: str = Field(..., description="Friendly 2-3 sentence summary of training progress")
    findings: List[str] = Field(..., description="2-3 key findings/observations derived from the training data")
    recommendations: List[str] = Field(..., description="2-3 specific actionable recommendations")


class InsightsSummaryResponse(BaseModel):
    """Response model for insights summary."""
    
    success: bool = Field(..., description="Whether the request was successful")
    summary: Optional[AIInsightsSummary] = Field(None, description="AI-generated insights summary")
    metrics: Optional[InsightsMetrics] = Field(None, description="Simple metrics for display")
    error: Optional[str] = Field(None, description="Error message if request failed")

