"""
Mock data utilities for EvolveAI debug mode.

This module provides mock training plans and user profiles for development
and testing when DEBUG=true in your environment.
"""

from typing import Dict, Any, List
from core.training.helpers.schemas import UserProfileSchema
from core.training.helpers.training_schemas import TrainingPlan, DailyTraining, StrengthExercise, EnduranceSession, WeeklySchedule, DayOfWeek
from core.training.helpers.ai_question_schemas import (
    AIQuestionResponse,
    AIQuestion,
    QuestionOption,
    QuestionType,
    QuestionCategory,
    TrainingPlanOutline,
    TrainingPeriod
)

# Mock user profile data
MOCK_USER_PROFILE_DATA = {
    "primary_goal": "Increase Strength",
    "primary_goal_description": "Focus on increasing raw power and lifting heavier.",
    "experience_level": "Intermediate",
    "days_per_week": 3,
    "minutes_per_session": 60,
    "equipment": "Full Gym",
    "age": 32,
    "weight": 85.5,
    "weight_unit": "kg",
    "height": 182,
    "height_unit": "cm",
    "gender": "Male",
    "has_limitations": False,
    "limitations_description": "",
    "final_chat_notes": "User is motivated and ready to start. Wants to focus on compound lifts.",
}

# Mock exercise data with proper schema fields
MOCK_STRENGTH_EXERCISES = {
    "barbell_squat": {
        "exercise_id": 1,
        "sets": 4,
        "reps": [8, 10, 8, 10],
        "weight_1rm": [75.0, 75.0, 75.0, 75.0]
    },
    "bench_press": {
        "exercise_id": 2, 
        "sets": 3,
        "reps": [8, 12, 10],
        "weight_1rm": [70.0, 65.0, 68.0]
    },
    "deadlift": {
        "exercise_id": 3,
        "sets": 3,
        "reps": [5, 5, 5],
        "weight_1rm": [85.0, 85.0, 85.0]
    },
    "bent_over_row": {
        "exercise_id": 4,
        "sets": 3,
        "reps": [10, 12, 10],
        "weight_1rm": [70.0, 65.0, 70.0]
    },
    "overhead_press": {
        "exercise_id": 5,
        "sets": 3,
        "reps": [8, 10, 8],
        "weight_1rm": [65.0, 60.0, 65.0]
    }
}

def create_mock_user_profile() -> UserProfileSchema:
    """Create a mock user profile for testing."""
    return UserProfileSchema(**MOCK_USER_PROFILE_DATA)

def create_mock_training_plan(user_request: Any = None) -> TrainingPlan:
    """
    Create a mock training plan for debug mode.
    
    Args:
        user_request: User request data (can be used to customize the plan)
        
    Returns:
        Mock TrainingPlan instance
    """
    
    # Create daily trainings for the week
    daily_trainings = []
    
    # Monday - Upper Body Strength
    monday_exercises = [
        StrengthExercise(
            daily_training_id=0,  # Will be set when saved to database
            exercise_id=MOCK_STRENGTH_EXERCISES["bench_press"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["bench_press"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["bench_press"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["bench_press"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["bench_press"]["weight_1rm"]
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["bent_over_row"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["bent_over_row"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["bent_over_row"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["bent_over_row"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["bent_over_row"]["weight_1rm"]
        )
    ]
    
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.MONDAY,
            is_rest_day=False,
        training_type="strength",
        strength_exercises=monday_exercises,
        endurance_sessions=[]
    ))
    
    # Tuesday - Rest Day
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.TUESDAY,
            is_rest_day=True,
        training_type="recovery",
        strength_exercises=[],
        endurance_sessions=[]
    ))
    
    # Wednesday - Lower Body Strength
    wednesday_exercises = [
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["barbell_squat"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["barbell_squat"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["barbell_squat"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["barbell_squat"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["barbell_squat"]["weight_1rm"]
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["deadlift"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["deadlift"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["deadlift"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["deadlift"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["deadlift"]["weight_1rm"]
        )
    ]
    
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.WEDNESDAY,
            is_rest_day=False,
        training_type="strength",
        strength_exercises=wednesday_exercises,
        endurance_sessions=[]
    ))
    
    # Thursday - Rest Day
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.THURSDAY,
            is_rest_day=True,
        training_type="recovery",
        strength_exercises=[],
        endurance_sessions=[]
    ))
    
    # Friday - Full Body
    friday_exercises = [
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["overhead_press"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["overhead_press"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["overhead_press"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["overhead_press"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["overhead_press"]["weight_1rm"]
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["barbell_squat"]["exercise_id"],
            sets=3,
            reps=[10, 12, 10],
            weight=[0.0, 0.0, 0.0],
            weight_1rm=[70.0, 65.0, 70.0]
        )
    ]
    
    # Add endurance session for Friday
    friday_endurance = [
        EnduranceSession(
            daily_training_id=0,
            sport_type="running",
            training_volume=20.0,
            unit="minutes",
            heart_rate_zone=3
        )
    ]
    
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.FRIDAY,
        is_rest_day=False,
        training_type="mixed",
        strength_exercises=friday_exercises,
        endurance_sessions=friday_endurance
    ))
    
    # Saturday - Rest Day
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.SATURDAY,
        is_rest_day=True,
        training_type="recovery",
        strength_exercises=[],
        endurance_sessions=[]
    ))
    
    # Sunday - Rest Day
    daily_trainings.append(DailyTraining(
        weekly_schedule_id=0,
        day_of_week=DayOfWeek.SUNDAY,
        is_rest_day=True,
        training_type="recovery",
        strength_exercises=[],
        endurance_sessions=[]
    ))
    
    # Create weekly schedule
    weekly_schedule = WeeklySchedule(
        training_plan_id=0,  # Will be set when saved to database
        week_number=1,
        daily_trainings=daily_trainings
    )
    
    # Create the training plan using the new schema structure
    training_plan = TrainingPlan(
        user_profile_id=1,  # Mock user profile ID
        title="Strength Builder Pro",
        summary="A comprehensive 3-day strength training program designed for intermediate lifters focusing on compound movements and progressive overload",
        weekly_schedules=[weekly_schedule]
    )
    
    return training_plan

def create_mock_initial_questions() -> AIQuestionResponse:
    """Create mock initial questions for debug mode."""
    questions = [
        # Multiple Choice (≤ 5 options)
        AIQuestion(
            id="training_frequency",
            text="How many days per week do you currently train?",
            response_type=QuestionType.MULTIPLE_CHOICE,
            options=[
                QuestionOption(id="1", text="1-2 days", value="1-2"),
                QuestionOption(id="2", text="3-4 days", value="3-4"),
                QuestionOption(id="3", text="5-6 days", value="5-6"),
                QuestionOption(id="4", text="Daily", value="daily"),
            ],
            required=True,
            category=QuestionCategory.TIME_COMMITMENT,
            help_text="This helps us understand your current training schedule."
        ),
        
        # Dropdown (> 5 options)
        AIQuestion(
            id="equipment_access",
            text="What equipment do you have access to?",
            response_type=QuestionType.DROPDOWN,
            options=[
                QuestionOption(id="1", text="Full commercial gym", value="full_gym"),
                QuestionOption(id="2", text="Home gym with weights", value="home_gym_weights"),
                QuestionOption(id="3", text="Basic home equipment", value="home_basic"),
                QuestionOption(id="4", text="Bodyweight only", value="bodyweight"),
                QuestionOption(id="5", text="Resistance bands", value="bands"),
                QuestionOption(id="6", text="Limited equipment", value="limited"),
            ],
            required=True,
            category=QuestionCategory.EQUIPMENT,
            help_text="Select the option that best describes your available equipment."
        ),
        
        # Rating (≤ 5 scale)
        AIQuestion(
            id="experience_rating",
            text="How would you rate your current training experience?",
            response_type=QuestionType.RATING,
            min_value=1,
            max_value=5,
            required=True,
            category=QuestionCategory.EXPERIENCE,
            help_text="1 = Complete Beginner, 5 = Very Experienced"
        ),
        
        # Slider (> 5 scale with unit)
        AIQuestion(
            id="session_duration",
            text="How many minutes per session can you commit?",
            response_type=QuestionType.SLIDER,
            min_value=15,
            max_value=120,
            step=15,
            unit="minutes",
            required=True,
            category=QuestionCategory.TIME_COMMITMENT,
            help_text="Move the slider to select your available time per training session."
        ),
        
        # Text Input
        AIQuestion(
            id="specific_goals",
            text="What are your specific training goals?",
            response_type=QuestionType.TEXT_INPUT,
            placeholder="E.g., lose 10kg, run a marathon, build muscle...",
            max_length=500,
            required=True,
            category=QuestionCategory.GOALS_PREFERENCES,
            help_text="Be as specific as possible to help us create the perfect plan."
        ),
        
        # Conditional Boolean
        AIQuestion(
            id="has_injuries",
            text="Do you have any injuries or physical limitations?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            placeholder="Please describe your injuries or limitations in detail...",
            max_length=300,
            required=True,
            category=QuestionCategory.HEALTH_SAFETY,
            help_text="This information is crucial for creating a safe training plan tailored to your needs."
        ),
    ]
    
    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=5,
        categories=[
            QuestionCategory.TIME_COMMITMENT,
            QuestionCategory.EQUIPMENT,
            QuestionCategory.EXPERIENCE,
            QuestionCategory.GOALS_PREFERENCES,
            QuestionCategory.HEALTH_SAFETY
        ],
        ai_message="👋 Hey there! I'm excited to help you build a personalized training plan. Let me ask you a few quick questions to understand your goals, experience, and what you have available. This will only take about 5 minutes!"
    )

def create_mock_follow_up_questions() -> AIQuestionResponse:
    """Create mock follow-up questions for debug mode."""
    questions = [
        AIQuestion(
            id="training_preference",
            text="What type of training do you prefer?",
            response_type=QuestionType.MULTIPLE_CHOICE,
            options=[
                QuestionOption(id="1", text="Strength training", value="strength"),
                QuestionOption(id="2", text="Cardio/Endurance", value="cardio"),
                QuestionOption(id="3", text="Mixed approach", value="mixed"),
                QuestionOption(id="4", text="Sport-specific", value="sport"),
            ],
            required=True,
            category=QuestionCategory.GOALS_PREFERENCES
        ),
        
        AIQuestion(
            id="recovery_importance",
            text="How important is recovery to you?",
            response_type=QuestionType.RATING,
            min_value=1,
            max_value=5,
            required=True,
            category=QuestionCategory.HEALTH_SAFETY,
            help_text="1 = Not important, 5 = Very important"
        ),
        
        AIQuestion(
            id="nutrition_tracking",
            text="Are you willing to track your nutrition?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            placeholder="Tell us about your current nutrition habits...",
            max_length=200,
            required=True,
            category=QuestionCategory.NUTRITION
        ),
    ]
    
    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=3,
        categories=[
            QuestionCategory.GOALS_PREFERENCES,
            QuestionCategory.HEALTH_SAFETY,
            QuestionCategory.NUTRITION
        ],
        ai_message="💪 Great! Based on your answers, I have a few more specific questions to fine-tune your plan. These will help me create the most effective training program for you!"
    )

def create_mock_training_plan_outline() -> TrainingPlanOutline:
    """Create a mock training plan outline for debug mode."""
    
    periods = [
        TrainingPeriod(
            week_range="Weeks 1-4",
            focus="Foundation Building",
            description="Build a solid foundation with fundamental movement patterns and proper form",
            training_days=3,
            key_exercises=["Squats", "Bench Press", "Deadlifts", "Rows"],
            intensity_level="Moderate"
        ),
        TrainingPeriod(
            week_range="Weeks 5-8",
            focus="Progressive Overload",
            description="Gradually increase weights and volume to stimulate muscle growth and strength gains",
            training_days=4,
            key_exercises=["Squats", "Bench Press", "Deadlifts", "Overhead Press", "Pull-ups"],
            intensity_level="High"
        ),
    ]
    
    daily_schedule = [
        DailyTraining(
            day="Monday",
            focus="Upper Body Push",
            estimated_duration=60
        ),
        DailyTraining(
            day="Tuesday",
            focus="Rest & Recovery",
            estimated_duration=0
        ),
        DailyTraining(
            day="Wednesday",
            focus="Lower Body",
            estimated_duration=60
        ),
        DailyTraining(
            day="Thursday",
            focus="Rest & Recovery",
            estimated_duration=0
        ),
        DailyTraining(
            day="Friday",
            focus="Upper Body Pull",
            estimated_duration=60
        ),
        DailyTraining(
            day="Saturday",
            focus="Rest & Recovery",
            estimated_duration=0
        ),
        DailyTraining(
            day="Sunday",
            focus="Rest & Recovery",
            estimated_duration=0
        ),
    ]
    
    return TrainingPlanOutline(
        plan_title="Intermediate Strength Builder",
        plan_summary="A structured 8-week program designed to build foundational strength and muscle mass",
        total_weeks=8,
        training_days_per_week=3,
        training_periods=periods,
        typical_weekly_schedule=daily_schedule,
        equipment_needed=["Barbell", "Dumbbells", "Bench", "Squat Rack"],
        key_principles=[
            "Progressive overload through gradual weight increases",
            "Focus on compound movements for maximum efficiency",
            "Adequate recovery between training sessions",
            "Form-focused approach to prevent injuries"
        ],
        expected_outcomes=[
            "Significant strength gains in major lifts",
            "Improved muscle mass and definition",
            "Better movement patterns and body awareness",
            "Increased confidence in the gym"
        ],
        ai_message="🎯 Here's your personalized training plan outline! I've designed this program specifically for your goals and experience level. It focuses on progressive strength development with a balanced approach to training and recovery. Ready to get started?"
    )
