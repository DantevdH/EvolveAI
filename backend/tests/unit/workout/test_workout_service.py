"""
Unit tests for WorkoutService.

Tests the simplified workout service that uses only the FitnessCoach (premium tier).
"""

import pytest
from unittest.mock import Mock, patch
from core.workout.workout_service import WorkoutService, create_workout_service
from core.workout.schemas import UserProfileSchema, WorkoutPlanSchema


class TestWorkoutService:
    """Test the WorkoutService class."""
    
    @pytest.fixture
    def mock_fitness_coach(self):
        """Create a mocked FitnessCoach."""
        mock_coach = Mock()
        mock_coach.generate_workout_plan.return_value = Mock(spec=WorkoutPlanSchema)
        return mock_coach
    
    @pytest.fixture
    def workout_service(self, mock_fitness_coach):
        """Create WorkoutService with mocked dependencies."""
        with patch('core.workout.workout_service.FitnessCoach', return_value=mock_fitness_coach):
            return WorkoutService()
    
    @pytest.fixture
    def sample_user_profile(self):
        """Create a sample user profile for testing."""
        return UserProfileSchema(
            primary_goal="Strength Training",
            primary_goal_description="Build muscle and increase strength",
            experience_level="Intermediate",
            days_per_week=4,
            minutes_per_session=60,
            equipment="Home Gym",
            age=28,
            weight=75.0,
            weight_unit="kg",
            height=180.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="Focus on compound movements"
        )
    
    @pytest.fixture
    def mock_openai_client(self):
        """Create a mocked OpenAI client."""
        return Mock()
    
    def test_workout_service_initialization(self, mock_fitness_coach):
        """Test WorkoutService initialization."""
        with patch('core.workout.workout_service.FitnessCoach', return_value=mock_fitness_coach):
            service = WorkoutService()
            
            assert service.fitness_coach == mock_fitness_coach
            assert service.stats["requests"] == 0
            assert service.stats["errors"] == 0
    
    def test_generate_workout_plan_success(self, workout_service, sample_user_profile, mock_openai_client):
        """Test successful workout plan generation."""
        # Mock the workout plan response
        mock_workout_plan = Mock(spec=WorkoutPlanSchema)
        workout_service.fitness_coach.generate_workout_plan.return_value = mock_workout_plan
        
        result = workout_service.generate_workout_plan(sample_user_profile, mock_openai_client)
        
        # Verify the result structure
        assert result["status"] == "success"
        assert result["message"] == "Enhanced workout plan generated using AI Fitness Coach"
        assert result["workout_plan"] == mock_workout_plan
        assert result["enhancements"]["knowledge_base_used"] is True
        assert result["enhancements"]["rag_enhanced"] is True
        assert result["enhancements"]["context_aware"] is True
        assert result["metadata"]["agent_used"] == "Fitness Coach"
        assert result["metadata"]["knowledge_sources"] == "Fitness database + OpenAI"
        assert result["metadata"]["generation_method"] == "RAG-enhanced LLM"
        
        # Verify FitnessCoach was called
        workout_service.fitness_coach.generate_workout_plan.assert_called_once_with(
            sample_user_profile, mock_openai_client
        )
        
        # Verify stats were updated
        assert workout_service.stats["requests"] == 1
        assert workout_service.stats["errors"] == 0
    
    def test_generate_workout_plan_error(self, workout_service, sample_user_profile, mock_openai_client):
        """Test workout plan generation with error."""
        # Mock FitnessCoach to raise an exception
        workout_service.fitness_coach.generate_workout_plan.side_effect = Exception("FitnessCoach error")
        
        # Should raise the exception
        with pytest.raises(Exception, match="FitnessCoach error"):
            workout_service.generate_workout_plan(sample_user_profile, mock_openai_client)
        
        # Verify stats were updated
        assert workout_service.stats["requests"] == 0
        assert workout_service.stats["errors"] == 1
    
    def test_get_service_stats(self, workout_service):
        """Test getting service statistics."""
        # Set some stats
        workout_service.stats["requests"] = 5
        workout_service.stats["errors"] = 1
        
        stats = workout_service.get_service_stats()
        
        assert stats["total_requests"] == 5
        assert stats["errors"] == 1
        assert stats["success_rate"] == 0.8  # (5-1)/5 = 0.8
    
    def test_get_service_stats_no_requests(self, workout_service):
        """Test getting service statistics with no requests."""
        stats = workout_service.get_service_stats()
        
        assert stats["total_requests"] == 0
        assert stats["errors"] == 0
        assert stats["success_rate"] == 0
    
    def test_reset_stats(self, workout_service):
        """Test resetting service statistics."""
        # Set some stats
        workout_service.stats["requests"] = 10
        workout_service.stats["errors"] = 2
        
        # Reset stats
        workout_service.reset_stats()
        
        assert workout_service.stats["requests"] == 0
        assert workout_service.stats["errors"] == 0


class TestWorkoutServiceIntegration:
    """Test WorkoutService integration with real dependencies."""
    
    def test_create_workout_service(self):
        """Test the convenience function creates a service."""
        service = create_workout_service()
        
        assert isinstance(service, WorkoutService)
        assert hasattr(service, 'fitness_coach')
        assert hasattr(service, 'stats')
    
    def test_workout_service_with_real_fitness_coach(self):
        """Test WorkoutService with real FitnessCoach (mocked dependencies)."""
        with patch('core.workout.workout_service.FitnessCoach') as mock_fitness_coach_class:
            mock_fitness_coach = Mock()
            mock_fitness_coach_class.return_value = mock_fitness_coach
            
            service = WorkoutService()
            
            assert service.fitness_coach == mock_fitness_coach
            assert isinstance(service.stats, dict)
            assert "requests" in service.stats
            assert "errors" in service.stats


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
