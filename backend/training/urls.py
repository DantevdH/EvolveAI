# api/urls.py
from django.urls import path
from .views import GenerateWorkoutView

urlpatterns = [
    path('', GenerateWorkoutView.as_view(), name='generate-workout'),
]