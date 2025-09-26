"""
Onboarding API Endpoints

Handles the 4-step AI-driven onboarding flow:
1. Personal Info (static)
2. Initial Questions (AI-generated)
3. Follow-up Questions (AI-generated)
4. Plan Generation (AI)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from .helpers.ai_question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PersonalInfo
)
from .ai_question_service import AIQuestionService
from .fitness_coach import FitnessCoach
from .helpers.schemas import WorkoutPlanSchema
import openai
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# Dependency to get OpenAI client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return openai.OpenAI(api_key=api_key)

# Initialize services
def get_ai_question_service(openai_client: openai.OpenAI = Depends(get_openai_client)) -> AIQuestionService:
    return AIQuestionService(openai_client)

def get_fitness_coach() -> FitnessCoach:
    return FitnessCoach()


@router.post("/initial-questions")
async def get_initial_questions(
    request: InitialQuestionsRequest,
    ai_service: AIQuestionService = Depends(get_ai_question_service)
):
    """Generate initial personalized questions based on personal info and goal."""
    try:
        logger.info(f"Generating initial questions for user: {request.personal_info.goal_description}")
        
        questions_response = ai_service.generate_initial_questions(request.personal_info)
        
        logger.info(f"Generated {questions_response.total_questions} initial questions")
        return {
            "success": True,
            "data": questions_response,
            "message": "Initial questions generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating initial questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate initial questions: {str(e)}")


@router.post("/follow-up-questions")
async def get_follow_up_questions(
    request: FollowUpQuestionsRequest,
    ai_service: AIQuestionService = Depends(get_ai_question_service)
):
    """Generate follow-up questions based on initial responses."""
    try:
        logger.info(f"Generating follow-up questions for user: {request.personal_info.goal_description}")
        
        questions_response = ai_service.generate_follow_up_questions(
            request.personal_info, 
            request.initial_responses
        )
        
        logger.info(f"Generated {questions_response.total_questions} follow-up questions")
        return {
            "success": True,
            "data": questions_response,
            "message": "Follow-up questions generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating follow-up questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate follow-up questions: {str(e)}")


@router.post("/generate-plan", response_model=PlanGenerationResponse)
async def generate_workout_plan(
    request: PlanGenerationRequest,
    fitness_coach: FitnessCoach = Depends(get_fitness_coach),
    openai_client: openai.OpenAI = Depends(get_openai_client)
):
    """Generate the final workout plan using all collected data."""
    try:
        logger.info(f"Generating workout plan for user: {request.personal_info.goal_description}")
        
        # Create comprehensive prompt with all user data
        prompt = f"""
        You are an ELITE PERFORMANCE COACH. Create a comprehensive, personalized workout plan based on the following information:
        
        Personal Information:
        - Age: {request.personal_info.age}
        - Weight: {request.personal_info.weight} {request.personal_info.weight_unit}
        - Height: {request.personal_info.height} {request.personal_info.height_unit}
        - Goal: {request.personal_info.goal_description}
        
        Initial Question Responses:
        {_format_responses_for_prompt(request.initial_responses)}
        
        Follow-up Question Responses:
        {_format_responses_for_prompt(request.follow_up_responses)}
        
        Create a workout plan that:
        1. Is specifically tailored to their goal and responses
        2. Takes into account their experience level, equipment, and time constraints
        3. Addresses any medical concerns or limitations
        4. Includes proper progression and periodization
        5. Provides clear instructions and guidance
        6. Is realistic and achievable for their situation
        
        Return the plan in the WorkoutPlanSchema format.
        """
        
        # Generate workout plan using existing fitness coach
        result = fitness_coach.generate_enhanced_workout_plan(
            user_profile=_create_user_profile_from_request(request),
            openai_client=openai_client
        )
        
        if result.get('success'):
            logger.info("Workout plan generated successfully")
            return PlanGenerationResponse(
                success=True,
                workout_plan=result.get('workout_plan'),
                error=None
            )
        else:
            logger.error(f"Workout plan generation failed: {result.get('error')}")
            return PlanGenerationResponse(
                success=False,
                workout_plan=None,
                error=result.get('error', 'Failed to generate workout plan')
            )
            
    except Exception as e:
        logger.error(f"Error generating workout plan: {str(e)}")
        return PlanGenerationResponse(
            success=False,
            workout_plan=None,
            error=f"Failed to generate workout plan: {str(e)}"
        )


def _format_responses_for_prompt(responses: Dict[str, Any]) -> str:
    """Format responses for AI prompt."""
    formatted = []
    for question_id, response in responses.items():
        if isinstance(response, list):
            response_str = ", ".join(str(item) for item in response)
        else:
            response_str = str(response)
        formatted.append(f"- {question_id}: {response_str}")
    return "\n".join(formatted)


def _create_user_profile_from_request(request: PlanGenerationRequest) -> dict:
    """Create user profile data from onboarding request."""
    # Extract key information from responses
    initial_responses = request.initial_responses
    follow_up_responses = request.follow_up_responses
    
    # Map responses to user profile format
    # This is a simplified mapping - you might want to make this more sophisticated
    return {
        "primary_goal": request.personal_info.goal_description,
        "primary_goal_description": request.personal_info.goal_description,
        "experience_level": initial_responses.get("experience_level", "beginner"),
        "days_per_week": initial_responses.get("days_per_week", 3),
        "minutes_per_session": initial_responses.get("session_duration", 45),
        "equipment": initial_responses.get("equipment", "bodyweight"),
        "age": request.personal_info.age,
        "weight": request.personal_info.weight,
        "weight_unit": request.personal_info.weight_unit,
        "height": request.personal_info.height,
        "height_unit": request.personal_info.height_unit,
        "gender": initial_responses.get("gender", "unknown"),
        "has_limitations": initial_responses.get("has_medical_conditions", False),
        "limitations_description": initial_responses.get("medical_details", ""),
        "final_chat_notes": _format_responses_for_prompt(follow_up_responses)
    }
