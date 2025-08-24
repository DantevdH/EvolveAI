"""
Test the mock data utilities for debug mode.
"""

import sys
from pathlib import Path

# Add the backend directory to the path so we can import our modules
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from utils.mock_data import (
    create_mock_user_profile,
    create_mock_workout_plan,
    get_mock_data_summary,
    MOCK_USER_PROFILE_DATA,
    MOCK_EXERCISES
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

    def test_mock_workout_plan_creation(self):
        """Test that mock workout plan can be created."""
        workout_plan = create_mock_workout_plan()
        
        assert workout_plan is not None
        assert workout_plan.title == "Strength Builder Pro"
        assert len(workout_plan.weekly_schedules) == 1
        
        # Check weekly schedule
        weekly_schedule = workout_plan.weekly_schedules[0]
        assert weekly_schedule.week_number == 1
        assert len(weekly_schedule.daily_workouts) == 7
        
        # Check daily workouts
        monday_workout = weekly_schedule.daily_workouts[0]
        assert monday_workout.day_of_week == "Monday"
        assert not monday_workout.is_rest_day
        assert len(monday_workout.exercises) == 3
        
        tuesday_workout = weekly_schedule.daily_workouts[1]
        assert tuesday_workout.day_of_week == "Tuesday"
        assert tuesday_workout.is_rest_day

    def test_mock_exercises_data(self):
        """Test that mock exercise data is available."""
        assert len(MOCK_EXERCISES) == 5
        
        # Check specific exercises
        assert "barbell_squat" in MOCK_EXERCISES
        assert "bench_press" in MOCK_EXERCISES
        assert "deadlift" in MOCK_EXERCISES
        
        # Check exercise details
        squat = MOCK_EXERCISES["barbell_squat"]
        assert "barbell_squat_001" in squat["exercise_id"]
        assert "quads" in squat["description"].lower()

    def test_mock_data_summary(self):
        """Test that mock data summary provides useful information."""
        summary = get_mock_data_summary()
        
        assert "user_profile" in summary
        assert "workout_plan" in summary
        assert "exercises" in summary
        assert "usage" in summary
        assert "Compound lower body exercise" in summary["exercises"][0]["description"]

    def test_mock_workout_plan_with_custom_request(self):
        """Test that mock workout plan can be created with custom request."""
        custom_request = {"primaryGoal": "Weight Loss"}
        workout_plan = create_mock_workout_plan(custom_request)
        
        # Should still create a valid workout plan
        assert workout_plan is not None
        assert workout_plan.title == "Strength Builder Pro"

class TestMockDataIntegration:
    """Test mock data integration with schemas."""

    def test_mock_data_uses_correct_schemas(self):
        """Test that mock data uses the correct Pydantic schemas."""
        from core.workout.schemas import UserProfileSchema, WorkoutPlanSchema
        
        # User profile should be valid
        user_profile = create_mock_user_profile()
        assert isinstance(user_profile, UserProfileSchema)
        
        # Workout plan should be valid
        workout_plan = create_mock_workout_plan()
        assert isinstance(workout_plan, WorkoutPlanSchema)

    def test_mock_data_validation(self):
        """Test that mock data passes Pydantic validation."""
        # This should not raise any validation errors
        user_profile = create_mock_user_profile()
        workout_plan = create_mock_workout_plan()
        
        # If we get here, validation passed
        assert True
