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
    """Available equipment types in the exercise database."""

    ISOMETRIC = "Isometric"
    WEIGHTED = "Weighted"
    MACHINE = "Machine"
    SUSPENSION = "Suspension"
    BODY_WEIGHT_LOWER = "Body weight"
    BODY_WEIGHT_TITLE = "Body Weight"
    PLYOMETRIC = "Plyometric"
    MACHINE_SELECTORIZED = "Machine (selectorized)"
    ASSISTED_MACHINE = "Assisted (machine)"
    SMITH = "Smith"
    BAND_RESISTIVE = "Band Resistive"
    CABLE_PULL_SIDE = "Cable (pull side)"
    CABLE = "Cable"
    SELF_ASSISTED = "Self-assisted"
    SUSPENDED = "Suspended"
    BARBELL = "Barbell"
    BAND_ASSISTED = "Band-assisted"
    DUMBBELL = "Dumbbell"
    MACHINE_PLATE_LOADED = "Machine (plate loaded)"
    SLED = "Sled"


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


class TrainingPlanOutlineRequest(BaseModel):
    """Request for training plan outline generation."""

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
    jwt_token: str = Field(..., description="JWT token for authentication")


class PlanGenerationRequest(BaseModel):
    """Request for training plan generation."""

    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to initial questions"
    )
    follow_up_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to follow-up questions"
    )
    plan_outline: Optional[dict] = Field(
        default=None, description="Training plan outline from frontend"
    )
    plan_outline_feedback: Optional[str] = Field(
        default=None, description="User feedback on plan outline"
    )
    initial_questions: List[AIQuestion] = Field(
        ..., description="Initial questions from frontend"
    )
    follow_up_questions: List[AIQuestion] = Field(
        ..., description="Follow-up questions from frontend"
    )
    jwt_token: str = Field(..., description="JWT token for authentication")


class TrainingPlanOutlineResponse(BaseModel):
    """Response from training plan outline generation."""

    success: bool = Field(..., description="Whether outline generation was successful")
    outline: Optional[dict] = Field(
        default=None, description="Generated training plan outline"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if unsuccessful"
    )


class DailyTraining(BaseModel):
    """Daily training structure for training plan outline."""

    day: int = Field(..., description="Day number (1-7)")
    training_name: str = Field(
        ...,
        description="Name of the training (e.g., 'Upper Body Strength', 'Easy Cardio')",
    )
    description: str = Field(
        ...,
        description="Explanation in max. 20 words of the day's training which can include items as duration, intensity, muscle groups, heart rate zones, distance, and equipment needed dependent on the training type",
    )
    tags: List[str] = Field(
        ...,
        description="Tags for categorization (e.g., 'strength', 'cardio')",
    )


class TrainingPeriod(BaseModel):
    """Mini-phase within a 4-week training plan."""

    period_name: str = Field(
        ...,
        description="Phase name (e.g., 'Adaptation', 'Development')",
    )
    duration_weeks: int = Field(
        ..., 
        description="Duration in weeks (all phases must total 4 weeks)"
    )
    explanation: str = Field(
        ..., 
        description="What this phase accomplishes (1-2 sentences)"
    )
    daily_trainings: List[DailyTraining] = Field(
        ..., description="Sample daily trainings for this period"
    )


class TrainingPlanOutline(BaseModel):
    """Structured training plan outline for 4-week training blocks."""

    title: str = Field(
        ..., 
        description="Descriptive phase name for this 4-week training phase (e.g., 'Foundation Building', 'Base Endurance Development')"
    )
    duration_weeks: int = Field(
        ..., 
        description="Duration in weeks (must be 4)"
    )
    explanation: str = Field(
        ..., 
        description="High-level overview (2-3 sentences): what this phase accomplishes, why 4-week cycles, connection to their goal"
    )
    training_periods: List[TrainingPeriod] = Field(
        ..., description="1-2 mini-phases within these 4 weeks"
    )
    user_observations: str = Field(
        ...,
        description="Comprehensive summary of user profile and responses from initial and follow-up questions",
    )
    ai_message: Optional[str] = Field(
        default=None, 
        description="Personalized AI coach message explaining the 4-week approach and phase name"
    )


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
