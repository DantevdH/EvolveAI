"""
Exercise Validator Service for EvolveAI

This service validates training plans to ensure all referenced exercises exist
in the database and provides fallback alternatives when needed using cosine similarity.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .exercise_selector import ExerciseSelector
from .exercise_matcher import ExerciseMatcher
from app.helpers.logging.ai_exercise_logger import ai_exercise_logger
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)
# Keep INFO for step transitions, but reduce detailed logs
# Individual exercise matching details will be DEBUG


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
                                # CRITICAL: Convert to string for validation
                                # exercise_id can be int (from database) or str, but validate_exercise_ids expects strings
                                exercise_id_str = str(exercise_id)
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

            logger.debug(
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

    def post_process_rest_days(self, daily_trainings: List[Dict[str, Any]]) -> None:
        """
        Post-process daily trainings to auto-set is_rest_day = true when there are no 
        strength_exercises AND no endurance_sessions.
        
        This ensures data consistency even if the AI doesn't explicitly set is_rest_day.
        Can be used in generate, update, and create flows.
        
        Args:
            daily_trainings: List of daily training dictionaries to process
        """
        for daily_training in daily_trainings:
            strength_exercises_final = daily_training.get("strength_exercises", [])
            endurance_sessions_final = daily_training.get("endurance_sessions", [])
            
            # Filter out None or empty exercises/sessions
            has_strength = bool([ex for ex in strength_exercises_final if ex and ex.get("exercise_id")])
            has_endurance = bool([sess for sess in endurance_sessions_final if sess])
            
            if not has_strength and not has_endurance:
                # No exercises and no sessions - this is a rest day
                if not daily_training.get("is_rest_day", False):
                    logger.info(
                        f"🔄 Auto-setting is_rest_day=true for {daily_training.get('day_of_week', 'Unknown')} "
                        f"(no strength exercises and no endurance sessions)"
                    )
                daily_training["is_rest_day"] = True
                daily_training["training_type"] = "rest"
            elif daily_training.get("is_rest_day", False) and (has_strength or has_endurance):
                # Rest day flag was set but there are exercises/sessions - clear the flag
                logger.warning(
                    f"⚠️ Clearing is_rest_day flag for {daily_training.get('day_of_week', 'Unknown')} "
                    f"(has exercises or sessions)"
                )
                daily_training["is_rest_day"] = False

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
                    
                    # OPTIMIZATION #2: Collect ALL exercise_ids that need validation FIRST
                    # This allows us to batch validate them all at once instead of individual queries
                    all_exercise_ids_to_validate = []
                    for exercise in strength_exercises:
                        exercise_id = exercise.get("exercise_id")
                        if exercise_id is not None:
                            all_exercise_ids_to_validate.append(str(exercise_id))
                    
                    # Batch validate all existing exercise_ids once
                    validated_exercise_ids_set = set()
                    if all_exercise_ids_to_validate:
                        try:
                            valid_ids, _ = self.exercise_selector.validate_exercise_ids(all_exercise_ids_to_validate)
                            validated_exercise_ids_set = set(valid_ids)
                            logger.debug(
                                f"Batch validated {len(all_exercise_ids_to_validate)} exercise_ids: "
                                f"{len(valid_ids)} valid, {len(all_exercise_ids_to_validate) - len(valid_ids)} invalid"
                            )
                        except Exception as e:
                            logger.error(f"Error batch validating exercise_ids: {e}")
                    
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
                    
                    # Track exercise_ids found during matching for batch validation later
                    matched_exercise_ids_to_validate = []
                    
                    # CRITICAL: Process ALL exercises regardless of whether existing IDs exist
                    # This loop must always run to match exercises and set exercise_id
                    for exercise in strength_exercises:
                        exercise_name = exercise.get("exercise_name", "Unknown")
                        exercise_id = exercise.get("exercise_id")
                        
                        # If already has exercise_id (from previous processing or user data), validate it before keeping
                        # OPTIMIZATION #2: Use cached validation result from batch validation above
                        if exercise_id is not None:
                            if str(exercise_id) in validated_exercise_ids_set:
                                # Exercise_id is valid (from batch validation cache)
                                exercises_to_keep.append(exercise)
                                continue
                            else:
                                # Invalid exercise_id - clear and rematch
                                logger.debug(
                                    f"Exercise_id {exercise_id} for '{exercise_name}' not found in validated set, "
                                    f"will rematch"
                                )
                                exercise.pop("exercise_id", None)
                        
                        # Check if this exercise has AI-generated metadata
                        main_muscle = exercise.get("main_muscle")
                        equipment = exercise.get("equipment")
                        
                        if not all([exercise_name, main_muscle, equipment]):
                            logger.warning(
                                f"Skipping exercise with incomplete metadata: "
                                f"name={exercise_name}, main_muscle={main_muscle}, equipment={equipment}"
                            )
                            # Mark for removal instead of silently skipping
                            exercise["_remove_from_plan"] = True
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
                                matched_exercise_id_str = str(matched_exercise_id)
                                # OPTIMIZATION #2: Check if already validated, otherwise add to batch validation list
                                is_valid = matched_exercise_id_str in validated_exercise_ids_set
                                if not is_valid:
                                    matched_exercise_ids_to_validate.append(matched_exercise_id_str)
                                
                                # Set exercise_id - will validate in batch after loop if not already validated
                                exercise["exercise_id"] = matched_exercise_id
                                # Keep exercise_name for frontend display, update with matched name
                                exercise["exercise_name"] = matched_exercise_name
                                # Update other metadata with matched values
                                # Extract main_muscle from main_muscles array (first item) - database has main_muscles, not main_muscle
                                main_muscles_array = matched_exercise.get("primary_muscles") or matched_exercise.get("main_muscles", [])
                                exercise["main_muscle"] = main_muscles_array[0] if isinstance(main_muscles_array, list) and main_muscles_array else None
                                exercise["equipment"] = matched_exercise.get("equipment")
                                stats["exercises_matched"] += 1
                                
                                if similarity_score < 0.70:
                                    stats["low_similarity_count"] += 1
                                
                                logger.debug(
                                    f"Matched exercise: '{exercise_name}' -> "
                                    f"'{matched_exercise_name}' (ID: {matched_exercise_id}, "
                                    f"score: {similarity_score:.3f}, status: {status})"
                                )
                                # Add to existing names for fallback diversity tracking
                                existing_exercise_names.append(matched_exercise_name)
                                
                                # Note: Invalid IDs will be removed after batch validation
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
                                    fallback_exercise_id_str = str(fallback_exercise_id)
                                    # OPTIMIZATION #2: Check if already validated, otherwise add to batch validation list
                                    is_valid = fallback_exercise_id_str in validated_exercise_ids_set
                                    if not is_valid:
                                        matched_exercise_ids_to_validate.append(fallback_exercise_id_str)
                                    
                                    # Set exercise_id - will validate in batch after loop if not already validated
                                    exercise["exercise_id"] = fallback_exercise_id
                                    # Keep exercise_name for frontend display, update with fallback name
                                    exercise["exercise_name"] = fallback_exercise_name
                                    # Update other metadata with fallback values
                                    # Extract main_muscle from main_muscles array (first item) - database has main_muscles, not main_muscle
                                    main_muscles_array = fallback_exercise.get("primary_muscles") or fallback_exercise.get("main_muscles", [])
                                    exercise["main_muscle"] = main_muscles_array[0] if isinstance(main_muscles_array, list) and main_muscles_array else None
                                    exercise["equipment"] = fallback_exercise.get("equipment")
                                    stats["exercises_matched"] += 1
                                    
                                    logger.debug(
                                        f"✅ Fallback replacement: '{exercise_name}' -> "
                                        f"'{fallback_exercise_name}' (ID: {fallback_exercise_id})"
                                    )
                                    
                                    # Add to existing names for next iterations
                                    existing_exercise_names.append(fallback_exercise_name)
                                    
                                    # Note: Invalid IDs will be removed after batch validation
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
                        
                        # CRITICAL: Only keep exercises that have exercise_id set AND are not marked for removal
                        # This ensures no exercises with null/missing exercise_id make it to the frontend
                        final_exercise_id = exercise.get("exercise_id")
                        is_marked_for_removal = exercise.get("_remove_from_plan", False)
                        
                        if is_marked_for_removal:
                            logger.warning(
                                f"🗑️ Exercise '{exercise_name}' marked for removal (no match/fallback found). "
                                f"Will be filtered out from plan."
                            )
                        elif final_exercise_id is None:
                            logger.error(
                                f"❌ CRITICAL: Exercise '{exercise_name}' has no exercise_id after matching. "
                                f"Marking for removal to prevent frontend errors."
                            )
                            exercise["_remove_from_plan"] = True
                        else:
                            # Exercise has valid exercise_id and is not marked for removal
                            logger.debug(
                                f"✅ Keeping exercise '{exercise_name}' with exercise_id={final_exercise_id}"
                            )
                            exercises_to_keep.append(exercise)
                    
                    # OPTIMIZATION #2: Batch validate all newly matched/fallback exercise_ids after loop
                    if matched_exercise_ids_to_validate:
                        try:
                            # Remove duplicates
                            unique_new_ids = list(set(matched_exercise_ids_to_validate))
                            valid_new_ids, _ = self.exercise_selector.validate_exercise_ids(unique_new_ids)
                            # Add validated IDs to cache
                            validated_exercise_ids_set.update(valid_new_ids)
                            logger.debug(
                                f"Batch validated {len(unique_new_ids)} newly matched exercise_ids: "
                                f"{len(valid_new_ids)} valid"
                            )
                            
                            # Now verify exercises that were deferred - remove invalid ones
                            # Only filter exercises with exercise_ids that were in the batch to validate
                            filtered_exercises = []
                            for ex in exercises_to_keep:
                                ex_id = ex.get("exercise_id")
                                if ex_id is None:
                                    # Keep exercises without IDs (they'll be filtered by final safety check)
                                    filtered_exercises.append(ex)
                                else:
                                    ex_id_str = str(ex_id)
                                    # Only remove if it was in the batch and found invalid
                                    if ex_id_str in matched_exercise_ids_to_validate:
                                        if ex_id_str in validated_exercise_ids_set:
                                            filtered_exercises.append(ex)
                                        else:
                                            logger.warning(
                                                f"Removing exercise with invalid ID {ex_id}: {ex.get('exercise_name')}"
                                            )
                                    else:
                                        # Exercise ID was already validated earlier, keep it
                                        filtered_exercises.append(ex)
                            exercises_to_keep = filtered_exercises
                        except Exception as e:
                            logger.error(f"Error batch validating newly matched exercise_ids: {e}")
                    
                    # Preserve all existing exercises unless explicitly marked for removal
                    # Only drop exercises that are flagged with _remove_from_plan
                    if exercises_to_keep:
                        # FINAL SAFETY CHECK: Ensure all kept exercises have valid exercise_id
                        # This prevents any exercises with null exercise_id from reaching the frontend
                        final_exercises = []
                        removed_count = 0
                        for ex in exercises_to_keep:
                            ex_id = ex.get("exercise_id")
                            ex_name = ex.get("exercise_name", "Unknown")
                            if ex_id is None:
                                logger.error(
                                    f"❌ FINAL SAFETY CHECK FAILED: Exercise '{ex_name}' in kept list has null exercise_id! "
                                    f"This should never happen. Removing exercise to prevent frontend crash."
                                )
                                removed_count += 1
                            else:
                                final_exercises.append(ex)
                        
                        if removed_count > 0:
                            logger.error(
                                f"⚠️ Removed {removed_count} exercise(s) with null exercise_id during final safety check. "
                                f"This indicates a bug in the matching logic above."
                            )
                        
                        daily_training["strength_exercises"] = final_exercises
                        logger.debug(
                            f"✅ Filtered exercises for {daily_training.get('day_of_week', 'Unknown')}: "
                            f"kept {len(final_exercises)} exercise(s), removed {len(strength_exercises) - len(final_exercises)} exercise(s)"
                        )
                    else:
                        # If no filtering happened, keep original list (but still check for null exercise_id)
                        # This can happen if all exercises already had valid exercise_id
                        logger.debug(f"No filtering needed for {daily_training.get('day_of_week', 'Unknown')} - all exercises valid")
                        daily_training["strength_exercises"] = strength_exercises
                    
                    # Post-process rest days (set is_rest_day based on exercises/sessions)
                    self.post_process_rest_days([daily_training])
            
            # Bulk log all exercises at once (non-critical monitoring operation)
            if exercises_to_log:
                try:
                    bulk_stats = ai_exercise_logger.log_ai_exercises_bulk(exercises_to_log)
                    stats["exercises_logged"] = bulk_stats["inserted"] + bulk_stats["updated"]
                    logger.debug(
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
                f"✅ Exercise matching complete: {stats['exercises_processed']} processed, "
                f"{stats['exercises_matched']} matched, {stats['low_similarity_count']} low similarity"
            )
            
            return plan_dict
            
        except Exception as e:
            logger.error(f"Error in post-processing strength exercises: {e}")
            return training_plan_dict  # Return original on error

    @staticmethod
    def normalize_reps_weight_arrays(tp: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-process LLM response to ensure reps/weight arrays match sets count.
        
        This function:
        1. Ensures reps and weight are proper lists matching sets count
        2. Sorts reps from HIGH to LOW (descending order)
        3. Reorders weights to match the new rep order (maintains rep-weight pairing)
        
        Handles cases where LLM returns incorrect array lengths:
        - If arrays are shorter than sets: pad with last value
        - If arrays are longer than sets: truncate to sets count
        - If single values: convert to arrays and pad
        
        Args:
            tp: Training plan dictionary from LLM
            
        Returns:
            Training plan with normalized and sorted reps/weight arrays
        """
        schedules = tp.get("weekly_schedules") or []
        fixed_count = 0
        sorted_count = 0
        
        for week in schedules:
            dailies = week.get("daily_trainings") or []
            for dt in dailies:
                if dt.get("is_rest_day", False):
                    continue
                
                strength_exercises = dt.get("strength_exercises") or []
                for exercise in strength_exercises:
                    sets = exercise.get("sets", 3)
                    reps = exercise.get("reps", [])
                    weight = exercise.get("weight", [])
                    exercise_name = exercise.get("exercise_name", "Unknown")
                    day_of_week = dt.get("day_of_week", "Unknown")
                    
                    # Store original values for logging
                    original_sets = sets
                    original_reps = reps.copy() if isinstance(reps, list) else reps
                    original_weight = weight.copy() if isinstance(weight, list) else weight
                    changes = []  # Track what changed
                    
                    # Ensure sets is an integer
                    if not isinstance(sets, int):
                        try:
                            sets = int(sets)
                            if sets != original_sets:
                                changes.append(f"sets: {original_sets} -> {sets}")
                        except (ValueError, TypeError):
                            sets = 3
                            if original_sets != 3:
                                changes.append(f"sets: {original_sets} -> {sets} (defaulted)")
                    
                    # Normalize reps array
                    if not isinstance(reps, list):
                        # Convert single value to list
                        reps = [reps] if reps is not None else [10]
                        changes.append(f"reps: {original_reps} -> {reps} (converted to list)")
                    
                    # Normalize weight array
                    if not isinstance(weight, list):
                        # Convert single value to list
                        weight = [weight] if weight is not None else [0.0]
                        changes.append(f"weight: {original_weight} -> {weight} (converted to list)")
                    
                    # Fix reps array length
                    if len(reps) < sets:
                        # Pad with last value or default
                        last_rep = reps[-1] if reps else 10
                        reps.extend([last_rep] * (sets - len(reps)))
                        changes.append(f"reps: padded from {len(original_reps) if isinstance(original_reps, list) else 1} to {sets} sets")
                        fixed_count += 1
                    elif len(reps) > sets:
                        # Truncate to sets count
                        original_len = len(reps)
                        reps = reps[:sets]
                        weight = weight[:sets]  # Also truncate weight to match
                        changes.append(f"reps: truncated from {original_len} to {sets} sets")
                        fixed_count += 1
                    
                    # Fix weight array length to match reps
                    if len(weight) < len(reps):
                        # Pad with last value or default
                        last_weight = weight[-1] if weight else 0.0
                        original_len = len(weight)
                        weight.extend([last_weight] * (len(reps) - len(weight)))
                        changes.append(f"weight: padded from {original_len} to {len(reps)} sets")
                        fixed_count += 1
                    elif len(weight) > len(reps):
                        # Truncate to reps length
                        original_len = len(weight)
                        weight = weight[:len(reps)]
                        changes.append(f"weight: truncated from {original_len} to {len(reps)} sets")
                        fixed_count += 1
                    
                    # Ensure proper types (int for reps, float for weight)
                    try:
                        reps = [int(r) for r in reps]
                    except (ValueError, TypeError):
                        logger.warning(
                            f"Invalid reps values for exercise '{exercise_name}': {reps}. Using defaults."
                        )
                        reps = [10] * sets
                        weight = [0.0] * sets
                        changes.append(f"reps/weight: type conversion failed, using defaults")
                    
                    try:
                        weight = [float(w) for w in weight]
                    except (ValueError, TypeError):
                        logger.warning(
                            f"Invalid weight values for exercise '{exercise_name}': {weight}. Using defaults."
                        )
                        weight = [0.0] * sets
                        changes.append(f"weight: type conversion failed, using defaults")
                    
                    # CRITICAL: Sort reps from HIGH to LOW (descending)
                    # Pair reps with weights before sorting to maintain correspondence
                    reps_weight_pairs = list(zip(reps, weight))
                    # Sort by reps (first element) in descending order (high to low)
                    reps_weight_pairs.sort(key=lambda x: x[0], reverse=True)
                    
                    # Check if sorting was needed (i.e., if not already sorted high->low)
                    reps_before_sort = reps.copy()
                    weight_before_sort = weight.copy()
                    reps_sorted = [pair[0] for pair in reps_weight_pairs]
                    weight_sorted = [pair[1] for pair in reps_weight_pairs]
                    
                    # Only update if order changed
                    if reps_sorted != reps_before_sort:
                        reps = reps_sorted
                        weight = weight_sorted
                        sorted_count += 1
                        changes.append(f"reps sorted high->low: {reps_before_sort} -> {reps} (weights adjusted: {weight_before_sort} -> {weight})")
                        logger.debug(
                            f"Sorted reps for '{exercise_name}': {reps_before_sort} -> {reps} "
                            f"(weights adjusted: {weight_before_sort} -> {weight})"
                        )
                    
                    # Log if any changes were made
                    if changes:
                        logger.info(
                            f"📊 [NORMALIZE] Post-processed exercise '{exercise_name}' ({day_of_week}): "
                            f"{'; '.join(changes)}"
                        )
                    
                    # Update exercise with normalized and sorted arrays
                    exercise["sets"] = sets
                    exercise["reps"] = reps
                    exercise["weight"] = weight
        
        if fixed_count > 0 or sorted_count > 0:
            logger.info(
                f"✅ Normalized {fixed_count} reps/weight arrays to match sets counts, "
                f"sorted {sorted_count} exercises (reps high->low)"
            )
        
        return tp
