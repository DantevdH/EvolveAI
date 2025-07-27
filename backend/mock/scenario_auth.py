from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

class ScenarioAwareAuthentication(TokenAuthentication):
    """
    Custom authentication that allows scenario-based requests to bypass auth in development.
    """
    
    def authenticate(self, request):
        # Debug print for session key
        print(f"[DEBUG] ScenarioAwareAuthentication session key: {request.session.session_key}")
        # If we're in development mode and have a scenario set, allow the request
        if settings.DEBUG and 'scenario' in request.session:
            scenario = request.session.get('scenario')
            if scenario:
                print(f"[SCENARIO AUTH BYPASS] Scenario '{scenario}' - skipping authentication.")
                # Return None to indicate no authentication required
                return None
        
        # Otherwise, use normal token authentication
        return super().authenticate(request)

class ScenarioAwarePermission(IsAuthenticated):
    """
    Custom permission that allows scenario-based requests to bypass auth in development.
    """
    
    def has_permission(self, request, view):
        # Debug print for session key
        print(f"[DEBUG] ScenarioAwarePermission session key: {request.session.session_key}")
        # If we're in development mode and have a scenario set, allow the request
        if settings.DEBUG and 'scenario' in request.session:
            scenario = request.session.get('scenario')
            if scenario:
                print(f"[SCENARIO PERMISSION BYPASS] Scenario '{scenario}' - skipping permission check.")
                return True
        
        # Otherwise, use normal authentication
        return super().has_permission(request, view) 