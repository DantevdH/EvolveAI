
"""
Training Comparison Helper for Daily Feedback.

This module compares the original planned training with what the user actually did,
detecting modifications without requiring LLM analysis.
"""

from typing import List, Dict, Any
from logging_config import get_logger
from app.schemas.playbook_schemas import TrainingModification

logger = get_logger(__name__)


class TrainingComparison:
    """
    Compares planned vs actual training to detect user modifications.
    
    This enables the ACE pattern to learn from:
    - Weight reductions (too heavy)
    - Rep reductions (too hard)
    - Set additions (too easy)
    - Exercise substitutions
    - Distance/duration adjustments
    """

    @staticmethod
    def compare_strength_training(
        original_exercises: List[Dict[str, Any]], 
        actual_exercises: List[Dict[str, Any]]
    ) -> List[TrainingModification]:
        """
        Compare planned vs actual strength training.
        
        Args:
            original_exercises: Planned exercises from database
            actual_exercises: What user actually did from frontend
            
        Returns:
            List of detected modifications
        """
        modifications = []
        
        # Create lookup dict for actual exercises by exercise_id
        actual_by_id = {ex.get('exercise_id'): ex for ex in actual_exercises}
        original_by_id = {ex.get('exercise_id'): ex for ex in original_exercises}
        
        # Check for removed exercises
        for orig_id, orig_ex in original_by_id.items():
            if orig_id not in actual_by_id:
                modifications.append(TrainingModification(
                    field="exercise_removed",
                    original_value=orig_ex.get('exercise_name', f"Exercise {orig_id}"),
                    actual_value="Skipped/Removed",
                    exercise_name=orig_ex.get('exercise_name', f"Exercise {orig_id}")
                ))
        
        # Check for added exercises
        for actual_id, actual_ex in actual_by_id.items():
            if actual_id not in original_by_id:
                modifications.append(TrainingModification(
                    field="exercise_added",
                    original_value="Not planned",
                    actual_value=actual_ex.get('exercise_name', f"Exercise {actual_id}"),
                    exercise_name=actual_ex.get('exercise_name', f"Exercise {actual_id}")
                ))
        
        # Check for modifications in matching exercises
        for exercise_id, orig_ex in original_by_id.items():
            if exercise_id not in actual_by_id:
                continue
                
            actual_ex = actual_by_id[exercise_id]
            exercise_name = orig_ex.get('exercise_name', f"Exercise {exercise_id}")
            
            # Compare sets
            orig_sets = orig_ex.get('sets', 0)
            actual_sets = actual_ex.get('sets', 0)
            if orig_sets != actual_sets:
                modifications.append(TrainingModification(
                    field="sets",
                    original_value=orig_sets,
                    actual_value=actual_sets,
                    exercise_name=exercise_name
                ))
            
            # Compare reps (list comparison)
            orig_reps = orig_ex.get('reps', [])
            actual_reps = actual_ex.get('reps', [])
            if orig_reps != actual_reps:
                # Calculate average rep change
                orig_avg = sum(orig_reps) / len(orig_reps) if orig_reps else 0
                actual_avg = sum(actual_reps) / len(actual_reps) if actual_reps else 0
                
                modifications.append(TrainingModification(
                    field="reps",
                    original_value=f"avg {orig_avg:.1f} reps",
                    actual_value=f"avg {actual_avg:.1f} reps",
                    exercise_name=exercise_name
                ))
            
            # Compare weight (list comparison)
            orig_weights = orig_ex.get('weight', [])
            actual_weights = actual_ex.get('weight', [])
            if orig_weights != actual_weights:
                # Calculate average weight change
                orig_avg_weight = sum(orig_weights) / len(orig_weights) if orig_weights else 0
                actual_avg_weight = sum(actual_weights) / len(actual_weights) if actual_weights else 0
                
                if abs(orig_avg_weight - actual_avg_weight) > 0.5:  # Threshold to avoid rounding noise
                    modifications.append(TrainingModification(
                        field="weight",
                        original_value=f"{orig_avg_weight:.1f}kg",
                        actual_value=f"{actual_avg_weight:.1f}kg",
                        exercise_name=exercise_name
                    ))
        
        return modifications

    @staticmethod
    def compare_endurance_training(
        original_sessions: List[Dict[str, Any]], 
        actual_sessions: List[Dict[str, Any]]
    ) -> List[TrainingModification]:
        """
        Compare planned vs actual endurance training.
        
        Args:
            original_sessions: Planned endurance sessions from database
            actual_sessions: What user actually did from frontend
            
        Returns:
            List of detected modifications
        """
        modifications = []
        
        # For endurance, we compare by session index since there's no unique ID
        for i in range(max(len(original_sessions), len(actual_sessions))):
            orig_session = original_sessions[i] if i < len(original_sessions) else None
            actual_session = actual_sessions[i] if i < len(actual_sessions) else None
            
            # Session removed
            if orig_session and not actual_session:
                modifications.append(TrainingModification(
                    field="session_removed",
                    original_value=orig_session.get('name', 'Endurance session'),
                    actual_value="Skipped",
                    exercise_name=orig_session.get('name', 'Endurance session')
                ))
                continue
            
            # Session added
            if actual_session and not orig_session:
                modifications.append(TrainingModification(
                    field="session_added",
                    original_value="Not planned",
                    actual_value=actual_session.get('name', 'Endurance session'),
                    exercise_name=actual_session.get('name', 'Endurance session')
                ))
                continue
            
            # Both exist - compare details
            if orig_session and actual_session:
                session_name = orig_session.get('name', f'Session {i+1}')
                
                # Compare distance/volume
                orig_volume = orig_session.get('training_volume', 0)
                actual_volume = actual_session.get('training_volume', 0)
                if abs(orig_volume - actual_volume) > 0.1:  # Threshold
                    unit = orig_session.get('unit', 'km')
                    modifications.append(TrainingModification(
                        field="distance/duration",
                        original_value=f"{orig_volume}{unit}",
                        actual_value=f"{actual_volume}{unit}",
                        exercise_name=session_name
                    ))
                
                # Compare heart rate zone (if applicable)
                orig_hr = orig_session.get('heart_rate_zone')
                actual_hr = actual_session.get('heart_rate_zone')
                if orig_hr and actual_hr and orig_hr != actual_hr:
                    modifications.append(TrainingModification(
                        field="heart_rate_zone",
                        original_value=orig_hr,
                        actual_value=actual_hr,
                        exercise_name=session_name
                    ))
        
        return modifications

    @staticmethod
    def compare_daily_training(
        original_training: Dict[str, Any],
        actual_training: Dict[str, Any]
    ) -> List[TrainingModification]:
        """
        Compare a complete daily training session (may include both strength and endurance).
        
        Args:
            original_training: Original planned training from database
            actual_training: What user actually did from frontend
            
        Returns:
            List of all detected modifications
        """
        all_modifications = []
        
        # Check if training type changed
        orig_type = original_training.get('training_type', 'rest')
        actual_type = actual_training.get('training_type', 'rest')
        
        if orig_type != actual_type:
            all_modifications.append(TrainingModification(
                field="training_type",
                original_value=orig_type,
                actual_value=actual_type,
                exercise_name="Daily training"
            ))
        
        # Compare strength exercises
        orig_strength = original_training.get('strength_exercises', [])
        actual_strength = actual_training.get('strength_exercises', [])
        
        if orig_strength or actual_strength:
            strength_mods = TrainingComparison.compare_strength_training(
                orig_strength, actual_strength
            )
            all_modifications.extend(strength_mods)
        
        # Compare endurance sessions
        orig_endurance = original_training.get('endurance_sessions', [])
        actual_endurance = actual_training.get('endurance_sessions', [])
        
        if orig_endurance or actual_endurance:
            endurance_mods = TrainingComparison.compare_endurance_training(
                orig_endurance, actual_endurance
            )
            all_modifications.extend(endurance_mods)
        
        logger.info(f"Detected {len(all_modifications)} modifications in daily training")
        
        return all_modifications

    @staticmethod
    def format_modifications_for_analysis(modifications: List[TrainingModification]) -> str:
        """
        Format modifications into human-readable text for ACE Reflector analysis.
        
        Args:
            modifications: List of detected modifications
            
        Returns:
            Formatted string describing all modifications
        """
        if not modifications:
            return "No modifications - user followed the plan exactly as prescribed."
        
        # Group by type
        increases = []
        decreases = []
        removed = []
        added = []
        other = []
        
        for mod in modifications:
            if "removed" in mod.field.lower() or "skipped" in str(mod.actual_value).lower():
                removed.append(f"  • {mod.exercise_name}: {mod.field} ({mod.original_value} → {mod.actual_value})")
            elif "added" in mod.field.lower():
                added.append(f"  • {mod.exercise_name}: {mod.field} ({mod.original_value} → {mod.actual_value})")
            elif _is_increase(mod):
                increases.append(f"  • {mod.exercise_name}: {mod.field} ({mod.original_value} → {mod.actual_value})")
            elif _is_decrease(mod):
                decreases.append(f"  • {mod.exercise_name}: {mod.field} ({mod.original_value} → {mod.actual_value})")
            else:
                other.append(f"  • {mod.exercise_name}: {mod.field} ({mod.original_value} → {mod.actual_value})")
        
        output = [f"User made {len(modifications)} modification(s) to the planned training:\n"]
        
        if decreases:
            output.append("REDUCTIONS (potential overload):")
            output.extend(decreases)
            output.append("")
        
        if increases:
            output.append("INCREASES (potential under-prescription):")
            output.extend(increases)
            output.append("")
        
        if removed:
            output.append("REMOVED/SKIPPED:")
            output.extend(removed)
            output.append("")
        
        if added:
            output.append("ADDED:")
            output.extend(added)
            output.append("")
        
        if other:
            output.append("OTHER CHANGES:")
            output.extend(other)
        
        return "\n".join(output)


def _is_increase(mod: TrainingModification) -> bool:
    """Check if modification represents an increase."""
    try:
        # Try to extract numeric values
        orig_val = _extract_number(str(mod.original_value))
        actual_val = _extract_number(str(mod.actual_value))
        
        if orig_val is not None and actual_val is not None:
            return actual_val > orig_val
    except:
        pass
    
    return False


def _is_decrease(mod: TrainingModification) -> bool:
    """Check if modification represents a decrease."""
    try:
        orig_val = _extract_number(str(mod.original_value))
        actual_val = _extract_number(str(mod.actual_value))
        
        if orig_val is not None and actual_val is not None:
            return actual_val < orig_val
    except:
        pass
    
    return False


def _extract_number(text: str) -> float:
    """Extract first numeric value from text."""
    import re
    match = re.search(r'[-+]?\d*\.?\d+', text)
    if match:
        return float(match.group())
    return None

