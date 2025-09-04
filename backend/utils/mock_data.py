"""
Mock data utilities for EvolveAI debug mode.

This module provides mock workout plans and user profiles for development
and testing when DEBUG=true in your environment.
"""

from typing import Dict, Any
from core.fitness.helpers.schemas import WorkoutPlanSchema, UserProfileSchema, ExerciseSchema, DailyWorkoutSchema, WeeklyScheduleSchema

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
        "exercise_id": 2355,
        "description": "Compound lower body exercise targeting quads, glutes, and core"
    },
    "bench_press": {
        "exercise_id": 2346, 
        "description": "Compound upper body exercise targeting chest, shoulders, and triceps"
    },
    "deadlift": {
        "exercise_id": 2444,
        "description": "Compound posterior chain exercise targeting hamstrings, glutes, and lower back"
    },
    "bent_over_row": {
        "exercise_id": 2747,
        "description": "Compound back exercise targeting lats, rhomboids, and biceps"
    },
    "overhead_press": {
        "exercise_id": 2345,
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
