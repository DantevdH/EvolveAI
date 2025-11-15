"""
Simplified unit tests for training models and schemas.

This file contains only the essential tests that work with the current schema structure.
"""

import pytest
from pydantic import ValidationError
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from core.training.helpers.schemas import UserProfileSchema
from core.training.helpers.training_schemas import (
    DayOfWeek,
    TrainingPlan,
    DailyTraining,
    StrengthExercise,
    EnduranceSession,
    WeeklySchedule,
)


class TestDayOfWeek:
    """Test the DayOfWeek enum."""

    def test_day_of_week_values(self):
        """Test that all expected days are present."""
        expected_days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        for day in expected_days:
            assert day in DayOfWeek.__members__.values()

    def test_day_of_week_enum_behavior(self):
        """Test enum behavior and comparisons."""
        monday = DayOfWeek.MONDAY
        assert monday == "Monday"
        assert monday.value == "Monday"


class TestUserProfileSchema:
    """Test the UserProfileSchema model."""

    def test_valid_profile(self):
        """Test creating a valid user profile."""
        profile = UserProfileSchema(
            primary_goal="strength",
            primary_goal_description="Build muscle and increase strength",
            experience_level="intermediate",
            days_per_week=3,
            minutes_per_session=60,
            equipment="barbell, dumbbells",
            age=25,
            weight=75.5,
            weight_unit="kg",
            height=180,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="",
        )

        assert profile.age == 25
        assert profile.gender == "male"
        assert profile.height == 180
        assert profile.weight == 75.5
        assert profile.experience_level == "intermediate"
        assert profile.primary_goal == "strength"
        assert profile.days_per_week == 3
        assert profile.minutes_per_session == 60
        assert profile.equipment == "barbell, dumbbells"
        assert profile.has_limitations == False

    def test_serialization(self):
        """Test that the model serializes correctly."""
        profile = UserProfileSchema(
            primary_goal="strength",
            primary_goal_description="Build muscle and increase strength",
            experience_level="intermediate",
            days_per_week=3,
            minutes_per_session=60,
            equipment="barbell, dumbbells",
            age=25,
            weight=75.5,
            weight_unit="kg",
            height=180,
            height_unit="cm",
            gender="male",
            has_limitations=False,
        )

        # Test dict serialization
        profile_dict = profile.model_dump()
        assert isinstance(profile_dict, dict)
        assert profile_dict["age"] == 25
        assert profile_dict["primary_goal"] == "strength"

        # Test JSON serialization
        profile_json = profile.model_dump_json()
        assert isinstance(profile_json, str)
        assert "strength" in profile_json


class TestStrengthExercise:
    """Test the StrengthExercise model."""

    def test_valid_exercise(self):
        """Test creating a valid exercise."""
        exercise = StrengthExercise(
            daily_training_id=1,
            exercise_id=101,
            sets=3,
            reps=[8, 8, 8],
            weight=[0.0, 0.0, 0.0],
            weight_1rm=[75, 70, 65],
        )

        assert exercise.exercise_id == 101
        assert exercise.sets == 3
        assert exercise.reps == [8, 8, 8]
        assert exercise.weight_1rm == [75, 70, 65]
        assert exercise.weight == [0.0, 0.0, 0.0]
        assert exercise.completed == False  # Default value

    def test_serialization(self):
        """Test that the model serializes correctly."""
        exercise = StrengthExercise(
            daily_training_id=1,
            exercise_id=101,
            sets=3,
            reps=[8, 8, 8],
            weight=[0.0, 0.0, 0.0],
            weight_1rm=[75, 70, 65],
        )

        # Test dict serialization
        exercise_dict = exercise.model_dump()
        assert isinstance(exercise_dict, dict)
        assert exercise_dict["exercise_id"] == 101
        assert exercise_dict["sets"] == 3

        # Test JSON serialization
        exercise_json = exercise.model_dump_json()
        assert isinstance(exercise_json, str)
        assert "101" in exercise_json


class TestDailyTraining:
    """Test the DailyTraining model."""

    def test_valid_training_day(self):
        """Test creating a valid training day."""
        training = DailyTraining(
            weekly_schedule_id=1,
            day_of_week=DayOfWeek.MONDAY,
            is_rest_day=False,
            training_type="strength",
            strength_exercises=[
                StrengthExercise(
                    daily_training_id=1,
                    exercise_id=101,
                    sets=3,
                    reps=[8, 8, 8],
                    weight=[0.0, 0.0, 0.0],
                    weight_1rm=[75, 70, 65],
                )
            ],
        )

        assert training.day_of_week == DayOfWeek.MONDAY
        assert training.is_rest_day is False
        assert training.training_type == "strength"
        assert len(training.strength_exercises) == 1
        assert len(training.endurance_sessions) == 0

    def test_valid_rest_day(self):
        """Test creating a valid rest day."""
        training = DailyTraining(
            weekly_schedule_id=1,
            day_of_week=DayOfWeek.TUESDAY,
            is_rest_day=True,
            training_type="recovery",
        )

        assert training.day_of_week == DayOfWeek.TUESDAY
        assert training.is_rest_day is True
        assert training.training_type == "recovery"
        assert len(training.strength_exercises) == 0
        assert len(training.endurance_sessions) == 0

    def test_serialization(self):
        """Test that the model serializes correctly."""
        training = DailyTraining(
            weekly_schedule_id=1,
            day_of_week=DayOfWeek.MONDAY,
            is_rest_day=False,
            training_type="strength",
        )

        # Test dict serialization
        training_dict = training.model_dump()
        assert isinstance(training_dict, dict)
        assert training_dict["day_of_week"] == "Monday"
        assert training_dict["is_rest_day"] is False
        assert training_dict["training_type"] == "strength"


class TestWeeklySchedule:
    """Test the WeeklySchedule model."""

    def test_valid_weekly_schedule(self):
        """Test creating a valid weekly schedule."""
        schedule = WeeklySchedule(
            training_plan_id=1,
            week_number=1,
            daily_trainings=[
                DailyTraining(
                    weekly_schedule_id=1,
                    day_of_week=DayOfWeek.MONDAY,
                    is_rest_day=False,
                    training_type="strength",
                ),
                DailyTraining(
                    weekly_schedule_id=1,
                    day_of_week=DayOfWeek.TUESDAY,
                    is_rest_day=True,
                    training_type="recovery",
                ),
            ],
        )

        assert schedule.week_number == 1
        assert len(schedule.daily_trainings) == 2
        assert schedule.daily_trainings[0].day_of_week == DayOfWeek.MONDAY
        assert schedule.daily_trainings[1].day_of_week == DayOfWeek.TUESDAY

    def test_serialization(self):
        """Test that the model serializes correctly."""
        schedule = WeeklySchedule(training_plan_id=1, week_number=1)

        # Test dict serialization
        schedule_dict = schedule.model_dump()
        assert isinstance(schedule_dict, dict)
        assert schedule_dict["week_number"] == 1
        assert schedule_dict["training_plan_id"] == 1


class TestTrainingPlan:
    """Test the TrainingPlan model."""

    def test_valid_training_plan(self):
        """Test creating a valid training plan."""
        plan = TrainingPlan(
            user_profile_id=123,
            title="Strength Training Plan",
            summary="A comprehensive strength training program",
            weekly_schedules=[
                WeeklySchedule(
                    training_plan_id=1,
                    week_number=1,
                    daily_trainings=[
                        DailyTraining(
                            weekly_schedule_id=1,
                            day_of_week=DayOfWeek.MONDAY,
                            is_rest_day=False,
                            training_type="strength",
                        )
                    ],
                )
            ],
        )

        assert plan.user_profile_id == 123
        assert plan.title == "Strength Training Plan"
        assert plan.summary == "A comprehensive strength training program"
        assert len(plan.weekly_schedules) == 1
        assert plan.weekly_schedules[0].week_number == 1

    def test_serialization(self):
        """Test that the model serializes correctly."""
        plan = TrainingPlan(
            user_profile_id=123, title="Test Plan", summary="A test training plan"
        )

        # Test dict serialization
        plan_dict = plan.model_dump()
        assert isinstance(plan_dict, dict)
        assert plan_dict["user_profile_id"] == 123
        assert plan_dict["title"] == "Test Plan"

        # Test JSON serialization
        plan_json = plan.model_dump_json()
        assert isinstance(plan_json, str)
        assert "Test Plan" in plan_json


class TestEnduranceSession:
    """Test the EnduranceSession model."""

    def test_valid_endurance_session(self):
        """Test creating a valid endurance session."""
        session = EnduranceSession(
            daily_training_id=1,
            sport_type="running",
            training_volume=30.0,
            unit="minutes",
        )

        assert session.sport_type == "running"
        assert session.training_volume == 30.0
        assert session.unit == "minutes"

    def test_serialization(self):
        """Test that the model serializes correctly."""
        session = EnduranceSession(
            daily_training_id=1, sport_type="cycling", training_volume=20.0, unit="km"
        )

        # Test dict serialization
        session_dict = session.model_dump()
        assert isinstance(session_dict, dict)
        assert session_dict["sport_type"] == "cycling"
        assert session_dict["training_volume"] == 20.0
        assert session_dict["unit"] == "km"
