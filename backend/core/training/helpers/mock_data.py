"""
Mock data utilities for EvolveAI debug mode.

This module provides mock training plans and user profiles for development
and testing when DEBUG=true in your environment.
"""

from typing import Dict, Any, List
from core.training.schemas.user_schemas import UserProfileSchema
from core.training.schemas.training_schemas import (
    TrainingPlan,
    DailyTraining as TrainingDailyTraining,
    StrengthExercise,
    EnduranceSession,
    WeeklySchedule,
    DayOfWeek,
)
from core.training.schemas.question_schemas import (
    AIQuestionResponse,
    AIQuestion,
    QuestionOption,
    QuestionType,
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
        "weight_1rm": [75.0, 75.0, 75.0, 75.0],
    },
    "bench_press": {
        "exercise_id": 2,
        "sets": 3,
        "reps": [8, 12, 10],
        "weight_1rm": [70.0, 65.0, 68.0],
    },
    "deadlift": {
        "exercise_id": 3,
        "sets": 3,
        "reps": [5, 5, 5],
        "weight_1rm": [85.0, 85.0, 85.0],
    },
    "bent_over_row": {
        "exercise_id": 4,
        "sets": 3,
        "reps": [10, 12, 10],
        "weight_1rm": [70.0, 65.0, 70.0],
    },
    "overhead_press": {
        "exercise_id": 5,
        "sets": 3,
        "reps": [8, 10, 8],
        "weight_1rm": [65.0, 60.0, 65.0],
    },
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
            weight_1rm=MOCK_STRENGTH_EXERCISES["bench_press"]["weight_1rm"],
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["bent_over_row"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["bent_over_row"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["bent_over_row"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["bent_over_row"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["bent_over_row"]["weight_1rm"],
        ),
    ]

    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.MONDAY,
            is_rest_day=False,
            training_type="strength",
            strength_exercises=monday_exercises,
            endurance_sessions=[],
            justification="Today we're focusing on upper body strength with bench press and bent-over rows. These compound movements will build the foundation for your strength goals, targeting your chest, back, and arms while engaging your core for stability. Perfect start to your week!",
        )
    )

    # Tuesday - Rest Day
    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.TUESDAY,
            is_rest_day=True,
            training_type="rest",
            strength_exercises=[],
            endurance_sessions=[],
            justification="Rest day! Your muscles need time to recover and grow stronger from yesterday's upper body session. Use this day for light stretching, walking, or complete rest. Recovery is just as important as training for building strength!",
        )
    )

    # Wednesday - Lower Body Strength
    wednesday_exercises = [
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["barbell_squat"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["barbell_squat"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["barbell_squat"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["barbell_squat"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["barbell_squat"]["weight_1rm"],
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["deadlift"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["deadlift"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["deadlift"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["deadlift"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["deadlift"]["weight_1rm"],
        ),
    ]

    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.WEDNESDAY,
            is_rest_day=False,
            training_type="strength",
            strength_exercises=wednesday_exercises,
            endurance_sessions=[],
            justification="Lower body power day! We're hitting squats and deadlifts - the king and queen of strength exercises. These movements will build incredible lower body strength and power while engaging your entire posterior chain. Time to get strong!",
        )
    )

    # Thursday - Rest Day
    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.THURSDAY,
            is_rest_day=True,
            training_type="rest",
            strength_exercises=[],
            endurance_sessions=[],
            justification="Another recovery day to let your lower body muscles repair and grow stronger. Your legs did serious work yesterday! Focus on hydration, good nutrition, and light movement to keep blood flowing.",
        )
    )

    # Friday - Full Body
    friday_exercises = [
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["overhead_press"]["exercise_id"],
            sets=MOCK_STRENGTH_EXERCISES["overhead_press"]["sets"],
            reps=MOCK_STRENGTH_EXERCISES["overhead_press"]["reps"],
            weight=[0.0] * MOCK_STRENGTH_EXERCISES["overhead_press"]["sets"],
            weight_1rm=MOCK_STRENGTH_EXERCISES["overhead_press"]["weight_1rm"],
        ),
        StrengthExercise(
            daily_training_id=0,
            exercise_id=MOCK_STRENGTH_EXERCISES["barbell_squat"]["exercise_id"],
            sets=3,
            reps=[10, 12, 10],
            weight=[0.0, 0.0, 0.0],
            weight_1rm=[70.0, 65.0, 70.0],
        ),
    ]

    # Add endurance session for Friday
    friday_endurance = [
        EnduranceSession(
            name="Cardio Finisher",
            description="A 20-minute run to finish off your full body strength session. This will help you build endurance and improve your overall fitness.",
            sport_type="running",
            training_volume=20.0,
            unit="minutes",
            heart_rate_zone=3,
        )
    ]

    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.FRIDAY,
            is_rest_day=False,
            training_type="mixed",
            strength_exercises=friday_exercises,
            endurance_sessions=friday_endurance,
            justification="Full body power day! We're combining overhead press and squats for total body strength, then finishing with cardio to boost your endurance. This session hits everything and sets you up perfectly for the weekend!",
        )
    )

    # Saturday - Rest Day
    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.SATURDAY,
            is_rest_day=True,
            training_type="rest",
            strength_exercises=[],
            endurance_sessions=[],
            justification="Weekend recovery! You've put in three solid training days this week. Use this time to relax, enjoy some light activities, and let your body fully recover. You've earned this rest!",
        )
    )

    # Sunday - Rest Day
    daily_trainings.append(
        TrainingDailyTraining(
            weekly_schedule_id=0,
            day_of_week=DayOfWeek.SUNDAY,
            is_rest_day=True,
            training_type="rest",
            strength_exercises=[],
            endurance_sessions=[],
            justification="Final rest day of the week! Use this time to prepare mentally and physically for next week's training. Plan your meals, get good sleep, and get ready to come back stronger than ever!",
        )
    )

    # Create weekly schedule
    weekly_schedule = WeeklySchedule(
        training_plan_id=0,  # Will be set when saved to database
        week_number=1,
        daily_trainings=daily_trainings,
        justification="Welcome to Week 1 of your strength journey! This week focuses on building a solid foundation with compound movements. We're alternating between upper and lower body training with strategic rest days to maximize recovery and strength gains. Each workout is designed to progressively challenge you while maintaining proper form and technique.",
    )

    # Create the training plan using the new schema structure
    training_plan = TrainingPlan(
        user_profile_id=1,  # Mock user profile ID
        title="Strength Builder Pro",
        summary="A comprehensive 3-day strength training program designed for intermediate lifters focusing on compound movements and progressive overload",
        weekly_schedules=[weekly_schedule],
        justification="This program is specifically designed for your strength goals and intermediate experience level. We're using proven compound movements like squats, deadlifts, bench press, and overhead press to build maximum strength and muscle mass. The 3-day split with strategic rest days ensures optimal recovery while progressive overload will continuously challenge your muscles. Each exercise is chosen for its effectiveness in building raw power and strength. You're ready to get stronger than ever!",
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
            help_text="This helps us understand your current training schedule.",
        ),
        # Dropdown (> 5 options)
        AIQuestion(
            id="equipment_access",
            text="What equipment do you have access to?",
            response_type=QuestionType.DROPDOWN,
            options=[
                QuestionOption(id="1", text="Full commercial gym", value="full_gym"),
                QuestionOption(
                    id="2", text="Home gym with weights", value="home_gym_weights"
                ),
                QuestionOption(id="3", text="Basic home equipment", value="home_basic"),
                QuestionOption(id="4", text="Bodyweight only", value="bodyweight"),
                QuestionOption(id="5", text="Resistance bands", value="bands"),
                QuestionOption(id="6", text="Limited equipment", value="limited"),
            ],
            required=True,
            help_text="Select the option that best describes your available equipment.",
        ),
        # Rating (≤ 5 scale)
        AIQuestion(
            id="experience_rating",
            text="How would you rate your current training experience?",
            response_type=QuestionType.RATING,
            min_value=1,
            max_value=5,
            required=True,
            help_text="1 = Complete Beginner, 5 = Very Experienced",
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
            help_text="Move the slider to select your available time per training session.",
        ),
        # Text Input
        AIQuestion(
            id="specific_goals",
            text="What are your specific training goals?",
            response_type=QuestionType.FREE_TEXT,
            placeholder="E.g., lose 10kg, run a marathon, build muscle...",
            max_length=500,
            required=True,
            help_text="Be as specific as possible to help us create the perfect plan.",
        ),
        # Conditional Boolean
        AIQuestion(
            id="has_injuries",
            text="Do you have any injuries or physical limitations?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            placeholder="Please describe your injuries or limitations in detail...",
            max_length=300,
            required=True,
            help_text="This information is crucial for creating a safe training plan tailored to your needs.",
        ),
    ]

    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=5,
        ai_message="👋 Hey there! I'm excited to help you build a personalized training plan. Let me ask you a few quick questions to understand your goals, experience, and what you have available. This will only take about 5 minutes!",
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
        ),
        AIQuestion(
            id="recovery_importance",
            text="How important is recovery to you?",
            response_type=QuestionType.RATING,
            min_value=1,
            max_value=5,
            required=True,
            help_text="1 = Not important, 5 = Very important",
        ),
        AIQuestion(
            id="nutrition_tracking",
            text="Are you willing to track your nutrition?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            placeholder="Tell us about your current nutrition habits...",
            max_length=200,
            required=True,
        ),
    ]

    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=3,
        ai_message="💪 Great! Based on your answers, I have a few more specific questions to fine-tune your plan. These will help me create the most effective training program for you!",
    )


# DEPRECATED: TrainingPlanOutline schema no longer exists - this function is not used
# def create_mock_training_plan_outline() -> TrainingPlanOutline:
#     """Create a mock training plan outline for debug mode."""
#     # This function is no longer used as TrainingPlanOutline was removed
#     pass
