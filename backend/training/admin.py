from django.contrib import admin
from .models import (
    WorkoutPlan,
    WeeklySchedule,
    DailyWorkout,
    WorkoutExercise,
    Exercise,
    WorkoutProgress,
    ExerciseProgress,
    WorkoutSession,
)


# This inline allows you to add/edit exercises directly inside a DailyWorkout.
class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 1  # How many empty "add" slots to show


# This inline allows you to add/edit DailyWorkouts directly inside a WeeklySchedule.
class DailyWorkoutInline(admin.TabularInline):
    # CORRECTED: We access the 'through' model from the ManyToManyField on WeeklySchedule.
    model = WeeklySchedule.daily_workouts.through
    verbose_name = "Daily Workout"
    verbose_name_plural = "Daily Workouts"
    extra = 1


# This inline allows you to add/edit WeeklySchedules directly inside a WorkoutPlan.
class WeeklyScheduleInline(admin.TabularInline):
    # CORRECTED: We access the 'through' model from the ManyToManyField on WorkoutPlan.
    model = WorkoutPlan.weekly_schedules.through
    verbose_name = "Weekly Schedule"
    verbose_name_plural = "Weekly Schedules"
    extra = 1


@admin.register(DailyWorkout)
class DailyWorkoutAdmin(admin.ModelAdmin):
    list_display = ("id", "day_of_week")
    # Attach the inline here to manage exercises for this day.
    inlines = [WorkoutExerciseInline]


@admin.register(WeeklySchedule)
class WeeklyScheduleAdmin(admin.ModelAdmin):
    list_display = ("id", "week_number")
    # Attach the inline here to manage the days for this week.
    inlines = [DailyWorkoutInline]
    # Exclude the raw selection box, as the inline handles it now.
    exclude = ("daily_workouts",)


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ("title", "user_profile", "summary", "created_at", "updated_at")
    list_filter = ("user_profile__user__username", "created_at")
    search_fields = ("title", "user_profile__user__username")
    readonly_fields = ("created_at", "updated_at")
    # Attach the inline here to manage the weeks for this plan.
    inlines = [WeeklyScheduleInline]
    # Exclude the raw selection box.
    exclude = ("weekly_schedules",)


# --- PROGRESS TRACKING ADMIN ---


@admin.register(WorkoutProgress)
class WorkoutProgressAdmin(admin.ModelAdmin):
    list_display = (
        "user_profile",
        "workout_plan",
        "current_week",
        "current_day_index",
        "start_date",
        "last_updated",
    )
    list_filter = ("current_week", "start_date", "last_updated")
    search_fields = ("user_profile__user__username", "workout_plan__title")
    readonly_fields = ("start_date", "last_updated")


@admin.register(ExerciseProgress)
class ExerciseProgressAdmin(admin.ModelAdmin):
    list_display = ("user_profile", "exercise_name", "is_completed", "completed_at")
    list_filter = ("is_completed", "completed_at", "workout_exercise__exercise__name")
    search_fields = ("user_profile__user__username", "workout_exercise__exercise__name")
    readonly_fields = ("completed_at",)

    def exercise_name(self, obj):
        return obj.workout_exercise.exercise.name

    exercise_name.short_description = "Exercise"


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = (
        "user_profile",
        "day_name",
        "week_number",
        "is_completed",
        "completed_at",
        "duration_minutes",
    )
    list_filter = (
        "is_completed",
        "week_number",
        "completed_at",
        "daily_workout__day_of_week",
    )
    search_fields = ("user_profile__user__username", "daily_workout__day_of_week")
    readonly_fields = ("completed_at",)

    def day_name(self, obj):
        return obj.daily_workout.day_of_week

    day_name.short_description = "Day"


# Register the base Exercise model so you can add new ones globally.
admin.site.register(Exercise)
