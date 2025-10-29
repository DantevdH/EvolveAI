from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from enum import Enum


class QuestionType(str, Enum):
    """Types of questions that can be asked."""

    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    FREE_TEXT = "free_text"
    SLIDER = "slider"
    CONDITIONAL_BOOLEAN = "conditional_boolean"
    RATING = "rating"


class EquipmentType(str, Enum):
    """Available equipment types in the exercise database (must match exact database values)."""

    BARBELL = "Barbell"
    DUMBBELL = "Dumbbell"
    CABLE = "Cable"
    CABLE_PULL_SIDE = "Cable (pull side)"
    MACHINE = "Machine"
    ASSISTED_MACHINE = "Assisted (machine)"
    SMITH = "Smith"
    BODY_WEIGHT = "Body weight"
    BAND_RESISTIVE = "Band Resistive"
    SUSPENSION = "Suspension"
    SUSPENDED = "Suspended"
    SLED = "Sled"
    WEIGHTED = "Weighted"
    PLYOMETRIC = "Plyometric"
    ISOMETRIC = "Isometric"
    SELF_ASSISTED = "Self-assisted"


class QuestionOption(BaseModel):
    """Option for choice questions."""

    id: str = Field(..., description="Unique identifier for the option")
    text: str = Field(..., description="Display text for the option")
    value: str = Field(..., description="Value to be stored when selected")


class AIQuestion(BaseModel):
    """
    Unified question model for OpenAI structured output compatibility.

    OpenAI's API does NOT support Union types, so we use a single flexible schema
    with strict runtime validation to ensure type safety.
    """

    model_config = ConfigDict(extra="ignore")  # Ignore unknown fields for flexibility

    # Common fields (required for all types)
    id: str = Field(..., description="Unique identifier for the question")
    text: str = Field(..., description="Question text")
    help_text: str = Field(default="", description="Additional help text")
    response_type: QuestionType = Field(..., description="Type of question")

    # Conditional fields (required based on response_type)
    options: Optional[List[QuestionOption]] = Field(
        default=None,
        description="Options list - REQUIRED for multiple_choice and dropdown ONLY",
    )
    min_value: Optional[float] = Field(
        default=None, description="Minimum value - REQUIRED for slider and rating ONLY"
    )
    max_value: Optional[float] = Field(
        default=None, description="Maximum value - REQUIRED for slider and rating ONLY"
    )
    step: Optional[float] = Field(
        default=None, description="Step increment - REQUIRED for slider ONLY"
    )
    unit: Optional[str] = Field(
        default=None, description="Unit of measurement - REQUIRED for slider ONLY (must be a single string, not array)"
    )
    min_description: Optional[str] = Field(
        default=None, description="Maximum value label - REQUIRED for rating ONLY"
    )
    max_length: Optional[int] = Field(
        default=None,
        description="Maximum text length - REQUIRED for free_text and conditional_boolean ONLY",
        ge=1,
        le=5000,
    )
    placeholder: Optional[str] = Field(
        default=None,
        description="Placeholder text - REQUIRED for free_text and conditional_boolean ONLY",
    )
    
    # Validation moved to TrainingCoach._filter_valid_questions()
    # Invalid questions are filtered out gracefully instead of throwing 422 errors


class AIQuestionResponse(BaseModel):
    """Response from AI containing generated questions."""

    questions: List[AIQuestion] = Field(..., description="List of generated questions")
    total_questions: int = Field(..., description="Total number of questions")
    estimated_time_minutes: int = Field(
        ..., description="Estimated time to complete in minutes"
    )
    ai_message: Optional[str] = Field(
        default=None, description="Personalized AI coach message for this phase"
    )


class AIQuestionResponseWithFormatted(BaseModel):
    """Response from AI containing generated questions and formatted responses."""

    questions: List[AIQuestion] = Field(..., description="List of generated questions")
    total_questions: int = Field(..., description="Total number of questions")
    estimated_time_minutes: int = Field(
        ..., description="Estimated time to complete in minutes"
    )
    formatted_responses: str = Field(
        ..., description="Formatted responses for database storage"
    )
    ai_message: Optional[str] = Field(
        default=None, description="Personalized AI coach message for this phase"
    )


class PersonalInfo(BaseModel):
    """Basic personal information."""

    user_id: Optional[str] = Field(
        default=None,
        description="User's unique identifier (for ACE pattern playbook loading)",
    )
    username: str = Field(
        ..., min_length=3, max_length=20, description="User's chosen username"
    )
    age: int = Field(..., ge=13, le=100, description="User's age")
    weight: float = Field(..., gt=0, description="User's weight")
    height: float = Field(..., gt=0, description="User's height")
    weight_unit: str = Field(default="kg", description="Unit for weight (kg or lbs)")
    height_unit: str = Field(default="cm", description="Unit for height (cm or inches)")
    measurement_system: str = Field(
        default="metric",
        description="Measurement system preference (metric or imperial)",
    )
    gender: str = Field(..., description="User's gender")
    goal_description: str = Field(
        ..., description="User's goal description in their own words"
    )
    experience_level: str = Field(
        default="novice", description="User's training experience level"
    )


class InitialQuestionsRequest(BaseModel):
    """Request for initial questions generation."""

    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    user_profile_id: Optional[str] = Field(
        default=None, description="User profile ID for database storage"
    )
    jwt_token: Optional[str] = Field(
        default=None, description="JWT token for authentication"
    )


class FollowUpQuestionsRequest(BaseModel):
    """Request for follow-up questions generation."""

    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to initial questions"
    )
    initial_questions: List[AIQuestion] = Field(
        ..., description="Initial questions from frontend"
    )
    user_profile_id: Optional[str] = Field(
        default=None, description="User profile ID for database storage"
    )
    jwt_token: Optional[str] = Field(
        default=None, description="JWT token for authentication"
    )


class PlanGenerationRequest(BaseModel):
    """Request for training plan generation."""

    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to initial questions"
    )
    follow_up_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to follow-up questions"
    )
    initial_questions: List[AIQuestion] = Field(
        ..., description="Initial questions from frontend"
    )
    follow_up_questions: List[AIQuestion] = Field(
        ..., description="Follow-up questions from frontend"
    )
    user_profile_id: Optional[int] = Field(
        default=None, description="User profile ID for database storage"
    )
    jwt_token: str = Field(..., description="JWT token for authentication")


class ExerciseRetrievalDecision(BaseModel):
    """AI's decision on whether to retrieve exercises from database."""

    retrieve_exercises: bool = Field(
        ..., description="Whether you need exercises from the database"
    )
    difficulty: Optional[str] = Field(
        default=None,
        description="If retrieving exercises, what difficulty level? (beginner/intermediate/advanced)",
    )
    equipment: Optional[List[EquipmentType]] = Field(
        default=None,
        description="If retrieving exercises, which equipment types? Select from the EquipmentType enum based on what user has access to",
    )
    reasoning: str = Field(..., description="Your reasoning for this decision")
    alternative_approach: Optional[str] = Field(
        default=None, description="If not using exercises, what approach will you take?"
    )


class PlanGenerationResponse(BaseModel):
    """Response from training plan generation."""

    success: bool = Field(..., description="Whether plan generation was successful")
    training_plan: Optional[dict] = Field(
        default=None, description="Generated training plan"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if unsuccessful"
    )


class PlanFeedbackRequest(BaseModel):
    """Request schema for plan feedback processing."""
    
    user_profile_id: int = Field(..., description="User profile ID")
    plan_id: int = Field(..., description="Training plan ID")
    feedback_message: str = Field(..., description="User feedback message")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=[], 
        description="Previous conversation messages for context"
    )
    formatted_initial_responses: Optional[str] = Field(
        None, 
        description="Formatted initial question responses for context"
    )
    formatted_follow_up_responses: Optional[str] = Field(
        None, 
        description="Formatted follow-up question responses for context"
    )


class PlanFeedbackResponse(BaseModel):
    """Response schema for plan feedback processing."""
    
    success: bool = Field(..., description="Whether the feedback was processed successfully")
    ai_response: str = Field(..., description="AI's response to the feedback")
    plan_updated: bool = Field(..., description="Whether the plan was modified")
    updated_plan: Optional[Dict[str, Any]] = Field(
        None, 
        description="Updated plan data if changes were made"
    )
    changes_explanation: Optional[str] = Field(
        None, 
        description="Explanation of what was changed and why"
    )
    navigate_to_main_app: Optional[bool] = Field(
        default=False, 
        description="If true, frontend should navigate to the main application"
    )
    error: Optional[str] = Field(None, description="Error message if processing failed")


# ===== Feedback classification schema =====

class FeedbackIntent(str, Enum):
    """Strict three-intent system plus fallback."""

    CLARIFICATION_OR_CONCERN = "clarification_or_concern"
    UPDATE_REQUEST = "update_request"
    SATISFIED = "satisfied"
    OTHER = "other"


class FeedbackAction(str, Enum):
    """Allowed actions based on feedback intent."""

    RESPOND_ONLY = "respond_only"
    UPDATE_PLAN = "update_plan"
    NAVIGATE_TO_MAIN_APP = "navigate_to_main_app"


class FeedbackClassification(BaseModel):
    """Validated structure for feedback classification results from LLM."""

    intent: FeedbackIntent = Field(..., description="User intent classification")
    action: FeedbackAction = Field(..., description="Action the system should take")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classifier confidence 0-1")
    needs_plan_update: bool = Field(..., description="Whether a plan update is required")
    navigate_to_main_app: bool = Field(..., description="Whether to navigate to main app")
    reasoning: str = Field(..., description="Short explanation for the decision")
    specific_changes: List[str] = Field(
        default_factory=list,
        description="Explicit change requests if intent is update_request, otherwise []",
    )
