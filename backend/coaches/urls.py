from django.urls import path
from .views import CoachListView

urlpatterns = [
    path("", CoachListView.as_view(), name="coach-list"),
]
