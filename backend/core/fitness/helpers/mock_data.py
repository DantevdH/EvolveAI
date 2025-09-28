"""
Mock data utilities for EvolveAI debug mode.

This module provides mock workout plans and user profiles for development
and testing when DEBUG=true in your environment.
"""

from typing import Dict, Any, List
from core.fitness.helpers.schemas import WorkoutPlanSchema, UserProfileSchema, ExerciseSchema, DailyWorkoutSchema, WeeklyScheduleSchema
from core.fitness.helpers.ai_question_schemas import (
    AIQuestionResponse,
    AIQuestion,
    QuestionOption,
    QuestionType,
    QuestionCategory
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
MOCK_EXERCISES = {
    "barbell_squat": {
        "exercise_id": 1,
        "description": "Compound lower body exercise targeting quads, glutes, and core"
    },
    "bench_press": {
        "exercise_id": 2, 
        "description": "Compound upper body exercise targeting chest, shoulders, and triceps"
    },
    "deadlift": {
        "exercise_id": 3,
        "description": "Compound posterior chain exercise targeting hamstrings, glutes, and lower back"
    },
    "bent_over_row": {
        "exercise_id": 4,
        "description": "Compound back exercise targeting lats, rhomboids, and biceps"
    },
    "overhead_press": {
        "exercise_id": 5,
        "description": "Compound shoulder exercise targeting deltoids and triceps"
    }
}

def create_mock_user_profile() -> UserProfileSchema:
    """Create a mock user profile for testing."""
    return UserProfileSchema(**MOCK_USER_PROFILE_DATA)

def create_mock_workout_plan(user_request: Any = None) -> WorkoutPlanSchema:
    """
    Create a mock workout plan for debug mode.
    
    Args:
        user_request: User request data (can be used to customize the plan)
        
    Returns:
        Mock WorkoutPlanSchema instance
    """
    
    # Create mock exercises using the new schema structure
    exercises = []
    for key, exercise_data in MOCK_EXERCISES.items():
        # Create different exercise configurations for variety
        if key == "barbell_squat":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=4,
                reps=[8, 10, 8, 10],
                description=exercise_data["description"],
                weight_1rm=[75, 75, 75, 75]
            ))
        elif key == "bench_press":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[8, 12, 10],
                description=exercise_data["description"],
                weight_1rm=[70, 65, 68]
            ))
        elif key == "deadlift":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=4,
                reps=[6, 8, 6, 8],
                description=exercise_data["description"],
                weight_1rm=[80, 75, 80, 75]
            ))
        elif key == "bent_over_row":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[10, 12, 11],
                description=exercise_data["description"],
                weight_1rm=[70, 65, 68]
            ))
        elif key == "overhead_press":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[8, 10, 9],
                description=exercise_data["description"],
                weight_1rm=[65, 60, 63]
            ))
    
    # Create mock daily workouts using the new schema structure
    daily_workouts = [
        DailyWorkoutSchema(
            day_of_week="Monday",
            warming_up_instructions="5-10 minutes dynamic warm-up focusing on mobility and activation",
            is_rest_day=False,
            exercises=[exercises[0], exercises[1], exercises[3]],  # Squat, Bench, Row
            daily_justification="Full body strength training day focusing on major compound movements. Squat targets lower body strength, bench press develops upper body pushing power, and bent-over rows balance the push/pull ratio while strengthening the posterior chain.",
            cooling_down_instructions="5-10 minutes static stretching and light cardio cool-down"
        ),
        DailyWorkoutSchema(
            day_of_week="Tuesday",
            warming_up_instructions="Light mobility work and gentle stretching",
            is_rest_day=True,
            exercises=[],
            daily_justification="Active recovery day to allow muscle repair and adaptation from Monday's training session. Light movement and stretching promote blood flow and recovery.",
            cooling_down_instructions="Gentle stretching and relaxation"
        ),
        DailyWorkoutSchema(
            day_of_week="Wednesday",
            warming_up_instructions="5-10 minutes dynamic warm-up with focus on posterior chain activation",
            is_rest_day=False,
            exercises=[exercises[2], exercises[4]],  # Deadlift, Overhead Press
            daily_justification="Posterior chain and shoulder focus day. Deadlifts target the entire posterior chain for maximum strength development, while overhead press builds shoulder stability and core strength.",
            cooling_down_instructions="5-10 minutes static stretching focusing on hamstrings and shoulders"
        ),
        DailyWorkoutSchema(
            day_of_week="Thursday",
            warming_up_instructions="Light mobility work and gentle stretching",
            is_rest_day=True,
            exercises=[],
            daily_justification="Rest day for recovery and adaptation. Body needs time to rebuild stronger after the demanding deadlift session.",
            cooling_down_instructions="Gentle stretching and relaxation"
        ),
        DailyWorkoutSchema(
            day_of_week="Friday",
            warming_up_instructions="5-10 minutes dynamic warm-up focusing on full body activation",
            is_rest_day=False,
            exercises=[exercises[0], exercises[1]],  # Squat, Bench
            daily_justification="Volume day for squat and bench press to reinforce movement patterns and add training volume for strength progression.",
            cooling_down_instructions="5-10 minutes static stretching and light cardio cool-down"
        ),
        DailyWorkoutSchema(
            day_of_week="Saturday",
            warming_up_instructions="Light mobility work and gentle stretching",
            is_rest_day=True,
            exercises=[],
            daily_justification="Weekend rest day to allow full recovery before starting the next training week.",
            cooling_down_instructions="Gentle stretching and relaxation"
        ),
        DailyWorkoutSchema(
            day_of_week="Sunday",
            warming_up_instructions="Light mobility work and gentle stretching",
            is_rest_day=True,
            exercises=[],
            daily_justification="Complete rest day for physical and mental recovery. Preparation for the upcoming training week.",
            cooling_down_instructions="Gentle stretching and relaxation"
        )
    ]
    
    # Create weekly schedule
    weekly_schedule = WeeklyScheduleSchema(
        week_number=1,
        daily_workouts=daily_workouts,
        weekly_justification="Three-day full body strength training split with optimal recovery. Monday and Friday focus on primary compound movements with Friday as a volume day. Wednesday targets posterior chain and shoulders. Rest days are strategically placed to allow proper recovery between intense training sessions."
    )
    
    # Create the workout plan using the new schema structure
    workout_plan = WorkoutPlanSchema(
        title="Strength Builder Pro",
        summary="A comprehensive 3-day strength training program designed for intermediate lifters focusing on compound movements and progressive overload",
        weekly_schedules=[weekly_schedule],
        program_justification="This program follows a linear periodization approach perfect for intermediate strength development. The three-day split allows for adequate recovery while providing sufficient training frequency for each major movement pattern. Progressive overload is achieved through weekly increases in weight while maintaining proper form. The focus on compound movements maximizes time efficiency and functional strength gains. This program serves as an excellent foundation before progressing to more advanced periodization schemes like undulating or block periodization."
    )
    
    return workout_plan

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
            id="favorite_exercise_type",
            text="What type of exercise do you enjoy most?",
            response_type=QuestionType.DROPDOWN,
            options=[
                QuestionOption(id="strength", text="Strength Training", value="strength"),
                QuestionOption(id="cardio", text="Cardio", value="cardio"),
                QuestionOption(id="yoga", text="Yoga", value="yoga"),
                QuestionOption(id="pilates", text="Pilates", value="pilates"),
                QuestionOption(id="swimming", text="Swimming", value="swimming"),
                QuestionOption(id="running", text="Running", value="running"),
                QuestionOption(id="cycling", text="Cycling", value="cycling"),
                QuestionOption(id="dancing", text="Dancing", value="dancing"),
            ],
            required=True,
            category=QuestionCategory.TRAINING_EXPERIENCE,
            help_text="This helps us tailor your workout plan to activities you enjoy."
        ),
        
        # Free Text
        AIQuestion(
            id="specific_goals",
            text="Tell us more about your specific fitness goals. What would you like to achieve?",
            response_type=QuestionType.FREE_TEXT,
            required=True,
            category=QuestionCategory.GOALS_PREFERENCES,
            max_length=500,
            placeholder="Describe your specific goals in detail...",
            help_text="The more specific you are, the better we can customize your plan."
        ),
        
        # Slider (> 5 possible values)
        AIQuestion(
            id="session_duration",
            text="How long do you prefer each workout session to be?",
            response_type=QuestionType.SLIDER,
            required=True,
            category=QuestionCategory.TIME_COMMITMENT,
            min_value=15,
            max_value=120,
            step=5,
            unit="minutes",
            help_text="Select your preferred workout duration in minutes."
        ),
        
        # Additional slider with weight unit
        AIQuestion(
            id="current_weight",
            text="What is your current body weight?",
            response_type=QuestionType.SLIDER,
            required=True,
            category=QuestionCategory.TRAINING_EXPERIENCE,
            min_value=50,
            max_value=150,
            step=1,
            unit="kg",
            help_text="Enter your current weight for personalized recommendations."
        ),
        
        # Conditional Boolean
        AIQuestion(
            id="has_equipment",
            text="Do you have access to gym equipment or prefer home workouts?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            required=True,
            category=QuestionCategory.EQUIPMENT_AVAILABILITY,
            placeholder="Please describe what equipment you have access to or your home workout preferences...",
            max_length=200,
            help_text="This helps us determine the type of exercises to include."
        ),
        
        # Conditional Boolean
        AIQuestion(
            id="has_injuries",
            text="Do you have any current injuries or physical limitations?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            required=True,
            category=QuestionCategory.MEDICAL_HEALTH,
            placeholder="Please describe your injuries or limitations in detail...",
            max_length=300,
            help_text="This information helps us create a safe workout plan tailored to your needs."
        ),
        
        # Rating (≤ 5 scale)
        AIQuestion(
            id="motivation_level",
            text="How motivated are you to stick to a fitness routine?",
            response_type=QuestionType.RATING,
            required=True,
            category=QuestionCategory.MOTIVATION_COMMITMENT,
            min_value=1,
            max_value=5,
            help_text="Rate your motivation level from 1 (low) to 5 (very high)."
        ),
    ]
    
    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=5,
        categories=list(set([q.category for q in questions]))
    )

def create_mock_follow_up_questions() -> AIQuestionResponse:
    """Create mock follow-up questions for debug mode."""
    questions = [
        # Follow-up free text questions
        AIQuestion(
            id="injury_history",
            text="Do you have any previous injuries or physical limitations we should be aware of?",
            response_type=QuestionType.FREE_TEXT,
            required=False,
            category=QuestionCategory.MEDICAL_HEALTH,
            max_length=300,
            placeholder="Please describe any injuries or limitations...",
            help_text="This information helps us create a safe workout plan for you."
        ),
        
        AIQuestion(
            id="lifestyle_factors",
            text="Tell us about your daily lifestyle - work schedule, sleep habits, and stress levels.",
            response_type=QuestionType.FREE_TEXT,
            required=False,
            category=QuestionCategory.LIFESTYLE_RECOVERY,
            max_length=400,
            placeholder="Describe your daily routine and lifestyle...",
            help_text="Understanding your lifestyle helps us optimize your training and recovery."
        ),
        
        # Conditional Boolean follow-up
        AIQuestion(
            id="uses_supplements",
            text="Do you currently use any supplements or have specific dietary requirements?",
            response_type=QuestionType.CONDITIONAL_BOOLEAN,
            required=False,
            category=QuestionCategory.NUTRITION,
            placeholder="Please list the supplements you take and any dietary restrictions...",
            max_length=200,
            help_text="This helps us provide better nutrition guidance alongside your workout plan."
        ),
    ]
    
    return AIQuestionResponse(
        questions=questions,
        total_questions=len(questions),
        estimated_time_minutes=3,
        categories=list(set([q.category for q in questions]))
    )

def get_mock_data_summary() -> Dict[str, Any]:
    """Get a summary of available mock data."""
    return {
        "user_profile": "Mock user profile for testing",
        "workout_plan": "Complete 3-day strength training program",
        "initial_questions": "6 mock questions covering all question types",
        "follow_up_questions": "2 mock follow-up questions",
        "exercises": [
            {
                "name": "Barbell Squat",
                "sets": 4,
                "reps": [8, 10, 8, 10],
                "description": "Compound lower body exercise for building strength and muscle"
            },
            {
                "name": "Bench Press",
                "sets": 3,
                "reps": [8, 12, 10],
                "description": "Compound upper body push exercise for chest development"
            },
            {
                "name": "Deadlift",
                "sets": 4,
                "reps": [6, 8, 6, 8],
                "description": "Posterior chain compound exercise for overall strength"
            }
        ],
        "question_types_covered": [
            "Multiple Choice (≤5 options)",
            "Dropdown (>5 options)", 
            "Free Text",
            "Slider (>5 possible values)",
            "Boolean (Yes/No)",
            "Rating (≤5 scale)"
        ],
        "usage": "Set DEBUG=true in .env to use mock data"
    }
