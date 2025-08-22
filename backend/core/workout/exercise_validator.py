"""
Exercise Validator Service for EvolveAI

This service validates workout plans to ensure all referenced exercises exist
in the database and provides fallback alternatives when needed.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .exercise_selector import ExerciseSelector
import logging

logger = logging.getLogger(__name__)

class ExerciseValidator:
    """Validates workout plans and ensures exercise authenticity."""
    
    def __init__(self):
        """Initialize the exercise validator."""
        self.exercise_selector = ExerciseSelector()
        logger.info("✅ Exercise Validator initialized")
    
    def validate_workout_plan(self, workout_plan: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate a workout plan and fix any invalid exercise references.
        
        Args:
            workout_plan: The workout plan to validate
            
        Returns:
            Tuple of (validated_workout, validation_messages)
        """
        validation_messages = []
        validated_workout = workout_plan.copy()
        
        try:
            # Extract all exercise IDs from the workout plan
            exercise_ids = self._extract_exercise_ids(workout_plan)
            
            if not exercise_ids:
                validation_messages.append("No exercise IDs found in workout plan")
                return validated_workout, validation_messages
            
            # Validate exercise IDs
            valid_ids, invalid_ids = self.exercise_selector.validate_exercise_ids(exercise_ids)
            
            if invalid_ids:
                validation_messages.append(f"Found {len(invalid_ids)} invalid exercise IDs: {invalid_ids}")
                
                # Fix invalid exercises
                validated_workout = self._fix_invalid_exercises(
                    validated_workout, invalid_ids, valid_ids
                )
            else:
                validation_messages.append("All exercise IDs are valid")
            
            # Additional validation checks
            validation_messages.extend(self._validate_workout_structure(validated_workout))
            
            return validated_workout, validation_messages
            
        except Exception as e:
            logger.error(f"Error validating workout plan: {e}")
            validation_messages.append(f"Validation error: {e}")
            return workout_plan, validation_messages
    
    def _extract_exercise_ids(self, workout_plan: Dict[str, Any]) -> List[str]:
        """Extract all exercise IDs from a workout plan."""
        exercise_ids = []
        
        try:
            weeks = workout_plan.get('weeks', [])
            
            for week in weeks:
                days = week.get('days', [])
                
                for day in days:
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        
                        for exercise in exercises:
                            exercise_id = exercise.get('exercise_id')
                            if exercise_id:
                                exercise_ids.append(str(exercise_id))
            
            return exercise_ids
            
        except Exception as e:
            logger.error(f"Error extracting exercise IDs: {e}")
            return []
    
    def _fix_invalid_exercises(self, 
                              workout_plan: Dict[str, Any], 
                              invalid_ids: List[str],
                              valid_ids: List[str]) -> Dict[str, Any]:
        """
        Replace invalid exercises with valid alternatives.
        
        Args:
            workout_plan: The workout plan to fix
            invalid_ids: List of invalid exercise IDs
            valid_ids: List of valid exercise IDs
            
        Returns:
            Fixed workout plan
        """
        fixed_workout = workout_plan.copy()
        
        try:
            weeks = fixed_workout.get('weeks', [])
            
            for week in weeks:
                days = week.get('days', [])
                
                for day in days:
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        
                        for exercise in exercises:
                            exercise_id = str(exercise.get('exercise_id', ''))
                            
                            if exercise_id in invalid_ids:
                                # Find a replacement exercise
                                replacement = self._find_replacement_exercise(
                                    exercise, valid_ids
                                )
                                
                                if replacement:
                                    # Update the exercise with replacement data
                                    exercise.update(replacement)
                                    logger.info(f"Replaced invalid exercise {exercise_id} with {replacement['id']}")
                                else:
                                    # Remove the exercise if no replacement found
                                    exercises.remove(exercise)
                                    logger.warning(f"Removed invalid exercise {exercise_id} - no replacement found")
            
            return fixed_workout
            
        except Exception as e:
            logger.error(f"Error fixing invalid exercises: {e}")
            return workout_plan
    
    def _find_replacement_exercise(self, 
                                  original_exercise: Dict[str, Any], 
                                  valid_ids: List[str]) -> Optional[Dict[str, Any]]:
        """
        Find a suitable replacement exercise for an invalid one.
        
        Args:
            original_exercise: The original exercise data
            valid_ids: List of valid exercise IDs
            
        Returns:
            Replacement exercise data or None
        """
        try:
            # Get exercise details to understand what we're replacing
            exercise_name = original_exercise.get('name', '')
            target_muscle = self._extract_muscle_from_name(exercise_name)
            
            if not target_muscle:
                return None
            
            # Get replacement candidates
            candidates = self.exercise_selector.get_muscle_group_exercises(
                muscle_group=target_muscle,
                difficulty=original_exercise.get('difficulty', 'Intermediate'),
                equipment=original_exercise.get('equipment', ['bodyweight'])
            )
            
            # Filter to only valid IDs
            valid_candidates = [c for c in candidates if str(c['id']) in valid_ids]
            
            if valid_candidates:
                # Return the best candidate
                best_candidate = valid_candidates[0]
                return {
                    'id': best_candidate['id'],
                    'name': best_candidate['name'],
                    'exercise_id': best_candidate['id'],
                    'difficulty': best_candidate['difficulty'],
                    'equipment': best_candidate['equipment']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding replacement exercise: {e}")
            return None
    
    def _extract_muscle_from_name(self, exercise_name: str) -> Optional[str]:
        """Extract target muscle group from exercise name."""
        if not exercise_name:
            return None
        
        # Common muscle group patterns
        muscle_patterns = {
            'chest': ['chest', 'pec', 'bench', 'push-up', 'dumbbell press'],
            'back': ['back', 'lat', 'row', 'pull-up', 'deadlift'],
            'legs': ['leg', 'quad', 'hamstring', 'calf', 'glute', 'squat', 'lunge'],
            'shoulders': ['shoulder', 'deltoid', 'press', 'lateral raise'],
            'arms': ['arm', 'bicep', 'tricep', 'curl', 'extension'],
            'core': ['core', 'abs', 'abdominal', 'plank', 'crunch']
        }
        
        exercise_lower = exercise_name.lower()
        
        for muscle, patterns in muscle_patterns.items():
            if any(pattern in exercise_lower for pattern in patterns):
                return muscle
        
        return None
    
    def _validate_workout_structure(self, workout_plan: Dict[str, Any]) -> List[str]:
        """Validate the overall structure of the workout plan."""
        messages = []
        
        try:
            weeks = workout_plan.get('weeks', [])
            
            if not weeks:
                messages.append("Workout plan has no weeks")
                return messages
            
            # Check each week
            for week_idx, week in enumerate(weeks):
                days = week.get('days', [])
                
                if len(days) != 7:
                    messages.append(f"Week {week_idx + 1} does not have exactly 7 days")
                
                # Check each day
                for day_idx, day in enumerate(days):
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        
                        if not exercises:
                            messages.append(f"Day {day_idx + 1} in week {week_idx + 1} has no exercises but is not marked as rest day")
                        
                        # Validate each exercise
                        for exercise_idx, exercise in enumerate(exercises):
                            if not exercise.get('exercise_id'):
                                messages.append(f"Exercise {exercise_idx + 1} in day {day_idx + 1}, week {week_idx + 1} has no exercise_id")
            
            return messages
            
        except Exception as e:
            logger.error(f"Error validating workout structure: {e}")
            return [f"Structure validation error: {e}"]
    
    def validate_exercise_references(self, exercise_references: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate a list of exercise references.
        
        Args:
            exercise_references: List of exercise references to validate
            
        Returns:
            List of validated exercise references
        """
        validated_references = []
        
        for ref in exercise_references:
            exercise_id = ref.get('exercise_id')
            
            if exercise_id:
                # Check if exercise exists
                exercise = self.exercise_selector.get_exercise_by_id(exercise_id)
                
                if exercise:
                    # Exercise exists, add to validated list
                    validated_ref = ref.copy()
                    validated_ref['exercise_name'] = exercise['name']
                    validated_ref['exercise_details'] = {
                        'difficulty': exercise['difficulty'],
                        'equipment': exercise['equipment'],
                        'main_muscle': exercise['main_muscle']
                    }
                    validated_references.append(validated_ref)
                else:
                    logger.warning(f"Exercise ID {exercise_id} not found in database")
            else:
                logger.warning(f"Exercise reference missing exercise_id: {ref}")
        
        return validated_references
    
    def get_workout_summary(self, workout_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary of the workout plan with exercise statistics.
        
        Args:
            workout_plan: The workout plan to summarize
            
        Returns:
            Summary statistics
        """
        try:
            total_exercises = 0
            unique_exercises = set()
            muscle_groups = set()
            equipment_used = set()
            
            weeks = workout_plan.get('weeks', [])
            
            for week in weeks:
                days = week.get('days', [])
                
                for day in days:
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        total_exercises += len(exercises)
                        
                        for exercise in exercises:
                            exercise_id = exercise.get('exercise_id')
                            if exercise_id:
                                unique_exercises.add(str(exercise_id))
                            
                            # Extract muscle group from exercise name
                            muscle = self._extract_muscle_from_name(exercise.get('name', ''))
                            if muscle:
                                muscle_groups.add(muscle)
                            
                            # Extract equipment
                            equip = exercise.get('equipment', '')
                            if equip:
                                equipment_used.add(equip)
            
            return {
                'total_weeks': len(weeks),
                'total_exercises': total_exercises,
                'unique_exercises': len(unique_exercises),
                'muscle_groups_targeted': list(muscle_groups),
                'equipment_used': list(equipment_used),
                'validation_status': 'valid' if total_exercises > 0 else 'empty'
            }
            
        except Exception as e:
            logger.error(f"Error generating workout summary: {e}")
            return {'error': str(e)}
