"""
training API Endpoints

Handles the complete training workflow with a clean, unified interface:
- Initial Questions (AI-generated)
- Follow-up Questions (AI-generated)
- Plan Generation (AI)
"""

import asyncio
from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
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
)
from core.training.schemas.insights_schemas import (
    InsightsSummaryRequest,
    InsightsSummaryResponse,
    AIInsightsSummary,
    InsightsMetrics,
    WeakPoint,
    TopExercise,
)
from core.training.training_coach import TrainingCoach
from core.training.schemas.training_schemas import TrainingPlan
from core.training.helpers.database_service import db_service, extract_user_id_from_jwt
from core.training.helpers.date_mapper import map_daily_training_dates
# Format responses
from core.training.helpers.response_formatter import ResponseFormatter
from core.training.helpers.insights_service import InsightsService
from core.training.helpers.prompt_generator import PromptGenerator
from core.base.schemas.playbook_schemas import UserPlaybook
from settings import settings

logger = logging.getLogger(__name__)


def validate_plan_generation_request(request: PlanGenerationRequest) -> None:
    """
    Validate a PlanGenerationRequest and raise HTTPException if validation fails.
    
    This function performs runtime validation beyond Pydantic's type checking:
    - Ensures initial_responses is a non-empty dictionary
    - Ensures initial_questions is a non-empty list
    - Ensures personal_info exists and has required fields
    - Ensures user_profile_id is a positive integer if provided
    - Ensures jwt_token is present
    
    Args:
        request: The PlanGenerationRequest to validate
        
    Raises:
        HTTPException: If any validation fails (400 for bad request, 401 for auth)
    """
    # Validate initial_responses
    if not request.initial_responses:
        raise HTTPException(status_code=400, detail="Initial responses cannot be empty")
    
    if not isinstance(request.initial_responses, dict):
        raise HTTPException(status_code=400, detail="Initial responses must be a dictionary")
    
    if len(request.initial_responses) == 0:
        raise HTTPException(status_code=400, detail="Initial responses cannot be empty")

    # Validate initial_questions
    if not request.initial_questions:
        raise HTTPException(status_code=400, detail="Initial questions cannot be empty")
    
    if not isinstance(request.initial_questions, list):
        raise HTTPException(status_code=400, detail="Initial questions must be a list")
    
    if len(request.initial_questions) == 0:
        raise HTTPException(status_code=400, detail="Initial questions cannot be empty")

    # Validate personal_info
    if not request.personal_info:
        raise HTTPException(status_code=400, detail="Personal info is required")
    
    # Validate required personal_info fields
    required_fields = ['username', 'age', 'weight', 'height', 'gender', 'goal_description', 'experience_level']
    missing_fields = [
        field for field in required_fields 
        if not hasattr(request.personal_info, field) or getattr(request.personal_info, field) is None
    ]
    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required personal info fields: {', '.join(missing_fields)}"
        )

    # Validate JWT token
    if not request.jwt_token:
        raise HTTPException(status_code=401, detail="JWT token is required")
    
    # Validate user_profile_id if provided
    if request.user_profile_id is not None:
        if not isinstance(request.user_profile_id, int) or request.user_profile_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid user_profile_id: must be a positive integer"
            )


async def _fetch_complete_training_plan(user_profile_id: int) -> Dict[str, Any]:
    """Fetch complete training plan with real IDs from database - exact same as frontend."""
    try:
        from supabase import create_client
        from core.utils.env_loader import is_test_environment

        # Check if we're in a test environment
        is_test_env = is_test_environment()
        
        if is_test_env:
            logger.debug("Test environment: Cannot fetch training plan (should be mocked)")
            return None

        # Use service role key for backend operations
        # Use settings (which reads from environment dynamically)
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY

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
        
        # Resolve or create user profile (one-by-one flow should not duplicate profiles)
        user_profile_id = request.user_profile_id
        if user_profile_id:
            logger.info(f"Using provided user_profile_id from request: {user_profile_id}")
        else:
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
            
            if create_result.get("success"):
                user_profile_id = create_result.get('data', {}).get('id')
                logger.info(f"Profile ID: {user_profile_id}")
            else:
                # Fallback: try to fetch existing profile for this user_id (handles duplicate insert case)
                logger.warning("Create user profile failed - attempting to fetch existing profile")
                existing_profile = await db_service.get_user_profile(user_id)
                if existing_profile.get("success"):
                    user_profile_id = existing_profile.get("data", {}).get("id")
                    logger.info(f"Found existing profile ID: {user_profile_id}")
                else:
                    logger.error("No existing profile found and could not create one")
                    raise HTTPException(
                        status_code=500,
                        detail="Could not create or find user profile. Please try again."
                    )
        
        # Load stored responses/questions/AI intro from database
        stored_responses = {}
        stored_questions = []
        stored_ai_message = None
        
        if user_profile_id:
            try:
                profile_result = await db_service.get_user_profile_by_id(int(user_profile_id))
                if profile_result.get("success"):
                    profile_data = profile_result.get("data", {})
                    
                    # Load stored responses
                    if profile_data.get("initial_responses"):
                        stored_responses = profile_data.get("initial_responses", {})
                        if not isinstance(stored_responses, dict):
                            stored_responses = {}
                        logger.info(f"Loaded {len(stored_responses)} stored responses")
                    
                    # Load stored questions
                    initial_questions_data = profile_data.get("initial_questions")
                    if initial_questions_data:
                        if isinstance(initial_questions_data, dict):
                            stored_questions = initial_questions_data.get("questions", [])
                            stored_ai_message = initial_questions_data.get("ai_message")
                        elif isinstance(initial_questions_data, list):
                            stored_questions = initial_questions_data
                        logger.info(f"Loaded {len(stored_questions)} stored questions")
                    
                    # Load AI message if not in questions data
                    if not stored_ai_message and profile_data.get("initial_ai_message"):
                        stored_ai_message = profile_data.get("initial_ai_message")
            except Exception as e:
                logger.warning(f"Failed to load stored profile data: {str(e)}", exc_info=True)
        
        # Merge incoming initial_responses with stored responses
        merged_responses = dict(stored_responses)  # Start with stored responses
        if request.initial_responses:
            # Merge incoming responses (incoming takes precedence)
            merged_responses.update(request.initial_responses)
            logger.info(f"Merged {len(request.initial_responses)} incoming responses with {len(stored_responses)} stored responses")
        
        # Generate questions (with latency tracking) - one-by-one flow
        questions_response = await coach.generate_initial_questions(
            request.personal_info, 
            user_profile_id=user_profile_id,
            question_history=request.question_history
        )
        
        # Append only new questions (filter out questions that already exist)
        existing_question_ids = {q.get("id") for q in stored_questions if isinstance(q, dict) and q.get("id")}
        new_questions = []
        for q in questions_response.questions:
            q_dict = q.model_dump(exclude_unset=True, mode='json')
            if q_dict.get("id") not in existing_question_ids:
                new_questions.append(q_dict)
                existing_question_ids.add(q_dict.get("id"))
        
        # Combine stored questions with new questions
        all_questions = stored_questions + new_questions
        
        # Store merged questions/responses/AI intro (non-critical - log but continue)
        serialized_questions_for_storage = []
        for q in all_questions:
            if isinstance(q, dict):
                serialized_questions_for_storage.append(q)
            else:
                sq = q.model_dump(exclude_unset=True, mode='json') if hasattr(q, 'model_dump') else q
                serialized_questions_for_storage.append(sq)
        
        # Use AI message from response if available, otherwise keep stored one
        ai_message_to_store = questions_response.ai_message or stored_ai_message

        # Check if information collection is complete
        information_complete = questions_response.information_complete

        # Store merged questions/responses with retry on failure
        store_data = {
            "initial_questions": {
                "questions": serialized_questions_for_storage,
                "ai_message": ai_message_to_store,
            },
            "initial_responses": merged_responses,
            "information_complete": information_complete,
        }


        store_result = await safe_db_update(
            "Store merged initial questions and responses",
            db_service.update_user_profile,
            user_id=user_id,
            data=store_data,
            jwt_token=request.jwt_token
        )

        # Retry once if first attempt failed
        if not store_result.get("success"):
            logger.warning(f"First save attempt failed: {store_result.get('error')}. Retrying...")
            store_result = await safe_db_update(
                "Store merged initial questions and responses (retry)",
                db_service.update_user_profile,
                user_id=user_id,
                data=store_data,
                jwt_token=request.jwt_token
            )

            if not store_result.get("success"):
                logger.error(f"Failed to save questions after retry: {store_result.get('error')}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save your responses. Please try again."
                )

        # Log completion status
        if information_complete:
            logger.info("✅ Information collection complete - ready for plan generation")
        else:
            logger.info(f"✅ Generated {questions_response.total_questions} initial questions")
        
        # Serialize new questions for response (only return newly generated questions)
        serialized_new_questions = []
        for q in questions_response.questions:
            sq = q.model_dump(exclude_unset=True, mode='json')
            serialized_new_questions.append(sq)
        
        # Calculate total questions count (stored + new)
        total_questions_count = len(all_questions)
        
        return {
            "success": True,
            "data": {
                "questions": serialized_new_questions,  # Only new questions
                "total_questions": total_questions_count,  # Total count including stored
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": ai_message_to_store,  # Merged AI message
                "information_complete": information_complete,  # Signal to frontend that questioning is done
                "user_profile_id": user_profile_id,  # Return profile ID for frontend state management
                "merged_responses": merged_responses,  # Return merged responses for frontend state sync
            },
            "message": "Information collection complete" if information_complete else "Initial questions generated successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating initial questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate initial questions: {str(e)}")


 


@router.post("/generate-plan")
async def generate_training_plan(
    request: PlanGenerationRequest,
    background_tasks: BackgroundTasks,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate the final training plan using initial questions and exercises."""
    try:
        # === INPUT VALIDATION ===
        validate_plan_generation_request(request)
        
        # Validate user_profile_id is required (not just if provided)
        if not request.user_profile_id:
            logger.error("❌ Missing user_profile_id in request - this should be provided by frontend")
            raise HTTPException(
                status_code=400,
                detail="Missing user_profile_id in request"
            )
        
        # Extract and validate JWT token
        try:
            user_id = extract_user_id_from_jwt(request.jwt_token)
        except HTTPException:
            # Re-raise HTTPException from extract_user_id_from_jwt (already has proper status code)
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error extracting user_id from JWT: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
        
        logger.info(f"Generating training plan for: {request.personal_info.goal_description}")
        
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
        
        # Format responses with validation
        try:
            formatted_initial_responses = ResponseFormatter.format_responses(
                request.initial_responses, request.initial_questions
            )
            
            # Validate formatted response is not empty
            if not formatted_initial_responses or len(formatted_initial_responses.strip()) == 0:
                logger.error("❌ Formatted initial responses is empty after formatting")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to format initial responses: result is empty"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error formatting initial responses: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to format initial responses: {str(e)}"
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
        
        async def build_initial_playbook_inner():
            """Inner playbook generation logic with timeout protection."""
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

        async def build_initial_playbook_async():
            """Run the playbook extraction/curation pipeline without blocking plan generation."""
            try:
                logger.info("📘 (async) START playbook generation")
                
                # Add timeout for playbook generation (5 minutes max)
                try:
                    await asyncio.wait_for(
                        build_initial_playbook_inner(),
                        timeout=300.0  # 5 minutes
                    )
                except asyncio.TimeoutError:
                    logger.error("❌ (async) Playbook generation timed out after 5 minutes")
                    return
            except Exception as async_error:
                logger.error(f"❌ (async) Playbook generation failed: {str(async_error)}", exc_info=True)
        
        # Register playbook generation as a background task (runs after response is sent)
        background_tasks.add_task(build_initial_playbook_async)

        # === PHASE 1: Generate Week 1 (SYNCHRONOUS) ===
        try:
            result = await coach.generate_initial_training_plan(
                personal_info=personal_info_with_user_id,
                formatted_initial_responses=formatted_initial_responses,
                user_profile_id=user_profile_id,
                jwt_token=request.jwt_token,
            )
        except Exception as gen_error:
            logger.error(f"❌ Training plan generation exception: {str(gen_error)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to generate training plan. Please try again."
            )
        
        if not result.get("success"):
            error_msg = result.get("error", "Failed to generate training plan")
            logger.error(f"❌ Training plan generation failed: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate training plan. Please try again."
            )
        
        logger.info("✅ Training plan generated successfully")
        
        # Save to DB immediately to get training_plan_id
        training_plan_data = result.get("training_plan")
        
        if not training_plan_data:
            logger.error("❌ Training plan data is missing from generation result")
            raise HTTPException(
                status_code=500,
                detail="Training plan generation succeeded but returned no data"
            )
        
        # Map scheduled dates to daily trainings (post-processing step)
        # This must happen before saving to DB and returning to frontend
        
        training_plan_data = map_daily_training_dates(training_plan_data)
        logger.info("✅ Mapped scheduled dates to daily trainings")
        
        try:
            save_result = await db_service.save_training_plan(
                user_profile_id=user_profile_id,
                training_plan_data=training_plan_data,
                jwt_token=request.jwt_token,
                user_playbook=None,  # Generated asynchronously
            )
        except Exception as save_error:
            logger.error(f"❌ Exception saving training plan: {str(save_error)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Training plan generated but failed to save. Please try again."
            )
        
        if not save_result.get("success"):
            error_msg = save_result.get("error", "Unknown error")
            logger.error(f"❌ Failed to save training plan: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="Training plan generated but failed to save. Please try again."
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
                logger.error(f"❌ (async) Plan outline generation failed: {async_error}", exc_info=True)
        
        # Register outline generation as a background task (runs after response is sent)
        background_tasks.add_task(build_plan_outline_async, training_plan_id)
        
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
        
        # OPTIMIZATION: user_profile_id is already validated in parent /chat endpoint
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


@router.post("/chat", response_model=PlanFeedbackResponse)
async def chat(
    request: PlanFeedbackRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Multi-purpose training chat endpoint that handles various user intents.
    
    This endpoint intelligently classifies user intent and responds accordingly:
    - **Questions/Clarity**: Returns AI response without plan updates
    - **Plan Updates**: Updates the latest week based on feedback and returns updated plan
    - **Satisfaction**: Marks plan as accepted and navigates to main app
    - **Unclear**: Asks for clarification
    
    The endpoint automatically determines the appropriate action based on the user's message
    and conversation history. It can update ONLY the latest week (highest week_number) when needed,
    but always returns the full TrainingPlan structure.
    
    Request includes:
    - feedback_message: User message/feedback (required)
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
        
        # Get week_number from request (required - should be the current week from frontend)
        week_number = request.week_number
        if week_number is None:
            raise HTTPException(status_code=400, detail="week_number is required in request (should be the current week)")
        
        # Get the specific week from training_plan based on week_number
        current_week = None
        if isinstance(training_plan, dict):
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if weekly_schedules:
                # Find the week with the matching week_number
                current_week = next(
                    (w for w in weekly_schedules if w.get("week_number") == week_number),
                    None
                )
        
        if not current_week:
            raise HTTPException(
                status_code=400, 
                detail=f"Could not find week {week_number} in training_plan. Available weeks: {[w.get('week_number') for w in training_plan.get('weekly_schedules', []) if w.get('week_number')]}"
            )
        
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
        # Only the current week is processed and returned
        result = await coach.update_weekly_schedule(
            personal_info=personal_info,
            feedback_message=feedback_message,
            week_number=week_number,
            current_week=current_week,
            user_profile_id=user_profile_id,
            user_playbook=user_playbook,
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

        # Get the updated week from result (only contains the updated week)
        updated_plan_data = result.get("training_plan")
        
        if not updated_plan_data:
            raise Exception("No training plan data returned from update")

        # Extract the updated week (should be the only week in the array)
        weekly_schedules = updated_plan_data.get("weekly_schedules", [])
        updated_week = weekly_schedules[0] if weekly_schedules else None
            
        if not updated_week:
            raise Exception(f"Could not find updated week {week_number} in result")
        
        # Map scheduled dates to daily trainings (post-processing step)
        # This must happen before saving to DB and returning to frontend
        temp_plan = {"weekly_schedules": [updated_week]}
        temp_plan = map_daily_training_dates(temp_plan)
        updated_week = temp_plan.get("weekly_schedules", [updated_week])[0]
        logger.info("✅ Mapped scheduled dates to daily trainings for updated week")
        
        # Update only this specific week in the database
        enriched_week = await db_service.update_single_week(
            plan_id,
            week_number,
            updated_week,
            jwt_token=request.jwt_token
        )
        
        if enriched_week is None:
            raise Exception("Failed to update week in database")
        
        logger.info(f"✅ Week {week_number} updated in database successfully")
        
        # Return only the enriched week (frontend will merge it back into the full plan)
        # Include plan id for consistency and fallback path compatibility
        enriched_plan = {
            "id": plan_id,  # Include plan id so fallback transformTrainingPlan works
            "weekly_schedules": [enriched_week],  # Return only the updated week
        }
        
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
            updated_plan=enriched_plan,  # Contains only the updated week
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

        # Calculate next_week_number from frontend's training_plan (more reliable than DB fetch)
        weekly_schedules = training_plan.get("weekly_schedules", [])
        if weekly_schedules:
            week_numbers = [w.get("week_number", 0) for w in weekly_schedules if w.get("week_number")]
            next_week_number = max(week_numbers) + 1 if week_numbers else 1
        else:
            next_week_number = 1
        
        logger.info(f"Calculated next_week_number: {next_week_number} from frontend training plan ({len(weekly_schedules)} existing weeks)")
        
        # Create the new week using the new method
        # Uses training_plan from request instead of fetching from database
        result = await coach.create_new_weekly_schedule(
            personal_info=personal_info,
            user_profile_id=user_profile_id,
            existing_training_plan=training_plan,  # Use training plan from request
            jwt_token=jwt_token,
        )

        if not result.get("success"):
            logger.error(f"Week creation failed: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to create new week")
            )

        # Get the updated full training plan
        updated_plan_data = result.get("training_plan")
        
        # Verify next_week_number from result metadata matches our calculation
        result_next_week = result.get("metadata", {}).get("next_week_number")
        if result_next_week and result_next_week != next_week_number:
            logger.warning(
                f"Week number mismatch: calculated {next_week_number} but result has {result_next_week}. "
                f"Using result value."
            )
            next_week_number = result_next_week

        logger.info(f"✅ Week {next_week_number} created successfully")

        # Map scheduled dates to daily trainings (post-processing step)
        # This must happen before saving to DB and returning to frontend
        if updated_plan_data:
            updated_plan_data = map_daily_training_dates(updated_plan_data)
            logger.info("✅ Mapped scheduled dates to daily trainings for new week")

        # Create only the new week in the database
        if plan_id and updated_plan_data:
            # Extract the new week from the full plan
            weekly_schedules = updated_plan_data.get("weekly_schedules", [])
            new_week = next(
                (w for w in weekly_schedules if w.get("week_number") == next_week_number),
                None
            )
            
            if not new_week:
                raise Exception(f"Could not find week {next_week_number} in updated plan data")
            
            # Create only this new week in the database
            enriched_week = await db_service.create_single_week(
                plan_id,
                new_week,
                jwt_token=jwt_token
            )
            
            if enriched_week is None:
                raise Exception("Failed to create week in database")
            
            logger.info(f"✅ Week {next_week_number} created in database successfully")
            
            # Merge the enriched week back into the full plan
            enriched_weekly_schedules = []
            for week in weekly_schedules:
                if week.get("week_number") == next_week_number:
                    enriched_weekly_schedules.append(enriched_week)
                else:
                    enriched_weekly_schedules.append(week)
            
            # Build the enriched full plan
            enriched_plan = {
                **updated_plan_data,
                "weekly_schedules": enriched_weekly_schedules,
            }
            
            logger.info("✅ Using enriched training plan with new week (IDs present)")

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


@router.post("/insights-summary", response_model=InsightsSummaryResponse)
async def get_insights_summary(
    request: InsightsSummaryRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Generate simplified, actionable insights summary with AI enhancement.
    
    Returns:
    - AI-generated summary (2-3 sentences)
    - Findings (2-3 observations from training data)
    - Recommendations (2-3 actionable next steps)
    - Simple metrics (volume progress, recovery, weak points, top exercises)
    """
    try:
        # Extract and validate JWT token
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        # Get training plan (use provided or fetch from database)
        training_plan = request.training_plan
        if not training_plan:
            # Fetch from database
            training_plan = await _fetch_complete_training_plan(request.user_profile_id)
            if not training_plan:
                return InsightsSummaryResponse(
                    success=False,
                    error="No training plan found"
                )
        
        # Map scheduled dates to daily trainings (needed for accurate frequency calculation)
        training_plan = map_daily_training_dates(training_plan)
        
        # Extract simple metrics (volume, frequency, training intensity)
        volume_progress = InsightsService.extract_volume_progress(training_plan)
        training_frequency = InsightsService.extract_training_frequency(training_plan)
        training_intensity, intensity_trend = InsightsService.extract_training_intensity(training_plan)
        
        # Use provided weak_points/top_exercises from frontend (frontend calculates these)
        # If not provided, use empty lists (AI can still generate good summary with volume/frequency/intensity)
        weak_points = request.weak_points or []
        top_exercises = request.top_exercises or []
        
        # Convert Pydantic models to dicts for prompt generation
        weak_points_dict = [wp.model_dump() if hasattr(wp, 'model_dump') else wp for wp in weak_points]
        top_exercises_dict = [ex.model_dump() if hasattr(ex, 'model_dump') else ex for ex in top_exercises]
        
        # Prepare metrics dict for AI
        metrics_dict = {
            "volume_progress": volume_progress,
            "training_frequency": training_frequency,
            "training_intensity": training_intensity,
            "weak_points": weak_points_dict,
            "top_exercises": top_exercises_dict
        }
        
        # Calculate data hash for cache invalidation
        current_data_hash = InsightsService.calculate_data_hash(metrics_dict)
        
        # Check cache first
        cached_summary = await db_service.get_insights_summary_cache(request.user_profile_id)
        use_cached = False
        
        if cached_summary:
            cached_hash = cached_summary.get("data_hash")
            cached_created = cached_summary.get("created_at")
            
            # Use cache if hash matches (data hasn't changed)
            if cached_hash == current_data_hash:
                use_cached = True
                logger.info(f"✅ Using cached insights summary (hash match)")
                # Parse cached summary
                cached_summary_data = cached_summary.get("summary", {})
                if cached_summary_data:
                    ai_summary = AIInsightsSummary(**cached_summary_data)
                else:
                    use_cached = False  # Invalid cache, regenerate
            else:
                logger.info(f"🔄 Cache invalidated (data changed: hash mismatch)")
        
        # Generate new AI summary if cache miss or invalid
        if not use_cached:
            try:
                prompt = PromptGenerator.generate_insights_summary_prompt(metrics_dict)
                
                # Use lightweight model for fast response
                ai_summary, completion = coach.llm.chat_parse(
                    prompt,
                    AIInsightsSummary,
                    model_type="lightweight"
                )
                
                logger.info(f"✅ Generated new insights summary (tokens: {completion.usage.total_tokens if hasattr(completion, 'usage') else 'N/A'})")
                
                # Save to cache for future requests
                cache_data = {
                    "summary": ai_summary.model_dump(),
                    "metrics": None  # Will be set below
                }
                await db_service.save_insights_summary_cache(
                    request.user_profile_id,
                    cache_data,
                    current_data_hash
                )
                
            except Exception as e:
                logger.error(f"Error generating AI summary: {e}")
                # Fallback to simple summary if AI fails
                ai_summary = AIInsightsSummary(
                    summary=f"Your training is progressing. {volume_progress}. {training_intensity}.",
                    findings=[
                        f"Training volume: {volume_progress}",
                        f"Training frequency: {training_frequency}"
                    ],
                    recommendations=[
                        "Maintain consistent training frequency",
                        "Monitor training intensity and adjust as needed"
                    ]
                )
        
        # Build metrics response (always use current metrics, not cached)
        # Convert to Pydantic models if needed
        weak_points_models = [
            wp if isinstance(wp, WeakPoint) else WeakPoint(**wp) 
            for wp in weak_points
        ]
        top_exercises_models = [
            ex if isinstance(ex, TopExercise) else TopExercise(**ex)
            for ex in top_exercises
        ]
        
        metrics = InsightsMetrics(
            volume_progress=volume_progress,
            training_frequency=training_frequency,
            training_intensity=training_intensity,
            intensity_trend=intensity_trend,
            weak_points=weak_points_models,
            top_exercises=top_exercises_models
        )
        
        # Update cache with full metrics if we generated new summary
        if not use_cached and ai_summary:
            cache_data = {
                "summary": ai_summary.model_dump(),
                "metrics": metrics.model_dump()
            }
            await db_service.save_insights_summary_cache(
                request.user_profile_id,
                cache_data,
                current_data_hash
            )
        
        return InsightsSummaryResponse(
            success=True,
            summary=ai_summary,
            metrics=metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating insights summary: {str(e)}")
        return InsightsSummaryResponse(
            success=False,
            error=f"Failed to generate insights summary: {str(e)}"
        )
