# workouts/models.py

from django.db import models
from django.utils import timezone
from users.models import UserProfile


class Exercise(models.Model):
    # This model now ONLY describes the exercise itself.
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


class WorkoutExercise(models.Model):
    # This is our new THROUGH model.
    # It links an Exercise to a DailyWorkout with specific details.
    daily_workout = models.ForeignKey("DailyWorkout", on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)

    # User-specific details for this exercise instance
    sets = models.IntegerField()
    reps = models.CharField(max_length=50)  # e.g., "8-12 reps" or "30 seconds"

    class Meta:
        # Ensures a user doesn't have the same exercise twice in the same daily workout
        unique_together = ("daily_workout", "exercise")


class DailyWorkout(models.Model):
    day_of_week = models.CharField(max_length=10)
    # The relationship to Exercise now goes THROUGH WorkoutExercise
    exercises = models.ManyToManyField(Exercise, through="WorkoutExercise")

    def __str__(self):
        return self.day_of_week


# --- WeeklySchedule and WorkoutPlan models remain the same ---
class WeeklySchedule(models.Model):
    week_number = models.IntegerField()
    daily_workouts = models.ManyToManyField(DailyWorkout)

    def __str__(self):
        return f"Week {self.week_number}"


class WorkoutPlan(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    summary = models.TextField()
    weekly_schedules = models.ManyToManyField(WeeklySchedule)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


# --- NEW PROGRESS TRACKING MODELS ---


class WorkoutProgress(models.Model):
    """Tracks user's overall progress through their workout plan"""

    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE)
    current_week = models.IntegerField(default=1)
    current_day_index = models.IntegerField(default=0)  # 0-6 for Monday-Sunday
    start_date = models.DateField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user_profile", "workout_plan")

    def __str__(self):
        return f"{self.user_profile.user.username} - Week {self.current_week}"


class ExerciseProgress(models.Model):
    """Tracks completion status of individual exercises"""

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    workout_exercise = models.ForeignKey(WorkoutExercise, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)  # User notes for the exercise

    class Meta:
        unique_together = ("user_profile", "workout_exercise")

    def __str__(self):
        status = "✓" if self.is_completed else "○"
        return f"{status} {self.workout_exercise.exercise.name} - {self.user_profile.user.username}"


class WorkoutSession(models.Model):
    """Tracks completion status of daily workouts"""

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    daily_workout = models.ForeignKey(DailyWorkout, on_delete=models.CASCADE)
    week_number = models.IntegerField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(
        null=True, blank=True
    )  # Actual workout duration

    class Meta:
        unique_together = ("user_profile", "daily_workout", "week_number")

    def __str__(self):
        status = "✓" if self.is_completed else "○"
        return f"{status} Week {self.week_number} - {self.daily_workout.day_of_week} - {self.user_profile.user.username}"
