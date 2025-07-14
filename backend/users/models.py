# api/models.py
from django.db import models
from django.contrib.auth.models import User 

class Coach(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # We will link this to a real User model later for authentication
    primaryGoal = models.CharField(max_length=200)
    primaryGoalDescription = models.TextField()
    coach = models.ForeignKey(Coach, on_delete=models.SET_NULL, null=True)
    experienceLevel = models.CharField(max_length=50)
    daysPerWeek = models.IntegerField()
    minutesPerSession = models.IntegerField()
    equipment = models.CharField(max_length=200)
    age = models.IntegerField()
    weight = models.FloatField()
    weightUnit = models.CharField(max_length=10)
    height = models.FloatField()
    heightUnit = models.CharField(max_length=10)
    gender = models.CharField(max_length=50)
    hasLimitations = models.BooleanField(default=False)
    limitationsDescription = models.TextField(blank=True, null=True)
    trainingSchedule = models.CharField(max_length=200)
    finalChatNotes = models.TextField(blank=True, null=True)