"""
Database service for handling user profiles and training plans with Supabase.
"""

import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from settings import settings
import json
from datetime import datetime
from logging_config import get_logger


class DatabaseService:
    """Service for database operations using Supabase."""

    def __init__(self):
        """Initialize Supabase client."""
        self.logger = get_logger(__name__)
        self.supabase: Client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY
        )

    def _get_authenticated_client(self, jwt_token: Optional[str] = None) -> Client:
        """Create an authenticated Supabase client with service role key for server-side operations."""
        self.logger.debug("Creating authenticated client with service role key")

        # Use service role key for server-side operations (bypasses RLS)
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
            )
            self.logger.debug("Using service role key for authentication")
            # Ensure service role key is never logged or exposed
            if not settings.SUPABASE_SERVICE_ROLE_KEY:
                self.logger.error("Service role key is empty - this should not happen")
        else:
            # Fallback to anon key with JWT token
            self.logger.warning(
                "No service role key found, using anon key with JWT token"
            )
            if not jwt_token:
                raise ValueError("JWT token required when service role key is not available")
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
            try:
                client.postgrest.auth(jwt_token)
                self.logger.debug("JWT token set successfully")
            except Exception as e:
                # Don't log the actual token or key in error messages
                self.logger.error(f"Error setting JWT token: {type(e).__name__}")
                raise

        return client

    def _clean_for_json_serialization(self, data: Any) -> Any:
        """
        Clean data to ensure it's JSON serializable by converting datetime objects
        and other non-serializable types to strings or basic types.
        """
        if isinstance(data, dict):
            return {key: self._clean_for_json_serialization(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._clean_for_json_serialization(item) for item in data]
        elif isinstance(data, datetime):
            return data.isoformat()
        elif hasattr(data, 'model_dump'):
            # Handle Pydantic models
            return self._clean_for_json_serialization(data.model_dump())
        elif hasattr(data, 'dict'):
            # Handle older Pydantic models
            return self._clean_for_json_serialization(data.dict())
        elif isinstance(data, (str, int, float, bool, type(None))):
            return data
        else:
            # Convert other types to string as fallback
            return str(data)

    async def create_user_profile(
        self,
        user_id: str,
        profile_data: Dict[str, Any],
        jwt_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new user profile in the database."""
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase

            # Insert user profile
            result = (
                supabase_client.table("user_profiles")
                .insert({"user_id": user_id, **profile_data})
                .execute()
            )

            if result.data and len(result.data) > 0:
                self.logger.info(
                    f"User profile created successfully (ID: {result.data[0]['id']})"
                )
                return {
                    "success": True,
                    "data": result.data[0],
                    "message": "User profile created successfully",
                }
            else:
                self.logger.error("Failed to create user profile")
                return {
                    "success": False,
                    "error": "Failed to create user profile",
                    "message": "No data returned from profile creation",
                }

        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during user profile creation: {error_str}")
            return {
                "success": False,
                "error": f"Failed to create user profile: {error_str}",
                "error_type": type(e).__name__,
                "user_id": user_id,
            }

    async def update_user_profile(
        self, user_id: str, data: Dict[str, Any], jwt_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user profile with any provided fields.

        Args:
            user_id: The user's UUID
            data: Dictionary of fields to update (only non-None values will be updated)
            jwt_token: Optional JWT token for authentication

        Returns:
            Dict with success status and data/error information
        """
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase

            # Add updated_at timestamp
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}

            # Remove None values to avoid overwriting with null
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if not update_data:
                self.logger.warning(f"No valid fields to update for user {user_id}")
                return {
                    "success": False,
                    "error": "No valid fields to update",
                    "message": "No non-null fields provided for update",
                }

            # Update the user profile
            result = (
                supabase_client.table("user_profiles")
                .update(update_data)
                .eq("user_id", user_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                updated = result.data[0]
            else:
                fetch = (
                    supabase_client.table("user_profiles")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                )
                updated = fetch.data[0] if fetch.data else None

            if updated:
                updated_fields = list(update_data.keys())
                self.logger.info(
                    f"User profile updated successfully with fields: {updated_fields}"
                )
                return {
                    "success": True,
                    "data": updated,
                    "message": f"User profile updated successfully with fields: {updated_fields}",
                }

            self.logger.error("Failed to update user profile")
            return {
                "success": False,
                "error": "No data returned from update",
                "message": "Failed to update user profile",
            }

        except Exception as e:
            error_str = str(e)
            if "timed out" in error_str.lower():
                self.logger.error(
                    f"Database query timed out during user profile update. "
                    f"Possible causes: slow database performance, network latency, or high load. "
                    f"Error: {error_str}"
                )
            else:
                self.logger.error(f"Exception during user profile update: {error_str}")
            return {
                "success": False,
                "error": error_str,
                "error_type": type(e).__name__,
                "user_id": user_id,
                "fields": list(data.keys()) if data else [],
            }

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get a user profile from the database.

        Args:
            user_id: The user's ID from Supabase Auth

        Returns:
            Dict containing success status and profile data or error
        """
        try:
            result = (
                self.supabase.table("user_profiles")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                return {
                    "success": True,
                    "data": result.data[0],
                    "message": "User profile found",
                }
            else:
                return {"success": False, "error": "User profile not found"}

        except Exception as e:
            self.logger.error(f"Error fetching user profile: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch user profile: {str(e)}",
            }

    async def update_user_profile_by_id(
        self, user_profile_id: int, data: Dict[str, Any], jwt_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user profile using the numeric profile ID.
        """
        try:
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase

            update_data = {
                **data,
                "updated_at": datetime.utcnow().isoformat(),
            }
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if not update_data:
                self.logger.warning(
                    f"No valid fields to update for user_profile_id {user_profile_id}"
                )
                return {
                    "success": False,
                    "error": "No valid fields to update",
                    "message": "No non-null fields provided for update",
                }

            result = (
                supabase_client.table("user_profiles")
                .update(update_data)
                .eq("id", user_profile_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                updated = result.data[0]
            else:
                fetch = (
                    supabase_client.table("user_profiles")
                    .select("*")
                    .eq("id", user_profile_id)
                    .execute()
                )
                updated = fetch.data[0] if fetch.data else None

            if updated:
                updated_fields = list(update_data.keys())
                self.logger.info(
                    f"User profile {user_profile_id} updated successfully with fields: {updated_fields}"
                )
                return {
                    "success": True,
                    "data": updated,
                    "message": f"User profile updated successfully with fields: {updated_fields}",
                }

            self.logger.error(
                f"Failed to update user profile by ID {user_profile_id}"
            )
            return {
                "success": False,
                "error": "No data returned from update",
                "message": "Failed to update user profile",
            }
        except Exception as e:
            error_str = str(e)
            self.logger.error(
                f"Exception during user profile update by ID {user_profile_id}: {error_str}"
            )
            return {
                "success": False,
                "error": error_str,
                "error_type": type(e).__name__,
                "user_profile_id": user_profile_id,
                "fields": list(data.keys()) if data else [],
            }

    async def save_training_plan(
        self,
        user_profile_id: int,
        training_plan_data: Dict[str, Any],
        jwt_token: Optional[str] = None,
        user_playbook: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Save a complete training plan to the database.

        Args:
            user_profile_id: The user profile ID
            training_plan_data: The complete training plan data from the AI
            jwt_token: Optional JWT token for authentication
            user_playbook: Optional user playbook data (ACE pattern)

        Returns:
            Dict containing success status and plan data or error
        """
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase

            # First, check if a training plan already exists for this user
            existing_plan_result = (
                supabase_client.table("training_plans")
                .select("id")
                .eq("user_profile_id", user_profile_id)
                .execute()
            )

            if existing_plan_result.data and len(existing_plan_result.data) > 0:
                existing_plan_id = existing_plan_result.data[0]["id"]
                self.logger.warning(
                    f"Training plan already exists (ID: {existing_plan_id}) for user {user_profile_id}"
                )
                return {
                    "success": False,
                    "error": f"Training plan already exists for this user (ID: {existing_plan_id}). Cannot create duplicate.",
                }

            # First, create the main training plan record
            # Convert Pydantic model to dict if needed
            # IMPORTANT: Use copy.deepcopy to ensure we're working with a mutable copy
            # This prevents issues where filtering in one place doesn't affect the returned structure
            import copy
            
            # TRACE: Log incoming plan structure
            self.logger.info("📥 [SAVE_PLAN] Received training_plan_data for save")
            if isinstance(training_plan_data, dict):
                weekly_count = len(training_plan_data.get("weekly_schedules", []))
                total_exercises_incoming = 0
                exercises_with_remove_flag = 0
                exercises_without_id = 0
                for week in training_plan_data.get("weekly_schedules", []):
                    for day in week.get("daily_trainings", []):
                        if not day.get("is_rest_day", False):
                            for ex in day.get("strength_exercises", []):
                                total_exercises_incoming += 1
                                if ex.get("_remove_from_plan", False):
                                    exercises_with_remove_flag += 1
                                if ex.get("exercise_id") is None:
                                    exercises_without_id += 1
                self.logger.info(
                    f"📊 [SAVE_PLAN] Incoming plan: {weekly_count} weeks, {total_exercises_incoming} exercises, "
                    f"{exercises_with_remove_flag} marked for removal, {exercises_without_id} without exercise_id"
                )
            
            if hasattr(training_plan_data, "model_dump"):
                plan_dict = copy.deepcopy(training_plan_data.model_dump())
            elif hasattr(training_plan_data, "dict"):
                plan_dict = copy.deepcopy(training_plan_data.dict())
            else:
                # Even if it's already a dict, make a deep copy to ensure mutability
                plan_dict = copy.deepcopy(training_plan_data)
            
            self.logger.info("✅ [SAVE_PLAN] Created deep copy of plan_dict")

            plan_record = {
                "user_profile_id": user_profile_id,
                "title": plan_dict.get("title", "Personalized Training Plan"),
                "summary": plan_dict.get("summary", ""),
                "justification": plan_dict.get("justification", ""),
                "ai_message": plan_dict.get("ai_message"),  # Store AI completion message
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Note: user_playbook is stored in user_profiles, not training_plans
            # Plans reference the user's playbook via user_profile_id FK
            if user_playbook:
                self.logger.info(
                    f"📘 User has playbook with {len(user_playbook.get('lessons', []))} lessons (stored in user_profiles)"
                )

            # Insert the training plan
            self.logger.debug(
                f"Saving training plan with justification: {plan_record.get('justification', 'No justification provided')[:100]}..."
            )
            plan_result = (
                supabase_client.table("training_plans").insert(plan_record).execute()
            )

            if not plan_result.data:
                self.logger.error("Failed to create training plan record")
                return {
                    "success": False,
                    "error": f"Failed to create training plan record: {plan_result}",
                }

            training_plan_id = plan_result.data[0]["id"]
            
            # Enrich plan_dict with database IDs for returning complete structure
            plan_dict["id"] = training_plan_id
            plan_dict["user_profile_id"] = user_profile_id

            # Save weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])

            self.logger.info(f"Recreating weekly_schedules: count={len(weekly_schedules)}")
            for week_index, week_data in enumerate(weekly_schedules):
                week_number = week_data.get("week_number", 1)

                # Create weekly schedule record
                weekly_schedule_record = {
                    "training_plan_id": training_plan_id,
                    "week_number": week_number,
                    "focus_theme": week_data.get("focus_theme", ""),
                    "primary_goal": week_data.get("primary_goal", ""),
                    "progression_lever": week_data.get("progression_lever", ""),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }

                self.logger.debug(
                    f"Saving weekly schedule {week_number} with focus_theme: {weekly_schedule_record.get('focus_theme', 'N/A')}"
                )
                weekly_result = (
                    supabase_client.table("weekly_schedules")
                    .insert(weekly_schedule_record)
                    .execute()
                )

                if not weekly_result.data:
                    continue

                weekly_schedule_id = weekly_result.data[0]["id"]
                
                # Enrich week_data with database ID
                week_data["id"] = weekly_schedule_id
                week_data["training_plan_id"] = training_plan_id

                # Save daily trainings
                daily_trainings = week_data.get("daily_trainings", [])
                self.logger.info(f"Week {week_index} (id={weekly_schedule_id}) daily_trainings: count={len(daily_trainings)}")

                for daily_index, daily_data in enumerate(daily_trainings):
                    day_of_week = daily_data.get("day_of_week", "Monday")
                    is_rest_day = daily_data.get("is_rest_day", False)

                    # Create daily training record
                    daily_training_record = {
                        "weekly_schedule_id": weekly_schedule_id,
                        "day_of_week": day_of_week,
                        "is_rest_day": is_rest_day,
                        "training_type": daily_data.get(
                            "training_type", "rest" if is_rest_day else "strength"
                        ),
                        "justification": daily_data.get("justification", ""),
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    
                    # Add scheduled_date if it was mapped by date_mapper
                    if "scheduled_date" in daily_data:
                        daily_training_record["scheduled_date"] = daily_data["scheduled_date"]

                    self.logger.debug(
                        f"Saving daily training {day_of_week} with justification: {daily_training_record.get('justification', 'No justification provided')[:100]}..."
                    )
                    daily_result = (
                        supabase_client.table("daily_training")
                        .insert(daily_training_record)
                        .execute()
                    )

                    if not daily_result.data:
                        continue

                    daily_training_id = daily_result.data[0]["id"]
                    
                    # Enrich daily_data with database ID
                    daily_data["id"] = daily_training_id
                    daily_data["weekly_schedule_id"] = weekly_schedule_id

                    # Save exercises and endurance sessions if not a rest day
                    if not is_rest_day:
                        # Save strength exercises (BULK INSERT for performance)
                        raw_strength_exercises = daily_data.get("strength_exercises", [])
                        
                        # TRACE: Log before filtering
                        self.logger.debug(
                            f"🔍 [SAVE_PLAN] Week {week_index} Day {daily_index} ({day_of_week}): "
                            f"Processing {len(raw_strength_exercises)} raw exercises"
                        )
                        
                        # Filter out any exercises without exercise_id OR marked for removal (data hygiene)
                        filtered_exercises_list = []
                        dropped_exercises = []
                        for ex in raw_strength_exercises:
                            if not ex:
                                continue
                            exercise_id = ex.get("exercise_id")
                            is_marked_remove = ex.get("_remove_from_plan", False)
                            exercise_name = ex.get("exercise_name", "Unknown")
                            
                            if exercise_id is None:
                                dropped_exercises.append(f"{exercise_name} (no exercise_id)")
                            elif is_marked_remove:
                                dropped_exercises.append(f"{exercise_name} (marked _remove_from_plan)")
                            else:
                                filtered_exercises_list.append(ex)
                        
                        strength_exercises = filtered_exercises_list
                        dropped_count = len(raw_strength_exercises) - len(strength_exercises)
                        
                        if dropped_count > 0:
                            self.logger.warning(
                                f"🗑️ [SAVE_PLAN] Week {week_index} Day {daily_index} ({day_of_week}): "
                                f"Dropped {dropped_count} exercise(s): {', '.join(dropped_exercises[:3])}"
                                f"{'...' if len(dropped_exercises) > 3 else ''}"
                            )
                        self.logger.info(
                            f"✅ [SAVE_PLAN] Week {week_index} Day {daily_index} ({day_of_week}): "
                            f"kept={len(strength_exercises)}, dropped={dropped_count}"
                        )

                        if strength_exercises:
                            # Prepare all strength exercise records for bulk insert
                            strength_exercise_records = []
                            for exercise_data in strength_exercises:
                                exercise_id = exercise_data.get("exercise_id")
                                sets = exercise_data.get("sets", 3)
                                reps = exercise_data.get("reps", [10, 10, 10])
                                weight = exercise_data.get("weight", [0.0] * sets)

                                strength_exercise_records.append({
                                    "daily_training_id": daily_training_id,
                                    "exercise_id": exercise_id,
                                    "sets": sets,
                                    "reps": reps,
                                    "weight": weight,
                                    "execution_order": exercise_data.get("execution_order", 0),
                                    "completed": False,
                                    "created_at": datetime.utcnow().isoformat(),
                                    "updated_at": datetime.utcnow().isoformat(),
                                })

                            # Bulk insert all strength exercises at once
                            exercise_result = (
                                supabase_client.table("strength_exercise")
                                .insert(strength_exercise_records)
                                .execute()
                            )
                            
                            # Map returned IDs back to exercise_data objects (order is preserved by Supabase)
                            if exercise_result.data and len(exercise_result.data) == len(strength_exercises):
                                for i, exercise_data in enumerate(strength_exercises):
                                    db_id = exercise_result.data[i]["id"]
                                    exercise_data["id"] = db_id
                                    exercise_data["daily_training_id"] = daily_training_id
                                    self.logger.debug(
                                        f"✅ [SAVE_PLAN] Enriched exercise '{exercise_data.get('exercise_name', 'Unknown')}' "
                                        f"with DB ID: {db_id}, exercise_id: {exercise_data.get('exercise_id')}"
                                    )
                            else:
                                # Fallback: if order doesn't match, log warning but continue
                                self.logger.warning(
                                    f"⚠️ [SAVE_PLAN] Bulk insert returned {len(exercise_result.data) if exercise_result.data else 0} records, "
                                    f"expected {len(strength_exercises)}. IDs may not be enriched correctly."
                                )
                                # Still try to enrich if we have data
                                if exercise_result.data:
                                    for i, exercise_data in enumerate(strength_exercises):
                                        if i < len(exercise_result.data):
                                            db_id = exercise_result.data[i]["id"]
                                            exercise_data["id"] = db_id
                                            exercise_data["daily_training_id"] = daily_training_id
                            
                            # CRITICAL: Update daily_data with filtered and enriched exercises
                            # This ensures plan_dict only contains exercises that were actually saved to DB
                            daily_data["strength_exercises"] = strength_exercises
                            self.logger.debug(
                                f"✅ [SAVE_PLAN] Updated daily_data['strength_exercises'] with {len(strength_exercises)} "
                                f"filtered and enriched exercises for {day_of_week}"
                            )
                        else:
                            # No valid exercises - set to empty list to prevent invalid exercises from reaching frontend
                            daily_data["strength_exercises"] = []

                        # Save endurance sessions (BULK INSERT for performance)
                        endurance_sessions = daily_data.get("endurance_sessions", [])

                        if endurance_sessions:
                            # Prepare all endurance session records for bulk insert
                            endurance_session_records = []
                            for session_data in endurance_sessions:
                                name = session_data.get("name", "Endurance Session")
                                description = session_data.get("description", "")
                                sport_type = session_data.get("sport_type", "running")
                                training_volume = session_data.get("training_volume", 30.0)
                                unit = session_data.get("unit", "minutes")
                                heart_rate_zone = session_data.get("heart_rate_zone", 3)  # Default to Zone 3 if not provided

                                endurance_session_records.append({
                                    "daily_training_id": daily_training_id,
                                    "name": name,
                                    "description": description,
                                    "sport_type": sport_type,
                                    "training_volume": training_volume,
                                    "unit": unit,
                                    "heart_rate_zone": heart_rate_zone,
                                    "execution_order": session_data.get("execution_order", 0),
                                    "completed": False,
                                    "created_at": datetime.utcnow().isoformat(),
                                    "updated_at": datetime.utcnow().isoformat(),
                                })

                            # Bulk insert all endurance sessions at once
                            session_result = (
                                supabase_client.table("endurance_session")
                                .insert(endurance_session_records)
                                .execute()
                            )
                            
                            # Map returned IDs back to session_data objects (order is preserved by Supabase)
                            if session_result.data and len(session_result.data) == len(endurance_sessions):
                                for i, session_data in enumerate(endurance_sessions):
                                    session_data["id"] = session_result.data[i]["id"]
                                    session_data["daily_training_id"] = daily_training_id
                            else:
                                # Fallback: if order doesn't match, log warning but continue
                                self.logger.warning(
                                    f"Bulk insert returned {len(session_result.data) if session_result.data else 0} records, "
                                    f"expected {len(endurance_sessions)}. IDs may not be enriched correctly."
                                )
                                # Still try to enrich if we have data
                                if session_result.data:
                                    for i, session_data in enumerate(endurance_sessions):
                                        if i < len(session_result.data):
                                            session_data["id"] = session_result.data[i]["id"]
                                            session_data["daily_training_id"] = daily_training_id

            self.logger.info(
                f"Training plan saved successfully (ID: {training_plan_id})"
            )

            # Enrich plan_dict with exercise metadata (BULK QUERY for performance)
            # This ensures enriched fields (target_area, main_muscles, force) are available
            # Collect all unique exercise_ids first, then bulk-fetch metadata
            self.logger.info("🔍 [SAVE_PLAN] Starting exercise metadata enrichment")
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            all_exercise_ids = set()
            
            # First pass: collect all exercise_ids
            exercises_found_for_enrichment = 0
            exercises_with_remove_flag_during_enrichment = 0
            for weekly_schedule in weekly_schedules:
                daily_trainings = weekly_schedule.get("daily_trainings", [])
                for daily_training in daily_trainings:
                    if not daily_training.get("is_rest_day", False):
                        strength_exercises = daily_training.get("strength_exercises", [])
                        for strength_exercise in strength_exercises:
                            exercises_found_for_enrichment += 1
                            if strength_exercise.get("_remove_from_plan", False):
                                exercises_with_remove_flag_during_enrichment += 1
                                self.logger.error(
                                    f"❌ [ENRICHMENT] CRITICAL: Found exercise '{strength_exercise.get('exercise_name', 'Unknown')}' "
                                    f"with _remove_from_plan=True during enrichment! This should have been filtered earlier."
                                )
                            exercise_id = strength_exercise.get("exercise_id")
                            if exercise_id:
                                all_exercise_ids.add(exercise_id)
            
            self.logger.info(
                f"📊 [ENRICHMENT] Found {exercises_found_for_enrichment} exercises for enrichment, "
                f"{exercises_with_remove_flag_during_enrichment} with _remove_from_plan flag, "
                f"{len(all_exercise_ids)} unique exercise_ids to fetch metadata for"
            )
            
            # Bulk fetch all exercise metadata at once
            exercise_metadata_map = {}
            if all_exercise_ids:
                try:
                    exercise_ids_list = list(all_exercise_ids)
                    if len(exercise_ids_list) == 1:
                        # Single exercise - use .eq() for efficiency
                        metadata_result = (
                            supabase_client.table("exercises")
                            .select("*")
                            .eq("id", exercise_ids_list[0])
                            .execute()
                        )
                        if metadata_result.data:
                            exercise_metadata_map[exercise_ids_list[0]] = metadata_result.data[0]
                    else:
                        # Multiple exercises - use .in_() for bulk query
                        metadata_result = (
                            supabase_client.table("exercises")
                            .select("*")
                            .in_("id", exercise_ids_list)
                            .execute()
                        )
                        if metadata_result.data:
                            # Build lookup map: exercise_id -> metadata
                            for exercise_metadata in metadata_result.data:
                                exercise_metadata_map[exercise_metadata.get("id")] = exercise_metadata
                except Exception as e:
                    self.logger.warning(f"Error bulk-fetching exercise metadata: {e}. Falling back to sequential queries.")
                    exercise_metadata_map = {}  # Will fall back to sequential if bulk fails
            
            # Second pass: enrich all exercises using the metadata map
            enriched_count = 0
            for week_idx, weekly_schedule in enumerate(weekly_schedules):
                daily_trainings = weekly_schedule.get("daily_trainings", [])
                for day_idx, daily_training in enumerate(daily_trainings):
                    if not daily_training.get("is_rest_day", False):
                        strength_exercises = daily_training.get("strength_exercises", [])
                        # TRACE: Verify we're reading from the filtered list
                        if strength_exercises:
                            exercises_with_remove = [ex for ex in strength_exercises if ex.get("_remove_from_plan", False)]
                            if exercises_with_remove:
                                self.logger.error(
                                    f"❌ [ENRICHMENT] CRITICAL: Week {week_idx} Day {day_idx}: Found {len(exercises_with_remove)} exercises with "
                                    f"_remove_from_plan=True in strength_exercises list during enrichment! "
                                    f"These should have been filtered during save. Exercise names: "
                                    f"{', '.join([ex.get('exercise_name', 'Unknown') for ex in exercises_with_remove[:3]])}"
                                )
                        
                        for strength_exercise in strength_exercises:
                            exercise_id = strength_exercise.get("exercise_id")
                            if exercise_id:
                                exercise_metadata = exercise_metadata_map.get(exercise_id)
                                
                                # Fallback to sequential query if bulk fetch failed or missed this exercise
                                if not exercise_metadata:
                                    try:
                                        exercise_metadata_result = (
                                            supabase_client.table("exercises")
                                            .select("*")
                                            .eq("id", exercise_id)
                                            .single()
                                            .execute()
                                        )
                                        if exercise_metadata_result.data:
                                            exercise_metadata = exercise_metadata_result.data
                                            exercise_metadata_map[exercise_id] = exercise_metadata  # Cache for future use
                                    except Exception as e:
                                        self.logger.warning(f"Error fetching metadata for exercise {exercise_id}: {e}")
                                
                                if exercise_metadata:
                                    # Store as "exercises" (plural) to match Supabase format (for frontend compatibility)
                                    strength_exercise["exercises"] = exercise_metadata
                                    # CRITICAL: Add exercise_name, main_muscle, equipment at top-level for Pydantic validation and frontend round-trip
                                    strength_exercise["exercise_name"] = exercise_metadata.get("name")
                                    # Extract main_muscle from main_muscles array (first item) - database has main_muscles, not main_muscle
                                    main_muscles_array = exercise_metadata.get("primary_muscles") or exercise_metadata.get("main_muscles", [])
                                    strength_exercise["main_muscle"] = main_muscles_array[0] if isinstance(main_muscles_array, list) and main_muscles_array else None
                                    strength_exercise["equipment"] = exercise_metadata.get("equipment")
                                    # Also flatten enriched fields to top-level for schema validation and prompt formatting
                                    strength_exercise["target_area"] = exercise_metadata.get("target_area")
                                    strength_exercise["main_muscles"] = main_muscles_array
                                    strength_exercise["force"] = exercise_metadata.get("force")
                                    enriched_count += 1
                                else:
                                    strength_exercise["exercises"] = None
            
            self.logger.info(f"✅ [ENRICHMENT] Enriched {enriched_count} exercises with metadata")

            # FINAL CLEANUP: Remove _remove_from_plan flag and any exercises still marked for removal
            # This ensures no internal flags or invalid exercises leak to the frontend
            # CRITICAL: This must run AFTER all enrichment to catch any exercises that slipped through
            self.logger.info("🛡️ [SAVE_PLAN] Starting FINAL CLEANUP filter before returning plan to frontend")
            total_filtered_before = 0
            total_filtered_after = 0
            total_removed = 0
            removed_exercises_details = []
            
            for week_idx, weekly_schedule in enumerate(plan_dict.get("weekly_schedules", [])):
                for day_idx, daily_training in enumerate(weekly_schedule.get("daily_trainings", [])):
                    if not daily_training.get("is_rest_day", False):
                        strength_exercises = daily_training.get("strength_exercises", [])
                        total_filtered_before += len(strength_exercises)
                        
                        # TRACE: Log what we're about to filter
                        if strength_exercises:
                            self.logger.debug(
                                f"🔍 [FINAL_CLEANUP] Week {week_idx} Day {day_idx} ({daily_training.get('day_of_week', 'Unknown')}): "
                                f"Checking {len(strength_exercises)} exercises"
                            )
                        
                        # Filter out any exercises marked for removal OR missing exercise_id
                        filtered_exercises = []
                        for ex in strength_exercises:
                            exercise_name = ex.get("exercise_name", "Unknown")
                            exercise_id = ex.get("exercise_id")
                            is_marked_remove = ex.get("_remove_from_plan", False)
                            
                            if is_marked_remove:
                                total_removed += 1
                                removed_exercises_details.append(
                                    f"{exercise_name} (Week {week_idx}, Day {day_idx}, _remove_from_plan=True)"
                                )
                                self.logger.error(
                                    f"❌ [FINAL_CLEANUP] CRITICAL: Found exercise '{exercise_name}' "
                                    f"with _remove_from_plan=True in final plan! This should never happen."
                                )
                            elif exercise_id is None:
                                total_removed += 1
                                removed_exercises_details.append(
                                    f"{exercise_name} (Week {week_idx}, Day {day_idx}, null exercise_id)"
                                )
                                self.logger.error(
                                    f"❌ [FINAL_CLEANUP] CRITICAL: Found exercise '{exercise_name}' "
                                    f"with null exercise_id in final plan! This should never happen."
                                )
                            else:
                                # Clean up internal flags before sending to frontend
                                ex.pop("_remove_from_plan", None)
                                filtered_exercises.append(ex)
                                # Verify ID is set
                                if not ex.get("id"):
                                    self.logger.warning(
                                        f"⚠️ [FINAL_CLEANUP] Exercise '{exercise_name}' has exercise_id={exercise_id} "
                                        f"but missing DB 'id' field (strength_exercise table ID)"
                                    )
                        
                        daily_training["strength_exercises"] = filtered_exercises
                        total_filtered_after += len(filtered_exercises)
            
            if total_removed > 0:
                self.logger.error(
                    f"❌ [FINAL_CLEANUP] CRITICAL: Removed {total_removed} invalid exercise(s) "
                    f"({total_filtered_before} before, {total_filtered_after} after). "
                    f"Details: {', '.join(removed_exercises_details[:5])}"
                    f"{'...' if len(removed_exercises_details) > 5 else ''}"
                )
            else:
                self.logger.info(
                    f"✅ [FINAL_CLEANUP] All exercises valid: {total_filtered_after} exercises "
                    f"ready for frontend (no removals needed)"
                )
            
            # TRACE: Final validation before returning
            final_exercise_count = 0
            final_exercises_with_ids = 0
            final_exercises_with_remove_flag = 0
            for week in plan_dict.get("weekly_schedules", []):
                for day in week.get("daily_trainings", []):
                    if not day.get("is_rest_day", False):
                        for ex in day.get("strength_exercises", []):
                            final_exercise_count += 1
                            if ex.get("id"):
                                final_exercises_with_ids += 1
                            if ex.get("_remove_from_plan", False):
                                final_exercises_with_remove_flag += 1
            
            self.logger.info(
                f"📤 [SAVE_PLAN] Returning plan to frontend: {final_exercise_count} exercises, "
                f"{final_exercises_with_ids} with DB IDs, {final_exercises_with_remove_flag} with _remove_from_plan flag"
            )
            
            if final_exercises_with_remove_flag > 0:
                self.logger.error(
                    f"❌ [SAVE_PLAN] CRITICAL: Returning plan with {final_exercises_with_remove_flag} exercises "
                    f"still marked with _remove_from_plan=True! This will cause frontend errors!"
                )
            
            # Return complete plan structure with all database IDs and enriched fields
            # This allows caller to use the plan without refetching from DB
            return {
                "success": True,
                "data": {
                    "training_plan_id": training_plan_id,
                    "training_plan": plan_dict,  # Include full nested structure with enriched fields
                },
                "message": "Training plan saved successfully",
            }

        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during training plan save: {error_str}")

            # Handle specific database errors
            # Check for specific error types
            if (
                "23505" in error_str
                or "duplicate key value violates unique constraint" in error_str
            ):
                self.logger.error("DUPLICATE KEY VIOLATION DETECTED!")
                self.logger.error(
                    f"This means a training plan already exists for user_profile_id: {user_profile_id}"
                )
                self.logger.error(
                    "The unique constraint 'unique_user_training_plan' is being violated"
                )
                return {
                    "success": False,
                    "error": f"Training plan already exists for this user. Duplicate key constraint violation: {error_str}",
                }
            elif "23503" in error_str or "foreign key constraint" in error_str:
                self.logger.error("FOREIGN KEY CONSTRAINT VIOLATION DETECTED!")
                self.logger.error("This means a referenced record doesn't exist")
                return {
                    "success": False,
                    "error": f"Database constraint violation: {error_str}",
                }
            else:
                self.logger.error(f"Generic error saving training plan: {error_str}")
                return {
                    "success": False,
                    "error": f"Failed to save training plan: {error_str}",
                }

    async def get_user_profile_by_user_id(
        self, user_id: str, jwt_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get user profile by user_id (Supabase Auth UUID).

        Args:
            user_id: The Supabase Auth user UUID
            jwt_token: JWT token for authentication (bypasses RLS if not provided)

        Returns:
            Dict containing success status and profile data or error
        """
        try:
            # Use authenticated client if JWT token is provided, otherwise use service role
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
                self.logger.debug(
                    f"Using authenticated client with JWT for user_id: {user_id}"
                )
            else:
                supabase_client = self._get_authenticated_client(
                    None
                )  # This will use service role
                self.logger.debug(f"Using service role client for user_id: {user_id}")

            # Get user profile by user_id
            self.logger.debug(f"Querying user_profiles table for user_id: {user_id}")
            result = (
                supabase_client.table("user_profiles")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            if not result.data or len(result.data) == 0:
                self.logger.warning(f"No user profile found for user_id: {user_id}")

                # Debug: List all user profiles to see what's in the database
                try:
                    all_profiles = (
                        self.supabase.table("user_profiles")
                        .select("id, user_id, username")
                        .execute()
                    )
                    self.logger.debug(
                        f"All user profiles in database: {all_profiles.data}"
                    )
                except Exception as debug_e:
                    self.logger.error(
                        f"Error getting all profiles for debug: {debug_e}"
                    )

                return {"success": False, "error": "User profile not found"}

            return {"success": True, "data": result.data[0]}

        except Exception as e:
            self.logger.error(f"Error getting user profile by user_id: {str(e)}")
            return {"success": False, "error": f"Database error: {str(e)}"}

    async def get_user_profile_by_id(self, user_profile_id: int) -> Dict[str, Any]:
        """
        Get user profile by ID (integer).
        
        Args:
            user_profile_id: The user profile ID (integer)
            
        Returns:
            Dict containing success status and profile data or error
        """
        try:
            self.logger.info(f"🔍 Querying user_profiles by id: {user_profile_id}")
            
            # Use authenticated client with service role to bypass RLS
            supabase_client = self._get_authenticated_client(None)
            
            # Query for the specific user profile by id
            result = (
                supabase_client.table("user_profiles")
                .select("*")
                .eq("id", user_profile_id)
                .execute()
            )
           
            
            if result.data and len(result.data) > 0:
                self.logger.info(f"✅ Found user profile with id: {user_profile_id}")
                return {
                    "success": True,
                    "data": result.data[0],  # Get first result
                    "message": "User profile found",
                }
            else:
                self.logger.warning(f"⚠️ No user profile found with id: {user_profile_id}")
                return {"success": False, "error": "User profile not found"}
                
        except Exception as e:
            self.logger.error(f"Error getting user profile by id: {str(e)}")
            return {"success": False, "error": f"Database error: {str(e)}"}

    async def get_training_plan(self, user_profile_id: int) -> Dict[str, Any]:
        """
        Get a user's training plan from the database.

        Args:
            user_profile_id: The user profile ID

        Returns:
            Dict containing success status and plan data or error
        """
        try:
            # Get the main training plan
            plan_result = (
                self.supabase.table("training_plans")
                .select("*")
                .eq("user_profile_id", user_profile_id)
                .execute()
            )

            if not plan_result.data or len(plan_result.data) == 0:
                return {"success": False, "error": "No training plan found"}

            training_plan = plan_result.data[0]
            training_plan_id = training_plan["id"]

            # Get weekly schedules
            weekly_result = (
                self.supabase.table("weekly_schedules")
                .select("*")
                .eq("training_plan_id", training_plan_id)
                .execute()
            )
            weekly_schedules = weekly_result.data or []

            # Get daily trainings for each weekly schedule
            for weekly_schedule in weekly_schedules:
                weekly_schedule_id = weekly_schedule["id"]

                daily_result = (
                    self.supabase.table("daily_training")
                    .select("*")
                    .eq("weekly_schedule_id", weekly_schedule_id)
                    .execute()
                )
                daily_trainings = daily_result.data or []

                # Get exercises and endurance sessions for each daily training
                for daily_training in daily_trainings:
                    daily_training_id = daily_training["id"]

                    if not daily_training["is_rest_day"]:
                        # Get strength exercises
                        exercise_result = (
                            self.supabase.table("strength_exercise")
                            .select("*")
                            .eq("daily_training_id", daily_training_id)
                            .execute()
                        )
                        strength_exercises = exercise_result.data or []

                        # Enrich each strength exercise with exercise metadata (JOIN with exercises table)
                        # Store as "exercises" (plural) to match Supabase relational query format
                        # Frontend TrainingService expects se.exercises from Supabase queries
                        for strength_exercise in strength_exercises:
                            exercise_id = strength_exercise.get("exercise_id")
                            if exercise_id:
                                # Fetch exercise metadata from exercises table
                                exercise_metadata_result = (
                                    self.supabase.table("exercises")
                                    .select("*")
                                    .eq("id", exercise_id)
                                    .single()
                                    .execute()
                                )
                                if exercise_metadata_result.data:
                                    exercise_metadata = exercise_metadata_result.data
                                    # Store as "exercises" (plural) to match Supabase format (for frontend compatibility)
                                    strength_exercise["exercises"] = exercise_metadata
                                    # Also flatten enriched fields to top-level for schema validation
                                    strength_exercise["target_area"] = exercise_metadata.get("target_area")
                                    main_muscles_array = exercise_metadata.get("primary_muscles") or exercise_metadata.get("main_muscles", [])
                                    strength_exercise["main_muscles"] = main_muscles_array
                                    strength_exercise["force"] = exercise_metadata.get("force")
                                    # Extract main_muscle from main_muscles array for backward compatibility
                                    strength_exercise["main_muscle"] = main_muscles_array[0] if isinstance(main_muscles_array, list) and main_muscles_array else None
                                else:
                                    strength_exercise["exercises"] = None
                            else:
                                strength_exercise["exercises"] = None

                        # Store as strength_exercise (singular) to match Supabase relational query format
                        daily_training["strength_exercise"] = strength_exercises

                        # Get endurance sessions
                        session_result = (
                            self.supabase.table("endurance_session")
                            .select("*")
                            .eq("daily_training_id", daily_training_id)
                            .execute()
                        )
                        # Store as endurance_session (singular) to match Supabase relational query format
                        daily_training["endurance_session"] = session_result.data or []
                    else:
                        daily_training["strength_exercise"] = []
                        daily_training["endurance_session"] = []

                weekly_schedule["daily_trainings"] = daily_trainings

            training_plan["weekly_schedules"] = weekly_schedules

            return {
                "success": True,
                "data": training_plan,
                "message": "Training plan retrieved successfully",
            }

        except Exception as e:
            self.logger.error(f"Error fetching training plan: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch training plan: {str(e)}",
            }

    # Coaches functions removed - now handled by frontend Supabase client

    # ============================================================================
    # ACE PATTERN METHODS (Playbook Management)
    # ============================================================================

    async def load_user_playbook(
        self, user_profile_id: int, jwt_token: Optional[str] = None
    ):
        """
        Load a user's playbook from their profile.

        Args:
            user_profile_id: The user profile identifier
            jwt_token: Optional JWT token for authentication

        Returns:
            UserPlaybook object or empty playbook if not found
        """
        try:
            from core.base.schemas.playbook_schemas import UserPlaybook

            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                # Use service role key for server-side operations
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
                )

            # Get user_playbook from user_profiles table
            result = (
                supabase_client.table("user_profiles")
                .select("user_playbook")
                .eq("id", user_profile_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                playbook_data = result.data[0].get("user_playbook")

                if playbook_data:
                    # Parse JSON if it's a string
                    if isinstance(playbook_data, str):
                        playbook_data = json.loads(playbook_data)

                    # Create UserPlaybook object
                    playbook = UserPlaybook(**playbook_data)
                    self.logger.info(
                        f"Loaded playbook for user_profile {user_profile_id} with {len(playbook.lessons)} lessons"
                    )
                    return playbook

            # No playbook found - create new empty one
            self.logger.info(
                f"No playbook found for user_profile {user_profile_id}, creating new one"
            )
            return UserPlaybook(
                user_id=str(user_profile_id), lessons=[], total_lessons=0
            )

        except Exception as e:
            self.logger.error(f"Error loading user playbook: {e}")
            # Return empty playbook on error
            return UserPlaybook(
                user_id=str(user_profile_id), lessons=[], total_lessons=0
            )

    async def save_user_playbook(
        self,
        user_profile_id: int,
        playbook_data: Dict[str, Any],
        jwt_token: Optional[str] = None,
    ) -> bool:
        """
        Save a user's playbook to their profile.

        Args:
            user_profile_id: The user profile ID to update
            playbook_data: The UserPlaybook data as dictionary
            jwt_token: Optional JWT token for authentication

        Returns:
            True if successful, False otherwise
        """
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                # Use service role key for server-side operations
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
                )

            # Convert playbook to JSON if not already a string
            if isinstance(playbook_data, dict):
                playbook_json = json.dumps(playbook_data)
            else:
                playbook_json = playbook_data

            # Update the user_profiles table with playbook
            result = (
                supabase_client.table("user_profiles")
                .update({"user_playbook": playbook_json})
                .eq("id", user_profile_id)
                .execute()
            )

            lessons_count = (
                playbook_data.get("total_lessons", 0)
                if isinstance(playbook_data, dict)
                else 0
            )
            self.logger.info(
                f"Saved playbook with {lessons_count} lessons to user_profile {user_profile_id}"
            )

            return True

        except Exception as e:
            self.logger.error(f"Error saving user playbook: {e}")
            return False

    async def update_training_plan(
        self, 
        plan_id: int, 
        updated_plan_data: Dict[str, Any],
        jwt_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing training plan with new data.
        
        This deletes all existing plan data (weekly schedules, daily trainings, exercises)
        and recreates them with the new data, then returns the updated plan.

        Args:
            plan_id: The training plan ID to update
            updated_plan_data: The updated plan data as dictionary (already validated/enriched)
            jwt_token: Optional JWT token for authentication

        Returns:
            The updated_plan_data that was passed in (on success),
            None if update failed
        """
        try:
            self.logger.info(f"Updating training plan {plan_id}...")
            
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                # Use service role key for server-side operations
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
                )

            # Clean the plan data to ensure JSON serialization
            if isinstance(updated_plan_data, dict):
                plan_dict = self._clean_for_json_serialization(updated_plan_data)
            else:
                plan_dict = updated_plan_data

            # Debug: log incoming structure sanity
            try:
                pd_type = type(plan_dict).__name__
                ws_len = len(plan_dict.get("weekly_schedules", [])) if isinstance(plan_dict, dict) else -1
                self.logger.info(f"update_training_plan: cleaned plan_dict type={pd_type}, weeks={ws_len}")
            except Exception:
                self.logger.warning("update_training_plan: failed to inspect plan_dict")

            # Ensure top-level plan ID is present in the dict for downstream consumers
            if isinstance(plan_dict, dict):
                plan_dict["id"] = plan_id
            else:
                # If the input is not dict, bail out with a clear log and return original
                self.logger.error("update_training_plan: plan_dict is not a dict after cleaning; returning original updated_plan_data")
                return updated_plan_data

            # Update the main training plan record (without plan_data column)
            plan_record = {
                "title": plan_dict.get("title", "Personalized Training Plan"),
                "summary": plan_dict.get("summary", ""),
                "justification": plan_dict.get("justification", ""),
                # IMPORTANT: never update ai_message here; keep initial message in DB unchanged
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Update the main training plan
            supabase_client.table("training_plans").update(plan_record).eq("id", plan_id).execute()
            
            # Delete existing weekly schedules and all related data (cascading)
            # This will also delete daily trainings, exercises, and endurance sessions
            supabase_client.table("weekly_schedules").delete().eq("training_plan_id", plan_id).execute()
            
            # Recreate weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            
            # CRITICAL: Log weekly_schedules structure before processing
            self.logger.info(f"Recreating weekly_schedules: count={len(weekly_schedules)}, plan_dict keys={list(plan_dict.keys())[:10]}")
            if len(weekly_schedules) == 0:
                self.logger.error(f"⚠️ CRITICAL: weekly_schedules is EMPTY! This means no plan structure will be saved.")
                self.logger.error(f"Plan dict structure: {type(plan_dict)}, has weekly_schedules key: {'weekly_schedules' in plan_dict}")
                if isinstance(plan_dict, dict):
                    # Try to find where the structure might be
                    self.logger.error(f"All keys in plan_dict: {list(plan_dict.keys())}")
            
            for week_index, week_data in enumerate(weekly_schedules):
                week_number = week_data.get("week_number", 1)
                
                # Create weekly schedule record
                weekly_schedule_record = {
                    "training_plan_id": plan_id,
                    "week_number": week_number,
                    "focus_theme": week_data.get("focus_theme", ""),
                    "primary_goal": week_data.get("primary_goal", ""),
                    "progression_lever": week_data.get("progression_lever", ""),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                
                weekly_result = (
                    supabase_client.table("weekly_schedules")
                    .insert(weekly_schedule_record)
                    .execute()
                )
                
                if not weekly_result.data:
                    continue
                
                weekly_schedule_id = weekly_result.data[0]["id"]
                # Enrich plan dict with generated weekly schedule ID
                week_data["id"] = weekly_schedule_id
                
                # Save daily trainings
                daily_trainings = week_data.get("daily_trainings", [])
                
                for daily_index, daily_data in enumerate(daily_trainings):
                    day_of_week = daily_data.get("day_of_week", "Monday")
                    is_rest_day = daily_data.get("is_rest_day", False)
                    
                    # Create daily training record
                    daily_training_record = {
                        "weekly_schedule_id": weekly_schedule_id,
                        "day_of_week": day_of_week,
                        "is_rest_day": is_rest_day,
                        "training_type": daily_data.get(
                            "training_type", "rest" if is_rest_day else "strength"
                        ),
                        "justification": daily_data.get("justification", ""),
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    
                    daily_result = (
                        supabase_client.table("daily_training")
                        .insert(daily_training_record)
                        .execute()
                    )
                    
                    if not daily_result.data:
                        continue
                    
                    daily_training_id = daily_result.data[0]["id"]
                    # Enrich plan dict with generated daily training ID
                    daily_data["id"] = daily_training_id
                    
                    # Save exercises and endurance sessions if not a rest day
                    if not is_rest_day:
                        # Save strength exercises (BULK INSERT for performance)
                        strength_exercises = daily_data.get("strength_exercises", [])
                        
                        # Filter out exercises without exercise_id and prepare for bulk insert
                        valid_strength_exercises = []
                        strength_exercise_records = []
                        for exercise_index, exercise_data in enumerate(strength_exercises):
                            exercise_id = exercise_data.get("exercise_id")
                            
                            # CRITICAL: Validate exercise_id exists before saving
                            if exercise_id is None:
                                self.logger.warning(
                                    f"Skipping strength exercise with missing exercise_id "
                                    f"(daily_training_id: {daily_training_id}, exercise_index: {exercise_index}). "
                                    f"This usually indicates a failed exercise matching. Exercise data: {exercise_data}"
                                )
                                continue
                            
                            sets = exercise_data.get("sets", 3)
                            reps = exercise_data.get("reps", [10, 10, 10])
                            weight = exercise_data.get("weight", [0.0] * sets)
                            
                            strength_exercise_records.append({
                                "daily_training_id": daily_training_id,
                                "exercise_id": exercise_id,
                                "sets": sets,
                                "reps": reps,
                                "weight": weight,
                                "execution_order": exercise_data.get("execution_order", 0),
                                "completed": False,
                                "created_at": datetime.utcnow().isoformat(),
                                "updated_at": datetime.utcnow().isoformat(),
                            })
                            valid_strength_exercises.append(exercise_data)
                        
                        # Bulk insert all strength exercises at once
                        if strength_exercise_records:
                            se_result = (
                                supabase_client.table("strength_exercise")
                                .insert(strength_exercise_records)
                                .execute()
                            )
                            
                            # Map returned IDs back to exercise_data objects (order is preserved by Supabase)
                            if se_result.data and len(se_result.data) == len(valid_strength_exercises):
                                for i, exercise_data in enumerate(valid_strength_exercises):
                                    exercise_data["id"] = se_result.data[i]["id"]
                                    exercise_data["daily_training_id"] = daily_training_id
                            else:
                                # Fallback: if order doesn't match, log warning but continue
                                self.logger.warning(
                                    f"Bulk insert returned {len(se_result.data) if se_result.data else 0} records, "
                                    f"expected {len(valid_strength_exercises)}. IDs may not be enriched correctly."
                                )
                                # Still try to enrich if we have data
                                if se_result.data:
                                    for i, exercise_data in enumerate(valid_strength_exercises):
                                        if i < len(se_result.data):
                                            exercise_data["id"] = se_result.data[i]["id"]
                                            exercise_data["daily_training_id"] = daily_training_id
                            
                            # CRITICAL: Update daily_data with filtered and enriched exercises
                            # This ensures plan_dict only contains exercises that were actually saved to DB
                            daily_data["strength_exercises"] = valid_strength_exercises
                        else:
                            # No valid exercises - set to empty list to prevent invalid exercises from reaching frontend
                            daily_data["strength_exercises"] = []
                        
                        # Save endurance sessions (BULK INSERT for performance)
                        endurance_sessions = daily_data.get("endurance_sessions", [])
                        self.logger.info(
                            f"Week {week_index} Day {daily_index} endurance_sessions: count={len(endurance_sessions)}"
                        )
                        
                        if endurance_sessions:
                            # Prepare all endurance session records for bulk insert
                            endurance_session_records = []
                            for session_data in endurance_sessions:
                                name = session_data.get("name", "Endurance Session")
                                description = session_data.get("description", "")
                                sport_type = session_data.get("sport_type", "running")
                                training_volume = session_data.get("training_volume", 30.0)
                                unit = session_data.get("unit", "minutes")
                                heart_rate_zone = session_data.get("heart_rate_zone", 3)  # Default to Zone 3 if not provided
                                
                                endurance_session_records.append({
                                    "daily_training_id": daily_training_id,
                                    "name": name,
                                    "description": description,
                                    "sport_type": sport_type,
                                    "training_volume": training_volume,
                                    "unit": unit,
                                    "heart_rate_zone": heart_rate_zone,
                                    "execution_order": session_data.get("execution_order", 0),
                                    "completed": False,
                                    "created_at": datetime.utcnow().isoformat(),
                                    "updated_at": datetime.utcnow().isoformat(),
                                })
                            
                            # Bulk insert all endurance sessions at once
                            es_result = (
                                supabase_client.table("endurance_session")
                                .insert(endurance_session_records)
                                .execute()
                            )
                            
                            # Map returned IDs back to session_data objects (order is preserved by Supabase)
                            if es_result.data and len(es_result.data) == len(endurance_sessions):
                                for i, session_data in enumerate(endurance_sessions):
                                    session_data["id"] = es_result.data[i]["id"]
                                    session_data["daily_training_id"] = daily_training_id
                            else:
                                # Fallback: if order doesn't match, log warning but continue
                                self.logger.warning(
                                    f"Bulk insert returned {len(es_result.data) if es_result.data else 0} records, "
                                    f"expected {len(endurance_sessions)}. IDs may not be enriched correctly."
                                )
                                # Still try to enrich if we have data
                                if es_result.data:
                                    for i, session_data in enumerate(endurance_sessions):
                                        if i < len(es_result.data):
                                            session_data["id"] = es_result.data[i]["id"]
                                            session_data["daily_training_id"] = daily_training_id

            # Enrich plan_dict with exercise metadata (BULK QUERY for performance)
            # This ensures enriched fields (target_area, main_muscles, force) are available
            # Collect all unique exercise_ids first, then bulk-fetch metadata
            all_exercise_ids = set()
            
            # First pass: collect all exercise_ids
            for weekly_schedule in weekly_schedules:
                daily_trainings = weekly_schedule.get("daily_trainings", [])
                for daily_training in daily_trainings:
                    if not daily_training.get("is_rest_day", False):
                        strength_exercises = daily_training.get("strength_exercises", [])
                        for strength_exercise in strength_exercises:
                            exercise_id = strength_exercise.get("exercise_id")
                            if exercise_id:
                                all_exercise_ids.add(exercise_id)
            
            # Bulk fetch all exercise metadata at once
            exercise_metadata_map = {}
            if all_exercise_ids:
                try:
                    exercise_ids_list = list(all_exercise_ids)
                    if len(exercise_ids_list) == 1:
                        # Single exercise - use .eq() for efficiency
                        metadata_result = (
                            supabase_client.table("exercises")
                            .select("*")
                            .eq("id", exercise_ids_list[0])
                            .execute()
                        )
                        if metadata_result.data:
                            exercise_metadata_map[exercise_ids_list[0]] = metadata_result.data[0]
                    else:
                        # Multiple exercises - use .in_() for bulk query
                        metadata_result = (
                            supabase_client.table("exercises")
                            .select("*")
                            .in_("id", exercise_ids_list)
                            .execute()
                        )
                        if metadata_result.data:
                            # Build lookup map: exercise_id -> metadata
                            for exercise_metadata in metadata_result.data:
                                exercise_metadata_map[exercise_metadata.get("id")] = exercise_metadata
                except Exception as e:
                    self.logger.warning(f"Error bulk-fetching exercise metadata: {e}. Falling back to sequential queries.")
                    exercise_metadata_map = {}  # Will fall back to sequential if bulk fails
            
            # Second pass: enrich all exercises using the metadata map
            for weekly_schedule in weekly_schedules:
                daily_trainings = weekly_schedule.get("daily_trainings", [])
                for daily_training in daily_trainings:
                    if not daily_training.get("is_rest_day", False):
                        strength_exercises = daily_training.get("strength_exercises", [])
                        for strength_exercise in strength_exercises:
                            exercise_id = strength_exercise.get("exercise_id")
                            if exercise_id:
                                exercise_metadata = exercise_metadata_map.get(exercise_id)
                                
                                # Fallback to sequential query if bulk fetch failed or missed this exercise
                                if not exercise_metadata:
                                    try:
                                        exercise_metadata_result = (
                                            supabase_client.table("exercises")
                                            .select("*")
                                            .eq("id", exercise_id)
                                            .single()
                                            .execute()
                                        )
                                        if exercise_metadata_result.data:
                                            exercise_metadata = exercise_metadata_result.data
                                            exercise_metadata_map[exercise_id] = exercise_metadata  # Cache for future use
                                    except Exception as e:
                                        self.logger.warning(f"Error fetching metadata for exercise {exercise_id}: {e}")
                                
                                if exercise_metadata:
                                    # Store as "exercises" (plural) to match Supabase format (for frontend compatibility)
                                    strength_exercise["exercises"] = exercise_metadata
                                    # CRITICAL: Add exercise_name, main_muscle, equipment at top-level for Pydantic validation and frontend round-trip
                                    strength_exercise["exercise_name"] = exercise_metadata.get("name")
                                    # Extract main_muscle from main_muscles array (first item) - database has main_muscles, not main_muscle
                                    main_muscles_array = exercise_metadata.get("primary_muscles") or exercise_metadata.get("main_muscles", [])
                                    strength_exercise["main_muscle"] = main_muscles_array[0] if isinstance(main_muscles_array, list) and main_muscles_array else None
                                    strength_exercise["equipment"] = exercise_metadata.get("equipment")
                                    # Also flatten enriched fields to top-level for schema validation and prompt formatting
                                    strength_exercise["target_area"] = exercise_metadata.get("target_area")
                                    strength_exercise["main_muscles"] = main_muscles_array
                                    strength_exercise["force"] = exercise_metadata.get("force")
                                else:
                                    strength_exercise["exercises"] = None

            self.logger.info(f"Successfully updated training plan {plan_id}")
            # Summarize enriched IDs before returning
            try:
                first_week_id = weekly_schedules and weekly_schedules[0].get("id")
                first_day_id = (
                    weekly_schedules and weekly_schedules[0].get("daily_trainings")
                )
                first_day_id = first_day_id and first_day_id and first_day_id[0].get("id")
                first_exs = (
                    weekly_schedules
                    and weekly_schedules[0].get("daily_trainings")
                    and weekly_schedules[0].get("daily_trainings")[0].get("strength_exercises")
                ) or []
                first_ex_id = first_exs and first_exs[0] and first_exs[0].get("id")
                self.logger.info(
                    f"Enriched plan IDs: plan_id={plan_dict.get('id')}, week_id={first_week_id}, day_id={first_day_id}, strength_exercise_id={first_ex_id}"
                )
            except Exception as e:
                self.logger.warning(f"Failed to summarize enriched IDs: {e}")
            
            # Return enriched plan dict that now contains all generated IDs
            return plan_dict

        except Exception as e:
            self.logger.error(f"Error updating training plan {plan_id}: {e}")
            return None

    # ============================================================================
    # LATENCY TRACKING METHODS
    # ============================================================================

    async def log_latency_event(
        self,
        event: str,
        duration_seconds: float,
        completion: Optional[Any] = None
    ) -> bool:
        """
        Log a latency event to the database with token usage for cost tracking.
        Simple event-based logging for AI operation durations and costs.
        Uses service role key to bypass RLS.
        
        Args:
            event: Type of event (initial_questions, playbook, initial_plan, feedback_plan, regenerate_plan)
            duration_seconds: Duration of the AI API call in seconds
            completion: Optional OpenAI completion object (will extract tokens/model automatically)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Extract token usage from completion object if provided
            input_tokens = None
            output_tokens = None
            total_tokens = None
            model = None
            
            if completion is not None:
                # Extract usage data
                if hasattr(completion, 'usage') and completion.usage:
                    usage = completion.usage
                    input_tokens = getattr(usage, 'prompt_tokens', None)
                    output_tokens = getattr(usage, 'completion_tokens', None)
                    total_tokens = getattr(usage, 'total_tokens', None)
                
                # Extract model name
                if hasattr(completion, 'model'):
                    model = completion.model
            
            # Use service role key to bypass RLS for internal metrics
            supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
            )
            
            # Build insert data
            insert_data = {
                "event": event,
                "duration_seconds": duration_seconds
            }
            
            # Add optional token tracking fields
            if input_tokens is not None:
                insert_data["input_tokens"] = input_tokens
            if output_tokens is not None:
                insert_data["output_tokens"] = output_tokens
            if total_tokens is not None:
                insert_data["total_tokens"] = total_tokens
            if model is not None:
                insert_data["model"] = model
            
            # Insert event
            result = supabase_client.table("latency").insert(insert_data).execute()
            
            if result.data:
                log_msg = f"Logged latency event: {event} = {duration_seconds:.3f}s"
                if total_tokens:
                    log_msg += f" ({total_tokens} tokens"
                    if model:
                        log_msg += f", {model}"
                    log_msg += ")"
                self.logger.debug(log_msg)
                return True
            else:
                self.logger.warning(f"Failed to log latency event: {event}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error logging latency event {event}: {e}")
            return False

    async def append_weekly_schedules(
        self,
        training_plan_id: int,
        weekly_schedules: List[Dict[str, Any]],
        jwt_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Append future week outlines to the weekly_schedules table.
        
        Args:
            training_plan_id: The training plan ID to append weeks to
            weekly_schedules: List of weekly schedule dicts (outline only, no daily trainings)
            jwt_token: Optional JWT token for authentication
            
        Returns:
            Result dict with success/error
        """
        try:
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
                )
            
            inserted_weeks = []
            
            for week_data in weekly_schedules:
                week_number = week_data.get("week_number")
                
                weekly_schedule_record = {
                    "training_plan_id": training_plan_id,
                    "week_number": week_number,
                    "focus_theme": week_data.get("focus_theme", ""),
                    "primary_goal": week_data.get("primary_goal", ""),
                    "progression_lever": week_data.get("progression_lever", ""),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                
                weekly_result = (
                    supabase_client.table("weekly_schedules")
                    .insert(weekly_schedule_record)
                    .execute()
                )
                
                if weekly_result.data:
                    inserted_weeks.append(weekly_result.data[0])
                    self.logger.debug(f"Appended week {week_number} outline")
                else:
                    self.logger.warning(f"Failed to append week {week_number} outline")
            
            self.logger.info(f"✅ Appended {len(inserted_weeks)} weekly outlines to training_plan {training_plan_id}")
            
            return {
                "success": True,
                "data": {"inserted_weeks": len(inserted_weeks)},
            }
            
        except Exception as e:
            self.logger.error(f"Error appending weekly schedules: {e}")
            return {
                "success": False,
                "error": str(e),
            }


# Global database service instance
db_service = DatabaseService()
