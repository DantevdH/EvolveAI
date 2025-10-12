"""
training API Endpoints

Handles the complete training workflow with a clean, unified interface:
- Initial Questions (AI-generated)
- Follow-up Questions (AI-generated)
- Plan Generation (AI)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging
import os
import jwt

from core.training.schemas.question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    TrainingPlanOutlineRequest,
    PlanGenerationRequest,
    PlanGenerationResponse,
    PersonalInfo,
)
from core.training.training_coach import TrainingCoach
from core.training.schemas.training_schemas import TrainingPlan
from core.training.helpers.database_service import db_service

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
                    for strength_exercise in strength_exercises:
                        exercise_response = (
                            supabase.table("exercises")
                            .select("*")
                            .eq("id", strength_exercise["exercise_id"])
                            .single()
                            .execute()
                        )
                        if exercise_response.data:
                            strength_exercise["exercise"] = exercise_response.data
                        else:
                            strength_exercise["exercise"] = None

                    daily_training["strength_exercise"] = strength_exercises

                    # Get endurance sessions
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

        # Build complete response
        training_plan["weekly_schedules"] = weekly_schedules

        return training_plan

    except Exception as e:
        logger.error(f"❌ Error fetching complete training plan: {str(e)}")
        return None


router = APIRouter(prefix="/api/training", tags=["training"])


# Dependency to get TrainingCoach instance
def get_training_coach() -> TrainingCoach:
    """Get TrainingCoach instance with all capabilities."""
    return TrainingCoach()


# Shared JWT extraction dependency
def extract_user_id_from_jwt(jwt_token: str) -> str:
    """Extract user_id from JWT token with proper error handling."""
    try:
        decoded_token = jwt.decode(jwt_token, options={"verify_signature": False})
        user_id = decoded_token.get("sub")  # 'sub' contains the user UUID

        if not user_id:
            raise ValueError("No user_id found in JWT token")

        return user_id
    except Exception as e:
        logger.error(f"❌ Error extracting user_id from JWT token: {str(e)}")
        raise ValueError(f"Invalid JWT token: {str(e)}")


@router.post("/initial-questions")
async def get_initial_questions(
    request: InitialQuestionsRequest, coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate initial personalized questions based on personal info and goal."""
    try:
        logger.info(
            f"🚀 Generating initial questions for user: {request.personal_info.goal_description}"
        )

        # Create user profile first
        try:
            # Extract user_id from JWT token
            user_id = extract_user_id_from_jwt(request.jwt_token)

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
                user_id=user_id, profile_data=profile_data, jwt_token=request.jwt_token
            )

            if create_result.get("success"):
                logger.info(
                    f"✅ User profile created successfully (ID: {create_result.get('data', {}).get('id')})"
                )
            else:
                logger.error(
                    f"❌ Failed to create user profile: {create_result.get('error')}"
                )
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}
        except Exception as e:
            logger.error(f"❌ Error creating user profile: {str(e)}")

        questions_response = coach.generate_initial_questions(request.personal_info)

        # Store initial questions and AI message in user profile
        try:
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={
                    "initial_questions": {
                        "questions": [
                            question.model_dump()
                            for question in questions_response.questions
                        ],
                        "ai_message": questions_response.ai_message,
                    }
                },
                jwt_token=request.jwt_token,
            )

            if update_result.get("success"):
                logger.info(
                    f"✅ User profile updated with initial questions and ai message {questions_response.ai_message}"
                )
            else:
                logger.error(
                    f"❌ Failed to update user profile with initial questions: {update_result.get('error')}"
                )
        except Exception as e:
            logger.error(
                f"❌ Error updating user profile with initial questions: {str(e)}"
            )

        logger.info(
            f"✅ Generated {questions_response.total_questions} initial questions for {request.personal_info.username}"
        )

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

    except Exception as e:
        logger.error(f"Error generating initial questions: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate initial questions: {str(e)}",
        }


@router.post("/follow-up-questions")
async def get_follow_up_questions(
    request: FollowUpQuestionsRequest,
    coach: TrainingCoach = Depends(get_training_coach),
):
    """Generate follow-up questions based on initial responses."""
    try:
        # Validate input
        if not request.initial_responses or len(request.initial_responses) == 0:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty",
            }

        # Extract user_id from JWT token
        try:
            user_id = extract_user_id_from_jwt(request.jwt_token)
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}

        logger.info(
            f"Generating follow-up questions for user: {request.personal_info.goal_description}"
        )

        # Use initial questions from frontend (not from database)
        initial_questions = request.initial_questions

        # Validate questions structure
        if not initial_questions or not isinstance(initial_questions, list):
            logger.error("❌ Invalid initial questions structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid initial questions structure",
            }

        # Format responses using backend ResponseFormatter
        from core.training.helpers.response_formatter import ResponseFormatter

        formatted_responses = ResponseFormatter.format_responses(
            request.initial_responses, initial_questions
        )

        # Store initial responses FIRST (before generating follow-up questions)
        try:
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={"initial_responses": request.initial_responses},
                jwt_token=request.jwt_token,
            )

            if update_result.get("success"):
                logger.info(f"✅ User profile updated with initial responses")
            else:
                logger.error(
                    f"❌ Failed to update user profile with initial responses: {update_result.get('error')}"
                )
        except Exception as e:
            logger.error(
                f"❌ Error updating user profile with initial responses: {str(e)}"
            )

        # Generate follow-up questions using formatted responses
        questions_response = coach.generate_follow_up_questions(
            request.personal_info, formatted_responses, initial_questions
        )

        # Store follow-up questions and AI message AFTER generation
        try:
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={
                    "follow_up_questions": {
                        "questions": [
                            question.model_dump()
                            for question in questions_response.questions
                        ],
                        "ai_message": questions_response.ai_message,
                    }
                },
                jwt_token=request.jwt_token,
            )

            if update_result.get("success"):
                logger.info(f"✅ User profile updated with follow-up questions")
            else:
                logger.error(
                    f"❌ Failed to update user profile with follow-up questions: {update_result.get('error')}"
                )
        except Exception as e:
            logger.error(f"❌ Error updating user profile: {str(e)}")

        logger.info(
            f"✅ Generated {questions_response.total_questions} follow-up questions for {request.personal_info.username}"
        )

        return {
            "success": True,
            "data": {
                "questions": questions_response.questions,
                "total_questions": questions_response.total_questions,
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": questions_response.ai_message,
                "initial_questions": initial_questions,  # Return questions from frontend
            },
            "message": "Follow-up questions generated successfully",
        }

    except Exception as e:
        logger.error(f"Error generating follow-up questions: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate follow-up questions: {str(e)}",
        }


@router.post("/training-plan-outline")
async def generate_training_plan_outline(
    request: TrainingPlanOutlineRequest,
    coach: TrainingCoach = Depends(get_training_coach),
):
    """Generate a training plan outline before creating the final plan."""

    try:
        # Validate input
        if not request.initial_responses or len(request.initial_responses) == 0:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty",
            }

        if not request.follow_up_responses:
            return {
                "success": False,
                "data": None,
                "message": "Follow-up responses cannot be empty",
            }

        # Extract user_id from JWT token
        try:
            user_id = extract_user_id_from_jwt(request.jwt_token)
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}

        logger.info(
            f"Generating training plan outline for user: {request.personal_info.username}"
        )

        # Use questions from frontend (not from database)
        initial_questions = request.initial_questions
        follow_up_questions = request.follow_up_questions

        # Validate questions structure
        if not initial_questions or not isinstance(initial_questions, list):
            logger.error("❌ Invalid initial questions structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid initial questions structure",
            }

        if not follow_up_questions or not isinstance(follow_up_questions, list):
            logger.error("❌ Invalid follow-up questions structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid follow-up questions structure",
            }

        # Format responses using backend ResponseFormatter
        from core.training.helpers.response_formatter import ResponseFormatter

        formatted_initial_responses = ResponseFormatter.format_responses(
            request.initial_responses, initial_questions
        )
        formatted_follow_up_responses = ResponseFormatter.format_responses(
            request.follow_up_responses, follow_up_questions
        )

        # Store follow-up responses FIRST (before generating plan outline)
        try:
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={"follow_up_responses": request.follow_up_responses},
                jwt_token=request.jwt_token,
            )

            if update_result.get("success"):
                logger.info(f"✅ User profile updated with follow-up responses")
            else:
                logger.error(
                    f"❌ Failed to update user profile with follow-up responses: {update_result.get('error')}"
                )
        except Exception as e:
            logger.error(
                f"❌ Error updating user profile with follow-up responses: {str(e)}"
            )

        # Extract initial lessons from onboarding Q&A (ACE pattern seed lessons)
        logger.info("📘 Extracting initial lessons from onboarding responses...")
        personal_info_with_user_id = request.personal_info.model_copy(
            update={"user_id": user_id}
        )
        initial_lessons = coach.extract_initial_lessons_from_onboarding(
            personal_info_with_user_id,
            formatted_initial_responses,
            formatted_follow_up_responses,
        )

        # Create initial playbook
        from core.base.schemas.playbook_schemas import UserPlaybook

        initial_playbook = UserPlaybook(
            user_id=user_id, lessons=initial_lessons, total_lessons=len(initial_lessons)
        )
        logger.info(
            f"📘 Created initial playbook with {len(initial_lessons)} onboarding lessons"
        )

        # Generate training plan outline using the coach (now with playbook context)
        result = coach.generate_training_plan_outline(
            personal_info=personal_info_with_user_id,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            initial_questions=initial_questions,
            follow_up_questions=follow_up_questions,
            playbook=initial_playbook,  # Pass the initial playbook
        )

        logger.info(f"Training plan outline result: {result}")

        if result.get("success"):
            logger.info("Training plan outline generated successfully")

            # Store plan outline, AI message, and playbook AFTER generation
            try:
                # Store the initial playbook in user profile for now (will move to training_plans later)
                update_data = {
                    "plan_outline": {
                        "outline": result.get("outline"),
                        "ai_message": result.get("ai_message"),
                    },
                    "plan_outline_feedback": "",  # Initialize as empty string
                    "initial_playbook": initial_playbook.model_dump(),  # Store playbook temporarily
                }

                update_result = await db_service.update_user_profile(
                    user_id=user_id, data=update_data, jwt_token=request.jwt_token
                )

                if update_result.get("success"):
                    logger.info(
                        f"✅ User profile updated with plan outline, feedback, and playbook ({len(initial_lessons)} lessons)"
                    )
                else:
                    logger.error(
                        f"❌ Failed to update user profile with plan outline: {update_result.get('error')}"
                    )
            except Exception as e:
                logger.error(f"❌ Error updating user profile: {str(e)}")

            return {
                "success": True,
                "data": {
                    "outline": result.get("outline"),
                    "ai_message": result.get("ai_message"),
                    "metadata": result.get("metadata", {}),
                    "initial_questions": initial_questions,  # Return questions from frontend
                    "follow_up_questions": follow_up_questions,  # Return questions from frontend
                },
                "message": "Training plan outline generated successfully",
            }
        else:
            logger.error(
                f"Failed to generate training plan outline: {result.get('error')}"
            )
            return {
                "success": False,
                "data": None,
                "message": result.get(
                    "error", "Failed to generate training plan outline"
                ),
            }

    except Exception as e:
        logger.error(f"Error generating training plan outline: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate training plan outline: {str(e)}",
        }


@router.post("/generate-plan")
async def generate_training_plan(
    request: PlanGenerationRequest, coach: TrainingCoach = Depends(get_training_coach)
):
    """Generate the final training plan using only initial/follow-up questions and exercises."""

    try:
        # Validate input
        if not request.initial_responses or len(request.initial_responses) == 0:
            return {
                "success": False,
                "data": None,
                "message": "Initial responses cannot be empty",
            }

        if not request.follow_up_responses:
            return {
                "success": False,
                "data": None,
                "message": "Follow-up responses cannot be empty",
            }

        logger.info(
            f"Generating training plan for user: {request.personal_info.goal_description}"
        )

        # Extract user_id from JWT token and get user profile ID
        try:
            user_id = extract_user_id_from_jwt(request.jwt_token)

            # Get user profile ID from database
            logger.info(f"🔍 Looking up user profile for user_id: {user_id}")
            user_profile_result = await db_service.get_user_profile_by_user_id(
                user_id, request.jwt_token
            )

            if not user_profile_result.get("success") or not user_profile_result.get(
                "data"
            ):
                logger.error(
                    f"❌ Could not find user profile in database for user_id: {user_id}"
                )
                return {
                    "success": False,
                    "data": None,
                    "message": "User profile not found - please complete onboarding first",
                }

            user_profile_id = user_profile_result.get("data", {}).get("id")
            logger.info(f"✅ Found user profile ID: {user_profile_id}")

        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}
        except Exception as e:
            logger.error(f"❌ Error getting user profile ID: {str(e)}")
            return {
                "success": False,
                "data": None,
                "message": f"Error getting user profile: {str(e)}",
            }

        # Use questions and plan outline from frontend (not from database)
        initial_questions = request.initial_questions
        follow_up_questions = request.follow_up_questions

        # Normalize plan_outline structure - handle both wrapped and direct formats
        plan_outline = request.plan_outline
        if (
            plan_outline
            and isinstance(plan_outline, dict)
            and "outline" in plan_outline
        ):
            # If outline is wrapped (from onboarding flow), extract the actual outline
            plan_outline = plan_outline["outline"]

        # Validate questions structure
        if not initial_questions or not isinstance(initial_questions, list):
            logger.error("❌ Invalid initial questions structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid initial questions structure",
            }

        if not follow_up_questions or not isinstance(follow_up_questions, list):
            logger.error("❌ Invalid follow-up questions structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid follow-up questions structure",
            }

        if not plan_outline or not isinstance(plan_outline, dict):
            logger.error("❌ Invalid plan outline structure")
            return {
                "success": False,
                "data": None,
                "message": "Invalid plan outline structure",
            }

        # Format responses using backend ResponseFormatter
        from core.training.helpers.response_formatter import ResponseFormatter

        formatted_initial_responses = ResponseFormatter.format_responses(
            request.initial_responses, initial_questions
        )
        formatted_follow_up_responses = ResponseFormatter.format_responses(
            request.follow_up_responses, follow_up_questions
        )

        # Store plan outline feedback separately (use empty string if None)
        try:
            update_result = await db_service.update_user_profile(
                user_id=user_id,
                data={"plan_outline_feedback": request.plan_outline_feedback or ""},
                jwt_token=request.jwt_token,
            )

            if update_result.get("success"):
                logger.info(f"✅ User profile updated with plan outline feedback")
            else:
                logger.error(
                    f"❌ Failed to update user profile with plan outline feedback: {update_result.get('error')}"
                )
        except Exception as e:
            logger.error(
                f"❌ Error updating user profile with plan outline feedback: {str(e)}"
            )

        # Add user_id to personal_info for ACE pattern playbook loading
        personal_info_with_user_id = request.personal_info.model_copy(
            update={"user_id": user_id}
        )

        # Handle plan outline feedback (ACE pattern enhancement)
        if request.plan_outline_feedback and request.plan_outline_feedback.strip():
            logger.info(
                "📘 User provided outline feedback - extracting preference lesson..."
            )

            outline_feedback_lesson = coach.extract_outline_feedback_lesson(
                personal_info=personal_info_with_user_id,
                outline=plan_outline,
                feedback=request.plan_outline_feedback,
            )

            if outline_feedback_lesson:
                # Load current playbook from user_profile
                from core.base.schemas.playbook_schemas import UserPlaybook

                user_profile = await db_service.get_user_profile_by_user_id(
                    user_id, request.jwt_token
                )

                if user_profile.get("success") and user_profile.get("data"):
                    initial_playbook_data = user_profile["data"].get("initial_playbook")

                    if initial_playbook_data:
                        playbook = UserPlaybook(**initial_playbook_data)
                        playbook.lessons.append(outline_feedback_lesson)
                        playbook.total_lessons = len(playbook.lessons)

                        # Update playbook in user_profile
                        await db_service.update_user_profile(
                            user_id=user_id,
                            data={"initial_playbook": playbook.model_dump()},
                            jwt_token=request.jwt_token,
                        )

                        logger.info(
                            f"✅ Added outline feedback lesson to playbook: {outline_feedback_lesson.text}"
                        )
                    else:
                        logger.warning(
                            "Could not find initial playbook to add outline feedback lesson"
                        )
                else:
                    logger.warning(
                        "Could not load user profile to add outline feedback lesson"
                    )

        # Generate training plan using formatted responses and plan outline from frontend
        result = await coach.generate_training_plan(
            personal_info=personal_info_with_user_id,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            plan_outline=plan_outline,
            initial_questions=initial_questions,
            follow_up_questions=follow_up_questions,
        )

        if result.get("success"):
            logger.info("Training plan generated successfully")

            # Save training plan to database - REQUIRED
            training_plan_data = result.get("training_plan")
            user_playbook = result.get("user_playbook")  # Get playbook from result

            try:
                logger.info(
                    f"Saving training plan to database for user_profile_id: {user_profile_id}"
                )

                # Log playbook status
                if user_playbook:
                    logger.info(
                        f"📘 Playbook included with {len(user_playbook.get('lessons', []))} lessons"
                    )

                # Save to database (including playbook)
                save_result = await db_service.save_training_plan(
                    user_profile_id=user_profile_id,
                    training_plan_data=training_plan_data,
                    jwt_token=request.jwt_token,
                    user_playbook=user_playbook,  # Pass playbook to be saved
                )

                if save_result.get("success"):
                    training_plan_id = save_result.get("data", {}).get(
                        "training_plan_id"
                    )
                    logger.info(
                        f"✅ Training plan saved successfully (ID: {training_plan_id}) for user {user_profile_id}"
                    )

                    # Fetch the complete training plan with real IDs from database
                    logger.info("Fetching complete training plan with real IDs...")
                    try:
                        complete_plan = await _fetch_complete_training_plan(
                            user_profile_id
                        )

                        if complete_plan:
                            logger.info(
                                "✅ Complete training plan fetched with real IDs - returning directly"
                            )
                            response_data = {
                                "success": True,
                                "data": complete_plan,
                                "message": "Training plan generated and saved successfully",
                            }
                        else:
                            logger.warning(
                                "⚠️ Could not fetch complete plan, returning original data"
                            )
                            response_data = {
                                "success": True,
                                "data": training_plan_data,
                                "message": "Training plan generated and saved successfully",
                            }
                    except Exception as fetch_error:
                        logger.error(
                            f"❌ Error fetching complete training plan: {str(fetch_error)}"
                        )
                        response_data = {
                            "success": False,
                            "data": None,
                            "message": f"Training plan generated and saved but failed to fetch complete data: {str(fetch_error)}",
                        }
                else:
                    logger.error(
                        f"❌ Failed to save training plan to database: {save_result.get('error')}"
                    )
                    response_data = {
                        "success": False,
                        "data": None,
                        "message": f"Training plan generated but failed to save: {save_result.get('error')}",
                    }
            except Exception as e:
                logger.error(f"❌ Error saving training plan to database: {str(e)}")
                response_data = {
                    "success": False,
                    "data": None,
                    "message": f"Training plan generated but failed to save: {str(e)}",
                }

            return response_data
        else:
            logger.error(f"Training plan generation failed: {result.get('error')}")
            return {
                "success": False,
                "data": None,
                "message": result.get("error", "Failed to generate training plan"),
            }

    except Exception as e:
        logger.error(f"Error generating training plan: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to generate training plan: {str(e)}",
        }


# ============================================================================
# ACE PATTERN ENDPOINTS (Adaptive Context Engine)
# ============================================================================


@router.post("/feedback/submit")
async def submit_training_feedback(
    request: Dict[str, Any], coach: TrainingCoach = Depends(get_training_coach)
):
    """
    Submit training feedback to generate personalized lessons for future plans.

    This endpoint processes user feedback (completion rate, HR data, soreness, etc.)
    and uses the Reflector/Curator pattern to learn from it.
    """
    try:
        # Extract user_id from JWT token
        try:
            jwt_token = request.get("jwt_token")
            if not jwt_token:
                return {
                    "success": False,
                    "data": None,
                    "message": "JWT token is required",
                }
            user_id = extract_user_id_from_jwt(jwt_token)
        except ValueError as e:
            logger.error(f"❌ JWT token error: {str(e)}")
            return {"success": False, "data": None, "message": str(e)}

        # Validate required fields
        required_fields = [
            "plan_id",
            "week_number",
            "sessions_completed",
            "sessions_planned",
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
        from core.base.schemas.playbook_schemas import TrainingOutcome
        from core.training.schemas.question_schemas import PersonalInfo

        # Build TrainingOutcome object
        outcome_data = {
            "plan_id": request["plan_id"],
            "user_id": user_id,
            "week_number": request["week_number"],
            "sessions_completed": request["sessions_completed"],
            "sessions_planned": request["sessions_planned"],
            "completion_rate": request["sessions_completed"]
            / request["sessions_planned"],
            "user_feedback": request.get("user_feedback"),
            "user_rating": request.get("user_rating"),
            "avg_heart_rate": request.get("avg_heart_rate"),
            "max_heart_rate": request.get("max_heart_rate"),
            "target_heart_rate_zone": request.get("target_heart_rate_zone"),
            "energy_level": request.get("energy_level"),
            "soreness_level": request.get("soreness_level"),
            "injury_reported": request.get("injury_reported", False),
            "injury_description": request.get("injury_description"),
            "performance_metrics": request.get("performance_metrics", {}),
            "notes": request.get("notes"),
        }

        outcome = TrainingOutcome(**outcome_data)

        # Build PersonalInfo object
        personal_info = PersonalInfo(**request["personal_info"])

        # Get plan context (optional, helps with analysis)
        plan_context = request.get(
            "plan_context", f"Training plan {request['plan_id']}"
        )

        logger.info(
            f"Processing feedback for user {personal_info.username}, plan {outcome.plan_id}, week {outcome.week_number}"
        )

        # Process feedback through ACE pattern (Reflector → Curator → Playbook)
        result = await coach.process_training_feedback(
            outcome=outcome, personal_info=personal_info, plan_context=plan_context
        )

        if result.get("success"):
            logger.info(f"✅ Feedback processed: {result.get('message')}")
            return {
                "success": True,
                "data": {
                    "lessons_generated": result.get("lessons_generated"),
                    "lessons_added": result.get("lessons_added"),
                    "lessons_updated": result.get("lessons_updated"),
                    "total_lessons": result.get("total_lessons_in_playbook"),
                    "decisions": result.get("decisions", []),
                },
                "message": result.get("message"),
            }
        else:
            logger.error(f"❌ Failed to process feedback: {result.get('error')}")
            return {
                "success": False,
                "data": None,
                "message": result.get("error", "Failed to process feedback"),
            }

    except Exception as e:
        logger.error(f"Error submitting training feedback: {str(e)}")
        return {
            "success": False,
            "data": None,
            "message": f"Failed to submit feedback: {str(e)}",
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

        # Load playbook
        playbook = await db_service.load_user_playbook(user_id_param, jwt_token)

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
