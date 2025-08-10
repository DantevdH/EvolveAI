# In your workouts/views.py file

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
import json

# Import your models and the hard-coded coach data
from users.models import UserProfile
from coaches.serializers import DEFINED_COACHES
from .models import WorkoutPlan, WeeklySchedule, DailyWorkout, Exercise, WorkoutExercise

class GenerateWorkoutView(APIView):
    """
    This view handles the creation of a user's initial workout plan.
    It receives the user's profile from the onboarding flow, saves it,
    and then generates a dummy workout plan linked to that user.
    """
    # --- FIX: Specify the authentication and permission classes ---
    # This tells DRF to use token-based authentication, bypassing CSRF checks.
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # The user is automatically identified from the auth token.
        print("--- Incoming Request Body ---")
        print(json.dumps(request.data, indent=4))
        print("---------------------------")
        user = request.user
        print("success")
         # --- Step 1: Get or Create the User's Profile ---
        profile_data = request.data
        profile_fields = {
            'primaryGoal': profile_data.get('primaryGoal'),
            'primaryGoalDescription': profile_data.get('primaryGoalDescription'),
            'experienceLevel': profile_data.get('experienceLevel'),
            'daysPerWeek': profile_data.get('daysPerWeek'),
            'minutesPerSession': profile_data.get('minutesPerSession'),
            'equipment': profile_data.get('equipment'),
            'age': profile_data.get('age'),
            'weight': profile_data.get('weight'),
            'weightUnit': profile_data.get('weightUnit'),
            'height': profile_data.get('height'),
            'heightUnit': profile_data.get('heightUnit'),
            'gender': profile_data.get('gender'),
            'hasLimitations': profile_data.get('hasLimitations'),
            'limitationsDescription': profile_data.get('limitationsDescription'),
            'finalChatNotes': profile_data.get('finalChatNotes'),
        }

        # This correctly finds the UserProfile linked to the authenticated user.
        user_profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults=profile_fields
        )

        # --- Pre-condition Check using 'user_profile' ---
        # Prevent creating a second plan if one already exists for this user.
        # if WorkoutPlan.objects.filter(user_profile=user_profile).exists() and not created:
        #     return Response(
        #         {"error": "A workout plan already exists for this user."}, 
        #         status=status.HTTP_409_CONFLICT
        #     )

        # --- Step 2: Generate the Dummy Workout Plan ---
        
        # Assign a coach based on the user's selected goal
        user_goal = profile_data.get('primaryGoal', 'General Fitness')
        assigned_coach = next(
            (coach for coach in DEFINED_COACHES if coach['goal'] == user_goal), 
            DEFINED_COACHES[0] # Fallback to the first coach if no match
        )
        print("success 1")
        # Create some dummy exercises (or get them if they already exist)
        push_ups, _ = Exercise.objects.get_or_create(name="Push Ups")
        squats, _ = Exercise.objects.get_or_create(name="Squats")
        plank, _ = Exercise.objects.get_or_create(name="Plank")
        
        # Create a dummy weekly schedule
        week1 = WeeklySchedule.objects.create(week_number=1)
        
        # Day 1: Monday
        monday_workout = DailyWorkout.objects.create(day_of_week="Monday")
        WorkoutExercise.objects.create(daily_workout=monday_workout, exercise=push_ups, sets=3, reps="10-15")
        WorkoutExercise.objects.create(daily_workout=monday_workout, exercise=squats, sets=4, reps="8-12")
        week1.daily_workouts.add(monday_workout)
        
        # Day 2: Tuesday (Rest Day)
        tuesday_workout = DailyWorkout.objects.create(day_of_week="Tuesday")
        week1.daily_workouts.add(tuesday_workout)

        # Day 3: Wednesday
        wednesday_workout = DailyWorkout.objects.create(day_of_week="Wednesday")
        WorkoutExercise.objects.create(daily_workout=wednesday_workout, exercise=plank, sets=3, reps="30-60 seconds")
        week1.daily_workouts.add(wednesday_workout)
        
        print("success 2")
        # --- Step 3: Create the final WorkoutPlan and link everything ---
        # Create the WorkoutPlan using the 'user_profile' instance.
        new_plan, _ = WorkoutPlan.objects.update_or_create(
            user_profile=user_profile,
            title=f"Your New {user_goal} Plan",
            summary=f"A personalized plan by {assigned_coach['name']} to help you achieve your goals.",
            # coach_name=assigned_coach['name']
        )
        new_plan.weekly_schedules.add(week1)
        
        print("success 3")
        # --- Step 4: Return a Success Response ---
        return Response(
            {"status": "success", "message": "Workout plan created successfully."}, 
            status=status.HTTP_201_CREATED
        )
