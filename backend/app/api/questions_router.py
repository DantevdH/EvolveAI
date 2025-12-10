"""
Initial questions router (split from legacy training_router).
Uses InterviewAgent; preserves existing DB/profile flow.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends

from app.api.dependencies import get_interview_agent
from app.schemas.question_schemas import InitialQuestionsRequest
from app.services.database_service import db_service, extract_user_id_from_jwt


router = APIRouter(prefix="/api/training", tags=["training-questions"])
logger = logging.getLogger(__name__)


async def _safe_db_update(
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


@router.post("/initial-questions")
async def get_initial_questions(
    request: InitialQuestionsRequest,
    agent=Depends(get_interview_agent),
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

            create_result = await _safe_db_update(
                "Create user profile",
                db_service.create_user_profile,
                user_id=user_id,
                profile_data=profile_data,
                jwt_token=request.jwt_token,
            )

            if create_result.get("success"):
                user_profile_id = create_result.get("data", {}).get("id")
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
                        detail="Could not create or find user profile. Please try again.",
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

                    if profile_data.get("initial_responses"):
                        stored_responses = profile_data.get("initial_responses", {})
                        if not isinstance(stored_responses, dict):
                            stored_responses = {}
                        logger.info(f"Loaded {len(stored_responses)} stored responses")

                    initial_questions_data = profile_data.get("initial_questions")
                    if initial_questions_data:
                        if isinstance(initial_questions_data, dict):
                            stored_questions = initial_questions_data.get("questions", [])
                            stored_ai_message = initial_questions_data.get("ai_message")
                        elif isinstance(initial_questions_data, list):
                            stored_questions = initial_questions_data
                        logger.info(f"Loaded {len(stored_questions)} stored questions")

                    if not stored_ai_message and profile_data.get("initial_ai_message"):
                        stored_ai_message = profile_data.get("initial_ai_message")
            except Exception as e:
                logger.warning(f"Failed to load stored profile data: {str(e)}", exc_info=True)

        # Merge incoming initial_responses with stored responses
        merged_responses = dict(stored_responses)
        if request.initial_responses:
            merged_responses.update(request.initial_responses)
            logger.info(
                f"Merged {len(request.initial_responses)} incoming responses with {len(stored_responses)} stored responses"
            )

        # Generate questions (with latency tracking) - one-by-one flow
        questions_response = await agent.generate_initial_questions(
            request.personal_info,
            user_profile_id=user_profile_id,
            question_history=request.question_history,
        )

        # Append only new questions (filter out questions that already exist)
        existing_question_ids = {q.get("id") for q in stored_questions if isinstance(q, dict) and q.get("id")}
        new_questions = []
        for q in questions_response.questions:
            q_dict = q.model_dump(exclude_unset=True, mode="json")
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
                sq = q.model_dump(exclude_unset=True, mode="json") if hasattr(q, "model_dump") else q
                serialized_questions_for_storage.append(sq)

        ai_message_to_store = questions_response.ai_message or stored_ai_message
        information_complete = questions_response.information_complete

        store_data = {
            "initial_questions": {
                "questions": serialized_questions_for_storage,
                "ai_message": ai_message_to_store,
            },
            "initial_responses": merged_responses,
            "information_complete": information_complete,
        }

        store_result = await _safe_db_update(
            "Store merged initial questions and responses",
            db_service.update_user_profile,
            user_id=user_id,
            data=store_data,
            jwt_token=request.jwt_token,
        )

        if not store_result.get("success"):
            logger.warning(f"First save attempt failed: {store_result.get('error')}. Retrying...")
            store_result = await _safe_db_update(
                "Store merged initial questions and responses (retry)",
                db_service.update_user_profile,
                user_id=user_id,
                data=store_data,
                jwt_token=request.jwt_token,
            )

            if not store_result.get("success"):
                logger.error(f"Failed to save questions after retry: {store_result.get('error')}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save your responses. Please try again.",
                )

        if information_complete:
            logger.info("✅ Information collection complete - ready for plan generation")
        else:
            logger.info(f"✅ Generated {questions_response.total_questions} initial questions")

        serialized_new_questions = []
        for q in questions_response.questions:
            sq = q.model_dump(exclude_unset=True, mode="json")
            serialized_new_questions.append(sq)

        total_questions_count = len(all_questions)

        return {
            "success": True,
            "data": {
                "questions": serialized_new_questions,
                "total_questions": total_questions_count,
                "estimated_time_minutes": questions_response.estimated_time_minutes,
                "ai_message": ai_message_to_store,
                "information_complete": information_complete,
                "user_profile_id": user_profile_id,
                "merged_responses": merged_responses,
            },
            "message": "Information collection complete" if information_complete else "Initial questions generated successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating initial questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate initial questions: {str(e)}")
