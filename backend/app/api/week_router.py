"""
Week creation router - handles creating new training weeks.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends

from app.api.dependencies import get_training_agent
from app.agents.training_agent import TrainingAgent
from app.schemas.question_schemas import CreateWeekRequest
from app.services.database_service import db_service
from app.helpers.utils.date_mapper import map_daily_training_dates

router = APIRouter(prefix="/api/training", tags=["training-week"])
logger = logging.getLogger(__name__)


@router.post("/create-week")
async def create_week(
    request: CreateWeekRequest,
    agent: TrainingAgent = Depends(get_training_agent)
):
    """
    Create a new week when the previous week is completed.
    
    Creates ONLY the next week (Week 2, 3, 4, etc.), but returns the full TrainingPlan structure
    with the new week added to the existing plan.
    
    next_week_number is automatically calculated from existing weeks (max week_number + 1)
    """
    try:
        jwt_token = request.jwt_token
        training_plan = request.training_plan
        user_profile_id = request.user_profile_id
        personal_info = request.personal_info
        
        logger.info(f"📥 Creating new week for user {user_profile_id}, plan {request.plan_id}")
        
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

        weekly_schedules = training_plan.get("weekly_schedules", [])
        if weekly_schedules:
            week_numbers = [w.get("week_number", 0) for w in weekly_schedules if w.get("week_number")]
            next_week_number = max(week_numbers) + 1 if week_numbers else 1
        else:
            next_week_number = 1
        
        logger.info(f"Calculated next_week_number: {next_week_number} from frontend training plan ({len(weekly_schedules)} existing weeks)")
        
        result = await agent.create_new_weekly_schedule(
            personal_info=personal_info,
            user_profile_id=user_profile_id,
            existing_training_plan=training_plan,
            jwt_token=jwt_token,
        )

        if not result.get("success"):
            logger.error(f"Week creation failed: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to create new week")
            )

        updated_plan_data = result.get("training_plan")
        
        result_next_week = result.get("metadata", {}).get("next_week_number")
        if result_next_week and result_next_week != next_week_number:
            logger.warning(
                f"Week number mismatch: calculated {next_week_number} but result has {result_next_week}. Using result value."
            )
            next_week_number = result_next_week

        logger.info(f"✅ Week {next_week_number} created successfully")

        if updated_plan_data:
            updated_plan_data = map_daily_training_dates(updated_plan_data)
            logger.info("✅ Mapped scheduled dates to daily trainings for new week")

        if plan_id and updated_plan_data:
            weekly_schedules = updated_plan_data.get("weekly_schedules", [])
            new_week = next(
                (w for w in weekly_schedules if w.get("week_number") == next_week_number),
                None
            )
            
            if not new_week:
                raise Exception(f"Could not find week {next_week_number} in updated plan data")
            
            enriched_week = await db_service.create_single_week(
                plan_id,
                new_week,
                jwt_token=jwt_token
            )
            
            if enriched_week is None:
                raise Exception("Failed to create week in database")
            
            logger.info(f"✅ Week {next_week_number} created in database successfully")
            
            enriched_weekly_schedules = []
            for week in weekly_schedules:
                if week.get("week_number") == next_week_number:
                    enriched_weekly_schedules.append(enriched_week)
                else:
                    enriched_weekly_schedules.append(week)
            
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
