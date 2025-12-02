"""
Utility function to map scheduled dates to daily trainings in a training plan.

This function assigns dates to daily trainings based on the current day of week,
ensuring the first matching day gets today's date and all other days are calculated
relative to that anchor point.
"""

from datetime import date, timedelta
from typing import Dict, Any, List, Optional


def map_daily_training_dates(training_plan_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map scheduled dates to daily trainings in a training plan.
    
    Logic:
    1. Find today's day of week (Monday, Tuesday, etc.)
    2. Find the first daily_training (across all weeks) that matches today's day of week
    3. Set that daily_training's scheduled_date to today
    4. Calculate all other dates relative to that anchor point
    
    Args:
        training_plan_data: Training plan dictionary with weekly_schedules containing daily_trainings
        
    Returns:
        Modified training_plan_data with scheduled_date added to each daily_training
        
    Example:
        If today is Tuesday:
        - First Tuesday in plan gets today's date
        - Monday (before Tuesday) gets yesterday's date
        - Wednesday (after Tuesday) gets tomorrow's date
        - And so on for all days across all weeks
    """
    if not training_plan_data:
        return training_plan_data
    
    # Get today's date and day of week
    today = date.today()
    today_day_name = today.strftime("%A")  # "Monday", "Tuesday", etc.
    
    # Day order for calculating offsets
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Find the first daily_training that matches today's day of week
    anchor_week_index = None
    anchor_daily_index = None
    anchor_day_name = None
    
    weekly_schedules = training_plan_data.get("weekly_schedules", [])
    
    # Search through all weeks to find the first matching day
    for week_index, week_data in enumerate(weekly_schedules):
        daily_trainings = week_data.get("daily_trainings", [])
        for daily_index, daily_data in enumerate(daily_trainings):
            day_of_week = daily_data.get("day_of_week", "")
            # Skip rest days - we only anchor on actual training days
            if day_of_week == today_day_name and not daily_data.get("is_rest_day", False):
                anchor_week_index = week_index
                anchor_daily_index = daily_index
                anchor_day_name = day_of_week
                break
        if anchor_week_index is not None:
            break
    
    # If no matching day found, use the first non-rest day as anchor
    if anchor_week_index is None:
        for week_index, week_data in enumerate(weekly_schedules):
            daily_trainings = week_data.get("daily_trainings", [])
            for daily_index, daily_data in enumerate(daily_trainings):
                if not daily_data.get("is_rest_day", False):
                    anchor_week_index = week_index
                    anchor_daily_index = daily_index
                    anchor_day_name = daily_data.get("day_of_week", "Monday")
                    break
            if anchor_week_index is not None:
                break
    
    # If still no anchor found (all rest days?), use first rest day as anchor
    if anchor_week_index is None:
        for week_index, week_data in enumerate(weekly_schedules):
            daily_trainings = week_data.get("daily_trainings", [])
            if daily_trainings:
                # Use first day (even if rest day) as anchor
                anchor_week_index = week_index
                anchor_daily_index = 0
                anchor_day_name = daily_trainings[0].get("day_of_week", "Monday")
                break
    
    # If still no anchor found (empty plan?), return unchanged
    if anchor_week_index is None:
        return training_plan_data
    
    # If anchor day matches today's day name, anchor date is today
    # Otherwise, calculate the offset
    anchor_day_index = day_order.index(anchor_day_name)
    today_day_index = day_order.index(today_day_name)
    
    if anchor_day_name == today_day_name:
        # Anchor day matches today - use today's date
        anchor_date = today
    else:
        # Fallback case: calculate offset (shouldn't happen if logic is correct)
        days_from_anchor_to_today = today_day_index - anchor_day_index
        anchor_date = today - timedelta(days=days_from_anchor_to_today)
    
    # Now calculate dates for all daily trainings
    for week_index, week_data in enumerate(weekly_schedules):
        daily_trainings = week_data.get("daily_trainings", [])
        for daily_index, daily_data in enumerate(daily_trainings):
            day_of_week = daily_data.get("day_of_week", "Monday")
            day_index = day_order.index(day_of_week)
            
            # Calculate days from anchor to this day
            # Account for week boundaries
            weeks_from_anchor = week_index - anchor_week_index
            days_from_anchor = (weeks_from_anchor * 7) + (day_index - anchor_day_index)
            
            # Calculate the scheduled date
            scheduled_date = anchor_date + timedelta(days=days_from_anchor)
            
            # Add scheduled_date to daily_data (as ISO format string for database)
            daily_data["scheduled_date"] = scheduled_date.isoformat()
    
    return training_plan_data

