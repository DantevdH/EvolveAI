# Django Backend Implementation for Scenario Management
# Add this to your Django backend

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# Scenario management
@api_view(['POST'])
def set_scenario(request):
    """
    Set the current scenario for development/testing
    """
    scenario = request.data.get('scenario')
    if not scenario:
        return Response({'error': 'scenario is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Store scenario in session
    request.session['scenario'] = scenario
    return Response({'status': f'scenario set to {scenario}'})

@api_view(['GET'])
def get_user_state(request):
    """
    Get user state based on current scenario
    """
    scenario = request.session.get('scenario', 'new-user')
    
    if scenario == 'new-user':
        return Response({
            'auth_token': None,
            'user_profile': None,
            'has_workout_plan': False
        })
    elif scenario == 'existing-user':
        return Response({
            'auth_token': 'mock-token',
            'user_profile': None,
            'has_workout_plan': False
        })
    elif scenario == 'onboarded-user':
        return Response({
            'auth_token': 'mock-token',
            'user_profile': {
                'id': 1,
                'name': 'Test User',
                'experience_level': 'intermediate',
                'primary_goal': 'strength',
                # ... other profile fields
            },
            'has_workout_plan': False
        })
    elif scenario == 'user-with-plan':
        return Response({
            'auth_token': 'mock-token',
            'user_profile': {
                'id': 1,
                'name': 'Test User',
                'experience_level': 'intermediate',
                'primary_goal': 'strength',
                # ... other profile fields
            },
            'has_workout_plan': True
        })
    elif scenario == 'network-error':
        return Response(
            {'error': 'Network error simulation'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({'error': 'unknown scenario'}, status=status.HTTP_400_BAD_REQUEST)

# Update existing endpoints to respect scenario
@api_view(['GET'])
def get_user_profile(request):
    """
    Get user profile - respects current scenario
    """
    scenario = request.session.get('scenario', 'new-user')
    
    if scenario in ['new-user', 'existing-user']:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    elif scenario == 'network-error':
        return Response(
            {'error': 'Network error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Return mock profile for onboarded-user and user-with-plan
    return Response({
        'id': 1,
        'name': 'Test User',
        'experience_level': 'intermediate',
        'primary_goal': 'strength',
        # ... other profile fields
    })

@api_view(['GET'])
def get_workout_plan(request):
    """
    Get workout plan - respects current scenario
    """
    scenario = request.session.get('scenario', 'new-user')
    
    if scenario in ['new-user', 'existing-user', 'onboarded-user']:
        return Response(
            {'error': 'No workout plan found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    elif scenario == 'network-error':
        return Response(
            {'error': 'Network error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Return mock workout plan for user-with-plan
    return Response({
        'id': 1,
        'title': 'Test Workout Plan',
        'summary': 'A comprehensive workout plan',
        'total_weeks': 12,
        'weekly_schedules': [
            # ... mock workout plan data
        ]
    })

# Add to your Django URLs
"""
urlpatterns = [
    # ... existing URLs
    path('scenarios/set/', set_scenario, name='set_scenario'),
    path('scenarios/user-state/', get_user_state, name='get_user_state'),
    # Update existing endpoints to use scenario-aware versions
]
""" 