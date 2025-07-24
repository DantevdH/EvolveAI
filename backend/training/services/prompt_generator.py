from users.models import UserProfile


class WorkoutPromptGenerator:
    """Service for generating structured prompts for the LLM."""

    def create_initial_plan_prompt(self, user_profile: UserProfile) -> str:
        """Create a detailed prompt based on user profile."""

        limitations_text = (
            f"Yes: {user_profile.limitationsDescription}"
            if user_profile.hasLimitations
            else "No limitations reported."
        )

        prompt = f"""
                You are an elite AI fitness architect. Design a safe, effective, and motivating workout plan based on the provided user profile.

                **CRITICAL GUIDELINES:**
                1. **Safety First**: Prioritize user safety. Respect stated limitations and select exercises appropriate for experience level.
                2. **Goal-Focused**: Target the user's primary goal directly. Balance muscle groups appropriately.
                3. **Equipment Constraints**: Only use the available equipment listed.
                4. **Progressive Structure**: Plan should be challenging but achievable for the user's level.

                **USER PROFILE:**
                - Primary Goal: {user_profile.primaryGoal} ({user_profile.primaryGoalDescription})
                - Experience Level: {user_profile.experienceLevel}
                - Workout Frequency: {user_profile.daysPerWeek} days per week
                - Session Duration: {user_profile.minutesPerSession} minutes per session
                - Available Equipment: {user_profile.equipment}
                - Age: {user_profile.age} years old
                - Gender: {user_profile.gender}
                - Weight: {user_profile.weight} {user_profile.weightUnit}
                - Height: {user_profile.height} {user_profile.heightUnit}
                - Physical Limitations: {limitations_text}
                - Additional Notes: {user_profile.finalChatNotes or 'None provided'}

                **SPECIFIC REQUIREMENTS:**
                1. Generate exactly 4 weeks of workout plans
                2. Each week must have exactly 7 days (Monday through Sunday)
                3. Training days should match the user's requested frequency ({user_profile.daysPerWeek} days/week)
                4. Remaining days should be rest days (is_rest_day=True, empty exercises array)
                5. For training days: is_rest_day=False with appropriate exercises
                6. Keep sessions within the {user_profile.minutesPerSession}-minute timeframe
                7. Exercise names should be clear and specific (e.g., "Barbell Back Squat" not just "Squat")
                8. Reps can be ranges (e.g., "8-12") or time-based (e.g., "30 seconds", "1 minute")

                **OUTPUT FORMAT:**
                Return a structured workout plan with a motivating title and clear summary.
        """

        return prompt.strip()
