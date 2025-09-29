"""
Fitness API Endpoints

Handles the complete fitness workflow with a clean, unified interface:
- Initial Questions (AI-generated)
- Follow-up Questions (AI-generated) 
- Plan Generation (AI)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging
import os

from core.fitness.helpers.ai_question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    TrainingPlanOutlineRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PersonalInfo
)
from core.fitness.fitness_coach import FitnessCoach
from core.fitness.helpers.schemas import WorkoutPlanSchema
from core.fitness.helpers.database_service import db_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fitness", tags=["fitness"])

# Dependency to get FitnessCoach instance
def get_fitness_coach() -> FitnessCoach:
    """Get FitnessCoach instance with all capabilities."""
    return FitnessCoach()


@router.post("/initial-questions")
async def get_initial_questions(
    request: InitialQuestionsRequest,
    coach: FitnessCoach = Depends(get_fitness_coach)
):
    """Generate initial personalized questions based on personal info and goal."""
    try:
        logger.info(f"Generating initial questions for user: {request.personal_info.goal_description}")
        
        # Create user profile first
        try:
            # Extract user_id from JWT token
            import jwt
            decoded_token = jwt.decode(request.jwt_token, options={"verify_signature": False})
            user_id = decoded_token.get('sub')  # 'sub' contains the user UUID
            
            if not user_id:
                logger.error("❌ Could not extract user_id from JWT token")
            else:
                # Create user profile with personal info
                profile_data = {
                    "username": request.personal_info.username,
                    "age": request.personal_info.age,
                    "weight": request.personal_info.weight,
                    "height": request.personal_info.height,
                    "weight_unit": request.personal_info.weight_unit,
                    "height_unit": request.personal_info.height_unit,
                    "measurement_system": request.personal_info.measurement_system,
                    "gender": request.personal_info.gender,
                    "goal_description": request.personal_info.goal_description,
                    "experience_level": request.personal_info.experience_level,
                }
                
                create_result = await db_service.create_user_profile(
                    user_id=user_id,
                    profile_data=profile_data,
                    jwt_token=request.jwt_token
                )
                
                if create_result.get('success'):
                    logger.info(f"✅ User profile created successfully (ID: {create_result.get('data', {}).get('id')})")
                else:
                    logger.error(f"❌ Failed to create user profile: {create_result.get('error')}")
        except Exception as e:
            logger.error(f"❌ Error creating user profile: {str(e)}")
        
        questions_response = coach.generate_initial_questions(request.personal_info)
        
        logger.info(f"✅ Generated {questions_response.total_questions} initial questions for {request.personal_info.username}")
        
        return {
            "success": True,
            "data": questions_response,
            "message": "Initial questions generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating initial questions: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate initial questions: {str(e)}"
        }


@router.post("/follow-up-questions")
async def get_follow_up_questions(
    request: FollowUpQuestionsRequest,
    coach: FitnessCoach = Depends(get_fitness_coach)
):
    """Generate follow-up questions based on initial responses."""
    try:
        # Validate input
        if not request.initial_responses:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty"
            }
        
        logger.info(f"Generating follow-up questions for user: {request.personal_info.goal_description}")
        
        # Generate follow-up questions first
        questions_response = coach.generate_follow_up_questions(
            request.personal_info,
            request.initial_responses,
            request.initial_questions
        )
        
        # Update user profile with initial questions
        try:
            # Extract user_id from JWT token
            import jwt
            decoded_token = jwt.decode(request.jwt_token, options={"verify_signature": False})
            user_id = decoded_token.get('sub')  # 'sub' contains the user UUID
            
            if not user_id:
                logger.error("❌ Could not extract user_id from JWT token for profile update")
            else:
                update_result = await db_service.update_user_profile(
                    user_id=user_id,
                    data={
                        "initial_questions": questions_response.formatted_responses
                    },
                    jwt_token=request.jwt_token
                )
                
                if update_result.get('success'):
                    logger.info(f"✅ User profile updated with initial questions")
                else:
                    logger.error(f"❌ Failed to update user profile with initial questions: {update_result.get('error')}")
        except Exception as e:
            logger.error(f"❌ Error updating user profile with initial questions: {str(e)}")
        
        logger.info(f"✅ Generated {questions_response.total_questions} follow-up questions for {request.personal_info.username}")
        
        return {
            "success": True,
            "data": questions_response,
            "message": "Follow-up questions generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating follow-up questions: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate follow-up questions: {str(e)}"
        }


@router.post("/training-plan-outline")
async def generate_training_plan_outline(
    request: TrainingPlanOutlineRequest,
    coach: FitnessCoach = Depends(get_fitness_coach)
):
    """Generate a training plan outline before creating the final plan."""
    
    try:
        # Validate input
        if not request.initial_responses:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty"
            }
        
        if not request.follow_up_responses:
            return {
                "success": False,
                "data": None,
                "message": "Follow-up responses cannot be empty"
            }
        
        logger.info(f"Generating training plan outline for user: {request.personal_info.username}")
        
        # Combine all responses for comprehensive user profile
        all_responses = {
            **request.initial_responses,
            **request.follow_up_responses
        }
        
        # Generate training plan outline using the coach
        result = coach.generate_training_plan_outline(
            personal_info=request.personal_info,
            user_responses=all_responses,
            initial_questions=request.initial_questions,
            follow_up_questions=request.follow_up_questions
        )
        
        logger.info(f"Training plan outline result: {result}")
        
        if result.get('success'):
            logger.info("Training plan outline generated successfully")
            
            return {
                "success": True,
                "data": {
                    "outline": result.get('outline'),
                    "metadata": result.get('metadata', {})
                },
                "message": "Training plan outline generated successfully"
            }
        else:
            logger.error(f"Failed to generate training plan outline: {result.get('error')}")
            return {
                "success": False,
                "data": None,
                "message": result.get('error', 'Failed to generate training plan outline')
            }
            
    except Exception as e:
        logger.error(f"Error generating training plan outline: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate training plan outline: {str(e)}"
        }


@router.post("/generate-plan")
async def generate_workout_plan(
    request: PlanGenerationRequest,
    coach: FitnessCoach = Depends(get_fitness_coach)
):
    """Generate the final workout plan using only initial/follow-up questions and exercises."""

    try:
        # Validate input
        if not request.initial_responses:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty"
            }
        
        if not request.follow_up_responses:
            return {
                "success": False,
                "data": None,
                "message": "Follow-up responses cannot be empty"
            }
        
        logger.info(f"Generating workout plan for user: {request.personal_info.goal_description}")
        
        # Extract user_id from JWT token and get user profile ID
        try:
            import jwt
            decoded_token = jwt.decode(request.jwt_token, options={"verify_signature": False})
            user_id = decoded_token.get('sub')  # 'sub' contains the user UUID
            
            if not user_id:
                logger.error("❌ Could not extract user_id from JWT token")
                return {
                    "success": False,
                    "data": None,
                    "message": "Invalid JWT token - could not extract user ID"
                }
            
            # Get user profile ID from database
            logger.info(f"🔍 Looking up user profile for user_id: {user_id}")
            user_profile_result = await db_service.get_user_profile_by_user_id(user_id, request.jwt_token)
            logger.info(f"🔍 User profile lookup result: {user_profile_result}")
            
            if not user_profile_result.get('success') or not user_profile_result.get('data'):
                logger.error(f"❌ Could not find user profile in database for user_id: {user_id}")
                return {
                    "success": False,
                    "data": None,
                    "message": "User profile not found - please complete onboarding first"
                }
            
            user_profile_id = user_profile_result.get('data', {}).get('id')
            logger.info(f"✅ Found user profile ID: {user_profile_id}")
            
        except Exception as e:
            logger.error(f"❌ Error getting user profile ID: {str(e)}")
            return {
                "success": False,
                "data": None,
                "message": f"Error getting user profile: {str(e)}"
            }
        
        # Update user profile with follow-up questions
        try:
            # Format follow-up responses for database storage
            from core.fitness.helpers.response_formatter import ResponseFormatter
            formatted_follow_up_responses = ResponseFormatter.format_responses(
                request.follow_up_responses, 
                request.follow_up_questions
            )
            
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={
                    "follow_up_questions": formatted_follow_up_responses
                },
                jwt_token=request.jwt_token
            )
            
            if update_result.get('success'):
                logger.info(f"✅ User profile updated with follow-up questions")
            else:
                logger.error(f"❌ Failed to update user profile with follow-up questions: {update_result.get('error')}")
        except Exception as e:
            logger.error(f"❌ Error updating user profile with follow-up questions: {str(e)}")
        
        # Combine all responses for comprehensive user profile
        all_responses = {
            **request.initial_responses,
            **request.follow_up_responses
        }
        
        # Generate training plan using exercise selection and validation
        result = coach.generate_training_plan(
            personal_info=request.personal_info,
            user_responses=all_responses,
            initial_questions=request.initial_questions,
            follow_up_questions=request.follow_up_questions
        )
        
        logger.info(f"Coach result: {result}")
        
        if result.get('success'):
            logger.info("Workout plan generated successfully")
            
            # Save workout plan to database - REQUIRED
            workout_plan_data = result.get('workout_plan')
            
            try:
                logger.info(f"Saving workout plan to database for user_profile_id: {user_profile_id}")
                
                # Save to database
                save_result = await db_service.save_workout_plan(
                    user_profile_id=user_profile_id,
                    workout_plan_data=workout_plan_data,
                    jwt_token=request.jwt_token
                )
                
                if save_result.get('success'):
                    logger.info(f"✅ Workout plan saved successfully (ID: {save_result.get('data', {}).get('workout_plan_id')}) for user {user_profile_id}")
                    response_data = {
                        "success": True,
                        "data": {
                            "workout_plan_id": save_result.get('data', {}).get('workout_plan_id'),
                            "metadata": result.get('metadata', {})
                        },
                        "message": "Workout plan generated and saved successfully"
                    }
                else:
                    logger.error(f"❌ Failed to save workout plan to database: {save_result.get('error')}")
                    response_data = {
                        "success": False,
                        "data": None,
                        "message": f"Workout plan generated but failed to save: {save_result.get('error')}"
                    }
            except Exception as e:
                logger.error(f"❌ Error saving workout plan to database: {str(e)}")
                response_data = {
                    "success": False,
                    "data": None,
                    "message": f"Workout plan generated but failed to save: {str(e)}"
                }
            
            logger.info(f"API response data: {response_data}")
            return response_data
        else:
            logger.error(f"Workout plan generation failed: {result.get('error')}")
            return {
                "success": False,
                "data": None,
                "message": result.get('error', 'Failed to generate workout plan')
            }
            
    except Exception as e:
        logger.error(f"Error generating workout plan: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate workout plan: {str(e)}"
        }