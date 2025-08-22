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

# Mock exercise data
MOCK_EXERCISES = {
    "barbell_squat": {
        "name": "Barbell Squat",
        "description": "Compound lower body exercise targeting quads, glutes, and core",
        "video_url": None
    },
    "bench_press": {
        "name": "Bench Press", 
        "description": "Compound upper body exercise targeting chest, shoulders, and triceps",
        "video_url": None
    },
    "deadlift": {
        "name": "Deadlift",
        "description": "Compound posterior chain exercise targeting hamstrings, glutes, and lower back", 
        "video_url": None
    },
    "bent_over_row": {
        "name": "Bent Over Row",
        "description": "Compound back exercise targeting lats, rhomboids, and biceps",
        "video_url": None
    },
    "overhead_press": {
        "name": "Overhead Press",
        "description": "Compound shoulder exercise targeting deltoids and triceps",
        "video_url": None
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
    
    # Create mock exercises
    exercises = []
    for i, (key, exercise_data) in enumerate(MOCK_EXERCISES.items(), 1):
        exercises.append(ExerciseSchema(
            id=i,
            name=exercise_data["name"],
            description=exercise_data["description"],
            video_url=exercise_data["video_url"]
        ))
    
    # Create mock daily workouts
    daily_workouts = [
        DailyWorkoutSchema(
            id=1,
            day_of_week="Monday",
            is_rest_day=False,
            is_completed=False,
            week_number=1,
            workout_exercises=[
                {
                    "id": 1,
                    "exercise": exercises[0],  # Barbell Squat
                    "sets": 4,
                    "reps": "8-10",
                    "is_completed": False,
                    "progress_id": None
                },
                {
                    "id": 2,
                    "exercise": exercises[1],  # Bench Press
                    "sets": 3,
                    "reps": "8-12", 
                    "is_completed": False,
                    "progress_id": None
                },
                {
                    "id": 3,
                    "exercise": exercises[3],  # Bent Over Row
                    "sets": 3,
                    "reps": "10-12",
                    "is_completed": False,
                    "progress_id": None
                }
            ]
        ),
        DailyWorkoutSchema(
            id=2,
            day_of_week="Tuesday",
            is_rest_day=True,
            is_completed=False,
            week_number=1,
            workout_exercises=[]
        ),
        DailyWorkoutSchema(
            id=3,
            day_of_week="Wednesday",
            is_rest_day=False,
            is_completed=False,
            week_number=1,
            workout_exercises=[
                {
                    "id": 4,
                    "exercise": exercises[2],  # Deadlift
                    "sets": 4,
                    "reps": "6-8",
                    "is_completed": False,
                    "progress_id": None
                },
                {
                    "id": 5,
                    "exercise": exercises[4],  # Overhead Press
                    "sets": 3,
                    "reps": "8-10",
                    "is_completed": False,
                    "progress_id": None
                }
            ]
        ),
        DailyWorkoutSchema(
            id=4,
            day_of_week="Thursday",
            is_rest_day=True,
            is_completed=False,
            week_number=1,
            workout_exercises=[]
        ),
        DailyWorkoutSchema(
            id=5,
            day_of_week="Friday",
            is_rest_day=False,
            is_completed=False,
            week_number=1,
            workout_exercises=[
                {
                    "id": 6,
                    "exercise": exercises[0],  # Barbell Squat
                    "sets": 3,
                    "reps": "10-12",
                    "is_completed": False,
                    "progress_id": None
                },
                {
                    "id": 7,
                    "exercise": exercises[1],  # Bench Press
                    "sets": 4,
                    "reps": "6-8",
                    "is_completed": False,
                    "progress_id": None
                }
            ]
        ),
        DailyWorkoutSchema(
            id=6,
            day_of_week="Saturday",
            is_rest_day=True,
            is_completed=False,
            week_number=1,
            workout_exercises=[]
        ),
        DailyWorkoutSchema(
            id=7,
            day_of_week="Sunday",
            is_rest_day=True,
            is_completed=False,
            week_number=1,
            workout_exercises=[]
        )
    ]
    
    # Create weekly schedule
    weekly_schedule = WeeklyScheduleSchema(
        id=1,
        week_number=1,
        daily_workouts=daily_workouts
    )
    
    # Create the workout plan
    workout_plan = WorkoutPlanSchema(
        id=1,
        name="Strength Builder Pro",
        description="A comprehensive 3-day strength training program designed for intermediate lifters focusing on compound movements and progressive overload",
        total_weeks=4,
        created_at="2025-01-27T10:00:00Z",
        updated_at="2025-01-27T10:00:00Z",
        weekly_schedules=[weekly_schedule]
    )
    
    return workout_plan

def get_mock_data_summary() -> Dict[str, Any]:
    """Get a summary of available mock data."""
    return {
        "user_profile": "Mock user profile for testing",
        "workout_plan": "Complete 3-day strength training program",
        "exercises": f"{len(MOCK_EXERCISES)} compound exercises",
        "usage": "Set DEBUG=true in .env to use mock data"
    }
