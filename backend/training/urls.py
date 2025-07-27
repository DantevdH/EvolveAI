# api/urls.py
from django.urls import path
from .views import (
    GenerateWorkoutView,
    WorkoutPlanDetailView,
    ProgressTrackingView,
    WeekProgressView,
)

urlpatterns = [
    path("create/", GenerateWorkoutView.as_view(), name="generate-workout-plan"),  # POST
    path("detail/", WorkoutPlanDetailView.as_view(), name="workout-plan-detail"),  # GET
    path("progress/", ProgressTrackingView.as_view(), name="update-progress"),  # POST
    path("progress/week/", WeekProgressView.as_view(), name="update-week"),  # POST
]
