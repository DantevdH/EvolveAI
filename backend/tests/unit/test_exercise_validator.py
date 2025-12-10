"""
Unit tests for ExerciseValidator - Critical processing function
"""
import pytest
from unittest.mock import Mock, patch
from app.helpers.exercise.exercise_validator import ExerciseValidator

@pytest.mark.unit
class TestExerciseValidator:
    """Test exercise validation functionality."""
    
    @pytest.fixture
    def exercise_validator(self):
        """Create ExerciseValidator instance."""
        return ExerciseValidator()
    
    @pytest.fixture
    def sample_training_plan(self):
        """Sample training plan for testing."""
        return {
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "strength_exercises": [
                                {
                                    "name": "Bench Press",
                                    "main_muscle": "Pectoralis Major",
                                    "equipment": "Barbell"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    
    def test_validate_training_plan_structure(self, exercise_validator, sample_training_plan):
        """Test that validator accepts valid training plan structure."""
        with patch.object(exercise_validator.exercise_matcher, 'match_ai_exercise_to_database') as mock_match:
            mock_match.return_value = (
                {"id": "1", "name": "Bench Press"},
                0.9,
                "matched"
            )
            
            validated_plan, messages = exercise_validator.validate_training_plan(sample_training_plan)
            
            assert isinstance(validated_plan, dict)
            assert isinstance(messages, list)
    
    def test_validator_handles_missing_exercises(self, exercise_validator):
        """Test that validator handles missing exercises gracefully."""
        plan_with_missing = {
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "strength_exercises": [
                                {
                                    "name": "Non-existent Exercise",
                                    "main_muscle": "Unknown",
                                    "equipment": "Unknown"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        with patch.object(exercise_validator.exercise_matcher, 'match_ai_exercise_to_database') as mock_match:
            mock_match.return_value = (None, 0.0, "no_match")
            
            validated_plan, messages = exercise_validator.validate_training_plan(plan_with_missing)
            
            # Should still return a plan (possibly with modifications)
            assert isinstance(validated_plan, dict)
            assert isinstance(messages, list)
    
    def test_validator_handles_empty_plan(self, exercise_validator):
        """Test that validator handles empty training plan."""
        empty_plan = {"weekly_schedules": []}
        
        validated_plan, messages = exercise_validator.validate_training_plan(empty_plan)
        
        assert isinstance(validated_plan, dict)
        assert isinstance(messages, list)
    
    def test_clear_cache_functionality(self, exercise_validator):
        """Test that cache clearing works."""
        # Populate cache
        exercise_validator._similarity_cache["test"] = "value"
        exercise_validator._candidate_cache["test"] = "value"
        
        # Clear cache
        exercise_validator.clear_cache()
        
        assert len(exercise_validator._similarity_cache) == 0
        assert len(exercise_validator._candidate_cache) == 0
    
    def test_get_cache_stats(self, exercise_validator):
        """Test that cache stats are returned correctly."""
        exercise_validator._similarity_cache["key1"] = "value1"
        exercise_validator._candidate_cache["key2"] = "value2"
        
        stats = exercise_validator.get_cache_stats()
        
        assert "similarity_cache_size" in stats
        assert "candidate_cache_size" in stats
        assert stats["similarity_cache_size"] == 1
        assert stats["candidate_cache_size"] == 1

