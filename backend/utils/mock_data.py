"""
Mock data utilities for EvolveAI debug mode.

This module provides mock workout plans and user profiles for development
and testing when DEBUG=true in your environment.
"""

from typing import Dict, Any
from core.workout.schemas import WorkoutPlanSchema, UserProfileSchema, ExerciseSchema, DailyWorkoutSchema, WeeklyScheduleSchema

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
        "exercise_id": 1302,
        "description": "Compound lower body exercise targeting quads, glutes, and core"
    },
    "bench_press": {
        "exercise_id": 1286, 
        "description": "Compound upper body exercise targeting chest, shoulders, and triceps"
    },
    "deadlift": {
        "exercise_id": 1291,
        "description": "Compound posterior chain exercise targeting hamstrings, glutes, and lower back"
    },
    "bent_over_row": {
        "exercise_id": 1295,
        "description": "Compound back exercise targeting lats, rhomboids, and biceps"
    },
    "overhead_press": {
        "exercise_id": 1275,
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
                description=exercise_data["description"]
            ))
        elif key == "bench_press":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[8, 12, 10],
                description=exercise_data["description"]
            ))
        elif key == "deadlift":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=4,
                reps=[6, 8, 6, 8],
                description=exercise_data["description"]
            ))
        elif key == "bent_over_row":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[10, 12, 11],
                description=exercise_data["description"]
            ))
        elif key == "overhead_press":
            exercises.append(ExerciseSchema(
                exercise_id=exercise_data["exercise_id"],
                sets=3,
                reps=[8, 10, 9],
                description=exercise_data["description"]
            ))
    
    # Create mock daily workouts using the new schema structure
    daily_workouts = [
        DailyWorkoutSchema(
            day_of_week="Monday",
            is_rest_day=False,
            exercises=[exercises[0], exercises[1], exercises[3]]  # Squat, Bench, Row
        ),
        DailyWorkoutSchema(
            day_of_week="Tuesday",
            is_rest_day=True,
            exercises=[]
        ),
        DailyWorkoutSchema(
            day_of_week="Wednesday",
            is_rest_day=False,
            exercises=[exercises[2], exercises[4]]  # Deadlift, Overhead Press
        ),
        DailyWorkoutSchema(
            day_of_week="Thursday",
            is_rest_day=True,
            exercises=[]
        ),
        DailyWorkoutSchema(
            day_of_week="Friday",
            is_rest_day=False,
            exercises=[exercises[0], exercises[1]]  # Squat, Bench
        ),
        DailyWorkoutSchema(
            day_of_week="Saturday",
            is_rest_day=True,
            exercises=[]
        ),
        DailyWorkoutSchema(
            day_of_week="Sunday",
            is_rest_day=True,
            exercises=[]
        )
    ]
    
    # Create weekly schedule
    weekly_schedule = WeeklyScheduleSchema(
        week_number=1,
        daily_workouts=daily_workouts
    )
    
    # Create the workout plan using the new schema structure
    workout_plan = WorkoutPlanSchema(
        title="Strength Builder Pro",
        summary="A comprehensive 3-day strength training program designed for intermediate lifters focusing on compound movements and progressive overload",
        weekly_schedules=[weekly_schedule]
    )
    
    return workout_plan

def get_mock_data_summary() -> Dict[str, Any]:
    """Get a summary of available mock data."""
    return {
        "user_profile": "Mock user profile for testing",
        "workout_plan": "Complete 3-day strength training program",
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
        "usage": "Set DEBUG=true in .env to use mock data"
    }
