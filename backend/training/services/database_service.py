from typing import Dict, Any
from users.models import UserProfile
from training.models import (
    WorkoutPlan,
    Exercise,
    DailyWorkout,
    WeeklySchedule,
    WorkoutExercise,
)
from training.schemas import WorkoutPlanSchema


class WorkoutPlanDatabaseService:
    """Service for converting Pydantic models to Django database models."""

    def __init__(self, user_profile: UserProfile):
        self.user_profile = user_profile

    def create_workout_plan(self, workout_plan: WorkoutPlanSchema) -> WorkoutPlan:
        """
        Create a complete workout plan in the database from Pydantic model.

        Args:
            workout_plan: Validated Pydantic workout plan schema

        Returns:
            WorkoutPlan: Created Django model instance
        """
        # Delete existing plan for this user
        WorkoutPlan.objects.filter(user_profile=self.user_profile).delete()

        # Create main workout plan
        db_workout_plan = WorkoutPlan.objects.create(
            user_profile=self.user_profile,
            title=workout_plan.title,
            summary=workout_plan.summary,
        )

        # Create weekly schedules
        for week_schema in workout_plan.weekly_schedules:
            weekly_schedule = self._create_weekly_schedule(week_schema)
            db_workout_plan.weekly_schedules.add(weekly_schedule)

        return db_workout_plan

    def _create_weekly_schedule(self, week_schema) -> WeeklySchedule:
        """Create a weekly schedule with all daily workouts."""
        weekly_schedule = WeeklySchedule.objects.create(
            week_number=week_schema.week_number
        )

        for day_schema in week_schema.daily_workouts:
            daily_workout = self._create_daily_workout(day_schema)
            weekly_schedule.daily_workouts.add(daily_workout)

        return weekly_schedule

    def _create_daily_workout(self, day_schema) -> DailyWorkout:
        """Create a daily workout with exercises."""
        daily_workout = DailyWorkout.objects.create(
            day_of_week=day_schema.day_of_week.value  # Get string value from enum
        )

        # Add exercises if not a rest day
        if not day_schema.is_rest_day:
            for exercise_schema in day_schema.exercises:
                self._create_workout_exercise(daily_workout, exercise_schema)

        return daily_workout

    def _create_workout_exercise(self, daily_workout: DailyWorkout, exercise_schema):
        """Create exercise and link it to daily workout."""
        # Get or create the base exercise
        exercise, created = Exercise.objects.get_or_create(
            name=exercise_schema.name,
            defaults={"description": f"Exercise: {exercise_schema.name}"},
        )

        # Create the workout-specific exercise details
        WorkoutExercise.objects.create(
            daily_workout=daily_workout,
            exercise=exercise,
            sets=exercise_schema.sets,
            reps=exercise_schema.reps,
        )
