from django.db import models


class Coach(models.Model):
    name = models.CharField(max_length=100)
    goal = models.CharField(max_length=100)
    iconName = models.CharField(max_length=100)
    tagline = models.CharField(max_length=255)
    primaryColorHex = models.CharField(max_length=7)  # e.g., "#FF3B30"

    def __str__(self):
        return self.name
