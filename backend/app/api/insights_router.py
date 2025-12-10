"""
Insights router - handles training insights summary generation.
"""

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.insights_schemas import (
    InsightsSummaryRequest,
    InsightsSummaryResponse,
    AIInsightsSummary,
    InsightsMetrics,
    WeakPoint,
    TopExercise,
)
from app.services.database_service import db_service, extract_user_id_from_jwt
from app.services.insights_service import InsightsService
from app.helpers.ai.prompt_generator import PromptGenerator
from app.helpers.utils.date_mapper import map_daily_training_dates
from app.helpers.ai.llm_client import LLMClient

router = APIRouter(prefix="/api/training", tags=["training-insights"])
logger = logging.getLogger(__name__)


async def _fetch_complete_training_plan(user_profile_id: int):
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

        weekly_schedules_response = (
            supabase.table("weekly_schedules")
            .select("*")
            .eq("training_plan_id", training_plan["id"])
            .execute()
        )
        weekly_schedules = weekly_schedules_response.data or []

        for weekly_schedule in weekly_schedules:
            daily_trainings_response = (
                supabase.table("daily_training")
                .select("*")
                .eq("weekly_schedule_id", weekly_schedule["id"])
                .execute()
            )
            daily_trainings = daily_trainings_response.data or []

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


@router.post("/insights-summary", response_model=InsightsSummaryResponse)
async def get_insights_summary(
    request: InsightsSummaryRequest,
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
        user_id = extract_user_id_from_jwt(request.jwt_token)
        
        training_plan = request.training_plan
        if not training_plan:
            training_plan = await _fetch_complete_training_plan(request.user_profile_id)
            if not training_plan:
                return InsightsSummaryResponse(
                    success=False,
                    error="No training plan found"
                )
        
        training_plan = map_daily_training_dates(training_plan)
        
        volume_progress = InsightsService.extract_volume_progress(training_plan)
        training_frequency = InsightsService.extract_training_frequency(training_plan)
        training_intensity, intensity_trend = InsightsService.extract_training_intensity(training_plan)
        
        weak_points = request.weak_points or []
        top_exercises = request.top_exercises or []
        
        weak_points_dict = [wp.model_dump() if hasattr(wp, 'model_dump') else wp for wp in weak_points]
        top_exercises_dict = [ex.model_dump() if hasattr(ex, 'model_dump') else ex for ex in top_exercises]
        
        metrics_dict = {
            "volume_progress": volume_progress,
            "training_frequency": training_frequency,
            "training_intensity": training_intensity,
            "weak_points": weak_points_dict,
            "top_exercises": top_exercises_dict
        }
        
        current_data_hash = InsightsService.calculate_data_hash(metrics_dict)
        
        cached_summary = await db_service.get_insights_summary_cache(request.user_profile_id)
        use_cached = False
        
        if cached_summary:
            cached_hash = cached_summary.get("data_hash")
            
            if cached_hash == current_data_hash:
                use_cached = True
                logger.info(f"✅ Using cached insights summary (hash match)")
                cached_summary_data = cached_summary.get("summary", {})
                if cached_summary_data:
                    ai_summary = AIInsightsSummary(**cached_summary_data)
                else:
                    use_cached = False
            else:
                logger.info(f"🔄 Cache invalidated (data changed: hash mismatch)")
        
        if not use_cached:
            try:
                prompt = PromptGenerator.generate_insights_summary_prompt(metrics_dict)
                
                llm = LLMClient()
                ai_summary, completion = llm.chat_parse(
                    prompt,
                    AIInsightsSummary,
                    model_type="lightweight"
                )
                
                logger.info(f"✅ Generated new insights summary (tokens: {completion.usage.total_tokens if hasattr(completion, 'usage') else 'N/A'})")
                
                cache_data = {
                    "summary": ai_summary.model_dump(),
                    "metrics": None
                }
                await db_service.save_insights_summary_cache(
                    request.user_profile_id,
                    cache_data,
                    current_data_hash
                )
                
            except Exception as e:
                logger.error(f"Error generating AI summary: {e}")
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
