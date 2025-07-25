from django.urls import path

# Import the view that provides the token
from rest_framework.authtoken.views import obtain_auth_token
from .views import UserProfileDetailView

urlpatterns = [
    # This endpoint will listen for POST requests with 'username' and 'password'
    # and will return a token if they are valid.
    path("login/", obtain_auth_token, name="api_token_auth"),
    # This endpoint handles user profile GET and PUT requests
    path("profile/", UserProfileDetailView.as_view(), name="user_profile"),
]
