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
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    def _get_authenticated_client(self, jwt_token: str) -> Client:
        """Create an authenticated Supabase client with service role key for server-side operations."""
        self.logger.debug("Creating authenticated client with service role key")
        
        # Use service role key for server-side operations (bypasses RLS)
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            self.logger.debug("Using service role key for authentication")
        else:
            # Fallback to anon key with JWT token
            self.logger.warning("No service role key found, using anon key with JWT token")
            client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            try:
                client.postgrest.auth(jwt_token)
                self.logger.debug("JWT token set successfully")
            except Exception as e:
                self.logger.error(f"Error setting JWT token: {e}")
                raise
        
        return client
    
    async def create_user_profile(self, user_id: str, profile_data: Dict[str, Any], jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """Create a new user profile in the database."""
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase
            
            # Insert user profile
            result = supabase_client.table("user_profiles").insert({
                "user_id": user_id,
                **profile_data
            }).execute()
            
            if result.data and len(result.data) > 0:
                self.logger.info(f"User profile created successfully (ID: {result.data[0]['id']})")
                return {
                    'success': True,
                    'data': result.data[0],
                    'message': 'User profile created successfully'
                }
            else:
                self.logger.error("Failed to create user profile")
                return {
                    'success': False,
                    'error': 'Failed to create user profile',
                    'message': 'No data returned from profile creation'
                }
                
        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during user profile creation: {error_str}")
            return {
                "success": False,
                "error": f"Failed to create user profile: {error_str}",
                "error_type": type(e).__name__,
                "user_id": user_id
            }
    
    async def update_user_profile(self, user_id: str, data: Dict[str, Any], jwt_token: Optional[str] = None) -> Dict[str, Any]:
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
            update_data = {
                **data,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Remove None values to avoid overwriting with null
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            if not update_data:
                self.logger.warning(f"No valid fields to update for user {user_id}")
                return {
                    'success': False,
                    'error': 'No valid fields to update',
                    'message': 'No non-null fields provided for update'
                }
            
            # Update the user profile
            result = supabase_client.table("user_profiles").update(update_data).eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                updated_fields = list(update_data.keys())
                self.logger.info(f"User profile updated successfully with fields: {updated_fields}")
                return {
                    'success': True,
                    'data': result.data[0],
                    'message': f'User profile updated successfully with fields: {updated_fields}'
                }
            else:
                self.logger.error("Failed to update user profile")
                return {
                    'success': False,
                    'error': 'No data returned from update',
                    'message': 'Failed to update user profile'
                }
                
        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during user profile update: {error_str}")
            return {
                "success": False,
                "error": error_str,
                "error_type": type(e).__name__,
                "user_id": user_id,
                "fields": list(data.keys()) if data else []
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
            result = self.supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                return {
                    "success": True,
                    "data": result.data[0],
                    "message": "User profile found"
                }
            else:
                return {
                    "success": False,
                    "error": "User profile not found"
                }
                
        except Exception as e:
            self.logger.error(f"Error fetching user profile: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch user profile: {str(e)}"
            }
    
    async def save_training_plan(self, user_profile_id: int, training_plan_data: Dict[str, Any], jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Save a complete training plan to the database.
        
        Args:
            user_profile_id: The user profile ID
            training_plan_data: The complete training plan data from the AI
            
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
            existing_plan_result = supabase_client.table("training_plans").select("id").eq("user_profile_id", user_profile_id).execute()
            
            if existing_plan_result.data and len(existing_plan_result.data) > 0:
                existing_plan_id = existing_plan_result.data[0]["id"]
                self.logger.warning(f"Training plan already exists (ID: {existing_plan_id}) for user {user_profile_id}")
                return {
                    "success": False,
                    "error": f"Training plan already exists for this user (ID: {existing_plan_id}). Cannot create duplicate."
                }
            
            # First, create the main training plan record
            # Convert Pydantic model to dict if needed
            # Convert Pydantic model to dict if needed
            if hasattr(training_plan_data, 'model_dump'):
                plan_dict = training_plan_data.model_dump()
            elif hasattr(training_plan_data, 'dict'):
                plan_dict = training_plan_data.dict()
            else:
                plan_dict = training_plan_data
            
            plan_record = {
                "user_profile_id": user_profile_id,
                "title": plan_dict.get("title", "Personalized Training Plan"),
                "summary": plan_dict.get("summary", ""),
                "motivation": plan_dict.get("motivation", ""),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert the training plan
            self.logger.debug(f"Saving training plan with motivation: {plan_record.get('motivation', 'No motivation provided')[:100]}...")
            plan_result = supabase_client.table("training_plans").insert(plan_record).execute()
            
            if not plan_result.data:
                self.logger.error("Failed to create training plan record")
                return {
                    "success": False,
                    "error": f"Failed to create training plan record: {plan_result}"
                }
            
            training_plan_id = plan_result.data[0]["id"]
            
            # Save weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            
            for week_index, week_data in enumerate(weekly_schedules):
                week_number = week_data.get("week_number", 1)
                
                # Create weekly schedule record
                weekly_schedule_record = {
                    "training_plan_id": training_plan_id,
                    "week_number": week_number,
                    "motivation": week_data.get("motivation", ""),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.logger.debug(f"Saving weekly schedule {week_number} with motivation: {weekly_schedule_record.get('motivation', 'No motivation provided')[:100]}...")
                weekly_result = supabase_client.table("weekly_schedules").insert(weekly_schedule_record).execute()
                
                if not weekly_result.data:
                    continue
                
                weekly_schedule_id = weekly_result.data[0]["id"]
                
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
                        "training_type": daily_data.get("training_type", "recovery" if is_rest_day else "strength"),
                        "motivation": daily_data.get("motivation", ""),
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    self.logger.debug(f"Saving daily training {day_of_week} with motivation: {daily_training_record.get('motivation', 'No motivation provided')[:100]}...")
                    daily_result = supabase_client.table("daily_training").insert(daily_training_record).execute()
                    
                    if not daily_result.data:
                        continue
                    
                    daily_training_id = daily_result.data[0]["id"]
                    
                    # Save exercises and endurance sessions if not a rest day
                    if not is_rest_day:
                        # Save strength exercises
                        strength_exercises = daily_data.get("strength_exercises", [])
                        
                        for exercise_index, exercise_data in enumerate(strength_exercises):
                            exercise_id = exercise_data.get("exercise_id")
                            sets = exercise_data.get("sets", 3)
                            reps = exercise_data.get("reps", [10, 10, 10])
                            weight_1rm = exercise_data.get("weight_1rm", [80, 80, 80])
                            
                            # Create strength exercise record
                            strength_exercise_record = {
                                "daily_training_id": daily_training_id,
                                "exercise_id": exercise_id,
                                "sets": sets,
                                "reps": reps,
                                "weight": [None] * sets,
                                "weight_1rm": weight_1rm,
                                "completed": False,
                                "created_at": datetime.utcnow().isoformat(),
                                "updated_at": datetime.utcnow().isoformat()
                            }
                            
                            exercise_result = supabase_client.table("strength_exercise").insert(strength_exercise_record).execute()
                        
                        # Save endurance sessions
                        endurance_sessions = daily_data.get("endurance_sessions", [])
                        
                        for session_index, session_data in enumerate(endurance_sessions):
                            name = session_data.get("name", "Endurance Session")
                            sport_type = session_data.get("sport_type", "running")
                            training_volume = session_data.get("training_volume", 30.0)
                            unit = session_data.get("unit", "minutes")
                            heart_rate_zone = session_data.get("heart_rate_zone")
                            
                            # Create endurance session record
                            endurance_session_record = {
                                "daily_training_id": daily_training_id,
                                "name": name,
                                "description": description,
                                "sport_type": sport_type,
                                "training_volume": training_volume,
                                "unit": unit,
                                "heart_rate_zone": heart_rate_zone,
                                "completed": False,
                                "created_at": datetime.utcnow().isoformat(),
                                "updated_at": datetime.utcnow().isoformat()
                            }
                            
                            session_result = supabase_client.table("endurance_session").insert(endurance_session_record).execute()
            
            self.logger.info(f"Training plan saved successfully (ID: {training_plan_id})")
            
            return {
                "success": True,
                "data": {
                    "training_plan_id": training_plan_id,
                    "title": plan_record["title"],
                    "summary": plan_record["summary"],
                    "motivation": plan_record["motivation"]
                },
                "message": "Training plan saved successfully"
            }
            
        except Exception as e:
            error_str = str(e)
            self.logger.error(f"Exception during training plan save: {error_str}")
            
            # Handle specific database errors
            # Check for specific error types
            if "23505" in error_str or "duplicate key value violates unique constraint" in error_str:
                self.logger.error("DUPLICATE KEY VIOLATION DETECTED!")
                self.logger.error(f"This means a training plan already exists for user_profile_id: {user_profile_id}")
                self.logger.error("The unique constraint 'unique_user_training_plan' is being violated")
                return {
                    "success": False,
                    "error": f"Training plan already exists for this user. Duplicate key constraint violation: {error_str}"
                }
            elif "23503" in error_str or "foreign key constraint" in error_str:
                self.logger.error("FOREIGN KEY CONSTRAINT VIOLATION DETECTED!")
                self.logger.error("This means a referenced record doesn't exist")
                return {
                    "success": False,
                    "error": f"Database constraint violation: {error_str}"
                }
            else:
                self.logger.error(f"Generic error saving training plan: {error_str}")
                return {
                    "success": False,
                    "error": f"Failed to save training plan: {error_str}"
                }
    
    async def get_user_profile_by_user_id(self, user_id: str, jwt_token: Optional[str] = None) -> Dict[str, Any]:
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
                self.logger.debug(f"Using authenticated client with JWT for user_id: {user_id}")
            else:
                supabase_client = self._get_authenticated_client(None)  # This will use service role
                self.logger.debug(f"Using service role client for user_id: {user_id}")
            
            # Get user profile by user_id
            self.logger.debug(f"Querying user_profiles table for user_id: {user_id}")
            result = supabase_client.table("user_profiles").select("*").eq("user_id", user_id).execute()
            self.logger.debug(f"Query result: {result}")
            self.logger.debug(f"Result data: {result.data}")
            self.logger.debug(f"Result count: {len(result.data) if result.data else 0}")
            
            if not result.data or len(result.data) == 0:
                self.logger.warning(f"No user profile found for user_id: {user_id}")
                
                # Debug: List all user profiles to see what's in the database
                try:
                    all_profiles = self.supabase.table("user_profiles").select("id, user_id, username").execute()
                    self.logger.debug(f"All user profiles in database: {all_profiles.data}")
                except Exception as debug_e:
                    self.logger.error(f"Error getting all profiles for debug: {debug_e}")
                
                return {
                    "success": False,
                    "error": "User profile not found"
                }
            
            return {
                "success": True,
                "data": result.data[0]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting user profile by user_id: {str(e)}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }

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
            plan_result = self.supabase.table("training_plans").select("*").eq("user_profile_id", user_profile_id).execute()
            
            if not plan_result.data or len(plan_result.data) == 0:
                return {
                    "success": False,
                    "error": "No training plan found"
                }
            
            training_plan = plan_result.data[0]
            training_plan_id = training_plan["id"]
            
            # Get weekly schedules
            weekly_result = self.supabase.table("weekly_schedules").select("*").eq("training_plan_id", training_plan_id).execute()
            weekly_schedules = weekly_result.data or []
            
            # Get daily trainings for each weekly schedule
            for weekly_schedule in weekly_schedules:
                weekly_schedule_id = weekly_schedule["id"]
                
                daily_result = self.supabase.table("daily_training").select("*").eq("weekly_schedule_id", weekly_schedule_id).execute()
                daily_trainings = daily_result.data or []
                
                # Get exercises and endurance sessions for each daily training
                for daily_training in daily_trainings:
                    daily_training_id = daily_training["id"]
                    
                    if not daily_training["is_rest_day"]:
                        # Get strength exercises
                        exercise_result = self.supabase.table("strength_exercise").select("*").eq("daily_training_id", daily_training_id).execute()
                        daily_training["strength_exercises"] = exercise_result.data or []
                        
                        # Get endurance sessions
                        session_result = self.supabase.table("endurance_session").select("*").eq("daily_training_id", daily_training_id).execute()
                        daily_training["endurance_sessions"] = session_result.data or []
                    else:
                        daily_training["strength_exercises"] = []
                        daily_training["endurance_sessions"] = []
                
                weekly_schedule["daily_trainings"] = daily_trainings
            
            training_plan["weekly_schedules"] = weekly_schedules
            
            return {
                "success": True,
                "data": training_plan,
                "message": "Training plan retrieved successfully"
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching training plan: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch training plan: {str(e)}"
            }
    
    # Coaches functions removed - now handled by frontend Supabase client


# Global database service instance
db_service = DatabaseService()
