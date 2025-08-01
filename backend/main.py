from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import json

# Import your existing training schemas and services
from training.schemas import WorkoutPlanSchema, UserProfileSchema
from training.prompt_generator import WorkoutPromptGenerator
from training.helpers import create_mock_workout_plan, GenerateWorkoutRequest, GenerateWorkoutResponse
import openai

# Load environment variables
load_dotenv()

app = FastAPI(
    title="EvolveAI Workout Plan Generator",
    description="FastAPI backend for generating personalized workout plans",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to get OpenAI client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return openai.OpenAI(api_key=api_key)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "EvolveAI Workout Plan Generator API", "status": "healthy"}

@app.post("/api/workoutplan/generate/", response_model=GenerateWorkoutResponse)
async def generate_workout_plan(
    request: GenerateWorkoutRequest,
    openai_client: openai.OpenAI = Depends(get_openai_client)
):
    """
    Generate a personalized workout plan using OpenAI.
    
    This endpoint takes user profile data and generates a complete workout plan
    using the existing training prompt generator and schemas.
    """
    try:
        print(f"--- [DEBUG] Request received: {request}---")
        
        # DEVELOPMENT MODE: Return mock data instead of calling OpenAI
        # Set USE_MOCK_DATA=true in .env to use mock data, false to use real OpenAI API
        USE_MOCK_DATA = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
        
        if USE_MOCK_DATA:
            print("--- [DEBUG] Using mock workout plan data ---")
            
            # Create mock workout plan based on user profile
            mock_workout_plan = create_mock_workout_plan(request)
            
            return GenerateWorkoutResponse(
                status="success",
                message="Mock workout plan generated successfully",
                workout_plan=mock_workout_plan
            )
        
        # PRODUCTION MODE: Use OpenAI API
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
            "training_schedule": request.trainingSchedule,
            "final_chat_notes": request.finalChatNotes or ""
        }
        
        # Create UserProfileSchema instance
        user_profile = UserProfileSchema(**user_profile_data)
        
        # Generate workout plan using existing prompt generator
        prompt_generator = WorkoutPromptGenerator()
        prompt = prompt_generator.create_initial_plan_prompt(user_profile)
        
        print("--- [DEBUG] Workout plan generating started ---")
        # Call OpenAI API
        completion = openai_client.chat.completions.parse(
            model=os.getenv("OPENAI_MODEL", "gpt-4"),
            messages=[{"role": "system", "content": prompt}],
            response_format=WorkoutPlanSchema,
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
        )
        
        # Parse the response content
        response_content = completion.choices[0].message.content
        workout_plan_data = json.loads(response_content)
        workout_plan = WorkoutPlanSchema(**workout_plan_data)
        print("--- [DEBUG] Workout plan generated successfully ---")

        return GenerateWorkoutResponse(
            status="success",
            message="Workout plan generated successfully",
            workout_plan=workout_plan
        )
        
    except Exception as e:
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
        "model": os.getenv("OPENAI_MODEL", "gpt-4")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 