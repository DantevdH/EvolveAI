# workouts/serializers.py
from rest_framework import serializers
from .models import (
    WorkoutPlan,
    WeeklySchedule,
    DailyWorkout,
    Exercise,
    WorkoutExercise,
    WorkoutProgress,
    ExerciseProgress,
    WorkoutSession,
)


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ["id", "name", "description", "video_url"]  # Added 'id' for reference


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise = ExerciseSerializer(read_only=True)
    is_completed = serializers.SerializerMethodField()
    progress_id = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutExercise
        fields = ["id", "exercise", "sets", "reps", "is_completed", "progress_id"]

    def get_is_completed(self, obj):
        """Get completion status for this exercise from ExerciseProgress"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                user_profile = request.user.userprofile
                progress = ExerciseProgress.objects.get(
                    user_profile=user_profile, workout_exercise=obj
                )
                return progress.is_completed
            except ExerciseProgress.DoesNotExist:
                return False
        return False

    def get_progress_id(self, obj):
        """Get the progress ID for this exercise"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                user_profile = request.user.userprofile
                progress = ExerciseProgress.objects.get(
                    user_profile=user_profile, workout_exercise=obj
                )
                return progress.id
            except ExerciseProgress.DoesNotExist:
                return None
        return None


class DailyWorkoutSerializer(serializers.ModelSerializer):
    workout_exercises = WorkoutExerciseSerializer(
        source="workoutexercise_set", many=True, read_only=True
    )
    # Add a computed field to indicate if it's a rest day
    is_rest_day = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    week_number = serializers.SerializerMethodField()

    class Meta:
        model = DailyWorkout
        fields = [
            "id",
            "day_of_week",
            "is_rest_day",
            "is_completed",
            "week_number",
            "workout_exercises",
        ]

    def get_is_rest_day(self, obj):
        """Return True if there are no exercises for this day."""
        return not obj.workoutexercise_set.exists()

    def get_is_completed(self, obj):
        """Check if this workout session is completed"""
        request = self.context.get("request")
        week_number = self.context.get("week_number", 1)
        if request and request.user.is_authenticated:
            try:
                user_profile = request.user.userprofile
                session = WorkoutSession.objects.get(
                    user_profile=user_profile,
                    daily_workout=obj,
                    week_number=week_number,
                )
                return session.is_completed
            except WorkoutSession.DoesNotExist:
                return False
        return False

    def get_week_number(self, obj):
        """Get the week number from context"""
        return self.context.get("week_number", 1)


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    daily_workouts = DailyWorkoutSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ["id", "week_number", "daily_workouts"]

    def to_representation(self, instance):
        """Add week_number to context for daily workouts"""
        data = super().to_representation(instance)
        # Set week_number in context for daily workout serializers
        for i, daily_workout in enumerate(instance.daily_workouts.all()):
            if i < len(data["daily_workouts"]):
                data["daily_workouts"][i]["week_number"] = instance.week_number
        return data


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

    def to_representation(self, instance):
        """Add week context to weekly schedules"""
        data = super().to_representation(instance)
        request = self.context.get("request")

        # Add context for each weekly schedule
        for i, weekly_schedule in enumerate(
            instance.weekly_schedules.all().order_by("week_number")
        ):
            if i < len(data["weekly_schedules"]):
                # Set context for daily workouts within this week
                for j, daily_workout in enumerate(weekly_schedule.daily_workouts.all()):
                    if j < len(data["weekly_schedules"][i]["daily_workouts"]):
                        data["weekly_schedules"][i]["daily_workouts"][j][
                            "week_number"
                        ] = weekly_schedule.week_number

        return data


# --- PROGRESS TRACKING SERIALIZERS ---


class WorkoutProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutProgress
        fields = [
            "id",
            "current_week",
            "current_day_index",
            "start_date",
            "last_updated",
        ]


class ExerciseProgressSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(
        source="workout_exercise.exercise.name", read_only=True
    )

    class Meta:
        model = ExerciseProgress
        fields = [
            "id",
            "workout_exercise",
            "is_completed",
            "completed_at",
            "notes",
            "exercise_name",
        ]


class WorkoutSessionSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="daily_workout.day_of_week", read_only=True)

    class Meta:
        model = WorkoutSession
        fields = [
            "id",
            "daily_workout",
            "week_number",
            "is_completed",
            "completed_at",
            "duration_minutes",
            "day_name",
        ]


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
class WorkoutProgressSummarySerializer(serializers.Serializer):
    """For tracking user progress through their workout plan."""

    current_week = serializers.IntegerField()
    current_day = serializers.CharField()
    completed_workouts = serializers.IntegerField()
    total_workouts = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
