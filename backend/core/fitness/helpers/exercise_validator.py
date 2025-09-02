"""
Exercise Validator Service for EvolveAI

This service validates workout plans to ensure all referenced exercises exist
in the database and provides fallback alternatives when needed using cosine similarity.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .exercise_selector import ExerciseSelector
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)

class ExerciseValidator:
    """Validates workout plans and ensures exercise authenticity using cosine similarity fallback."""
    
    def __init__(self):
        """Initialize the exercise validator."""
        self.exercise_selector = ExerciseSelector()
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        # Add caching for similarity calculations
        self._similarity_cache = {}
        self._candidate_cache = {}
        logger.info("✅ Exercise Validator initialized with cosine similarity support and caching")
    
    def clear_cache(self):
        """Clear all caches to free memory."""
        self._similarity_cache.clear()
        self._candidate_cache.clear()
        logger.debug("Exercise validator caches cleared")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for monitoring."""
        return {
            'similarity_cache_size': len(self._similarity_cache),
            'candidate_cache_size': len(self._candidate_cache)
        }
    
    def validate_workout_plan(self, workout_plan: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate a workout plan and fix any invalid exercise references using cosine similarity.
        
        Args:
            workout_plan: The workout plan to validate
            
        Returns:
            Tuple of (validated_workout, validation_messages)
        """
        validation_messages = []
        
        # Early validation checks
        if not workout_plan:
            validation_messages.append("Workout plan is empty")
            return workout_plan, validation_messages
        
        # Check for valid structure first
        structure_messages = self._validate_workout_structure(workout_plan)
        validation_messages.extend(structure_messages)
        
        # If structure is fundamentally broken, return early
        if any("has no weeks" in msg or "error" in msg.lower() for msg in structure_messages):
            return workout_plan, validation_messages
        
        try:
            # Extract and validate exercise IDs in one pass
            exercise_data = self._extract_and_validate_exercises(workout_plan)
            
            if not exercise_data['all_ids']:
                validation_messages.append("No exercise IDs found in workout plan")
                return workout_plan, validation_messages
            
            # Process invalid exercises if any found
            if exercise_data['invalid_ids']:
                validation_messages.append(
                    f"Found {len(exercise_data['invalid_ids'])} invalid exercise IDs: {exercise_data['invalid_ids'][:5]}{'...' if len(exercise_data['invalid_ids']) > 5 else ''}"
                )
                
                # Fix invalid exercises using optimized similarity matching
                validated_workout = self._fix_invalid_exercises_optimized(
                    workout_plan, exercise_data
                )
                validation_messages.append(f"Replaced {len(exercise_data['invalid_ids'])} invalid exercises")
            else:
                validation_messages.append("All exercise IDs are valid")
                validated_workout = workout_plan
            
            return validated_workout, validation_messages
            
        except Exception as e:
            logger.error(f"Error validating workout plan: {e}")
            validation_messages.append(f"Validation error: {str(e)}")
            return workout_plan, validation_messages
    
    def _extract_and_validate_exercises(self, workout_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and validate exercise IDs from a workout plan in one pass.
        
        Args:
            workout_plan: The workout plan to process
            
        Returns:
            Dictionary containing all_ids, valid_ids, invalid_ids, and exercise_locations
        """
        all_ids = []
        exercise_locations = []  # Track where each exercise is located for efficient replacement
        
        try:
            # Handle both 'weeks' and 'weekly_schedules' keys for compatibility
            weeks = workout_plan.get('weeks', workout_plan.get('weekly_schedules', []))
            
            for week_idx, week in enumerate(weeks):
                # Handle both 'days' and 'daily_workouts' keys
                days = week.get('days', week.get('daily_workouts', []))
                
                for day_idx, day in enumerate(days):
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        
                        for exercise_idx, exercise in enumerate(exercises):
                            exercise_id = exercise.get('exercise_id')
                            if exercise_id:
                                exercise_id_str = exercise_id
                                all_ids.append(exercise_id_str)
                                
                                # Store location for efficient replacement later
                                exercise_locations.append({
                                    'week_idx': week_idx,
                                    'day_idx': day_idx,
                                    'exercise_idx': exercise_idx,
                                    'exercise_id': exercise_id_str,
                                    'exercise_data': exercise
                                })
            
            # Validate all IDs at once
            if all_ids:
                valid_ids, invalid_ids = self.exercise_selector.validate_exercise_ids(all_ids)
            else:
                valid_ids, invalid_ids = [], []
            
            return {
                'all_ids': all_ids,
                'valid_ids': valid_ids,
                'invalid_ids': invalid_ids,
                'exercise_locations': exercise_locations
            }
            
        except Exception as e:
            logger.error(f"Error extracting and validating exercises: {e}")
            return {
                'all_ids': [],
                'valid_ids': [],
                'invalid_ids': [],
                'exercise_locations': []
            }
    
    def _extract_exercise_ids(self, workout_plan: Dict[str, Any]) -> List[str]:
        """
        Extract all exercise IDs from a workout plan.
        
        Note: This method is kept for backward compatibility.
        Use _extract_and_validate_exercises for better performance.
        """
        result = self._extract_and_validate_exercises(workout_plan)
        return result['all_ids']
    
    def _fix_invalid_exercises_optimized(self, 
                                       workout_plan: Dict[str, Any], 
                                       exercise_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimized method to replace invalid exercises using location tracking.
        
        Args:
            workout_plan: The workout plan to fix
            exercise_data: Pre-extracted exercise data with locations
            
        Returns:
            Fixed workout plan
        """
        if not exercise_data['invalid_ids']:
            return workout_plan
        
        fixed_workout = workout_plan.copy()
        invalid_ids_set = set(exercise_data['invalid_ids'])
        replacement_cache = {}  # Cache replacements to avoid repeated similarity calculations
        
        try:
            # Handle both structure types
            weeks_key = 'weeks' if 'weeks' in fixed_workout else 'weekly_schedules'
            days_key = 'days' if 'weeks' in fixed_workout else 'daily_workouts'
            
            weeks = fixed_workout.get(weeks_key, [])
            
            # Process invalid exercises using pre-computed locations
            for location in exercise_data['exercise_locations']:
                exercise_id = location['exercise_id']
                
                if exercise_id in invalid_ids_set:
                    # Get replacement from cache or compute new one
                    if exercise_id not in replacement_cache:
                        replacement_cache[exercise_id] = self._find_replacement_with_similarity(
                            location['exercise_data'], exercise_data['valid_ids']
                        )
                    
                    replacement = replacement_cache[exercise_id]
                    
                    if replacement:
                        # Direct access using stored indices
                        week = weeks[location['week_idx']]
                        days = week.get(days_key, [])
                        day = days[location['day_idx']]
                        exercises = day.get('exercises', [])
                        
                        # Update exercise with replacement data
                        exercises[location['exercise_idx']].update(replacement)
                        logger.info(f"Replaced invalid exercise {exercise_id} with {replacement['id']}")
                    else:
                        # Remove exercise if no replacement found
                        week = weeks[location['week_idx']]
                        days = week.get(days_key, [])
                        day = days[location['day_idx']]
                        exercises = day.get('exercises', [])
                        
                        # Mark for removal (we'll remove them in reverse order to maintain indices)
                        exercises[location['exercise_idx']] = None
                        logger.warning(f"Marked invalid exercise {exercise_id} for removal - no replacement found")
            
            # Remove None exercises (marked for deletion)
            for week in weeks:
                days = week.get(days_key, [])
                for day in days:
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        day['exercises'] = [ex for ex in exercises if ex is not None]
            
            return fixed_workout
            
        except Exception as e:
            logger.error(f"Error in optimized invalid exercise fixing: {e}")
            return workout_plan
    
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
                            exercise_id = exercise.get('exercise_id', None)
                            
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
            valid_ids: List of valid exercise IDs (not used for replacement filtering)
            
        Returns:
            Replacement exercise data or None
        """
        try:
            # Get exercise details to understand what we're replacing
            exercise_name = original_exercise.get('name', '')
            target_muscle = self._extract_muscle_from_name(exercise_name)
            
            if not target_muscle:
                return None
            
            # Get replacement candidates (no valid_ids restriction)
            candidates = self.exercise_selector.get_muscle_group_exercises(
                muscle_group=target_muscle,
                difficulty=original_exercise.get('difficulty', None),
                equipment=original_exercise.get('equipment', None)
            )
            
            # No need to filter by valid_ids - we can use any exercise from the database
            if candidates:
                # Return the best candidate
                best_candidate = candidates[0]
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
    
    def _fix_invalid_exercises_with_similarity(self, 
                                             workout_plan: Dict[str, Any], 
                                             invalid_ids: List[str],
                                             valid_ids: List[str]) -> Dict[str, Any]:
        """
        Replace invalid exercises using cosine similarity on descriptions and muscle groups.
        
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
                            exercise_id = exercise.get('exercise_id', None)
                            
                            if exercise_id in invalid_ids:
                                # Find a replacement exercise using cosine similarity
                                replacement = self._find_replacement_with_similarity(
                                    exercise, valid_ids
                                )
                                
                                if replacement:
                                    # Update the exercise with replacement data
                                    exercise.update(replacement)
                                    logger.info(f"Replaced invalid exercise {exercise_id} with {replacement['id']} using similarity")
                                else:
                                    # Remove the exercise if no replacement found
                                    exercises.remove(exercise)
                                    logger.warning(f"Removed invalid exercise {exercise_id} - no replacement found")
            
            return fixed_workout
            
        except Exception as e:
            logger.error(f"Error fixing invalid exercises with similarity: {e}")
            return workout_plan
    
    def _find_replacement_with_similarity(self, 
                                        original_exercise: Dict[str, Any], 
                                        valid_ids: List[str]) -> Optional[Dict[str, Any]]:
        """
        Find a suitable replacement exercise using cosine similarity with caching.
        
        Args:
            original_exercise: The original exercise data
            valid_ids: List of valid exercise IDs (not used for replacement filtering)
            
        Returns:
            Replacement exercise data or None
        """
        try:
            # Create cache key from exercise properties
            exercise_name = original_exercise.get('name', '')
            difficulty = original_exercise.get('difficulty', "Beginner")
            equipment = original_exercise.get('equipment', None)
            description = original_exercise.get('description', '')
            
            cache_key = f"{exercise_name}_{difficulty}_{equipment}"
            
            # Check cache first
            if cache_key in self._similarity_cache:
                cached_result = self._similarity_cache[cache_key]
                logger.debug(f"Using cached replacement for {exercise_name}")
                return cached_result
            
            # Get the target muscle
            target_muscle = self._extract_muscle_from_name(exercise_name)
            
            if not target_muscle:
                logger.warning(f"No target muscle found for exercise: {exercise_name}")
                self._similarity_cache[cache_key] = None
                return None
            
            # Check candidate cache
            candidate_key = f"{target_muscle}_{difficulty}_{equipment}"
            if candidate_key in self._candidate_cache:
                candidates = self._candidate_cache[candidate_key]
            else:
                # Get replacement candidates from the same muscle group
                candidates = self.exercise_selector.get_muscle_group_exercises(
                    muscle_group=target_muscle,
                    difficulty=difficulty,
                    equipment=equipment
                )
                self._candidate_cache[candidate_key] = candidates
            
            if not candidates:
                logger.warning(f"No candidates found for muscle group: {target_muscle}")
                self._similarity_cache[cache_key] = None
                return None
            
            # If we have a description, use cosine similarity
            if description and len(candidates) > 1:
                replacement = self._find_best_match_by_similarity_cached(
                    description, candidates, cache_key
                )
            else:
                # Fallback to first candidate
                replacement = candidates[0]
            
            if replacement:
                result = {
                    'id': replacement['id'],
                    'name': replacement['name'],
                    'exercise_id': replacement['id'],
                    'difficulty': replacement['difficulty'],
                    'equipment': replacement['equipment'],
                    'description': f"Replacement for: {description}" if description else "Exercise replacement"
                }
                self._similarity_cache[cache_key] = result
                return result
            
            self._similarity_cache[cache_key] = None
            return None
            
        except Exception as e:
            logger.error(f"Error finding replacement with similarity: {e}")
            return None
    
    def _find_best_match_by_similarity_cached(self, 
                                            target_description: str, 
                                            candidates: List[Dict[str, Any]], 
                                            cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Find the best matching exercise using cosine similarity with caching.
        
        Args:
            target_description: The target exercise description
            candidates: List of candidate exercises
            cache_key: Key for caching the result
            
        Returns:
            Best matching exercise or None
        """
        similarity_key = f"sim_{cache_key}_{len(candidates)}"
        
        # Check if we've already computed similarity for this combination
        if similarity_key in self._similarity_cache:
            return self._similarity_cache[similarity_key]
        
        result = self._find_best_match_by_similarity(target_description, candidates)
        self._similarity_cache[similarity_key] = result
        return result
    
    def _find_best_match_by_similarity(self, 
                                     target_description: str, 
                                     candidates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Find the best matching exercise using cosine similarity on descriptions.
        
        Args:
            target_description: The target exercise description
            candidates: List of candidate exercises
            
        Returns:
            Best matching exercise or None
        """
        try:
            if not candidates:
                return None
            
            # Prepare text for vectorization
            texts = [target_description]
            for candidate in candidates:
                # Combine exercise name, description, and muscle group for better matching
                candidate_text = f"{candidate.get('name', '')} {candidate.get('description', '')} {candidate.get('target_area', '')}"
                texts.append(candidate_text)
            
            # Create TF-IDF vectors
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity between target and all candidates
            target_vector = tfidf_matrix[0:1]
            candidate_vectors = tfidf_matrix[1:]
            
            similarities = cosine_similarity(target_vector, candidate_vectors).flatten()
            
            # Find the best match
            best_idx = np.argmax(similarities)
            best_similarity = similarities[best_idx]
            
            logger.info(f"Best similarity score: {best_similarity:.3f} for exercise: {candidates[best_idx]['name']}")
            
            # Return the best candidate if similarity is above threshold
            if best_similarity > 0.1:  # Adjustable threshold
                return candidates[best_idx]
            else:
                logger.warning(f"Best similarity score too low: {best_similarity:.3f}")
                return candidates[0]  # Fallback to first candidate
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return candidates[0] if candidates else None
    
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
        """Validate the overall structure of the workout plan with optimized checks."""
        messages = []
        
        try:
            # Handle both structure types
            weeks = workout_plan.get('weeks', workout_plan.get('weekly_schedules', []))
            
            if not weeks:
                messages.append("Workout plan has no weeks")
                return messages
            
            # Batch validation for better performance
            total_exercises = 0
            empty_workout_days = 0
            missing_exercise_ids = 0
            
            for week_idx, week in enumerate(weeks):
                # Handle both structure types
                days = week.get('days', week.get('daily_workouts', []))
                
                # Quick length check (more flexible than exactly 7)
                if len(days) < 1:
                    messages.append(f"Week {week_idx + 1} has no days")
                    continue
                elif len(days) > 14:  # Reasonable upper limit
                    messages.append(f"Week {week_idx + 1} has too many days ({len(days)})")
                
                # Batch process all days in this week
                for day_idx, day in enumerate(days):
                    if not day.get('is_rest_day', False):
                        exercises = day.get('exercises', [])
                        total_exercises += len(exercises)
                        
                        if not exercises:
                            empty_workout_days += 1
                        else:
                            # Quick scan for missing exercise_ids
                            for exercise in exercises:
                                if not exercise.get('exercise_id'):
                                    missing_exercise_ids += 1
            
            # Generate summary messages instead of individual ones
            if empty_workout_days > 0:
                messages.append(f"Found {empty_workout_days} workout days with no exercises")
            
            if missing_exercise_ids > 0:
                messages.append(f"Found {missing_exercise_ids} exercises missing exercise_id")
            
            if total_exercises == 0:
                messages.append("Workout plan contains no exercises")
            else:
                messages.append(f"Workout structure validated: {len(weeks)} weeks, {total_exercises} total exercises")
            
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
                        'target_area': exercise['target_area']
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
                                unique_exercises.add(exercise_id)
                            
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
