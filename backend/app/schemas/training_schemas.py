"""
Pydantic schemas for the new training-focused database structure.
This replaces the old training-focused schemas with sports-agnostic training schemas.
"""

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    AliasChoices,
    ConfigDict,
)
from typing import List, Optional, Union, Literal, get_args, get_origin
from datetime import datetime
from enum import Enum  # Still needed for dynamic EquipmentEnum and MainMuscleEnum


# Dynamic Enums - will be populated from database at module load
# These Enums are created dynamically from Supabase to keep them up-to-date with the database

def _create_exercise_metadata_enums():
    """
    Create Enum classes and extract values for Literal types from Supabase.
    
    Returns:
        Tuple of (EquipmentEnum, MainMuscleEnum, equipment_values_tuple, main_muscle_values_tuple)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Define comprehensive fallback values
    fallback_main_muscles = [
        "Adductors", "Anterior Deltoid", "Biceps Brachii", "Brachialis", "Brachioradialis",
        "Erector Spinae", "Gastrocnemius", "Gluteus Maximus", "Hamstrings", "Hip Abductors",
        "Hip Adductors", "Hip Flexors", "Iliopsoas", "Infraspinatus", "Lateral Deltoid",
        "Latissimus Dorsi", "Levator Scapulae", "Lower Trapezius", "Middle Trapezius",
        "Obliques", "Pectoralis Major Clavicular", "Pectoralis Major Sternal",
        "Posterior Deltoid", "Pronators", "Quadratus Lumborum", "Quadriceps",
        "Rectus Abdominis", "Rhomboids", "Serratus Anterior", "Soleus", "Splenius",
        "Sternocleidomastoid", "Subscapularis", "Supinator", "Supraspinatus",
        "Teres Major", "Teres Minor", "Tibialis Anterior", "Trapezius",
        "Triceps Brachii", "Upper Trapezius", "Wrist Extensors", "Wrist Flexors"
    ]
    
    fallback_equipment = [
        "Isometric", "Weighted", "Suspension", "Machine", "Body weight", "Plyometric",
        "Assisted (machine)", "Smith", "Band Resistive", "Cable (pull side)",
        "Self-assisted", "Suspended", "Barbell", "Dumbbell", "Cable", "Sled", "Body Weight"
    ]
    
    try:
        from app.helpers.exercise.exercise_selector import ExerciseSelector
        selector = ExerciseSelector()
        metadata = selector.get_metadata_options()
        
        equipment_list = metadata.get("equipment", [])
        main_muscles_list = metadata.get("main_muscles", [])
        
        # Use database values if available, otherwise use fallback
        if not equipment_list:
            equipment_list = fallback_equipment
            logger.warning("Using fallback equipment list (method: default)")
        else:
            logger.info(f"Using Supabase equipment list with {len(equipment_list)} items (method: supabase)")
        
        if not main_muscles_list:
            main_muscles_list = fallback_main_muscles
            logger.warning("Using fallback main_muscles list (method: default)")
        else:
            logger.info(f"Using Supabase main_muscles list with {len(main_muscles_list)} items (method: supabase)")
        
        # Deduplicate lists based on normalized values (case-insensitive, whitespace-stripped)
        # This ensures we only create enum entries for unique values
        def normalize_for_dedup(value):
            """Normalize value for deduplication (case-insensitive, whitespace-stripped)."""
            return str(value).strip().lower() if value else ""
        
        # Deduplicate equipment (preserve original casing of first occurrence)
        equipment_seen = {}
        equipment_unique = []
        for eq in equipment_list:
            normalized = normalize_for_dedup(eq)
            if normalized and normalized not in equipment_seen:
                equipment_seen[normalized] = True
                equipment_unique.append(eq)
        equipment_list = equipment_unique
        
        # Deduplicate main muscles
        main_muscles_seen = {}
        main_muscles_unique = []
        for mm in main_muscles_list:
            normalized = normalize_for_dedup(mm)
            if normalized and normalized not in main_muscles_seen:
                main_muscles_seen[normalized] = True
                main_muscles_unique.append(mm)
        main_muscles_list = main_muscles_unique
        
        # Create Enum classes dynamically
        # Equipment Enum - handle duplicate keys (after deduplication, this handles only key collisions from special chars)
        equipment_dict = {}
        for eq in equipment_list:
            # Convert to valid Python identifier (replace spaces/special chars with underscore)
            key = eq.upper().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_").strip()
            # Handle duplicates by appending number
            original_key = key
            counter = 1
            while key in equipment_dict:
                key = f"{original_key}_{counter}"
                counter += 1
            equipment_dict[key] = eq
        
        EquipmentEnum = Enum("EquipmentEnum", equipment_dict, type=str)
        
        # Main Muscle Enum
        main_muscle_dict = {}
        for mm in main_muscles_list:
            key = mm.upper().replace(" ", "_").replace("-", "_").replace("'", "").strip()
            # Handle duplicates
            original_key = key
            counter = 1
            while key in main_muscle_dict:
                key = f"{original_key}_{counter}"
                counter += 1
            main_muscle_dict[key] = mm
        
        MainMuscleEnum = Enum("MainMuscleEnum", main_muscle_dict, type=str)
        
        # Extract sorted unique string values for Literal types
        equipment_values = tuple(sorted(set(str(eq).strip() for eq in equipment_list if eq)))
        main_muscle_values = tuple(sorted(set(str(mm).strip() for mm in main_muscles_list if mm)))
        
        return EquipmentEnum, MainMuscleEnum, equipment_values, main_muscle_values
        
    except Exception as e:
        # Fallback to comprehensive default lists if database access fails
        logger.error(f"Could not fetch metadata from database, using fallback (method: default): {e}")
        
        # Use comprehensive fallback
        equipment_dict = {}
        for eq in fallback_equipment:
            key = eq.upper().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_").strip()
            original_key = key
            counter = 1
            while key in equipment_dict:
                key = f"{original_key}_{counter}"
                counter += 1
            equipment_dict[key] = eq
        
        main_muscle_dict = {}
        for mm in fallback_main_muscles:
            key = mm.upper().replace(" ", "_").replace("-", "_").replace("'", "").strip()
            original_key = key
            counter = 1
            while key in main_muscle_dict:
                key = f"{original_key}_{counter}"
                counter += 1
            main_muscle_dict[key] = mm
        
        EquipmentEnum = Enum("EquipmentEnum", equipment_dict, type=str)
        MainMuscleEnum = Enum("MainMuscleEnum", main_muscle_dict, type=str)
        
        # Extract sorted unique string values for Literal types
        equipment_values = tuple(sorted(set(str(eq).strip() for eq in fallback_equipment if eq)))
        main_muscle_values = tuple(sorted(set(str(mm).strip() for mm in fallback_main_muscles if mm)))
        
        return EquipmentEnum, MainMuscleEnum, equipment_values, main_muscle_values


# Create the Enums and values at module load
EquipmentEnum, MainMuscleEnum, equipment_values, main_muscle_values = _create_exercise_metadata_enums()


def _create_literal_from_values(values: tuple) -> type:
    """
    Create a Literal type from tuple of string values.
    
    Constructs Literal[v1, v2, ...] dynamically so Pydantic generates
    JSON Schema with inline enum constraints, forcing ALL providers to only use valid values.
    """
    if not values:
        return str
    
    # Filter and convert to strings
    str_values = tuple(str(v).strip() for v in values if v and str(v).strip())
    if not str_values:
        return str
    
    if len(str_values) == 1:
        return Literal[str_values[0]]
    
    # Construct Literal[v1, v2, ...] dynamically
    literal_args = ', '.join(repr(v) for v in str_values)
    literal_type = eval(f"Literal[{literal_args}]", {"Literal": Literal, "__builtins__": {}})
    
    # Verify all args are strings (required for Literal types)
    args = get_args(literal_type)
    if not args or not all(isinstance(arg, str) for arg in args):
        raise ValueError(f"Literal requires all string values, got: {args}")
    
    return literal_type


# Create Literal types from Enum values for unified schemas
# These generate JSON Schema with inline enum constraints, forcing ALL providers to use only valid values
EquipmentLiteral = _create_literal_from_values(equipment_values)
MainMuscleLiteral = _create_literal_from_values(main_muscle_values)

# Create Literal types for all static Enums
# These generate JSON Schema with inline enum constraints, forcing ALL providers to use only valid values
DayOfWeekLiteral = Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TrainingTypeLiteral = Literal["strength", "endurance", "mixed", "rest"]
EnduranceTypeLiteral = Literal["running", "cycling", "swimming", "rowing", "hiking", "walking", "elliptical", "stair_climbing", "jump_rope", "other"]
VolumeUnitLiteral = Literal["minutes", "km", "miles", "meters"]


class EnduranceSession(BaseModel):
    """Schema for individual endurance training sessions."""

    id: Optional[int] = Field(default=None, description="Database ID")
    name: str = Field(..., description="Concise name of the endurance session with 2 words")
    sport_type: EnduranceTypeLiteral = Field(
        ...,
        description="Endurance activity type (running, cycling, swimming, rowing, hiking, walking, elliptical, stair_climbing, jump_rope, or other)"
    )
    training_volume: float = Field(
        ..., description="Duration (minutes) or distance (km/miles)"
    )
    unit: VolumeUnitLiteral = Field(
        ..., description="Unit for training_volume (minutes, km, miles, meters)"
    )
    heart_rate_zone: int = Field(
        ..., description="Target heart rate zone (1-5)"
    )
    description: Optional[str] = Field(
        default=None, description="Description of the context of the endurance session"
    )
    execution_order: int = Field(
        ..., description="Order in which to execute this session within the day's training (1-based: 1, 2, 3, etc.)"
    )
    completed: bool = Field(
        default=False, description="Whether the session was completed"
    )

    # Note: Tracked workout data fields (actual_duration, actual_distance, etc.)
    # are stored in Supabase but not included in this schema since they're populated
    # by the frontend during live GPS tracking or health app import, not by AI generation.

    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class AIStrengthExercise(BaseModel):
    """
    Schema for AI-generated strength exercises with metadata validation.
    
    This schema is used during plan generation. The AI fills in exercise_name,
    main_muscle, and equipment, which are validated against
    database values from Supabase using Literal types.
    
    After matching, these are converted to StrengthExercise with exercise_id.
    """
    
    sets: int = Field(..., description="Number of sets")
    reps: List[int] = Field(..., description="Reps for each set")
    weight: List[float] = Field(..., description="Actual weight (in kg or lbs) for each set")
    execution_order: int = Field(
        ..., description="Order in which to execute this exercise within the day's training (1-based: 1, 2, 3, etc.)"
    )
    
    # AI-generated metadata (required, validated via Literal types - forces LLM to use valid values)
    exercise_name: str = Field(
        ...,
        description="Exercise name generated by AI (e.g., 'Barbell Bench Press', 'Dumbbell Shoulder Press')"
    )
    main_muscle: MainMuscleLiteral = Field(
        ...,
        description="Main muscle group for this exercise. MUST be one of the MainMuscleEnum values from the database."
    )
    equipment: EquipmentLiteral = Field(
        ...,
        description="Equipment type required. MUST be one of the EquipmentEnum values from the database."
    )
    
    completed: bool = Field(
        default=False, description="Whether the exercise was completed"
    )
    
    def to_enum_main_muscle(self) -> MainMuscleEnum:
        """Convert Literal value to Enum for database storage."""
        return MainMuscleEnum(self.main_muscle.strip())
    
    def to_enum_equipment(self) -> EquipmentEnum:
        """Convert Literal value to Enum for database storage."""
        return EquipmentEnum(self.equipment.strip())
    
    def to_strength_exercise(self, exercise_id: int, daily_training_id: int = 0) -> 'StrengthExercise':
        """
        Convert AI exercise to final StrengthExercise after matching.
        
        Args:
            exercise_id: Matched exercise ID from database
            daily_training_id: ID of the daily training session
        
        Returns:
            StrengthExercise with exercise_id set
        """
        return StrengthExercise(
            daily_training_id=daily_training_id,
            exercise_id=exercise_id,
            sets=self.sets,
            reps=self.reps,
            weight=self.weight,
            execution_order=self.execution_order,
            completed=self.completed
        )


class StrengthExercise(BaseModel):
    """
    Schema for strength exercises that works in two modes:
    
    1. AI Generation Mode: exercise_id is None, requires AI metadata fields (exercise_name, main_muscle, equipment)
    2. Matched Mode: exercise_id is required, AI metadata fields are optional (ignored)
    
    Pydantic validators enforce the correct fields based on which mode is active.
    """

    id: Optional[int] = Field(default=None, description="Database ID")
    daily_training_id: int = Field(default=0, description="ID of the daily training session")
    
    # Either exercise_id (after matching) OR AI metadata (during generation)
    exercise_id: Optional[int] = Field(
        default=None, 
        description="ID of the exercise from exercises table (required after matching, None during AI generation)"
    )
    
    # AI-generated metadata (required when exercise_id is None, validated against database)
    exercise_name: Optional[str] = Field(
        default=None,
        description="Exercise name generated by AI (required when exercise_id is None)"
    )
    main_muscle: Optional[str] = Field(
        default=None,
        description="Main muscle group for this exercise (required when exercise_id is None, validated against database)"
    )
    equipment: Optional[str] = Field(
        default=None,
        description="Equipment type required (required when exercise_id is None, validated against database)"
    )
    
    sets: int = Field(..., ge=1, le=6, description="Number of sets (1-6)")
    reps: List[int] = Field(..., description="Reps for each set. Should have the same length as the sets field.")
    weight: List[float] = Field(..., description="Actual weight (in kg or lbs) for each set. Should have the same length as the sets field.")
    execution_order: int = Field(
        ..., description="Order in which to execute this exercise within the day's training (1-based: 1, 2, 3, etc.)"
    )
    completed: bool = Field(
        default=False, description="Whether the exercise was completed"
    )
    
    # Enriched fields from exercises table (populated when exercise_id is set)
    # These fields come from the exercises table JOIN and provide additional exercise metadata
    target_area: Optional[str] = Field(
        default=None,
        description="Target area of the exercise (from exercises table, populated via JOIN)"
    )
    main_muscles: Optional[List[str]] = Field(
        default=None,
        description="Main muscles targeted by this exercise (from exercises.primary_muscles, populated via JOIN)"
    )
    force: Optional[str] = Field(
        default=None,
        description="Type of force applied (push, pull, static, etc.) - from exercises table (populated via JOIN)"
    )
    
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )
    
    @model_validator(mode='after')
    def validate_exercise_mode(self):
        """Validate that either exercise_id is set OR all AI metadata fields are set."""
        if self.exercise_id is None:
            # AI generation mode - require all metadata fields
            if not all([self.exercise_name, self.main_muscle, self.equipment]):
                raise ValueError(
                    "When exercise_id is None, all AI metadata fields must be provided: "
                    "exercise_name, main_muscle, equipment"
                )
        # If exercise_id is set, AI metadata is optional (ignored after matching)
        return self


class DailyTraining(BaseModel):
    """Schema for daily training sessions."""

    id: Optional[int] = Field(default=None, description="Database ID")
    weekly_schedule_id: int = Field(..., description="ID of the weekly schedule")
    day_of_week: DayOfWeekLiteral = Field(..., description="Day of the week")
    is_rest_day: bool = Field(default=False, description="Whether this is a rest day")
    training_type: TrainingTypeLiteral = Field(
        ..., description="Type of training: strength, endurance, mixed, or rest"
    )
    strength_exercises: List[AIStrengthExercise] = Field(
        default=[], description="Strength exercises for this day (AI-generated, will be converted to StrengthExercise after matching)"
    )
    endurance_sessions: List[EnduranceSession] = Field(
        default=[], description="Endurance sessions for this day"
    )
    justification: str = Field(
        ...,
        description="AI-generated justification explaining the training choices for this day",
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class WeeklySchedule(BaseModel):
    """Schema for weekly training schedules."""

    id: Optional[int] = Field(default=None, description="Database ID")
    training_plan_id: int = Field(..., description="ID of the training plan")
    week_number: int = Field(..., description="Week number in the plan")
    daily_trainings: List[DailyTraining] = Field(
        ..., description="Daily training sessions (exactly 7 days for full weeks, empty for outline-only weeks)"
    )
    focus_theme: str = Field(
        default=None,
        description="Headline for the week (e.g., 'Hypertrophy Volume Build')",
    )
    primary_goal: str = Field(
        default=None,
        description="One sentence describing the primary adaptation target for this week",
    )
    progression_lever: str = Field(
        default=None,
        description="How this week progresses the training (volume, intensity, skill, density, etc.)",
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class WeeklyOutlinePlan(BaseModel):
    """Collection of future weekly focus summaries."""
    weekly_schedules: List[WeeklySchedule]


class TrainingPlan(BaseModel):
    """Schema for training plans (1-week schedule duplicated to 4 weeks)."""

    id: Optional[int] = Field(default=None, description="Database ID")
    user_profile_id: int = Field(..., description="ID of the user profile")
    title: str = Field(
        ..., 
        description="Descriptive phase title (e.g., 'Foundation Building', 'Base Endurance Development')"
    )
    summary: str = Field(
        ..., 
        description="Summary of this training phase's purpose"
    )
    weekly_schedules: List[WeeklySchedule] = Field(
        ..., description="Weekly schedules (exactly 1 week with week_number: 1 for initial generation)"
    )
    justification: str = Field(
        ...,
        description="AI justification: phase name, what this training accomplishes, how next phase will adapt based on progress",
    )
    ai_message: Optional[str] = Field(
        default=None, 
        description="AI message explaining the plan or recent changes"
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


class TrainingPlanResponse(BaseModel):
    """Response schema for training plan operations."""

    success: bool = Field(..., description="Whether the operation was successful")
    training_plan: Optional[TrainingPlan] = Field(
        default=None, description="The training plan data"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if unsuccessful"
    )
    message: Optional[str] = Field(default=None, description="Success message")


class ModalityDecision(BaseModel):
    """Lightweight decision on modalities to include in the training plan."""

    include_bodyweight_strength: bool = Field(
        ...,
        description="Whether to include bodyweight-only strength sessions (minimal or no equipment).",
    )
    include_equipment_strength: bool = Field(
        ...,
        description="Whether to include loaded/equipment-based strength sessions (barbells, dumbbells, machines).",
    )
    include_endurance: bool = Field(
        ...,
        description="Whether the training plan should include endurance sessions.",
    )
    rationale: str = Field(
        ...,
        description="Brief explanation tying the modalities to the user's goal, limiter, and confirmed equipment access.",
    )




class WeeklyScheduleResponse(BaseModel):
    """
    Response schema for WeeklySchedule generation with AI message.
    
    Used when AI generates a WeeklySchedule and includes an ai_message.
    The ai_message is extracted and handled separately - it's never persisted to the database.
    """
    id: Optional[int] = Field(default=None, description="Database ID")
    training_plan_id: int = Field(..., description="ID of the training plan")
    week_number: int = Field(..., description="Week number in the plan")
    daily_trainings: List[DailyTraining] = Field(
        ..., description="Daily training sessions (exactly 7 days for full weeks)"
    )
    focus_theme: Optional[str] = Field(
        default=None,
        description="Headline for the week (e.g., 'Hypertrophy Volume Build')",
    )
    primary_goal: Optional[str] = Field(
        default=None,
        description="One sentence describing the primary adaptation target for this week",
    )
    progression_lever: Optional[str] = Field(
        default=None,
        description="How this week progresses the training (volume, intensity, skill, density, etc.)",
    )
    justification: str = Field(
        ...,
        description="AI justification: this week's purpose and how it progresses toward the goal",
    )
    ai_message: str = Field(
        ..., 
        description="AI message explaining the changes made to the week (required, but never persisted)"
    )
    created_at: Optional[datetime] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Last update timestamp"
    )


