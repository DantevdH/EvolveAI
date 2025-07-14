from django.urls import path
# Import the view that provides the token
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    # This endpoint will listen for POST requests with 'username' and 'password'
    # and will return a token if they are valid.
    path('login/', obtain_auth_token, name='api_token_auth'),
]