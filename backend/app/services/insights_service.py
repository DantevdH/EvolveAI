"""
Service for extracting simple insights metrics from training data.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, date
from logging_config import get_logger
import hashlib
import json

logger = get_logger(__name__)


class InsightsService:
    """Service for extracting simple, actionable insights from training data."""
    
    @staticmethod
    def extract_volume_progress(training_plan: Dict[str, Any]) -> str:
        """
        Extract volume progress description from training plan with long-term trends.
        
        Returns: Detailed description with week-over-week and long-term trends
        """
        try:
            weekly_schedules = training_plan.get("weekly_schedules", [])
            
            # Get all completed weeks
            completed_weeks = [
                w for w in weekly_schedules 
                if w.get("completed", False) or any(
                    dt.get("completed", False) 
                    for dt in w.get("daily_trainings", [])
                )
            ]
            
            if len(completed_weeks) < 2:
                return "Establishing baseline - need at least 2 completed weeks"
            
            # Calculate volume for all completed weeks
            volumes = []
            for week in completed_weeks:
                week_volume = InsightsService._calculate_week_volume(week)
                volumes.append(week_volume)
            
            if len(volumes) < 2:
                return "Establishing baseline"
            
            current_volume = volumes[-1]
            last_week_volume = volumes[-2] if len(volumes) >= 2 else current_volume
            avg_volume = sum(volumes) / len(volumes)
            
            # Week-over-week change
            if last_week_volume == 0:
                week_change_pct = 0
            else:
                week_change_pct = ((current_volume - last_week_volume) / last_week_volume) * 100
            
            # Long-term trend (last 4 weeks vs previous 4 weeks, or all available)
            long_term_trend = ""
            if len(volumes) >= 8:
                recent_4_avg = sum(volumes[-4:]) / 4
                previous_4_avg = sum(volumes[-8:-4]) / 4
                if previous_4_avg > 0:
                    long_term_change = ((recent_4_avg - previous_4_avg) / previous_4_avg) * 100
                    if long_term_change > 10:
                        long_term_trend = f" (up {long_term_change:.0f}% vs previous month)"
                    elif long_term_change < -10:
                        long_term_trend = f" (down {abs(long_term_change):.0f}% vs previous month)"
            elif len(volumes) >= 4:
                recent_avg = sum(volumes[-2:]) / 2
                earlier_avg = sum(volumes[:2]) / 2
                if earlier_avg > 0:
                    long_term_change = ((recent_avg - earlier_avg) / earlier_avg) * 100
                    if long_term_change > 10:
                        long_term_trend = f" (trending up {long_term_change:.0f}% overall)"
                    elif long_term_change < -10:
                        long_term_trend = f" (trending down {abs(long_term_change):.0f}% overall)"
            
            # Build description
            if week_change_pct > 5:
                return f"Lifted {current_volume:.0f}kg this week, up {week_change_pct:.0f}% from last week (increase){long_term_trend}. Average: {avg_volume:.0f}kg/week over {len(volumes)} weeks"
            elif week_change_pct < -5:
                return f"Lifted {current_volume:.0f}kg this week, down {abs(week_change_pct):.0f}% from last week (decrease){long_term_trend}. Average: {avg_volume:.0f}kg/week over {len(volumes)} weeks"
            else:
                return f"Lifted {current_volume:.0f}kg this week, stable vs last week{long_term_trend}. Average: {avg_volume:.0f}kg/week over {len(volumes)} weeks"
                
        except Exception as e:
            logger.error(f"Error extracting volume progress: {e}")
            return "Unable to calculate volume progress"
    
    @staticmethod
    def _calculate_week_volume(week: Dict[str, Any]) -> float:
        """Calculate total volume (kg × reps × sets) for a week."""
        total_volume = 0.0
        
        for daily in week.get("daily_trainings", []):
            if daily.get("is_rest_day", False) or not daily.get("completed", False):
                continue
            
            for exercise in daily.get("strength_exercise", []):
                if not exercise.get("completed", False):
                    continue
                
                weights = exercise.get("weights", [])
                reps = exercise.get("reps", [])
                sets = exercise.get("sets", 0)
                
                # Calculate volume: sum of (weight × reps) for all sets
                for i in range(min(len(weights), len(reps), sets)):
                    if weights[i] and reps[i]:
                        total_volume += weights[i] * reps[i]
        
        return total_volume
    
    @staticmethod
    def _is_training_in_past(
        daily_training: Dict[str, Any], 
        today: date = None,
        plan_created_at: Optional[date] = None
    ) -> bool:
        """
        Check if a daily training is in the past (should have been completed).
        Only counts trainings that could have been completed since the plan was created.
        
        Args:
            daily_training: Daily training dictionary
            today: Today's date (defaults to date.today())
            plan_created_at: Date when the training plan was created (optional)
        
        Returns:
            True if training is in the past or today AND after plan creation, False otherwise
        """
        if today is None:
            today = date.today()
        
        # First, try to use scheduled_date if available
        scheduled_date_str = daily_training.get("scheduled_date")
        if scheduled_date_str:
            try:
                # Parse ISO date string (YYYY-MM-DD)
                scheduled_date = date.fromisoformat(scheduled_date_str.split('T')[0])
                
                # Check if training is in the past (or today)
                is_past = scheduled_date <= today
                
                # If plan_created_at is provided, also check that training is after plan creation
                if plan_created_at is not None:
                    is_after_creation = scheduled_date >= plan_created_at
                    return is_past and is_after_creation
                
                # If no plan_created_at, just check if it's in the past
                return is_past
            except (ValueError, AttributeError):
                # If parsing fails, fall back
                pass
        
        # Fallback: If no scheduled_date, we can't determine if it's in the past
        return False
    
    @staticmethod
    def extract_training_frequency(training_plan: Dict[str, Any]) -> str:
        """
        Extract training frequency description with consistency metrics.
        Only counts trainings that are in the past (should have been completed)
        AND that could have been completed since the plan was created.
        
        Returns: Detailed description with current week and consistency over time
        """
        try:
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                return "No training data available"
            
            today = date.today()
            
            # Extract plan creation date
            plan_created_at = None
            created_at_str = training_plan.get("created_at")
            if created_at_str:
                try:
                    # Parse ISO timestamp string (could be with or without time)
                    if 'T' in created_at_str:
                        plan_created_at = date.fromisoformat(created_at_str.split('T')[0])
                    else:
                        plan_created_at = date.fromisoformat(created_at_str)
                except (ValueError, AttributeError):
                    logger.warning(f"Could not parse plan created_at: {created_at_str}")
            
            # First, check if there are any past trainings (even if not completed)
            # This handles the case where all trainings are in the future
            has_past_trainings = False
            for week in weekly_schedules:
                for dt in week.get("daily_trainings", []):
                    if dt.get("is_rest_day", False):
                        continue
                    if InsightsService._is_training_in_past(dt, today, plan_created_at):
                        has_past_trainings = True
                        break
                if has_past_trainings:
                    break
            
            if not has_past_trainings:
                # Check if there are any trainings at all (future ones)
                has_any_trainings = any(
                    not dt.get("is_rest_day", False)
                    for week in weekly_schedules
                    for dt in week.get("daily_trainings", [])
                )
                if has_any_trainings:
                    return "No past trainings to evaluate yet"
                return "No training scheduled this week"
            
            # Get all completed weeks
            completed_weeks = [
                w for w in weekly_schedules 
                if w.get("completed", False) or any(
                    dt.get("completed", False) 
                    for dt in w.get("daily_trainings", [])
                )
            ]
            
            if not completed_weeks:
                return "No completed training weeks yet"
            
            # Analyze most recent week
            recent_week = completed_weeks[-1]
            
            # Count only trainings that are in the past AND after plan creation
            completed_days = 0
            total_days_past = 0
            
            for dt in recent_week.get("daily_trainings", []):
                if dt.get("is_rest_day", False):
                    continue
                
                # Only count if training is in the past (or today) AND after plan creation
                if InsightsService._is_training_in_past(dt, today, plan_created_at):
                    total_days_past += 1
                    if dt.get("completed", False):
                        completed_days += 1
            
            if total_days_past == 0:
                # Check if there are any trainings at all (future ones)
                has_any_trainings = any(
                    not dt.get("is_rest_day", False)
                    for dt in recent_week.get("daily_trainings", [])
                )
                if has_any_trainings:
                    return "No past trainings to evaluate yet"
                return "No training scheduled this week"
            
            # Calculate consistency over all completed weeks
            # Only count past trainings for consistency calculation too
            weekly_completion_rates = []
            for week in completed_weeks:
                week_completed = 0
                week_total_past = 0
                
                for dt in week.get("daily_trainings", []):
                    if dt.get("is_rest_day", False):
                        continue
                    
                    if InsightsService._is_training_in_past(dt, today, plan_created_at):
                        week_total_past += 1
                        if dt.get("completed", False):
                            week_completed += 1
                
                if week_total_past > 0:
                    weekly_completion_rates.append(week_completed / week_total_past * 100)
            
            avg_completion_rate = sum(weekly_completion_rates) / len(weekly_completion_rates) if weekly_completion_rates else 0
            
            # Build description
            current_status = "on track" if completed_days >= total_days_past else "below goal"
            consistency_desc = ""
            # Show consistency if we have at least 2 weeks (not just 4)
            if len(weekly_completion_rates) >= 2:
                if avg_completion_rate >= 90:
                    consistency_desc = f" (excellent {avg_completion_rate:.0f}% consistency over {len(completed_weeks)} weeks)"
                elif avg_completion_rate >= 75:
                    consistency_desc = f" (good {avg_completion_rate:.0f}% consistency over {len(completed_weeks)} weeks)"
                elif avg_completion_rate >= 60:
                    consistency_desc = f" (moderate {avg_completion_rate:.0f}% consistency over {len(completed_weeks)} weeks)"
                else:
                    consistency_desc = f" (needs improvement: {avg_completion_rate:.0f}% consistency over {len(completed_weeks)} weeks)"
            
            return f"Trained {completed_days}/{total_days_past} days this week ({current_status}){consistency_desc}"
                
        except Exception as e:
            logger.error(f"Error extracting training frequency: {e}")
            return "Unable to calculate training frequency"
    
    @staticmethod
    def extract_training_intensity(training_plan: Dict[str, Any]) -> Tuple[str, str]:
        """
        Extract training intensity from RPE data with long-term trends.
        RPE (Rate of Perceived Exertion) measures how hard workouts feel.
        
        Returns: (description, trend) where trend is "improving" (lower RPE), "stable", or "declining" (higher RPE)
        Description includes current RPE, trend, and context
        """
        try:
            weekly_schedules = training_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                return "No RPE data available", "stable"
            
            # Get all completed weeks
            completed_weeks = [
                w for w in weekly_schedules 
                if w.get("completed", False) or any(
                    dt.get("completed", False) 
                    for dt in w.get("daily_trainings", [])
                )
            ]
            
            if len(completed_weeks) < 1:
                return "No RPE data available", "stable"
            
            # Calculate average RPE for all completed weeks
            rpe_values = []
            for week in completed_weeks:
                week_rpe = InsightsService._calculate_week_rpe(week)
                if week_rpe is not None:
                    rpe_values.append(week_rpe)
            
            if not rpe_values:
                return "No RPE data recorded", "stable"
            
            current_rpe = rpe_values[-1]
            avg_rpe = sum(rpe_values) / len(rpe_values)
            min_rpe = min(rpe_values)
            max_rpe = max(rpe_values)
            
            # Determine short-term trend (last 2 weeks)
            if len(rpe_values) >= 2:
                if rpe_values[-1] < rpe_values[-2] - 0.3:  # RPE decreased (workouts feeling easier)
                    trend = "improving"
                elif rpe_values[-1] > rpe_values[-2] + 0.3:  # RPE increased (workouts feeling harder)
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Determine long-term trend (last 4 weeks vs previous 4)
            long_term_trend_desc = ""
            if len(rpe_values) >= 8:
                recent_4_avg = sum(rpe_values[-4:]) / 4
                previous_4_avg = sum(rpe_values[-8:-4]) / 4
                if recent_4_avg < previous_4_avg - 0.3:
                    long_term_trend_desc = " (intensity decreasing over past month)"
                elif recent_4_avg > previous_4_avg + 0.3:
                    long_term_trend_desc = " (intensity increasing over past month)"
            
            # Generate description with context
            rpe_scale = "1-5"  # Assuming 1-5 scale based on frontend
            if current_rpe <= 2.5:
                description = f"Average RPE: {current_rpe:.1f}/5 this week (very easy)"
            elif current_rpe <= 3.5:
                description = f"Average RPE: {current_rpe:.1f}/5 this week (manageable)"
            elif current_rpe <= 4.5:
                description = f"Average RPE: {current_rpe:.1f}/5 this week (moderate)"
            else:
                description = f"Average RPE: {current_rpe:.1f}/5 this week (hard)"
            
            # Add trend and context
            if trend == "improving":
                description += f" - RPE decreasing (workouts feeling easier){long_term_trend_desc}"
            elif trend == "declining":
                description += f" - RPE increasing (workouts feeling harder){long_term_trend_desc}"
            else:
                description += f" - RPE stable{long_term_trend_desc}"
            
            # Add overall context
            if len(rpe_values) >= 4:
                description += f". Average over {len(rpe_values)} weeks: {avg_rpe:.1f}/5 (range: {min_rpe:.1f}-{max_rpe:.1f})"
            
            return description, trend
                
        except Exception as e:
            logger.error(f"Error extracting training intensity: {e}")
            return "Unable to calculate training intensity", "stable"
    
    @staticmethod
    def _calculate_week_rpe(week: Dict[str, Any]) -> Optional[float]:
        """Calculate average RPE for a week."""
        rpe_values = []
        
        for daily in week.get("daily_trainings", []):
            if daily.get("is_rest_day", False) or not daily.get("completed", False):
                continue
            
            session_rpe = daily.get("session_rpe")
            if session_rpe is not None:
                rpe_values.append(float(session_rpe))
        
        if not rpe_values:
            return None
        
        return sum(rpe_values) / len(rpe_values)
    
    @staticmethod
    def calculate_data_hash(metrics_dict: Dict[str, Any]) -> str:
        """
        Calculate hash of metrics to detect changes.
        
        Args:
            metrics_dict: Dictionary with volume_progress, training_frequency, 
                         training_intensity, weak_points, top_exercises
        
        Returns:
            SHA256 hash string
        """
        # Create a stable string representation of metrics
        # Sort weak_points and top_exercises for consistent hashing
        stable_dict = {
            "volume_progress": metrics_dict.get("volume_progress", ""),
            "training_frequency": metrics_dict.get("training_frequency", ""),
            "training_intensity": metrics_dict.get("training_intensity", ""),
            "weak_points": sorted(
                [
                    {
                        "muscle_group": wp.get("muscle_group", ""),
                        "issue": wp.get("issue", ""),
                        "severity": wp.get("severity", "")
                    }
                    for wp in metrics_dict.get("weak_points", [])
                ],
                key=lambda x: x.get("muscle_group", "")
            ),
            "top_exercises": sorted(
                [
                    {
                        "name": ex.get("name", ""),
                        "trend": ex.get("trend", ""),
                        "change": ex.get("change", "")
                    }
                    for ex in metrics_dict.get("top_exercises", [])
                ],
                key=lambda x: x.get("name", "")
            )
        }
        
        # Convert to JSON string and hash
        json_str = json.dumps(stable_dict, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
    

