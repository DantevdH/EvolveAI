"""
Exercise Selection Service for EvolveAI

This service handles smart exercise filtering and selection from the database
to provide relevant exercise candidates for training generation while minimizing
token usage and ensuring exercise authenticity.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client
from logging_config import get_logger

# Load environment variables
load_dotenv()

# Initialize logger
logger = get_logger(__name__)


class ExerciseSelector:
    """Smart exercise selection service for training generation."""

    # Class-level cache for metadata options (shared across all instances)
    _metadata_cache: Optional[Dict[str, List[str]]] = None
    _cache_initialized: bool = False

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
        self, difficulty: str, equipment: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Get exercise candidates filtered by difficulty and equipment.

        This method retrieves exercises based on difficulty level and optional equipment.
        Popularity score range: 1 (high/most popular) to 3 (low/least popular).
        Currently retrieves ALL exercises (popularity 1-3) to maximize selection.

        **Selection Strategy:**
        - Retrieve ALL exercises (no popularity filtering)
        - Filter by difficulty level (progressive inclusion)
        - Filter by equipment types (if specified)
        - Group by main_muscles for better organization
        - Present to AI for intelligent selection

        **Benefits:**
        - **Comprehensive**: Gets all available exercises
        - **Flexible**: AI can choose the best exercises for the specific user
        - **Organized**: Grouped by target area for better AI understanding
        - **Quality**: Database only contains vetted exercises

        Args:
            difficulty: Target difficulty level
            equipment: Optional list of equipment types to filter by

        Returns:
            List of exercise candidates grouped by main_muscles
        """
        try:
            # Get exercises with popularity <= 2 (high and medium popularity)
            all_exercises = self._get_exercises_by_popularity(
                difficulty, equipment=equipment, max_popularity=2
            )

            if not all_exercises:
                logger.warning("No exercises found matching the criteria")
                return []

            # Group exercises by main_muscles (using first item in the list)
            grouped_exercises = self._group_exercises_by_main_muscles(all_exercises)

            return grouped_exercises

        except Exception as e:
            logger.error(f"Error finding exercises: {e}")
            logger.error("Check your database connection and exercise data")
            return []


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

    def _clean_exercise_data(self, exercises: List[Dict]) -> List[Dict]:
        """
        Clean exercise data to only return the 6 essential fields needed by the user.

        Args:
            exercises: List of exercise dictionaries with full database fields

        Returns:
            List of exercise dictionaries with only essential fields
        """
        essential_fields = [
            "id",
            "name",
            "equipment",
            "main_muscles",
            "difficulty",
            "exercise_tier",
        ]

        cleaned_exercises = []
        for exercise in exercises:
            cleaned_exercise = {
                field: exercise.get(field) for field in essential_fields
            }
            cleaned_exercises.append(cleaned_exercise)

        return cleaned_exercises

    def _get_exercises_by_popularity(
        self,
        difficulty: str,
        equipment: Optional[List[str]] = None,
        max_popularity: int = 2,
    ) -> List[Dict]:
        """
        Get exercises filtered by difficulty and equipment.

        Popularity score: 1 (high/most popular) to 3 (low/least popular).
        Default max_popularity=2 to get high and medium popularity exercises.

        Args:
            difficulty: Target difficulty level
            equipment: Optional list of equipment types to filter by
            max_popularity: Maximum popularity score to include (default 2)

        Returns:
            List of exercises filtered by criteria
        """
        try:
            logger.info(
                f"Retrieving exercises - difficulty: {difficulty}, equipment: {equipment}, max_popularity: {max_popularity}"
            )

            # Build query with filters
            query = self.supabase.table("exercises").select("*")

            # Apply difficulty filter (progressive inclusion)
            if difficulty.lower() in ["novice", "beginner"]:
                query = query.eq("difficulty", "Beginner")
            elif difficulty.lower() == "intermediate":
                query = query.in_("difficulty", ["Beginner", "Intermediate"])
            elif difficulty.lower() == "advanced":
                query = query.in_(
                    "difficulty", ["Beginner", "Intermediate", "Advanced"]
                )
            else:
                query = query.eq("difficulty", difficulty)

            # Apply equipment filter if specified
            if equipment and len(equipment) > 0:
                query = query.in_("equipment", equipment)

            # Apply popularity filter (score <= 2)
            query = query.lte("popularity_score", max_popularity)

            # Order by popularity score (1=high first, then 2)
            query = query.order("popularity_score", desc=False)

            result = query.execute()

            logger.info(f"Retrieved {len(result.data) if result.data else 0} exercises")

            if not result.data:
                return []

            # Clean up data to only return the essential fields
            cleaned_exercises = self._clean_exercise_data(result.data)
            return cleaned_exercises

        except Exception as e:
            logger.error(f"Error getting exercises by popularity: {e}")
            return []

    def _group_exercises_by_main_muscles(self, exercises: List[Dict]) -> List[Dict]:
        """
        Group exercises by their main_muscles (using first item in the list).

        Args:
            exercises: List of exercises to group

        Returns:
            List of exercises with main_muscle_group field added
        """
        try:
            grouped_exercises = []

            for exercise in exercises:
                main_muscles = exercise.get("main_muscles", [])

                # Use first item in main_muscles list as the primary muscle group
                if isinstance(main_muscles, list) and main_muscles:
                    primary_muscle = main_muscles[0]
                elif isinstance(main_muscles, str) and main_muscles:
                    primary_muscle = main_muscles
                else:
                    primary_muscle = "Unknown"

                # Add the primary muscle group to the exercise
                exercise_copy = exercise.copy()
                exercise_copy["main_muscle_group"] = primary_muscle
                grouped_exercises.append(exercise_copy)

            return grouped_exercises

        except Exception as e:
            logger.error(f"Error grouping exercises by main_muscles: {e}")
            return exercises

    def get_metadata_options(self) -> Dict[str, List[str]]:
        """
        Get available metadata options from database (equipment, muscles).
        
        These are the options AI can choose from when generating exercise metadata.
        Uses class-level caching to avoid repeated expensive queries (10s → <1ms).
        
        Returns:
            Dict with keys: equipment, main_muscles (distinct values from both main_muscles and secondary_muscles)
        """
        # Return cached data if available
        if ExerciseSelector._cache_initialized and ExerciseSelector._metadata_cache is not None:
            logger.debug("✅ Using cached metadata options (fast path)")
            return ExerciseSelector._metadata_cache
        
        # First call: fetch from database and cache
        logger.info("📊 Fetching metadata options from database (first call only)...")
        try:
            # Get distinct equipment values
            equipment_result = (
                self.supabase.table("exercises")
                .select("equipment")
                .execute()
            )
            equipment_set = set()
            if equipment_result.data:
                for ex in equipment_result.data:
                    eq = ex.get("equipment")
                    if eq:
                        # Handle both string and list types
                        if isinstance(eq, list):
                            equipment_set.update(eq)
                        elif isinstance(eq, str):
                            equipment_set.add(eq)
            
            # Get all exercises to extract muscles from both main_muscles and secondary_muscles
            # We'll process in Python since Supabase client doesn't support complex SQL with UNION and unnest
            all_exercises_result = (
                self.supabase.table("exercises")
                .select("main_muscles, secondary_muscles")
                .execute()
            )
            muscles_set = set()
            if all_exercises_result.data:
                for ex in all_exercises_result.data:
                    # Process main_muscles
                    main_muscles = ex.get("main_muscles")
                    if main_muscles:
                        if isinstance(main_muscles, list):
                            muscles_set.update(main_muscles)
                        elif isinstance(main_muscles, str):
                            muscles_set.add(main_muscles)
                    
                    # Process secondary_muscles
                    secondary_muscles = ex.get("secondary_muscles")
                    if secondary_muscles:
                        if isinstance(secondary_muscles, list):
                            muscles_set.update(secondary_muscles)
                        elif isinstance(secondary_muscles, str):
                            muscles_set.add(secondary_muscles)
            
            # Cache the result at class level
            ExerciseSelector._metadata_cache = {
                "equipment": sorted(list(equipment_set)),
                "main_muscles": sorted(list(muscles_set))  # Actually includes all muscles from both columns
            }
            ExerciseSelector._cache_initialized = True
            
            logger.info(f"✅ Metadata options cached: {len(equipment_set)} equipment, {len(muscles_set)} muscles")
            return ExerciseSelector._metadata_cache
            
        except Exception as e:
            logger.error(f"Error fetching metadata options: {e}")
            # Return fallback values
            fallback = {
                "equipment": [
                    "Barbell", "Dumbbell", "Cable", "Machine", "Smith",
                    "Body weight", "Band Resistive", "Suspension", "Sled",
                    "Weighted", "Plyometric", "Isometric", "Self-assisted"
                ],
                "main_muscles": []
            }
            # Cache fallback to avoid repeated failures
            ExerciseSelector._metadata_cache = fallback
            ExerciseSelector._cache_initialized = True
            return fallback

