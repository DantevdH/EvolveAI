from django.contrib import admin
from .models import WorkoutPlan, WeeklySchedule, DailyWorkout, WorkoutExercise, Exercise

# This inline allows you to add/edit exercises directly inside a DailyWorkout.
class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 1 # How many empty "add" slots to show

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
    list_display = ('id', 'day_of_week')
    # Attach the inline here to manage exercises for this day.
    inlines = [WorkoutExerciseInline]

@admin.register(WeeklySchedule)
class WeeklyScheduleAdmin(admin.ModelAdmin):
    list_display = ('id', 'week_number')
    # Attach the inline here to manage the days for this week.
    inlines = [DailyWorkoutInline]
    # Exclude the raw selection box, as the inline handles it now.
    exclude = ('daily_workouts',)

@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'user_profile', 'summary')
    list_filter = ('user_profile__user__username',)
    search_fields = ('title', 'user_profile__user__username')
    # Attach the inline here to manage the weeks for this plan.
    inlines = [WeeklyScheduleInline]
    # Exclude the raw selection box.
    exclude = ('weekly_schedules',)

# Register the base Exercise model so you can add new ones globally.
admin.site.register(Exercise)