#!/usr/bin/env python3
"""
Workout Plan Generator and Excel Exporter for EvolveAI

This script generates a personalized workout plan based on a user profile
and exports it to a well-structured Excel file with multiple sheets containing:
- Workout plan details
- User profile information
- Generated prompt
- Metadata and timestamps

The Excel file will have a recognizable name based on user profile data.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import openai
from dotenv import load_dotenv
import logging
from supabase import create_client, Client

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from core.fitness.fitness_coach import FitnessCoach
from core.fitness.helpers.schemas import UserProfileSchema, WorkoutPlanSchema
from utils.mock_data import create_mock_user_profile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class WorkoutPlanExcelGenerator:
    """Generates workout plans and exports them to Excel files."""
    
    def __init__(self):
        """Initialize the workout plan generator."""
        self._validate_environment()
        self._initialize_clients()
        self.fitness_coach = FitnessCoach()
        self.exercise_cache = {}  # Cache for exercise names
        logger.info("✅ Workout plan generator initialized")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        required_vars = {
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY")
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def _initialize_clients(self):
        """Initialize OpenAI client."""
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Initialize Supabase client for exercise name lookup
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY")
        )

    def create_user_profile_from_dict(self, profile_data: Dict[str, Any]) -> UserProfileSchema:
        """Create a UserProfileSchema from a dictionary."""
        return UserProfileSchema(**profile_data)

    def get_exercise_name(self, exercise_id: int) -> str:
        """Get exercise name from database using exercise ID."""
        try:
            # Check cache first
            if exercise_id in self.exercise_cache:
                return self.exercise_cache[exercise_id]
            
            # Fetch from database
            response = self.supabase.table('exercises').select('name').eq('id', exercise_id).execute()
            
            if response.data and len(response.data) > 0:
                exercise_name = response.data[0]['name']
                self.exercise_cache[exercise_id] = exercise_name
                return exercise_name
            else:
                logger.warning(f"Exercise ID {exercise_id} not found in database")
                return f"Exercise {exercise_id}"
                
        except Exception as e:
            logger.warning(f"Error fetching exercise name for ID {exercise_id}: {e}")
            return f"Exercise {exercise_id}"

    def generate_workout_plan(self, user_profile: UserProfileSchema, 
                            enrich_with_knowledge: bool = False) -> Dict[str, Any]:
        """
        Generate a workout plan using the Fitness Coach.
        
        Args:
            user_profile: User profile data
            enrich_with_knowledge: Whether to use RAG enhancement
            
        Returns:
            Dictionary containing workout plan and metadata
        """
        try:
            logger.info("🏋️‍♂️ Generating workout plan...")
            logger.info(f"   User: {user_profile.age}yo {user_profile.gender}")
            logger.info(f"   Goal: {user_profile.primary_goal}")
            logger.info(f"   Experience: {user_profile.experience_level}")
            logger.info(f"   Frequency: {user_profile.days_per_week} days/week")
            
            # Generate the workout plan
            workout_plan = self.fitness_coach.generate_workout_plan(
                user_profile=user_profile,
                openai_client=self.openai_client,
                enrich_with_knowledge=enrich_with_knowledge
            )
            
            # Get the prompt used for generation
            prompt = self._get_generation_prompt(user_profile)
            
            return {
                "workout_plan": workout_plan,
                "user_profile": user_profile,
                "generation_prompt": prompt,
                "generation_timestamp": datetime.now().isoformat(),
                "enrich_with_knowledge": enrich_with_knowledge,
                "agent_used": "Fitness Coach"
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating workout plan: {e}")
            raise

    def _get_generation_prompt(self, user_profile: UserProfileSchema) -> str:
        """Get the prompt that would be used for generation."""
        try:
            # Get exercise candidates
            exercise_candidates = self.fitness_coach._get_exercise_candidates_for_profile(
                user_profile, max_exercises=300
            )
            
            # Generate the base prompt
            base_prompt = self.fitness_coach.prompt_generator.create_initial_plan_prompt(
                user_profile, exercise_candidates
            )
            
            # Add foundations
            enhanced_prompt = self.fitness_coach._add_foundations_of_creating_a_workout_plan(
                base_prompt, user_profile
            )
            
            return enhanced_prompt
            
        except Exception as e:
            logger.warning(f"Could not generate prompt: {e}")
            return "Prompt generation failed"

    def create_excel_filename(self, user_profile: UserProfileSchema) -> str:
        """Create a recognizable Excel filename based on user profile."""
        # Clean and format the data for filename
        goal = user_profile.primary_goal.replace(' ', '_').replace('/', '_')
        experience = user_profile.experience_level.lower()
        frequency = f"{user_profile.days_per_week}days"
        age = f"{user_profile.age}yo"
        gender = user_profile.gender.lower()
        
        # Create timestamp for uniqueness
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        
        # Build filename
        filename = f"WorkoutPlan_{goal}_{experience}_{frequency}_{age}{gender}_{timestamp}.xlsx"
        
        # Clean filename of any invalid characters
        filename = "".join(c for c in filename if c.isalnum() or c in "._-")
        
        return filename

    def export_to_excel(self, workout_data: Dict[str, Any], output_path: str) -> bool:
        """
        Export workout plan data to an Excel file with multiple sheets.
        
        Args:
            workout_data: Dictionary containing workout plan and metadata
            output_path: Path where to save the Excel file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            workout_plan = workout_data["workout_plan"]
            user_profile = workout_data["user_profile"]
            
            logger.info(f"📊 Creating Excel file: {output_path}")
            
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                
                # Sheet 1: Workout Plan Overview
                self._create_overview_sheet(writer, workout_plan, user_profile)
                
                # Sheet 2: Weekly Schedules
                self._create_weekly_schedules_sheet(writer, workout_plan)
                
                # Sheet 3: Daily Workouts (Detailed)
                self._create_daily_workouts_sheet(writer, workout_plan)
                
                # Sheet 4: Exercise Details
                self._create_exercise_details_sheet(writer, workout_plan)
                
                # Sheet 5: User Profile
                self._create_user_profile_sheet(writer, user_profile)
                
                # Sheet 6: Generation Details
                self._create_generation_details_sheet(writer, workout_data)
                
                # Sheet 7: Program Justifications
                self._create_justifications_sheet(writer, workout_plan)
            
            logger.info(f"✅ Excel file created successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error creating Excel file: {e}")
            return False

    def _create_overview_sheet(self, writer, workout_plan: WorkoutPlanSchema, user_profile: UserProfileSchema):
        """Create the overview sheet with basic plan information."""
        overview_data = {
            "Property": [
                "Plan Title",
                "Summary",
                "Total Weeks",
                "User Goal",
                "Experience Level",
                "Training Frequency",
                "Session Duration",
                "Equipment",
                "Generated Date",
                "Agent Used"
            ],
            "Value": [
                workout_plan.title,
                workout_plan.summary,
                len(workout_plan.weekly_schedules),
                user_profile.primary_goal,
                user_profile.experience_level,
                f"{user_profile.days_per_week} days/week",
                f"{user_profile.minutes_per_session} minutes",
                user_profile.equipment,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Fitness Coach AI"
            ]
        }
        
        df = pd.DataFrame(overview_data)
        df.to_excel(writer, sheet_name="Overview", index=False)

    def _create_weekly_schedules_sheet(self, writer, workout_plan: WorkoutPlanSchema):
        """Create a sheet with weekly schedule summary."""
        weekly_data = []
        
        for week in workout_plan.weekly_schedules:
            training_days = [day for day in week.daily_workouts if not day.is_rest_day]
            rest_days = [day for day in week.daily_workouts if day.is_rest_day]
            
            weekly_data.append({
                "Week": week.week_number,
                "Training Days": len(training_days),
                "Rest Days": len(rest_days),
                "Total Exercises": sum(len(day.exercises) for day in training_days),
                "Weekly Justification": week.weekly_justification[:200] + "..." if len(week.weekly_justification) > 200 else week.weekly_justification
            })
        
        df = pd.DataFrame(weekly_data)
        df.to_excel(writer, sheet_name="Weekly Schedules", index=False)

    def _create_daily_workouts_sheet(self, writer, workout_plan: WorkoutPlanSchema):
        """Create a detailed sheet with all daily workouts."""
        daily_data = []
        
        for week in workout_plan.weekly_schedules:
            for day in week.daily_workouts:
                if not day.is_rest_day:
                    for exercise in day.exercises:
                        exercise_name = self.get_exercise_name(exercise.exercise_id)
                        daily_data.append({
                            "Week": week.week_number,
                            "Day": day.day_of_week,
                            "Exercise ID": exercise.exercise_id,
                            "Exercise Name": exercise_name,
                            "Sets": exercise.sets,
                            "Reps": str(exercise.reps),
                            "Weight % 1RM": str(exercise.weight_1rm) if isinstance(exercise.weight_1rm, list) else str([exercise.weight_1rm]),
                            "Description": exercise.description
                        })
                else:
                    daily_data.append({
                        "Week": week.week_number,
                        "Day": day.day_of_week,
                        "Exercise ID": "REST",
                        "Exercise Name": "Rest Day",
                        "Sets": 0,
                        "Reps": "N/A",
                        "Weight % 1RM": "N/A",
                        "Description": "Active recovery and rest",
                    })
        
        df = pd.DataFrame(daily_data)
        df.to_excel(writer, sheet_name="Daily Workouts", index=False)

    def _create_exercise_details_sheet(self, writer, workout_plan: WorkoutPlanSchema):
        """Create a sheet with unique exercises and their details."""
        exercise_data = []
        seen_exercises = set()
        
        for week in workout_plan.weekly_schedules:
            for day in week.daily_workouts:
                if not day.is_rest_day:
                    for exercise in day.exercises:
                        exercise_key = f"{exercise.exercise_id}"
                        if exercise_key not in seen_exercises:
                            exercise_name = self.get_exercise_name(exercise.exercise_id)
                            exercise_data.append({
                                "Exercise ID": exercise.exercise_id,
                                "Exercise Name": exercise_name,
                                "Description": exercise.description,
                                "Sets": exercise.sets,
                                "Reps": str(exercise.reps),
                                "Weight % 1RM": str(exercise.weight_1rm) if isinstance(exercise.weight_1rm, list) else str([exercise.weight_1rm]),
                                "Week Used": week.week_number,
                                "Day Used": day.day_of_week
                            })
                            seen_exercises.add(exercise_key)
        
        df = pd.DataFrame(exercise_data)
        df.to_excel(writer, sheet_name="Exercise Details", index=False)

    def _create_user_profile_sheet(self, writer, user_profile: UserProfileSchema):
        """Create a sheet with user profile information."""
        profile_data = {
            "Property": [
                "Primary Goal",
                "Goal Description",
                "Experience Level",
                "Days Per Week",
                "Minutes Per Session",
                "Equipment",
                "Age",
                "Weight",
                "Weight Unit",
                "Height",
                "Height Unit",
                "Gender",
                "Has Limitations",
                "Limitations Description",
                "Final Chat Notes"
            ],
            "Value": [
                user_profile.primary_goal,
                user_profile.primary_goal_description,
                user_profile.experience_level,
                user_profile.days_per_week,
                user_profile.minutes_per_session,
                user_profile.equipment,
                user_profile.age,
                user_profile.weight,
                user_profile.weight_unit,
                user_profile.height,
                user_profile.height_unit,
                user_profile.gender,
                user_profile.has_limitations,
                user_profile.limitations_description,
                user_profile.final_chat_notes
            ]
        }
        
        df = pd.DataFrame(profile_data)
        df.to_excel(writer, sheet_name="User Profile", index=False)

    def _create_generation_details_sheet(self, writer, workout_data: Dict[str, Any]):
        """Create a sheet with generation details and prompt."""
        generation_data = {
            "Property": [
                "Generation Timestamp",
                "Agent Used",
                "RAG Enhancement",
                "Prompt Length",
                "Total Weeks Generated",
                "Total Exercises",
                "Generation Status"
            ],
            "Value": [
                workout_data["generation_timestamp"],
                workout_data["agent_used"],
                workout_data["enrich_with_knowledge"],
                len(workout_data["generation_prompt"]),
                len(workout_data["workout_plan"].weekly_schedules),
                sum(len(day.exercises) for week in workout_data["workout_plan"].weekly_schedules for day in week.daily_workouts if not day.is_rest_day),
                "Success"
            ]
        }
        
        df = pd.DataFrame(generation_data)
        df.to_excel(writer, sheet_name="Generation Details", index=False)
        
        # Add the full prompt as a separate section
        prompt_data = {
            "Generation Prompt": [workout_data["generation_prompt"]]
        }
        prompt_df = pd.DataFrame(prompt_data)
        prompt_df.to_excel(writer, sheet_name="Generation Prompt", index=False)

    def _create_justifications_sheet(self, writer, workout_plan: WorkoutPlanSchema):
        """Create a sheet with all justifications."""
        justification_data = {
            "Level": ["Program"],
            "Justification": [workout_plan.program_justification]
        }
        
        # Add weekly justifications
        for week in workout_plan.weekly_schedules:
            justification_data["Level"].append(f"Week {week.week_number}")
            justification_data["Justification"].append(week.weekly_justification)
        
        # Add daily justifications
        for week in workout_plan.weekly_schedules:
            for day in week.daily_workouts:
                justification_data["Level"].append(f"Week {week.week_number} - {day.day_of_week}")
                justification_data["Justification"].append(day.daily_justification)
        
        df = pd.DataFrame(justification_data)
        df.to_excel(writer, sheet_name="Justifications", index=False)

    def process_workout_generation(self, user_profile_data: Dict[str, Any], 
                                 output_dir: str = "./output",
                                 enrich_with_knowledge: bool = True) -> str:
        """
        Complete workflow: generate workout plan and export to Excel.
        
        Args:
            user_profile_data: User profile data as dictionary
            output_dir: Directory to save the Excel file
            enrich_with_knowledge: Whether to use RAG enhancement
            
        Returns:
            Path to the created Excel file
        """
        try:
            # Create output directory if it doesn't exist
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Create user profile
            user_profile = self.create_user_profile_from_dict(user_profile_data)
            
            # Generate workout plan
            workout_data = self.generate_workout_plan(user_profile, enrich_with_knowledge)
            
            # Create filename
            filename = self.create_excel_filename(user_profile)
            file_path = output_path / filename
            
            # Export to Excel
            success = self.export_to_excel(workout_data, str(file_path))
            
            if success:
                logger.info(f"🎉 Workout plan successfully exported to: {file_path}")
                return str(file_path)
            else:
                raise Exception("Failed to create Excel file")
                
        except Exception as e:
            logger.error(f"❌ Error in workout generation process: {e}")
            raise

def create_sample_user_profiles() -> Dict[str, Dict[str, Any]]:
    """Create sample user profiles for testing."""
    return {
        "beginner_strength": {
            "primary_goal": "Increase Strength",
            "primary_goal_description": "Build a solid foundation and increase overall strength",
            "experience_level": "Beginner",
            "days_per_week": 3,
            "minutes_per_session": 45,
            "equipment": "Full Gym",
            "age": 25,
            "weight": 70.0,
            "weight_unit": "kg",
            "height": 175.0,
            "height_unit": "cm",
            "gender": "Male",
            "has_limitations": False,
            "limitations_description": "",
            "final_chat_notes": "New to strength training, wants to learn proper form"
        },
        "intermediate_hypertrophy": {
            "primary_goal": "Bodybuilding",
            "primary_goal_description": "Focus on muscle growth and aesthetic development",
            "experience_level": "Intermediate",
            "days_per_week": 5,
            "minutes_per_session": 75,
            "equipment": "Full Gym",
            "age": 28,
            "weight": 80.0,
            "weight_unit": "kg",
            "height": 180.0,
            "height_unit": "cm",
            "gender": "Male",
            "has_limitations": False,
            "limitations_description": "",
            "final_chat_notes": "Has been training for 2 years, wants to focus on hypertrophy"
        },
        "advanced_powerlifting": {
            "primary_goal": "Increase Strength",
            "primary_goal_description": "Maximize strength in squat, bench, and deadlift",
            "experience_level": "Advanced",
            "days_per_week": 4,
            "minutes_per_session": 90,
            "equipment": "Full Gym",
            "age": 32,
            "weight": 95.0,
            "weight_unit": "kg",
            "height": 185.0,
            "height_unit": "cm",
            "gender": "Male",
            "has_limitations": False,
            "limitations_description": "",
            "final_chat_notes": "Competitive powerlifter, needs periodized program"
        },
        "beginner_weight_loss": {
            "primary_goal": "Weight Loss",
            "primary_goal_description": "Lose weight and improve overall fitness",
            "experience_level": "Beginner",
            "days_per_week": 3,
            "minutes_per_session": 60,
            "equipment": "Bodyweight",
            "age": 35,
            "weight": 85.0,
            "weight_unit": "kg",
            "height": 165.0,
            "height_unit": "cm",
            "gender": "Female",
            "has_limitations": True,
            "limitations_description": "Lower back issues, avoid heavy lifting",
            "final_chat_notes": "Starting fitness journey, needs beginner-friendly program"
        }
    }

def main():
    """Main function to run the workout plan generator."""
    parser = argparse.ArgumentParser(
        description="Generate workout plans and export to Excel",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate with sample profile
  python generate_workout_plan_excel.py --profile=beginner_strength
  
  # Generate with custom profile
  python generate_workout_plan_excel.py --profile-file=my_profile.json
  
  # Generate without RAG enhancement
  python generate_workout_plan_excel.py --profile=intermediate_hypertrophy --no-rag
  
  # Specify output directory
  python generate_workout_plan_excel.py --profile=advanced_powerlifting --output-dir=./workout_plans
        """
    )
    
    parser.add_argument(
        "--profile",
        choices=["beginner_strength", "intermediate_hypertrophy", "advanced_powerlifting", "beginner_weight_loss"],
        help="Use a predefined sample profile"
    )
    parser.add_argument(
        "--profile-file",
        help="Path to JSON file containing user profile data"
    )
    parser.add_argument(
        "--output-dir",
        default="./output",
        help="Directory to save the Excel file (default: ./output)"
    )
    parser.add_argument(
        "--no-rag",
        action="store_true",
        help="Disable RAG enhancement (faster but less personalized)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        generator = WorkoutPlanExcelGenerator()
        
        # Determine user profile data
        if args.profile:
            sample_profiles = create_sample_user_profiles()
            user_profile_data = sample_profiles[args.profile]
            logger.info(f"Using sample profile: {args.profile}")
            
        elif args.profile_file:
            with open(args.profile_file, 'r') as f:
                user_profile_data = json.load(f)
            logger.info(f"Using profile from file: {args.profile_file}")
            
        else:
            logger.error("Must specify either --profile or --profile-file")
            sys.exit(1)
        
        # Generate workout plan and export to Excel
        excel_path = generator.process_workout_generation(
            user_profile_data=user_profile_data,
            output_dir=args.output_dir,
            enrich_with_knowledge=False
        )
        
        logger.info(f"✅ Success! Workout plan exported to: {excel_path}")
        
    except Exception as e:
        logger.error(f"❌ Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
