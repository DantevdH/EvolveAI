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
            "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY")
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    def _initialize_clients(self):
        """Initialize Supabase client."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
    
    def get_exercise_candidates(self, muscle_groups: List[str], difficulty: str, 
                               equipment: List[str], max_exercises: int = 10) -> List[Dict]:
        """
        Get exercise candidates based on criteria.
        
        Args:
            muscle_groups: List of target muscle groups
            difficulty: Target difficulty level
            equipment: List of available equipment
            max_exercises: Maximum number of exercises to return
            
        Returns:
            List of exercise candidates
        """
        print(f"🔍 Finding exercises: {muscle_groups} + {difficulty} + {equipment}")
        
        # Try advanced query first (database-level filtering)
        advanced_query = self._build_advanced_query(muscle_groups, difficulty, equipment)
        
        if advanced_query:
            try:
                result = advanced_query.execute()
                if result.data:
                    print(f"✅ Advanced query successful: {len(result.data)} exercises")
                    return self._rank_exercise_candidates(result.data, muscle_groups, difficulty, equipment, max_exercises)
            except Exception as e:
                print(f"⚠️  Advanced query failed, falling back to basic query: {e}")
        
        # Fallback to basic query + Python filtering
        print("🔄 Using basic query + Python filtering")
        basic_query = self.supabase.table('exercises').select('*').eq('difficulty', difficulty)
        result = basic_query.execute()
        
        if not result.data:
            print("❌ No exercises found in database")
            return []
        
        print(f"📊 Found {len(result.data)} exercises, applying filters...")
        filtered_exercises = self._apply_simple_filters(result.data, muscle_groups, equipment)
        
        if not filtered_exercises:
            print("❌ No exercises match the criteria")
            return []
        
        print(f"✅ Filtering complete: {len(filtered_exercises)} exercises match criteria")
        return self._rank_exercise_candidates(filtered_exercises, muscle_groups, difficulty, equipment, max_exercises)
    
    def _apply_simple_filters(self, exercises: List[Dict], muscle_groups: List[str], 
                              equipment: List[str]) -> List[Dict]:
        """
        Apply muscle group and equipment filters to exercises.
        
        Args:
            exercises: List of exercises to filter
            muscle_groups: Target muscle groups (use actual database values)
            equipment: Available equipment (use actual database values)
            
        Returns:
            Filtered list of exercises
        """
        if not exercises:
            return []
        
        # Simple equipment mapping - just map frontend names to database values
        target_equipment = []
        for eq in equipment:
            if eq == 'Full Gym':
                # Full gym gets all equipment types
                target_equipment = ['Barbell', 'Dumbbell', 'Cable', 'Lever (plate loaded)', 
                                  'Lever (selectorized)', 'Weighted', 'Body Weight', 'Suspended', 
                                  'Band Resistive', 'Isometric', 'Sled', 'Smith', 'Assisted', 
                                  'Band-assisted', 'Self-assisted', 'Sled (plate loaded)', 
                                  'Sled (selectorized)', 'Assisted (machine)', 'Assisted (partner)', 
                                  'Suspension', 'Plyometric', 'Cable (pull side)', 'Lever']
                break
            elif eq == 'Home Gym':
                target_equipment.extend(['Barbell', 'Dumbbell', 'Body Weight', 'Weighted', 'Assisted', 'Self-assisted'])
            elif eq == 'Dumbbells Only':
                target_equipment.extend(['Dumbbell', 'Body Weight'])
            elif eq == 'Bodyweight Only':
                target_equipment.extend(['Body Weight'])
            else:
                # If not recognized, try to use directly
                target_equipment.append(eq)
        
        # Use muscle groups directly (no mapping needed since test uses database values)
        target_muscles = muscle_groups
        
        print(f"🎯 Filtering for: {target_muscles} muscles, {len(target_equipment)} equipment types")
        
        # Apply filters
        filtered_exercises = []
        for exercise in exercises:
            exercise_equipment = exercise.get('equipment', '').strip()
            exercise_muscle = exercise.get('main_muscle', '').strip()
            
            # Check if exercise matches any target equipment
            equipment_match = any(
                target_eq.lower().strip() == exercise_equipment.lower().strip()
                for target_eq in target_equipment
            )
            
            # Check if exercise matches any target muscle
            muscle_match = any(
                target_muscle.lower().strip() == exercise_muscle.lower().strip()
                for target_muscle in target_muscles
            )
            
            if equipment_match and muscle_match:
                filtered_exercises.append(exercise)
        
        print(f"✅ Filtering complete: {len(filtered_exercises)} exercises passed filters")
        return filtered_exercises
    
    def _rank_exercise_candidates(self, exercises: List[Dict], muscle_groups: List[str], 
                                 difficulty: str, equipment: List[str], max_exercises: int) -> List[Dict]:
        """
        Rank exercise candidates by relevance.
        
        Args:
            exercises: List of exercises to rank
            muscle_groups: Target muscle groups
            difficulty: Target difficulty
            equipment: Available equipment
            max_exercises: Maximum number to return
            
        Returns:
            Ranked list of exercises
        """
        if not exercises:
            return []
        
        print(f"🏆 Ranking {len(exercises)} exercises...")
        
        # Score each exercise
        scored_exercises = []
        for exercise in exercises:
            score = 0
            
            # Primary muscle match (highest score)
            if exercise.get('main_muscle') in muscle_groups:
                score += 2.0
            
            # Difficulty match
            if exercise.get('difficulty') == difficulty:
                score += 1.0
            
            # Equipment preference (lower score for bodyweight if other options available)
            exercise_equipment = exercise.get('equipment', '')
            if 'Body Weight' in exercise_equipment and len(equipment) > 1:
                score += 0.5  # Slight preference for equipment-based exercises
            else:
                score += 1.0
            
            scored_exercises.append((exercise, score))
        
        # Sort by score (highest first)
        scored_exercises.sort(key=lambda x: x[1], reverse=True)
        
        # Return top exercises
        top_exercises = [exercise for exercise, score in scored_exercises[:max_exercises]]
        print(f"✅ Ranking complete: {len(top_exercises)} exercises selected")
        
        return top_exercises
    
    def get_exercise_by_id(self, exercise_id: str) -> Optional[Dict[str, Any]]:
        """Get full exercise details by ID."""
        try:
            response = self.supabase.table('exercises').select('*').eq('id', exercise_id).execute()
            
            if response.data:
                return response.data[0]
            else:
                logger.warning(f"Exercise with ID {exercise_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching exercise {exercise_id}: {e}")
            return None
    
    def validate_exercise_ids(self, exercise_ids: List[str]) -> Tuple[List[str], List[str]]:
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
            response = self.supabase.table('exercises').select(
                'id, name, difficulty, equipment, main_muscle, force'
            ).in_('id', exercise_ids).execute()
            
            if not response.data:
                return []
            
            # Convert to summary format
            summaries = []
            for exercise in response.data:
                summary = {
                    'id': exercise['id'],
                    'name': exercise['name'],
                    'difficulty': exercise['difficulty'],
                    'equipment': exercise['equipment'],
                    'main_muscle': exercise['main_muscle'],
                    'force': exercise.get('force', 'Unknown')
                }
                summaries.append(summary)
            
            return summaries
            
        except Exception as e:
            logger.error(f"Error getting exercise summaries: {e}")
            return []
    
    def get_muscle_group_exercises(self, 
                                  muscle_group: str, 
                                  difficulty: str = None,
                                  equipment: List[str] = None) -> List[Dict[str, Any]]:
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
            max_exercises=20
        )
    
    def get_workout_exercises(self, 
                             workout_type: str,
                             muscle_groups: List[str],
                             difficulty: str,
                             equipment: List[str]) -> List[Dict[str, Any]]:
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
            max_exercises=25
        )
        
        # Apply workout type specific filtering
        if workout_type == 'strength':
            # Strength training benefits from all movement patterns
            # Keep all exercises (no filtering by force type)
            pass
        elif workout_type == 'cardio':
            # Prefer bodyweight exercises for cardio
            candidates = [ex for ex in candidates if 'Body Weight' in ex.get('equipment', '')]
        elif workout_type == 'flexibility':
            # Prefer exercises that target multiple muscle groups
            candidates = [ex for ex in candidates if len(ex.get('secondary_muscles', [])) > 0]
        
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
            sample_response = self.supabase.table('exercises').select('*').limit(5).execute()
            
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
            muscle_response = self.supabase.table('exercises').select('main_muscle').execute()
            if muscle_response.data:
                unique_muscles = list(set([ex.get('main_muscle', '') for ex in muscle_response.data if ex.get('main_muscle')]))
                schema_info['main_muscles'] = sorted(unique_muscles)
                print(f"🔍 DEBUG: Unique main muscles: {schema_info['main_muscles']}")
            
            # Check equipment types
            equipment_response = self.supabase.table('exercises').select('equipment').execute()
            if equipment_response.data:
                unique_equipment = list(set([ex.get('equipment', '') for ex in equipment_response.data if ex.get('equipment')]))
                schema_info['equipment_types'] = sorted(unique_equipment)
                print(f"🔍 DEBUG: Unique equipment types: {schema_info['equipment_types']}")
            
            # Check difficulty levels
            difficulty_response = self.supabase.table('exercises').select('difficulty').execute()
            if difficulty_response.data:
                unique_difficulties = list(set([ex.get('difficulty', '') for ex in difficulty_response.data if ex.get('difficulty')]))
                schema_info['difficulty_levels'] = sorted(unique_difficulties)
                print(f"🔍 DEBUG: Unique difficulty levels: {schema_info['difficulty_levels']}")
            
            return schema_info
            
        except Exception as e:
            print(f"❌ Error inspecting database schema: {e}")
            import traceback
            traceback.print_exc()
            return {}

    def _build_advanced_query(self, muscle_groups: List[str], difficulty: str, equipment: List[str]):
        """
        Build an advanced Supabase query for simple cases.
        
        Args:
            muscle_groups: Target muscle groups (use actual database values)
            difficulty: Target difficulty
            equipment: Available equipment (use actual database values)
            
        Returns:
            Supabase query builder or None if too complex
        """
        # Only build advanced query for simple cases (1-3 filter items)
        if len(muscle_groups) > 3 or len(equipment) > 3:
            return None
        
        try:
            query = self.supabase.table('exercises').select('*')
            
            # Add difficulty filter
            if difficulty:
                query = query.eq('difficulty', difficulty)
            
            # Add muscle group filter if simple (no mapping needed)
            if len(muscle_groups) == 1:
                query = query.eq('main_muscle', muscle_groups[0])
            
            # Add equipment filter if simple
            if len(equipment) == 1:
                eq = equipment[0]
                if eq == 'Full Gym':
                    # Full gym is too complex for simple query
                    return None
                elif eq == 'Home Gym':
                    # Home gym is too complex for simple query
                    return None
                elif eq == 'Dumbbells Only':
                    query = query.in_('equipment', ['Dumbbell', 'Body Weight'])
                elif eq == 'Bodyweight Only':
                    query = query.eq('equipment', 'Body Weight')
                else:
                    query = query.eq('equipment', eq)
            
            return query
            
        except Exception as e:
            print(f"⚠️  Error building advanced query: {e}")
            return None
