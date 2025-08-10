# workouts/models.py

from django.db import models
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
    daily_workout = models.ForeignKey('DailyWorkout', on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    
    # User-specific details for this exercise instance
    sets = models.IntegerField()
    reps = models.CharField(max_length=50) # e.g., "8-12 reps" or "30 seconds"

    class Meta:
        # Ensures a user doesn't have the same exercise twice in the same daily workout
        unique_together = ('daily_workout', 'exercise')

class DailyWorkout(models.Model):
    day_of_week = models.CharField(max_length=10)
    # The relationship to Exercise now goes THROUGH WorkoutExercise
    exercises = models.ManyToManyField(Exercise, through='WorkoutExercise')

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

    def __str__(self):
        return self.title