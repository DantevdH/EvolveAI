# api/serializers.py
from rest_framework import serializers
from .models import UserProfile, Coach

class CoachSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coach
        fields = ['name']

class UserProfileSerializer(serializers.ModelSerializer):
    coach = CoachSerializer() # Nest the coach serializer

    class Meta:
        model = UserProfile
        fields = '__all__' # Include all fields from the model