from django.urls import path

# Import the view that provides the token
from rest_framework.authtoken.views import obtain_auth_token
from .views import (
    UserProfileDetailView, 
    scenario_aware_login, 
    supabase_auth_callback, 
    social_auth_signin
)

urlpatterns = [
    # Traditional login endpoint
    path("login/", scenario_aware_login, name="api_token_auth"),
    
    # Supabase authentication endpoints
    path("auth/supabase/", supabase_auth_callback, name="supabase_auth"),
    path("auth/social/", social_auth_signin, name="social_auth"),
    
    # User profile endpoint
    path("profile/", UserProfileDetailView.as_view(), name="user_profile"),
]
