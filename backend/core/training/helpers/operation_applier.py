"""
Operation Applier for Intent-Based Plan Updates.

Applies parsed operations from classify_feedback_intent deterministically.
No AI calls needed - just direct plan modifications with validation.
"""

import asyncio
import logging
import time
from typing import Dict, Any, List

# Use RapidFuzz for fast fuzzy matching (same as exercise_matcher)
try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    # Fallback to basic string matching if rapidfuzz not available
    HAS_RAPIDFUZZ = False
    logger.warning("rapidfuzz not available, using basic string matching")

from core.training.helpers.exercise_matcher import ExerciseMatcher
from core.training.helpers.exercise_selector import ExerciseSelector

logger = logging.getLogger(__name__)


def _calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity between two strings (0-100)."""
    if HAS_RAPIDFUZZ:
        return fuzz.ratio(str1.lower(), str2.lower())
    else:
        # Fallback to simple substring matching
        str1_lower = str1.lower()
        str2_lower = str2.lower()
        if str1_lower == str2_lower:
            return 100.0
        elif str1_lower in str2_lower or str2_lower in str1_lower:
            return 80.0
        else:
            return 0.0


class OperationApplier:
    """Apply parsed operations to training plans deterministically."""
    
    def __init__(self):
        self.exercise_matcher = ExerciseMatcher()
        self.exercise_selector = ExerciseSelector()
    
    async def apply_operations(
        self,
        current_plan: Dict[str, Any],
        operations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Apply a list of operations to the training plan.
        
        Operations are applied in order. If one fails, we log and continue.
        
        Args:
            current_plan: The current training plan dict
            operations: List of operation dicts from classify_feedback_intent
            
        Returns:
            Modified training plan
        """
        if not operations:
            logger.info("No operations to apply")
            return current_plan
        
        # Deep copy to avoid mutating original plan
        import copy
        plan = copy.deepcopy(current_plan)
        successful_ops = []
        failed_ops = []
        
        for i, operation in enumerate(operations):
            try:
                op_type = operation.get("type")
                logger.info(f"Applying operation {i+1}/{len(operations)}: {op_type}")
                logger.info(f"📋 Full operation data: {operation}")
                
                if op_type == "swap_exercise":
                    plan = await self._apply_swap_exercise(plan, operation)
                elif op_type == "adjust_intensity":
                    plan = await self._apply_adjust_intensity(plan, operation)
                elif op_type == "move_day":
                    plan = await self._apply_move_day(plan, operation)
                elif op_type == "add_rest_day":
                    plan = await self._apply_add_rest_day(plan, operation)
                elif op_type == "adjust_volume":
                    plan = await self._apply_adjust_volume(plan, operation)
                elif op_type == "add_exercise":
                    plan = await self._apply_add_exercise(plan, operation)
                elif op_type == "remove_exercise":
                    plan = await self._apply_remove_exercise(plan, operation)
                else:
                    logger.warning(f"Unknown operation type: {op_type}")
                    failed_ops.append(operation)
                    continue
                
                successful_ops.append(operation)
                logger.info(f"✅ Successfully applied {op_type}")
                
            except Exception as e:
                logger.error(f"❌ Error applying {operation.get('type')}: {e}")
                failed_ops.append(operation)
                continue
        
        logger.info(f"Applied {len(successful_ops)}/{len(operations)} operations successfully")
        
        return plan
    
    async def _apply_swap_exercise(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Replace one exercise with another.
        
        Steps:
        1. Find the exercise to replace (fuzzy match by name)
        2. Match new exercise to database using ExerciseMatcher
        3. Replace exercise_id, exercise_name, equipment
        4. Keep sets/reps structure
        """
        day_of_week = operation.get("day_of_week")
        old_exercise_name = operation.get("old_exercise_name")
        new_exercise_name = operation.get("new_exercise_name")
        new_main_muscle = operation.get("new_main_muscle")  # Extracted by AI from metadata options
        new_equipment = operation.get("new_equipment")  # Extracted by AI from metadata options
        
        # Find the day
        day = self._find_day(plan, day_of_week)
        if not day:
            raise ValueError(f"Day not found: {day_of_week}")
        
        logger.info(f"✅ Found day: {day.get('day_of_week')}, type={day.get('training_type')}, keys={list(day.keys())}")
        
        # Find the exercise to replace (fuzzy match)
        strength_exercises = day.get("strength_exercises", [])
        exercise_to_replace = None
        exercise_index = None
        
        # Debug: Log exercises in this day
        logger.info(f"🔍 Looking for '{old_exercise_name}' in {len(strength_exercises)} exercise(s)")
        for i, ex in enumerate(strength_exercises):
            ex_name = ex.get("exercise_name", "")
            logger.info(f"  Exercise {i+1}: exercise_name='{ex_name}', keys={list(ex.keys())[:5]}")
            similarity = _calculate_similarity(ex_name, old_exercise_name)
            logger.info(f"    Similarity: {similarity}%")
            if similarity >= 70:  # 70% similarity threshold
                exercise_to_replace = ex
                exercise_index = i
                break
        
        if exercise_to_replace is None:
            raise ValueError(f"Exercise not found: {old_exercise_name}")
        
        logger.info(f"Found exercise to replace: {exercise_to_replace.get('exercise_name')}")
        
        # Use AI-extracted metadata (or fallback to preserving existing)
        if not new_main_muscle:
            new_main_muscle = exercise_to_replace.get("main_muscle")  # Fallback
            logger.warning(f"No new_main_muscle provided, preserving: {new_main_muscle}")
        if not new_equipment:
            new_equipment = exercise_to_replace.get("equipment")  # Fallback
            logger.warning(f"No new_equipment provided, preserving: {new_equipment}")
        
        matched_exercise, similarity_score, status = (
            self.exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name=new_exercise_name,
                main_muscle=new_main_muscle,
                equipment=new_equipment,
                max_popularity=2
            )
        )
        
        if not matched_exercise:
            # Try fallback without muscle constraint
            logger.warning(f"No match for {new_exercise_name}, trying fallback...")
            fallback = self.exercise_matcher.find_fallback_replacement(
                main_muscle=new_main_muscle,
                equipment=new_equipment,
                existing_exercise_names=[],
                max_popularity=2
            )
            if fallback:
                matched_exercise = fallback
                logger.info(f"Using fallback: {fallback.get('name')}")
            else:
                raise ValueError(f"Could not find exercise matching: {new_exercise_name}")
        
        # Validate exercise exists in database
        valid_ids, _ = self.exercise_selector.validate_exercise_ids([str(matched_exercise.get("id"))])
        if str(matched_exercise.get("id")) not in valid_ids:
            raise ValueError(f"Matched exercise ID {matched_exercise.get('id')} is invalid")
        
        # Update exercise in place
        exercise_to_replace["exercise_id"] = matched_exercise.get("id")
        exercise_to_replace["exercise_name"] = matched_exercise.get("name")
        exercise_to_replace["main_muscle"] = matched_exercise.get("main_muscle")
        exercise_to_replace["equipment"] = matched_exercise.get("equipment")
        
        logger.info(f"✅ Swapped to: {matched_exercise.get('name')} (ID: {matched_exercise.get('id')})")
        
        return plan
    
    async def _apply_adjust_intensity(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Adjust intensity by changing sets/reps.
        
        Easier: Reduce sets by 1, reduce reps by 15%
        Harder: Add 1 set, increase reps by 15%
        """
        scope = operation.get("scope", "day")
        day_of_week = operation.get("day_of_week")
        direction = operation.get("direction", "easier")
        
        def adjust_exercise(exercise: Dict[str, Any]):
            """Adjust a single exercise's intensity."""
            if direction == "easier":
                # Reduce intensity
                sets = exercise.get("sets", 3)
                reps = exercise.get("reps", [10, 10, 10])
                weight_1rm = exercise.get("weight_1rm", [80, 80, 80])
                
                # Reduce sets (minimum 2)
                new_sets = max(2, sets - 1)
                
                # Reduce reps by 15% (minimum 4)
                new_reps = [max(4, int(r * 0.85)) for r in reps[:new_sets]]
                
                # Reduce weight by 10%
                new_weight_1rm = [int(w * 0.9) for w in weight_1rm[:new_sets]]
                
                exercise["sets"] = new_sets
                exercise["reps"] = new_reps
                exercise["weight_1rm"] = new_weight_1rm
                
            else:  # harder
                # Increase intensity
                sets = exercise.get("sets", 3)
                reps = exercise.get("reps", [10, 10, 10])
                weight_1rm = exercise.get("weight_1rm", [80, 80, 80])
                
                # Add a set (maximum 5)
                new_sets = min(5, sets + 1)
                
                # Increase reps by 15%
                new_reps = [int(r * 1.15) for r in reps]
                # Add reps for new set if needed
                if new_sets > len(new_reps):
                    new_reps.append(new_reps[-1] if new_reps else 10)
                
                # Increase weight by 10%
                new_weight_1rm = [int(w * 1.1) for w in weight_1rm]
                # Add weight for new set if needed
                if new_sets > len(new_weight_1rm):
                    new_weight_1rm.append(new_weight_1rm[-1] if new_weight_1rm else 80)
                
                exercise["sets"] = new_sets
                exercise["reps"] = new_reps[:new_sets]
                exercise["weight_1rm"] = new_weight_1rm[:new_sets]
        
        # Apply based on scope
        if scope == "week":
            # Adjust all exercises in all days
            for week in plan.get("weekly_schedules", []):
                for day in week.get("daily_trainings", []):
                    for ex in day.get("strength_exercises", []):
                        adjust_exercise(ex)
        
        elif scope == "day":
            # Adjust all exercises on specific day
            day = self._find_day(plan, day_of_week)
            if day:
                for ex in day.get("strength_exercises", []):
                    adjust_exercise(ex)
        
        elif scope == "exercise":
            # Adjust specific exercise
            exercise_name = operation.get("exercise_name")
            day = self._find_day(plan, day_of_week)
            if day:
                for ex in day.get("strength_exercises", []):
                    if _calculate_similarity(ex.get("exercise_name", ""), exercise_name) >= 70:
                        adjust_exercise(ex)
                        break
        
        logger.info(f"✅ Adjusted intensity ({direction}) for {scope}")
        return plan
    
    async def _apply_move_day(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Move or swap training days."""
        source_day_name = operation.get("source_day")
        target_day_name = operation.get("target_day")
        swap = operation.get("swap", False)
        
        source_day = self._find_day(plan, source_day_name)
        target_day = self._find_day(plan, target_day_name)
        
        if not source_day or not target_day:
            raise ValueError(f"Days not found: {source_day_name} or {target_day_name}")
        
        if swap:
            # Swap entire day content (keep day_of_week)
            source_content = {k: v for k, v in source_day.items() if k != "day_of_week"}
            target_content = {k: v for k, v in target_day.items() if k != "day_of_week"}
            
            source_day.update(target_content)
            target_day.update(source_content)
        else:
            # Move source to target, make source a rest day
            target_content = {k: v for k, v in source_day.items() if k != "day_of_week"}
            target_day.update(target_content)
            
            # Make source a rest day
            source_day["is_rest_day"] = True
            source_day["training_type"] = "rest"
            source_day["strength_exercises"] = []
            source_day["endurance_sessions"] = []
            source_day["justification"] = "Rest day for recovery."
        
        logger.info(f"✅ Moved/swapped {source_day_name} ↔ {target_day_name}")
        return plan
    
    async def _apply_add_rest_day(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Convert training day to rest day."""
        day_of_week = operation.get("day_of_week")
        day = self._find_day(plan, day_of_week)
        if not day:
            raise ValueError(f"Day not found: {day_of_week}")
        
        day["is_rest_day"] = True
        day["training_type"] = "rest"
        day["strength_exercises"] = []
        day["endurance_sessions"] = []
        day["justification"] = "Rest day for recovery and adaptation."
        
        logger.info(f"✅ Made {day_of_week} a rest day")
        return plan
    
    async def _apply_adjust_volume(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adjust training volume (sets/reps/duration)."""
        scope = operation.get("scope", "day")
        change_type = operation.get("change_type", "sets")
        adjustment = operation.get("adjustment", 1)
        day_of_week = operation.get("day_of_week")
        
        def adjust_volume(exercise: Dict[str, Any]):
            if change_type == "sets":
                current_sets = exercise.get("sets", 3)
                new_sets = max(1, min(6, current_sets + adjustment))
                exercise["sets"] = new_sets
                
                # Adjust reps and weight arrays to match new sets
                reps = exercise.get("reps", [])
                weight_1rm = exercise.get("weight_1rm", [])
                
                if new_sets > len(reps):
                    # Add sets
                    last_rep = reps[-1] if reps else 10
                    exercise["reps"] = reps + [last_rep] * (new_sets - len(reps))
                else:
                    # Remove sets
                    exercise["reps"] = reps[:new_sets]
                
                if new_sets > len(weight_1rm):
                    last_weight = weight_1rm[-1] if weight_1rm else 80
                    exercise["weight_1rm"] = weight_1rm + [last_weight] * (new_sets - len(weight_1rm))
                else:
                    exercise["weight_1rm"] = weight_1rm[:new_sets]
            
            elif change_type == "reps":
                reps = exercise.get("reps", [10, 10, 10])
                new_reps = [max(1, r + adjustment) for r in reps]
                exercise["reps"] = new_reps
        
        # Apply based on scope
        if scope == "week":
            for week in plan.get("weekly_schedules", []):
                for day in week.get("daily_trainings", []):
                    for ex in day.get("strength_exercises", []):
                        adjust_volume(ex)
        elif scope == "day":
            day = self._find_day(plan, day_of_week)
            if day:
                for ex in day.get("strength_exercises", []):
                    adjust_volume(ex)
        
        logger.info(f"✅ Adjusted volume ({change_type} by {adjustment}) for {scope}")
        return plan
    
    async def _apply_add_exercise(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a new exercise to a specific day."""
        day_of_week = operation.get("day_of_week")
        new_exercise_name = operation.get("new_exercise_name")
        new_main_muscle = operation.get("new_main_muscle")
        new_equipment = operation.get("new_equipment")
        
        # Get required parameters with smart defaults if accidentally missing
        sets = operation.get("sets")
        reps = operation.get("reps")
        weight_1rm = operation.get("weight_1rm")
        
        # Apply defaults if missing (assume AI accidentally omitted them)
        if sets is None:
            sets = 3
            logger.warning(f"⚠️ 'sets' not provided for add_exercise, defaulting to 3")
        
        if reps is None:
            reps = [10] * sets
            logger.warning(f"⚠️ 'reps' not provided for add_exercise, defaulting to {reps}")
        elif len(reps) != sets:
            logger.warning(f"⚠️ Reps array length ({len(reps)}) doesn't match sets ({sets}), padding/truncating")
            reps = (reps + [10] * sets)[:sets]
        
        if weight_1rm is None:
            weight_1rm = [70.0] * sets
            logger.warning(f"⚠️ 'weight_1rm' not provided for add_exercise, defaulting to {weight_1rm}")
        elif len(weight_1rm) != sets:
            logger.warning(f"⚠️ Weight_1rm array length ({len(weight_1rm)}) doesn't match sets ({sets}), padding/truncating")
            weight_1rm = (weight_1rm + [70.0] * sets)[:sets]
        
        # Find the day
        day = self._find_day(plan, day_of_week)
        if not day:
            raise ValueError(f"Day not found: {day_of_week}")
        
        logger.info(f"✅ Found day: {day.get('day_of_week')}, adding exercise '{new_exercise_name}' ({sets}x{reps})")
        
        # Match the exercise to database (same logic as swap_exercise)
        from core.training.helpers.exercise_matcher import ExerciseMatcher
        exercise_matcher = ExerciseMatcher()
        
        # Match to database using the correct method (has built-in fallbacks)
        matched_exercise, similarity_score, status = exercise_matcher.match_ai_exercise_to_database(
            ai_exercise_name=new_exercise_name,
            main_muscle=new_main_muscle,
            equipment=new_equipment,
            max_popularity=2
        )
        
        # If no match found, try fallback by muscle+equipment only
        if not matched_exercise:
            logger.warning(f"No match for '{new_exercise_name}', trying fallback...")
            fallback = exercise_matcher.find_fallback_replacement(
                main_muscle=new_main_muscle,
                equipment=new_equipment,
                existing_exercise_names=[],
                max_popularity=2
            )
            if fallback:
                matched_exercise = fallback
                logger.info(f"✅ Using fallback: {fallback.get('name')}")
            else:
                raise ValueError(f"Could not find any exercise matching: {new_exercise_name} (muscle: {new_main_muscle}, equipment: {new_equipment})")
        
        # At this point we have a match (accept any status: matched, low_confidence, pending_review)
        matched_exercise_id = matched_exercise.get("id")
        matched_exercise_name = matched_exercise.get("name")
        matched_main_muscle = matched_exercise.get("main_muscle") or new_main_muscle
        matched_equipment = matched_exercise.get("equipment") or new_equipment
        
        logger.info(f"✅ Matched '{new_exercise_name}' -> '{matched_exercise_name}' (ID: {matched_exercise_id}, status: {status}, similarity: {similarity_score:.2%})")
        
        # Validate exercise exists in database
        valid_ids, _ = self.exercise_selector.validate_exercise_ids([str(matched_exercise_id)])
        if str(matched_exercise_id) not in valid_ids:
            raise ValueError(f"Matched exercise ID {matched_exercise_id} is invalid")
        
        # Generate temporary ID (negative timestamp to indicate it's not yet in DB)
        # Frontend expects an ID, and database will generate real ID on save
        # Use microseconds for better uniqueness when adding multiple exercises
        await asyncio.sleep(0.001)  # 1ms delay to ensure unique timestamps
        temp_id = int(-time.time() * 1_000_000)  # Negative microsecond timestamp
        
        # Get daily_training_id from the day
        daily_training_id = day.get("id")
        
        logger.info(f"📝 Creating new exercise with temp_id={temp_id}, daily_training_id={daily_training_id}")
        
        # Create new exercise with all required fields (use matched exercise data)
        new_exercise = {
            "id": temp_id,  # Temporary ID for frontend
            "daily_training_id": daily_training_id,  # Link to parent day
            "exercise_id": matched_exercise_id,
            "exercise_name": matched_exercise_name,  # Use matched name, not AI name
            "main_muscle": matched_main_muscle,
            "equipment": matched_equipment,
            "sets": sets,
            "reps": reps,
            "weight": [0.0] * sets,  # Will be filled by user
            "weight_1rm": weight_1rm,
        }
        
        # Add to the day's strength_exercises
        if "strength_exercises" not in day:
            day["strength_exercises"] = []
        day["strength_exercises"].append(new_exercise)
        
        logger.info(f"✅ Added '{matched_exercise_name}' to {day_of_week} with temp ID {temp_id}")
        return plan
    
    async def _apply_remove_exercise(
        self,
        plan: Dict[str, Any],
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Remove an exercise from a specific day."""
        day_of_week = operation.get("day_of_week")
        exercise_name = operation.get("exercise_name")
        
        # Find the day
        day = self._find_day(plan, day_of_week)
        if not day:
            raise ValueError(f"Day not found: {day_of_week}")
        
        logger.info(f"✅ Found day: {day.get('day_of_week')}, removing exercise '{exercise_name}'")
        
        # Find and remove the exercise (fuzzy match)
        strength_exercises = day.get("strength_exercises", [])
        exercise_to_remove = None
        exercise_index = None
        
        for i, ex in enumerate(strength_exercises):
            ex_name = ex.get("exercise_name", "")
            similarity = _calculate_similarity(ex_name, exercise_name)
            logger.info(f"  Comparing '{ex_name}' with '{exercise_name}': {similarity}% similarity")
            if similarity >= 70:  # 70% similarity threshold
                exercise_to_remove = ex
                exercise_index = i
                break
        
        if exercise_to_remove is None:
            raise ValueError(f"Exercise not found: {exercise_name}")
        
        # Remove the exercise
        removed_name = strength_exercises.pop(exercise_index).get("exercise_name")
        logger.info(f"✅ Removed {removed_name} from {day_of_week}")
        
        return plan
    
    def _find_day(self, plan: Dict[str, Any], day_of_week: str) -> Dict[str, Any]:
        """Find a day in the plan by name (case-insensitive)."""
        if not day_of_week:
            return None
        
        for week in plan.get("weekly_schedules", []):
            for day in week.get("daily_trainings", []):
                if day.get("day_of_week", "").lower() == day_of_week.lower():
                    return day
        return None

