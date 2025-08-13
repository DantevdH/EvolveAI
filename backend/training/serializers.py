# workouts/serializers.py
from rest_framework import serializers
from .models import WorkoutPlan, WeeklySchedule, DailyWorkout, Exercise, WorkoutExercise

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        # We only need descriptive fields here
        fields = ['name', 'description', 'video_url']

class WorkoutExerciseSerializer(serializers.ModelSerializer):
    # We nest the ExerciseSerializer to show the exercise details
    exercise = ExerciseSerializer(read_only=True)
    
    class Meta:
        model = WorkoutExercise
        # The fields now include the user-specific details
        fields = ['exercise', 'sets', 'reps']

class DailyWorkoutSerializer(serializers.ModelSerializer):
    # The source points to the 'through' model's related name
    workout_exercises = WorkoutExerciseSerializer(source='workoutexercise_set', many=True, read_only=True)

    class Meta:
        model = DailyWorkout
        fields = ['day_of_week', 'workout_exercises']

# --- WeeklyScheduleSerializer and WorkoutPlanSerializer need a small update ---

class WeeklyScheduleSerializer(serializers.ModelSerializer):
    # This serializer now uses the updated DailyWorkoutSerializer
    daily_workouts = DailyWorkoutSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ['week_number', 'daily_workouts']

class WorkoutPlanSerializer(serializers.ModelSerializer):
    # This serializer now uses the updated WeeklyScheduleSerializer
    weekly_schedules = WeeklyScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutPlan
        fields = ['title', 'summary', 'weekly_schedules']