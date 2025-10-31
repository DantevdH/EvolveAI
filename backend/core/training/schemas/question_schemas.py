from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union, Literal
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


# ===== Gemini-friendly DTOs (Enums flattened to str) =====
class GeminiAIQuestion(BaseModel):
    """
    Gemini-friendly question model: replaces Enum fields with plain strings.
    This avoids $ref/allOf in JSON Schema that the Gemini SDK rejects.
    """

    model_config = ConfigDict(extra="ignore")

    id: str
    text: str
    help_text: str = ""
    # Enum flattened to string
    response_type: str

    options: Optional[List[QuestionOption]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None
    min_description: Optional[str] = None
    max_length: Optional[int] = Field(default=None, ge=1, le=5000)
    placeholder: Optional[str] = None


class GeminiAIQuestionResponse(BaseModel):
    questions: List[GeminiAIQuestion]
    total_questions: int
    estimated_time_minutes: int
    ai_message: Optional[str] = None


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
    
    user_profile_id: Union[int, str] = Field(..., description="User profile ID")
    plan_id: Union[int, str] = Field(..., description="Training plan ID")
    feedback_message: str = Field(..., description="User feedback message")
    current_plan: Dict[str, Any] = Field(..., description="Current training plan data (sent from frontend)")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(
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
    jwt_token: Optional[str] = Field(default=None, description="JWT token for authentication")


class PlanFeedbackResponse(BaseModel):
    """Response schema for plan feedback processing."""
    
    success: bool = Field(..., description="Whether the feedback was processed successfully")
    ai_response: str = Field(..., description="AI's response to the feedback")
    plan_updated: bool = Field(..., description="Whether the plan was modified")
    updated_plan: Optional[Dict[str, Any]] = Field(
        None, 
        description="Updated plan data if changes were made"
    )
    navigate_to_main_app: Optional[bool] = Field(
        default=False, 
        description="If true, frontend should navigate to the main application"
    )
    error: Optional[str] = Field(None, description="Error message if processing failed")


# ===== Operation schemas for plan updates =====

class OperationType(str, Enum):
    """Types of operations that can be performed on a training plan."""
    
    SWAP_EXERCISE = "swap_exercise"
    ADJUST_INTENSITY = "adjust_intensity"
    MOVE_DAY = "move_day"
    ADD_REST_DAY = "add_rest_day"
    ADJUST_VOLUME = "adjust_volume"
    ADD_EXERCISE = "add_exercise"
    REMOVE_EXERCISE = "remove_exercise"


class PlanOperation(BaseModel):
    """
    Unified operation model for plan updates (OpenAI structured output compatible).
    
    OpenAI's API does NOT support Union types, so we use a single flexible schema
    with conditional fields. The 'type' field determines which other fields are required.
    
    Field requirements by operation type:
    - swap_exercise: type, day_of_week, old_exercise_name, new_exercise_name, new_main_muscle, new_equipment
    - adjust_intensity: type, scope, direction, day_of_week (if scope=day/exercise), exercise_name (if scope=exercise)
    - move_day: type, source_day, target_day, swap
    - add_rest_day: type, day_of_week
    - adjust_volume: type, scope, change_type, adjustment, day_of_week (if scope=day/exercise)
    - add_exercise: type, day_of_week, new_exercise_name, new_main_muscle, new_equipment, sets, reps, weight_1rm
    - remove_exercise: type, day_of_week, exercise_name
    """
    
    model_config = ConfigDict(extra="ignore")  # Ignore unknown fields for flexibility
    
    # Common field (required for ALL operation types)
    type: OperationType = Field(..., description="Type of operation to perform")
    
    # Fields for swap_exercise
    old_exercise_name: Optional[str] = Field(
        None, 
        description="REQUIRED for swap_exercise: Name of exercise to replace"
    )
    new_exercise_name: Optional[str] = Field(
        None, 
        description="REQUIRED for swap_exercise: Name of new exercise (without equipment in name)"
    )
    new_main_muscle: Optional[str] = Field(
        None, 
        description="REQUIRED for swap_exercise: Main muscle targeted (must match database options)"
    )
    new_equipment: Optional[str] = Field(
        None, 
        description="REQUIRED for swap_exercise: Equipment needed (must match database options)"
    )
    
    # Fields for adjust_intensity and adjust_volume
    scope: Optional[str] = Field(
        None, 
        description="REQUIRED for adjust_intensity/adjust_volume: 'day', 'exercise', or 'week'"
    )
    
    # Fields for adjust_intensity
    direction: Optional[str] = Field(
        None, 
        description="REQUIRED for adjust_intensity: 'easier' or 'harder'"
    )
    
    # Fields for adjust_volume
    change_type: Optional[str] = Field(
        None, 
        description="REQUIRED for adjust_volume: 'sets', 'reps', or 'duration'"
    )
    adjustment: Optional[int] = Field(
        None, 
        description="REQUIRED for adjust_volume: Amount to adjust (positive to add, negative to remove)"
    )
    
    # Fields for move_day
    source_day: Optional[str] = Field(
        None, 
        description="REQUIRED for move_day: Day to move from"
    )
    target_day: Optional[str] = Field(
        None, 
        description="REQUIRED for move_day: Day to move to"
    )
    swap: Optional[bool] = Field(
        None, 
        description="REQUIRED for move_day: If true, swap days; if false, just move"
    )
    
    # Fields for add_exercise
    sets: Optional[int] = Field(
        None,
        description="REQUIRED for add_exercise: Number of sets"
    )
    reps: Optional[List[int]] = Field(
        None,
        description="REQUIRED for add_exercise: Reps for each set (array length must match sets)"
    )
    weight_1rm: Optional[List[float]] = Field(
        None,
        description="REQUIRED for add_exercise: 1RM percentages for each set (array length must match sets)"
    )
    
    # Shared fields (used by multiple operation types)
    day_of_week: Optional[str] = Field(
        None, 
        description="REQUIRED for: swap_exercise, add_rest_day, adjust_intensity (if scope=day/exercise), adjust_volume (if scope=day/exercise), add_exercise, remove_exercise"
    )
    exercise_name: Optional[str] = Field(
        None, 
        description="REQUIRED for: adjust_intensity (if scope=exercise), adjust_volume (if scope=exercise), remove_exercise"
    )


# ===== Feedback classification schema =====

class FeedbackIntent(str, Enum):
    """Intent classification for user feedback."""

    QUESTION = "question"  # User asks a specific question AI can answer
    UNCLEAR = "unclear"  # User's feedback is vague, AI needs more information
    UPDATE_REQUEST = "update_request"  # User wants specific changes with complete info
    SATISFIED = "satisfied"  # User is happy and ready to start
    OTHER = "other"  # Off-topic or out of scope


class FeedbackAction(str, Enum):
    """Allowed actions based on feedback intent."""

    RESPOND_ONLY = "respond_only"
    UPDATE_PLAN = "update_plan"
    NAVIGATE_TO_MAIN_APP = "navigate_to_main_app"


class FeedbackIntentClassification(BaseModel):
    """Lightweight intent classification (Stage 1) - no operations parsing."""

    intent: FeedbackIntent = Field(..., description="User intent classification")
    action: FeedbackAction = Field(..., description="Action the system should take")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classifier confidence 0-1")
    needs_plan_update: bool = Field(..., description="Whether a plan update is required")
    navigate_to_main_app: bool = Field(..., description="Whether to navigate to main app")
    reasoning: str = Field(..., description="Short explanation for the decision")
    ai_message: str = Field(..., description="AI's response to the user")


class FeedbackOperations(BaseModel):
    """Operation parsing results (Stage 2) - only for update_request intent."""

    operations: List[PlanOperation] = Field(
        ...,
        description="Parsed operations for plan updates (must have at least 1)"
    )
    ai_message: Optional[str] = Field(
        default=None,
        description="Confirmation message about what changes will be made"
    )


# ===== Gemini-friendly DTOs for feedback (Enums flattened to str) =====
class GeminiFeedbackIntentClassification(BaseModel):
    intent: str
    action: str
    confidence: float
    needs_plan_update: bool
    navigate_to_main_app: bool
    reasoning: str
    ai_message: str


class GeminiPlanOperation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str
    old_exercise_name: Optional[str] = None
    new_exercise_name: Optional[str] = None
    new_main_muscle: Optional[str] = None
    new_equipment: Optional[str] = None
    scope: Optional[str] = None
    direction: Optional[str] = None
    change_type: Optional[str] = None
    adjustment: Optional[int] = None
    source_day: Optional[str] = None
    target_day: Optional[str] = None
    swap: Optional[bool] = None
    sets: Optional[int] = None
    reps: Optional[List[int]] = None
    weight_1rm: Optional[List[float]] = None
    day_of_week: Optional[str] = None
    exercise_name: Optional[str] = None


class GeminiFeedbackOperations(BaseModel):
    operations: List[GeminiPlanOperation]
    ai_message: Optional[str] = None


class FeedbackClassification(BaseModel):
    """
    LEGACY: Combined classification and operations (single-stage approach).
    
    Use FeedbackIntentClassification + FeedbackOperations for two-stage approach instead.
    Keeping this for backward compatibility during migration.
    """

    intent: FeedbackIntent = Field(..., description="User intent classification")
    action: FeedbackAction = Field(..., description="Action the system should take")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classifier confidence 0-1")
    needs_plan_update: bool = Field(..., description="Whether a plan update is required")
    navigate_to_main_app: bool = Field(..., description="Whether to navigate to main app")
    reasoning: str = Field(..., description="Short explanation for the decision")
    specific_changes: Optional[List[str]] = Field(
        default=[],
        description="Explicit change requests if intent is update_request, otherwise []",
    )
    operations: Optional[List[PlanOperation]] = Field(
        default=[],
        description="Parsed operations for plan updates (only if intent is update_request)",
    )
    ai_message: Optional[str] = Field(
        default=None,
        description="Friendly AI message confirming changes or responding to feedback"
    )
