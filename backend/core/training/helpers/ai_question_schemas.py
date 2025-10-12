from pydantic import BaseModel, Field, Tag
from typing import List, Optional, Dict, Any, Union, Annotated
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


class BaseAIQuestion(BaseModel):
    """Base question class with common fields."""
    id: str = Field(..., description="Unique identifier for the question")
    text: str = Field(..., description="Question text")
    help_text: str = Field(default="", description="Additional help text for the question")


class MultipleChoiceQuestion(BaseAIQuestion):
    """Question with multiple choice options."""
    response_type: QuestionType = Field(default=QuestionType.MULTIPLE_CHOICE, description="Type of response expected")
    options: List[QuestionOption] = Field(..., description="Options for choice questions")


class DropdownQuestion(BaseAIQuestion):
    """Question with dropdown options."""
    response_type: QuestionType = Field(default=QuestionType.DROPDOWN, description="Type of response expected")
    options: List[QuestionOption] = Field(..., description="Options for dropdown")


class FreeTextQuestion(BaseAIQuestion):
    """Question with free text input."""
    response_type: QuestionType = Field(default=QuestionType.FREE_TEXT, description="Type of response expected")
    max_length: int = Field(default=500, description="Maximum length for text questions")
    placeholder: str = Field(default="Enter your response...", description="Placeholder text for input fields")


class SliderQuestion(BaseAIQuestion):
    """Question with slider input."""
    response_type: QuestionType = Field(default=QuestionType.SLIDER, description="Type of response expected")
    min_value: float = Field(default=0, description="Minimum value for slider questions")
    max_value: float = Field(default=100, description="Maximum value for slider questions")
    step: float = Field(default=1.0, description="Step size for slider questions")
    unit: str = Field(default="", description="Unit of measurement for slider questions (e.g., kg, lbs, minutes)")


class ConditionalBooleanQuestion(BaseAIQuestion):
    """Question with conditional boolean input (yes/no)."""
    response_type: QuestionType = Field(default=QuestionType.CONDITIONAL_BOOLEAN, description="Type of response expected")
    placeholder: str = Field(default="Please provide more details...", description="Placeholder text for the conditional text input")
    max_length: int = Field(default=500, description="Maximum length for the conditional text input")


class RatingQuestion(BaseAIQuestion):
    """Question with rating input."""
    response_type: QuestionType = Field(default=QuestionType.RATING, description="Type of response expected")
    min_value: int = Field(default=1, description="Minimum rating value")
    max_value: int = Field(default=5, description="Maximum rating value")
    min_description: str = Field(default="Low", description="Description for minimum value (e.g., 'Low', 'Never', 'Poor')")
    max_description: str = Field(default="High", description="Description for maximum value (e.g., 'High', 'Always', 'Excellent')")


# Union type for all question types
AIQuestion = MultipleChoiceQuestion | DropdownQuestion | FreeTextQuestion | SliderQuestion | ConditionalBooleanQuestion | RatingQuestion


class AIQuestionResponse(BaseModel):
    """Response from AI containing generated questions."""
    questions: List[AIQuestion] = Field(..., description="List of generated questions")
    total_questions: int = Field(..., description="Total number of questions")
    estimated_time_minutes: int = Field(..., description="Estimated time to complete in minutes")
    ai_message: Optional[str] = Field(default=None, description="Personalized AI coach message for this phase")


class AIQuestionResponseWithFormatted(BaseModel):
    """Response from AI containing generated questions and formatted responses."""
    questions: List[AIQuestion] = Field(..., description="List of generated questions")
    total_questions: int = Field(..., description="Total number of questions")
    estimated_time_minutes: int = Field(..., description="Estimated time to complete in minutes")
    formatted_responses: str = Field(..., description="Formatted responses for database storage")
    ai_message: Optional[str] = Field(default=None, description="Personalized AI coach message for this phase")


class PersonalInfo(BaseModel):
    """Basic personal information."""
    username: str = Field(..., min_length=3, max_length=20, description="User's chosen username")
    age: int = Field(..., ge=13, le=100, description="User's age")
    weight: float = Field(..., gt=0, description="User's weight")
    height: float = Field(..., gt=0, description="User's height")
    weight_unit: str = Field(default="kg", description="Unit for weight (kg or lbs)")
    height_unit: str = Field(default="cm", description="Unit for height (cm or inches)")
    measurement_system: str = Field(default="metric", description="Measurement system preference (metric or imperial)")
    gender: str = Field(..., description="User's gender")
    goal_description: str = Field(..., description="User's goal description in their own words")
    experience_level: str = Field(default="novice", description="User's training experience level")


class InitialQuestionsRequest(BaseModel):
    """Request for initial questions generation."""
    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    user_profile_id: Optional[str] = Field(default=None, description="User profile ID for database storage")
    jwt_token: Optional[str] = Field(default=None, description="JWT token for authentication")


class FollowUpQuestionsRequest(BaseModel):
    """Request for follow-up questions generation."""
    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(..., description="Raw responses to initial questions")
    initial_questions: List[AIQuestion] = Field(..., description="Initial questions from frontend")
    user_profile_id: Optional[str] = Field(default=None, description="User profile ID for database storage")
    jwt_token: Optional[str] = Field(default=None, description="JWT token for authentication")


class TrainingPlanOutlineRequest(BaseModel):
    """Request for training plan outline generation."""
    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(..., description="Raw responses to initial questions")
    follow_up_responses: Dict[str, Any] = Field(..., description="Raw responses to follow-up questions")
    initial_questions: List[AIQuestion] = Field(..., description="Initial questions from frontend")
    follow_up_questions: List[AIQuestion] = Field(..., description="Follow-up questions from frontend")
    jwt_token: str = Field(..., description="JWT token for authentication")


class PlanGenerationRequest(BaseModel):
    """Request for training plan generation."""
    personal_info: PersonalInfo = Field(..., description="Basic personal information")
    initial_responses: Dict[str, Any] = Field(..., description="Raw responses to initial questions")
    follow_up_responses: Dict[str, Any] = Field(..., description="Raw responses to follow-up questions")
    plan_outline: Optional[dict] = Field(default=None, description="Training plan outline from frontend")
    plan_outline_feedback: Optional[str] = Field(default=None, description="User feedback on plan outline")
    initial_questions: List[AIQuestion] = Field(..., description="Initial questions from frontend")
    follow_up_questions: List[AIQuestion] = Field(..., description="Follow-up questions from frontend")
    jwt_token: str = Field(..., description="JWT token for authentication")


class TrainingPlanOutlineResponse(BaseModel):
    """Response from training plan outline generation."""
    success: bool = Field(..., description="Whether outline generation was successful")
    outline: Optional[dict] = Field(default=None, description="Generated training plan outline")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")


class DailyTraining(BaseModel):
    """Daily training structure for training plan outline."""
    day: int = Field(..., description="Day number (1-7)")
    training_name: str = Field(..., description="Name of the training (e.g., 'Upper Body Strength', 'Easy Cardio')")
    description: str = Field(..., description="Explanation in max. 20 words of the day's training which can include items as duration, intensity, muscle groups, heart rate zones, distance, and equipment needed dependent on the training type")
    tags: List[str] = Field(..., description="Tags for categorization (e.g., 'strength', 'cardio', 'recovery', 'high-intensity')")


class TrainingPeriod(BaseModel):
    """Training period structure for training plan outline."""
    period_name: str = Field(..., description="Name of the training period (e.g., 'Foundation Phase', 'Build Phase', 'Peak Phase')")
    duration_weeks: int = Field(..., description="Duration of this period in weeks")
    explanation: str = Field(..., description="Detailed explanation of what this period involves")
    daily_trainings: List[DailyTraining] = Field(..., description="Sample daily trainings for this period")


class TrainingPlanOutline(BaseModel):
    """Structured training plan outline for any sport or athletic discipline."""
    title: str = Field(..., description="Program title in 3 words or less")
    duration_weeks: int = Field(..., description="Total program duration in weeks")
    explanation: str = Field(..., description="High-level overview and explanation of the training plan")
    training_periods: List[TrainingPeriod] = Field(..., description="Training periods breakdown of the program")
    user_observations: str = Field(..., description="Comprehensive summary of user profile and responses from initial and follow-up questions")
    ai_message: Optional[str] = Field(default=None, description="Personalized AI coach message for this phase")


class ExerciseRetrievalDecision(BaseModel):
    """AI's decision on whether to retrieve exercises from database."""
    
    retrieve_exercises: bool = Field(..., description="Whether you need exercises from the database")
    difficulty: Optional[str] = Field(default=None, description="If retrieving exercises, what difficulty level? (beginner/intermediate/advanced)")
    equipment: Optional[List[EquipmentType]] = Field(
        default=None, 
        description="If retrieving exercises, which equipment types? Select from the EquipmentType enum based on what user has access to"
    )
    reasoning: str = Field(..., description="Your reasoning for this decision")
    alternative_approach: Optional[str] = Field(default=None, description="If not using exercises, what approach will you take?")


class PlanGenerationResponse(BaseModel):
    """Response from training plan generation."""
    success: bool = Field(..., description="Whether plan generation was successful")
    training_plan: Optional[dict] = Field(default=None, description="Generated training plan")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")
