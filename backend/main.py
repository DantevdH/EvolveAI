from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import json

# Import your existing training schemas and services
from core.workout.schemas import WorkoutPlanSchema, UserProfileSchema
from core.workout.prompt_generator import WorkoutPromptGenerator
from core.workout.workout_service import create_smart_workout_service
from core.workout.models import GenerateWorkoutRequest, GenerateWorkoutResponse
from utils.mock_data import create_mock_workout_plan

import openai

# Load environment variables
load_dotenv()

app = FastAPI(
    title="EvolveAI Workout Plan Generator",
    description="FastAPI backend for generating personalized workout plans with free and premium tiers",
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

# Initialize the smart workout service
smart_workout_service = create_smart_workout_service()

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
    Generate a personalized workout plan using the smart workout service.
    
    This endpoint automatically chooses between:
    - Free tier: Simple LLM generation (your existing system)
    - Premium tier: Enhanced AI Fitness Coach with RAG knowledge base
    
    The service intelligently routes requests and provides fallback if needed.
    """
    try:
        print(f"--- [DEBUG] Request received: {request}---")
        
        # DEVELOPMENT MODE: Return mock data instead of calling OpenAI
        # Set DEBUG=true in .env to use mock data, false to use real OpenAI API
        from config.settings import settings
        
        if settings.DEBUG:
            print("--- [DEBUG] Using mock workout plan data ---")

            # Create mock workout plan based on user profile
            mock_workout_plan = create_mock_workout_plan(request)

            return GenerateWorkoutResponse(
                status="success",
                message="Mock workout plan generated successfully",
                workout_plan=mock_workout_plan
            )
        
        # PRODUCTION MODE: Use Smart Workout Service
        
        # Convert request to UserProfileSchema format
        user_profile_data = {
            "primary_goal": request.primaryGoal,
            "primary_goal_description": request.primaryGoalDescription,
            "experience_level": request.experienceLevel,
            "days_per_week": request.daysPerWeek,
            "minutes_per_session": request.minutesPerSession,
            "equipment": request.equipment,
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
        
        print("--- [DEBUG] Workout plan generating with Smart Workout Service ---")
        
        # Use the smart workout service (automatically chooses tier)
        result = smart_workout_service.generate_workout_plan(
            user_profile=user_profile,
            openai_client=openai_client,
            tier="auto"  # Let the service decide
        )
        
        print(f"--- [DEBUG] Workout plan generated using {result['tier']} tier ---")
        print(f"--- [DEBUG] Enhancements: {result['enhancements']} ---")
        
        # Return the workout plan in your existing format
        return GenerateWorkoutResponse(
            status="success",
            message=f"Workout plan generated successfully using {result['tier']} tier",
            workout_plan=result['workout_plan']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate workout plan: {str(e)}"
        )

@app.post("/api/workoutplan/generate/free")
async def generate_free_workout_plan(
    request: GenerateWorkoutRequest,
    openai_client: openai.OpenAI = Depends(get_openai_client)
):
    """
    Generate a workout plan using the free tier (simple LLM).
    
    This endpoint forces the use of the free tier for users who want
    basic workout plans without premium features.
    """
    try:
        # Convert request to UserProfileSchema format
        user_profile_data = {
            "primary_goal": request.primaryGoal,
            "primary_goal_description": request.primaryGoalDescription,
            "experience_level": request.experienceLevel,
            "days_per_week": request.daysPerWeek,
            "minutes_per_session": request.minutesPerSession,
            "equipment": request.equipment,
            "age": request.age,
            "weight": request.weight,
            "weight_unit": request.weightUnit,
            "height": request.height,
            "height_unit": request.heightUnit,
            "gender": request.gender,
            "has_limitations": request.hasLimitations,
            "limitations_description": request.limitationsDescription or "",
            "final_chat_notes": request.finalChatNotes or "",
            "training_schedule": "flexible"
        }
        
        user_profile = UserProfileSchema(**user_profile_data)
        
        # Force free tier
        result = smart_workout_service.generate_workout_plan(
            user_profile=user_profile,
            openai_client=openai_client,
            tier="free",
            force_tier=True
        )
        
        return GenerateWorkoutResponse(
            status="success",
            message="Free tier workout plan generated successfully",
            workout_plan=result['workout_plan']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate free tier workout plan: {str(e)}"
        )

@app.post("/api/workoutplan/generate/premium")
async def generate_premium_workout_plan(
    request: GenerateWorkoutRequest,
    openai_client: openai.OpenAI = Depends(get_openai_client)
):
    """
    Generate a workout plan using the premium tier (AI Fitness Coach).
    
    This endpoint forces the use of the premium tier for users who want
    enhanced, knowledge-based workout plans.
    """
    try:
        # Convert request to UserProfileSchema format
        user_profile_data = {
            "primary_goal": request.primaryGoal,
            "primary_goal_description": request.primaryGoalDescription,
            "experience_level": request.experienceLevel,
            "days_per_week": request.daysPerWeek,
            "minutes_per_session": request.minutesPerSession,
            "equipment": request.equipment,
            "age": request.age,
            "weight": request.weight,
            "weight_unit": request.weightUnit,
            "height": request.height,
            "height_unit": request.heightUnit,
            "gender": request.gender,
            "has_limitations": request.hasLimitations,
            "limitations_description": request.limitationsDescription or "",
            "final_chat_notes": request.finalChatNotes or "",
            "training_schedule": "flexible"
        }
        
        user_profile = UserProfileSchema(**user_profile_data)
        
        # Force premium tier
        result = smart_workout_service.generate_workout_plan(
            user_profile=user_profile,
            openai_client=openai_client,
            tier="premium",
            force_tier=True
        )
        
        return GenerateWorkoutResponse(
            status="success",
            message="Premium tier workout plan generated successfully",
            workout_plan=result['workout_plan']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate premium tier workout plan: {str(e)}"
        )

@app.get("/api/health/")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "model": os.getenv("OPENAI_MODEL", "gpt-4"),
        "premium_tier_enabled": smart_workout_service.premium_enabled,
        "fallback_enabled": smart_workout_service.fallback_to_free
    }

@app.get("/api/stats/")
async def get_service_stats():
    """Get smart workout service statistics."""
    return smart_workout_service.get_service_stats()

@app.post("/api/config/")
async def update_service_config(
    premium_enabled: Optional[bool] = None,
    fallback_to_free: Optional[bool] = None
):
    """Update smart workout service configuration."""
    smart_workout_service.update_config(premium_enabled, fallback_to_free)
    return {"message": "Configuration updated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 