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
                1. **Equipment Constraints**: Only use the available equipment listed.
                2. **Progressive Structure**: Plan should be challenging but achievable for the user's level.
                3. **Exercise Authenticity**: ONLY use exercises from the provided exercise list. Do NOT create new exercises.
                4. **Program Duration**: Generate a comprehensive program with at least 4 weeks based on the Evidence-Based Fitness Training documentation, following the training phases and periodization strategies outlined therein.

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
                1. Only use exercises from the provided list (reference by ID)
                2. No duplicate exercise names in the same workout  
                3. Each exercise must have a valid exercise_id

                **EXERCISE REQUIREMENTS:**
                1. Training days should match the user's requested frequency ({user_profile.days_per_week} days/week)
                2. Remaining days should be rest days (is_rest_day=True, empty exercises array)
                3. For training days: is_rest_day=False with appropriate exercises
                4. Keep sessions within the {user_profile.minutes_per_session}-minute timeframe. Calculate workout duration using:
                   - Each rep takes approximately 3 seconds
                   - Rest between sets (depends on intensity and training phase)
                   - Example calculation: 3 exercises × 4 sets × 12 reps × 3 seconds/60 + (3×4-1) × rest time = total minutes
                   - Ensure total time fits within {user_profile.minutes_per_session} minutes
                5. Reps must be a list of integers matching the number of sets (e.g., [8, 10, 8, 10] for 4 sets)
                6. Each exercise must include the exercise_id field from the provided list
                7. You only need to specify: exercise_id, sets, reps, weight_1rm an description - other exercise details come from the database. Provide a brief description for each exercise to help with fallback replacement if needed
                8. Do not specify working weights per set - users will fill these in based on their capabilities
                9. ALWAYS provide the weight as percentage of 1RM (weight_1rm) for each exercise as a list matching the number of sets (e.g., [80, 75, 70] for 3 sets). This should be linked to the goal of the user, the resistance training phase chosen, and the periodization strategy chosen.
                10. **IMPORTANT**: Follow the inverse relationship principle: as reps increase, weight (% of 1RM) should decrease, and vice versa. For example:
                    - High reps (12-15): Lower weight (60-70% of 1RM)
                    - Medium reps (8-12): Medium weight (70-80% of 1RM)  
                    - Low reps (3-6): Higher weight (80-90% of 1RM)
                    - Power reps (1-3): Highest weight (85-95% of 1RM)
                11. For training days, provide specific warming_up_instructions based on the provided documentation
                12. For training days, provide specific cooling_down_instructions based on the provided documentation

                **JUSTIFICATION REQUIREMENTS:**
                
                **Program-Level Justification (program_justification):**
                - Explain the resistance training phases chosen (one or more of: muscular endurance, strength, hypertrophy, power) based on user goals and experience level
                - Detail the periodization strategy (linear, undulating, block, etc.)
                - Describe progressive overload principles and how they're implemented
                - Explain variety and overload prevention strategies
                - Include a brief note on what the next training phase would look like and this fits in the long-term goal
                
                **Weekly-Level Justification (weekly_justification):**
                - Focus on workout day variety and training splits
                - Explain recovery considerations between training days
                - Describe how intensity and volume are balanced within the week
                - Explain the weekly progression strategy
                
                **Daily-Level Justification (daily_justification):**
                - Justify why specific exercises were chosen for each day and the number of exercises (related to the users timeframe for training which is: {user_profile.minutes_per_session} minutes per session)
                - Explain why the weight_1rm percentages were chosen for each set and how they follow the inverse relationship principle (reps vs weight)
                - Explain how exercises work together and complement each other
                - Describe muscle group targeting rationale
                - Explain how each day fits into the weekly progression
                - For rest days, explain the recovery reasoning and what can be done to improve even on a rest day
                - Explain the rationale for warm-up and cool-down activities based on the day's workout intensity and muscle groups targeted

                **OUTPUT FORMAT:**
                **IMPORTANT**: Your response must include multiple weeks (not just 1 week). The program should demonstrate progressive overload and periodization across weeks.
                
                **Program Structure Requirements:**
                - Generate a program with at least 4 weeks based on the Evidence-Based Fitness Training documentation
                - The exact number of weeks should follow the training phases and periodization strategies outlined in the documentation
                - Each week should show progression from the previous week
                - Include periodization (e.g., volume/intensity waves, deload weeks) as specified in the documentation
                - Demonstrate progressive overload principles across weeks according to the documentation guidelines
                
                **🔄 EXERCISE VARIATION & BALANCE:**
                - Vary exercises between weeks while keeping some core movements consistent
                - Ensure balanced muscle targeting (for legs: quads, hamstrings, glutes)
                - No duplicate exercise names within the same workout
                - Progressive overload through both weight increases and exercise variety
                
                Return a structured workout plan with a motivating title and clear summary.
                Ensure every exercise in the plan has a valid exercise_id from the provided list.
                Provide comprehensive justifications at all three levels as specified above.
        """

        return prompt.strip()
    
    def _build_exercise_selection_section(self, exercise_candidates: List[Dict[str, Any]] = None) -> str:
        """Build the exercise selection section for the prompt with target muscle organization."""
        if not exercise_candidates:
            return """
                **EXERCISE LIST:**
                No specific exercises provided. You may select appropriate exercises based on the user's goals and equipment.
                """
        
        # Group exercises by primary muscle target for clearer selection
        muscle_groups = {}
        
        for exercise in exercise_candidates:
            # Use main_muscles for cleaner grouping
            main_muscles = exercise.get('main_muscles', 'Other')
            
            # Handle both string and list formats
            if isinstance(main_muscles, list):
                primary_muscle = main_muscles[0] if main_muscles else 'Other'
            else:
                primary_muscle = main_muscles
            
            if primary_muscle not in muscle_groups:
                muscle_groups[primary_muscle] = []
            muscle_groups[primary_muscle].append(exercise)
        
        exercise_text = "**AVAILABLE EXERCISES (You MUST only use these):**\n\n"
        
        # Display exercises organized by primary muscle groups
        for muscle_group, exercises in muscle_groups.items():
            exercise_text += f"**{muscle_group.upper()} EXERCISES:**\n"
            
            for exercise in exercises:
                exercise_text += f"  - ID: {exercise['id']} | {exercise['name']} "
                exercise_text += f"({exercise['difficulty']}, {exercise['equipment']}, {exercise['exercise_tier']})\n"
            exercise_text += "\n"
        
        # Add simple, clear guidance
        exercise_text += f"\n**SELECTION RULES:**\n"
        exercise_text += f"• Only use exercises from this list (reference by ID)\n"
        exercise_text += f"• Select different exercises each week for variety\n"
        exercise_text += f"• No duplicate exercise names in same workout. Duplicates are also the same exercises with different equipment. For example: 'Seated Calf Raise (Smith)' and 'Seated Calf Raise (Machine)' are the same exercise. \n"
        exercise_text += f"• For legs: include quadriceps, hamstrings, and glutes exercises"
        
        return exercise_text
    