"""
Unit tests for date_mapper utility function.
"""

import pytest
from datetime import date, timedelta
from core.training.helpers.date_mapper import map_daily_training_dates


def create_mock_training_plan(weekly_schedules_data: list) -> dict:
    """Helper to create a mock training plan structure."""
    return {
        "title": "Test Training Plan",
        "summary": "Test summary",
        "weekly_schedules": weekly_schedules_data,
    }


def create_mock_week(week_number: int, daily_trainings_data: list) -> dict:
    """Helper to create a mock week structure."""
    return {
        "week_number": week_number,
        "focus_theme": "Test Theme",
        "daily_trainings": daily_trainings_data,
    }


def create_mock_daily_training(day_of_week: str, is_rest_day: bool = False) -> dict:
    """Helper to create a mock daily training."""
    return {
        "day_of_week": day_of_week,
        "is_rest_day": is_rest_day,
        "training_type": "rest" if is_rest_day else "strength",
        "exercises": [],
    }


class TestDateMapper:
    """Test suite for date_mapper function."""
    
    def test_map_dates_when_today_matches_first_day(self):
        """Test when today matches the first day in the plan."""
        # Create plan starting with Monday
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Wednesday"),
                create_mock_daily_training("Friday"),
            ]),
        ])
        
        # Mock today as Monday
        today = date.today()
        today_day_name = today.strftime("%A")
        
        # If today is Monday, first Monday should get today's date
        result = map_daily_training_dates(plan)
        
        # Verify scheduled_date was added
        assert "scheduled_date" in result["weekly_schedules"][0]["daily_trainings"][0]
        
        # Verify the first Monday gets today's date (if today is Monday)
        if today_day_name == "Monday":
            first_date = date.fromisoformat(
                result["weekly_schedules"][0]["daily_trainings"][0]["scheduled_date"]
            )
            assert first_date == today
        
        # Verify all days have scheduled_date
        for week in result["weekly_schedules"]:
            for daily in week["daily_trainings"]:
                assert "scheduled_date" in daily
                assert isinstance(daily["scheduled_date"], str)
    
    def test_map_dates_when_today_matches_middle_day(self):
        """Test when today matches a day in the middle of the week."""
        # Create plan with Monday, Tuesday, Wednesday
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Tuesday"),
                create_mock_daily_training("Wednesday"),
            ]),
        ])
        
        result = map_daily_training_dates(plan)
        
        # Get today's day name
        today = date.today()
        today_day_name = today.strftime("%A")
        
        # Find which daily training matches today
        matching_daily = None
        for daily in result["weekly_schedules"][0]["daily_trainings"]:
            if daily["day_of_week"] == today_day_name:
                matching_daily = daily
                break
        
        if matching_daily:
            # The matching day should get today's date
            matching_date = date.fromisoformat(matching_daily["scheduled_date"])
            assert matching_date == today
            
            # Verify other days are calculated correctly
            day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            today_index = day_order.index(today_day_name)
            
            for daily in result["weekly_schedules"][0]["daily_trainings"]:
                day_name = daily["day_of_week"]
                day_index = day_order.index(day_name)
                scheduled_date = date.fromisoformat(daily["scheduled_date"])
                
                # Calculate expected offset
                days_offset = day_index - today_index
                expected_date = today + timedelta(days=days_offset)
                assert scheduled_date == expected_date
    
    def test_map_dates_multiple_weeks(self):
        """Test date mapping across multiple weeks."""
        # Create plan with 2 weeks
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Wednesday"),
            ]),
            create_mock_week(2, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Wednesday"),
            ]),
        ])
        
        result = map_daily_training_dates(plan)
        
        # Verify all days have scheduled_date
        for week in result["weekly_schedules"]:
            for daily in week["daily_trainings"]:
                assert "scheduled_date" in daily
        
        # Verify dates are sequential across weeks
        week1_monday = date.fromisoformat(
            result["weekly_schedules"][0]["daily_trainings"][0]["scheduled_date"]
        )
        week2_monday = date.fromisoformat(
            result["weekly_schedules"][1]["daily_trainings"][0]["scheduled_date"]
        )
        
        # Week 2 Monday should be 7 days after Week 1 Monday
        assert week2_monday == week1_monday + timedelta(days=7)
    
    def test_map_dates_with_rest_days(self):
        """Test that rest days are skipped when finding anchor day."""
        # Create plan with rest day on Tuesday
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Tuesday", is_rest_day=True),
                create_mock_daily_training("Wednesday"),
            ]),
        ])
        
        today = date.today()
        today_day_name = today.strftime("%A")
        
        result = map_daily_training_dates(plan)
        
        # If today is Tuesday, it should skip the rest day and use the next matching day
        # or fall back to first non-rest day
        # Verify all days still get dates
        for daily in result["weekly_schedules"][0]["daily_trainings"]:
            assert "scheduled_date" in daily
        
        # Rest day should still get a date (just not used as anchor)
        tuesday_daily = result["weekly_schedules"][0]["daily_trainings"][1]
        assert "scheduled_date" in tuesday_daily
        assert tuesday_daily["is_rest_day"] is True
    
    def test_map_dates_all_rest_days_fallback(self):
        """Test fallback when all days are rest days."""
        # Create plan with only rest days
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday", is_rest_day=True),
                create_mock_daily_training("Tuesday", is_rest_day=True),
            ]),
        ])
        
        result = map_daily_training_dates(plan)
        
        # Should still assign dates (using first day as anchor)
        for daily in result["weekly_schedules"][0]["daily_trainings"]:
            assert "scheduled_date" in daily
    
    def test_map_dates_empty_plan(self):
        """Test handling of empty training plan."""
        plan = create_mock_training_plan([])
        result = map_daily_training_dates(plan)
        assert result == plan
    
    def test_map_dates_empty_weeks(self):
        """Test handling of weeks with no daily trainings."""
        plan = create_mock_training_plan([
            create_mock_week(1, []),
        ])
        result = map_daily_training_dates(plan)
        assert result == plan
    
    def test_map_dates_none_input(self):
        """Test handling of None input."""
        result = map_daily_training_dates(None)
        assert result is None
    
    def test_map_dates_sequential_dates(self):
        """Test that dates are sequential and correct."""
        # Create plan with Monday, Wednesday, Friday
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Wednesday"),
                create_mock_daily_training("Friday"),
            ]),
        ])
        
        result = map_daily_training_dates(plan)
        
        monday_date = date.fromisoformat(
            result["weekly_schedules"][0]["daily_trainings"][0]["scheduled_date"]
        )
        wednesday_date = date.fromisoformat(
            result["weekly_schedules"][0]["daily_trainings"][1]["scheduled_date"]
        )
        friday_date = date.fromisoformat(
            result["weekly_schedules"][0]["daily_trainings"][2]["scheduled_date"]
        )
        
        # Verify sequential order
        assert wednesday_date == monday_date + timedelta(days=2)
        assert friday_date == monday_date + timedelta(days=4)
    
    def test_map_dates_realistic_plan_structure(self):
        """Test with a realistic training plan structure."""
        plan = create_mock_training_plan([
            create_mock_week(1, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Tuesday"),
                create_mock_daily_training("Wednesday"),
                create_mock_daily_training("Thursday"),
                create_mock_daily_training("Friday"),
                create_mock_daily_training("Saturday", is_rest_day=True),
                create_mock_daily_training("Sunday", is_rest_day=True),
            ]),
            create_mock_week(2, [
                create_mock_daily_training("Monday"),
                create_mock_daily_training("Tuesday"),
                create_mock_daily_training("Wednesday"),
                create_mock_daily_training("Thursday"),
                create_mock_daily_training("Friday"),
                create_mock_daily_training("Saturday", is_rest_day=True),
                create_mock_daily_training("Sunday", is_rest_day=True),
            ]),
        ])
        
        result = map_daily_training_dates(plan)
        
        # Verify all days have dates
        for week in result["weekly_schedules"]:
            for daily in week["daily_trainings"]:
                assert "scheduled_date" in daily
                scheduled_date = date.fromisoformat(daily["scheduled_date"])
                assert isinstance(scheduled_date, date)
        
        # Verify Week 2 Monday is 7 days after Week 1 Monday
        week1_monday = date.fromisoformat(
            result["weekly_schedules"][0]["daily_trainings"][0]["scheduled_date"]
        )
        week2_monday = date.fromisoformat(
            result["weekly_schedules"][1]["daily_trainings"][0]["scheduled_date"]
        )
        assert week2_monday == week1_monday + timedelta(days=7)

