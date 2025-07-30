from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from .supabase_auth import supabase_auth


class SupabaseTokenAuthentication(TokenAuthentication):
    """
    Custom authentication that supports both Django tokens and Supabase JWT tokens.
    """
    
    def authenticate(self, request):
        # First, try to get the authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header:
            return None
        
        # Check if it's a Supabase JWT token (Bearer token)
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            # Verify and authenticate with Supabase
            user = supabase_auth.authenticate_with_supabase_token(token)
            if user:
                return (user, token)
            else:
                raise AuthenticationFailed('Invalid Supabase token')
        
        # Fall back to Django token authentication
        return super().authenticate(request)


class SupabaseOrTokenAuthentication(TokenAuthentication):
    """
    Authentication that tries Supabase first, then falls back to Django tokens.
    Also handles scenario-based authentication bypass for development.
    """
    
    def authenticate(self, request):
        # Check for scenario bypass first (same as ScenarioAwareAuthentication)
        if settings.DEBUG and 'scenario' in request.session:
            scenario = request.session.get('scenario')
            if scenario:
                print(f"[SCENARIO AUTH BYPASS] Scenario '{scenario}' - skipping authentication.")
                # Return None to indicate no authentication required
                return None
        
        # Try Supabase authentication first
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user = supabase_auth.authenticate_with_supabase_token(token)
            if user:
                return (user, token)
        
        # Fall back to Django token authentication
        return super().authenticate(request) 