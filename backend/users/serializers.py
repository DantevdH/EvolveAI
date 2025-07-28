# api/serializers.py
from rest_framework import serializers
from .models import UserProfile, Coach


class CoachSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coach
        fields = ["id", "name"]


class UserProfileSerializer(serializers.ModelSerializer):
    # Make coach optional and allow it to be null
    coach = CoachSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "username",
            "primaryGoal",
            "primaryGoalDescription",
            "coach",
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
            "trainingSchedule",
            "finalChatNotes",
        ]
        # Make coach field not required for input
        extra_kwargs = {
            "coach": {"required": False},
            "primaryGoalDescription": {"required": False},
            "limitationsDescription": {"required": False},
            "trainingSchedule": {"required": False},
            "finalChatNotes": {"required": False},
        }
