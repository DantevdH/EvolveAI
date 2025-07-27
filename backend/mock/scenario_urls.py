from django.urls import path
from .scenario_views import set_scenario

urlpatterns = [
    path("set/", set_scenario, name="set_scenario"),
] 