"""
training API Endpoints

Handles the complete training workflow with a clean, unified interface:
- Initial Questions (AI-generated)
- Follow-up Questions (AI-generated)
- Plan Generation (AI)
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import os
import jwt
import copy

from core.training.schemas.question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PlanFeedbackRequest,
    PlanFeedbackResponse,
    PersonalInfo,
    AIQuestion,
)
from core.training.training_coach import TrainingCoach
from core.training.schemas.training_schemas import TrainingPlan
from core.training.helpers.database_service import db_service
# Format responses
from core.training.helpers.response_formatter import ResponseFormatter
logger = logging.getLogger(__name__)


async def _fetch_complete_training_plan(user_profile_id: int) -> Dict[str, Any]:
    """Fetch complete training plan with real IDs from database - exact same as frontend."""
    try:
        from supabase import create_client
        import os

        # Use service role key for backend operations
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        logger.info(f"🔍 Supabase URL: {url[:30]}..." if url else "❌ No URL")
        logger.info(f"🔍 Service role key present: {'Yes' if key else 'No'}")

        if not url or not key:
            logger.error("❌ Missing Supabase environment variables")
            return None

        supabase = create_client(url, key)

        logger.info(f"🔍 Fetching training plan for user_profile_id: {user_profile_id}")

        # Manual table-by-table approach since relational queries aren't working
        logger.info("🔍 Fetching training plan manually table by table...")

        # 1. Get training plan
        training_plan_response = (
            supabase.table("training_plans")
            .select("*")
            .eq("user_profile_id", user_profile_id)
            .single()
            .execute()
        )
        if not training_plan_response.data:
            logger.warning(
                f"⚠️ No training plan found for user_profile_id {user_profile_id}"
            )
            return None

        training_plan = training_plan_response.data
        logger.info(f"✅ Found training plan: {training_plan['id']}")

        # 2. Get weekly schedules
        weekly_schedules_response = (
            supabase.table("weekly_schedules")
            .select("*")
            .eq("training_plan_id", training_plan["id"])
            .execute()
        )
        weekly_schedules = weekly_schedules_response.data or []

        # 3. Get daily trainings for each week
        for weekly_schedule in weekly_schedules:
            daily_trainings_response = (
                supabase.table("daily_training")
                .select("*")
                .eq("weekly_schedule_id", weekly_schedule["id"])
                .execute()
            )
            daily_trainings = daily_trainings_response.data or []

            # 4. Get strength exercises and endurance sessions for each daily training
            for daily_training in daily_trainings:
                if not daily_training["is_rest_day"]:
                    # Get strength exercises (without exercise details first)
                    strength_exercises_response = (
                        supabase.table("strength_exercise")
                        .select("*")
                        .eq("daily_training_id", daily_training["id"])
                        .execute()
                    )
                    strength_exercises = strength_exercises_response.data or []

                    # Get exercise details for each strength exercise
                    # Store as "exercises" (plural) to match Supabase relational query format
                    # Frontend TrainingService expects se.exercises from Supabase queries
                    for strength_exercise in strength_exercises:
                        exercise_response = (
                            supabase.table("exercises")
                            .select("*")
                            .eq("id", strength_exercise["exercise_id"])
                            .single()
                            .execute()
                        )
                        if exercise_response.data:
                            strength_exercise["exercises"] = exercise_response.data  # Plural to match Supabase format
                        else:
                            strength_exercise["exercises"] = None

                    # Store as strength_exercise (singular) to match Supabase relational query format
                    # Frontend TrainingService expects this format from Supabase queries
                    daily_training["strength_exercise"] = strength_exercises

                    # Get endurance sessions
                    endurance_sessions_response = (
                        supabase.table("endurance_session")
                        .select("*")
                        .eq("daily_training_id", daily_training["id"])
                        .execute()
                    )
                    # Store as endurance_session (singular) to match Supabase relational query format
                    daily_training["endurance_session"] = (
                        endurance_sessions_response.data or []
                    )
                else:
                    daily_training["strength_exercise"] = []
                    daily_training["endurance_session"] = []

            weekly_schedule["daily_training"] = daily_trainings

        # Build complete response
        training_plan["weekly_schedules"] = weekly_schedules

        return training_plan

    except Exception as e:
        logger.error(f"❌ Error fetching complete training plan: {str(e)}")
        return None


router = APIRouter(prefix="/api/training", tags=["training"])


# ============================================================================
# DEPENDENCIES & HELPERS
# ============================================================================


def get_training_coach() -> TrainingCoach:
    """Get TrainingCoach instance with all capabilities."""
    return TrainingCoach()


def extract_user_id_from_jwt(jwt_token: str) -> str:
    """
    Extract user_id from JWT token.
    
    Raises HTTPException(401) if token is invalid.
    """
    try:
        decoded_token = jwt.decode(jwt_token, options={"verify_signature": False})
        user_id = decoded_token.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="No user_id found in JWT token")
        
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ JWT token error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid JWT token: {str(e)}")


async def safe_db_update(
    operation_name: str,
    update_func,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Helper for non-critical database updates that log failures but don't halt execution.
    
    Args:
        operation_name: Description of the operation for logging
        update_func: Async database function to call
        *args, **kwargs: Arguments to pass to update_func
        
    Returns:
        Result dict from database operation
    """
    try:
        result = await update_func(*args, **kwargs)
        if result.get("success"):
            logger.info(f"✅ {operation_name}")
        else:
            logger.error(f"❌ {operation_name} failed: {result.get('error')}")
        return result
    except Exception as e:
        logger.error(f"❌ {operation_name} error: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/initial-questions")
async def get_initial_questions(
    request: InitialQuestionsRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate initial personalized questions based on personal info and goal."""
    try:
        logger.info(f"🚀 Generating initial questions for: {request.personal_info.goal_description}")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        # Create user profile
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
        
        create_result = await safe_db_update(
            "Create user profile",
            db_service.create_user_profile,
            user_id=user_id,
            profile_data=profile_data,
            jwt_token=request.jwt_token
        )
        
        user_profile_id = None
        if create_result.get("success"):
            user_profile_id = create_result.get('data', {}).get('id')
            logger.info(f"Profile ID: {user_profile_id}")
        
        # Generate questions (with latency tracking)
        questions_response = await coach.generate_initial_questions(
            request.personal_info, 
            user_profile_id=user_profile_id
        )
        
        # Store questions (non-critical - log but continue)
        await safe_db_update(
            "Store initial questions",
            db_service.update_user_profile,
            user_id=user_id,
            data={
                "initial_questions": {
                    "questions": [q.model_dump() for q in questions_response.questions],
                    "ai_message": questions_response.ai_message,
                }
            },
            jwt_token=request.jwt_token
        )
        
        logger.info(f"✅ Generated {questions_response.total_questions} initial questions")
        
        return {
            "success": True,
            "data": {
                "questions": questions_response.questions,
                "total_questions": questions_response.total_questions,
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": questions_response.ai_message,
            },
            "message": "Initial questions generated successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating initial questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate initial questions: {str(e)}")


@router.post("/follow-up-questions")
async def get_follow_up_questions(
    request: FollowUpQuestionsRequest,
    coach: TrainingCoach = Depends(get_training_coach),
):
    """Generate follow-up questions based on initial responses."""
    try:
        # Validate input
        if not request.initial_responses:
            raise HTTPException(status_code=400, detail="Initial responses cannot be empty")
        
        if not request.initial_questions or not isinstance(request.initial_questions, list):
            raise HTTPException(status_code=400, detail="Invalid initial questions structure")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        logger.info(f"Generating follow-up questions for: {request.personal_info.goal_description}")
        
        # Format responses
        from core.training.helpers.response_formatter import ResponseFormatter
        formatted_responses = ResponseFormatter.format_responses(
            request.initial_responses,
            request.initial_questions
        )
        
        # Store initial responses and get user_profile_id
        await safe_db_update(
            "Store initial responses",
            db_service.update_user_profile,
            user_id=user_id,
            data={"initial_responses": request.initial_responses},
            jwt_token=request.jwt_token
        )
        
        # Get user_profile_id for latency tracking
        user_profile_id = None
        try:
            profile_result = await db_service.get_user_profile(user_id, request.jwt_token)
            if profile_result and profile_result.get("id"):
                user_profile_id = profile_result["id"]
        except Exception as e:
            logger.warning(f"Could not retrieve user_profile_id: {e}")
        
        # Generate follow-up questions (with latency tracking)
        questions_response = await coach.generate_follow_up_questions(
            request.personal_info,
            formatted_responses,
            request.initial_questions,
            user_profile_id=user_profile_id
        )
        
        # Store follow-up questions
        await safe_db_update(
            "Store follow-up questions",
            db_service.update_user_profile,
            user_id=user_id,
            data={
                "follow_up_questions": {
                    "questions": [q.model_dump() for q in questions_response.questions],
                    "ai_message": questions_response.ai_message,
                }
            },
            jwt_token=request.jwt_token
        )
        
        logger.info(f"✅ Generated {questions_response.total_questions} follow-up questions")
        
        return {
            "success": True,
            "data": {
                "questions": questions_response.questions,
                "total_questions": questions_response.total_questions,
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": questions_response.ai_message,
                "initial_questions": request.initial_questions,
            },
            "message": "Follow-up questions generated successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating follow-up questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate follow-up questions: {str(e)}")


@router.post("/generate-plan")
async def generate_training_plan(
    request: PlanGenerationRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate the final training plan using initial/follow-up questions and exercises."""
    try:
        # Validate input
        if not request.initial_responses:
            raise HTTPException(status_code=400, detail="Initial responses cannot be empty")
        
        if not request.follow_up_responses:
            raise HTTPException(status_code=400, detail="Follow-up responses cannot be empty")
        
        if not request.initial_questions or not isinstance(request.initial_questions, list):
            raise HTTPException(status_code=400, detail="Invalid initial questions structure")
        
        if not request.follow_up_questions or not isinstance(request.follow_up_questions, list):
            raise HTTPException(status_code=400, detail="Invalid follow-up questions structure")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        logger.info(f"Generating training plan for: {request.personal_info.goal_description}")
        
        # Get user profile ID from database
        user_profile_result = await db_service.get_user_profile_by_user_id(user_id, request.jwt_token)
        
        if not user_profile_result.get("success") or not user_profile_result.get("data"):
            raise HTTPException(
                status_code=404,
                detail="User profile not found - please complete onboarding first"
            )
        
        user_profile_id = user_profile_result.get("data", {}).get("id")
        user_profile = user_profile_result.get("data", {})
        logger.info(f"✅ Found user profile ID: {user_profile_id}")
        
        # IDEMPOTENCY CHECK: If plan already exists for this user, return existing plan
        existing_plan_result = await db_service.get_training_plan(user_profile_id)
        if existing_plan_result.get("success") and existing_plan_result.get("data"):
            logger.info(f"⚠️ Training plan already exists for user_profile_id {user_profile_id} - returning existing plan (idempotency)")
            existing_plan = existing_plan_result.get("data")
            
            return {
                "success": True,
                "data": existing_plan,
                "message": "Training plan already exists (returning existing plan)",
                "metadata": {
                    "idempotency": True,
                    "plan_id": existing_plan.get("id"),
                    "reason": "Plan already generated for this user"
                }
            }
        
        # Format responses
        formatted_initial_responses = ResponseFormatter.format_responses(
            request.initial_responses, request.initial_questions
        )
        formatted_follow_up_responses = ResponseFormatter.format_responses(
            request.follow_up_responses, request.follow_up_questions
        )
        
        # Store follow-up responses
        await safe_db_update(
            "Store follow-up responses",
            db_service.update_user_profile,
            user_id=user_id,
            data={"follow_up_responses": request.follow_up_responses},
            jwt_token=request.jwt_token
        )
        
        # Add user_id to personal_info for playbook operations
        personal_info_with_user_id = request.personal_info.model_copy(
            update={"user_id": user_id}
        )
        
        # Check if playbook already exists - if so, skip lesson extraction (performance optimization)
        logger.info("📘 Checking if playbook already exists...")
        existing_playbook = await db_service.load_user_playbook(user_profile_id, request.jwt_token)
        
        # Check if playbook exists in database by comparing user_id
        # If user_id matches, it means playbook was loaded from DB (exists), not newly created
        playbook_exists = (
            existing_playbook 
            and existing_playbook.user_id 
            and existing_playbook.user_id == user_id
        )
        
        if playbook_exists:
            logger.info(f"📘 Playbook already exists (user_id: {existing_playbook.user_id}) with {len(existing_playbook.lessons)} lessons - skipping lesson extraction")
        else:
            # Extract initial lessons from onboarding Q&A (ACE pattern seed lessons) - only if playbook doesn't exist
            logger.info("📘 Extracting initial lessons from onboarding responses...")
            initial_analyses = coach.extract_initial_lessons_from_onboarding(
                personal_info=personal_info_with_user_id,
                formatted_initial_responses=formatted_initial_responses,
                formatted_follow_up_responses=formatted_follow_up_responses,
            )
            
            if initial_analyses and len(initial_analyses) > 0:
                logger.info(f"📘 Extracted {len(initial_analyses)} initial lesson analyses from onboarding")
                
                # Create empty playbook (will be populated by Curator)
                from core.base.schemas.playbook_schemas import UserPlaybook
                empty_playbook = UserPlaybook(
                    user_id=user_id,
                    lessons=[],
                    total_lessons=0,
                )
                
                # Process initial analyses through Curator (deduplication and quality assurance)
                logger.info("📘 Processing initial lessons through Curator...")
                curated_playbook = await coach.curator.process_batch_lessons(
                    analyses=initial_analyses,
                    existing_playbook=empty_playbook,
                    source_plan_id="onboarding",
                )
                
                # Convert curated playbook to UserPlaybook format
                initial_playbook = coach.curator.update_playbook_from_curated(
                    updated_playbook=curated_playbook,
                    user_id=user_id,
                )
                
                logger.info(f"📘 Curated initial playbook: {len(empty_playbook.lessons)} → {len(initial_playbook.lessons)} lessons (deduplicated)")
                
                # Store initial playbook
                await safe_db_update(
                    "Store initial playbook",
                    db_service.update_user_profile,
                    user_id=user_id,
                    data={"user_playbook": initial_playbook.model_dump()},
                    jwt_token=request.jwt_token
                )
                
                # Use the newly created playbook for plan generation
                existing_playbook = initial_playbook
            else:
                # No lessons extracted - create empty playbook
                logger.warning("⚠️ No initial lessons extracted - creating empty playbook")
                from core.base.schemas.playbook_schemas import UserPlaybook
                existing_playbook = UserPlaybook(
                    user_id=user_id,
                    lessons=[],
                    total_lessons=0,
                )
        
        # Generate initial training plan (onboarding - does NOT use playbook)
        result = await coach.generate_initial_training_plan(
            personal_info=personal_info_with_user_id,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            user_profile_id=user_profile_id,
            jwt_token=request.jwt_token,
        )
        
        if not result.get("success"):
            logger.error(f"Training plan generation failed: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to generate training plan")
            )
        
        logger.info("✅ Training plan generated successfully")
        
        # Save training plan to database
        training_plan_data = result.get("training_plan")
        
        # Get playbook from database (created earlier in onboarding)
        user_playbook = None
        if existing_playbook:
            user_playbook = existing_playbook.model_dump()
            logger.info(f"📘 Playbook included with {len(user_playbook.get('lessons', []))} lessons")
        
        save_result = await db_service.save_training_plan(
            user_profile_id=user_profile_id,
            training_plan_data=training_plan_data,
            jwt_token=request.jwt_token,
            user_playbook=user_playbook,
        )
        
        if not save_result.get("success"):
            logger.error(f"❌ Failed to save training plan: {save_result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Training plan generated but failed to save: {save_result.get('error')}"
            )
        
        training_plan_id = save_result.get("data", {}).get("training_plan_id")
        enriched_plan = save_result.get("data", {}).get("training_plan")
        logger.info(f"✅ Training plan saved (ID: {training_plan_id})")
        
        # Set plan_accepted=False since this is a new plan that needs user approval
        await safe_db_update(
            "Set plan_accepted=False for new plan",
            db_service.update_user_profile,
            user_id=user_id,
            data={"plan_accepted": False},
            jwt_token=request.jwt_token
        )
        logger.info("✅ Set plan_accepted=False for new training plan")
        
        # Get completion message from result (generated during plan creation)
        completion_message = result.get("completion_message")
        
        # Use the enriched plan with database IDs (no need to refetch!)
        if enriched_plan:
            logger.info("✅ Using enriched training plan with database IDs (no refetch needed)")
            return {
                "success": True,
                "data": enriched_plan,
                "message": "Training plan generated and saved successfully",
                "completion_message": completion_message,
                "metadata": result.get("metadata", {}),  # Include metadata for frontend
            }
        else:
            # Fallback: fetch if enriched plan not available (shouldn't happen)
            logger.warning("⚠️ Enriched plan not available, falling back to database fetch")
        try:
            complete_plan = await _fetch_complete_training_plan(user_profile_id)
            if complete_plan:
                return {
                    "success": True,
                    "data": complete_plan,
                    "message": "Training plan generated and saved successfully",
                    "completion_message": completion_message,
                        "metadata": result.get("metadata", {}),
                    }
        except Exception as fetch_error:
            logger.error(f"❌ Error fetching complete training plan: {str(fetch_error)}")
            
            # Final fallback
            return {
                    "success": True,
                    "data": training_plan_data,
                    "message": "Training plan generated and saved successfully",
                    "completion_message": completion_message,
                "metadata": result.get("metadata", {}),
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating training plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate training plan: {str(e)}")


@router.get("/playbook/{user_id_param}")
async def get_user_playbook(
    user_id_param: str,
    jwt_token: str,
    coach: TrainingCoach = Depends(get_training_coach),
):
    """
    Get a user's complete playbook with all learned lessons.
    """
    try:
        # Verify JWT token matches user_id
        try:
            token_user_id = extract_user_id_from_jwt(jwt_token)
            if token_user_id != user_id_param:
                return {
                    "success": False,
                    "data": None,
                    "message": "Unauthorized: user_id mismatch",
                }
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}

        # Get user_profile_id from user_id
        user_profile = await db_service.get_user_profile_by_user_id(user_id_param)
        if not user_profile.get("success") or not user_profile.get("data"):
            return {"success": False, "data": None, "message": "User profile not found"}

        user_profile_id = user_profile["data"].get("id")

        # Load playbook from user_profiles
        playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)

        if not playbook or len(playbook.lessons) == 0:
            return {
                "success": True,
                "data": {
                    "user_id": user_id_param,
                    "lessons": [],
                    "total_lessons": 0,
                    "message": "No playbook lessons yet - complete some training first!",
                },
                "message": "Playbook is empty",
            }

        # Get stats
        stats = await coach.get_playbook_stats(user_id_param)

        return {
            "success": True,
            "data": {
                "playbook": playbook.model_dump(),
                "stats": stats.model_dump() if stats else None,
            },
            "message": f"Playbook retrieved with {len(playbook.lessons)} lessons",
        }

    except Exception as e:
        logger.error(f"Error getting user playbook: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to get playbook: {str(e)}",
        }


@router.get("/playbook/stats/{user_id_param}")
async def get_playbook_stats(
    user_id_param: str,
    jwt_token: str,
    coach: TrainingCoach = Depends(get_training_coach),
):
    """
    Get statistics about a user's playbook.
    """
    try:
        # Verify JWT token matches user_id
        try:
            token_user_id = extract_user_id_from_jwt(jwt_token)
            if token_user_id != user_id_param:
                return {
                    "success": False,
                    "data": None,
                    "message": "Unauthorized: user_id mismatch",
                }
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}

        # Get stats
        stats = await coach.get_playbook_stats(user_id_param)

        if not stats:
            return {
                "success": True,
                "data": None,
                "message": "No playbook data available yet",
            }

        return {
            "success": True,
            "data": stats.model_dump(),
            "message": "Playbook statistics retrieved successfully",
        }

    except Exception as e:
        logger.error(f"Error getting playbook stats: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to get playbook stats: {str(e)}",
        }


@router.post("/update-week", response_model=PlanFeedbackResponse)
async def update_week(
    request: PlanFeedbackRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Update an existing week in the training plan based on user feedback.
    
    Updates ONLY the latest week (highest week_number), but returns the full TrainingPlan structure
    with the updated week inserted into the existing plan.
    
    Request includes (same pattern as /generate-plan):
    - feedback_message: User feedback message (required)
    - training_plan: Full training plan data (required)
    - plan_id: Training plan ID (required)
    - initial_responses: Raw responses to initial questions (required)
    - follow_up_responses: Raw responses to follow-up questions (required)
    - initial_questions: Initial questions from frontend (required)
    - follow_up_questions: Follow-up questions from frontend (required)
    - conversation_history: Previous conversation messages for context (optional, default: [])
    - user_profile_id: User profile ID (optional, can be resolved from JWT)
    - jwt_token: JWT token for authentication (required)
    
    week_number is automatically derived from training_plan (latest week = max week_number).
    """
    try:
        # Validate input (same as generate-plan)
        if not request.initial_responses:
            raise HTTPException(status_code=400, detail="Initial responses cannot be empty")
        
        if not request.follow_up_responses:
            raise HTTPException(status_code=400, detail="Follow-up responses cannot be empty")
        
        if not request.initial_questions or not isinstance(request.initial_questions, list):
            raise HTTPException(status_code=400, detail="Invalid initial questions structure")
        
        if not request.follow_up_questions or not isinstance(request.follow_up_questions, list):
            raise HTTPException(status_code=400, detail="Invalid follow-up questions structure")
        
        # Validate JWT token
        if not request.jwt_token:
            raise HTTPException(status_code=401, detail="Missing JWT token")

        logger.info(f"📥 update-week payload keys: {list(request.model_dump().keys())}")

        # Get training plan
        training_plan = request.training_plan
        
        # Get plan_id from request (required)
        try:
            plan_id = int(request.plan_id) if request.plan_id is not None else None
        except Exception:
            plan_id = None
        
        if plan_id is None:
            raise HTTPException(status_code=400, detail="Missing or invalid plan_id in request")
        
        # Derive week_number from training_plan (latest week = max week_number)
        week_number = None
        if isinstance(training_plan, dict):
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if weekly_schedules:
                week_numbers = [w.get("week_number", 0) for w in weekly_schedules if w.get("week_number")]
                week_number = max(week_numbers) if week_numbers else None
        
        if week_number is None:
            raise HTTPException(status_code=400, detail="Could not determine week_number from training_plan (no weekly_schedules found)")
        
        # Get current_week (latest week) from training_plan
        current_week = None
        if isinstance(training_plan, dict):
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if weekly_schedules:
                # Find the week with the highest week_number
                latest_week = max(weekly_schedules, key=lambda w: w.get("week_number", 0))
                current_week = latest_week
        
        if not current_week:
            raise HTTPException(status_code=400, detail="Could not determine current_week from training_plan")
        
        # Get required fields
        feedback_message = request.feedback_message
        conversation_history = request.conversation_history or []

        # STAGE 1: Lightweight intent classification (FAST: 2-3s)
        # Include training plan so AI can answer questions about it
        logger.info("🔍 Stage 1: Classifying feedback intent (lightweight)...")
        classification_result = await coach.classify_feedback_intent_lightweight(
            feedback_message=feedback_message,
            conversation_history=conversation_history,
            training_plan=training_plan  # Include plan for answering questions
        )
        
        logger.info(f"✅ Stage 1 complete: intent={classification_result.get('intent')}, confidence={classification_result.get('confidence')}, needs_plan_update={classification_result.get('needs_plan_update')}")
        
        # Handle satisfied or navigate_to_main_app intents (no plan update needed)
        if classification_result.get("intent") == "satisfied" or classification_result.get("action") == "navigate_to_main_app" or classification_result.get("navigate_to_main_app"):
            logger.info("✅ User satisfied - setting plan_accepted=True and navigating to main app")
            
            # Extract user_id from JWT for database update
            user_id = extract_user_id_from_jwt(request.jwt_token)
            
            # Set plan_accepted=True in database
            if user_id:
                await safe_db_update(
                    "Set plan_accepted=True for satisfied user",
                    db_service.update_user_profile,
                    user_id=user_id,
                    data={"plan_accepted": True},
                    jwt_token=request.jwt_token
                )
                logger.info("✅ Set plan_accepted=True - user satisfied with plan")
            
            # Extract lessons from conversation history (if conversation exists)
            if conversation_history and len(conversation_history) > 0:
                try:
                    logger.info(f"📘 Extracting lessons from conversation history ({len(conversation_history)} messages)")
                    
                    # Get user_profile_id for playbook operations
                    try:
                        user_profile_id = int(request.user_profile_id) if request.user_profile_id is not None else None
                    except Exception:
                        user_profile_id = None
                    
                    if user_profile_id is None:
                        try:
                            profile_res = await db_service.get_user_profile_by_user_id(user_id, request.jwt_token)
                            if profile_res and profile_res.get("success") and profile_res.get("data"):
                                user_profile_id = profile_res["data"].get("id")
                        except Exception as e:
                            logger.warning(f"Could not resolve user_profile_id from JWT: {e}")
                    
                    if user_profile_id:
                        # Get user profile to extract personal info
                        profile_response = await db_service.get_user_profile_by_id(user_profile_id)
                        if profile_response and profile_response.get("success"):
                            user_profile = profile_response.get("data", {})
                            
                            # Create PersonalInfo object
                            personal_info = PersonalInfo(
                                user_id=user_profile.get("user_id"),
                                username=user_profile.get("username", "User"),
                                age=user_profile.get("age"),
                                weight=user_profile.get("weight"),
                                weight_unit=user_profile.get("weight_unit", "kg"),
                                height=user_profile.get("height"),
                                height_unit=user_profile.get("height_unit", "cm"),
                                gender=user_profile.get("gender"),
                                experience_level=user_profile.get("experience_level", "beginner"),
                                goal_description=user_profile.get("goal_description", "improve fitness"),
                                measurement_system=user_profile.get("measurement_system", "metric"),
                            )
                            
                            # Load existing playbook
                            existing_playbook = await db_service.load_user_playbook(user_profile_id, request.jwt_token)
                            
                            # Extract lessons from conversation history (returns ReflectorAnalysis)
                            conversation_analyses = coach.extract_lessons_from_conversation_history(
                                conversation_history=conversation_history,
                                personal_info=personal_info,
                                accepted_training_plan=training_plan,
                                existing_playbook=existing_playbook,
                            )
                            
                            if conversation_analyses and len(conversation_analyses) > 0:
                                logger.info(f"📘 Extracted {len(conversation_analyses)} lesson analyses from conversation history")
                                
                                # Process analyses through Curator (single LLM call - returns curated playbook)
                                updated_playbook_curated = await coach.curator.process_batch_lessons(
                                    analyses=conversation_analyses,
                                    existing_playbook=existing_playbook,
                                    source_plan_id=str(training_plan.get("id", "unknown")),
                                )
                                
                                # Convert curated playbook to UserPlaybook format
                                from core.base.schemas.playbook_schemas import UserPlaybook
                                updated_playbook = coach.curator.update_playbook_from_curated(
                                    updated_playbook=updated_playbook_curated,
                                    user_id=user_id,
                                )
                                
                                # Save updated playbook
                                await safe_db_update(
                                    "Update playbook with conversation lessons",
                                    db_service.update_user_profile,
                                    user_id=user_id,
                                    data={"user_playbook": updated_playbook.model_dump()},
                                    jwt_token=request.jwt_token
                                )
                                
                                logger.info(f"✅ Updated playbook with {len(updated_playbook.lessons)} total lessons ({len(existing_playbook.lessons)} → {len(updated_playbook.lessons)})")
                            else:
                                logger.info("📘 No lessons extracted from conversation history")
                    else:
                        logger.warning("⚠️ Could not resolve user_profile_id - skipping conversation lesson extraction")
                        
                except Exception as e:
                    logger.error(f"❌ Error extracting lessons from conversation history: {e}", exc_info=True)
                    # Continue - don't block navigation if lesson extraction fails
            else:
                logger.info("📘 No conversation history provided - skipping lesson extraction")
            
            # Return response with navigate_to_main_app=True
            ai_message = classification_result.get("ai_message", "Amazing! You're all set. I'll take you to your main dashboard now. 🚀")
            
            # Ensure frontend shows the AI answer: mirror ai_response into plan ai_message (response only)
            logger.info(f"🔄 [satisfied] Creating plan_response from training_plan (type: {type(training_plan)})")
            plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
            logger.info(f"🔄 [satisfied] plan_response type: {type(plan_response)}")
            if isinstance(plan_response, dict):
                logger.info(f"🔄 [satisfied] plan_response keys: {list(plan_response.keys())}")
                logger.info(f"🔄 [satisfied] plan_response id: {plan_response.get('id')}")
                logger.info(f"🔄 [satisfied] plan_response has weekly_schedules: {bool(plan_response.get('weekly_schedules'))}")
                if plan_response.get('weekly_schedules'):
                    logger.info(f"🔄 [satisfied] plan_response weekly_schedules count: {len(plan_response.get('weekly_schedules', []))}")
                else:
                    logger.error(f"❌ [satisfied] plan_response missing weekly_schedules! Keys: {list(plan_response.keys())}")
            if ai_message:
                plan_response['ai_message'] = ai_message
                logger.info(f"🔄 [satisfied] Added ai_message to plan_response")
            
            logger.info(f"📤 [satisfied] Returning plan_response with {len(plan_response.keys()) if isinstance(plan_response, dict) else 'N/A'} keys")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,  # safe to return; contains ai_message matching ai_response
                navigate_to_main_app=True
            )
        
        # Handle respond_only intent (no plan update, just return AI message)
        if classification_result.get("action") == "respond_only" and not classification_result.get("needs_plan_update"):
            ai_message = classification_result.get("ai_message", "Got it! Let me know if you'd like to make any changes. 💪")
            logger.info(f"💬 Respond-only intent - returning AI message without plan update. ai_message: {ai_message[0:50]}...")
            
            # Ensure frontend shows the AI answer: mirror ai_response into plan ai_message (response only)
            logger.info(f"🔄 [respond_only] Creating plan_response from training_plan (type: {type(training_plan)})")
            plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
            logger.info(f"🔄 [respond_only] plan_response type: {type(plan_response)}")
            if isinstance(plan_response, dict):
                logger.info(f"🔄 [respond_only] plan_response keys: {list(plan_response.keys())}")
                logger.info(f"🔄 [respond_only] plan_response id: {plan_response.get('id')}")
                logger.info(f"🔄 [respond_only] plan_response has weekly_schedules: {bool(plan_response.get('weekly_schedules'))}")
                if plan_response.get('weekly_schedules'):
                    logger.info(f"🔄 [respond_only] plan_response weekly_schedules count: {len(plan_response.get('weekly_schedules', []))}")
                else:
                    logger.error(f"❌ [respond_only] plan_response missing weekly_schedules! Keys: {list(plan_response.keys())}")
            if ai_message:
                plan_response['ai_message'] = ai_message
                logger.info(f"🔄 [respond_only] Added ai_message to plan_response")
            
            logger.info(f"📤 [respond_only] Returning plan_response with {len(plan_response.keys()) if isinstance(plan_response, dict) else 'N/A'} keys")
            
            # Deep validation: check if weekly_schedules has complete structure
            if isinstance(plan_response, dict) and plan_response.get('weekly_schedules'):
                weekly_schedules = plan_response.get('weekly_schedules', [])
                logger.info(f"📤 [respond_only] weekly_schedules type: {type(weekly_schedules)}, length: {len(weekly_schedules)}")
                if weekly_schedules and len(weekly_schedules) > 0:
                    first_week = weekly_schedules[0]
                    logger.info(f"📤 [respond_only] First week keys: {list(first_week.keys()) if isinstance(first_week, dict) else 'N/A'}")
                    logger.info(f"📤 [respond_only] First week has daily_trainings: {bool(first_week.get('daily_trainings') if isinstance(first_week, dict) else False)}")
                    if isinstance(first_week, dict) and first_week.get('daily_trainings'):
                        daily_trainings = first_week.get('daily_trainings', [])
                        logger.info(f"📤 [respond_only] First week daily_trainings count: {len(daily_trainings)}")
                        if len(daily_trainings) > 0:
                            first_day = daily_trainings[0]
                            logger.info(f"📤 [respond_only] First day keys: {list(first_day.keys()) if isinstance(first_day, dict) else 'N/A'}")
                            if isinstance(first_day, dict):
                                strength_exercises = first_day.get('strength_exercises')
                                endurance_sessions = first_day.get('endurance_sessions')
                                logger.info(f"📤 [respond_only] First day strength_exercises type: {type(strength_exercises)}, length: {len(strength_exercises) if isinstance(strength_exercises, list) else 'N/A'}")
                                logger.info(f"📤 [respond_only] First day endurance_sessions type: {type(endurance_sessions)}, length: {len(endurance_sessions) if isinstance(endurance_sessions, list) else 'N/A'}")
                                # Only log error if key is missing (None) - empty lists are valid (rest days or days without endurance)
                                if strength_exercises is None:
                                    logger.error(f"❌ [respond_only] First day strength_exercises key is MISSING (None)!")
                                if endurance_sessions is None:
                                    logger.error(f"❌ [respond_only] First day endurance_sessions key is MISSING (None)!")
            
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,  # safe to return; contains ai_message matching ai_response
                navigate_to_main_app=False
            )
        
        # Handle unclear intent (ask for clarification)
        if classification_result.get("intent") == "unclear":
            ai_message = classification_result.get("ai_message", "I'm having trouble understanding your feedback. Could you please be more specific about what you'd like to change or know? 😊")
            logger.info(f"❓ Unclear intent - asking for clarification. ai_message: {ai_message[0:50]}...")
            
            # Ensure frontend shows the AI answer: mirror ai_response into plan ai_message (response only)
            logger.info(f"🔄 [unclear] Creating plan_response from training_plan (type: {type(training_plan)})")
            plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
            logger.info(f"🔄 [unclear] plan_response type: {type(plan_response)}")
            if isinstance(plan_response, dict):
                logger.info(f"🔄 [unclear] plan_response keys: {list(plan_response.keys())}")
                logger.info(f"🔄 [unclear] plan_response id: {plan_response.get('id')}")
                logger.info(f"🔄 [unclear] plan_response has weekly_schedules: {bool(plan_response.get('weekly_schedules'))}")
            if ai_message:
                plan_response['ai_message'] = ai_message
                logger.info(f"🔄 [unclear] Added ai_message to plan_response")
            
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,  # safe to return; contains ai_message matching ai_response
                navigate_to_main_app=False
            )
        
        # STAGE 2: Plan update (only if needs_plan_update=True)
        if not classification_result.get("needs_plan_update"):
            # If we reach here and needs_plan_update=False, return AI message without update
            logger.info("⚠️ Classification says no plan update needed, but reached update logic - returning AI message")
            ai_message = classification_result.get("ai_message", "Got it! Let me know if you'd like to make any changes. 💪")
            
            # Ensure frontend shows the AI answer: mirror ai_response into plan ai_message (response only)
            logger.info(f"🔄 [fallback] Creating plan_response from training_plan (type: {type(training_plan)})")
            plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
            logger.info(f"🔄 [fallback] plan_response type: {type(plan_response)}")
            if isinstance(plan_response, dict):
                logger.info(f"🔄 [fallback] plan_response keys: {list(plan_response.keys())}")
                logger.info(f"🔄 [fallback] plan_response id: {plan_response.get('id')}")
                logger.info(f"🔄 [fallback] plan_response has weekly_schedules: {bool(plan_response.get('weekly_schedules'))}")
            if ai_message:
                plan_response['ai_message'] = ai_message
                logger.info(f"🔄 [fallback] Added ai_message to plan_response")
            
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,  # safe to return; contains ai_message matching ai_response
                navigate_to_main_app=False
            )
        
        logger.info("🔁 Stage 2: Updating week based on feedback...")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        # Coerce user_profile_id with fallbacks
        try:
            user_profile_id = int(request.user_profile_id) if request.user_profile_id is not None else None
        except Exception:
            user_profile_id = None

        # If user_profile_id missing, try to resolve from JWT
        if user_profile_id is None:
            try:
                profile_res = await db_service.get_user_profile_by_user_id(user_id, request.jwt_token)
                if profile_res and profile_res.get("success") and profile_res.get("data"):
                    user_profile_id = profile_res["data"].get("id")
            except Exception as e:
                logger.warning(f"Could not resolve user_profile_id from JWT: {e}")

        # Validate required fields
        if user_profile_id is None:
            raise HTTPException(status_code=400, detail="Invalid or missing user_profile_id")

        logger.info(f"Updating Week {week_number} (latest) for user {user_profile_id}, plan {plan_id}")
        
        # Get user profile to extract personal info
        profile_response = await db_service.get_user_profile_by_id(user_profile_id)
        if not profile_response or not profile_response.get("success"):
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )
        
        user_profile = profile_response.get("data", {})
        
        # Create PersonalInfo object from user profile
        personal_info = PersonalInfo(
            user_id=user_profile.get("user_id"),
            username=user_profile.get("username", "User"),
            age=user_profile.get("age"),
            weight=user_profile.get("weight"),
            weight_unit=user_profile.get("weight_unit", "kg"),
            height=user_profile.get("height"),
            height_unit=user_profile.get("height_unit", "cm"),
            gender=user_profile.get("gender"),
            experience_level=user_profile.get("experience_level", "beginner"),
            goal_description=user_profile.get("goal_description", "improve fitness"),
            measurement_system=user_profile.get("measurement_system", "metric"),
        )
        
        # Format responses (same as generate-plan - from request, not database)
        formatted_initial_responses = ResponseFormatter.format_responses(
            request.initial_responses, request.initial_questions
        )
        formatted_follow_up_responses = ResponseFormatter.format_responses(
            request.follow_up_responses, request.follow_up_questions
        )

        # Update the week using the new method (includes onboarding responses like initial generation)
        # Pass training_plan from request instead of fetching from database
        result = await coach.update_weekly_schedule(
            personal_info=personal_info,
            feedback_message=feedback_message,
            week_number=week_number,
            current_week=current_week,
            user_profile_id=user_profile_id,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            existing_training_plan=training_plan,  # Use training plan from request
            jwt_token=request.jwt_token,
            conversation_history=conversation_history,
        )

        if not result.get("success"):
            logger.error(f"Week update failed: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to update week")
            )

        logger.info(f"✅ Week {week_number} updated successfully")

        # Get the updated full training plan
        updated_plan_data = result.get("training_plan")

        # Update only the specified week in the database
        if plan_id and updated_plan_data:
            # Prepare plan to save WITHOUT ai_message (never persist)
            plan_to_save = dict(updated_plan_data)
            plan_to_save.pop('ai_message', None)
            
            update_result_db = await db_service.update_training_plan(
                plan_id,
                plan_to_save,
                jwt_token=request.jwt_token
            )
            
            if update_result_db is None:
                raise Exception("Failed to update plan in database")
            
            logger.info(f"✅ Plan updated in database successfully")
            
            # Use the enriched plan returned by update_training_plan
            enriched_plan = update_result_db
            logger.info("✅ Using enriched training plan returned by update (IDs present)")

            # Add ai_message from coach result (AI-generated, not persisted)
            # Prioritize ai_message from update result (explains changes), fallback to classification ai_message
            ai_message = result.get("ai_message") or classification_result.get("ai_message")
            if ai_message:
                try:
                    enriched_plan['ai_message'] = ai_message
                except Exception:
                    pass

            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message or "I've updated your week! Take a look and let me know if you'd like any other changes. 💪",
                plan_updated=True,
                updated_plan=enriched_plan,
                navigate_to_main_app=False
            )
        else:
            # Return the plan even if DB update fails (shouldn't happen)
            # Prioritize ai_message from update result, fallback to classification ai_message
            ai_message = result.get("ai_message") or classification_result.get("ai_message") or "I've updated your week! Take a look and let me know if you'd like any other changes. 💪"
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=True,
                updated_plan=updated_plan_data,
                navigate_to_main_app=False
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating week: {str(e)}")
        return PlanFeedbackResponse(
            success=False,
            ai_response="",
            plan_updated=False,
            updated_plan=None,
            error=str(e)
        )


@router.post("/create-week")
async def create_week(
    request: dict,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Create a new week when the previous week is completed.
    
    Creates ONLY the next week (Week 2, 3, 4, etc.), but returns the full TrainingPlan structure
    with the new week added to the existing plan.
    
    Request should include:
    - training_plan: Full training plan data (required)
    - user_profile_id: User profile ID (optional, can be resolved from JWT)
    - jwt_token: JWT token for authentication (required)
    
    plan_id and next_week_number are automatically derived from training_plan:
    - plan_id: from training_plan.id
    - next_week_number: calculated from existing weeks (max week_number + 1)
    """
    try:
        # Validate JWT token
        jwt_token = request.get("jwt_token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Missing JWT token")

        logger.info(f"📥 create-week payload keys: {list(request.keys())}")

        # Get training plan
        training_plan = request.get("training_plan")
        if not training_plan:
            raise HTTPException(status_code=400, detail="Missing training_plan in request")
        
        # Get plan_id from request (required)
        plan_id = request.get("plan_id")
        try:
            if plan_id is not None:
                plan_id = int(plan_id)
        except Exception:
            plan_id = None
        
        if plan_id is None:
            raise HTTPException(status_code=400, detail="Missing or invalid plan_id in request")

        # Coerce user_profile_id with fallbacks
        user_profile_id = request.get("user_profile_id")
        try:
            if user_profile_id is not None:
                user_profile_id = int(user_profile_id)
        except Exception:
            user_profile_id = None

        # If user_profile_id missing, try to resolve from JWT
        if user_profile_id is None:
            try:
                token_user_id = extract_user_id_from_jwt(jwt_token)
                profile_res = await db_service.get_user_profile_by_user_id(token_user_id, jwt_token)
                if profile_res and profile_res.get("success") and profile_res.get("data"):
                    user_profile_id = profile_res["data"].get("id")
            except Exception as e:
                logger.warning(f"Could not resolve user_profile_id from JWT: {e}")

        # Validate required fields
        if user_profile_id is None:
            raise HTTPException(status_code=400, detail="Invalid or missing user_profile_id")

        # Get user profile to extract personal info
        profile_response = await db_service.get_user_profile_by_id(user_profile_id)
        if not profile_response or not profile_response.get("success"):
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )

        user_profile = profile_response.get("data", {})

        # Create PersonalInfo object from user profile
        personal_info = PersonalInfo(
            user_id=user_profile.get("user_id"),
            username=user_profile.get("username", "User"),
            age=user_profile.get("age"),
            weight=user_profile.get("weight"),
            weight_unit=user_profile.get("weight_unit", "kg"),
            height=user_profile.get("height"),
            height_unit=user_profile.get("height_unit", "cm"),
            gender=user_profile.get("gender"),
            experience_level=user_profile.get("experience_level", "beginner"),
            goal_description=user_profile.get("goal_description", "improve fitness"),
            measurement_system=user_profile.get("measurement_system", "metric"),
        )

        # Create the new week using the new method
        # next_week_number, completed_weeks are calculated internally from the training plan
        result = await coach.create_new_weekly_schedule(
            personal_info=personal_info,
            user_profile_id=user_profile_id,
            jwt_token=jwt_token,
        )

        if not result.get("success"):
            logger.error(f"Week creation failed: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to create new week")
            )

        # Get next_week_number from result metadata or calculate from updated plan
        updated_plan_data = result.get("training_plan")
        next_week_number = result.get("metadata", {}).get("next_week_number")
        if not next_week_number and updated_plan_data:
            # Calculate from the plan if not in metadata
            weekly_schedules = updated_plan_data.get("weekly_schedules", [])
            if weekly_schedules:
                week_numbers = [w.get("week_number", 0) for w in weekly_schedules]
                next_week_number = max(week_numbers) if week_numbers else 1

        logger.info(f"✅ Week {next_week_number} created successfully")

        # Update the plan in the database with the new week
        if plan_id and updated_plan_data:
            # Prepare plan to save WITHOUT ai_message (never persist)
            plan_to_save = dict(updated_plan_data)
            plan_to_save.pop('ai_message', None)

            update_result_db = await db_service.update_training_plan(
                plan_id,
                plan_to_save,
                jwt_token=jwt_token
            )

            if update_result_db is None:
                raise Exception("Failed to update plan in database")

            logger.info(f"✅ Plan updated in database successfully")

            # Use the enriched plan returned by update_training_plan
            enriched_plan = update_result_db
            logger.info("✅ Using enriched training plan returned by update (IDs present)")

            return {
                "success": True,
                "data": enriched_plan,
                "message": f"Week {next_week_number} created successfully",
                "metadata": result.get("metadata", {}),
            }
        else:
            # Return the plan even if DB update fails (shouldn't happen)
            return {
                "success": True,
                "data": updated_plan_data,
                "message": f"Week {next_week_number} created successfully",
                "metadata": result.get("metadata", {}),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating new week: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create new week: {str(e)}")
