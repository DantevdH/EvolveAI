from pydantic import BaseModel, Field, model_validator, ConfigDict
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

    model_config = ConfigDict(extra="forbid")  # Reject unknown fields

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
        default=None, description="Unit of measurement - REQUIRED for slider ONLY"
    )
    min_description: Optional[str] = Field(
        default=None, description="Minimum value label - REQUIRED for rating ONLY"
    )
    max_description: Optional[str] = Field(
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

    @model_validator(mode="after")
    def validate_fields_by_type(self) -> "AIQuestion":
        """
        Strict validation: ensure required fields are present and forbidden fields are absent.
        This makes the unified schema as safe as separate schemas would be.
        """
        rt = self.response_type
        errors = []

        # Define field requirements per type
        FIELD_RULES = {
            QuestionType.MULTIPLE_CHOICE: {
                "required": ["options"],
                "forbidden": [
                    "min_value",
                    "max_value",
                    "step",
                    "unit",
                    "min_description",
                    "max_description",
                    "max_length",
                    "placeholder",
                ],
            },
            QuestionType.DROPDOWN: {
                "required": ["options"],
                "forbidden": [
                    "min_value",
                    "max_value",
                    "step",
                    "unit",
                    "min_description",
                    "max_description",
                    "max_length",
                    "placeholder",
                ],
            },
            QuestionType.SLIDER: {
                "required": ["min_value", "max_value", "step", "unit"],
                "forbidden": [
                    "options",
                    "min_description",
                    "max_description",
                    "max_length",
                    "placeholder",
                ],
            },
            QuestionType.RATING: {
                "required": [
                    "min_value",
                    "max_value",
                    "min_description",
                    "max_description",
                ],
                "forbidden": ["options", "step", "unit", "max_length", "placeholder"],
            },
            QuestionType.FREE_TEXT: {
                "required": ["max_length", "placeholder"],
                "forbidden": [
                    "options",
                    "min_value",
                    "max_value",
                    "step",
                    "unit",
                    "min_description",
                    "max_description",
                ],
            },
            QuestionType.CONDITIONAL_BOOLEAN: {
                "required": ["max_length", "placeholder"],
                "forbidden": [
                    "options",
                    "min_value",
                    "max_value",
                    "step",
                    "unit",
                    "min_description",
                    "max_description",
                ],
            },
        }

        rules = FIELD_RULES.get(rt)
        if not rules:
            raise ValueError(f"Unknown response_type: {rt}")

        # Check required fields
        for field_name in rules["required"]:
            value = getattr(self, field_name)
            if value is None:
                errors.append(
                    f"Missing required field '{field_name}' for {rt.value} question"
                )
            elif field_name == "options" and len(value) < 2:
                errors.append(
                    f"Field 'options' must have at least 2 items for {rt.value} question"
                )

        # Check forbidden fields (must be None)
        for field_name in rules["forbidden"]:
            value = getattr(self, field_name)
            if value is not None:
                errors.append(
                    f"Field '{field_name}' must NOT be set for {rt.value} question (found: {value})"
                )

        # Additional validation for slider
        if rt == QuestionType.SLIDER:
            if self.min_value is not None and self.max_value is not None:
                if self.min_value >= self.max_value:
                    errors.append(
                        f"min_value ({self.min_value}) must be less than max_value ({self.max_value})"
                    )
            if self.step is not None and self.step <= 0:
                errors.append(f"step must be greater than 0 (found: {self.step})")

        # Additional validation for rating
        if rt == QuestionType.RATING:
            if self.min_value is not None and self.min_value < 1:
                errors.append(
                    f"rating min_value must be at least 1 (found: {self.min_value})"
                )
            if self.max_value is not None and self.max_value > 10:
                errors.append(
                    f"rating max_value must be at most 10 (found: {self.max_value})"
                )

        if errors:
            raise ValueError(" | ".join(errors))

        return self


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
    """Training period structure for training plan outline."""

    period_name: str = Field(
        ...,
        description="Name of the training period (e.g., 'Foundation Phase', 'Build Phase', 'Peak Phase')",
    )
    duration_weeks: int = Field(..., description="Duration of this period in weeks")
    explanation: str = Field(
        ..., description="Detailed explanation of what this period involves"
    )
    daily_trainings: List[DailyTraining] = Field(
        ..., description="Sample daily trainings for this period"
    )


class TrainingPlanOutline(BaseModel):
    """Structured training plan outline for any sport or athletic discipline."""

    title: str = Field(..., description="Program title in 3 words or less")
    duration_weeks: int = Field(..., description="Total program duration in weeks")
    explanation: str = Field(
        ..., description="High-level overview and explanation of the training plan"
    )
    training_periods: List[TrainingPeriod] = Field(
        ..., description="Training periods breakdown of the program"
    )
    user_observations: str = Field(
        ...,
        description="Comprehensive summary of user profile and responses from initial and follow-up questions",
    )
    ai_message: Optional[str] = Field(
        default=None, description="Personalized AI coach message for this phase"
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
