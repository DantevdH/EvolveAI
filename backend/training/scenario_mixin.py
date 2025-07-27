import time
from rest_framework.response import Response
from rest_framework import status
from .scenario_manager import ScenarioManager
from .mock_data import MOCK_USER_PROFILE, MOCK_WORKOUT_PLAN
from .scenario_manager import Scenario

class ScenarioMixin:
    """Mixin to handle scenario-based responses in views"""
    
    def handle_scenario_response(self, request, response_type: str):
        """
        Handle scenario-based responses
        
        Args:
            request: The request object
            response_type: Either 'profile' or 'workout_plan'
            
        Returns:
            Response object if scenario should override, None otherwise
        """
        scenario = ScenarioManager.get_current_scenario(request)
        print(f"[DEBUG] ScenarioMixin session key: {request.session.session_key}, scenario: {scenario}")
        if not scenario:
            return None
            
        ScenarioManager.log_scenario_access(self.__class__.__name__, scenario)
        
        # Add response delay to simulate real network conditions
        delay = ScenarioManager.get_response_delay(scenario)
        time.sleep(delay)
        
        # Handle network error scenario
        if ScenarioManager.should_return_network_error(scenario):
            return ScenarioManager.create_network_error_response()
        
        print(response_type, scenario, request.method)
        # Handle 404 scenarios based on HTTP method
        if response_type == 'profile':
            if request.method == 'GET' and ScenarioManager.should_return_404_for_profile_get(scenario):
                return ScenarioManager.create_404_response("User not found")
            elif request.method == 'PUT' and ScenarioManager.should_return_404_for_profile_put(scenario):
                return ScenarioManager.create_404_response("User not found")
        
        if response_type == 'workout_plan':
            if request.method == 'GET' and ScenarioManager.should_return_404_for_workout_plan_get(scenario):
                return ScenarioManager.create_404_response("No workout plan found")
            elif request.method == 'POST' and ScenarioManager.should_return_404_for_workout_plan_post(scenario):
                return ScenarioManager.create_404_response("Cannot create workout plan")
        
        if response_type == 'profile' and request.method == 'GET':
            if scenario in [Scenario.ONBOARDED_USER, Scenario.USER_WITH_PLAN]:
                return Response(MOCK_USER_PROFILE, status=status.HTTP_200_OK)
        
        return None 