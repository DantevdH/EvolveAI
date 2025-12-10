"""
Unit tests for insights_service module.
Tests training frequency, volume progress, and training intensity calculations.
"""

import pytest
from typing import Optional
from datetime import date, timedelta, datetime
from app.services.insights_service import InsightsService


def create_mock_training_plan(
    weekly_schedules_data: list,
    created_at: Optional[str] = None
) -> dict:
    """Helper to create a mock training plan structure."""
    plan = {
        "id": 1,
        "user_profile_id": 1,
        "title": "Test Training Plan",
        "summary": "Test summary",
        "weekly_schedules": weekly_schedules_data,
    }
    if created_at:
        plan["created_at"] = created_at
    return plan


def create_mock_week(
    week_number: int,
    daily_trainings_data: list,
    completed: bool = False
) -> dict:
    """Helper to create a mock week structure."""
    return {
        "week_number": week_number,
        "focus_theme": "Test Theme",
        "completed": completed,
        "daily_trainings": daily_trainings_data,
    }


def create_mock_daily_training(
    day_of_week: str,
    scheduled_date: Optional[str] = None,
    is_rest_day: bool = False,
    completed: bool = False,
    session_rpe: Optional[float] = None,
    exercises: Optional[list] = None
) -> dict:
    """Helper to create a mock daily training."""
    daily = {
        "day_of_week": day_of_week,
        "is_rest_day": is_rest_day,
        "completed": completed,
        "training_type": "rest" if is_rest_day else "strength",
    }
    if scheduled_date:
        daily["scheduled_date"] = scheduled_date
    if session_rpe is not None:
        daily["session_rpe"] = session_rpe
    if exercises:
        daily["strength_exercise"] = exercises
    else:
        daily["strength_exercise"] = []
    return daily


def create_mock_strength_exercise(
    weights: list,
    reps: list,
    completed: bool = False
) -> dict:
    """Helper to create a mock strength exercise."""
    return {
        "completed": completed,
        "weights": weights,
        "reps": reps,
        "sets": len(weights),
    }


class TestTrainingFrequency:
    """Test suite for training frequency calculation."""
    
    def test_training_frequency_only_past_trainings(self):
        """Test that only past trainings are counted."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=yesterday.isoformat(),
                    completed=True
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=today.isoformat(),
                    completed=False
                ),
                create_mock_daily_training(
                    "Wednesday",
                    scheduled_date=tomorrow.isoformat(),
                    completed=False
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Should count 2 past trainings (yesterday and today)
        # 1 completed out of 2 past = 1/2
        assert "1/2" in result or "Trained 1/2" in result
        assert "below goal" in result
    
    def test_training_frequency_with_plan_created_at(self):
        """Test that trainings before plan creation are excluded."""
        today = date.today()
        plan_created = today - timedelta(days=3)  # Plan created 3 days ago
        before_creation = today - timedelta(days=5)  # Training 5 days ago (before plan)
        after_creation = today - timedelta(days=1)  # Training 1 day ago (after plan)
        
        plan = create_mock_training_plan(
            [
                create_mock_week(1, [
                    create_mock_daily_training(
                        "Monday",
                        scheduled_date=before_creation.isoformat(),
                        completed=False
                    ),
                    create_mock_daily_training(
                        "Wednesday",
                        scheduled_date=after_creation.isoformat(),
                        completed=True
                    ),
                    create_mock_daily_training(
                        "Friday",
                        scheduled_date=today.isoformat(),
                        completed=False
                    ),
                ]),
            ],
            created_at=plan_created.isoformat()
        )
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Should only count trainings after plan creation (Wednesday and Friday)
        # 1 completed out of 2 = 1/2
        assert "1/2" in result or "Trained 1/2" in result
        # Monday training (before plan creation) should not be counted
    
    def test_training_frequency_all_completed(self):
        """Test when all past trainings are completed."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=two_days_ago.isoformat(),
                    completed=True
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=yesterday.isoformat(),
                    completed=True
                ),
                create_mock_daily_training(
                    "Wednesday",
                    scheduled_date=today.isoformat(),
                    completed=True
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # All 3 past trainings completed = 3/3
        assert "3/3" in result or "Trained 3/3" in result
        assert "on track" in result
    
    def test_training_frequency_no_past_trainings(self):
        """Test when all trainings are in the future."""
        today = date.today()
        tomorrow = today + timedelta(days=1)
        day_after = today + timedelta(days=2)
        
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=tomorrow.isoformat(),
                    completed=False
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=day_after.isoformat(),
                    completed=False
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # No past trainings to evaluate
        assert "No past trainings to evaluate yet" in result
    
    def test_training_frequency_rest_days_excluded(self):
        """Test that rest days are excluded from frequency calculation."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=yesterday.isoformat(),
                    is_rest_day=True,
                    completed=True
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=today.isoformat(),
                    completed=True
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Only Tuesday should be counted (Monday is rest day)
        # 1/1 = on track
        assert "1/1" in result or "Trained 1/1" in result
        assert "on track" in result
    
    def test_training_frequency_consistency_calculation(self):
        """Test consistency calculation across multiple weeks."""
        today = date.today()
        week1_day1 = today - timedelta(days=14)
        week1_day2 = today - timedelta(days=13)
        week2_day1 = today - timedelta(days=7)
        week2_day2 = today - timedelta(days=6)
        
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=week1_day1.isoformat(),
                    completed=True
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=week1_day2.isoformat(),
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=week2_day1.isoformat(),
                    completed=True
                ),
                create_mock_daily_training(
                    "Tuesday",
                    scheduled_date=week2_day2.isoformat(),
                    completed=False
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Week 1: 2/2 = 100%, Week 2: 1/2 = 50%
        # Average: 75% = "good" consistency
        assert "good" in result.lower() or "75%" in result
    
    def test_training_frequency_no_scheduled_date(self):
        """Test handling when scheduled_date is missing."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    scheduled_date=None,  # No scheduled_date
                    completed=True
                ),
            ]),
        ])
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Should handle gracefully - no past trainings to evaluate
        assert "No past trainings to evaluate yet" in result or "No training scheduled" in result
    
    def test_training_frequency_plan_created_on_training_day(self):
        """Test edge case where plan is created on the same day as a training."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        plan = create_mock_training_plan(
            [
                create_mock_week(1, [
                    create_mock_daily_training(
                        "Monday",
                        scheduled_date=yesterday.isoformat(),
                        completed=False
                    ),
                    create_mock_daily_training(
                        "Tuesday",
                        scheduled_date=today.isoformat(),
                        completed=True
                    ),
                ]),
            ],
            created_at=today.isoformat()  # Plan created today
        )
        
        result = InsightsService.extract_training_frequency(plan)
        
        # Only Tuesday (created on same day) should be counted
        # 1/1 = on track
        assert "1/1" in result or "Trained 1/1" in result
        # Monday (before creation) should not be counted


class TestVolumeProgress:
    """Test suite for volume progress calculation."""
    
    def test_volume_progress_basic_calculation(self):
        """Test basic volume progress calculation."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100, 100],
                            reps=[10, 10, 10],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100, 100],
                            reps=[12, 12, 12],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
        ])
        
        result = InsightsService.extract_volume_progress(plan)
        
        # Week 1: 100*10*3 = 3000kg
        # Week 2: 100*12*3 = 3600kg
        # Increase: (3600-3000)/3000 = 20%
        assert "20%" in result or "+20%" in result
        assert "3600" in result or "3000" in result
    
    def test_volume_progress_insufficient_data(self):
        """Test when there's insufficient data for volume calculation."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[],
                    completed=True
                ),
            ], completed=True),
        ])
        
        result = InsightsService.extract_volume_progress(plan)
        
        # Need at least 2 completed weeks
        assert "Establishing baseline" in result or "need at least 2" in result
    
    def test_volume_progress_decreasing_volume(self):
        """Test volume progress when volume decreases."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100],
                            reps=[10, 10],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100],
                            reps=[8, 8],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
        ])
        
        result = InsightsService.extract_volume_progress(plan)
        
        # Week 1: 100*10*2 = 2000kg
        # Week 2: 100*8*2 = 1600kg
        # Decrease: (1600-2000)/2000 = -20%
        assert "-20%" in result or "decreas" in result.lower()
    
    def test_volume_progress_multiple_exercises(self):
        """Test volume calculation with multiple exercises."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100],
                            reps=[10, 10],
                            completed=True
                        ),
                        create_mock_strength_exercise(
                            weights=[50, 50],
                            reps=[15, 15],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    exercises=[
                        create_mock_strength_exercise(
                            weights=[100, 100],
                            reps=[12, 12],
                            completed=True
                        ),
                        create_mock_strength_exercise(
                            weights=[50, 50],
                            reps=[15, 15],
                            completed=True
                        )
                    ],
                    completed=True
                ),
            ], completed=True),
        ])
        
        result = InsightsService.extract_volume_progress(plan)
        
        # Week 1: (100*10*2) + (50*15*2) = 2000 + 1500 = 3500kg
        # Week 2: (100*12*2) + (50*15*2) = 2400 + 1500 = 3900kg
        # Increase: (3900-3500)/3500 = 11.4%
        assert "+" in result or "increas" in result.lower()


class TestTrainingIntensity:
    """Test suite for training intensity (RPE) calculation."""
    
    def test_training_intensity_basic_calculation(self):
        """Test basic RPE calculation."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=3.0,
                    completed=True
                ),
                create_mock_daily_training(
                    "Wednesday",
                    session_rpe=3.5,
                    completed=True
                ),
            ], completed=True),
        ])
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # Average RPE: (3.0 + 3.5) / 2 = 3.25
        assert "3.2" in result or "3.3" in result
        assert "RPE" in result
        assert trend in ["improving", "stable", "declining"]
    
    def test_training_intensity_improving_trend(self):
        """Test when RPE is decreasing (workouts feeling easier)."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=4.0,
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=3.0,
                    completed=True
                ),
            ], completed=True),
        ])
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # RPE decreased from 4.0 to 3.0 (workouts feeling easier)
        assert trend == "improving"
        assert "decreas" in result.lower() or "easier" in result.lower()
    
    def test_training_intensity_declining_trend(self):
        """Test when RPE is increasing (workouts feeling harder)."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=2.5,
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=4.0,
                    completed=True
                ),
            ], completed=True),
        ])
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # RPE increased from 2.5 to 4.0 (workouts feeling harder)
        assert trend == "declining"
        assert "increas" in result.lower() or "harder" in result.lower()
    
    def test_training_intensity_stable_trend(self):
        """Test when RPE is stable."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=3.0,
                    completed=True
                ),
            ], completed=True),
            create_mock_week(2, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=3.1,
                    completed=True
                ),
            ], completed=True),
        ])
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # RPE changed by less than 0.3 (3.0 to 3.1)
        assert trend == "stable"
        assert "stable" in result.lower()
    
    def test_training_intensity_no_rpe_data(self):
        """Test when there's no RPE data."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training(
                    "Monday",
                    session_rpe=None,
                    completed=True
                ),
            ], completed=True),
        ])
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # Should handle missing RPE gracefully
        assert "No RPE data" in result or "Unable" in result
        assert trend == "stable"
    
    def test_training_intensity_long_term_trend(self):
        """Test long-term trend calculation (last 4 weeks vs previous 4)."""
        # Create 8 weeks of data
        weeks = []
        for i in range(8):
            rpe = 4.0 - (i * 0.1)  # Decreasing RPE over time
            weeks.append(
                create_mock_week(i + 1, [
                    create_mock_daily_training(
                        "Monday",
                        session_rpe=rpe,
                        completed=True
                    ),
                ], completed=True)
            )
        
        plan = create_mock_training_plan(weeks)
        
        result, trend = InsightsService.extract_training_intensity(plan)
        
        # Recent 4 weeks have lower average RPE than previous 4
        # Should show improving trend
        assert trend in ["improving", "stable"]
        assert "RPE" in result


class TestIsTrainingInPast:
    """Test suite for _is_training_in_past helper method."""
    
    def test_is_training_in_past_with_date(self):
        """Test checking if training is in the past."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        
        past_training = create_mock_daily_training(
            "Monday",
            scheduled_date=yesterday.isoformat()
        )
        future_training = create_mock_daily_training(
            "Tuesday",
            scheduled_date=tomorrow.isoformat()
        )
        today_training = create_mock_daily_training(
            "Wednesday",
            scheduled_date=today.isoformat()
        )
        
        assert InsightsService._is_training_in_past(past_training, today) is True
        assert InsightsService._is_training_in_past(future_training, today) is False
        assert InsightsService._is_training_in_past(today_training, today) is True
    
    def test_is_training_in_past_with_plan_created_at(self):
        """Test checking with plan creation date filter."""
        today = date.today()
        plan_created = today - timedelta(days=3)
        before_creation = today - timedelta(days=5)
        after_creation = today - timedelta(days=1)
        
        training_before = create_mock_daily_training(
            "Monday",
            scheduled_date=before_creation.isoformat()
        )
        training_after = create_mock_daily_training(
            "Tuesday",
            scheduled_date=after_creation.isoformat()
        )
        
        # Training before plan creation should not count (even if in past)
        assert InsightsService._is_training_in_past(
            training_before, today, plan_created
        ) is False
        
        # Training after plan creation should count (if in past)
        assert InsightsService._is_training_in_past(
            training_after, today, plan_created
        ) is True
    
    def test_is_training_in_past_no_scheduled_date(self):
        """Test when scheduled_date is missing."""
        training = create_mock_daily_training("Monday", scheduled_date=None)
        
        # Without scheduled_date, can't determine if in past
        assert InsightsService._is_training_in_past(training) is False
    
    def test_is_training_in_past_on_creation_date(self):
        """Test edge case where training is on plan creation date."""
        today = date.today()
        
        training = create_mock_daily_training(
            "Monday",
            scheduled_date=today.isoformat()
        )
        
        # Training on creation date should count
        assert InsightsService._is_training_in_past(
            training, today, today
        ) is True


class TestDataHash:
    """Test suite for data hash calculation."""
    
    def test_calculate_data_hash_consistency(self):
        """Test that same data produces same hash."""
        metrics1 = {
            "volume_progress": "Lifted 100kg this week",
            "training_frequency": "Trained 3/4 days",
            "training_intensity": "Average RPE: 3.0/5",
            "weak_points": [],
            "top_exercises": []
        }
        
        metrics2 = {
            "volume_progress": "Lifted 100kg this week",
            "training_frequency": "Trained 3/4 days",
            "training_intensity": "Average RPE: 3.0/5",
            "weak_points": [],
            "top_exercises": []
        }
        
        hash1 = InsightsService.calculate_data_hash(metrics1)
        hash2 = InsightsService.calculate_data_hash(metrics2)
        
        assert hash1 == hash2
    
    def test_calculate_data_hash_different_data(self):
        """Test that different data produces different hash."""
        metrics1 = {
            "volume_progress": "Lifted 100kg this week",
            "training_frequency": "Trained 3/4 days",
            "training_intensity": "Average RPE: 3.0/5",
            "weak_points": [],
            "top_exercises": []
        }
        
        metrics2 = {
            "volume_progress": "Lifted 150kg this week",  # Different
            "training_frequency": "Trained 3/4 days",
            "training_intensity": "Average RPE: 3.0/5",
            "weak_points": [],
            "top_exercises": []
        }
        
        hash1 = InsightsService.calculate_data_hash(metrics1)
        hash2 = InsightsService.calculate_data_hash(metrics2)
        
        assert hash1 != hash2
    
    def test_calculate_data_hash_with_weak_points(self):
        """Test hash calculation with weak points."""
        metrics = {
            "volume_progress": "Lifted 100kg this week",
            "training_frequency": "Trained 3/4 days",
            "training_intensity": "Average RPE: 3.0/5",
            "weak_points": [
                {"muscle_group": "Chest", "issue": "plateau", "severity": "high"}
            ],
            "top_exercises": []
        }
        
        hash_result = InsightsService.calculate_data_hash(metrics)
        
        assert isinstance(hash_result, str)
        assert len(hash_result) > 0

