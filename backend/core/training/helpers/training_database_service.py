"""
Database service for the new training-focused structure.
Handles training_plans, daily_training, strength_exercise, and endurance_session tables.
"""

import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from settings import settings
import json
from datetime import datetime
from logging_config import get_logger
from core.utils.env_loader import is_test_environment
from core.training.schemas.training_schemas import (
    TrainingPlan,
    DailyTraining,
    StrengthExercise,
    EnduranceSession,
)


class TrainingDatabaseService:
    """Service for training-focused database operations using Supabase."""

    def __init__(self):
        """Initialize Supabase client."""
        self.logger = get_logger(__name__)
        
        # Check if we're in a test environment
        is_test_env = is_test_environment()
        
        # Initialize Supabase client, but handle test/missing credentials gracefully
        self.supabase: Optional[Client] = None
        
        # In test environment, skip client creation entirely - tests should mock the service
        if is_test_env:
            self.logger.debug("Test environment: TrainingDatabaseService not initialized (will use mocks)")
        else:
            # Only create client in non-test environments
            try:
                supabase_url = settings.SUPABASE_URL
                supabase_key = settings.SUPABASE_ANON_KEY
                
                # Only create client if we have valid credentials
                if supabase_url and supabase_key:
                    self.supabase = create_client(supabase_url, supabase_key)
                    self.logger.debug("TrainingDatabaseService Supabase client initialized successfully")
                else:
                    self.logger.warning("Supabase credentials missing - client not initialized")
            except Exception as e:
                self.logger.error(f"Failed to initialize Supabase client: {e}")
                raise

    async def save_training_plan(
        self, user_profile_id: int, training_plan_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save a complete training plan with all its components.

        Args:
            user_profile_id: ID of the user profile
            training_plan_data: Complete training plan data

        Returns:
            Dictionary with success status and training plan ID
        """
        try:
            self.logger.info(
                f"Saving training plan for user_profile_id: {user_profile_id}"
            )

            # Create the main training plan record
            plan_data = {
                "user_profile_id": user_profile_id,
                "title": training_plan_data.get("title", "Training Plan"),
                "summary": training_plan_data.get("summary", ""),
            }

            plan_result = (
                self.supabase.table("training_plans").insert(plan_data).execute()
            )

            if not plan_result.data:
                self.logger.error("Failed to create training plan record")
                return {
                    "success": False,
                    "error": f"Failed to create training plan record: {plan_result}",
                }

            training_plan_id = plan_result.data[0]["id"]
            self.logger.info(f"Created training plan with ID: {training_plan_id}")

            # Process weekly schedules
            weekly_schedules = training_plan_data.get("weekly_schedules", [])
            for week_data in weekly_schedules:
                await self._create_weekly_schedule(training_plan_id, week_data)

            return {
                "success": True,
                "training_plan_id": training_plan_id,
                "message": "Training plan saved successfully",
            }

        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during training plan save: {error_str}")
            return {
                "success": False,
                "error": f"Failed to save training plan: {error_str}",
            }

    async def _create_weekly_schedule(
        self, training_plan_id: int, week_data: Dict[str, Any]
    ) -> None:
        """Create a weekly schedule with all its daily trainings."""
        try:
            # Create weekly schedule record
            schedule_data = {
                "training_plan_id": training_plan_id,
                "week_number": week_data.get("week_number", 1),
            }

            schedule_result = (
                self.supabase.table("weekly_schedules").insert(schedule_data).execute()
            )

            if not schedule_result.data:
                self.logger.error("Failed to create weekly schedule")
                return

            weekly_schedule_id = schedule_result.data[0]["id"]
            self.logger.info(f"Created weekly schedule with ID: {weekly_schedule_id}")

            # Process daily trainings
            daily_trainings = week_data.get(
                "daily_trainings", []
            )  # Note: keeping old key for compatibility
            for day_data in daily_trainings:
                await self._create_daily_training(weekly_schedule_id, day_data)

        except Exception as e:
            self.logger.error(f"Error creating weekly schedule: {e}")

    async def _create_daily_training(
        self, weekly_schedule_id: int, day_data: Dict[str, Any]
    ) -> None:
        """Create a daily training session with strength exercises and/or endurance sessions."""
        try:
            # Determine training type based on content
            training_type = self._determine_training_type(day_data)

            # Create daily training record
            daily_data = {
                "weekly_schedule_id": weekly_schedule_id,
                "day_of_week": day_data.get("day_of_week", "Monday"),
                "is_rest_day": day_data.get("is_rest_day", False),
                "training_type": training_type,
            }

            daily_result = (
                self.supabase.table("daily_training").insert(daily_data).execute()
            )

            if not daily_result.data:
                self.logger.error("Failed to create daily training")
                return

            daily_training_id = daily_result.data[0]["id"]
            self.logger.info(f"Created daily training with ID: {daily_training_id}")

            # Process strength exercises
            exercises = day_data.get("exercises", [])
            for exercise_data in exercises:
                await self._create_strength_exercise(daily_training_id, exercise_data)

            # Process endurance sessions (if any)
            endurance_sessions = day_data.get("endurance_sessions", [])
            for session_data in endurance_sessions:
                await self._create_endurance_session(daily_training_id, session_data)

        except Exception as e:
            self.logger.error(f"Error creating daily training: {e}")

    async def _create_strength_exercise(
        self, daily_training_id: int, exercise_data: Dict[str, Any]
    ) -> None:
        """Create a strength exercise record."""
        try:
            strength_data = {
                "daily_training_id": daily_training_id,
                "exercise_id": exercise_data.get("exercise_id"),
                "sets": exercise_data.get("sets", 1),
                "reps": exercise_data.get("reps", [1]),
                "weight": exercise_data.get("weight", [0.0]),
                "execution_order": exercise_data.get("execution_order", 0),
                "completed": False,
            }

            result = (
                self.supabase.table("strength_exercise").insert(strength_data).execute()
            )

            if result.data:
                self.logger.debug(
                    f"Created strength exercise with ID: {result.data[0]['id']}"
                )
            else:
                self.logger.error("Failed to create strength exercise")

        except Exception as e:
            self.logger.error(f"Error creating strength exercise: {e}")

    async def _create_endurance_session(
        self, daily_training_id: int, session_data: Dict[str, Any]
    ) -> None:
        """Create an endurance session record."""
        try:
            endurance_data = {
                "daily_training_id": daily_training_id,
                "sport_type": session_data.get("sport_type", "running"),
                "training_volume": session_data.get("training_volume", 0),
                "unit": session_data.get("unit", "minutes"),
                "heart_rate_zone": session_data.get("heart_rate_zone", 3),  # Default to Zone 3 if not provided
                "execution_order": session_data.get("execution_order", 0),
                "completed": False,
            }

            result = (
                self.supabase.table("endurance_session")
                .insert(endurance_data)
                .execute()
            )

            if result.data:
                self.logger.debug(
                    f"Created endurance session with ID: {result.data[0]['id']}"
                )
            else:
                self.logger.error("Failed to create endurance session")

        except Exception as e:
            self.logger.error(f"Error creating endurance session: {e}")

    def _determine_training_type(self, day_data: Dict[str, Any]) -> str:
        """Determine the training type based on the day's content."""
        if day_data.get("is_rest_day", False):
            return "rest"

        has_exercises = bool(day_data.get("exercises", []))
        has_endurance = bool(day_data.get("endurance_sessions", []))

        if has_exercises and has_endurance:
            return "mixed"
        elif has_exercises:
            return "strength"
        elif has_endurance:
            return "endurance"
        else:
            return "rest"  # Default to rest if no content

    async def get_training_plan(self, user_profile_id: int) -> Dict[str, Any]:
        """Get a training plan for a user."""
        try:
            self.logger.info(
                f"Fetching training plan for user_profile_id: {user_profile_id}"
            )

            # Get the training plan
            plan_result = (
                self.supabase.table("training_plans")
                .select("*")
                .eq("user_profile_id", user_profile_id)
                .execute()
            )

            if not plan_result.data:
                return {
                    "success": False,
                    "error": "No training plan found for this user",
                }

            training_plan = plan_result.data[0]

            # Get weekly schedules
            schedules_result = (
                self.supabase.table("weekly_schedules")
                .select("*")
                .eq("training_plan_id", training_plan["id"])
                .execute()
            )

            weekly_schedules = []
            for schedule in schedules_result.data or []:
                # Get daily trainings for this schedule
                daily_result = (
                    self.supabase.table("daily_training")
                    .select("*")
                    .eq("weekly_schedule_id", schedule["id"])
                    .execute()
                )

                daily_trainings = []
                for daily in daily_result.data or []:
                    # Get strength exercises
                    exercises_result = (
                        self.supabase.table("strength_exercise")
                        .select("*")
                        .eq("daily_training_id", daily["id"])
                        .execute()
                    )
                    strength_exercises = exercises_result.data or []

                    # OPTIMIZATION #4: Batch enrich strength exercises with exercise metadata
                    # Collect all exercise_ids first, then bulk fetch metadata
                    exercise_ids_to_enrich = []
                    for strength_exercise in strength_exercises:
                        exercise_id = strength_exercise.get("exercise_id")
                        if exercise_id:
                            exercise_ids_to_enrich.append(exercise_id)
                    
                    # Bulk fetch all exercise metadata in a single query
                    exercise_metadata_map = {}
                    if exercise_ids_to_enrich:
                        try:
                            # Remove duplicates
                            unique_exercise_ids = list(set(exercise_ids_to_enrich))
                            
                            if len(unique_exercise_ids) == 1:
                                # Single exercise - use .eq() with .single()
                                metadata_result = (
                                    self.supabase.table("exercises")
                                    .select("*")
                                    .eq("id", unique_exercise_ids[0])
                                    .single()
                                    .execute()
                                )
                                if metadata_result.data:
                                    exercise_metadata_map[unique_exercise_ids[0]] = metadata_result.data
                            else:
                                # Multiple exercises - use .in_() for bulk query
                                metadata_result = (
                                    self.supabase.table("exercises")
                                    .select("*")
                                    .in_("id", unique_exercise_ids)
                                    .execute()
                                )
                                if metadata_result.data:
                                    # Build lookup map: exercise_id -> metadata
                                    for exercise_metadata in metadata_result.data:
                                        exercise_metadata_map[exercise_metadata.get("id")] = exercise_metadata
                        except Exception as e:
                            logger.warning(f"Error bulk-fetching exercise metadata: {e}. Falling back to sequential queries.")
                            exercise_metadata_map = {}  # Will fall back to sequential if bulk fails
                    
                    # Enrich each strength exercise using the metadata map
                    # Store as "exercises" (plural) to match Supabase relational query format
                    # Frontend TrainingService expects se.exercises from Supabase queries
                    for strength_exercise in strength_exercises:
                        exercise_id = strength_exercise.get("exercise_id")
                        if exercise_id:
                            exercise_metadata = exercise_metadata_map.get(exercise_id)
                            
                            # Fallback to sequential query if bulk fetch failed or missed this exercise
                            if not exercise_metadata:
                                try:
                                    exercise_metadata_result = (
                                        self.supabase.table("exercises")
                                        .select("*")
                                        .eq("id", exercise_id)
                                        .single()
                                        .execute()
                                    )
                                    if exercise_metadata_result.data:
                                        exercise_metadata = exercise_metadata_result.data
                                        exercise_metadata_map[exercise_id] = exercise_metadata  # Cache for future use
                                except Exception as e:
                                    logger.warning(f"Error fetching metadata for exercise {exercise_id}: {e}")
                            
                            if exercise_metadata:
                                # Store as "exercises" (plural) to match Supabase format (for frontend compatibility)
                                strength_exercise["exercises"] = exercise_metadata
                                # Also flatten enriched fields to top-level for schema validation
                                strength_exercise["target_area"] = exercise_metadata.get("target_area")
                                strength_exercise["main_muscles"] = exercise_metadata.get("primary_muscles") or exercise_metadata.get("main_muscles")
                                strength_exercise["force"] = exercise_metadata.get("force")
                            else:
                                strength_exercise["exercises"] = None
                        else:
                            strength_exercise["exercises"] = None

                    # Store as strength_exercise (singular) to match Supabase relational query format
                    daily["strength_exercise"] = strength_exercises

                    # Get endurance sessions
                    endurance_result = (
                        self.supabase.table("endurance_session")
                        .select("*")
                        .eq("daily_training_id", daily["id"])
                        .execute()
                    )
                    # Store as endurance_session (singular) to match Supabase relational query format
                    daily["endurance_session"] = endurance_result.data or []
                    daily_trainings.append(daily)

                schedule["daily_trainings"] = daily_trainings
                weekly_schedules.append(schedule)

            training_plan["weekly_schedules"] = weekly_schedules

            return {"success": True, "training_plan": training_plan}

        except Exception as e:
            self.logger.error(f"Error fetching training plan: {e}")
            return {
                "success": False,
                "error": f"Failed to fetch training plan: {str(e)}",
            }


# Create a singleton instance
training_db_service = TrainingDatabaseService()
