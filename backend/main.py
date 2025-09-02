from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import json

# Import your existing training schemas and services
from core.fitness.helpers.schemas import WorkoutPlanSchema, UserProfileSchema
from core.fitness.helpers.models import GenerateWorkoutRequest, GenerateWorkoutResponse
from core.fitness.fitness_coach import FitnessCoach
from utils.mock_data import create_mock_workout_plan

import openai

# Load environment variables
load_dotenv()

app = FastAPI(
    title="EvolveAI Workout Plan Generator",
    description="FastAPI backend for generating personalized workout plans using enhanced AI Fitness Coach",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the fitness coach
fitness_coach = FitnessCoach()

# Dependency to get OpenAI client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return openai.OpenAI(api_key=api_key)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "EvolveAI Workout Plan Generator API v2.0", "status": "healthy"}

@app.post("/api/workoutplan/generate/", response_model=GenerateWorkoutResponse)
async def generate_workout_plan(
    request: GenerateWorkoutRequest,
    openai_client: openai.OpenAI = Depends(get_openai_client)
):
    """
    Generate a personalized workout plan using the enhanced AI Fitness Coach.
    
    Args:
        request: The workout generation request containing user profile information.
    
    Returns:
        A personalized workout plan with RAG-enhanced recommendations.
    """
    try:

        
        # Validate required fields are not empty
        validation_errors = []
        if not request.primaryGoal or request.primaryGoal.strip() == "":
            validation_errors.append("primaryGoal cannot be empty")
        # primaryGoalDescription is optional, so we don't validate it
        if not request.experienceLevel or request.experienceLevel.strip() == "":
            validation_errors.append("experienceLevel cannot be empty")
        if not request.equipment or request.equipment.strip() == "":
            validation_errors.append("equipment cannot be empty")
        if not request.gender or request.gender.strip() == "":
            validation_errors.append("gender cannot be empty")
        
        if validation_errors:
            error_message = f"Validation failed: {', '.join(validation_errors)}"
            print(f"--- [DEBUG] Validation errors: {error_message} ---")
            raise HTTPException(status_code=422, detail=error_message)
        
        # DEVELOPMENT MODE: Return mock data instead of calling OpenAI
        # Set DEBUG=true in .env to use mock data, false to use real OpenAI API
        from settings import settings
        
        
        if settings.DEBUG:
            print(f"--- [DEBUG] Using mock workout plan data ---")

            # Create mock workout plan based on user profile
            mock_workout_plan = create_mock_workout_plan(request)
            
            # Convert WorkoutPlanSchema to dict for the response
            workout_plan_dict = mock_workout_plan.model_dump()

            return GenerateWorkoutResponse(
                status="success",
                message="Mock workout plan generated successfully",
                workout_plan=workout_plan_dict
            )
        
        # PRODUCTION MODE: Use Smart Workout Service
        
        # Convert request to UserProfileSchema format
        user_profile_data = {
            "primary_goal": request.primaryGoal,
            "primary_goal_description": request.primaryGoalDescription,
            "experience_level": request.experienceLevel,
            "days_per_week": request.daysPerWeek,
            "minutes_per_session": request.minutesPerSession,
            "equipment": request.equipment,  # Now it's a string, no conversion needed
            "age": request.age,
            "weight": request.weight,
            "weight_unit": request.weightUnit,
            "height": request.height,
            "height_unit": request.heightUnit,
            "gender": request.gender,
            "has_limitations": request.hasLimitations,
            "limitations_description": request.limitationsDescription or "",
            "final_chat_notes": request.finalChatNotes or "",
            "training_schedule": "flexible"  # Default value for required field
        }
        
        # Create UserProfileSchema instance
        user_profile = UserProfileSchema(**user_profile_data)
        
        
        # Use the fitness coach
        result = fitness_coach.generate_enhanced_workout_plan(
            user_profile=user_profile,
            openai_client=openai_client
        )
        

        # Return the workout plan in your existing format
        return GenerateWorkoutResponse(
            status="success",
            message="Enhanced workout plan generated successfully using AI Fitness Coach",
            workout_plan=result['workout_plan']
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like our validation errors)
        raise
    except Exception as e:
        print(f"--- [DEBUG] Unexpected error: {str(e)} ---")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate workout plan: {str(e)}"
        )

@app.get("/api/health/")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "model": os.getenv("OPENAI_MODEL", "gpt-4"),
        "fitness_coach_available": fitness_coach is not None
    }

@app.get("/api/stats/")
async def get_service_stats():
    """Get workout service statistics."""
    return {
        "service_status": "operational",
        "fitness_coach_available": fitness_coach is not None
    }

@app.post("/api/config/")
async def update_service_config(
    premium_enabled: Optional[bool] = None,
    fallback_to_free: Optional[bool] = None
):
    """Update workout service configuration."""
    # For now, just return success - implement actual config updates later
    return {"message": "Configuration updated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 