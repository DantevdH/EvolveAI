# api/urls.py
from django.urls import path
from .views import GenerateWorkoutView, WorkoutPlanDetailView

urlpatterns = [
    path('', GenerateWorkoutView.as_view(), name='generate-workout-plan'),  # POST
    path('detail/', WorkoutPlanDetailView.as_view(), name='workout-plan-detail'),  # GET
]