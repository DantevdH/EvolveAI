from django.contrib import admin
from .models import UserProfile


# The @admin.register decorator is a clean way to register your models.
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Customizes the display of the UserProfile model in the Django admin panel.
    """

    # list_display controls which fields are shown in the main list view.
    # We can reach into the related User model to get the username.
    list_display = ("user", "primaryGoal", "experienceLevel", "gender", "age")

    # list_filter adds a sidebar to filter results by these fields.
    list_filter = ("experienceLevel", "gender", "primaryGoal")

    # search_fields adds a search bar to search across these fields.
    # We can search by the related user's username, first name, or email.
    search_fields = ("user__username", "user__first_name", "user__email", "primaryGoal")

    # This makes the user field a read-only link in the detail view.
    readonly_fields = ("user",)
