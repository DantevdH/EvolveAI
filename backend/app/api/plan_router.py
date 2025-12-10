"""
Plan generation router - handles initial training plan generation.
"""

import asyncio
import inspect
import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any

from app.api.dependencies import get_training_agent
from app.agents.training_agent import TrainingAgent
from app.schemas.question_schemas import PlanGenerationRequest
from app.services.database_service import db_service, extract_user_id_from_jwt
from app.helpers.utils.date_mapper import map_daily_training_dates
from app.helpers.utils.response_formatter import ResponseFormatter
from app.schemas.playbook_schemas import UserPlaybook

router = APIRouter(prefix="/api/training", tags=["training-plan"])
logger = logging.getLogger(__name__)


def validate_plan_generation_request(request: PlanGenerationRequest) -> None:
    """Validate a PlanGenerationRequest and raise HTTPException if validation fails."""
    if not request.initial_responses:
        raise HTTPException(status_code=400, detail="Initial responses cannot be empty")
    
    if not isinstance(request.initial_responses, dict) or len(request.initial_responses) == 0:
        raise HTTPException(status_code=400, detail="Initial responses must be a non-empty dictionary")

    if not request.initial_questions or not isinstance(request.initial_questions, list) or len(request.initial_questions) == 0:
        raise HTTPException(status_code=400, detail="Initial questions must be a non-empty list")

    if not request.personal_info:
        raise HTTPException(status_code=400, detail="Personal info is required")
    
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

    if not request.jwt_token:
        raise HTTPException(status_code=401, detail="JWT token is required")
    
    if request.user_profile_id is not None:
        if not isinstance(request.user_profile_id, int) or request.user_profile_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid user_profile_id: must be a positive integer"
            )


async def _fetch_complete_training_plan(user_profile_id: int) -> Dict[str, Any]:
    """Fetch complete training plan with real IDs from database."""
    try:
        from supabase import create_client
        from app.utils.env_loader import is_test_environment
        from settings import settings

        if is_test_environment():
            logger.debug("Test environment: Cannot fetch training plan (should be mocked)")
            return None

        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY

        if not url or not key:
            logger.error("❌ Missing Supabase environment variables")
            return None

        supabase = create_client(url, key)
        logger.info(f"🔍 Fetching training plan for user_profile_id: {user_profile_id}")

        # 1. Get training plan
        training_plan_response = (
            supabase.table("training_plans")
            .select("*")
            .eq("user_profile_id", user_profile_id)
            .single()
            .execute()
        )
        if not training_plan_response.data:
            logger.warning(f"⚠️ No training plan found for user_profile_id {user_profile_id}")
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

            # 4. Get strength exercises and endurance sessions
            for daily_training in daily_trainings:
                if not daily_training["is_rest_day"]:
                    strength_exercises_response = (
                        supabase.table("strength_exercise")
                        .select("*")
                        .eq("daily_training_id", daily_training["id"])
                        .execute()
                    )
                    strength_exercises = strength_exercises_response.data or []

                    for strength_exercise in strength_exercises:
                        exercise_response = (
                            supabase.table("exercises")
                            .select("*")
                            .eq("id", strength_exercise["exercise_id"])
                            .single()
                            .execute()
                        )
                        if exercise_response.data:
                            strength_exercise["exercises"] = exercise_response.data
                        else:
                            strength_exercise["exercises"] = None

                    daily_training["strength_exercise"] = strength_exercises

                    endurance_sessions_response = (
                        supabase.table("endurance_session")
                        .select("*")
                        .eq("daily_training_id", daily_training["id"])
                        .execute()
                    )
                    daily_training["endurance_session"] = (
                        endurance_sessions_response.data or []
                    )
                else:
                    daily_training["strength_exercise"] = []
                    daily_training["endurance_session"] = []

            weekly_schedule["daily_training"] = daily_trainings

        training_plan["weekly_schedules"] = weekly_schedules
        return training_plan

    except Exception as e:
        logger.error(f"❌ Error fetching complete training plan: {str(e)}")
        return None


async def safe_db_update(
    operation_name: str,
    update_func,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """Helper for non-critical database updates that log failures but don't halt execution."""
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


@router.post("/generate-plan")
async def generate_training_plan(
    request: PlanGenerationRequest,
    background_tasks: BackgroundTasks,
    agent: TrainingAgent = Depends(get_training_agent)
):
    """Generate the final training plan using initial questions and exercises."""
    try:
        validate_plan_generation_request(request)
        
        if not request.user_profile_id:
            logger.error("❌ Missing user_profile_id in request")
            raise HTTPException(status_code=400, detail="Missing user_profile_id in request")
        
        try:
            user_id = extract_user_id_from_jwt(request.jwt_token)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error extracting user_id from JWT: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
        
        logger.info(f"Generating training plan for: {request.personal_info.goal_description}")
        user_profile_id = request.user_profile_id
        logger.info(f"✅ Using user_profile_id from request: {user_profile_id}")
        
        # IDEMPOTENCY CHECK
        existing_plan_result = await db_service.get_training_plan(user_profile_id)
        if existing_plan_result.get("success") and existing_plan_result.get("data"):
            logger.info(f"⚠️ Training plan already exists for user_profile_id {user_profile_id} - returning existing plan")
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
        try:
            formatted_initial_responses = ResponseFormatter.format_responses(
                request.initial_responses, request.initial_questions
            )
            
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
            from app.api.dependencies import get_playbook_service
            from app.schemas.playbook_schemas import UserPlaybook
            
            playbook_service = get_playbook_service()
            empty_playbook = UserPlaybook(
                user_id=user_id,
                lessons=[],
                total_lessons=0,
            )
            
            logger.info("📘 (async) Extracting and curating initial lessons...")
            initial_playbook = await playbook_service.extract_and_curate_onboarding_lessons(
                personal_info=personal_info_with_user_id,
                formatted_initial_responses=formatted_initial_responses,
                existing_playbook=empty_playbook,
            )
            
            if not initial_playbook or len(initial_playbook.lessons) == 0:
                logger.warning("⚠️ (async) No initial lessons extracted - skipping playbook creation")
                return

            logger.info(
                f"📘 (async) Curated initial playbook: {len(empty_playbook.lessons)} → {len(initial_playbook.lessons)} lessons"
            )

            # Get user_profile_id for saving playbook
            user_profile = await db_service.get_user_profile_by_user_id(user_id)
            if user_profile.get("success") and user_profile.get("data"):
                user_profile_id = user_profile["data"].get("id")
                await safe_db_update(
                    "Store initial playbook",
                    db_service.save_user_playbook,
                    user_profile_id=user_profile_id,
                    playbook_data=initial_playbook.model_dump(),
                    jwt_token=request.jwt_token
                )
            logger.info("✅ (async) Playbook stored successfully")

        async def build_initial_playbook_async():
            """Run the playbook extraction/curation pipeline without blocking plan generation."""
            try:
                logger.info("📘 (async) START playbook generation")
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
        
        # Register playbook generation as a background task
        background_tasks.add_task(build_initial_playbook_async)

        # Generate Week 1 (SYNCHRONOUS)
        try:
            result = await agent.generate_initial_training_plan(
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
        
        # Save to DB immediately
        training_plan_data = result.get("training_plan")
        
        if not training_plan_data:
            logger.error("❌ Training plan data is missing from generation result")
            raise HTTPException(
                status_code=500,
                detail="Training plan generation succeeded but returned no data"
            )
        
        # Map scheduled dates to daily trainings
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
        
        # Background task: Generate future week outlines
        async def build_plan_outline_async(plan_id: int):
            """Generate future week outlines and append to weekly_schedules table."""
            try:
                logger.info("📘 (async) START outline generation")
                
                if inspect.iscoroutinefunction(agent._generate_future_week_outlines):
                    outline_payload = await agent._generate_future_week_outlines(
                        personal_info=personal_info_with_user_id,
                        formatted_initial_responses=formatted_initial_responses,
                        existing_plan=training_plan_data,
                        outline_weeks=12,
                    )
                else:
                    outline_payload = await asyncio.to_thread(
                        agent._generate_future_week_outlines,
                        personal_info_with_user_id,
                        formatted_initial_responses,
                        training_plan_data,
                        12,
                    )
                
                future_weeks = outline_payload.get("weekly_schedules", [])
                if future_weeks:
                    for week_data in future_weeks:
                        week_data["training_plan_id"] = plan_id
                        week_data["daily_trainings"] = []
                    
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
        
        background_tasks.add_task(build_plan_outline_async, training_plan_id)
        
        completion_message = result.get("completion_message")
        
        if enriched_plan:
            logger.info("✅ Using enriched training plan with database IDs")
            return {
                "success": True,
                "data": enriched_plan,
                "playbook": None,
                "message": "Training plan generated and saved successfully",
                "completion_message": completion_message,
                "metadata": result.get("metadata", {}),
            }
        else:
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
