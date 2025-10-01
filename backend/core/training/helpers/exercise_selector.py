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
        difficulty: str
    ) -> List[Dict]:
        """
        Get exercise candidates with popularity_score <= 2, grouped by main_muscles.
        
        This method retrieves all exercises with a popularity score of 2 or less,
        which represents well-known, effective exercises. The exercises are then
        grouped by their main_muscles for better organization.
        
        **Selection Strategy:**
        - Retrieve ALL exercises with popularity_score <= 2
        - Filter by difficulty level (progressive inclusion)
        - Group by main_muscles (using first item in the list)
        - Present to AI for intelligent selection
        
        **Benefits:**
        - **Quality**: Popularity score <= 2 ensures proven, effective exercises
        - **Comprehensive**: Gets all suitable exercises, not just a subset
        - **Organized**: Grouped by muscle groups for better AI understanding
        - **Flexible**: AI can choose the best exercises for the specific user

        Args:
            max_exercises: Maximum number of exercises to return (not used in filtering)
            difficulty: Target difficulty level

        Returns:
            List of exercise candidates with popularity_score <= 2, grouped by main_muscles
        """
        logger.info(f"Finding exercises for difficulty: {difficulty} with popularity_score <= 2")

        try:
            # Get all exercises with popularity_score <= 2
            all_exercises = self._get_exercises_by_popularity(
                difficulty, max_popularity=2
            )
            
            logger.info(f"Found {len(all_exercises)} exercises with popularity_score <= 2")
            
            if not all_exercises:
                logger.warning("No exercises found matching the criteria")
                return []
            
            # Group exercises by main_muscles (using first item in the list)
            grouped_exercises = self._group_exercises_by_main_muscles(all_exercises)
            
            logger.info(f"Grouped exercises into {len(grouped_exercises)} muscle groups")
            
            return grouped_exercises

        except Exception as e:
            logger.error(f"Error finding exercises: {e}")
            logger.error("Check your database connection and exercise data")
            return []

    def get_formatted_exercises_for_ai(
        self,
        max_exercises: int,
        difficulty: str
    ) -> str:
        """
        Get exercise candidates formatted as a string for AI prompts.
        
        Args:
            max_exercises: Maximum number of exercises to return (not used in filtering)
            difficulty: Target difficulty level

        Returns:
            Formatted string of exercise candidates for AI prompts
        """
        try:
            # Get grouped exercises
            grouped_exercises = self.get_exercise_candidates(max_exercises, difficulty)
            
            if not grouped_exercises:
                return "No exercises available"
            
            # Format exercises for AI prompt
            formatted_exercises = self._format_exercises_for_ai(grouped_exercises)
            
            return formatted_exercises

        except Exception as e:
            logger.error(f"Error formatting exercises for AI: {e}")
            return "No exercises available"
    
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
        essential_fields = ["id", "name", "equipment", "target_area", "main_muscles", "difficulty", "exercise_tier"]
        
        cleaned_exercises = []
        for exercise in exercises:
            cleaned_exercise = {field: exercise.get(field) for field in essential_fields}
            cleaned_exercises.append(cleaned_exercise)
        
        return cleaned_exercises

    def _get_exercises_by_popularity(
        self,
        difficulty: str,
        max_popularity: float = 2.0
    ) -> List[Dict]:
        """
        Get exercises with popularity_score <= max_popularity.
        
        Args:
            difficulty: Target difficulty level
            max_popularity: Maximum popularity score (inclusive)
            
        Returns:
            List of exercises with popularity_score <= max_popularity
        """
        try:
            logger.debug(f"Searching for exercises with popularity_score <= {max_popularity}")
            
            # Build query for popularity and difficulty
            query = self.supabase.table("exercises").select("*")
            
            # Progressive difficulty inclusion: include exercises up to user's level
            if difficulty.lower() in ["novice", "beginner"]:
                query = query.eq("difficulty", "Beginner")
            elif difficulty.lower() == "intermediate":
                query = query.in_("difficulty", ["Beginner", "Intermediate"])
            elif difficulty.lower() == "advanced":
                query = query.in_("difficulty", ["Beginner", "Intermediate", "Advanced"])
            else:
                # Default to exact match for unknown difficulty levels
                query = query.eq("difficulty", difficulty)
            
            # Filter by popularity score
            query = query.lte("popularity_score", max_popularity)
            
            # Order by popularity score for better quality selection
            query = query.order("popularity_score", desc=False)  # Lower scores first
            
            result = query.execute()
            
            logger.debug(f"Found {len(result.data) if result.data else 0} exercises with popularity_score <= {max_popularity}")
            
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
                main_muscles = exercise.get('main_muscles', [])
                
                # Use first item in main_muscles list as the primary muscle group
                if isinstance(main_muscles, list) and main_muscles:
                    primary_muscle = main_muscles[0]
                elif isinstance(main_muscles, str) and main_muscles:
                    primary_muscle = main_muscles
                else:
                    primary_muscle = "Unknown"
                
                # Add the primary muscle group to the exercise
                exercise_copy = exercise.copy()
                exercise_copy['main_muscle_group'] = primary_muscle
                grouped_exercises.append(exercise_copy)
            
            logger.debug(f"Grouped {len(exercises)} exercises by main_muscle_group")
            return grouped_exercises
            
        except Exception as e:
            logger.error(f"Error grouping exercises by main_muscles: {e}")
            return exercises

    def _format_exercises_for_ai(self, exercises: List[Dict]) -> str:
        """
        Format exercises grouped by main_muscle_group for AI prompt.
        
        Args:
            exercises: List of exercises with main_muscle_group field
            
        Returns:
            Formatted string for AI prompt
        """
        if not exercises:
            return "No exercises available"
        
        # Group exercises by main_muscle_group
        muscle_groups = {}
        for exercise in exercises:
            muscle_group = exercise.get('main_muscle_group', 'Unknown')
            if muscle_group not in muscle_groups:
                muscle_groups[muscle_group] = []
            muscle_groups[muscle_group].append(exercise)
        
        # Format each muscle group
        formatted_groups = []
        for muscle_group, group_exercises in muscle_groups.items():
            group_info = [f"  {muscle_group}:"]
            for exercise in group_exercises:
                exercise_line = f"    - {exercise['name']} (ID: {exercise['id']}): {exercise.get('difficulty', 'Unknown')} - {exercise.get('equipment', 'Unknown equipment')}"
                group_info.append(exercise_line)
            formatted_groups.append("\n".join(group_info))
        
        return "\n\n".join(formatted_groups)

