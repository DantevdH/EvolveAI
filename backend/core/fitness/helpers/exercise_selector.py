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
        max_exercises: int,
        muscle_groups: List[str],
        difficulty: str,
        equipment: List[str]
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
            # Calculate exercise distribution based on tiers - 40/40/20 approach
            # Use the actual max_exercises parameter, not hardcoded 100
            foundational_count = max(2, int(max_exercises * 0.4))  # 40% of max_exercises
            standard_count = max(2, int(max_exercises * 0.4))     # 40% of max_exercises
            variety_count = max_exercises - foundational_count - standard_count  # Remaining for variety
            
            print(f"📊 Distribution calculation: {max_exercises} total exercises")
            print(f"   📚 Foundational: {foundational_count} (40% of {max_exercises})")
            print(f"   🔧 Standard: {standard_count} (40% of {max_exercises})")
            print(f"   🌟 Variety: {variety_count} (remaining: {max_exercises - foundational_count - standard_count})")
            
            print(f"📊 Target distribution: {foundational_count} foundational + {standard_count} standard + {variety_count} variety")
            
            # 1. Get foundational exercises (core, essential movements)
            #TODO: always provide ALL foundational exercises
            foundational_exercises = self._get_tier_exercises(
                muscle_groups, difficulty, equipment, 'foundational', foundational_count
            )
            
            
            print(f"✅ Found {len(foundational_exercises)} foundational exercises (target: {foundational_count})")
            
            # 2. Get standard exercises (common, reliable movements)
            standard_exercises = self._get_tier_exercises(
                muscle_groups, difficulty, equipment, 'standard', standard_count
            )
            
            print(f"✅ Found {len(standard_exercises)} standard exercises (target: {standard_count})")
            
            # 3. Get variety exercises (additional movements for variety)
            # Get more variety exercises than needed to allow for popularity-based selection
            variety_exercises = self._get_tier_exercises(
                muscle_groups, difficulty, equipment, 'variety', variety_count
            )
            
            # # Sort variety exercises by popularity score and select the best ones
            # variety_exercises = self._select_best_variety_exercises(variety_pool, variety_count)
            
            print(f"✅ Selected {len(variety_exercises)} variety exercises candidates)")
            
            # 4. Combine and ensure muscle group balance
            all_exercises = foundational_exercises + standard_exercises + variety_exercises
            print(f"📊 Combined exercises: {len(all_exercises)} total")
            
            # 5. Remove duplicates and ensure we don't exceed max_exercises
            unique_exercises = self._remove_duplicates(all_exercises)
            print(f"🔍 After deduplication: {len(unique_exercises)} unique exercises")
            final_exercises = unique_exercises[:max_exercises]
            print(f"📏 Final selection: {len(final_exercises)} exercises (max: {max_exercises})")
            
            if not final_exercises:
                print("⚠️  No exercises found matching the criteria")
                return []
            
            # 5. Log the final selection breakdown
            foundational_final = [ex for ex in final_exercises if ex.get('exercise_tier') == 'foundational']
            standard_final = [ex for ex in final_exercises if ex.get('exercise_tier') == 'standard']
            variety_final = [ex for ex in final_exercises if ex.get('exercise_tier') == 'variety']
            
            print(f"✅ Final selection: {len(final_exercises)} exercises")
            print(f"   📚 Foundational: {len(foundational_final)} exercises")
            print(f"   🔧 Standard: {len(standard_final)} exercises")
            print(f"   🌟 Variety: {len(variety_final)} exercises")
            
            return final_exercises

        except Exception as e:
            print(f"❌ Error finding exercises: {e}")
            print("💡 Check your database connection and exercise data")
            return []



    def _remove_duplicates(self, exercises: List[Dict]) -> List[Dict]:
        """Remove duplicates based on exercise name to prevent functionally identical exercises in same workout."""
        seen = set()
        unique_exercises = []
        
        for exercise in exercises:
            # Create a unique identifier based ONLY on the base exercise name
            # This prevents functionally identical exercises like "Calf Extension (plate)" vs "Calf Extension (selectorized)"
            base_name = exercise.get("name", "").lower().strip()
            
            # Skip duplicates based on base exercise name only
            if base_name not in seen:
                seen.add(base_name)
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

    def _get_tier_exercises(
        self,
        muscle_groups: List[str],
        difficulty: str,
        equipment: List[str],
        tier: str,
        count: int
    ) -> List[Dict]:
        """
        Get exercises for a specific tier using optimized hierarchical muscle targeting.
        
        Uses batch queries to minimize database round trips and improve performance.
        
        Args:
            muscle_groups: List of target areas (e.g., ["Thighs", "Chest"])
            difficulty: Target difficulty level
            equipment: List of available equipment
            tier: Exercise tier ('foundational', 'standard', 'variety')
            count: Number of exercises to return
            
        Returns:
            List of exercises for the specified tier with balanced muscle targeting
        """
        try:
            # Step 1: Batch discover all main_muscles for all target_areas
            all_main_muscles = self._batch_get_main_muscles_for_target_areas(muscle_groups)
            
            if not all_main_muscles:
                print(f"      ⚠️ No main_muscles found for target areas: {muscle_groups}")
                return []
            
            print(f"      📋 Discovered main_muscles: {all_main_muscles}")
            
            # Step 2: Batch get exercises for all main_muscles at once
            all_exercises = self._batch_get_exercises_for_main_muscles(
                all_main_muscles, difficulty, equipment, tier, count
            )
            
            if not all_exercises:
                print(f"      ⚠️ No exercises found for main_muscles: {all_main_muscles}")
                return []
            
            # Step 3: Distribute exercises across muscles for balance
            balanced_exercises = self._balance_exercises_across_muscles(
                all_exercises, all_main_muscles, count
            )
            
            return balanced_exercises[:count]
            
        except Exception as e:
            print(f"❌ Error getting {tier} exercises: {e}")
            return []

    def _batch_get_main_muscles_for_target_areas(self, target_areas: List[str]) -> List[str]:
        """
        Batch discover all main_muscles for multiple target_areas in a single query.
        
        This optimization reduces database round trips from N queries to 1 query.
        
        Args:
            target_areas: List of target areas (e.g., ["Thighs", "Chest"])
            
        Returns:
            List of all unique main_muscles across all target areas
        """
        try:
            if not target_areas:
                return []
            
            print(f"      🔍 Batch discovering main_muscles for: {target_areas}")
            
            # Single query to get main_muscles for all target_areas
            query = (
                self.supabase.table("exercises")
                .select("main_muscles, target_area")
                .in_("target_area", target_areas)
                .not_.is_("main_muscles", "null")
            )
            
            result = query.execute()
            
            if not result.data:
                print(f"      ⚠️ No exercises found for any target_areas: {target_areas}")
                return []
            
            # Extract and deduplicate main_muscles across all target_areas
            main_muscles_set = set()
            target_muscle_map = {}  # Track which muscles belong to which target area
            
            for exercise in result.data:
                target_area = exercise.get('target_area')
                main_muscles = exercise.get('main_muscles')
                
                if main_muscles:
                    if isinstance(main_muscles, list):
                        main_muscles_set.update(main_muscles)
                        for muscle in main_muscles:
                            if target_area not in target_muscle_map:
                                target_muscle_map[target_area] = set()
                            target_muscle_map[target_area].add(muscle)
                    elif isinstance(main_muscles, str):
                        main_muscles_set.add(main_muscles)
                        if target_area not in target_muscle_map:
                            target_muscle_map[target_area] = set()
                        target_muscle_map[target_area].add(main_muscles)
            
            main_muscles_list = list(main_muscles_set)
            
            # Log the mapping for debugging
            for target_area, muscles in target_muscle_map.items():
                print(f"        📋 {target_area} → {list(muscles)}")
            
            print(f"      ✅ Found {len(main_muscles_list)} unique main_muscles: {main_muscles_list}")
            return main_muscles_list
            
        except Exception as e:
            print(f"❌ Error batch discovering main_muscles: {e}")
            # Fallback to individual queries
            return self._fallback_get_main_muscles(target_areas)

    def _fallback_get_main_muscles(self, target_areas: List[str]) -> List[str]:
        """Fallback to individual queries if batch fails."""
        all_muscles = []
        for target_area in target_areas:
            muscles = self._get_main_muscles_for_target_area(target_area)
            all_muscles.extend(muscles)
        return list(set(all_muscles))  # Deduplicate

    def _batch_get_exercises_for_main_muscles(
        self,
        main_muscles: List[str],
        difficulty: str,
        equipment: List[str],
        tier: str,
        target_count: int
    ) -> List[Dict]:
        """
        Batch get exercises for multiple main_muscles in a single optimized query.
        
        This optimization reduces database round trips from N muscle queries to 1 query.
        
        Args:
            main_muscles: List of main muscle groups
            difficulty: Target difficulty level
            equipment: List of available equipment
            tier: Exercise tier
            target_count: Target number of exercises (used for limit calculation)
            
        Returns:
            List of exercises across all main_muscles
        """
        try:
            if not main_muscles:
                return []
            
            print(f"      🔍 Batch getting {tier} exercises for muscles: {main_muscles}")
            
            # Build optimized query for all main_muscles at once
            query = self.supabase.table("exercises").select("*")
            
            # Progressive difficulty filtering
            if difficulty.lower() == "beginner":
                query = query.eq("difficulty", "Beginner")
            elif difficulty.lower() == "intermediate":
                query = query.in_("difficulty", ["Beginner", "Intermediate"])
            elif difficulty.lower() == "advanced":
                query = query.in_("difficulty", ["Beginner", "Intermediate", "Advanced"])
            else:
                query = query.eq("difficulty", difficulty)
            
            # Filter by tier
            query = query.eq("exercise_tier", tier)
            
            # Filter by main_muscles - get exercises that target any of the specified muscles
            # We'll use multiple queries and combine results for better compatibility
            if len(main_muscles) == 1:
                query = query.contains("main_muscles", [main_muscles[0]])
            else:
                # For multiple muscles, we need to make separate queries and combine
                # This is more reliable than complex OR conditions
                print(f"        🔍 Using multiple queries for {len(main_muscles)} muscles")
                all_muscle_exercises = []
                
                for muscle in main_muscles:
                    muscle_query = self.supabase.table("exercises").select("*")
                    
                    # Apply same filters as main query
                    if difficulty.lower() == "beginner":
                        muscle_query = muscle_query.eq("difficulty", "Beginner")
                    elif difficulty.lower() == "intermediate":
                        muscle_query = muscle_query.in_("difficulty", ["Beginner", "Intermediate"])
                    elif difficulty.lower() == "advanced":
                        muscle_query = muscle_query.in_("difficulty", ["Beginner", "Intermediate", "Advanced"])
                    else:
                        muscle_query = muscle_query.eq("difficulty", difficulty)
                    
                    muscle_query = muscle_query.eq("exercise_tier", tier)
                    muscle_query = muscle_query.contains("main_muscles", [muscle])
                    muscle_query = self._apply_equipment_filter(muscle_query, equipment, difficulty)
                    muscle_query = muscle_query.order("popularity_score", desc=True)
                    muscle_query = muscle_query.limit(target_count)  # Limit per muscle
                    
                    muscle_result = muscle_query.execute()
                    if muscle_result.data:
                        all_muscle_exercises.extend(muscle_result.data)
                
                # Remove duplicates and return combined results
                seen_ids = set()
                unique_exercises = []
                for exercise in all_muscle_exercises:
                    exercise_id = exercise.get('id')
                    if exercise_id not in seen_ids:
                        seen_ids.add(exercise_id)
                        unique_exercises.append(exercise)
                
                cleaned_exercises = self._clean_exercise_data(unique_exercises)
                print(f"      ✅ Combined {len(cleaned_exercises)} unique exercises from {len(main_muscles)} muscles")
                return cleaned_exercises
            
            # Single muscle case - continue with single query
            # Equipment filtering
            query = self._apply_equipment_filter(query, equipment, difficulty)
            
            # Order by popularity and limit results
            query = query.order("popularity_score", desc=True)
            # Get extra exercises to allow for better distribution
            query = query.limit(target_count * 2)
            
            result = query.execute()
            
            if not result.data:
                print(f"      ⚠️ No {tier} exercises found for muscle: {main_muscles[0]}")
                return []
            
            print(f"      ✅ Found {len(result.data)} {tier} exercises for {main_muscles[0]}")
            
            # Clean and return exercises
            cleaned_exercises = self._clean_exercise_data(result.data)
            return cleaned_exercises
            
        except Exception as e:
            print(f"❌ Error in batch query, falling back to individual queries: {e}")
            # Fallback to individual muscle queries
            return self._fallback_get_exercises_for_muscles(
                main_muscles, difficulty, equipment, tier, target_count
            )

    def _fallback_get_exercises_for_muscles(
        self,
        main_muscles: List[str],
        difficulty: str,
        equipment: List[str],
        tier: str,
        target_count: int
    ) -> List[Dict]:
        """Fallback to individual queries if batch fails."""
        all_exercises = []
        exercises_per_muscle = max(1, target_count // len(main_muscles))
        
        for muscle in main_muscles:
            muscle_exercises = self._get_main_muscle_tier_exercises(
                muscle, difficulty, equipment, tier, exercises_per_muscle
            )
            all_exercises.extend(muscle_exercises)
        
        return all_exercises

    def _balance_exercises_across_muscles(
        self,
        exercises: List[Dict],
        main_muscles: List[str],
        target_count: int
    ) -> List[Dict]:
        """
        Intelligently balance exercises across different muscle groups.
        
        Ensures fair representation of all muscle groups rather than
        just taking the first N exercises which might be biased.
        
        Args:
            exercises: List of all available exercises
            main_muscles: List of main muscle groups to balance
            target_count: Target number of exercises to return
            
        Returns:
            Balanced list of exercises across muscle groups
        """
        try:
            if not exercises or not main_muscles:
                return exercises
            
            print(f"      ⚖️ Balancing {len(exercises)} exercises across {len(main_muscles)} muscles")
            
            # Group exercises by their main_muscles
            muscle_exercise_map = {}
            for exercise in exercises:
                exercise_main_muscles = exercise.get('main_muscles', [])
                if isinstance(exercise_main_muscles, str):
                    exercise_main_muscles = [exercise_main_muscles]
                
                # Assign exercise to the first matching muscle group
                for muscle in main_muscles:
                    if muscle in exercise_main_muscles:
                        if muscle not in muscle_exercise_map:
                            muscle_exercise_map[muscle] = []
                        muscle_exercise_map[muscle].append(exercise)
                        break  # Only assign to first matching muscle to avoid duplicates
            
            # Calculate target exercises per muscle
            exercises_per_muscle = max(1, target_count // len(main_muscles))
            remainder = target_count % len(main_muscles)
            
            balanced_exercises = []
            
            # Distribute exercises fairly across muscles
            for i, muscle in enumerate(main_muscles):
                muscle_exercises = muscle_exercise_map.get(muscle, [])
                
                # Give remainder exercises to first few muscle groups
                muscle_count = exercises_per_muscle + (1 if i < remainder else 0)
                
                # Take up to muscle_count exercises for this muscle
                selected = muscle_exercises[:muscle_count]
                balanced_exercises.extend(selected)
                
                print(f"        💪 {muscle}: {len(selected)}/{len(muscle_exercises)} exercises")
            
            print(f"      ✅ Balanced selection: {len(balanced_exercises)} exercises")
            return balanced_exercises
            
        except Exception as e:
            print(f"❌ Error balancing exercises: {e}")
            return exercises[:target_count]

    def _apply_equipment_filter(self, query, equipment: List[str], difficulty: str = "Beginner"):
        """Apply equipment filtering to query with difficulty-based exclusions."""
        
        # Equipment to exclude for ALL difficulty levels
        always_excluded = [
            "Band Resistive", "Band-assisted", "Self-assisted", 
            "Sled", "Sled (plate loaded)", "Sled (selectorized)"
        ]
        
        # Additional equipment to exclude for intermediate and advanced
        advanced_excluded = ["Body Weight"] if difficulty.lower() in ["intermediate", "advanced"] else []
        
        # Combine all exclusions
        all_excluded = always_excluded + advanced_excluded
        
        # Apply exclusions to the query
        if all_excluded:
            for excluded_equipment in all_excluded:
                query = query.neq("equipment", excluded_equipment)
        
        # Apply user's equipment preferences
        if equipment and equipment[0] == "Full Gym":
            # Full gym - no additional equipment filtering needed (exclusions already applied)
            pass
        elif equipment and equipment[0] == "Home Gym":
            home_equipment = ["Barbell", "Dumbbell", "Body Weight", "Weighted", "Assisted"]
            # Filter out excluded equipment from home gym options
            home_equipment = [eq for eq in home_equipment if eq not in all_excluded]
            if home_equipment:  # Only apply filter if we have valid equipment left
                query = query.in_("equipment", home_equipment)
        elif equipment and equipment[0] == "Dumbbells Only":
            dumbbell_equipment = ["Dumbbell"]
            # Only include Body Weight if it's not excluded for this difficulty level
            if "Body Weight" not in all_excluded:
                dumbbell_equipment.append("Body Weight")
            query = query.in_("equipment", dumbbell_equipment)
        elif equipment and equipment[0] == "Bodyweight Only":
            # Only allow Body Weight if it's not excluded for this difficulty level
            if "Body Weight" not in all_excluded:
                query = query.eq("equipment", "Body Weight")
            else:
                # If Body Weight is excluded, return empty result
                query = query.eq("id", -1)  # Force no results
        elif equipment:
            # For specific equipment, only apply if it's not in excluded list
            if equipment[0] not in all_excluded:
                query = query.eq("equipment", equipment[0])
            else:
                # If requested equipment is excluded, return empty result
                query = query.eq("id", -1)  # Force no results
        
        return query

    def _get_main_muscles_for_target_area(self, target_area: str) -> List[str]:
        """
        Discover all main_muscles that belong to a specific target_area.
        
        For example:
        - target_area "Thighs" might contain main_muscles: ["Quadriceps", "Hamstrings", "Glutes"]
        - target_area "Chest" might contain main_muscles: ["Chest"]
        
        Args:
            target_area: The broad muscle area (e.g., "Thighs", "Chest")
            
        Returns:
            List of specific main_muscles within that target area
        """
        try:
            # Query the database to find all unique main_muscles for this target_area
            query = (
                self.supabase.table("exercises")
                .select("main_muscles")
                .eq("target_area", target_area)
                .not_.is_("main_muscles", "null")  # Only get exercises with main_muscles defined
            )
            
            result = query.execute()
            
            if not result.data:
                print(f"      ⚠️ No exercises found for target_area: {target_area}")
                return []
            
            # Extract and deduplicate main_muscles
            main_muscles_set = set()
            for exercise in result.data:
                main_muscles = exercise.get('main_muscles')
                if main_muscles:
                    if isinstance(main_muscles, list):
                        main_muscles_set.update(main_muscles)
                    elif isinstance(main_muscles, str):
                        main_muscles_set.add(main_muscles)
            
            main_muscles_list = list(main_muscles_set)
            print(f"      ✅ Found {len(main_muscles_list)} main_muscles for {target_area}: {main_muscles_list}")
            return main_muscles_list
            
        except Exception as e:
            print(f"❌ Error discovering main_muscles for {target_area}: {e}")
            # Fallback: return the target_area itself
            return [target_area]

    def _get_main_muscle_tier_exercises(
        self,
        target_muscle: str,
        difficulty: str,
        equipment: List[str],
        tier: str,
        count: int
    ) -> List[Dict]:
        """
        Get exercises for a specific main muscle and tier.
        
        This method targets exercises based on main_muscles field for more precise muscle targeting.
        For example, when requesting 'Quadriceps' exercises, it will specifically find exercises
        where main_muscles contains 'Quadriceps', ensuring proper muscle balance.
        """
        try:
            print(f"      🎯 Searching for {target_muscle} exercises (tier: {tier})")
            
            # Build query for this muscle group and tier
            query = self.supabase.table("exercises").select("*")
            
            # Progressive difficulty inclusion: include exercises up to user's level
            if difficulty.lower() == "beginner":
                query = query.eq("difficulty", "Beginner")
            elif difficulty.lower() == "intermediate":
                query = query.in_("difficulty", ["Beginner", "Intermediate"])
            elif difficulty.lower() == "advanced":
                query = query.in_("difficulty", ["Beginner", "Intermediate", "Advanced"])
            else:
                # Default to exact match for unknown difficulty levels
                query = query.eq("difficulty", difficulty)
            
            # Target specific muscle using main_muscles field
            # This could be a string or array field depending on database structure
            query = query.contains("main_muscles", [target_muscle])
            query = query.eq("exercise_tier", tier)
            
            # Handle equipment filtering using centralized method
            query = self._apply_equipment_filter(query, equipment, difficulty)
            
            # Order by popularity score for better quality selection
            query = query.order("popularity_score", desc=True)
            
            # Get more exercises than needed to allow for variety selection
            query = query.limit(count * 3)  # Get more options for better selection
            print(f"      🔍 Query limit: {count * 3} exercises for {tier} tier")
            result = query.execute()
            
            print(f"      ✅ Found {len(result.data) if result.data else 0} {target_muscle} exercises")
            
            if not result.data:
                # Fallback: try with target_area if main_muscles doesn't work
                print(f"      🔄 Fallback: trying target_area for {target_muscle}")
                fallback_query = self.supabase.table("exercises").select("*")
                
                # Apply same filters as before
                if difficulty.lower() == "beginner":
                    fallback_query = fallback_query.eq("difficulty", "Beginner")
                elif difficulty.lower() == "intermediate":
                    fallback_query = fallback_query.in_("difficulty", ["Beginner", "Intermediate"])
                elif difficulty.lower() == "advanced":
                    fallback_query = fallback_query.in_("difficulty", ["Beginner", "Intermediate", "Advanced"])
                
                fallback_query = fallback_query.eq("target_area", target_muscle)
                fallback_query = fallback_query.eq("exercise_tier", tier)
                
                # Apply equipment filters using centralized method
                fallback_query = self._apply_equipment_filter(fallback_query, equipment, difficulty)
                
                fallback_query = fallback_query.order("popularity_score", desc=True)
                fallback_query = fallback_query.limit(count * 3)
                
                result = fallback_query.execute()
                print(f"      ✅ Fallback found {len(result.data) if result.data else 0} exercises")
            
            if not result.data:
                return []
            
            # Clean up data to only return the essential fields
            cleaned_exercises = self._clean_exercise_data(result.data)
            return cleaned_exercises[:count]  # Return only what we need
            
        except Exception as e:
            print(f"❌ Error getting {tier} exercises for {target_muscle}: {e}")
            return []
    
    def _clean_exercise_data(self, exercises: List[Dict]) -> List[Dict]:
        """
        Clean exercise data to only return the 6 essential fields needed by the user.
        
        Args:
            exercises: List of exercise dictionaries with full database fields
            
        Returns:
            List of exercise dictionaries with only essential fields
        """
        essential_fields = ["id", "name", "equipment", "target_area", "main_muscles", "difficulty", "exercise_tier"]
        
        cleaned_exercises = []
        for exercise in exercises:
            cleaned_exercise = {field: exercise.get(field) for field in essential_fields}
            cleaned_exercises.append(cleaned_exercise)
        
        return cleaned_exercises

