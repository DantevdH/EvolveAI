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
        Get exercise candidates using a hybrid tier-based approach for optimal exercise selection.
        
        This method implements a smart selection strategy that ensures workout quality and variety:
        
        **Selection Strategy:**
        1. **Foundational Tier (50% of exercises)**: Core, essential exercises that form the workout foundation.
           These are exercises like squats, deadlifts, push-ups, pull-ups - the building blocks of fitness.
           
        2. **Variety Tier (50% of exercises)**: Additional exercises selected by popularity score to add variety
           and prevent workout monotony while maintaining quality.
        
        **Benefits of This Approach:**
        - **Quality Assurance**: Foundational exercises ensure every workout has solid, proven movements
        - **Variety**: Popular variety exercises prevent boredom and provide progression options
        - **Balance**: Consistent muscle group targeting across different workout types
        - **Efficiency**: Popularity scoring ensures variety exercises are well-known and effective
        
        **Tier Definitions:**
        - **foundational**: Essential exercises everyone should know (squats, deadlifts, etc.)
        - **standard**: Common, reliable exercises (lunges, rows, etc.)  
        - **variety**: Specialized or advanced exercises (Bulgarian split squats, etc.)
        
        **Popularity Score Usage:**
        - Scores range from 0.0 (obscure) to 1.0 (essential)
        - Higher scores = more popular, well-known exercises
        - Used to prioritize variety exercises when multiple options exist

        Args:
            muscle_groups: List of target muscle groups
            difficulty: Target difficulty level
            equipment: List of available equipment
            max_exercises: Maximum number of exercises to return

        Returns:
            List of balanced exercise candidates with foundational + variety mix
        """
        print(f"🔍 Finding exercises: {muscle_groups} + {difficulty} + {equipment}")

        try:
            # Calculate exercise distribution based on tiers
            foundational_count = max(1, max_exercises // 2)  # 50% foundational
            variety_count = max_exercises - foundational_count  # Remaining for variety
            
            print(f"📊 Target distribution: {foundational_count} foundational + {variety_count} variety")
            
            # 1. Get foundational exercises (core, essential movements)
            foundational_exercises = self._get_tier_exercises(
                muscle_groups, difficulty, equipment, 'foundational', foundational_count
            )
            
            print(f"✅ Found {len(foundational_exercises)} foundational exercises")
            
            # 2. Get variety exercises (additional movements for variety)
            # Get more variety exercises than needed to allow for popularity-based selection
            variety_pool_size = variety_count * 2
            variety_pool = self._get_tier_exercises(
                muscle_groups, difficulty, equipment, 'variety', variety_pool_size
            )
            
            # Sort variety exercises by popularity score and select the best ones
            variety_exercises = self._select_best_variety_exercises(variety_pool, variety_count)
            
            print(f"✅ Selected {len(variety_exercises)} variety exercises (from {len(variety_pool)} candidates)")
            
            # 3. Combine and ensure muscle group balance
            all_exercises = foundational_exercises + variety_exercises
            
            # 4. Remove duplicates and ensure we don't exceed max_exercises
            unique_exercises = self._remove_duplicates(all_exercises)
            final_exercises = unique_exercises[:max_exercises]
            
            if not final_exercises:
                print("⚠️  No exercises found matching the criteria")
                return []
            
            # 5. Log the final selection breakdown
            foundational_final = [ex for ex in final_exercises if ex.get('exercise_tier') == 'foundational']
            variety_final = [ex for ex in final_exercises if ex.get('exercise_tier') == 'variety']
            
            print(f"✅ Final selection: {len(final_exercises)} exercises")
            print(f"   📚 Foundational: {len(foundational_final)} exercises")
            print(f"   🌟 Variety: {len(variety_final)} exercises")
            
            return final_exercises

        except Exception as e:
            print(f"❌ Error finding exercises: {e}")
            print("💡 Check your database connection and exercise data")
            return []



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

    def _get_tier_exercises(
        self,
        muscle_groups: List[str],
        difficulty: str,
        equipment: List[str],
        tier: str,
        count: int
    ) -> List[Dict]:
        """
        Get exercises for a specific tier (foundational, standard, or variety).
        
        Args:
            muscle_groups: List of target muscle groups
            difficulty: Target difficulty level
            equipment: List of available equipment
            tier: Exercise tier ('foundational', 'standard', 'variety')
            count: Number of exercises to return
            
        Returns:
            List of exercises for the specified tier
        """
        try:
            exercises = []
            
            # Get exercises for each muscle group to ensure balance
            exercises_per_muscle = max(1, count // len(muscle_groups))
            
            for muscle in muscle_groups:
                muscle_exercises = self._get_muscle_group_tier_exercises(
                    muscle, difficulty, equipment, tier, exercises_per_muscle
                )
                exercises.extend(muscle_exercises)
            
            # If we don't have enough exercises, get more from the primary muscle group
            if len(exercises) < count:
                primary_muscle = muscle_groups[0]
                additional_needed = count - len(exercises)
                additional_exercises = self._get_muscle_group_tier_exercises(
                    primary_muscle, difficulty, equipment, tier, additional_needed
                )
                exercises.extend(additional_exercises)
            
            return exercises[:count]
            
        except Exception as e:
            print(f"❌ Error getting {tier} exercises: {e}")
            return []

    def _get_muscle_group_tier_exercises(
        self,
        muscle: str,
        difficulty: str,
        equipment: List[str],
        tier: str,
        count: int
    ) -> List[Dict]:
        """Get exercises for a specific muscle group and tier."""
        try:
            # Build query for this muscle group and tier
            query = self.supabase.table("exercises").select("*")
            query = query.eq("difficulty", difficulty)
            query = query.eq("main_muscle", muscle)
            query = query.eq("exercise_tier", tier)
            
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
            
            # Order by popularity score for better quality selection
            query = query.order("popularity_score", desc=True)
            
            # Get more exercises than needed to allow for variety selection
            query = query.limit(count * 2)
            result = query.execute()
            
            if not result.data:
                return []
            
            # Select exercises with variety in equipment and force types
            return self._select_varied_exercises(result.data, count)
            
        except Exception as e:
            print(f"❌ Error getting {tier} exercises for {muscle}: {e}")
            return []

    def _select_best_variety_exercises(self, variety_pool: List[Dict], target_count: int) -> List[Dict]:
        """
        Select the best variety exercises based on popularity score and variety factors.
        
        Args:
            variety_pool: Pool of variety exercises to choose from
            target_count: Number of exercises to select
            
        Returns:
            Best variety exercises selected by popularity and variety
        """
        if len(variety_pool) <= target_count:
            return variety_pool
        
        # Sort by popularity score first (higher is better)
        sorted_by_popularity = sorted(
            variety_pool, 
            key=lambda x: x.get('popularity_score', 0.5), 
            reverse=True
        )
        
        # Take the top exercises by popularity
        top_exercises = sorted_by_popularity[:target_count]
        
        # Ensure variety in equipment types
        selected_equipment = set()
        final_selection = []
        
        for exercise in top_exercises:
            equipment = exercise.get('equipment', '')
            
            # If we already have this equipment type, skip unless it's very popular
            if equipment in selected_equipment:
                popularity = exercise.get('popularity_score', 0.5)
                if popularity < 0.7:  # Only allow duplicates for very popular exercises
                    continue
            
            selected_equipment.add(equipment)
            final_selection.append(exercise)
            
            if len(final_selection) >= target_count:
                break
        
        # If we still need more exercises, fill with remaining top popularity
        if len(final_selection) < target_count:
            remaining = [ex for ex in top_exercises if ex not in final_selection]
            final_selection.extend(remaining[:target_count - len(final_selection)])
        
        return final_selection