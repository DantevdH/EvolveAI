"""
Chat router - handles training chat/feedback with intent classification and plan updates.
"""

import copy
import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from app.api.dependencies import get_training_agent, get_interview_agent
from app.agents.training_agent import TrainingAgent
from app.schemas.question_schemas import PlanFeedbackRequest, PlanFeedbackResponse, PersonalInfo
from app.schemas.playbook_schemas import UserPlaybook
from app.services.database_service import db_service, extract_user_id_from_jwt
from app.helpers.utils.date_mapper import map_daily_training_dates

router = APIRouter(prefix="/api/training", tags=["training-chat"])
logger = logging.getLogger(__name__)


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


def _create_plan_response(training_plan: Any, ai_message: str, context: str = "") -> Dict[str, Any]:
    """Helper to create plan_response with ai_message for various intents."""
    logger.info(f"🔄 [{context}] Creating plan_response from training_plan (type: {type(training_plan)})")
    plan_response = copy.deepcopy(training_plan) if isinstance(training_plan, dict) else dict(training_plan or {})
    if isinstance(plan_response, dict) and ai_message:
        plan_response['ai_message'] = ai_message
    return plan_response


async def _handle_playbook_extraction_from_conversation_async(
    user_id: str,
    user_profile_id: int,
    jwt_token: str,
    conversation_history: List[Dict[str, str]],
    training_plan: Dict[str, Any],
    personal_info: PersonalInfo,
) -> None:
    """
    Extract and update playbook from conversation history (async background task).
    
    This function runs in the background after plan updates and does not return values.
    It loads the current playbook from DB, extracts/curates lessons using structured operations,
    enriches ADJUST/ADD operations with RAG, and saves operations to DB.
    """
    if not conversation_history or len(conversation_history) == 0:
        logger.info("📘 No conversation history provided - skipping lesson extraction")
        return
    
    try:
        logger.info(f"📘 [Background] Extracting lessons from conversation history ({len(conversation_history)} messages)")
        
        # 1. Load current playbook from DB (source of truth, not request.playbook which may be stale)
        existing_playbook = await db_service.load_user_playbook(user_profile_id, jwt_token)
        if not existing_playbook:
            existing_playbook = UserPlaybook(user_id=user_id, lessons=[], total_lessons=0)
            logger.info("📘 [Background] No existing playbook found, starting fresh")
        else:
            logger.info(f"📘 [Background] Loaded existing playbook with {len(existing_playbook.lessons)} lessons")
        
        # 2. Extract and curate (returns structured operations: KEEP/ADJUST/REMOVE/ADD)
        from app.api.dependencies import get_playbook_service
        playbook_service = get_playbook_service()
        
        structured_update = await playbook_service.extract_and_curate_conversation_lessons(
            conversation_history=conversation_history,
            personal_info=personal_info,
            accepted_training_plan=training_plan,
            existing_playbook=existing_playbook,
        )
        
        if not structured_update or not structured_update.operations:
            logger.info("📘 [Background] No operations generated from conversation history")
            return
        
        logger.info(
            f"📘 [Background] Generated {len(structured_update.operations)} operations: "
            f"{len([op for op in structured_update.operations if op.operation == 'KEEP'])} KEEP, "
            f"{len([op for op in structured_update.operations if op.operation == 'ADJUST'])} ADJUST, "
            f"{len([op for op in structured_update.operations if op.operation == 'REMOVE'])} REMOVE, "
            f"{len([op for op in structured_update.operations if op.operation == 'ADD'])} ADD"
        )
        
        # 3. Run RAG enrichment only for ADJUST and ADD lessons
        enriched_operations = await playbook_service.enrich_operations_with_context(
            structured_update.operations,
            rag_service=playbook_service.curator_agent.rag_service
        )
        
        # 4. Save operations to DB (KEEP: no-op, ADJUST: update, REMOVE: delete, ADD: insert)
        save_result = await db_service.save_playbook_operations(
            user_profile_id=user_profile_id,
            operations=enriched_operations,
            jwt_token=jwt_token
        )
        
        if save_result.get("success"):
            ops = save_result.get("operations", {})
            logger.info(
                f"✅ [Background] Saved playbook operations: "
                f"{ops.get('keep', 0)} KEEP, {ops.get('adjust', 0)} ADJUST, "
                f"{ops.get('remove', 0)} REMOVE, {ops.get('add', 0)} ADD"
            )
        else:
            logger.error(f"❌ [Background] Failed to save playbook operations: {save_result.get('error')}")
            
    except Exception as e:
        logger.error(f"❌ [Background] Error extracting lessons: {e}", exc_info=True)
        # Don't raise - background tasks should not crash the application


@router.post("/chat", response_model=PlanFeedbackResponse)
async def chat(
    request: PlanFeedbackRequest,
    background_tasks: BackgroundTasks,
    agent: TrainingAgent = Depends(get_training_agent)
):
    """
    Multi-purpose training chat endpoint that handles various user intents.
    
    Handles:
    - Questions/Clarity: Returns AI response without plan updates
    - Plan Updates: Updates the latest week based on feedback
    - Unclear: Asks for clarification
    - Other: Handles off-topic messages
    """
    try:
        updated_playbook = None
        
        if not request.jwt_token:
            raise HTTPException(status_code=401, detail="Missing JWT token")

        training_plan = request.training_plan
        
        try:
            plan_id = int(request.plan_id) if request.plan_id is not None else None
        except Exception:
            plan_id = None
        
        if plan_id is None:
            raise HTTPException(status_code=400, detail="Missing or invalid plan_id in request")
        
        week_number = request.week_number
        if week_number is None:
            raise HTTPException(status_code=400, detail="week_number is required in request")
        
        current_week = None
        if isinstance(training_plan, dict):
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if weekly_schedules:
                current_week = next(
                    (w for w in weekly_schedules if w.get("week_number") == week_number),
                    None
                )
        
        if not current_week:
            raise HTTPException(
                status_code=400, 
                detail=f"Could not find week {week_number} in training_plan. Available weeks: {[w.get('week_number') for w in training_plan.get('weekly_schedules', []) if w.get('week_number')]}"
            )
        
        feedback_message = request.feedback_message
        conversation_history = request.conversation_history or []

        # Stage 1: Intent classification
        logger.info("🔍 Stage 1: Classifying feedback intent (lightweight)...")
        interview_agent = get_interview_agent()
        classification_result = await interview_agent.classify_feedback_intent_lightweight(
            feedback_message=feedback_message,
            conversation_history=conversation_history,
            training_plan=training_plan
        )
        
        intent = classification_result.get("intent")
        action = classification_result.get("action")
        needs_plan_update = classification_result.get("needs_plan_update")
        ai_message = classification_result.get("ai_message")
        
        logger.info(f"✅ Stage 1 complete: intent={intent}, confidence={classification_result.get('confidence')}, needs_plan_update={needs_plan_update}")
        
        # Intent 1: Question (with RAG)
        if intent == "question":
            logger.info(f"❓ INTENT: Question - generating RAG-enhanced answer")
            
            # Get personal info and playbook for RAG context
            personal_info = request.personal_info
            user_playbook = None
            if request.playbook:
                user_playbook = UserPlaybook(**request.playbook)
            
            # Generate RAG-enhanced answer (always includes current_week and playbook)
            ai_message = await interview_agent.generate_rag_answer(
                user_query=feedback_message,
                training_plan=training_plan,
                conversation_history=conversation_history,
                current_week=current_week,
                playbook=user_playbook,
                personal_info=personal_info
            )
            plan_response = _create_plan_response(training_plan, ai_message, "question_rag")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=None,
                navigate_to_main_app=False
            )
        
        # Intent 2: Respond only (non-question)
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
        
        # Intent 3: Unclear
        if intent == "unclear":
            logger.info(f"❓ INTENT: Unclear (asking for clarification)")
            ai_message = ai_message or "I'm having trouble understanding your feedback. Could you please be more specific? 😊"
            plan_response = _create_plan_response(training_plan, ai_message, "unclear")
            return PlanFeedbackResponse(
                success=True,
                ai_response=ai_message,
                plan_updated=False,
                updated_plan=plan_response,
                updated_playbook=None,
                navigate_to_main_app=False
            )
        
        # Intent 4: Fallback
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
        
        # Intent 5: Update plan
        # Note: ai_message from classification is null for update_request.
        # The update_weekly_schedule method will generate the appropriate ai_message.
        logger.info("🔁 INTENT: Update plan (Stage 2: Updating week based on feedback)")
        
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        try:
            user_profile_id = int(request.user_profile_id) if request.user_profile_id is not None else None
        except Exception:
            user_profile_id = None

        if user_profile_id is None:
            logger.error("❌ Missing user_profile_id in request")
            raise HTTPException(status_code=400, detail="Invalid or missing user_profile_id")

        logger.info(f"Updating Week {week_number} for user {user_profile_id}, plan {plan_id}")
        
        if not request.personal_info:
            logger.error("❌ Missing personal_info in request")
            raise HTTPException(status_code=400, detail="Missing personal_info in request")
        
        personal_info = request.personal_info
        
        if not request.playbook:
            logger.error("❌ Missing playbook in request")
            raise HTTPException(status_code=400, detail="Missing playbook in request")
        
        user_playbook = UserPlaybook(**request.playbook)

        result = await agent.update_weekly_schedule(
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

        updated_plan_data = result.get("training_plan")
        
        if not updated_plan_data:
            raise Exception("No training plan data returned from update")

        weekly_schedules = updated_plan_data.get("weekly_schedules", [])
        updated_week = weekly_schedules[0] if weekly_schedules else None
            
        if not updated_week:
            raise Exception(f"Could not find updated week {week_number} in result")
        
        temp_plan = {"weekly_schedules": [updated_week]}
        temp_plan = map_daily_training_dates(temp_plan)
        updated_week = temp_plan.get("weekly_schedules", [updated_week])[0]
        logger.info("✅ Mapped scheduled dates to daily trainings for updated week")
        
        enriched_week = await db_service.update_single_week(
            plan_id,
            week_number,
            updated_week,
            jwt_token=request.jwt_token
        )
        
        if enriched_week is None:
            raise Exception("Failed to update week in database")
        
        logger.info(f"✅ Week {week_number} updated in database successfully")
        
        enriched_plan = {
            "id": plan_id,
            "weekly_schedules": [enriched_week],
        }
        
        ai_message = result.get("ai_message") or classification_result.get("ai_message")
        if ai_message:
            try:
                enriched_plan['ai_message'] = ai_message
            except Exception:
                pass

        # Trigger async playbook extraction in background
        if conversation_history and len(conversation_history) > 0:
            background_tasks.add_task(
                _handle_playbook_extraction_from_conversation_async,
                user_id=user_id,
                user_profile_id=user_profile_id,
                jwt_token=request.jwt_token,
                conversation_history=conversation_history,
                training_plan=enriched_plan,
                personal_info=personal_info,
            )
            logger.info("📘 Triggered async playbook extraction from conversation")

        return PlanFeedbackResponse(
            success=True,
            ai_response=ai_message or "I've updated your week! Take a look and let me know if you'd like any other changes. 💪",
            plan_updated=True,
            updated_plan=enriched_plan,
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
