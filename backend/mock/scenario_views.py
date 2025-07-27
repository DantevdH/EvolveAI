import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .mock_data import MOCK_USER_PROFILE, MOCK_WORKOUT_PLAN

@api_view(['POST'])
def set_scenario(request):
    """
    Set the current scenario for development/testing.
    Example scenarios: new-user, existing-user, onboarded-user, user-with-plan, network-error.
    """
    scenario = request.data.get('scenario')
    print(f"[DEBUG] set_scenario received: {scenario}")
    # Store scenario in session
    request.session['scenario'] = scenario
    print(f"[DEBUG] set_scenario session key after set: {request.session.session_key}")
    print(f"[SCENARIO] Set to: {scenario}")
    return Response({'status': f'scenario set to {scenario}'}) 