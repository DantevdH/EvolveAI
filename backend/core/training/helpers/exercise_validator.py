"""
Exercise Validator Service for EvolveAI

This service validates training plans to ensure all referenced exercises exist
in the database and provides fallback alternatives when needed using cosine similarity.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .exercise_selector import ExerciseSelector
from .exercise_matcher import ExerciseMatcher
from .ai_exercise_logger import ai_exercise_logger
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)


class ExerciseValidator:
    """Validates training plans and ensures exercise authenticity using cosine similarity fallback."""

    def __init__(self):
        """Initialize the exercise validator."""
        self.exercise_selector = ExerciseSelector()
        self.exercise_matcher = ExerciseMatcher()
        self.vectorizer = TfidfVectorizer(
            max_features=1000, stop_words="english", ngram_range=(1, 2)
        )
        # Add caching for similarity calculations
        self._similarity_cache = {}
        self._candidate_cache = {}
        logger.info(
            "✅ Exercise Validator initialized with cosine similarity support and caching"
        )

    def clear_cache(self):
        """Clear all caches to free memory."""
        self._similarity_cache.clear()
        self._candidate_cache.clear()
        logger.debug("Exercise validator caches cleared")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for monitoring."""
        return {
            "similarity_cache_size": len(self._similarity_cache),
            "candidate_cache_size": len(self._candidate_cache),
        }

    def validate_training_plan(
        self, training_plan: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate a training plan and fix any invalid exercise references using cosine similarity.

        Args:
            training_plan: The training plan to validate

        Returns:
            Tuple of (validated_training, validation_messages)
        """
        validation_messages = []

        # Early validation checks
        if not training_plan:
            validation_messages.append("Training plan is empty")
            return training_plan, validation_messages

        # Check for valid structure first
        structure_messages = self._validate_training_structure(training_plan)
        validation_messages.extend(structure_messages)

        # If structure is fundamentally broken, return early
        if any(
            "has no weeks" in msg or "error" in msg.lower()
            for msg in structure_messages
        ):
            return training_plan, validation_messages

        try:
            # Extract and validate exercise IDs in one pass
            exercise_data = self._extract_and_validate_exercises(training_plan)

            if not exercise_data["all_ids"]:
                validation_messages.append("No exercise IDs found in training plan")
                return training_plan, validation_messages

            # Process invalid exercises if any found
            if exercise_data["invalid_ids"]:
                validation_messages.append(
                    f"Found {len(exercise_data['invalid_ids'])} invalid exercise IDs: {exercise_data['invalid_ids'][:5]}{'...' if len(exercise_data['invalid_ids']) > 5 else ''}"
                )

                # Fix invalid exercises using optimized similarity matching
                validated_training = self._fix_invalid_exercises_optimized(
                    training_plan, exercise_data
                )
                validation_messages.append(
                    f"Replaced {len(exercise_data['invalid_ids'])} invalid exercises"
                )
            else:
                validation_messages.append("All exercise IDs are valid")
                validated_training = training_plan

            return validated_training, validation_messages

        except Exception as e:
            logger.error(f"Error validating training plan: {e}")
            validation_messages.append(f"Validation error: {str(e)}")
            return training_plan, validation_messages

    def _extract_and_validate_exercises(
        self, training_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract and validate exercise IDs from a training plan in one pass.

        Args:
            training_plan: The training plan to process

        Returns:
            Dictionary containing all_ids, valid_ids, invalid_ids, and exercise_locations
        """
        all_ids = []
        exercise_locations = (
            []
        )  # Track where each exercise is located for efficient replacement

        try:
            # Handle both 'weeks' and 'weekly_schedules' keys for compatibility
            weeks = training_plan.get(
                "weeks", training_plan.get("weekly_schedules", [])
            )

            for week_idx, week in enumerate(weeks):
                # Handle both 'days' and 'daily_trainings' keys
                days = week.get("days", week.get("daily_trainings", []))

                for day_idx, day in enumerate(days):
                    if not day.get("is_rest_day", False):
                        # Use strength_exercises (user-specific exercises with reps/sets)
                        strength_exercises = day.get("strength_exercises", [])

                        for exercise_idx, exercise in enumerate(strength_exercises):
                            exercise_id = exercise.get("exercise_id")
                            if exercise_id:
                                exercise_id_str = exercise_id
                                all_ids.append(exercise_id_str)

                                # Store location for efficient replacement later
                                exercise_locations.append(
                                    {
                                        "week_idx": week_idx,
                                        "day_idx": day_idx,
                                        "exercise_idx": exercise_idx,
                                        "exercise_id": exercise_id_str,
                                        "exercise_data": exercise,
                                    }
                                )

            # Validate all IDs at once
            if all_ids:
                valid_ids, invalid_ids = self.exercise_selector.validate_exercise_ids(
                    all_ids
                )
            else:
                valid_ids, invalid_ids = [], []

            return {
                "all_ids": all_ids,
                "valid_ids": valid_ids,
                "invalid_ids": invalid_ids,
                "exercise_locations": exercise_locations,
            }

        except Exception as e:
            logger.error(f"Error extracting and validating exercises: {e}")
            return {
                "all_ids": [],
                "valid_ids": [],
                "invalid_ids": [],
                "exercise_locations": [],
            }

    def _extract_exercise_ids(self, training_plan: Dict[str, Any]) -> List[str]:
        """
        Extract all exercise IDs from a training plan.

        Note: This method is kept for backward compatibility.
        Use _extract_and_validate_exercises for better performance.
        """
        result = self._extract_and_validate_exercises(training_plan)
        return result["all_ids"]

    def _fix_invalid_exercises_optimized(
        self, training_plan: Dict[str, Any], exercise_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Optimized method to replace invalid exercises using location tracking.

        Args:
            training_plan: The training plan to fix
            exercise_data: Pre-extracted exercise data with locations

        Returns:
            Fixed training plan
        """
        if not exercise_data["invalid_ids"]:
            return training_plan

        fixed_training = training_plan.copy()
        invalid_ids_set = set(exercise_data["invalid_ids"])
        replacement_cache = (
            {}
        )  # Cache replacements to avoid repeated similarity calculations

        try:
            # Handle both structure types
            weeks_key = "weeks" if "weeks" in fixed_training else "weekly_schedules"
            days_key = "days" if "weeks" in fixed_training else "daily_trainings"

            weeks = fixed_training.get(weeks_key, [])

            # Process invalid exercises using pre-computed locations
            for location in exercise_data["exercise_locations"]:
                exercise_id = location["exercise_id"]

                if exercise_id in invalid_ids_set:
                    # Get replacement from cache or compute new one
                    if exercise_id not in replacement_cache:
                        replacement_cache[exercise_id] = (
                            self._find_replacement_with_similarity(
                                location["exercise_data"], exercise_data["valid_ids"]
                            )
                        )

                    replacement = replacement_cache[exercise_id]

                    if replacement:
                        # Direct access using stored indices
                        week = weeks[location["week_idx"]]
                        days = week.get(days_key, [])
                        day = days[location["day_idx"]]
                        # Use strength_exercises (user-specific exercises with reps/sets)
                        strength_exercises = day.get("strength_exercises", [])

                        # Update exercise with replacement data
                        strength_exercises[location["exercise_idx"]].update(replacement)
                        logger.info(
                            f"Replaced invalid exercise {exercise_id} with {replacement['id']}"
                        )
                    else:
                        # Remove exercise if no replacement found
                        week = weeks[location["week_idx"]]
                        days = week.get(days_key, [])
                        day = days[location["day_idx"]]
                        # Use strength_exercises (user-specific exercises with reps/sets)
                        strength_exercises = day.get("strength_exercises", [])

                        # Mark for removal (we'll remove them in reverse order to maintain indices)
                        strength_exercises[location["exercise_idx"]] = None
                        logger.warning(
                            f"Marked invalid exercise {exercise_id} for removal - no replacement found"
                        )

            # Remove None exercises (marked for deletion)
            for week in weeks:
                days = week.get(days_key, [])
                for day in days:
                    if not day.get("is_rest_day", False):
                        # Use strength_exercises (user-specific exercises with reps/sets)
                        strength_exercises = day.get("strength_exercises", [])
                        day["strength_exercises"] = [ex for ex in strength_exercises if ex is not None]

            return fixed_training

        except Exception as e:
            logger.error(f"Error in optimized invalid exercise fixing: {e}")
            return training_plan

    def _find_replacement_exercise(
        self, original_exercise: Dict[str, Any], valid_ids: List[str]
    ) -> Optional[Dict[str, Any]]:
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
            exercise_name = original_exercise.get("name", "")
            target_muscle = self._extract_muscle_from_name(exercise_name)

            if not target_muscle:
                return None

            # Get replacement candidates using simplified exercise selector
            candidates = self.exercise_selector.get_exercise_candidates(
                difficulty=original_exercise.get("difficulty", "Beginner")
            )

            # No need to filter by valid_ids - we can use any exercise from the database
            if candidates:
                # Return the best candidate
                best_candidate = candidates[0]
                return {
                    "id": best_candidate["id"],
                    "name": best_candidate["name"],
                    "exercise_id": best_candidate["id"],
                    "difficulty": best_candidate["difficulty"],
                    "equipment": best_candidate["equipment"],
                }

            return None

        except Exception as e:
            logger.error(f"Error finding replacement exercise: {e}")
            return None

    def _find_replacement_with_similarity(
        self, original_exercise: Dict[str, Any], valid_ids: List[str]
    ) -> Optional[Dict[str, Any]]:
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
            exercise_name = original_exercise.get("name", "")
            difficulty = original_exercise.get("difficulty", "Beginner")
            equipment = original_exercise.get("equipment", None)
            description = original_exercise.get("description", "")

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
                # Get replacement candidates using simplified exercise selector
                candidates = self.exercise_selector.get_exercise_candidates(
                    difficulty=difficulty
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
                    "id": replacement["id"],
                    "name": replacement["name"],
                    "exercise_id": replacement["id"],
                    "difficulty": replacement["difficulty"],
                    "equipment": replacement["equipment"],
                    "description": (
                        f"Replacement for: {description}"
                        if description
                        else "Exercise replacement"
                    ),
                }
                self._similarity_cache[cache_key] = result
                return result

            self._similarity_cache[cache_key] = None
            return None

        except Exception as e:
            logger.error(f"Error finding replacement with similarity: {e}")
            return None

    def _find_best_match_by_similarity_cached(
        self, target_description: str, candidates: List[Dict[str, Any]], cache_key: str
    ) -> Optional[Dict[str, Any]]:
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

    def _find_best_match_by_similarity(
        self, target_description: str, candidates: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
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
                # Combine exercise name and description for better matching
                candidate_text = f"{candidate.get('name', '')} {candidate.get('description', '')}"
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

            logger.info(
                f"Best similarity score: {best_similarity:.3f} for exercise: {candidates[best_idx]['name']}"
            )

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
            "chest": ["chest", "pec", "bench", "push-up", "dumbbell press"],
            "back": ["back", "lat", "row", "pull-up", "deadlift"],
            "legs": ["leg", "quad", "hamstring", "calf", "glute", "squat", "lunge"],
            "shoulders": ["shoulder", "deltoid", "press", "lateral raise"],
            "arms": ["arm", "bicep", "tricep", "curl", "extension"],
            "core": ["core", "abs", "abdominal", "plank", "crunch"],
        }

        exercise_lower = exercise_name.lower()

        for muscle, patterns in muscle_patterns.items():
            if any(pattern in exercise_lower for pattern in patterns):
                return muscle

        return None

    def _validate_training_structure(self, training_plan: Dict[str, Any]) -> List[str]:
        """Validate the overall structure of the training plan with optimized checks."""
        messages = []

        try:
            # Handle both structure types
            weeks = training_plan.get(
                "weeks", training_plan.get("weekly_schedules", [])
            )

            if not weeks:
                messages.append("Training plan has no weeks")
                return messages

            # Batch validation for better performance
            total_exercises = 0
            empty_training_days = 0
            missing_exercise_ids = 0

            for week_idx, week in enumerate(weeks):
                # Handle both structure types
                days = week.get("days", week.get("daily_trainings", []))

                # Quick length check (more flexible than exactly 7)
                if len(days) < 1:
                    messages.append(f"Week {week_idx + 1} has no days")
                    continue
                elif len(days) > 14:  # Reasonable upper limit
                    messages.append(
                        f"Week {week_idx + 1} has too many days ({len(days)})"
                    )

                # Batch process all days in this week
                for day_idx, day in enumerate(days):
                    if not day.get("is_rest_day", False):
                        # Use strength_exercises (user-specific exercises with reps/sets)
                        # Note: 'exercises' table contains all exercises, 'strength_exercise' table is user-specific
                        strength_exercises = day.get("strength_exercises", [])
                        total_exercises += len(strength_exercises)

                        if not strength_exercises:
                            empty_training_days += 1
                        else:
                            # Quick scan for missing exercise_ids
                            for exercise in strength_exercises:
                                if not exercise.get("exercise_id"):
                                    missing_exercise_ids += 1

            # Generate summary messages instead of individual ones
            if empty_training_days > 0:
                messages.append(
                    f"Found {empty_training_days} training days with no exercises"
                )

            if missing_exercise_ids > 0:
                messages.append(
                    f"Found {missing_exercise_ids} exercises missing exercise_id"
                )

            if total_exercises == 0:
                messages.append("Training plan contains no exercises")
            else:
                messages.append(
                    f"Training structure validated: {len(weeks)} weeks, {total_exercises} total exercises"
                )

            return messages

        except Exception as e:
            logger.error(f"Error validating training structure: {e}")
            return [f"Structure validation error: {e}"]

    def post_process_strength_exercises(
        self,
        training_plan_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Post-process strength exercises: match AI-generated exercises to database.
        
        This function:
        1. Finds all strength exercises with AI-generated metadata (exercise_name, main_muscle, equipment)
        2. Matches each to database using ExerciseMatcher
        3. Replaces metadata with exercise_id
        4. Logs all AI exercises to ai_exercises table for monitoring
        
        Args:
            training_plan_dict: Training plan dictionary (can be Pydantic model or dict)
        
        Returns:
            Updated training plan dictionary with exercise_id set for all strength exercises
        """
        try:
            # Convert Pydantic model to dict if needed
            if hasattr(training_plan_dict, 'model_dump'):
                plan_dict = training_plan_dict.model_dump()
            else:
                plan_dict = training_plan_dict.copy()
            
            stats = {
                "exercises_processed": 0,
                "exercises_matched": 0,
                "exercises_logged": 0,
                "low_similarity_count": 0
            }
            
            # Collect all exercises to log in bulk
            exercises_to_log = []
            
            # Iterate through weekly_schedules -> daily_trainings -> strength_exercises
            weekly_schedules = plan_dict.get("weekly_schedules", [])
            
            for week in weekly_schedules:
                daily_trainings = week.get("daily_trainings", [])
                
                for daily_training in daily_trainings:
                    if daily_training.get("is_rest_day", False):
                        continue
                    
                    strength_exercises = daily_training.get("strength_exercises", [])
                    
                    # CRITICAL: Filter out exercises without matches after processing
                    exercises_to_keep = []
                    
                    # Track exercise names already in this day's plan (for fallback diversity)
                    # First, collect exercise_ids from exercises that already have them
                    existing_exercise_ids = [
                        ex.get("exercise_id") 
                        for ex in strength_exercises 
                        if ex.get("exercise_id")
                    ]
                    
                    # Fetch exercise names for existing exercise_ids
                    existing_exercise_names = []
                    if existing_exercise_ids:
                        try:
                            # Get exercise details for existing IDs using existing selector
                            exercises_data = self.exercise_selector.supabase.table("exercises").select("id, name").in_("id", existing_exercise_ids).execute()
                            if exercises_data.data:
                                existing_exercise_names = [ex.get("name", "") for ex in exercises_data.data if ex.get("name")]
                        except Exception as e:
                            logger.warning(f"Could not fetch existing exercise names: {e}")
                    
                    for exercise in strength_exercises:
                        # If already has exercise_id (from previous processing or user data), keep it
                        if exercise.get("exercise_id"):
                            exercises_to_keep.append(exercise)
                            continue
                        
                        # Check if this exercise has AI-generated metadata
                        exercise_name = exercise.get("exercise_name")
                        main_muscle = exercise.get("main_muscle")
                        equipment = exercise.get("equipment")
                        
                        if not all([exercise_name, main_muscle, equipment]):
                            logger.warning(
                                f"Skipping exercise with incomplete metadata: "
                                f"name={exercise_name}, main_muscle={main_muscle}, equipment={equipment}"
                            )
                            # Don't keep exercises with incomplete metadata
                            continue
                        
                        stats["exercises_processed"] += 1
                        
                        # Match to database
                        matched_exercise, similarity_score, status = (
                            self.exercise_matcher.match_ai_exercise_to_database(
                                ai_exercise_name=exercise_name,
                                main_muscle=main_muscle,
                                equipment=equipment,
                                max_popularity=2
                            )
                        )
                        
                        # Set exercise_id if matched
                        matched_exercise_id = matched_exercise.get("id") if matched_exercise else None
                        matched_exercise_name = matched_exercise.get("name") if matched_exercise else None
                        
                        if matched_exercise:
                            # CRITICAL: Validate exercise_id exists before using
                            matched_exercise_id = matched_exercise.get("id")
                            if matched_exercise_id:
                                # Verify the exercise ID still exists in database (edge case: exercise deleted between match and save)
                                valid_ids, _ = self.exercise_selector.validate_exercise_ids([str(matched_exercise_id)])
                                if str(matched_exercise_id) in valid_ids:
                                    exercise["exercise_id"] = matched_exercise_id
                                    # Clean up AI metadata fields as they're no longer needed
                                    exercise.pop("exercise_name", None)
                                    exercise.pop("main_muscle", None)
                                    exercise.pop("equipment", None)
                                    stats["exercises_matched"] += 1
                                    
                                    if similarity_score < 0.70:
                                        stats["low_similarity_count"] += 1
                                    
                                    logger.info(
                                        f"Matched exercise: '{exercise_name}' -> "
                                        f"'{matched_exercise_name}' (ID: {matched_exercise_id}, "
                                        f"score: {similarity_score:.3f}, status: {status})"
                                    )
                                    # Add to existing names for fallback diversity tracking
                                    existing_exercise_names.append(matched_exercise_name)
                                else:
                                    # Exercise was deleted between match and validation
                                    logger.warning(
                                        f"Matched exercise ID {matched_exercise_id} no longer exists in database. "
                                        f"Exercise '{exercise_name}' will be removed from plan."
                                    )
                                    exercise["_remove_from_plan"] = True
                            else:
                                logger.warning(
                                    f"Matched exercise has no ID. Exercise '{exercise_name}' will be removed from plan."
                                )
                                exercise["_remove_from_plan"] = True
                        else:
                            # CRITICAL: Try to find a fallback replacement instead of removing
                            logger.warning(
                                f"No match found for exercise: '{exercise_name}' "
                                f"(main_muscle: {main_muscle}, equipment: {equipment}). "
                                f"Attempting to find fallback replacement..."
                            )
                            
                            # Find fallback replacement (same equipment, main_muscle, popularity <= 2, different from existing)
                            fallback_exercise = self.exercise_matcher.find_fallback_replacement(
                                main_muscle=main_muscle,
                                equipment=equipment,
                                existing_exercise_names=existing_exercise_names,
                                max_popularity=2
                            )
                            
                            if fallback_exercise:
                                fallback_exercise_id = fallback_exercise.get("id")
                                fallback_exercise_name = fallback_exercise.get("name")
                                
                                # Verify the exercise ID still exists in database
                                if fallback_exercise_id:
                                    valid_ids, _ = self.exercise_selector.validate_exercise_ids([str(fallback_exercise_id)])
                                    if str(fallback_exercise_id) in valid_ids:
                                        # Replace with fallback exercise
                                        exercise["exercise_id"] = fallback_exercise_id
                                        # Remove AI metadata fields
                                        exercise.pop("exercise_name", None)
                                        exercise.pop("main_muscle", None)
                                        exercise.pop("equipment", None)
                                        stats["exercises_matched"] += 1
                                        
                                        logger.info(
                                            f"✅ Fallback replacement: '{exercise_name}' -> "
                                            f"'{fallback_exercise_name}' (ID: {fallback_exercise_id})"
                                        )
                                        
                                        # Add to existing names for next iterations
                                        existing_exercise_names.append(fallback_exercise_name)
                                    else:
                                        logger.warning(
                                            f"Fallback exercise ID {fallback_exercise_id} no longer exists. "
                                            f"Exercise '{exercise_name}' will be removed from plan."
                                        )
                                        exercise["_remove_from_plan"] = True
                                else:
                                    logger.warning(
                                        f"Fallback exercise has no ID. Exercise '{exercise_name}' will be removed from plan."
                                    )
                                    exercise["_remove_from_plan"] = True
                            else:
                                # No fallback found, remove exercise
                                logger.error(
                                    f"CRITICAL: No fallback replacement found for exercise: '{exercise_name}' "
                                    f"(main_muscle: {main_muscle}, equipment: {equipment}). "
                                    f"Exercise will be removed from plan to prevent database errors."
                                )
                                exercise["_remove_from_plan"] = True
                        
                        # Collect exercise data for bulk logging (only if status != "matched" - matched exercises don't need monitoring)
                        if status != "matched":
                            exercises_to_log.append({
                                "ai_exercise_name": exercise_name,
                                "main_muscle": main_muscle,
                                "equipment": equipment,
                                "similarity_score": similarity_score,
                                "matched_exercise_id": matched_exercise_id,
                                "matched_exercise_name": matched_exercise_name,
                                "status": status
                            })
                        
                        # Only keep exercises that have exercise_id set (successfully matched)
                        if not exercise.get("_remove_from_plan", False):
                            exercises_to_keep.append(exercise)
                    
                    # CRITICAL: Update daily_training with only matched exercises
                    if len(exercises_to_keep) < len(strength_exercises):
                        removed_count = len(strength_exercises) - len(exercises_to_keep)
                        logger.warning(
                            f"Removed {removed_count} unmatched exercise(s) from daily_training "
                            f"(kept {len(exercises_to_keep)}/{len(strength_exercises)})"
                        )
                    daily_training["strength_exercises"] = exercises_to_keep
            
            # Bulk log all exercises at once (non-critical monitoring operation)
            if exercises_to_log:
                try:
                    bulk_stats = ai_exercise_logger.log_ai_exercises_bulk(exercises_to_log)
                    stats["exercises_logged"] = bulk_stats["inserted"] + bulk_stats["updated"]
                    logger.info(
                        f"Bulk logged {stats['exercises_logged']} exercises "
                        f"({bulk_stats['inserted']} inserted, {bulk_stats['updated']} updated)"
                    )
                except Exception as e:
                    # Log error but don't fail plan save - logging is for monitoring, not core functionality
                    logger.error(
                        f"Failed to log AI exercises to monitoring table (non-critical): {e}. "
                        f"Plan save will continue but monitoring data may be incomplete."
                    )
                    stats["exercises_logged"] = 0
            
            logger.info(
                f"Post-processing complete: {stats['exercises_processed']} processed, "
                f"{stats['exercises_matched']} matched, {stats['low_similarity_count']} low similarity"
            )
            
            return plan_dict
            
        except Exception as e:
            logger.error(f"Error in post-processing strength exercises: {e}")
            return training_plan_dict  # Return original on error
