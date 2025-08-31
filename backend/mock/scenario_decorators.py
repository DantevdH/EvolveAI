from functools import wraps
from rest_framework.response import Response
from .scenario_manager import ScenarioManager

def handle_scenario_response(response_type: str):
    """
    Decorator to handle scenario-based responses
    
    Args:
        response_type: Either 'profile' or 'workout_plan'
    """
    def decorator(view_method):
        @wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            # Check for scenario
            scenario = ScenarioManager.get_current_scenario(request)
            if scenario:
                ScenarioManager.log_scenario_access(self.__class__.__name__, scenario)
                
                # Handle network error scenario
                if ScenarioManager.should_return_network_error(scenario):
                    return ScenarioManager.create_network_error_response()
                
                # Handle 404 scenarios (for both GET and PUT requests)
                if response_type == 'profile' and ScenarioManager.should_return_404_for_profile(scenario):
                    return ScenarioManager.create_404_response("User not found")
                
                if response_type == 'workout_plan' and ScenarioManager.should_return_404_for_workout_plan(scenario):
                    return ScenarioManager.create_404_response("No workout plan found")
            
            # Continue with normal flow
            return view_method(self, request, *args, **kwargs)
        return wrapper
    return decorator 