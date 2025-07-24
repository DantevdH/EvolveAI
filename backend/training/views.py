from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
import openai
from django.conf import settings
from django.db import transaction

from users.models import UserProfile
from .models import WorkoutPlan
from .serializers import WorkoutPlanSerializer
from .schemas import WorkoutPlanSchema
from .services.prompt_generator import WorkoutPromptGenerator
from .services.database_service import WorkoutPlanDatabaseService


class GenerateWorkoutView(APIView):
    """Generate a new workout plan using OpenAI and save to database."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Generate and save a new workout plan."""

        # Step 1: Create/update user profile
        user_profile = self._create_or_update_user_profile(request)

        # Step 2: Generate workout plan via OpenAI
        try:
            workout_plan = self._generate_workout_plan_from_ai(user_profile)
        except Exception as e:
            return Response(
                {"error": f"Failed to generate workout plan: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Step 3: Save to database
        try:
            with transaction.atomic():
                db_service = WorkoutPlanDatabaseService(user_profile)
                db_workout_plan = db_service.create_workout_plan(workout_plan)

        except Exception as e:
            return Response(
                {"error": f"Failed to save workout plan: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "status": "success",
                "message": "Workout plan created successfully.",
                "plan_title": workout_plan.title,
            },
            status=status.HTTP_201_CREATED,
        )

    def _create_or_update_user_profile(self, request) -> UserProfile:
        """Create or update user profile from request data."""
        profile_data = request.data
        profile_fields = {
            field: profile_data.get(field)
            for field in [
                "primaryGoal",
                "primaryGoalDescription",
                "experienceLevel",
                "daysPerWeek",
                "minutesPerSession",
                "equipment",
                "age",
                "weight",
                "weightUnit",
                "height",
                "heightUnit",
                "gender",
                "hasLimitations",
                "limitationsDescription",
                "finalChatNotes",
            ]
        }

        user_profile, _ = UserProfile.objects.update_or_create(
            user=request.user, defaults=profile_fields
        )
        return user_profile

    def _generate_workout_plan_from_ai(
        self, user_profile: UserProfile
    ) -> WorkoutPlanSchema:
        """Generate workout plan using OpenAI API."""
        # Generate prompt
        prompt_generator = WorkoutPromptGenerator()
        prompt = prompt_generator.create_initial_plan_prompt(user_profile)

        # Call OpenAI API
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        completion = client.chat.completions.parse(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            response_format=WorkoutPlanSchema,
            temperature=settings.OPENAI_TEMPERATURE,
        )

        # Return parsed and validated Pydantic model
        return completion.choices[0].message.parsed


class WorkoutPlanDetailView(APIView):
    """Retrieve the user's current workout plan."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Get the user's current workout plan."""
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            workout_plan = WorkoutPlan.objects.get(user_profile=user_profile)
            serializer = WorkoutPlanSerializer(workout_plan)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except WorkoutPlan.DoesNotExist:
            return Response(
                {"error": "No workout plan found."}, status=status.HTTP_404_NOT_FOUND
            )
