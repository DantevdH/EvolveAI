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

from core.training.schemas.question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PlanFeedbackRequest,
    PlanFeedbackResponse,
    PersonalInfo,
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
        
        if create_result.get("success"):
            logger.info(f"Profile ID: {create_result.get('data', {}).get('id')}")
        
        # Generate questions
        questions_response = coach.generate_initial_questions(request.personal_info)
        
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
        
        # Store initial responses
        await safe_db_update(
            "Store initial responses",
            db_service.update_user_profile,
            user_id=user_id,
            data={"initial_responses": request.initial_responses},
            jwt_token=request.jwt_token
        )
        
        # Generate follow-up questions
        questions_response = coach.generate_follow_up_questions(
            request.personal_info,
            formatted_responses,
            request.initial_questions
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
        
        # Format responses
        from core.training.helpers.response_formatter import ResponseFormatter
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
            initial_lessons = coach.extract_initial_lessons_from_onboarding(
                personal_info=personal_info_with_user_id,
                formatted_initial_responses=formatted_initial_responses,
                formatted_follow_up_responses=formatted_follow_up_responses,
            )
            
            # Create initial playbook with onboarding lessons
            from core.base.schemas.playbook_schemas import UserPlaybook
            initial_playbook = UserPlaybook(
                user_id=user_id,
                lessons=initial_lessons,
                total_lessons=len(initial_lessons),
            )
            
            logger.info(f"📘 Created initial playbook with {len(initial_lessons)} lessons from onboarding")
            
            # Store initial playbook
            await safe_db_update(
                "Store initial playbook",
                db_service.update_user_profile,
                user_id=user_id,
                data={"user_playbook": initial_playbook.model_dump()},
                jwt_token=request.jwt_token
            )
        
        # Generate initial training plan (onboarding - uses initial playbook)
        # AI will decide and retrieve exercises internally
        result = await coach.generate_initial_training_plan(
            personal_info=personal_info_with_user_id,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            user_profile_id=user_profile_id,
            jwt_token=request.jwt_token
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
        user_playbook = result.get("user_playbook")
        
        if user_playbook:
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
        
        # Fetch complete training plan with real IDs from database
        try:
            complete_plan = await _fetch_complete_training_plan(user_profile_id)
            
            if complete_plan:
                logger.info("✅ Complete training plan fetched with real IDs")
                return {
                    "success": True,
                    "data": complete_plan,
                    "message": "Training plan generated and saved successfully",
                    "completion_message": completion_message,
                    "metadata": result.get("metadata", {}),  # Include metadata for frontend
                }
            else:
                logger.warning("⚠️ Could not fetch complete plan, returning original data")
                return {
                    "success": True,
                    "data": training_plan_data,
                    "message": "Training plan generated and saved successfully",
                    "completion_message": completion_message,
                    "metadata": result.get("metadata", {}),  # Include metadata for frontend
                }
        except Exception as fetch_error:
            logger.error(f"❌ Error fetching complete training plan: {str(fetch_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Training plan saved but failed to fetch complete data: {str(fetch_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating training plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate training plan: {str(e)}")


# ============================================================================
# ACE PATTERN ENDPOINTS (Adaptive Context Engine)
# ============================================================================

@router.post("/daily-training-feedback")
async def submit_daily_training_feedback(
    request: dict, coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Submit daily training feedback with optional skip.
    
    This endpoint processes feedback for a single training session, detects user
    modifications, and updates the ACE playbook in real-time.
    
    Request format:
    {
        "daily_training_id": 123,
        "user_id": "user_abc",
        "plan_id": "plan_xyz",
        "week_number": 2,
        "day_of_week": "Monday",
        "training_date": "2025-10-16",
        "training_type": "strength",
        
        # Original training from database
        "original_training": {
            "strength_exercises": [...],
            "endurance_sessions": [...]
        },
        
        # What user actually did
        "actual_training": {
            "strength_exercises": [...],  # May have modifications
            "endurance_sessions": [...]
        },
        
        # Session completion
        "session_completed": true,
        "completion_percentage": 1.0,
        
        # Optional feedback (can be skipped)
        "feedback_provided": true,  # false if user clicked "Skip Feedback"
        "user_rating": 4,  # 1-5 (optional)
        "user_feedback": "Felt great!",  # text (optional)
        "energy_level": 4,  # 1-5 (optional)
        "difficulty": 3,  # 1-5 (optional)
        "enjoyment": 5,  # 1-5 (optional)
        "soreness_level": 2,  # 1-5 (optional)
        
        # Safety (always collected)
        "injury_reported": false,
        "injury_description": null,
        "pain_location": null,
        
        # Optional performance data
        "avg_heart_rate": 145,
        "max_heart_rate": 165,
        "performance_metrics": {},
        
        "personal_info": {...}
    }
    """
    try:
        # Extract user_id for authorization
        user_id = request.get("user_id")
        if not user_id:
            return {
                "success": False,
                "data": None,
                "message": "Missing required field: user_id",
            }

        # Verify JWT token
        jwt_token = request.get("jwt_token")
        if not jwt_token:
            return {
                "success": False,
                "data": None,
                "message": "Missing JWT token",
            }

        try:
            token_user_id = extract_user_id_from_jwt(jwt_token)
            if token_user_id != user_id:
                return {
                    "success": False,
                    "data": None,
                    "message": "Unauthorized: user_id mismatch",
                }
        except Exception as e:
            logger.error(f"JWT verification failed: {str(e)}")
            return {
                "success": False,
                "data": None,
                "message": f"JWT verification failed: {str(e)}",
            }

        # Validate required fields
        required_fields = [
            "daily_training_id",
            "plan_id",
            "week_number",
            "day_of_week",
            "training_date",
            "training_type",
            "original_training",
            "actual_training",
            "personal_info",
        ]
        for field in required_fields:
            if field not in request:
                return {
                    "success": False,
                    "data": None,
                    "message": f"Missing required field: {field}",
                }

        # Import schemas
        from core.base.schemas.playbook_schemas import DailyTrainingOutcome
        from core.training.schemas.question_schemas import PersonalInfo

        # Build DailyTrainingOutcome object
        outcome_data = {
            "plan_id": request["plan_id"],
            "user_id": user_id,
            "daily_training_id": request["daily_training_id"],
            "week_number": request["week_number"],
            "day_of_week": request["day_of_week"],
            "training_date": request["training_date"],
            "training_type": request["training_type"],
            "session_completed": request.get("session_completed", True),
            "completion_percentage": request.get("completion_percentage", 1.0),
            "was_modified": False,  # Will be set by comparison
            "modifications": [],  # Will be populated by comparison
            "feedback_provided": request.get("feedback_provided", False),
            "user_feedback": request.get("user_feedback"),
            "user_rating": request.get("user_rating"),
            "avg_heart_rate": request.get("avg_heart_rate"),
            "max_heart_rate": request.get("max_heart_rate"),
            "target_heart_rate_zone": request.get("target_heart_rate_zone"),
            "energy_level": request.get("energy_level"),
            "difficulty": request.get("difficulty"),
            "enjoyment": request.get("enjoyment"),
            "soreness_level": request.get("soreness_level"),
            "injury_reported": request.get("injury_reported", False),
            "injury_description": request.get("injury_description"),
            "pain_location": request.get("pain_location"),
            "performance_metrics": request.get("performance_metrics", {}),
            "notes": request.get("notes"),
        }

        # Handle skipped feedback
        if not outcome_data["feedback_provided"]:
            outcome_data["feedback_skipped_at"] = datetime.utcnow().isoformat()

        outcome = DailyTrainingOutcome(**outcome_data)

        # Build PersonalInfo object
        personal_info = PersonalInfo(**request["personal_info"])

        # Get original and actual training
        original_training = request["original_training"]
        actual_training = request["actual_training"]

        # Build session context
        session_context = f"{request['training_type'].capitalize()} training session on {request['day_of_week']}, Week {request['week_number']}"

        logger.info(
            f"Processing daily feedback for user {personal_info.username}, {request['day_of_week']}, Week {request['week_number']}"
        )
        logger.info(
            f"Feedback provided: {outcome.feedback_provided}, Session completed: {outcome.session_completed}"
        )

        # Process feedback through ACE pattern (Reflector → Curator → Playbook)
        result = await coach.process_daily_training_feedback(
            outcome=outcome,
            original_training=original_training,
            actual_training=actual_training,
            personal_info=personal_info,
            session_context=session_context,
        )

        if result.get("success"):
            logger.info(f"✅ Daily feedback processed: {result.get('message')}")
            return {
                "success": True,
                "data": {
                    "lessons_generated": result.get("lessons_generated"),
                    "lessons_added": result.get("lessons_added"),
                    "lessons_updated": result.get("lessons_updated"),
                    "modifications_detected": result.get("modifications_detected"),
                    "total_lessons": result.get("total_lessons_in_playbook"),
                    "training_status_updated": result.get("training_status_updated"),
                    "decisions": result.get("decisions", []),
                },
                "message": result.get("message"),
            }
        else:
            logger.error(f"❌ Failed to process daily feedback: {result.get('error')}")
            return {
                "success": False,
                "data": None,
                "message": result.get("error", "Failed to process daily feedback"),
            }

    except Exception as e:
        logger.error(f"Error submitting daily training feedback: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to submit daily feedback: {str(e)}",
        }


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


@router.post("/plan-feedback", response_model=PlanFeedbackResponse)
async def process_plan_feedback(
    request: PlanFeedbackRequest,
    coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Process user feedback on their training plan and provide real-time updates.
    
    This endpoint handles:
    - Feedback classification (clarification, modification, approval, etc.)
    - AI response generation
    - Plan updates when needed
    - Change explanations
    """
    try:
        logger.info(f"Processing plan feedback for user {request.user_profile_id}, plan {request.plan_id}")
        
        # Get current training plan
        current_plan_data = await _fetch_complete_training_plan(request.user_profile_id)
        if not current_plan_data:
            raise HTTPException(
                status_code=404, 
                detail="Training plan not found"
            )
        
        # Get user profile to extract personal info (by integer ID)
        profile_response = await db_service.get_user_profile_by_id(request.user_profile_id)
        if not profile_response or not profile_response.get("success"):
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )
        
        # Extract the actual profile data
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
        
        # Convert to TrainingPlan object
        current_plan = TrainingPlan(**current_plan_data)
        
        # Step 1: Classify feedback intent
        classification_result = await coach.classify_feedback_intent(
            request.feedback_message,
            request.conversation_history
        )
        
        # Step 2: Handle based on intent/action
        if classification_result.get("intent") == "satisfied" or classification_result.get("action") == "navigate_to_main_app":
            # User is satisfied; set plan_accepted=True and navigate to main app
            user_id = user_profile.get("user_id")
            if user_id:
                await safe_db_update(
                    "Set plan_accepted=True for satisfied user",
                    db_service.update_user_profile,
                    user_id=user_id,
                    data={"plan_accepted": True},
                    jwt_token=request.jwt_token
                )
                logger.info("✅ Set plan_accepted=True - user satisfied with plan")
            
            return PlanFeedbackResponse(
                success=True,
                ai_response="Amazing! You're all set. I'll take you to your main dashboard now. 🚀",
                plan_updated=False,
                updated_plan=None,
                changes_explanation=None,
                navigate_to_main_app=True
            )
        
        if classification_result["needs_plan_update"]:
            logger.info("Plan update triggered by feedback")
            
            # Generate updated plan with all context (includes AI message generation)
            # Metadata options will be fetched automatically inside update_plan_from_feedback
            update_result = await coach.update_plan_from_feedback(
                personal_info=personal_info,
                current_plan=current_plan,
                feedback_message=request.feedback_message,
                classification_result=classification_result,
                conversation_history=request.conversation_history,
                formatted_initial_responses=request.formatted_initial_responses or "",
                formatted_follow_up_responses=request.formatted_follow_up_responses or ""
            )
            
            # Ensure updated_plan is a dictionary, not a Pydantic object
            updated_plan_data = update_result["updated_plan"]
            if not isinstance(updated_plan_data, dict):
                # If it's still a Pydantic model, convert it
                if hasattr(updated_plan_data, 'model_dump'):
                    updated_plan_data = updated_plan_data.model_dump()
                elif hasattr(updated_plan_data, 'dict'):
                    updated_plan_data = updated_plan_data.dict()
                else:
                    logger.error(f"Updated plan is not serializable: {type(updated_plan_data)}")
                    updated_plan_data = None
            
            # Save updated plan to database
            try:
                if updated_plan_data:
                    await db_service.update_training_plan(
                        request.plan_id,
                        updated_plan_data,
                        jwt_token=request.jwt_token
                    )
                logger.info(f"Successfully updated plan {request.plan_id} based on feedback")
            except Exception as e:
                logger.error(f"Error saving updated plan: {str(e)}")
                return PlanFeedbackResponse(
                    success=False,
                    ai_response="I updated your plan but encountered an error saving it. Please try again.",
                    plan_updated=False,
                    updated_plan=None,
                    changes_explanation=None,
                    error=f"Plan updated but failed to save: {str(e)}"
                )
            
            # Fetch complete training plan with real IDs and all nested relationships from database
            # This ensures we return the actual saved data with proper structure (same as plan generation)
            try:
                complete_updated_plan = await _fetch_complete_training_plan(request.user_profile_id)
                
                if complete_updated_plan:
                    logger.info("✅ Complete updated training plan fetched with real IDs and nested data")
                    return PlanFeedbackResponse(
                        success=True,
                        ai_response=update_result.get("ai_message", "Thank you for your feedback! I've updated your plan based on your input. Take a look and let me know if you'd like any other changes! 💪"),
                        plan_updated=True,
                        updated_plan=complete_updated_plan,  # Use fetched plan with real IDs and nested data
                        changes_explanation=update_result.get("explanation", "Plan updated successfully")
                    )
                else:
                    logger.warning("⚠️ Could not fetch complete updated plan, returning LLM data as fallback")
                    # Fallback to LLM data if fetch fails
                    return PlanFeedbackResponse(
                        success=True,
                        ai_response=update_result.get("ai_message", "Thank you for your feedback! I've updated your plan based on your input. Take a look and let me know if you'd like any other changes! 💪"),
                        plan_updated=True,
                        updated_plan=updated_plan_data,  # Fallback to LLM data
                        changes_explanation=update_result.get("explanation", "Plan updated successfully")
                    )
            except Exception as fetch_error:
                logger.error(f"❌ Error fetching complete updated training plan: {str(fetch_error)}")
                # Fallback to LLM data if fetch fails
                return PlanFeedbackResponse(
                    success=True,
                    ai_response=update_result.get("ai_message", "Thank you for your feedback! I've updated your plan based on your input. Take a look and let me know if you'd like any other changes! 💪"),
                    plan_updated=True,
                    updated_plan=updated_plan_data,  # Fallback to LLM data
                    changes_explanation=update_result.get("explanation", "Plan updated successfully")
                )
        else:
            # Just respond without updating plan - use simple fallback message
            ai_response = "Thanks for your question! Here's my guidance:"
            
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_response,
                plan_updated=False,
                updated_plan=None,
                changes_explanation=None,
                navigate_to_main_app=False
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing plan feedback: {str(e)}")
        return PlanFeedbackResponse(
            success=False,
            ai_response="I apologize, but I encountered an error processing your feedback. Please try again.",
            plan_updated=False,
            updated_plan=None,
            changes_explanation=None,
            error=str(e)
        )
