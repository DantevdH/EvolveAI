"""
Test the mock data utilities for debug mode.
"""

import sys
from pathlib import Path

# Add the backend directory to the path so we can import our modules
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from core.training.helpers.mock_data import (
    create_mock_user_profile,
    create_mock_training_plan,
    MOCK_USER_PROFILE_DATA,
    MOCK_STRENGTH_EXERCISES
)


class TestMockData:
    """Test mock data generation functionality."""

    def test_mock_user_profile_creation(self):
        """Test that mock user profile can be created."""
        user_profile = create_mock_user_profile()
        
        assert user_profile is not None
        assert user_profile.primary_goal == "Increase Strength"
        assert user_profile.experience_level == "Intermediate"
        assert user_profile.days_per_week == 3
        assert user_profile.equipment == "Full Gym"

    def test_mock_training_plan_creation(self):
        """Test that mock training plan can be created."""
        training_plan = create_mock_training_plan()
        
        assert training_plan is not None
        assert training_plan.title == "Strength Builder Pro"
        assert len(training_plan.weekly_schedules) == 1
        
        # Check weekly schedule
        weekly_schedule = training_plan.weekly_schedules[0]
        assert weekly_schedule.week_number == 1
        assert len(weekly_schedule.daily_trainings) == 7
        
        # Check daily trainings
        monday_training = weekly_schedule.daily_trainings[0]
        assert monday_training.day_of_week == "Monday"
        assert not monday_training.is_rest_day
        assert len(monday_training.strength_exercises) == 2
        
        tuesday_training = weekly_schedule.daily_trainings[1]
        assert tuesday_training.day_of_week == "Tuesday"
        assert tuesday_training.is_rest_day

    def test_mock_exercises_data(self):
        """Test that mock exercise data is available."""
        assert len(MOCK_STRENGTH_EXERCISES) == 5
        
        # Check specific exercises
        assert "barbell_squat" in MOCK_STRENGTH_EXERCISES
        assert "bench_press" in MOCK_STRENGTH_EXERCISES
        assert "deadlift" in MOCK_STRENGTH_EXERCISES
        
        # Check exercise details
        squat = MOCK_STRENGTH_EXERCISES["barbell_squat"]
        assert squat["exercise_id"] == 1
        assert squat["sets"] == 4

    # Removed test_mock_data_summary as get_mock_data_summary() is no longer needed

    def test_mock_training_plan_with_custom_request(self):
        """Test that mock training plan can be created with custom request."""
        custom_request = {"primaryGoal": "Weight Loss"}
        training_plan = create_mock_training_plan(custom_request)
        
        # Should still create a valid training plan
        assert training_plan is not None
        assert training_plan.title == "Strength Builder Pro"

class TestMockDataIntegration:
    """Test mock data integration with schemas."""

    def test_mock_data_uses_correct_schemas(self):
        """Test that mock data uses the correct Pydantic schemas."""
        from core.training.helpers.schemas import UserProfileSchema
        from core.training.helpers.training_schemas import TrainingPlan
        
        # User profile should be valid
        user_profile = create_mock_user_profile()
        assert isinstance(user_profile, UserProfileSchema)
        
        # Training plan should be valid
        training_plan = create_mock_training_plan()
        assert isinstance(training_plan, TrainingPlan)

    def test_mock_data_validation(self):
        """Test that mock data passes Pydantic validation."""
        # This should not raise any validation errors
        user_profile = create_mock_user_profile()
        training_plan = create_mock_training_plan()
        
        # If we get here, validation passed
        assert True
