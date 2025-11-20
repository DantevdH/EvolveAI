from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union, Literal

# Create Literal types for unified schemas
# These generate JSON Schema with inline enum constraints, forcing ALL providers to use only valid values
QuestionTypeLiteral = Literal["multiple_choice", "dropdown", "free_text", "slider", "conditional_boolean", "rating"]
FeedbackIntentLiteral = Literal["question", "unclear", "update_request", "satisfied", "other"]
FeedbackActionLiteral = Literal["respond_only", "update_plan", "navigate_to_main_app"]
OperationTypeLiteral = Literal["swap_exercise", "adjust_intensity", "move_day", "add_rest_day", "adjust_volume", "add_exercise", "remove_exercise"]
AthleteTypeLiteral = Literal["strength", "endurance", "sport_specific", "functional_fitness"]
IntentPlanPriorityLiteral = Literal["primary", "optional"]


class QuestionOption(BaseModel):
    """Option for choice questions."""

    id: str = Field(..., description="Unique identifier for the option")
    text: str = Field(..., description="Display text for the option")
    value: str = Field(..., description="Value to be stored when selected")


class AIQuestion(BaseModel):
    """
    Unified question model for multi-provider structured output compatibility.

    Uses Literal types to force valid values at generation time for all providers.
    """

    model_config = ConfigDict(extra="ignore")  # Ignore unknown fields for flexibility

    # Common fields (required for all types)
    id: str = Field(..., description="Unique identifier for the question")
    text: str = Field(..., description="Question text")
    help_text: str = Field(default="", description="Additional help text")
    response_type: QuestionTypeLiteral = Field(..., description="Type of question")
    order: Optional[int] = Field(default=None, description="Display order for this question (1-based, lower numbers appear first). Frontend can use this to maintain question order.")

    # Conditional fields (required based on response_type)
    options: Optional[List[QuestionOption]] = Field(
        default=None,
        description="Options list - REQUIRED for multiple_choice and dropdown ONLY",
    )
    multiselect: Optional[bool] = Field(
        default=None,
        description="REQUIRED for multiple_choice and dropdown: Whether user can select multiple options (true) or only one option (false). Must be explicitly set.",
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


class PlanGenerationRequest(BaseModel):
    """Request for training plan generation."""

    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(
        ..., description="Raw responses to initial questions"
    )
    initial_questions: List[AIQuestion] = Field(
        ..., description="Initial questions from frontend"
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
    equipment: Optional[List[str]] = Field(
        default=None,
        description="If retrieving exercises, which equipment types? Select from available equipment values based on what user has access to",
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
    training_plan: Dict[str, Any] = Field(..., description="Full training plan data (sent from frontend)")
    week_number: int = Field(
        ...,
        description="Week number to update (required - should be the current week from frontend)"
    )
    playbook: Optional[Dict[str, Any]] = Field(
        default=None,
        description="User playbook from frontend (userProfile.playbook)"
    )
    personal_info: Optional[PersonalInfo] = Field(
        default=None,
        description="User personal info from frontend (userProfile) - optional, falls back to DB if not provided"
    )
    conversation_history: Optional[List[Dict[str, Any]]] = Field(
        default=[], 
        description="Previous conversation messages for context"
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
    updated_playbook: Optional[Dict[str, Any]] = Field(
        None,
        description="Updated playbook after processing feedback"
    )
    navigate_to_main_app: Optional[bool] = Field(
        default=False, 
        description="If true, frontend should navigate to the main application"
    )
    error: Optional[str] = Field(None, description="Error message if processing failed")


# ===== Operation schemas for plan updates =====

class PlanOperation(BaseModel):
    """
    Unified operation model for plan updates (multi-provider structured output compatible).
    
    Uses Literal types to force valid values at generation time for all providers.
    The 'type' field determines which other fields are required.
    
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
    type: OperationTypeLiteral = Field(..., description="Type of operation to perform")
    
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

class FeedbackIntentClassification(BaseModel):
    """Lightweight intent classification (Stage 1) - no operations parsing."""

    intent: FeedbackIntentLiteral = Field(..., description="User intent classification")
    action: FeedbackActionLiteral = Field(..., description="Action the system should take")
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


class FeedbackClassification(BaseModel):
    """
    LEGACY: Combined classification and operations (single-stage approach).
    
    Use FeedbackIntentClassification + FeedbackOperations for two-stage approach instead.
    Keeping this for backward compatibility during migration.
    """

    intent: FeedbackIntentLiteral = Field(..., description="User intent classification")
    action: FeedbackActionLiteral = Field(..., description="Action the system should take")
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


class CreateWeekRequest(BaseModel):
    """Request for creating a new week in the training plan."""
    
    training_plan: Dict[str, Any] = Field(..., description="Full training plan data")
    user_profile_id: int = Field(..., description="User profile ID")
    personal_info: PersonalInfo = Field(..., description="User personal information")
    plan_id: Optional[int] = Field(default=None, description="Training plan ID (optional, derived from training_plan if not provided)")
    jwt_token: str = Field(..., description="JWT token for authentication")


# ===== Athlete Type Classification Schemas =====

class AthleteTypeClassification(BaseModel):
    """Classification of user's training focus based on goal description."""
    
    primary_type: AthleteTypeLiteral = Field(..., description="Primary athlete type classification")
    secondary_types: List[AthleteTypeLiteral] = Field(
        default_factory=list,
        description="Secondary athlete types for mixed goals (e.g., strength + endurance)"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Classification confidence (0.0-1.0)"
    )
    reasoning: str = Field(
        ..., description="Brief explanation justifying the classification"
    )


# ===== Question Content Generation Schemas =====

class IntentPlanItem(BaseModel):
    """Plan describing which intents will cover each information gap."""
    
    information_gap: str = Field(
        ..., description="Critical information to gather for this user"
    )
    selected_intent_ids: List[str] = Field(
        ..., description="Intent identifiers that address this information gap"
    )
    priority: IntentPlanPriorityLiteral = Field(
        ..., description="Whether this gap is primary or optional for this user"
    )
    reasoning: str = Field(
        ..., description="Brief explanation of why this gap and intents were selected"
    )


class QuestionContentItem(BaseModel):
    """Single question content item (before formatting into schema)."""
    
    question_text: str = Field(..., description="The question text to ask")
    order: int = Field(
        ..., description="Display order for this question (1-based, lower numbers appear first)"
    )


class QuestionContent(BaseModel):
    """Question content generated by LLM (intermediate format before formatting)."""
    
    intent_plan: List[IntentPlanItem] = Field(
        default_factory=list,
        description="Documentation of information gaps and selected intents",
    )
    questions_content: List[QuestionContentItem] = Field(
        ..., description="List of question content items"
    )


