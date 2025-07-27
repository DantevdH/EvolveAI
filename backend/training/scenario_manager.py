from enum import Enum
from typing import Optional, Dict, Any
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

class Scenario(Enum):
    """Enum for all available scenarios"""
    NEW_USER = "new-user"
    EXISTING_USER = "existing-user"
    ONBOARDED_USER = "onboarded-user"
    USER_WITH_PLAN = "user-with-plan"
    NETWORK_ERROR = "network-error"

class ScenarioManager:
    """Centralized scenario management"""
    
    @staticmethod
    def get_current_scenario(request) -> Optional[Scenario]:
        """Get current scenario from session"""
        if not settings.DEBUG:
            return None
        
        scenario_name = request.session.get('scenario')
        if not scenario_name:
            return None
            
        try:
            return Scenario(scenario_name)
        except ValueError:
            return None
    
    @staticmethod
    def should_return_404_for_profile_get(scenario: Scenario) -> bool:
        """Check if profile GET should return 404 for given scenario"""
        return scenario in [Scenario.NEW_USER, Scenario.EXISTING_USER]
    
    @staticmethod
    def should_return_404_for_profile_put(scenario: Scenario) -> bool:
        """Check if profile PUT should return 404 for given scenario"""
        return scenario in [Scenario.EXISTING_USER]  # new-user CAN save, existing-user cannot
    
    @staticmethod
    def should_return_404_for_workout_plan_get(scenario: Scenario) -> bool:
        """Check if workout plan GET should return 404 for given scenario"""
        return scenario in [Scenario.NEW_USER, Scenario.EXISTING_USER, Scenario.ONBOARDED_USER]  # Can't fetch if doesn't exist
    
    @staticmethod
    def should_return_404_for_workout_plan_post(scenario: Scenario) -> bool:
        """Check if workout plan POST (create) should return 404 for given scenario"""
        return scenario in [Scenario.EXISTING_USER]  # Only existing-user can't create plans
    
    @staticmethod
    def should_return_network_error(scenario: Scenario) -> bool:
        """Check if should return network error for given scenario"""
        return scenario == Scenario.NETWORK_ERROR
    
    @staticmethod
    def get_response_delay(scenario: Scenario) -> float:
        """Get response delay in seconds for given scenario, configurable via settings."""
        if not getattr(settings, "SCENARIO_RESPONSE_DELAY", True):
            return 0.0
        if scenario == Scenario.NETWORK_ERROR:
            return 2.0  # Longer delay for network error
        elif scenario == Scenario.NEW_USER:
            return 1.5  # Slightly longer for new user
        else:
            return 0.8  # Normal delay
    
    @staticmethod
    def create_404_response(message: str = "Not found") -> Response:
        """Create standardized 404 response"""
        return Response({"error": message}, status=status.HTTP_404_NOT_FOUND)
    
    @staticmethod
    def create_network_error_response() -> Response:
        """Create standardized network error response"""
        return Response({"error": "Network error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @staticmethod
    def log_scenario_access(view_name: str, scenario: Scenario):
        """Log scenario access for debugging"""
        print(f"[SCENARIO] {view_name} - scenario: {scenario.value}") 