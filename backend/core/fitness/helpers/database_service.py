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
        try:
            # Create authenticated Supabase client if JWT token is provided
            if jwt_token:
                supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_ANON_KEY
                )
                # Set the authorization header for the client
                supabase_client.postgrest.auth(jwt_token)
            else:
                supabase_client = self.supabase
            
            # First, create the main workout plan record
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
                return {
                    "success": False,
                    "error": f"Failed to create workout plan record: {plan_result}"
                }
            
            workout_plan_id = plan_result.data[0]["id"]
            print(f"✅ Created workout plan with ID: {workout_plan_id}")
            
            # Save weekly schedules and their details
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            
            for week_data in weekly_schedules:
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
                print(f"✅ Created weekly schedule {week_number} with ID: {weekly_schedule_id}")
                
                # Save daily workouts
                daily_workouts = week_data.get("daily_workouts", [])
                
                for daily_data in daily_workouts:
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
                    print(f"✅ Created daily workout {day_of_week} with ID: {daily_workout_id}")
                    
                    # Save exercises if not a rest day
                    if not is_rest_day:
                        exercises = daily_data.get("exercises", [])
                        
                        for exercise_data in exercises:
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
                            
                            if exercise_result.data:
                                print(f"✅ Created workout exercise {exercise_id} for {day_of_week}")
            
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
            print(f"❌ Error saving workout plan: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to save workout plan: {str(e)}"
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
