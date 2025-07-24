# workouts/serializers.py
from rest_framework import serializers
from .models import WorkoutPlan, WeeklySchedule, DailyWorkout, Exercise, WorkoutExercise


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ["id", "name", "description", "video_url"]  # Added 'id' for reference


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise = ExerciseSerializer(read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = ["exercise", "sets", "reps"]


class DailyWorkoutSerializer(serializers.ModelSerializer):
    workout_exercises = WorkoutExerciseSerializer(
        source="workoutexercise_set", many=True, read_only=True
    )
    # Add a computed field to indicate if it's a rest day
    is_rest_day = serializers.SerializerMethodField()

    class Meta:
        model = DailyWorkout
        fields = ["id", "day_of_week", "is_rest_day", "workout_exercises"]

    def get_is_rest_day(self, obj):
        """Return True if there are no exercises for this day."""
        return not obj.workoutexercise_set.exists()


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    daily_workouts = DailyWorkoutSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ["id", "week_number", "daily_workouts"]


class WorkoutPlanSerializer(serializers.ModelSerializer):
    weekly_schedules = WeeklyScheduleSerializer(many=True, read_only=True)
    # Add some useful computed fields
    total_weeks = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = WorkoutPlan
        fields = [
            "id",
            "title",
            "summary",
            "total_weeks",
            "created_at",
            "updated_at",
            "weekly_schedules",
        ]

    def get_total_weeks(self, obj):
        """Return the total number of weeks in this plan."""
        return obj.weekly_schedules.count()


# Optional: Simplified serializer for list views
class WorkoutPlanListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing workout plans without full details."""

    total_weeks = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutPlan
        fields = ["id", "title", "summary", "total_weeks", "created_at", "updated_at"]

    def get_total_weeks(self, obj):
        return obj.weekly_schedules.count()


# Optional: Serializer for workout progress tracking
class WorkoutProgressSerializer(serializers.Serializer):
    """For tracking user progress through their workout plan."""

    current_week = serializers.IntegerField()
    current_day = serializers.CharField()
    completed_workouts = serializers.IntegerField()
    total_workouts = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
