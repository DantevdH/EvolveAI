"""
Unit tests for ExerciseMatcher - Critical processing function
"""
import pytest
from unittest.mock import Mock, patch
from app.helpers.exercise.exercise_matcher import ExerciseMatcher

@pytest.mark.unit
class TestExerciseMatcher:
    """Test exercise matching functionality."""
    
    @pytest.fixture
    def exercise_matcher(self):
        """Create ExerciseMatcher instance."""
        return ExerciseMatcher()
    
    @pytest.fixture
    def mock_exercises(self):
        """Mock exercise data."""
        return [
            {
                "id": "1",
                "name": "Bench Press",
                "main_muscle": "Pectoralis Major",
                "equipment": "Barbell",
                "popularity": 1
            },
            {
                "id": "2",
                "name": "Dumbbell Bench Press",
                "main_muscle": "Pectoralis Major",
                "equipment": "Dumbbell",
                "popularity": 1
            },
            {
                "id": "3",
                "name": "Push Up",
                "main_muscle": "Pectoralis Major",
                "equipment": "Bodyweight",
                "popularity": 2
            }
        ]
    
    def test_match_exact_name(self, exercise_matcher, mock_exercises):
        """Test matching exercise with exact name."""
        with patch.object(exercise_matcher, '_get_candidates_by_metadata', return_value=mock_exercises):
            matched, score, status = exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name="Bench Press",
                main_muscle="Pectoralis Major",
                equipment="Barbell"
            )
            
            assert matched is not None
            assert matched["name"] == "Bench Press"
            assert score > 0.8  # High similarity for exact match
            assert status in ["matched", "low_confidence"]
    
    def test_match_similar_name(self, exercise_matcher, mock_exercises):
        """Test matching exercise with similar name."""
        with patch.object(exercise_matcher, '_get_candidates_by_metadata', return_value=mock_exercises):
            matched, score, status = exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name="Bench Pressing",
                main_muscle="Pectoralis Major",
                equipment="Barbell"
            )
            
            # Should still match despite slight name difference
            assert matched is not None
            assert score > 0.5
    
    def test_no_match_when_no_candidates(self, exercise_matcher):
        """Test that no match is returned when no candidates exist."""
        with patch.object(exercise_matcher, '_get_candidates_by_metadata', return_value=[]):
            matched, score, status = exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name="Unknown Exercise",
                main_muscle="Unknown Muscle",
                equipment="Unknown Equipment"
            )
            
            assert matched is None
            assert status == "no_match"
    
    def test_match_handles_empty_strings(self, exercise_matcher):
        """Test that matcher handles empty strings gracefully."""
        with patch.object(exercise_matcher, '_get_candidates_by_metadata', return_value=[]):
            matched, score, status = exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name="",
                main_muscle="",
                equipment=""
            )
            
            # Should not crash, return no_match
            assert status == "no_match" or matched is None
    
    def test_match_returns_similarity_score(self, exercise_matcher, mock_exercises):
        """Test that match returns a valid similarity score."""
        with patch.object(exercise_matcher, '_get_candidates_by_metadata', return_value=mock_exercises):
            matched, score, status = exercise_matcher.match_ai_exercise_to_database(
                ai_exercise_name="Bench Press",
                main_muscle="Pectoralis Major",
                equipment="Barbell"
            )
            
            assert isinstance(score, float)
            assert 0.0 <= score <= 1.0

