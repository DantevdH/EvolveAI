from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
import openai
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta

from users.models import UserProfile
from .models import (
    WorkoutPlan,
    WorkoutProgress,
    ExerciseProgress,
    WorkoutSession,
    WorkoutExercise,
    DailyWorkout,
)
from .serializers import (
    WorkoutPlanSerializer,
    WorkoutProgressSerializer,
    ExerciseProgressSerializer,
    WorkoutSessionSerializer,
)
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

                # Step 4: Initialize progress tracking
                self._initialize_progress_tracking(user_profile, db_workout_plan)

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

    def _initialize_progress_tracking(
        self, user_profile: UserProfile, workout_plan: WorkoutPlan
    ):
        """Initialize progress tracking for the new workout plan."""
        # Create or update WorkoutProgress
        workout_progress, created = WorkoutProgress.objects.update_or_create(
            user_profile=user_profile,
            defaults={
                "workout_plan": workout_plan,
                "current_week": 1,
                "current_day_index": 0,
            },
        )

        # Initialize ExerciseProgress for all exercises (all start as incomplete)
        for weekly_schedule in workout_plan.weekly_schedules.all():
            for daily_workout in weekly_schedule.daily_workouts.all():
                for workout_exercise in daily_workout.workoutexercise_set.all():
                    ExerciseProgress.objects.get_or_create(
                        user_profile=user_profile,
                        workout_exercise=workout_exercise,
                        defaults={"is_completed": False},
                    )

        # Initialize WorkoutSession for all daily workouts across all weeks
        for weekly_schedule in workout_plan.weekly_schedules.all():
            for daily_workout in weekly_schedule.daily_workouts.all():
                WorkoutSession.objects.get_or_create(
                    user_profile=user_profile,
                    daily_workout=daily_workout,
                    week_number=weekly_schedule.week_number,
                    defaults={"is_completed": False},
                )


class WorkoutPlanDetailView(APIView):
    """Retrieve the user's current workout plan with progress."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Get the user's current workout plan with progress data."""
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            workout_plan = WorkoutPlan.objects.get(user_profile=user_profile)

            # Add request context for serializer to access user progress
            serializer = WorkoutPlanSerializer(
                workout_plan, context={"request": request}
            )

            # Get progress information
            try:
                progress = WorkoutProgress.objects.get(user_profile=user_profile)
                progress_data = WorkoutProgressSerializer(progress).data
            except WorkoutProgress.DoesNotExist:
                # Initialize progress if it doesn't exist
                progress = WorkoutProgress.objects.create(
                    user_profile=user_profile,
                    workout_plan=workout_plan,
                    current_week=1,
                    current_day_index=0,
                )
                progress_data = WorkoutProgressSerializer(progress).data

            return Response(
                {"workout_plan": serializer.data, "progress": progress_data},
                status=status.HTTP_200_OK,
            )

        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except WorkoutPlan.DoesNotExist:
            return Response(
                {"error": "No workout plan found."}, status=status.HTTP_404_NOT_FOUND
            )


class ProgressTrackingView(APIView):
    """Handle progress updates - batch updates for efficiency."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Batch update exercise progress."""
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            progress = WorkoutProgress.objects.get(user_profile=user_profile)

            # Get current week to prevent modifying past workouts
            current_week = progress.current_week
            updates = request.data.get("updates", [])

            with transaction.atomic():
                for update in updates:
                    exercise_id = update.get("exercise_id")
                    is_completed = update.get("is_completed")
                    week_number = update.get("week_number", current_week)

                    # Prevent modifying past weeks
                    if week_number < current_week:
                        continue

                    try:
                        workout_exercise = WorkoutExercise.objects.get(id=exercise_id)
                        exercise_progress, created = (
                            ExerciseProgress.objects.get_or_create(
                                user_profile=user_profile,
                                workout_exercise=workout_exercise,
                                defaults={"is_completed": is_completed},
                            )
                        )

                        if not created:
                            exercise_progress.is_completed = is_completed
                            if is_completed:
                                exercise_progress.completed_at = timezone.now()
                            else:
                                exercise_progress.completed_at = None
                            exercise_progress.save()

                    except WorkoutExercise.DoesNotExist:
                        continue

                # Update workout session completion status
                self._update_workout_sessions(user_profile, current_week)

                # Update overall progress
                progress.last_updated = timezone.now()
                progress.save()

            return Response({"status": "success"}, status=status.HTTP_200_OK)

        except (UserProfile.DoesNotExist, WorkoutProgress.DoesNotExist):
            return Response(
                {"error": "User progress not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def _update_workout_sessions(self, user_profile: UserProfile, current_week: int):
        """Update workout session completion based on exercise completion."""
        workout_sessions = WorkoutSession.objects.filter(
            user_profile=user_profile, week_number=current_week
        )

        for session in workout_sessions:
            # Check if all exercises in this workout are completed
            all_exercises = session.daily_workout.workoutexercise_set.all()
            if all_exercises.exists():
                completed_exercises = ExerciseProgress.objects.filter(
                    user_profile=user_profile,
                    workout_exercise__in=all_exercises,
                    is_completed=True,
                ).count()

                session.is_completed = completed_exercises == all_exercises.count()
                if session.is_completed and not session.completed_at:
                    session.completed_at = timezone.now()
                elif not session.is_completed:
                    session.completed_at = None
                session.save()


class WeekProgressView(APIView):
    """Handle week progression and access control."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Update current week."""
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            progress = WorkoutProgress.objects.get(user_profile=user_profile)

            new_week = request.data.get("week")
            max_week = progress.workout_plan.weekly_schedules.count()

            # Validate week number
            if 1 <= new_week <= max_week:
                # Only allow moving forward to next week or staying on current
                if new_week >= progress.current_week:
                    progress.current_week = new_week
                    progress.current_day_index = 0  # Reset to Monday
                    progress.last_updated = timezone.now()
                    progress.save()

                    return Response(
                        {
                            "current_week": progress.current_week,
                            "current_day_index": progress.current_day_index,
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        {"error": "Cannot go back to previous weeks"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                return Response(
                    {"error": "Invalid week number"}, status=status.HTTP_400_BAD_REQUEST
                )

        except (UserProfile.DoesNotExist, WorkoutProgress.DoesNotExist):
            return Response(
                {"error": "User progress not found."}, status=status.HTTP_404_NOT_FOUND
            )
