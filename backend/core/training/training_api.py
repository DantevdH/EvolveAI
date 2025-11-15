"""
training API Endpoints

Handles the complete training workflow with a clean, unified interface:
- Initial Questions (AI-generated)
- Follow-up Questions (AI-generated)
- Plan Generation (AI)
"""

import asyncio
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import os
import jwt
import copy
import inspect

from core.training.schemas.question_schemas import (
    InitialQuestionsRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PlanFeedbackRequest,
    PlanFeedbackResponse,
    CreateWeekRequest,
    PersonalInfo,
    AIQuestion,
    QuestionType,
)
from core.training.training_coach import TrainingCoach
from core.training.schemas.training_schemas import TrainingPlan
from core.training.helpers.database_service import db_service
# Format responses
from core.training.helpers.response_formatter import ResponseFormatter
from core.base.schemas.playbook_schemas import UserPlaybook
from settings import settings

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
    Extract and verify user_id from JWT token.
    
    Raises HTTPException(401) if token is invalid.
    """
    try:
        # Verify JWT token signature if JWT secret is available
        jwt_secret = settings.SUPABASE_JWT_SECRET
        
        if jwt_secret:
            # Verify signature and decode token
            try:
                decoded_token = jwt.decode(
                    jwt_token,
                    jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_signature": True, "verify_exp": True, "verify_iat": True}
                )
            except jwt.ExpiredSignatureError:
                logger.error("❌ JWT token has expired")
                raise HTTPException(status_code=401, detail="JWT token has expired")
            except jwt.InvalidTokenError as e:
                logger.error(f"❌ Invalid JWT token: {str(e)}")
                raise HTTPException(status_code=401, detail="Invalid JWT token")
        else:
            # Fallback: decode without verification (less secure, but allows development)
            logger.warning("⚠️  SUPABASE_JWT_SECRET not set - JWT verification disabled (not recommended for production)")
            decoded_token = jwt.decode(jwt_token, options={"verify_signature": False})
        
        user_id = decoded_token.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="No user_id found in JWT token")
        
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ JWT token error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid JWT token")


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
        # Use same serialization as API response to ensure multiselect is preserved
        serialized_questions_for_storage = []
        for q in questions_response.questions:
            sq = q.model_dump(exclude_none=False, mode='json')
            # Safety check: ensure multiselect is included for multiple_choice/dropdown
            if q.response_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN]:
                if 'multiselect' not in sq or sq.get('multiselect') is None:
                    sq['multiselect'] = q.multiselect
            serialized_questions_for_storage.append(sq)
        
        await safe_db_update(
            "Store initial questions",
            db_service.update_user_profile,
            user_id=user_id,
            data={
                "initial_questions": {
                    "questions": serialized_questions_for_storage,
                    "ai_message": questions_response.ai_message,
                }
            },
            jwt_token=request.jwt_token
        )
        
        logger.info(f"✅ Generated {questions_response.total_questions} initial questions")
        
        # Explicitly serialize questions to ensure multiselect is included
        # Use exclude_none=False to ensure all fields including multiselect are included
        serialized_questions = []
        for q in questions_response.questions:
            sq = q.model_dump(exclude_none=False, mode='json')
            # Safety check: ensure multiselect is included for multiple_choice/dropdown
            if q.response_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN]:
                if 'multiselect' not in sq or sq.get('multiselect') is None:
                    sq['multiselect'] = q.multiselect
            serialized_questions.append(sq)
        
        return {
            "success": True,
            "data": {
                "questions": serialized_questions,
                "total_questions": questions_response.total_questions,
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": questions_response.ai_message,
                "user_profile_id": user_profile_id,  # Return profile ID for frontend state management
            },
            "message": "Initial questions generated successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating initial questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate initial questions: {str(e)}")


 


@router.post("/generate-plan")
async def generate_training_plan(
    request: PlanGenerationRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate the final training plan using initial questions and exercises."""
    try:
        # Validate input
        if not request.initial_responses:
            raise HTTPException(status_code=400, detail="Initial responses cannot be empty")

        if not request.initial_questions or not isinstance(request.initial_questions, list):
            raise HTTPException(status_code=400, detail="Invalid initial questions structure")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        logger.info(f"Generating training plan for: {request.personal_info.goal_description}")
        
        # OPTIMIZATION: user_profile_id should be provided by frontend
        if not request.user_profile_id:
            logger.error("❌ Missing user_profile_id in request - this should be provided by frontend")
            raise HTTPException(
                status_code=400,
                detail="Missing user_profile_id in request"
            )
        
        user_profile_id = request.user_profile_id
        logger.info(f"✅ Using user_profile_id from request: {user_profile_id}")
        
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
        
        # Store initial responses (non-critical)
        await safe_db_update(
            "Store initial responses",
            db_service.update_user_profile,
            user_id=user_id,
            data={"initial_responses": request.initial_responses},
            jwt_token=request.jwt_token
        )

        # Add user_id to personal_info for playbook operations
        personal_info_with_user_id = request.personal_info.model_copy(
            update={"user_id": user_id}
        )
        
        async def build_initial_playbook_async():
            """Run the playbook extraction/curation pipeline without blocking plan generation."""
            try:
                logger.info("📘 (async) START playbook generation")
                # yield control immediately so other background tasks can start
                await asyncio.sleep(0)
                # extract initial analyses (may be sync or async)
                if inspect.iscoroutinefunction(coach.extract_initial_lessons_from_onboarding):
                    initial_analyses = await coach.extract_initial_lessons_from_onboarding(
                        personal_info=personal_info_with_user_id,
                        formatted_initial_responses=formatted_initial_responses,
                    )
                else:
                    initial_analyses = await asyncio.to_thread(
                        coach.extract_initial_lessons_from_onboarding,
                        personal_info_with_user_id,
                        formatted_initial_responses,
                    )

                if not initial_analyses or len(initial_analyses) == 0:
                    logger.warning("⚠️ (async) No initial lessons extracted - skipping playbook creation")
                    return

                from core.base.schemas.playbook_schemas import UserPlaybook

                empty_playbook = UserPlaybook(
                    user_id=user_id,
                    lessons=[],
                    total_lessons=0,
                )

                logger.info("📘 (async) Processing initial lessons through Curator...")
                # process_batch_lessons may be sync or async (LLM wrappers sometimes sync)
                if inspect.iscoroutinefunction(coach.curator.process_batch_lessons):
                    curated_playbook = await coach.curator.process_batch_lessons(
                        analyses=initial_analyses,
                        existing_playbook=empty_playbook,
                        source_plan_id="onboarding",
                    )
                else:
                    curated_playbook = await asyncio.to_thread(
                        coach.curator.process_batch_lessons,
                        initial_analyses,
                        empty_playbook,
                        "onboarding",
                    )

                initial_playbook = coach.curator.update_playbook_from_curated(
                    updated_playbook=curated_playbook,
                    user_id=user_id,
                )

                if settings.PLAYBOOK_CONTEXT_MATCHING_ENABLED:
                    logger.info("📘 (async) Enriching lessons with knowledge base context...")
                    if inspect.iscoroutinefunction(coach.curator.enrich_lessons_with_context):
                        initial_playbook = await coach.curator.enrich_lessons_with_context(
                            playbook=initial_playbook,
                            rag_service=coach.rag_service,
                        )
                    else:
                        initial_playbook = await asyncio.to_thread(
                            coach.curator.enrich_lessons_with_context,
                            initial_playbook,
                            coach.rag_service,
                        )
                else:
                    logger.info("📘 (async) Playbook context enrichment disabled; skipping knowledge base matching.")

                logger.info(
                    f"📘 (async) Curated initial playbook: {len(empty_playbook.lessons)} → {len(initial_playbook.lessons)} lessons (deduplicated)"
                )

                await safe_db_update(
                    "Store initial playbook",
                    db_service.update_user_profile,
                    user_id=user_id,
                    data={"user_playbook": initial_playbook.model_dump()},
                    jwt_token=request.jwt_token
                )
                logger.info("✅ (async) Playbook stored successfully")
            except Exception as async_error:
                logger.error(f"❌ (async) Playbook generation failed: {str(async_error)}")
        # Start playbook generation immediately (runs in background while we save plan)
        playbook_task = asyncio.create_task(build_initial_playbook_async())
        def _task_done_logger(task: asyncio.Task, label: str):
            try:
                task.result()
            except Exception as task_err:
                logger.error(f"❌ Background task {label} failed: {task_err}")
        playbook_task.add_done_callback(lambda t: _task_done_logger(t, "playbook"))

        # === PHASE 1: Generate Week 1 (SYNCHRONOUS) ===
        result = await coach.generate_initial_training_plan(
            personal_info=personal_info_with_user_id,
            formatted_initial_responses=formatted_initial_responses,
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
        
        # Save to DB immediately to get training_plan_id
        training_plan_data = result.get("training_plan")
        
        save_result = await db_service.save_training_plan(
            user_profile_id=user_profile_id,
            training_plan_data=training_plan_data,
            jwt_token=request.jwt_token,
            user_playbook=None,  # Generated asynchronously
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
        
        # Set plan_accepted=False
        await safe_db_update(
            "Set plan_accepted=False for new plan",
            db_service.update_user_profile,
            user_id=user_id,
            data={"plan_accepted": False},
            jwt_token=request.jwt_token
        )
        logger.info("✅ Set plan_accepted=False for new training plan")
        
        # === PHASE 2: Background Tasks (ASYNCHRONOUS, PARALLEL) ===
        async def build_plan_outline_async(plan_id: int):
            """Generate future week outlines and append to weekly_schedules table."""
            try:
                logger.info("📘 (async) START outline generation")
                # yield control immediately so other background tasks can start
                await asyncio.sleep(0)
                # _generate_future_week_outlines may be async or sync
                if inspect.iscoroutinefunction(coach._generate_future_week_outlines):
                    outline_payload = await coach._generate_future_week_outlines(
                        personal_info=personal_info_with_user_id,
                        formatted_initial_responses=formatted_initial_responses,
                        existing_plan=training_plan_data,
                        outline_weeks=12,
                    )
                else:
                    outline_payload = await asyncio.to_thread(
                        coach._generate_future_week_outlines,
                        personal_info_with_user_id,
                        formatted_initial_responses,
                        training_plan_data,
                        12,
                    )
                
                # Append outline weeks (2-13) to weekly_schedules table
                future_weeks = outline_payload.get("weekly_schedules", [])
                if future_weeks:
                    for week_data in future_weeks:
                        week_data["training_plan_id"] = plan_id
                        week_data["daily_trainings"] = []  # Outline only, no exercises
                    
                    result = await db_service.append_weekly_schedules(
                        training_plan_id=plan_id,
                        weekly_schedules=future_weeks,
                        jwt_token=request.jwt_token,
                    )
                    
                    if result.get("success"):
                        logger.info(
                            "✅ (async) Appended %s future week outlines to weekly_schedules",
                            len(future_weeks),
                        )
                    else:
                        logger.error(f"❌ (async) Failed to append outlines: {result.get('error')}")
            except Exception as async_error:
                logger.error(f"❌ (async) Plan outline generation failed: {async_error}")
        
        # Start outline generation now that plan is saved (playbook already started)
        outline_task = asyncio.create_task(build_plan_outline_async(training_plan_id))
        outline_task.add_done_callback(lambda t: _task_done_logger(t, "outline"))
        
        # Get completion message from result (generated during plan creation)
        completion_message = result.get("completion_message")
        
        # Use the enriched plan with database IDs (no need to refetch!)
        if enriched_plan:
            logger.info("✅ Using enriched training plan with database IDs (no refetch needed)")
            return {
                "success": True,
                "data": enriched_plan,
                "playbook": None,
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
                    "playbook": None,
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
                "playbook": None,
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


def _create_plan_response(training_plan: Any, ai_message: str, context: str = "") -> Dict[str, Any]:
    """Helper to create plan_response with ai_message for various intents."""
    logger.info(f"🔄 [{context}] Creating plan_response from training_plan (type: {type(training_plan)})")
    plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
    if isinstance(plan_response, dict) and ai_message:
        plan_response['ai_message'] = ai_message
    return plan_response


async def _handle_playbook_extraction_for_satisfied(
    user_id: str,
    request: PlanFeedbackRequest,
    training_plan: Dict[str, Any],
    conversation_history: list,
    coach: TrainingCoach
) -> Optional[Dict[str, Any]]:
    """
    Extract and update playbook from conversation history when user is satisfied.
    Returns updated_playbook dict or None.
    """
    updated_playbook = None
    
    if not conversation_history or len(conversation_history) == 0:
        logger.info("📘 No conversation history provided - skipping lesson extraction")
        return updated_playbook
    
    try:
        logger.info(f"📘 Extracting lessons from conversation history ({len(conversation_history)} messages)")
        
        # OPTIMIZATION: user_profile_id is already validated in parent /update-week endpoint
        # No need for fallback DB call
        try:
            user_profile_id = int(request.user_profile_id) if request.user_profile_id is not None else None
        except Exception:
            user_profile_id = None
        
        if not user_profile_id:
            logger.error("❌ Missing user_profile_id in request - this should be provided by frontend")
            return updated_playbook
        
        # OPTIMIZATION: personal_info should be provided by frontend
        if not request.personal_info:
            logger.error("❌ Missing personal_info in request - this should be provided by frontend")
            return updated_playbook
        
        personal_info = request.personal_info
        logger.info("✅ Using personal_info from request")
        
        # OPTIMIZATION: playbook should be provided by frontend
        if not request.playbook:
            logger.error("❌ Missing playbook in request - this should be provided by frontend")
            return updated_playbook
        
        existing_playbook = UserPlaybook(**request.playbook)
        logger.info("✅ Using playbook from request")
        
        # Extract lessons from conversation history
        conversation_analyses = await coach.extract_lessons_from_conversation_history(
            conversation_history=conversation_history,
            personal_info=personal_info,
            accepted_training_plan=training_plan,
            existing_playbook=existing_playbook,
        )
        
        if conversation_analyses and len(conversation_analyses) > 0:
            logger.info(f"📘 Extracted {len(conversation_analyses)} lesson analyses from conversation history")
            
            # Process analyses through Curator
            updated_playbook_curated = await coach.curator.process_batch_lessons(
                analyses=conversation_analyses,
                existing_playbook=existing_playbook,
                source_plan_id=str(training_plan.get("id", "unknown")),
            )
            
            # Convert curated playbook to UserPlaybook format
            curated_playbook = coach.curator.update_playbook_from_curated(
                updated_playbook=updated_playbook_curated,
                user_id=user_id,
            )
            
            # Enrich lessons with context (RAG retrieval and validation)
            if settings.PLAYBOOK_CONTEXT_MATCHING_ENABLED:
                logger.info("📘 Enriching lessons with context from knowledge base...")
                curated_playbook = await coach.curator.enrich_lessons_with_context(
                    playbook=curated_playbook,
                    rag_service=coach.rag_service,
                )
            else:
                logger.info("📘 Playbook context enrichment disabled; skipping knowledge base matching.")
            
            # Save updated playbook
            await safe_db_update(
                "Update playbook with conversation lessons",
                db_service.update_user_profile,
                user_id=user_id,
                data={"user_playbook": curated_playbook.model_dump()},
                jwt_token=request.jwt_token
            )
            
            logger.info(f"✅ Updated playbook with {len(curated_playbook.lessons)} total lessons ({len(existing_playbook.lessons)} → {len(curated_playbook.lessons)})")
            updated_playbook = curated_playbook.model_dump()
        else:
            logger.info("📘 No lessons extracted from conversation history")
            
    except Exception as e:
        logger.error(f"❌ Error extracting lessons from conversation history: {e}", exc_info=True)
        # Continue - don't block navigation if lesson extraction fails
    
    return updated_playbook


@router.post("/update-week", response_model=PlanFeedbackResponse)
async def update_week(
    request: PlanFeedbackRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Update an existing week in the training plan based on user feedback.
    
    Updates ONLY the latest week (highest week_number), but returns the full TrainingPlan structure
    with the updated week inserted into the existing plan.
    
    Request includes:
    - feedback_message: User feedback message (required)
    - training_plan: Full training plan data (required)
    - plan_id: Training plan ID (required)
    - conversation_history: Previous conversation messages for context (optional, default: [])
    - user_profile_id: User profile ID (optional, can be resolved from JWT)
    - jwt_token: JWT token for authentication (required)
    
    Uses user_playbook instead of initial/follow-up questions/responses.
    week_number is automatically derived from training_plan (latest week = max week_number).
    """
    try:
        # Initialize updated_playbook to track playbook updates
        updated_playbook = None
        
        # Validate JWT token
        if not request.jwt_token:
            raise HTTPException(status_code=401, detail="Missing JWT token")

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
        
        intent = classification_result.get("intent")
        action = classification_result.get("action")
        needs_plan_update = classification_result.get("needs_plan_update")
        ai_message = classification_result.get("ai_message", "")
        
        logger.info(f"✅ Stage 1 complete: intent={intent}, confidence={classification_result.get('confidence')}, needs_plan_update={needs_plan_update}")
        
        # INTENT 1: User is satisfied or wants to navigate to main app
        is_navigate_intent = (
            intent == "satisfied" or 
            action == "navigate_to_main_app" or 
            classification_result.get("navigate_to_main_app")
        )
        
        if is_navigate_intent:
            logger.info("✅ INTENT: Navigate to main app (user satisfied)")
            
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
            
            # Extract and update playbook from conversation history
            updated_playbook = await _handle_playbook_extraction_for_satisfied(
                user_id, request, training_plan, conversation_history, coach
            )
            
            # Return response with navigate_to_main_app=True
            ai_message = ai_message or "Amazing! You're all set. I'll take you to your main dashboard now. 🚀"
            plan_response = _create_plan_response(training_plan, ai_message, "satisfied")
            
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=updated_playbook,
                navigate_to_main_app=True
            )
        
        # INTENT 2: Respond only (no plan update, just return AI message)
        is_respond_only = action == "respond_only" and not needs_plan_update
        if is_respond_only:
            logger.info(f"💬 INTENT: Respond only (no plan update)")
            ai_message = ai_message or "Got it! Let me know if you'd like to make any changes. 💪"
            plan_response = _create_plan_response(training_plan, ai_message, "respond_only")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=None,
                navigate_to_main_app=False
            )
        
        # INTENT 3: Unclear (ask for clarification)
        if intent == "unclear":
            logger.info(f"❓ INTENT: Unclear (asking for clarification)")
            ai_message = ai_message or "I'm having trouble understanding your feedback. Could you please be more specific about what you'd like to change or know? 😊"
            plan_response = _create_plan_response(training_plan, ai_message, "unclear")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=None,
                navigate_to_main_app=False
            )
        
        # INTENT 4: Fallback (no plan update needed but reached here)
        if not needs_plan_update:
            logger.info("⚠️ INTENT: Fallback (no plan update needed)")
            ai_message = ai_message or "Got it! Let me know if you'd like to make any changes. 💪"
            plan_response = _create_plan_response(training_plan, ai_message, "fallback")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=None,
                navigate_to_main_app=False
            )
        
        # INTENT 5: Update plan (needs_plan_update=True)
        logger.info("🔁 INTENT: Update plan (Stage 2: Updating week based on feedback)")
        
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        # OPTIMIZATION: user_profile_id should be provided by frontend
        # Remove redundant fallback DB call
        try:
            user_profile_id = int(request.user_profile_id) if request.user_profile_id is not None else None
        except Exception:
            user_profile_id = None

        # Validate required fields
        if user_profile_id is None:
            logger.error("❌ Missing user_profile_id in request - this should be provided by frontend")
            raise HTTPException(status_code=400, detail="Invalid or missing user_profile_id")

        logger.info(f"Updating Week {week_number} (latest) for user {user_profile_id}, plan {plan_id}")
        
        # OPTIMIZATION: personal_info should be provided by frontend
        if not request.personal_info:
            logger.error("❌ Missing personal_info in request - this should be provided by frontend")
            raise HTTPException(
                status_code=400,
                detail="Missing personal_info in request"
            )
        
        personal_info = request.personal_info
        logger.info("✅ Using personal_info from request")
        
        # OPTIMIZATION: playbook should be provided by frontend
        from core.base.schemas.playbook_schemas import UserPlaybook
        if not request.playbook:
            logger.error("❌ Missing playbook in request - this should be provided by frontend")
            raise HTTPException(
                status_code=400,
                detail="Missing playbook in request"
            )
        
        user_playbook = UserPlaybook(**request.playbook)
        logger.info("✅ Using playbook from request")


        # Update the week using the new method (uses user_playbook instead of onboarding responses)
        # Pass training_plan from request instead of fetching from database
        result = await coach.update_weekly_schedule(
            personal_info=personal_info,
            feedback_message=feedback_message,
            week_number=week_number,
            current_week=current_week,
            user_profile_id=user_profile_id,
            user_playbook=user_playbook,
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
                updated_playbook=updated_playbook,
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
                updated_playbook=updated_playbook,
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
            updated_playbook=None,
            error=str(e)
        )


@router.post("/create-week")
async def create_week(
    request: CreateWeekRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Create a new week when the previous week is completed.
    
    Creates ONLY the next week (Week 2, 3, 4, etc.), but returns the full TrainingPlan structure
    with the new week added to the existing plan.
    
    Request should include:
    - training_plan: Full training plan data (required)
    - user_profile_id: User profile ID (required, from frontend)
    - personal_info: User personal information (required, from frontend)
    - plan_id: Training plan ID (optional, derived from training_plan if not provided)
    - jwt_token: JWT token for authentication (required)
    
    next_week_number is automatically calculated from existing weeks (max week_number + 1)
    """
    try:
        # OPTIMIZATION: Use data from request (no DB calls)
        jwt_token = request.jwt_token
        training_plan = request.training_plan
        user_profile_id = request.user_profile_id
        personal_info = request.personal_info
        
        logger.info(f"📥 Creating new week for user {user_profile_id}, plan {request.plan_id}")
        
        # Get plan_id from request or derive from training_plan
        plan_id = request.plan_id
        if plan_id is None:
            plan_id = training_plan.get("id")
            if plan_id:
                try:
                    plan_id = int(plan_id)
                except Exception:
                    plan_id = None

        if plan_id is None:
            raise HTTPException(status_code=400, detail="Missing or invalid plan_id in request")

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
