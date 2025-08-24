from typing import List, Dict, Any


class WorkoutPromptGenerator:
    """Service for generating structured prompts for the LLM."""

    def create_initial_plan_prompt(self, user_profile, exercise_candidates: List[Dict[str, Any]] = None) -> str:
        """
        Create a detailed prompt based on user profile and exercise candidates.
        
        Args:
            user_profile: User profile data
            exercise_candidates: List of exercise candidates from database
        """
        limitations_text = (
            f"Yes: {user_profile.limitations_description}"
            if user_profile.has_limitations
            else "No limitations reported."
        )

        # Build exercise selection section
        exercise_section = self._build_exercise_selection_section(exercise_candidates)

        prompt = f"""
                You are an elite AI fitness architect. Design a safe, effective, and motivating workout plan based on the provided user profile.

                **CRITICAL GUIDELINES:**
                1. **Safety First**: Prioritize user safety. Respect stated limitations and select exercises appropriate for experience level.
                2. **Goal-Focused**: Target the user's primary goal directly. Balance muscle groups appropriately.
                3. **Equipment Constraints**: Only use the available equipment listed.
                4. **Progressive Structure**: Plan should be challenging but achievable for the user's level.
                5. **Exercise Authenticity**: ONLY use exercises from the provided exercise list. Do NOT create new exercises.

                **USER PROFILE:**
                - Primary Goal: {user_profile.primary_goal} ({user_profile.primary_goal_description})
                - Experience Level: {user_profile.experience_level}
                - Workout Frequency: {user_profile.days_per_week} days per week
                - Session Duration: {user_profile.minutes_per_session} minutes per session
                - Available Equipment: {user_profile.equipment}
                - Age: {user_profile.age} years old
                - Gender: {user_profile.gender}
                - Height: {user_profile.height} {user_profile.height_unit}
                - Physical Limitations: {limitations_text}
                - Additional Notes: {user_profile.final_chat_notes or 'None provided'}

                **EXERCISE SELECTION:**
                {exercise_section}
                
                **EXERCISE USAGE RULES:**
                1. You MUST only use exercises from the above list
                2. Reference exercises by their exact ID when creating the workout plan
                3. Do NOT create new exercise names or variations
                4. If you need a different exercise, choose the closest alternative from the list
                5. Each exercise in your workout plan must have a valid exercise_id from the list

                **EXERCISE REQUIREMENTS:**
                1. Training days should match the user's requested frequency ({user_profile.days_per_week} days/week)
                2. Remaining days should be rest days (is_rest_day=True, empty exercises array)
                3. For training days: is_rest_day=False with appropriate exercises
                4. Keep sessions within the {user_profile.minutes_per_session}-minute timeframe
                5. Exercise names should be clear and specific (e.g., "Barbell Back Squat" not just "Squat")
                6. Reps must be a list of integers matching the number of sets (e.g., [8, 10, 8, 10] for 4 sets)
                7. Each exercise must include the exercise_id field from the provided list
                8. You only need to specify: exercise_id, sets, and reps - other exercise details come from the database
                9. Provide a brief description for each exercise to help with fallback replacement if needed
                10. Do not specify weights - users will fill these in based on their capabilities

                **OUTPUT FORMAT:**
                Return a structured workout plan with a motivating title and clear summary.
                Ensure every exercise in the plan has a valid exercise_id from the provided list.
        """

        return prompt.strip()
    
    def _build_exercise_selection_section(self, exercise_candidates: List[Dict[str, Any]] = None) -> str:
        """Build the exercise selection section for the prompt."""
        if not exercise_candidates:
            return """
                **EXERCISE LIST:**
                No specific exercises provided. You may select appropriate exercises based on the user's goals and equipment.
                """
        
        # Group exercises by muscle group for better organization
        muscle_groups = {}
        for exercise in exercise_candidates:
            muscle = exercise.get('main_muscle', 'Other')
            if muscle not in muscle_groups:
                muscle_groups[muscle] = []
            muscle_groups[muscle].append(exercise)
        
        exercise_text = "**AVAILABLE EXERCISES (You MUST only use these):**\n\n"
        
        for muscle_group, exercises in muscle_groups.items():
            exercise_text += f"**{muscle_group.upper()}:**\n"
            for exercise in exercises:
                exercise_text += f"  - ID: {exercise['id']} | {exercise['name']} "
                exercise_text += f"({exercise['difficulty']}, {exercise['equipment']}, {exercise.get('force', 'Unknown')})\n"
            exercise_text += "\n"
        
        exercise_text += f"**Total Available Exercises: {len(exercise_candidates)}**\n"
        exercise_text += "**IMPORTANT: Only use exercises from this list. Reference by ID.**"
        
        return exercise_text
    
    def create_exercise_recommendation_prompt(self, 
                                           muscle_group: str,
                                           difficulty: str,
                                           equipment: List[str],
                                           exercise_candidates: List[Dict[str, Any]]) -> str:
        """
        Create a prompt for exercise recommendations.
        
        Args:
            muscle_group: Target muscle group
            difficulty: Exercise difficulty level
            equipment: Available equipment
            exercise_candidates: List of exercise candidates
        """
        exercise_section = self._build_exercise_selection_section(exercise_candidates)
        
        prompt = f"""
                You are an AI fitness expert. Recommend the best exercises for the specified criteria.

                **REQUIREMENTS:**
                - Muscle Group: {muscle_group}
                - Difficulty Level: {difficulty}
                - Available Equipment: {', '.join(equipment)}
                - You MUST only recommend exercises from the provided list

                **EXERCISE LIST:**
                {exercise_section}

                **RECOMMENDATION RULES:**
                1. Select 5-8 exercises that best match the criteria
                2. Prioritize exercises that target the specified muscle group
                3. Consider the user's difficulty level
                4. Only use exercises from the provided list
                5. Provide a brief explanation for each recommendation

                **OUTPUT FORMAT:**
                Return a list of recommended exercises with:
                - Exercise ID (from the provided list)
                - Exercise name
                - Brief explanation of why it's recommended
                - Suggested sets and reps
        """
        
        return prompt.strip()
    
    def create_workout_modification_prompt(self, 
                                         current_workout: Dict[str, Any],
                                         user_feedback: str,
                                         exercise_candidates: List[Dict[str, Any]]) -> str:
        """
        Create a prompt for modifying existing workouts.
        
        Args:
            current_workout: Current workout plan
            user_feedback: User's feedback/request for changes
            exercise_candidates: Available exercise candidates
        """
        exercise_section = self._build_exercise_selection_section(exercise_candidates)
        
        prompt = f"""
                You are an AI fitness coach. Modify the existing workout plan based on user feedback.

                **CURRENT WORKOUT:**
                {self._format_workout_for_prompt(current_workout)}

                **USER FEEDBACK:**
                {user_feedback}

                **AVAILABLE EXERCISES FOR MODIFICATIONS:**
                {exercise_section}

                **MODIFICATION RULES:**
                1. Only use exercises from the provided list
                2. Maintain the workout structure and goals
                3. Address the user's specific feedback
                4. Keep exercises appropriate for the user's level
                5. Ensure all exercises have valid exercise_ids

                **OUTPUT FORMAT:**
                Return the modified workout plan with the same structure as the original.
                Highlight any changes made and explain the reasoning.
        """
        
        return prompt.strip()
    
    def _format_workout_for_prompt(self, workout: Dict[str, Any]) -> str:
        """Format workout data for inclusion in prompts."""
        try:
            # Extract key workout information
            title = workout.get('title', 'Untitled Workout')
            weeks = workout.get('weeks', [])
            
            workout_text = f"Title: {title}\n"
            workout_text += f"Number of weeks: {len(weeks)}\n\n"
            
            for week_idx, week in enumerate(weeks, 1):
                workout_text += f"Week {week_idx}:\n"
                for day_idx, day in enumerate(week.get('days', []), 1):
                    day_name = day.get('day_name', f'Day {day_idx}')
                    is_rest = day.get('is_rest_day', False)
                    
                    if is_rest:
                        workout_text += f"  {day_name}: Rest day\n"
                    else:
                        exercises = day.get('exercises', [])
                        workout_text += f"  {day_name}: {len(exercises)} exercises\n"
                        for exercise in exercises[:3]:  # Show first 3 exercises
                            workout_text += f"    - {exercise.get('name', 'Unknown')}\n"
                        if len(exercises) > 3:
                            workout_text += f"    ... and {len(exercises) - 3} more\n"
                workout_text += "\n"
            
            return workout_text
            
        except Exception as e:
            return f"Error formatting workout: {e}"
