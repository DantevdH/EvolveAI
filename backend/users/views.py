from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.conf import settings
from .models import UserProfile
from .serializers import UserProfileSerializer
from mock.scenario_auth import ScenarioAwareAuthentication, ScenarioAwarePermission
from mock.scenario_mixin import ScenarioMixin
from mock.scenario_manager import ScenarioManager, Scenario
from mock.scenario_views import MOCK_USER_PROFILE
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .supabase_auth import supabase_auth
from .authentication import SupabaseOrTokenAuthentication

# Create your views here.


class UserProfileDetailView(ScenarioMixin, APIView):
    """
    Retrieve or update the user's profile.
    """

    authentication_classes = [SupabaseOrTokenAuthentication]
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
            
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            serializer = UserProfileSerializer(user_profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND
            )


@api_view(['POST'])
def scenario_aware_login(request):
    """
    Scenario-aware login endpoint. Always returns a mock token for mock scenarios.
    """
    
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


@api_view(['POST'])
def supabase_auth_callback(request):
    """
    Handle Supabase authentication callback.
    This endpoint receives the Supabase JWT token and returns a Django token.
    """
    scenario = ScenarioManager.get_current_scenario(request)
    if scenario:
        if ScenarioManager.should_return_network_error(scenario):
            return ScenarioManager.create_network_error_response()
        return Response({"token": "mock-token"}, status=status.HTTP_200_OK)
    
    # Get the Supabase JWT token from the request
    supabase_token = request.data.get('access_token')
    if not supabase_token:
        return Response({'error': 'Access token required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Authenticate with Supabase
        user = supabase_auth.authenticate_with_supabase_token(supabase_token)
        if not user:
            return Response({'error': 'Invalid Supabase token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get or create Django token
        django_token = supabase_auth.get_django_token_for_user(user)
        
        return Response({
            'token': django_token,
            'user_id': user.id,
            'email': user.email
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': f'Authentication failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def social_auth_signin(request):
    """
    Handle social authentication sign-in (Google, Facebook, Apple).
    """
    scenario = ScenarioManager.get_current_scenario(request)
    if scenario:
        if ScenarioManager.should_return_network_error(scenario):
            return ScenarioManager.create_network_error_response()
        return Response({"token": "mock-token"}, status=status.HTTP_200_OK)
    
    provider = request.data.get('provider')  # 'google', 'facebook', 'apple'
    access_token = request.data.get('access_token')
    
    if not provider or not access_token:
        return Response({'error': 'Provider and access token required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Sign in with social provider
        result = supabase_auth.sign_in_with_social_provider(provider, access_token)
        if not result:
            return Response({'error': 'Social authentication failed.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response({
            'token': result['token'],
            'user_id': result['user'].id,
            'email': result['user'].email
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': f'Social authentication failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
