from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.conf import settings
from .models import UserProfile
from .serializers import UserProfileSerializer
from training.scenario_auth import ScenarioAwareAuthentication, ScenarioAwarePermission
from training.scenario_mixin import ScenarioMixin
from training.scenario_manager import ScenarioManager
from training.scenario_views import MOCK_USER_PROFILE
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User

# Create your views here.


class UserProfileDetailView(ScenarioMixin, APIView):
    """
    Retrieve or update the user's profile.
    """

    authentication_classes = [ScenarioAwareAuthentication]
    permission_classes = [ScenarioAwarePermission]

    def get(self, request, *args, **kwargs):
        """Get the current user's profile."""
        # Check for scenario response first
        scenario_response = self.handle_scenario_response(request, 'profile')
        print(scenario_response)
        if scenario_response:
            return scenario_response
            
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            serializer = UserProfileSerializer(user_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def put(self, request, *args, **kwargs):
        """Update the current user's profile."""
        # Check for scenario response first
        scenario_response = self.handle_scenario_response(request, 'profile')
        if scenario_response:
            return scenario_response
        
        # If we reach here, it means we're in a scenario that should succeed
        # or we have a real authenticated user
        # For scenarios, just return success with mock data
        scenario = ScenarioManager.get_current_scenario(request)
        if scenario:
            # Return mock profile data for successful scenarios
            return Response(MOCK_USER_PROFILE, status=status.HTTP_200_OK)
        
        # For real users, actually save to database
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            # Create new profile if it doesn't exist
            user_profile = UserProfile(user=request.user)

        serializer = UserProfileSerializer(
            user_profile, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def scenario_aware_login(request):
    """
    Scenario-aware login endpoint. Always returns a mock token for mock scenarios.
    """
    from training.scenario_manager import ScenarioManager, Scenario
    scenario = ScenarioManager.get_current_scenario(request)
    if scenario:
        if ScenarioManager.should_return_network_error(scenario):
            return ScenarioManager.create_network_error_response()
        # Always return a mock token for all other scenarios
        return Response({"token": "mock-token"}, status=status.HTTP_200_OK)
    # Fallback to real login for non-scenario (production)
    # (You can optionally copy the logic from obtain_auth_token here)
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Username and password required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(username=username)
        if not user.check_password(password):
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key}, status=status.HTTP_200_OK)
