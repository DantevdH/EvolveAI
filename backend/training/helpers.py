from .schemas import WorkoutPlanSchema, UserProfileSchema
from pydantic import BaseModel
from typing import List, Optional

# Pydantic models for API requests
class GenerateWorkoutRequest(BaseModel):
    """Request model for generating a workout plan."""
    primaryGoal: str
    primaryGoalDescription: str
    experienceLevel: str
    daysPerWeek: int
    minutesPerSession: int
    equipment: str
    age: int
    weight: float
    weightUnit: str
    height: float
    heightUnit: str
    gender: str
    hasLimitations: bool
    limitationsDescription: Optional[str] = None
    trainingSchedule: str
    finalChatNotes: Optional[str] = None

class GenerateWorkoutResponse(BaseModel):
    """Response model for workout plan generation."""
    status: str
    message: str
    workout_plan: WorkoutPlanSchema


def create_mock_workout_plan(request: GenerateWorkoutRequest) -> WorkoutPlanSchema:
    """Create a mock workout plan for development."""
    
    # Base exercises that work for most goals
    base_exercises = [
        {"name": "Push-ups", "sets": 3, "reps": "10-15"},
        {"name": "Squats", "sets": 3, "reps": "15-20"},
        {"name": "Plank", "sets": 3, "reps": "30 seconds"},
        {"name": "Lunges", "sets": 3, "reps": "10 each leg"},
        {"name": "Mountain Climbers", "sets": 3, "reps": "20"},
    ]
    
    # Goal-specific exercises
    goal_exercises = {
        "Improve Endurance": [
            {"name": "Jumping Jacks", "sets": 3, "reps": "30 seconds"},
            {"name": "Burpees", "sets": 3, "reps": "10"},
            {"name": "High Knees", "sets": 3, "reps": "30 seconds"},
        ],
        "Bodybuilding": [
            {"name": "Dumbbell Curls", "sets": 4, "reps": "12-15"},
            {"name": "Dumbbell Press", "sets": 4, "reps": "10-12"},
            {"name": "Dumbbell Rows", "sets": 4, "reps": "12-15"},
        ],
        "Increase Strength": [
            {"name": "Deadlifts", "sets": 4, "reps": "8-10"},
            {"name": "Bench Press", "sets": 4, "reps": "8-10"},
            {"name": "Overhead Press", "sets": 4, "reps": "8-10"},
        ],
        "Weight Loss": [
            {"name": "Burpees", "sets": 4, "reps": "15"},
            {"name": "Mountain Climbers", "sets": 4, "reps": "30 seconds"},
            {"name": "Jump Squats", "sets": 4, "reps": "15"},
        ]
    }
    
    # Get exercises for the user's goal
    exercises = base_exercises + goal_exercises.get(request.primaryGoal, [])
    
    # Create 4 weeks of workouts
    weekly_schedules = []
    for week_num in range(1, 5):
        daily_workouts = []
        
        for day_num, day_name in enumerate(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]):
            # Determine if it's a training day based on user's days per week
            is_training_day = day_num < request.daysPerWeek
            
            if is_training_day:
                # Select exercises for this day (rotate through the list)
                day_exercises = exercises[day_num * 3:(day_num + 1) * 3]
                if not day_exercises:
                    day_exercises = exercises[:3]  # Fallback
                
                daily_workout = {
                    "day_of_week": day_name,
                    "is_rest_day": False,
                    "exercises": day_exercises
                }
            else:
                daily_workout = {
                    "day_of_week": day_name,
                    "is_rest_day": True,
                    "exercises": []
                }
            
            daily_workouts.append(daily_workout)
        
        weekly_schedule = {
            "week_number": week_num,
            "daily_workouts": daily_workouts
        }
        weekly_schedules.append(weekly_schedule)
    
    # Create the complete workout plan
    workout_plan = WorkoutPlanSchema(
        title=f"Mock {request.primaryGoal} Plan - {request.experienceLevel.title()}",
        summary=f"A {request.daysPerWeek}-day per week {request.primaryGoal.lower()} program designed for {request.experienceLevel} level.",
        weekly_schedules=weekly_schedules
    )
    
    return workout_plan