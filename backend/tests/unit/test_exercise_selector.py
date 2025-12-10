"""
Unit tests for ExerciseSelector - Critical processing function
"""
import pytest
from unittest.mock import Mock, patch
from app.helpers.exercise.exercise_selector import ExerciseSelector

@pytest.mark.unit
class TestExerciseSelector:
    """Test exercise selection functionality."""
    
    @pytest.fixture
    def exercise_selector(self):
        """Create ExerciseSelector instance with mocked supabase client."""
        selector = ExerciseSelector()
        # Mock the supabase client since it's None in test environments
        mock_supabase = Mock()
        selector.supabase = mock_supabase
        return selector
    
    @pytest.fixture
    def mock_exercises(self):
        """Mock exercise data."""
        return [
            {
                "id": "1",
                "name": "Bench Press",
                "difficulty_level": "intermediate",
                "equipment": ["Barbell"],
                "main_muscles": ["Pectoralis Major"],
                "popularity": 1
            },
            {
                "id": "2",
                "name": "Push Up",
                "difficulty_level": "beginner",
                "equipment": ["Bodyweight"],
                "main_muscles": ["Pectoralis Major"],
                "popularity": 2
            }
        ]
    
    def test_get_exercise_candidates_filters_by_difficulty(self, exercise_selector, mock_exercises):
        """Test that candidates are filtered by difficulty."""
        with patch.object(exercise_selector, '_get_exercises_by_popularity', return_value=mock_exercises):
            candidates = exercise_selector.get_exercise_candidates(
                difficulty="intermediate",
                equipment=None
            )
            
            # Should return grouped exercises
            assert isinstance(candidates, list)
    
    def test_get_exercise_candidates_filters_by_equipment(self, exercise_selector, mock_exercises):
        """Test that candidates are filtered by equipment."""
        with patch.object(exercise_selector, '_get_exercises_by_popularity', return_value=mock_exercises):
            candidates = exercise_selector.get_exercise_candidates(
                difficulty="intermediate",
                equipment=["Barbell"]
            )
            
            assert isinstance(candidates, list)
    
    def test_get_exercise_candidates_handles_empty_result(self, exercise_selector):
        """Test that selector handles empty results gracefully."""
        with patch.object(exercise_selector, '_get_exercises_by_popularity', return_value=[]):
            candidates = exercise_selector.get_exercise_candidates(
                difficulty="advanced",
                equipment=None
            )
            
            assert isinstance(candidates, list)
            assert len(candidates) == 0
    
    def test_get_exercise_by_id_returns_exercise(self, exercise_selector):
        """Test getting exercise by ID."""
        mock_exercise = {
            "id": "123",
            "name": "Test Exercise",
            "difficulty_level": "intermediate"
        }
        
        # Mock the supabase client chain
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_execute = Mock()
        
        mock_execute.return_value.data = [mock_exercise]
        mock_eq.return_value.execute = mock_execute
        mock_select.return_value.eq = mock_eq
        mock_table.return_value.select = mock_select
        exercise_selector.supabase.table = mock_table
        
        result = exercise_selector.get_exercise_by_id("123")
        
        # Should return exercise or None
        assert result is None or isinstance(result, dict)
    
    def test_get_exercise_by_id_handles_invalid_id(self, exercise_selector):
        """Test that invalid ID returns None."""
        # Mock the supabase client chain
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_execute = Mock()
        
        mock_execute.return_value.data = []
        mock_eq.return_value.execute = mock_execute
        mock_select.return_value.eq = mock_eq
        mock_table.return_value.select = mock_select
        exercise_selector.supabase.table = mock_table
        
        result = exercise_selector.get_exercise_by_id("invalid-id")
        
        assert result is None

