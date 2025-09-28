"""
Database service for handling user profiles and workout plans with Supabase.
"""

import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from settings import settings
import json
from datetime import datetime


class DatabaseService:
    """Service for database operations using Supabase."""
    
    def __init__(self):
        """Initialize Supabase client."""
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    def _get_authenticated_client(self, jwt_token: str) -> Client:
        """Create an authenticated Supabase client with service role key for server-side operations."""
        print(f"🔍 DEBUG: Creating authenticated client with service role key")
        
        # Use service role key for server-side operations (bypasses RLS)
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            print("✅ DEBUG: Using service role key for authentication")
        else:
            # Fallback to anon key with JWT token
            print("⚠️  DEBUG: No service role key found, using anon key with JWT token")
            client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            try:
                client.postgrest.auth(jwt_token)
                print("✅ DEBUG: JWT token set successfully")
            except Exception as e:
                print(f"❌ DEBUG: Error setting JWT token: {e}")
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
                print(f"✅ DB: User profile created successfully (ID: {result.data[0]['id']})")
                return {
                    'success': True,
                    'data': result.data[0],
                    'message': 'User profile created successfully'
                }
            else:
                print(f"❌ DB: Failed to create user profile")
                return {
                    'success': False,
                    'error': 'Failed to create user profile',
                    'message': 'No data returned from profile creation'
                }
                
        except Exception as e:
            error_str = str(e)
            print(f"💥 DB: Exception during user profile creation:", {
                "error": error_str,
                "error_type": type(e).__name__,
                "user_id": user_id
            })
            return {
                'success': False,
                'error': error_str,
                'message': f'Error creating user profile: {error_str}'
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
                print(f"❌ DB: No valid fields to update for user {user_id}")
                return {
                    'success': False,
                    'error': 'No valid fields to update',
                    'message': 'No non-null fields provided for update'
                }
            
            # Update the user profile
            result = supabase_client.table("user_profiles").update(update_data).eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                updated_fields = list(update_data.keys())
                print(f"✅ DB: User profile updated successfully with fields: {updated_fields}")
                return {
                    'success': True,
                    'data': result.data[0],
                    'message': f'User profile updated successfully with fields: {updated_fields}'
                }
            else:
                print(f"❌ DB: Failed to update user profile")
                return {
                    'success': False,
                    'error': 'No data returned from update',
                    'message': 'Failed to update user profile'
                }
                
        except Exception as e:
            error_str = str(e)
            print(f"💥 DB: Exception during user profile update:", {
                "error": error_str,
                "error_type": type(e).__name__,
                "user_id": user_id,
                "fields": list(data.keys()) if data else []
            })
            return {
                'success': False,
                'error': error_str,
                'message': f'Error updating user profile: {error_str}'
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
            print(f"❌ Error fetching user profile: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch user profile: {str(e)}"
            }
    
    async def save_workout_plan(self, user_profile_id: int, workout_plan_data: Dict[str, Any], jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Save a complete workout plan to the database.
        
        Args:
            user_profile_id: The user profile ID
            workout_plan_data: The complete workout plan data from the AI
            
        Returns:
            Dict containing success status and plan data or error
        """
        try:
            # Use authenticated client if JWT token is provided
            if jwt_token:
                supabase_client = self._get_authenticated_client(jwt_token)
            else:
                supabase_client = self.supabase
            
            # First, check if a workout plan already exists for this user
            existing_plan_result = supabase_client.table("workout_plans").select("id").eq("user_profile_id", user_profile_id).execute()
            
            if existing_plan_result.data and len(existing_plan_result.data) > 0:
                existing_plan_id = existing_plan_result.data[0]["id"]
                print(f"❌ DB: Workout plan already exists (ID: {existing_plan_id}) for user {user_profile_id}")
                return {
                    "success": False,
                    "error": f"Workout plan already exists for this user (ID: {existing_plan_id}). Cannot create duplicate."
                }
            
            # First, create the main workout plan record
            # Convert Pydantic model to dict if needed
            # Convert Pydantic model to dict if needed
            if hasattr(workout_plan_data, 'dict'):
                plan_dict = workout_plan_data.dict()
            elif hasattr(workout_plan_data, 'model_dump'):
                plan_dict = workout_plan_data.model_dump()
            else:
                plan_dict = workout_plan_data
            
            plan_record = {
                "user_profile_id": user_profile_id,
                "title": plan_dict.get("title", "Personalized Workout Plan"),
                "summary": plan_dict.get("summary", ""),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert the workout plan
            plan_result = supabase_client.table("workout_plans").insert(plan_record).execute()
            
            if not plan_result.data:
                print(f"❌ DB: Failed to create workout plan record")
                return {
                    "success": False,
                    "error": f"Failed to create workout plan record: {plan_result}"
                }
            
            workout_plan_id = plan_result.data[0]["id"]
            
            # Save weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            
            for week_index, week_data in enumerate(weekly_schedules):
                week_number = week_data.get("week_number", 1)
                
                # Create weekly schedule record
                weekly_schedule_record = {
                    "workout_plan_id": workout_plan_id,
                    "week_number": week_number,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                weekly_result = supabase_client.table("weekly_schedules").insert(weekly_schedule_record).execute()
                
                if not weekly_result.data:
                    continue
                
                weekly_schedule_id = weekly_result.data[0]["id"]
                
                # Save daily workouts
                daily_workouts = week_data.get("daily_workouts", [])
                
                for daily_index, daily_data in enumerate(daily_workouts):
                    day_of_week = daily_data.get("day_of_week", "Monday")
                    is_rest_day = daily_data.get("is_rest_day", False)
                    
                    # Create daily workout record
                    daily_workout_record = {
                        "weekly_schedule_id": weekly_schedule_id,
                        "day_of_week": day_of_week,
                        "is_rest_day": is_rest_day,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    daily_result = supabase_client.table("daily_workouts").insert(daily_workout_record).execute()
                    
                    if not daily_result.data:
                        continue
                    
                    daily_workout_id = daily_result.data[0]["id"]
                    
                    # Save exercises if not a rest day
                    if not is_rest_day:
                        exercises = daily_data.get("exercises", [])
                        
                        for exercise_index, exercise_data in enumerate(exercises):
                            exercise_id = exercise_data.get("exercise_id")
                            sets = exercise_data.get("sets", 3)
                            reps = exercise_data.get("reps", [10, 10, 10])
                            weight_1rm = exercise_data.get("weight_1rm", [80, 80, 80])
                            
                            # Create workout exercise record
                            workout_exercise_record = {
                                "daily_workout_id": daily_workout_id,
                                "exercise_id": exercise_id,
                                "sets": sets,
                                "reps": reps,
                                "weight": [None] * sets,
                                "weight_1rm": weight_1rm,
                                "completed": False,
                                "created_at": datetime.utcnow().isoformat(),
                                "updated_at": datetime.utcnow().isoformat()
                            }
                            
                            exercise_result = supabase_client.table("workout_exercises").insert(workout_exercise_record).execute()
            
            print(f"✅ DB: Workout plan saved successfully (ID: {workout_plan_id})")
            
            return {
                "success": True,
                "data": {
                    "workout_plan_id": workout_plan_id,
                    "title": plan_record["title"],
                    "summary": plan_record["summary"]
                },
                "message": "Workout plan saved successfully"
            }
            
        except Exception as e:
            error_str = str(e)
            print(f"💥 DB: Exception during workout plan save:", {
                "error": error_str,
                "error_type": type(e).__name__,
                "user_profile_id": user_profile_id
            })
            
            # Check for specific error types
            if "23505" in error_str or "duplicate key value violates unique constraint" in error_str:
                print(f"🚨 DB: DUPLICATE KEY VIOLATION DETECTED!")
                print(f"🚨 DB: This means a workout plan already exists for user_profile_id: {user_profile_id}")
                print(f"🚨 DB: The unique constraint 'unique_user_workout_plan' is being violated")
                return {
                    "success": False,
                    "error": f"Workout plan already exists for this user. Duplicate key constraint violation: {error_str}"
                }
            elif "23503" in error_str or "foreign key constraint" in error_str:
                print(f"🚨 DB: FOREIGN KEY CONSTRAINT VIOLATION DETECTED!")
                print(f"🚨 DB: This means a referenced record doesn't exist")
                return {
                    "success": False,
                    "error": f"Database constraint violation: {error_str}"
                }
            else:
                print(f"❌ DB: Generic error saving workout plan: {error_str}")
                return {
                    "success": False,
                    "error": f"Failed to save workout plan: {error_str}"
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
                print(f"🔍 DB: Using authenticated client with JWT for user_id: {user_id}")
            else:
                supabase_client = self._get_authenticated_client(None)  # This will use service role
                print(f"🔍 DB: Using service role client for user_id: {user_id}")
            
            # Get user profile by user_id
            print(f"🔍 DB: Querying user_profiles table for user_id: {user_id}")
            result = supabase_client.table("user_profiles").select("*").eq("user_id", user_id).execute()
            print(f"🔍 DB: Query result: {result}")
            print(f"🔍 DB: Result data: {result.data}")
            print(f"🔍 DB: Result count: {len(result.data) if result.data else 0}")
            
            if not result.data or len(result.data) == 0:
                print(f"❌ DB: No user profile found for user_id: {user_id}")
                
                # Debug: List all user profiles to see what's in the database
                try:
                    all_profiles = self.supabase.table("user_profiles").select("id, user_id, username").execute()
                    print(f"🔍 DB: All user profiles in database: {all_profiles.data}")
                except Exception as debug_e:
                    print(f"❌ DB: Error getting all profiles for debug: {debug_e}")
                
                return {
                    "success": False,
                    "error": "User profile not found"
                }
            
            return {
                "success": True,
                "data": result.data[0]
            }
            
        except Exception as e:
            print(f"❌ DB: Error getting user profile by user_id: {str(e)}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }

    async def get_workout_plan(self, user_profile_id: int) -> Dict[str, Any]:
        """
        Get a user's workout plan from the database.
        
        Args:
            user_profile_id: The user profile ID
            
        Returns:
            Dict containing success status and plan data or error
        """
        try:
            # Get the main workout plan
            plan_result = self.supabase.table("workout_plans").select("*").eq("user_profile_id", user_profile_id).execute()
            
            if not plan_result.data or len(plan_result.data) == 0:
                return {
                    "success": False,
                    "error": "No workout plan found"
                }
            
            workout_plan = plan_result.data[0]
            workout_plan_id = workout_plan["id"]
            
            # Get weekly schedules
            weekly_result = self.supabase.table("weekly_schedules").select("*").eq("workout_plan_id", workout_plan_id).execute()
            weekly_schedules = weekly_result.data or []
            
            # Get daily workouts for each weekly schedule
            for weekly_schedule in weekly_schedules:
                weekly_schedule_id = weekly_schedule["id"]
                
                daily_result = self.supabase.table("daily_workouts").select("*").eq("weekly_schedule_id", weekly_schedule_id).execute()
                daily_workouts = daily_result.data or []
                
                # Get exercises for each daily workout
                for daily_workout in daily_workouts:
                    daily_workout_id = daily_workout["id"]
                    
                    if not daily_workout["is_rest_day"]:
                        exercise_result = self.supabase.table("workout_exercises").select("*").eq("daily_workout_id", daily_workout_id).execute()
                        daily_workout["exercises"] = exercise_result.data or []
                    else:
                        daily_workout["exercises"] = []
                
                weekly_schedule["daily_workouts"] = daily_workouts
            
            workout_plan["weekly_schedules"] = weekly_schedules
            
            return {
                "success": True,
                "data": workout_plan,
                "message": "Workout plan retrieved successfully"
            }
            
        except Exception as e:
            print(f"❌ Error fetching workout plan: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch workout plan: {str(e)}"
            }
    
    # Coaches functions removed - now handled by frontend Supabase client


# Global database service instance
db_service = DatabaseService()
