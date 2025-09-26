from fastapi import FastAPI, HTTPException, Depends, Header
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
from core.fitness.helpers.database_service import db_service
from core.fitness.onboarding_api import router as onboarding_router
from utils.mock_data import create_mock_workout_plan
from settings import settings

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

# Include onboarding router
app.include_router(onboarding_router)

# Dependency to get OpenAI client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return openai.OpenAI(api_key=api_key)

# Helper function to get user profile ID
async def _get_user_profile_id(request: GenerateWorkoutRequest, user_id: str) -> Optional[int]:
    """
    Get user profile ID from request or database lookup.
    
    Args:
        request: The workout generation request
        user_id: The user's ID from Supabase Auth
        
    Returns:
        User profile ID or None if not found
    """
    if request.user_profile_id:
        return int(request.user_profile_id)
    
    # Fallback: Get user profile to get the profile ID (for backward compatibility)
    user_profile_result = await db_service.get_user_profile(user_id)
    if not user_profile_result["success"]:
        return None
    
    return user_profile_result["data"]["id"]

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "EvolveAI Workout Plan Generator API v2.0", "status": "healthy"}

@app.post("/api/workoutplan/generate/", response_model=GenerateWorkoutResponse)
async def generate_workout_plan(
    request: GenerateWorkoutRequest,
    openai_client: openai.OpenAI = Depends(get_openai_client),
    authorization: str = Header(None)
):
    """
    Generate a personalized workout plan using the enhanced AI Fitness Coach.
    
    Args:
        request: The workout generation request containing user profile information.
    
    Returns:
        A personalized workout plan with RAG-enhanced recommendations.
    """
    print(f"🚀 API: Starting workout plan generation request...")
    print(f"📋 API: Request details - User ID: {request.user_id}, Profile ID: {request.user_profile_id}")
    print(f"📋 API: Request details - Primary Goal: {request.primaryGoal}, Experience: {request.experienceLevel}")
    
    try:

        # Extract JWT token from Authorization header
        jwt_token = None
        if authorization and authorization.startswith('Bearer '):
            jwt_token = authorization.split('Bearer ')[1]
            print(f"🔐 API: JWT token extracted, length: {len(jwt_token)}")
        else:
            print(f"⚠️ API: No JWT token found in authorization header")
        
        # Validate required fields are not empty
        print(f"🔍 API: Starting validation...")
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
            print(f"❌ API: Validation failed: {error_message}")
            raise HTTPException(status_code=422, detail=error_message)
        
        print(f"✅ API: Validation passed")
        
        # Get user_id from the request body (required for database operations)
        user_id = request.user_id
        if not user_id:
            print(f"❌ API: User ID is missing from request")
            raise HTTPException(
                status_code=400, 
                detail="User ID is required to generate and save workout plans. Please ensure you are properly authenticated."
            )
        
        print(f"✅ API: User ID validated: {user_id}")
        
        # Generate workout plan (mock or real based on DEBUG setting)
        print(f"🤖 API: Starting workout plan generation (DEBUG={settings.DEBUG})...")
        if settings.DEBUG:
            print(f"🎭 API: Using mock workout plan generation")
            workout_plan_data = create_mock_workout_plan(request)
            workout_plan_dict = workout_plan_data.model_dump()
            message = "Mock workout plan generated successfully"
            print(f"✅ API: Mock workout plan generated successfully")
        else:
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
            
            # Create UserProfileSchema instance and generate workout plan
            user_profile = UserProfileSchema(**user_profile_data)
            result = fitness_coach.generate_enhanced_workout_plan(
                user_profile=user_profile,
                openai_client=openai_client
            )
            workout_plan_data = result['workout_plan']
            workout_plan_dict = result['workout_plan']
            message = "Enhanced workout plan generated successfully using AI Fitness Coach"

        # Get user_profile_id (common logic for both debug and production)
        print(f"🔍 API: Getting user profile ID...")
        user_profile_id = await _get_user_profile_id(request, user_id)
        if user_profile_id is None:
            print(f"❌ API: User profile not found for user_id: {user_id}")
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please complete your profile setup before generating a workout plan."
            )
        
        print(f"✅ API: User profile ID found: {user_profile_id}")
        
        # Save workout plan to database (common logic for both debug and production)
        print(f"💾 API: Starting database save operation...")
        save_result = await db_service.save_workout_plan(user_profile_id, workout_plan_data, jwt_token)
        
        print(f"📊 API: Database save result: {save_result}")
        
        if not save_result["success"]:
            print(f"❌ API: Database save failed: {save_result['error']}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save workout plan to database: {save_result['error']}"
            )
        
        plan_type = "Mock" if settings.DEBUG else "Workout"
        print(f"✅ API: {plan_type} plan saved to database with ID: {save_result['data']['workout_plan_id']}")
        
        print(f"🎉 API: Workout plan generation completed successfully")
        return GenerateWorkoutResponse(
            status="success",
            message=message,
            workout_plan=workout_plan_dict
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like our validation errors)
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
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
    uvicorn.run(app, host="127.0.0.1", port=8000) 