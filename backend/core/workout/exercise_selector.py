"""
Exercise Selection Service for EvolveAI

This service handles smart exercise filtering and selection from the database
to provide relevant exercise candidates for workout generation while minimizing
token usage and ensuring exercise authenticity.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ExerciseSelector:
    """Smart exercise selection service for workout generation."""

    def __init__(self):
        """Initialize the exercise selector."""
        self._validate_environment()
        self._initialize_clients()
        logger.info("✅ Exercise Selector initialized")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        required_vars = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
        }

        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

    def _initialize_clients(self):
        """Initialize Supabase client."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    def get_exercise_candidates(
        self,
        muscle_groups: List[str],
        difficulty: str,
        equipment: List[str],
        max_exercises: int = 10,
    ) -> List[Dict]:
        """
        Get exercise candidates using intelligent database queries for variety and balance.

        Args:
            muscle_groups: List of target muscle groups
            difficulty: Target difficulty level
            equipment: List of available equipment
            max_exercises: Maximum number of exercises to return

        Returns:
            List of balanced exercise candidates
        """
        print(f"🔍 Finding exercises: {muscle_groups} + {difficulty} + {equipment}")

        try:
            # Strategy: Get a balanced mix by querying different categories separately
            exercises = []
            
            # 1. Get exercises for each muscle group (ensures muscle balance)
            exercises_per_muscle = max(2, max_exercises // len(muscle_groups))
            
            for muscle in muscle_groups:
                muscle_exercises = self._get_muscle_group_exercises(
                    muscle, difficulty, equipment, exercises_per_muscle
                )
                exercises.extend(muscle_exercises)
            
            # 2. If we don't have enough exercises, get more from the primary muscle group
            if len(exercises) < max_exercises:
                primary_muscle = muscle_groups[0]
                additional_needed = max_exercises - len(exercises)
                additional_exercises = self._get_muscle_group_exercises(
                    primary_muscle, difficulty, equipment, additional_needed
                )
                exercises.extend(additional_exercises)
            
            # 3. Remove duplicates and limit to max_exercises
            unique_exercises = self._remove_duplicates(exercises)
            final_exercises = unique_exercises[:max_exercises]
            
            if not final_exercises:
                print("⚠️  No exercises found matching the criteria")
                return []
            
            print(f"✅ Final selection: {len(final_exercises)} balanced exercises")
            return final_exercises

        except Exception as e:
            print(f"❌ Error finding exercises: {e}")
            print("💡 Check your database connection and exercise data")
            return []

    def _get_muscle_group_exercises(
        self,
        muscle: str,
        difficulty: str,
        equipment: List[str],
        count: int
    ) -> List[Dict]:
        """Get exercises for a specific muscle group with variety in equipment and force types."""
        try:
            # Build query for this muscle group
            query = self.supabase.table("exercises").select("*")
            query = query.eq("difficulty", difficulty)
            query = query.eq("main_muscle", muscle)
            
            # Handle equipment filtering
            if equipment and equipment[0] == "Full Gym":
                # Full gym - no equipment filtering needed
                pass
            elif equipment and equipment[0] == "Home Gym":
                home_equipment = ["Barbell", "Dumbbell", "Body Weight", "Weighted", "Assisted", "Self-assisted"]
                query = query.in_("equipment", home_equipment)
            elif equipment and equipment[0] == "Dumbbells Only":
                query = query.in_("equipment", ["Dumbbell", "Body Weight"])
            elif equipment and equipment[0] == "Bodyweight Only":
                query = query.eq("equipment", "Body Weight")
            elif equipment:
                query = query.eq("equipment", equipment[0])
            
            # Get more exercises than needed to allow for variety selection
            query = query.limit(count * 2)
            result = query.execute()
            
            if not result.data:
                return []
            
            # Select exercises with variety in equipment and force types
            return self._select_varied_exercises(result.data, count)
            
        except Exception as e:
            print(f"❌ Error getting exercises for {muscle}: {e}")
            return []

    def _select_varied_exercises(self, exercises: List[Dict], target_count: int) -> List[Dict]:
        """Select exercises with variety in equipment and force types, allowing some overlap."""
        if len(exercises) <= target_count:
            return exercises
        
        # Group exercises by equipment and force for variety
        equipment_groups = {}
        force_groups = {}
        
        for exercise in exercises:
            equipment = exercise.get("equipment", "")
            force = exercise.get("force", "Unknown")
            
            if equipment not in equipment_groups:
                equipment_groups[equipment] = []
            equipment_groups[equipment].append(exercise)
            
            if force not in force_groups:
                force_groups[force] = []
            force_groups[force].append(exercise)
        
        # Select exercises ensuring variety but allowing some overlap
        selected = []
        equipment_counts = {}  # Track how many from each equipment type
        force_used = set()
        
        # Calculate target distribution (allow some overlap)
        max_per_equipment = max(2, target_count // len(equipment_groups)) if equipment_groups else 1
        
        # First pass: get exercises ensuring no equipment dominates too much
        for equipment_type, eq_exercises in equipment_groups.items():
            # Allow up to max_per_equipment from each equipment type
            equipment_counts[equipment_type] = 0
            for exercise in eq_exercises:
                if (len(selected) < target_count and 
                    equipment_counts[equipment_type] < max_per_equipment):
                    selected.append(exercise)
                    equipment_counts[equipment_type] += 1
        
        # Second pass: try to get variety in force types
        for force_type, force_exercises in force_groups.items():
            if len(selected) < target_count and force_type not in force_used:
                # Find an exercise with this force type that we haven't selected yet
                for exercise in force_exercises:
                    if exercise not in selected:
                        selected.append(exercise)
                        force_used.add(force_type)
                        break
        
        # Fill remaining slots with any available exercises
        for exercise in exercises:
            if len(selected) >= target_count:
                break
            if exercise not in selected:
                selected.append(exercise)
        
        return selected[:target_count]

    def _remove_duplicates(self, exercises: List[Dict]) -> List[Dict]:
        """Remove duplicate exercises based on name and main characteristics."""
        seen = set()
        unique_exercises = []
        
        for exercise in exercises:
            # Create a unique identifier for this exercise
            exercise_key = (
                exercise.get("name", ""),
                exercise.get("main_muscle", ""),
                exercise.get("equipment", "")
            )
            
            if exercise_key not in seen:
                seen.add(exercise_key)
                unique_exercises.append(exercise)
        
        return unique_exercises

    def get_exercise_by_id(self, exercise_id: str) -> Optional[Dict[str, Any]]:
        """Get full exercise details by ID."""
        try:
            response = (
                self.supabase.table("exercises")
                .select("*")
                .eq("id", exercise_id)
                .execute()
            )

            if response.data:
                return response.data[0]
            else:
                logger.warning(f"Exercise with ID {exercise_id} not found")
                return None

        except Exception as e:
            logger.error(f"Error fetching exercise {exercise_id}: {e}")
            return None

    def validate_exercise_ids(
        self, exercise_ids: List[str]
    ) -> Tuple[List[str], List[str]]:
        """
        Validate exercise IDs and return valid and invalid ones.

        Args:
            exercise_ids: List of exercise IDs to validate

        Returns:
            Tuple of (valid_ids, invalid_ids)
        """
        valid_ids = []
        invalid_ids = []

        for exercise_id in exercise_ids:
            exercise = self.get_exercise_by_id(exercise_id)
            if exercise:
                valid_ids.append(exercise_id)
            else:
                invalid_ids.append(exercise_id)

        return valid_ids, invalid_ids

    def get_exercise_summary(self, exercise_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Get exercise summaries for prompt generation.

        Args:
            exercise_ids: List of exercise IDs

        Returns:
            List of exercise summaries with minimal data
        """
        try:
            response = (
                self.supabase.table("exercises")
                .select("id, name, difficulty, equipment, main_muscle, force")
                .in_("id", exercise_ids)
                .execute()
            )

            if not response.data:
                return []

            # Convert to summary format
            summaries = []
            for exercise in response.data:
                summary = {
                    "id": exercise["id"],
                    "name": exercise["name"],
                    "difficulty": exercise["difficulty"],
                    "equipment": exercise["equipment"],
                    "main_muscle": exercise["main_muscle"],
                    "force": exercise.get("force", "Unknown"),
                }
                summaries.append(summary)

            return summaries

        except Exception as e:
            logger.error(f"Error getting exercise summaries: {e}")
            return []

    def get_muscle_group_exercises(
        self, muscle_group: str, difficulty: str = None, equipment: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get exercises for a specific muscle group with optional filtering.

        Args:
            muscle_group: Target muscle group
            difficulty: Optional difficulty filter
            equipment: Optional equipment filter

        Returns:
            List of relevant exercises
        """
        return self.get_exercise_candidates(
            muscle_groups=[muscle_group],
            difficulty=difficulty,
            equipment=equipment,
            max_exercises=20,
        )

    def get_workout_exercises(
        self,
        workout_type: str,
        muscle_groups: List[str],
        difficulty: str,
        equipment: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Get exercises suitable for a specific workout type.

        Args:
            workout_type: Type of workout ('strength', 'cardio', 'flexibility', etc.)
            muscle_groups: Target muscle groups
            difficulty: Difficulty level
            equipment: Available equipment

        Returns:
            List of suitable exercises
        """
        # Get base candidates
        candidates = self.get_exercise_candidates(
            muscle_groups=muscle_groups,
            difficulty=difficulty,
            equipment=equipment,
            max_exercises=25,
        )

        # Apply workout type specific filtering
        if workout_type == "strength":
            # Strength training benefits from all movement patterns
            # Keep all exercises (no filtering by force type)
            pass
        elif workout_type == "cardio":
            # Prefer bodyweight exercises for cardio
            candidates = [
                ex for ex in candidates if "Body Weight" in ex.get("equipment", "")
            ]
        elif workout_type == "flexibility":
            # Prefer exercises that target multiple muscle groups
            candidates = [
                ex for ex in candidates if len(ex.get("secondary_muscles", [])) > 0
            ]

        return candidates[:15]  # Return top 15 after filtering

    def inspect_database_schema(self) -> Dict[str, Any]:
        """
        Inspect the database schema to understand the actual data structure.

        Returns:
            Dictionary with schema information
        """
        try:
            print("🔍 DEBUG: Inspecting database schema...")

            # Get a sample of exercises to understand the structure
            sample_response = (
                self.supabase.table("exercises").select("*").limit(5).execute()
            )

            if not sample_response.data:
                print("⚠️  No exercises found in database")
                return {}

            print(f"🔍 DEBUG: Found {len(sample_response.data)} sample exercises")

            # Analyze the first exercise
            first_exercise = sample_response.data[0]
            print(f"🔍 DEBUG: Sample exercise structure:")
            for key, value in first_exercise.items():
                print(f"   {key}: {type(value).__name__} = {repr(value)}")

            # Get unique values for key fields
            schema_info = {}

            # Check main muscle groups
            muscle_response = (
                self.supabase.table("exercises").select("main_muscle").execute()
            )
            if muscle_response.data:
                unique_muscles = list(
                    set(
                        [
                            ex.get("main_muscle", "")
                            for ex in muscle_response.data
                            if ex.get("main_muscle")
                        ]
                    )
                )
                schema_info["main_muscles"] = sorted(unique_muscles)
                print(f"🔍 DEBUG: Unique main muscles: {schema_info['main_muscles']}")

            # Check equipment types
            equipment_response = (
                self.supabase.table("exercises").select("equipment").execute()
            )
            if equipment_response.data:
                unique_equipment = list(
                    set(
                        [
                            ex.get("equipment", "")
                            for ex in equipment_response.data
                            if ex.get("equipment")
                        ]
                    )
                )
                schema_info["equipment_types"] = sorted(unique_equipment)
                print(
                    f"🔍 DEBUG: Unique equipment types: {schema_info['equipment_types']}"
                )

            # Check difficulty levels
            difficulty_response = (
                self.supabase.table("exercises").select("difficulty").execute()
            )
            if difficulty_response.data:
                unique_difficulties = list(
                    set(
                        [
                            ex.get("difficulty", "")
                            for ex in difficulty_response.data
                            if ex.get("difficulty")
                        ]
                    )
                )
                schema_info["difficulty_levels"] = sorted(unique_difficulties)
                print(
                    f"🔍 DEBUG: Unique difficulty levels: {schema_info['difficulty_levels']}"
                )

            return schema_info

        except Exception as e:
            print(f"❌ Error inspecting database schema: {e}")
            import traceback

            traceback.print_exc()
            return {}
