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
    
    # create_user_profile function removed - now handled by frontend Supabase client
    
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
        print(f"💾 DB: Starting workout plan save operation...")
        print(f"📋 DB: User profile ID: {user_profile_id}")
        print(f"📋 DB: Has JWT token: {bool(jwt_token)}")
        print(f"📋 DB: Workout plan data keys: {list(workout_plan_data.keys()) if isinstance(workout_plan_data, dict) else 'Not a dict'}")
        
        try:
            # Create authenticated Supabase client if JWT token is provided
            if jwt_token:
                print(f"🔐 DB: Creating authenticated Supabase client...")
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_ANON_KEY
                )
                # Set the authorization header for the client
                supabase_client.postgrest.auth(jwt_token)
                print(f"✅ DB: Authenticated client created")
            else:
                print(f"🔓 DB: Using unauthenticated client")
                supabase_client = self.supabase
            
            # First, check if a workout plan already exists for this user
            print(f"🔍 DB: Checking for existing workout plan...")
            existing_plan_result = supabase_client.table("workout_plans").select("id").eq("user_profile_id", user_profile_id).execute()
            
            print(f"📊 DB: Existing plan check result:", {
                "has_data": bool(existing_plan_result.data),
                "data_count": len(existing_plan_result.data) if existing_plan_result.data else 0,
                "error": existing_plan_result.error if hasattr(existing_plan_result, 'error') else None
            })
            
            if existing_plan_result.data and len(existing_plan_result.data) > 0:
                existing_plan_id = existing_plan_result.data[0]["id"]
                print(f"🚨 DB: EXISTING WORKOUT PLAN FOUND!")
                print(f"🚨 DB: Workout plan ID: {existing_plan_id} already exists for user_profile_id: {user_profile_id}")
                print(f"🚨 DB: This will cause a duplicate key constraint violation if we proceed")
                return {
                    "success": False,
                    "error": f"Workout plan already exists for this user (ID: {existing_plan_id}). Cannot create duplicate."
                }
            
            print(f"✅ DB: No existing workout plan found, proceeding with creation...")
            
            # First, create the main workout plan record
            # Convert Pydantic model to dict if needed
            print(f"🔄 DB: Converting workout plan data...")
            if hasattr(workout_plan_data, 'dict'):
                plan_dict = workout_plan_data.dict()
                print(f"📝 DB: Converted using .dict() method")
            elif hasattr(workout_plan_data, 'model_dump'):
                plan_dict = workout_plan_data.model_dump()
                print(f"📝 DB: Converted using .model_dump() method")
            else:
                plan_dict = workout_plan_data
                print(f"📝 DB: Using data as-is (already dict)")
            
            plan_record = {
                "user_profile_id": user_profile_id,
                "title": plan_dict.get("title", "Personalized Workout Plan"),
                "summary": plan_dict.get("summary", ""),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            print(f"📋 DB: Workout plan record prepared:", {
                "user_profile_id": plan_record["user_profile_id"],
                "title": plan_record["title"],
                "summary_length": len(plan_record["summary"])
            })
            
            # Insert the workout plan
            print(f"💾 DB: Inserting workout plan record...")
            plan_result = supabase_client.table("workout_plans").insert(plan_record).execute()
            
            print(f"📊 DB: Workout plan insert result:", {
                "has_data": bool(plan_result.data),
                "data_count": len(plan_result.data) if plan_result.data else 0,
                "error": plan_result.error if hasattr(plan_result, 'error') else None
            })
            
            if not plan_result.data:
                print(f"❌ DB: Failed to create workout plan record")
                return {
                    "success": False,
                    "error": f"Failed to create workout plan record: {plan_result}"
                }
            
            workout_plan_id = plan_result.data[0]["id"]
            print(f"✅ DB: Created workout plan with ID: {workout_plan_id}")
            
            # Save weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            print(f"📅 DB: Processing {len(weekly_schedules)} weekly schedules...")
            
            for week_index, week_data in enumerate(weekly_schedules):
                week_number = week_data.get("week_number", 1)
                print(f"📅 DB: Processing week {week_number} (index {week_index})...")
                
                # Create weekly schedule record
                weekly_schedule_record = {
                    "workout_plan_id": workout_plan_id,
                    "week_number": week_number,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                print(f"💾 DB: Inserting weekly schedule record for week {week_number}...")
                weekly_result = supabase_client.table("weekly_schedules").insert(weekly_schedule_record).execute()
                
                print(f"📊 DB: Weekly schedule insert result:", {
                    "has_data": bool(weekly_result.data),
                    "data_count": len(weekly_result.data) if weekly_result.data else 0,
                    "error": weekly_result.error if hasattr(weekly_result, 'error') else None
                })
                
                if not weekly_result.data:
                    print(f"❌ DB: Failed to create weekly schedule for week {week_number}, continuing...")
                    continue
                
                weekly_schedule_id = weekly_result.data[0]["id"]
                print(f"✅ DB: Created weekly schedule {week_number} with ID: {weekly_schedule_id}")
                
                # Save daily workouts
                daily_workouts = week_data.get("daily_workouts", [])
                print(f"🏃 DB: Processing {len(daily_workouts)} daily workouts for week {week_number}...")
                
                for daily_index, daily_data in enumerate(daily_workouts):
                    day_of_week = daily_data.get("day_of_week", "Monday")
                    is_rest_day = daily_data.get("is_rest_day", False)
                    print(f"🏃 DB: Processing {day_of_week} (rest day: {is_rest_day})...")
                    
                    # Create daily workout record
                    daily_workout_record = {
                        "weekly_schedule_id": weekly_schedule_id,
                        "day_of_week": day_of_week,
                        "is_rest_day": is_rest_day,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    print(f"💾 DB: Inserting daily workout record for {day_of_week}...")
                    daily_result = supabase_client.table("daily_workouts").insert(daily_workout_record).execute()
                    
                    print(f"📊 DB: Daily workout insert result:", {
                        "has_data": bool(daily_result.data),
                        "data_count": len(daily_result.data) if daily_result.data else 0,
                        "error": daily_result.error if hasattr(daily_result, 'error') else None
                    })
                    
                    if not daily_result.data:
                        print(f"❌ DB: Failed to create daily workout for {day_of_week}, continuing...")
                        continue
                    
                    daily_workout_id = daily_result.data[0]["id"]
                    print(f"✅ DB: Created daily workout {day_of_week} with ID: {daily_workout_id}")
                    
                    # Save exercises if not a rest day
                    if not is_rest_day:
                        exercises = daily_data.get("exercises", [])
                        print(f"💪 DB: Processing {len(exercises)} exercises for {day_of_week}...")
                        
                        for exercise_index, exercise_data in enumerate(exercises):
                            exercise_id = exercise_data.get("exercise_id")
                            sets = exercise_data.get("sets", 3)
                            reps = exercise_data.get("reps", [10, 10, 10])
                            weight_1rm = exercise_data.get("weight_1rm", [80, 80, 80])
                            
                            print(f"💪 DB: Processing exercise {exercise_id} (sets: {sets}, reps: {reps})...")
                            
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
                            
                            print(f"💾 DB: Inserting workout exercise record for exercise {exercise_id}...")
                            exercise_result = supabase_client.table("workout_exercises").insert(workout_exercise_record).execute()
                            
                            print(f"📊 DB: Workout exercise insert result:", {
                                "has_data": bool(exercise_result.data),
                                "data_count": len(exercise_result.data) if exercise_result.data else 0,
                                "error": exercise_result.error if hasattr(exercise_result, 'error') else None
                            })
                            
                            if exercise_result.data:
                                print(f"✅ DB: Created workout exercise {exercise_id} for {day_of_week}")
                            else:
                                print(f"❌ DB: Failed to create workout exercise {exercise_id} for {day_of_week}")
                    else:
                        print(f"😴 DB: Skipping exercises for {day_of_week} (rest day)")
            
            print(f"🎉 DB: Workout plan save operation completed successfully!")
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
