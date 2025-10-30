"""
Prompt Generator for training Coach AI interactions.

This module contains all the prompts used by the TrainingCoach for generating
questions, training plan outlines, and training plans.
"""

import json
from typing import List, Dict
from core.training.schemas.question_schemas import PersonalInfo, AIQuestion


class PromptGenerator:
    """Generates prompts for different AI interactions in the training coaching system."""

    @staticmethod
    def get_question_generation_intro() -> str:
        """Get the introduction for question generation prompts."""
        return """
        You are an expert training coach designing personalized training plans. Your questions gather information ABOUT THE USER so you can apply your coaching expertise to design their optimal plan.
        
        **Your Goal:** Collect facts about the user's life, constraints, and preferences. YOU will use this to create their tailored training plan.
        
        **IMPORTANT - App Scope:**
        This app creates SUPPLEMENTAL training programs (strength & conditioning).
        • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
        • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
        • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
        
        **🏆 THE GOLDEN RULE:**
        Gather USER CONTEXT. You handle creating the training plan. Ask only questions that are relevant to designing the training plan.

        **What to Ask (Learn About THEM):**
        • **Constraints:** Injuries, equipment access, time availability, existing training commitments
        • **Preferences:** Activities enjoyed/avoided, focus areas (muscles to train, etc)
        • **Situation:** Lifestyle factors (work, stress, sleep), schedule
        • **Goals:** Specific outcomes, motivation, priorities
        
        YOU decide: activities, structure, periodization, volume, intensity, and all programming.

        **What NOT to Ask (YOU Decide):**
        • How to structure their training (splits, frequency, progression models)
        • What volumes and intensities to prescribe
        • How to periodize their plan
        • All technical coaching decisions based on their goal and experience level
        • Nutrition is not relevant to training plan for now so do not go into it whatsoever.

        **Litmus Test:** 
        Would this question make a user feel confused or intimidated? 
        If yes, it's too technical—decide it yourself based on your expertise and the user's input.

        **Remember:** 
        Users tell us ABOUT themselves. Coaches design the TRAINING.
        """

    @staticmethod
    def format_client_information(personal_info: PersonalInfo) -> str:
        """Format client information for prompts."""
        return f"""
        Client Information:
        - Name: {personal_info.username}
        - Age: {personal_info.age}
        - Weight: {personal_info.weight} {personal_info.weight_unit}
        - Height: {personal_info.height} {personal_info.height_unit}
        - Gender: {personal_info.gender}
        - Experience Level: {personal_info.experience_level}
        - Primary Goal: {personal_info.goal_description}
        - Measurement System: {personal_info.measurement_system}
        """

    @staticmethod
    def format_playbook_lessons(
        playbook, personal_info: PersonalInfo, context: str = "training"
    ) -> str:
        """
        Format playbook lessons for inclusion in prompts.

        Args:
            playbook: UserPlaybook object or list of lesson dicts
            personal_info: PersonalInfo object for personalization
            context: Context for the prompt ("outline" or "training")

        Returns:
            Formatted playbook context string
        """
        if not playbook:
            return ""

        # Handle both UserPlaybook objects and list of dicts
        if hasattr(playbook, "lessons"):
            lessons = playbook.lessons
        elif isinstance(playbook, list):
            lessons = playbook
        else:
            return ""

        if not lessons or len(lessons) == 0:
            return ""

        # Choose header based on context
        if context == "outline":
            header = f"""
            **🧠 PERSONALIZED CONSTRAINTS & PREFERENCES:**
            
            Based on {personal_info.username}'s onboarding responses, these are the key constraints and preferences to follow:
        
            """
            footer = f"""
            **IMPORTANT:** These are fundamental constraints extracted from the onboarding assessment.
            The outline MUST respect these limitations and preferences.
            """
        else:  # context == "training"
            header = f"""
            **🧠 PERSONALIZED PLAYBOOK - LESSONS FROM {personal_info.username.upper()}'S TRAINING HISTORY:**
            
            These are proven insights from {personal_info.username}'s previous training outcomes. 
            YOU MUST follow these lessons when creating this plan:
            """

            footer = f"""
            **CRITICAL:** These lessons are based on real outcomes from {personal_info.username}'s training.
            Ignoring them may lead to poor adherence, injury, or failure to achieve goals.
            """

        # Separate positive lessons and warnings
        positive_lessons = [
            l
            for l in lessons
            if (l.positive if hasattr(l, "positive") else l.get("positive", True))
        ]
        warning_lessons = [
            l
            for l in lessons
            if not (l.positive if hasattr(l, "positive") else l.get("positive", True))
        ]

        # Build the content
        content = ""

        if positive_lessons:
            if context == "outline":
                content += f"        ✅ **Capabilities & Preferences:**\n"
            else:
                content += f"        ✅ **What Works for {personal_info.username}:**\n"

            for lesson in positive_lessons:
                if hasattr(lesson, "text"):
                    text = lesson.text
                    confidence = lesson.confidence
                    helpful = lesson.helpful_count
                else:
                    text = lesson.get("text", "")
                    confidence = lesson.get("confidence", 0.5)
                    helpful = lesson.get("helpful_count", 0)
                
                # Escape curly braces in lesson text to prevent format errors
                safe_text = str(text).replace("{", "{{").replace("}", "}}")

                if context == "outline":
                    content += f"        - {safe_text}\n"
                else:
                    content += f"        - {safe_text} (confidence: {confidence:.0%}, proven {helpful}x)\n"

        if warning_lessons:
            if context == "outline":
                content += f"\n        ⚠️  **Constraints & Limitations:**\n"
            else:
                content += f"\n        ⚠️  **What to Avoid:**\n"

            for lesson in warning_lessons:
                if hasattr(lesson, "text"):
                    text = lesson.text
                    confidence = lesson.confidence
                    harmful = lesson.harmful_count
                else:
                    text = lesson.get("text", "")
                    confidence = lesson.get("confidence", 0.5)
                    harmful = lesson.get("harmful_count", 0)
                
                # Escape curly braces in lesson text to prevent format errors
                safe_text = str(text).replace("{", "{{").replace("}", "}}")

                if context == "outline":
                    content += f"        - {safe_text}\n"
                else:
                    content += f"        - {safe_text} (confidence: {confidence:.0%}, learned from {harmful} negative outcome(s))\n"

        return header + content + footer

    @staticmethod
    def get_question_generation_instructions() -> str:
        """Get instructions for question generation."""
        return """
        **QUESTION TYPE SELECTION GUIDE:**
        
        Choose based on HOW the user should respond:
        
        **1. MULTIPLE_CHOICE** - 2-5 distinct options
        • User picks ONE from short list
        • Example: "Preferred training environment?" → Home, Gym, Outdoors, Hybrid
        • Use for: Clear categories, mutually exclusive choices
        • Required: help_text, options[{id, text, value}]
        
        **2. DROPDOWN** - 6+ options
        • User selects ONE from longer list
        • Example: "Primary sport?" → 50+ sports list
        • Use for: Many predefined options, single selection
        • Required: help_text, options[{id, text, value}]
        
        **3. RATING** - Subjective scale (up to 5 points, else use slider)
        • User rates on discrete scale with labeled endpoints
        • Example: "Energy level?" → 1 (Always Tired) to 5 (Highly Energetic)
        • Use for: Opinions, quality assessments, subjective measures
        • Required: help_text, min_value, max_value, min_description, max_description
        
        **4. SLIDER** - Continuous numeric range (6+ distinct values)
        • User selects specific quantity from range
        • Example: "How many hours per week can you train?" → min_value: 2, max_value: 20, step: 0.5, unit: "hours"
        • Use for: Quantities, measurements, continuous ranges
        • Required: help_text, min_value, max_value, step, unit
        • ⚠️ CRITICAL: unit must be a SINGLE STRING (e.g., "days", "hours", "kg") NOT an array
        • DO NOT include: max_length, placeholder (those are for FREE_TEXT, not SLIDER)
        
        **5. FREE_TEXT** - Open-ended description (USE SPARINGLY)
        • User writes detailed response
        • Example: "Describe past injuries affecting training?"
        • Use for: Complex context requiring narrative explanation
        • Limit: 1-2 per assessment phase (slow to answer)
        • Required: help_text, placeholder, max_length (200-500)
        
        **6. CONDITIONAL_BOOLEAN** - Yes/No with conditional detail (USE SPARINGLY)
        • "Yes" requires elaboration; "No" skips
        • Example: "Any dietary restrictions?" → Yes (describe) / No
        • Use for: Screening questions where "No" = no further info needed
        • Limit: 1-2 per assessment phase (adds complexity)
        • Required: help_text, placeholder, max_length (200-500)
        
        **UX OPTIMIZATION RULES:**
        ✓ Prefer structured types (1-4) - faster, easier to answer
        ✓ Limit open formats (5-6) to 20-30% of total questions
        ✓ Use CONDITIONAL_BOOLEAN instead of FREE_TEXT when applicable
        
        **CRITICAL: Field Requirements by Type**
        
        For each response_type, populate ONLY the relevant fields (omit or set others to null):
        
        • MULTIPLE_CHOICE: options[] (array of {id, text, value})
        • DROPDOWN: options[] (array of {id, text, value})
        • RATING: min_value, max_value, min_description, max_description
        • SLIDER: min_value, max_value, step, unit (STRING, not array!)
        • FREE_TEXT: max_length, placeholder
        • CONDITIONAL_BOOLEAN: max_length, placeholder
        
        ⚠️ ALL fields must be the correct type:
        • Numeric fields: numbers (not strings)
        • String fields: single strings (NOT arrays!)
        • Array fields: arrays of objects
        
        **COMMON ERROR TO AVOID:**
        ❌ WRONG: Slider with max_length and placeholder (those are FREE_TEXT fields!)
        ✓ CORRECT: Slider with min_value, max_value, step, unit
        
        **COMPLETE EXAMPLES:**
        
        ✅ SLIDER (numeric range with steps):
        {
          "id": "training_days",
          "text": "How many days per week can you train?",
          "help_text": "Select your realistic training frequency",
          "response_type": "slider",
          "min_value": 1,
          "max_value": 7,
          "step": 1,
          "unit": "days"  // ⚠️ Must be string, NOT ["days"]
        }
        
        ✅ FREE_TEXT (open-ended input):
        {
          "id": "injury_details",
          "text": "Describe any injuries or limitations",
          "help_text": "Help us design a safe program",
          "response_type": "free_text",
          "max_length": 300,
          "placeholder": "E.g., lower back pain, knee sensitivity..."
        }
        
        ✅ MULTIPLE_CHOICE (select from options):
        {
          "id": "training_goal",
          "text": "What is your primary training goal?",
          "help_text": "Choose the goal that matters most to you",
          "response_type": "multiple_choice",
          "options": [
            {"id": "strength", "text": "Build Strength", "value": "strength"},
            {"id": "muscle", "text": "Gain Muscle", "value": "muscle"},
            {"id": "endurance", "text": "Improve Endurance", "value": "endurance"}
          ]
        }
        
        ✅ CONDITIONAL_BOOLEAN (ONLY when user has EXISTING scheduled training commitments):
        {
          "id": "existing_training",
          "text": "Do you already have regular training or practice sessions?",
          "help_text": "For example: team practices, club sessions, scheduled classes, or matches",
          "response_type": "conditional_boolean",
          "max_length": 300,
          "placeholder": "E.g., football practice Mon/Wed/Fri 2 hours + game Saturday, tennis club Tuesday/Thursday, martial arts class Wednesday..."
        }
        Note: Only use this if user has EXISTING commitments (team practices, sport club sessions, scheduled classes). NOT for general fitness goals where we're creating their plan from scratch.
        """

    @staticmethod
    def generate_initial_questions_prompt(personal_info: PersonalInfo) -> str:
        """Generate the complete prompt for initial questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        **WORKFLOW STATUS:**
        🎯 **CURRENT STEP:** Initial Assessment Questions (Round 1 of 2)
        {personal_info.username} has provided basic profile information above. This is the FIRST round of questions. Generate broad, targeted questions to gather essential details about their constraints, preferences, situation, and goal specifics. 
        A second round of follow-up questions will come after to clarify and refine.

        {PromptGenerator.format_client_information(personal_info)}
        
        **USER PROFILE:**
        • Goal: "{personal_info.goal_description}"
        • Experience: {personal_info.experience_level}
    
        **CRITICAL FOR STRENGTH TRAINING:**
        If the plan will include ANY strength training, you MUST ask this question EXACTLY:
        • Question: "What training equipment do you have access to?"
        • Type: multiple_choice
        • Options (in this order):
          - "Body Weight Only" → No equipment available
          - "Dumbbells" → Have dumbbells at home or gym
          - "Full Gym Access" → Barbell, machines, cables, racks, etc.
          - "Resistance Bands" → Bands and similar portable equipment
        • This is ESSENTIAL to match exercises to available equipment
        
        **QUESTION FOCUS AREAS FOR INITIAL QUESTIONS:**
        1. Goal specifics (targets, timeline, priorities)
        2. Existing commitments (team practices, sport club sessions, scheduled classes, or matches that we need to work around)
        3. Resources (equipment, location, schedule availability for NEW training sessions we need to schedule)
        4. Current abilities (baseline for goal-relevant activities)
        5. Preferences (preferred/avoided training approaches)
        6. Limitations (injuries, restrictions, constraints)

        **REQUIREMENTS:**
        ✓ Ask 7-10 questions that gather ESSENTIAL information for plan design
        ✓ Better to ask 5 focused questions than 8 with irrelevant ones
        ✓ Use varied question types - limit open formats to 20-30% (1-2 questions max)
        ✓ Adapt complexity to {personal_info.experience_level} level
        ✓ If goal is vague/unclear, include clarifying question first
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **AI MESSAGE (max 70 words):**
        Write an enthusiastic and motivational message that:
        • Opens with a friendly greeting using {personal_info.username}
        • Briefly mentions that you have analysed their profile and are excited about their goal: {personal_info.goal_description}
        • Mention that based on your analysis you have afew more questions to refine their plan
        • Includes 2–3 fitting emojis (e.g., fitness, energy, or motivation themed)
        • Ends with a strong call-to-action that makes them eager to start training
        • The tone should be energetic, personal, and confidence-boosting, making the user feel like they’re about to begin something transformative.
        
        Return: AIQuestionResponse schema with ai_message populated.
        """

    @staticmethod
    def generate_followup_questions_prompt(
        personal_info: PersonalInfo, formatted_responses: str
    ) -> str:
        """Generate the complete prompt for follow-up questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **WORKFLOW STATUS:**
        ✅ **COMPLETED:** Initial Assessment Questions (Round 1) - Gathered broad information about constraints, preferences, and goals
        🎯 **CURRENT STEP:** Follow-up Questions (Round 2 of 2)
        {personal_info.username} answered the first round of questions. This is the SECOND and FINAL round. Review their responses below and ask targeted follow-up questions to clarify critical gaps and refine your understanding of their situation.
        
        **INITIAL RESPONSES:**
        {formatted_responses}
        
        **STRATEGIC APPROACH:**
        1. Review responses → identify missing information for complete plan design
        2. Focus on gaps, NOT redundant or new unrelated topics
        3. Zoom in on already-discovered areas requiring clarification
        
        **REQUIREMENTS:**
        ✓ Ask 3-7 questions that fill CRITICAL gaps in understanding the USER
        ✓ Better to ask 3 essential questions than 7 with redundant ones
        ✓ No repetition of already-gathered information
        ✓ Use varied question types - limit open formats to 30% max
        ✓ Be specific to their responses and goal
        ✓ Fewer questions if info is nearly complete
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **AI MESSAGE (max 70 words):**
        Write a warm, upbeat message that:
        • Starts with a friendly greeting using {personal_info.username}
        • Acknowledges their great initial responses with positivity and encouragement
        • References specific details they mentioned (e.g., equipment, goals, or constraints) to show attentiveness
        • Explains how these details help refine their perfect personalized plan
        • Includes 2–3 relevant emojis (fitness, excitement, or motivation themed)
        • Ends with a clear next step or call to action
        The tone should be motivational, conversational, and reassuring, making the user feel confident that their plan is being expertly customized for them.
        
        Return: AIQuestionResponse schema with ai_message populated.
        """

    @staticmethod
    def generate_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        metadata_options: Dict[str, List[str]] = None,
        playbook_lessons: List = None,
    ) -> str:
        """Generate the complete prompt for training plan generation."""

        combined_responses = (
            f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        )
        
        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook_lessons, personal_info, context="training"
        )

        # Format metadata options section (reusable helper)
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)

        prompt = f"""
            Create detailed 1-week training plan for {personal_info.username}.

            **CRITICAL - APP SCOPE:**
            This app creates SUPPLEMENTAL training programs (strength & conditioning).
            • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
            • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
            • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
            
            **1-WEEK TRAINING SCHEDULE:**
            Create a focused 1-week training schedule. This will be duplicated to create a 4-week plan. After completion, we'll create the next phase using insights from their progress.
            
            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {playbook_context}

            {metadata_section}

            **ASSESSMENT DATA:**
            {combined_responses}
            
            **CRITICAL: USE THE ASSESSMENT DATA CORRECTLY**
            • Respect their stated CONSTRAINTS: equipment, time, injuries, existing commitments, preferences
            • Use coaching expertise to design the PROGRAM: structure, volume, intensity, progression, exercise selection
            • Only prescribe exercises that match their available equipment
            • If a constraint is unclear, work with what you have rather than making assumptions
            • You decide HOW to train, they tell you WHAT'S possible

             **PLAN STRUCTURE:**
             1. Create a 1-week training schedule (7 days)
             2. Each day → set training_type: strength/endurance/mixed/rest
             3. This 1-week schedule will be duplicated to create the full 4-week plan
             
             **MODALITY-SPECIFIC INSTRUCTIONS:**
             
             **STRENGTH days:** provide exercises with sets, reps, weight_1rm
             • For each strength exercise, provide:
               - exercise_name: Descriptive name WITHOUT equipment (e.g., "Chest Press", "Lateral Raise", "Farmer Carry")
               - main_muscle: From the provided list (e.g., "Pectoralis Major")
               - equipment: From the provided list (e.g., "Dumbbell") - equipment type goes HERE, NOT in exercise_name
               - sets, reps, weight, weight_1rm: Training parameters
             • Select movements for goal, equipment, experience
             • Balance movement patterns (push/pull, upper/lower, etc.)
             • DO NOT set exercise_id (will be matched automatically)
             • CRITICAL: Equipment type should ONLY be in the equipment field, NOT in exercise_name
             
             **ENDURANCE days:** Sessions with name, description (≤20 words), sport_type, training_volume, unit
             • sport_type MUST be EXACTLY one of these values (case-sensitive): 
               running | cycling | swimming | rowing | hiking | walking | elliptical | stair_climbing | jump_rope | other
             • unit MUST be EXACTLY one of these values (case-sensitive):
               minutes | km | miles | meters
             • Vary session types (easy, tempo, intervals, recovery)
             • Interval sessions can be created by making several endurance sessions with different tempo's / heart rate zones
             • Heart_rate_zone (Zone 1, Zone 2, Zone 3, Zone 4, Zone 5)
             • Choose sport_type based on user's goal, equipment, and preferences
             • Examples: {{"sport_type": "running", "unit": "km"}} or {{"sport_type": "cycling", "unit": "minutes"}}

             
             **MIXED days:** strength exercises + endurance session(s)
             • Balance modalities to avoid interference
             • Consider recovery demands
             
             **REST days:** training_type="rest", is_rest_day=true, empty exercise/session arrays
             
             **MOTIVATION TEXT REQUIREMENTS:**
             
             • **Overall plan motivation (3 sentences):**
               - Name the phase (e.g., "Foundation Building Phase")
               - What this 1-week schedule accomplishes for their goal
               - Mention: "This schedule will be repeated for 4 weeks, then we'll adapt based on your progress"
               
             • **Weekly motivation (2 sentences):**
               - This week's training focus and purpose
               - How it progresses toward their goal
               
             • **Daily motivation (1 sentence):**
               - Today's training focus

             **TRAINING PRINCIPLES:**
             ✓ Progressive Overload - gradual difficulty increases
             ✓ Variety - prevent plateaus, vary exercises and sessions week-to-week
             ✓ Specificity - matches goal requirements
             ✓ Recovery - adequate rest between hard sessions
             ✓ Individualization - respects constraints/preferences

             **CRITICAL REQUIREMENTS:**
             ✓ Match {personal_info.experience_level} complexity
             ✓ Align with "{personal_info.goal_description}" (primary driver)
             ✓ Apply goal-appropriate periodization
             ✓ Apply ALL playbook lessons (if provided - these are proven constraints and preferences)
             ✓ Stay concise
             
             **SUPPLEMENTAL TRAINING SCHEDULING (for sport athletes):**
             If user has existing sport training commitments (e.g., "football practice Tuesday & Saturday", "tennis matches on Wednesdays"):
             • MARK those days as REST days in our program (training_type="rest", is_rest_day=true)
             • Their sport training IS their training for that day - we don't add to it
             • Schedule our strength/conditioning work on their OFF days from sport
             • Example: If they have football Tuesday/Saturday → Mark Tuesday/Saturday as rest → Schedule our training on the other days
             • Keep total weekly volume manageable to support (not interfere with) sport performance
             • Design the 1-week schedule to work around their existing commitments
             • Do NOT schedule high-intensity strength work the day before games/matches
             
             **FLEXIBILITY NOTE:**
             If outline has obvious errors or user equipment changed, note the discrepancy and proceed with best judgment for user safety/success.
             
             **AI MESSAGE GENERATION:**
             Generate a warm, encouraging message for the user (ai_message field):
             • Celebrate the completion of their personalized plan
             • Explain the 2-week block approach (we work in focused 2-week periods for better progress tracking)
             • Invite them to review their plan
             • Mention they can ask questions or suggest changes
             • Keep it concise (2-3 sentences max)
             • Include 2-3 relevant emojis
             • Tone: Enthusiastic, supportive, professional but warm
             
             Example ai_message: "🎉 Amazing! I've created your personalized {personal_info.goal_description.lower()} plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨"

            Return: TrainingPlan schema format (including ai_message field).
         """

        return prompt

    @staticmethod
    def _format_exercise_metadata_section(metadata_options: Dict[str, List[str]]) -> str:
        """
        Format exercise metadata options section for prompts.
        
        This reusable section explains to AI how to generate strength exercises with metadata
        that will be matched to the database. Note: Individual metadata values are NOT listed here
        as Pydantic schemas handle validation automatically.
        
        Args:
            metadata_options: Dict with keys: equipment, main_muscles (used only to check if available)
        
        Returns:
            Formatted string section for prompts
        """

        equipment_list = metadata_options.get('equipment', [])
        main_muscle_list = metadata_options.get('main_muscles', [])
        equipment_str = ', '.join(equipment_list)
        main_muscle_str = ', '.join(main_muscle_list)


        if not metadata_options:
            return """
            **NO METADATA OPTIONS PROVIDED:**
            • The user's focus may be endurance-only (e.g., running-only). Do NOT add new strength_exercises.
            • If updating existing strength_exercises, preserve exercise_id and only adjust sets/reps/intensity.
            """
        
        return f"""
            **EXERCISE METADATA REQUIREMENTS:**
            
            When creating or modifying STRENGTH exercises, you must provide:
            - exercise_name: A descriptive name for the exercise WITHOUT equipment type (e.g., "Bench Press", "Shoulder Press", "Push-ups", "Lateral Raise", "Farmer Carry")
            - main_muscle: MUST be a valid main_muscle value (exact case-sensitive match required). Pick one of the following: {main_muscle_str}
            - equipment: MUST be a valid equipment value (exact case-sensitive match required). Pick one of the following: {equipment_str}
            
            **IMPORTANT FIELD DESCRIPTIONS:**
            • exercise_name: A clear, descriptive name that identifies the exercise WITHOUT including equipment type
              - ✅ CORRECT: "Bench Press", "Lateral Raise", "Back Squat", "Chest Fly", "Farmer Carry"
              - ❌ WRONG: "Barbell Bench Press", "Dumbbell Lateral Raise (Machine)", "Seated Calf Raise (Machine)"
              - The equipment type should ONLY be specified in the 'equipment' field, NOT in the exercise_name
            • main_muscle: The specific primary muscle group worked (e.g., "Pectoralis Major", "Quadriceps", "Deltoids", "Latissimus Dorsi")
            • equipment: The equipment type required - must match database values exactly
            
            ⚠️ CRITICAL RULES:
            - The TrainingPlan Pydantic schema will automatically validate that main_muscle and equipment match valid Enum values.
            - Use your knowledge of common exercise metadata - the validation will catch any invalid values.
            - DO NOT include equipment type in exercise_name - provide it separately in the equipment field
            - DO NOT set exercise_id - it will be set automatically during post-processing matching.
            - For existing exercises being modified (only sets/reps/intensity changes), you can preserve exercise_id if it already exists.
            """

    @staticmethod
    def _format_exercise_info(exercises: List[Dict]) -> str:
        """Format exercise information for prompts."""
        if not exercises:
            return "No exercises available."
        
        formatted_exercises = []
        for exercise in exercises:
            equipment_str = ", ".join(exercise.get("equipment", []))
            formatted_exercises.append(
                f"ID: {exercise.get('id', 'N/A')} | {exercise.get('name', 'Unknown')} | "
                f"Equipment: {equipment_str} | Difficulty: {exercise.get('difficulty', 'Unknown')}"
            )
        
        return "\n".join(formatted_exercises)

    @staticmethod
    def generate_feedback_classification_prompt(
        feedback_message: str, 
        conversation_context: str
    ) -> str:
        """Generate prompt for classifying user feedback intent (strict 3-intent system)."""
        return f"""
        You are analyzing user feedback about their training plan to determine the next action.
        
        **CONVERSATION CONTEXT:**
        {conversation_context}
        
        **CURRENT FEEDBACK:**
        "{feedback_message}"
        
        **CLASSIFICATION TASK:**
        Classify this into EXACTLY one of these intents and map to actions:
        1) clarification_or_concern → The user is asking a question, needs clarification, or shares a concern.
           - action: respond_only
           - needs_plan_update: false
           - navigate_to_main_app: false
        2) update_request → The user asks to change something in the plan (add/remove/modify/move/adjust difficulty/equipment/etc.).
           - action: update_plan
           - needs_plan_update: true
           - navigate_to_main_app: false
        3) satisfied → The user is happy with the plan and wants to proceed.
           - action: navigate_to_main_app
           - needs_plan_update: false
           - navigate_to_main_app: true
        
        **TRIGGERS (examples, not exhaustive):**
        - update_request: "change", "modify", "instead", "prefer", "switch", "too hard/easy", "adjust", "update", "can't do", "won't work", "add/remove", "different day/time"
        - clarification_or_concern: "what if", "can I", "how do I", "what equipment", "is it ok if", questions, doubts, or general concerns
        - satisfied: "looks great", "perfect", "ready", "let's go", "thanks, done", approvals/closure
        
        **EXAMPLES:**
        - "Can I do this at home?" → clarification_or_concern, respond_only
        - "I prefer running over cycling" → update_request, update_plan
        - "This looks perfect!" → satisfied, navigate_to_main_app
        - "This is too hard for me" → clarification_or_concern, respond_only (why is it too hard for you?)
        - "What equipment do I need?" → clarification_or_concern, respond_only
        
        Include a fourth fallback intent for anything outside scope:
        4) other → The input is outside your scope or unclear. Explain your capabilities briefly (clarifiying or updating) and ask a clarifying question.
           - action: respond_only
           - needs_plan_update: false
           - navigate_to_main_app: false

        Return a STRICT JSON object with these fields ONLY:
        {{
            "intent": "clarification_or_concern" | "update_request" | "satisfied" | "other",
            "action": "respond_only" | "update_plan" | "navigate_to_main_app",
            "confidence": 0.0-1.0,
            "needs_plan_update": true | false,
            "navigate_to_main_app": true | false,
            "reasoning": "brief explanation (include capabilities explanation when intent is 'other')",
            "specific_changes": ["list any explicit change requests if intent is update_request, else []"]
        }}
        """
        
    @staticmethod
    def generate_plan_update_prompt(
        personal_info,
        current_plan: dict,
        feedback_message: str,
        classification_result: dict,
        conversation_context: str,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        metadata_options: Dict[str, List[str]] = None
    ) -> str:
        """Generate complete prompt for updating training plan based on feedback.

        This prompt consolidates all update context and mirrors the structure/clarity
        used in other generation prompts (role, workflow status, rules, and outputs).
        """
        # Build metadata options section (reusable helper)
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)
        
        # Strength update rules
        if metadata_options:
            strength_update_rules = """
        **STRENGTH EXERCISE UPDATE RULES:**
        • If adding new exercises, provide exercise_name, main_muscle, equipment (from metadata options)
        • If modifying existing exercises, preserve exercise_id if only adjusting sets/reps/intensity
        • If replacing exercises, provide new exercise_name + metadata (matching will happen automatically)
        • DO NOT set exercise_id for new/modified exercises - will be matched during post-processing
        • Adjust sets/reps/intensity as needed to satisfy the feedback while preserving training intent
        """
        else:
            strength_update_rules = """
        **STRENGTH EXERCISE UPDATE RULES:**
        • Do NOT introduce new strength_exercises without metadata options
        • You may remove or keep existing strength_exercises only if explicitly requested in the feedback
        • Prefer adjusting endurance_sessions, schedule, or intensity when no metadata is provided
        """

        prompt = f"""
        You are an expert training coach designing personalized training plans..
        Your role: Safely and effectively update the user's training plan based on their feedback while preserving the plan's structure and philosophy.

        **WORKFLOW STATUS:**
        ✓ Session Step 1 of 3: Initial Assessment Questions — completed (Round 1 of 2)
        ✓ Session Step 2 of 3: Follow-up Questions — completed (Round 2 of 2)
        ✓ Session Step 3 of 3: Training Plan Creation — completed (1-week schedule created; duplicated to 4 weeks for storage)
        Current Substep: Live Plan Feedback and Update — apply specific changes requested by the user

        {PromptGenerator.format_client_information(personal_info)}

        **ASSESSMENT RESPONSES (Round 1 & Round 2):**
        Initial Assessment Questions with their responses:
        {formatted_initial_responses}

        Follow-up Questions with their responses:
        {formatted_follow_up_responses}

        {PromptGenerator._format_exercise_metadata_section(metadata_options)}

        **CONVERSATION CONTEXT:**
        {conversation_context}

        **USER FEEDBACK TO APPLY:**
        "{feedback_message}"

        **CLASSIFICATION RESULT:**
        {json.dumps(classification_result, indent=2)}

        **CURRENT PLAN TO UPDATE:**
        {json.dumps(current_plan, indent=2)}

        **UPDATE PRINCIPLES:**
        1. Make ONLY the specific changes requested in the user's feedback/classification.
        2. Preserve the plan's structure, weekly cadence, training philosophy, and progression logic.
        3. Ensure updates are realistic and safe for {personal_info.username} given experience level and constraints.
        4. Maintain the 1-week schedule format (this will be duplicated to 4 weeks downstream).
        5. Respect assessment constraints and preferences. Use coaching expertise to fill gaps sensibly.
        6. If the user has scheduled sport commitments (practices/games), treat those days as REST in our plan.
        7. Equipment mapping must be accurate; if "Full Gym Access" is indicated, map to ALL gym equipment types (Barbell, Dumbbell, Cable, Machine, Body weight, etc.) using exact database capitalization.
        8. Do not introduce filler content. Every change must be purposeful and tied to the feedback.

        {strength_update_rules}

        **ALLOWED CHANGE TYPES (examples):**
        - Exercise substitutions (same movement pattern/equipment category)
        - Intensity tweaks (reps, sets, RPE/load guidance, durations)
        - Schedule shifts (move day, swap sessions, rest day adjustments)
        - Equipment adjustments (home-friendly vs gym-based alternatives)

        **OUTPUT REQUIREMENTS:**
        - Return the COMPLETE updated TrainingPlan object (JSON) matching the existing structure.
        - Preserve identifiers and fields not affected by the change (e.g., user_profile_id, id if present).
        - Keep weekly_schedules as a 1-week template (we duplicate later to 4 weeks in persistence).
        - For strength_exercises, provide exercise_name, main_muscle, equipment (from metadata options). DO NOT set exercise_id - it will be matched automatically.
        - If no metadata options are provided, do not add new strength_exercises; adjust endurance or scheduling instead unless feedback explicitly requests removal of strength.
        - Populate ai_message with a concise, friendly response (2-3 sentences) that:
          • Acknowledges their feedback
          • Explains what you changed and why (if changes were applied)
          • Uses a supportive coaching tone and includes 1-2 relevant emojis
        - Do NOT add new top-level fields; keep schema consistent.

        Examples for ai_message:
        - "Great feedback! I've adjusted Tuesday to running instead of cycling so it matches your preference and targets the same energy system. 🏃✨"
        - "Absolutely! I've made your workouts home-friendly with dumbbell options while preserving your progression. 💪🏠"

        Now return ONLY the updated TrainingPlan JSON. Do not include any extra commentary outside the JSON object.
        """
        # Always append the canonical sample at the end.
        return PromptGenerator.append_trainingplan_json_example(prompt)

    @staticmethod
    def append_trainingplan_json_example(prompt: str) -> str:
        json_example = (
            """
            IMPORTANT: Return ONLY valid JSON matching this schema.
            Do NOT include any markdown/code/text/explanations outside the JSON.
            All arrays must be present (even if empty). Use [null, null, ...] for missing weight values.
            
            Field meanings:
            - title (string): brief title of the plan
            - summary (string): short text summarizing plan focus
            - weekly_schedules (array): list of weekly blocks. Has only one element.
            - week_number (int): week index (1-based)
            - justification (string): brief explanation of this week's focus and why choices are made.
            - daily_trainings (array): list of daily plans. Include all 7 days of the week.
                - day_of_week (string): e.g., "Monday"
                - is_rest_day (bool): true if no training that day
                - training_type (string): one of ["rest", "strength", "endurance"]
                - justification (string): reason for this day's focus
                - strength_exercises (array):
                    - sets (int)
                    - reps (array of int)
                    - weight (array of null). Leave empty as the user will fill in the weights later.
                    - weight_1rm (array of float)
                    - main_muscle (string)
                    - equipment (string)
                    - completed (bool)
                - endurance_sessions (array):
                    - name (string)
                    - sport_type (string)
                    - training_volume (float)
                    - unit (string)
                    - heart_rate_zone (int)
                    - description (string)
                    - completed (bool)
            - justification (string): overall justification for the training phase
            - ai_message (string): friendly message to the user

            Notes: The fields id and user_profile_id are always set automatically by backend logic and must NOT be set by the AI.

            Example (keep structure, replace content):

            {
                "title": "Sample Title",
                "summary": "One week focused on progressive overload.",
                "weekly_schedules": [
                    {
                        "week_number": 1,
                        "justification": "Gradual increase in lower-body strength.",
                        "daily_trainings": [
                            {
                                "day_of_week": "Monday",
                                "is_rest_day": false,
                                "training_type": "strength",
                                "justification": "Lower body compound focus.",
                                "strength_exercises": [
                                    {
                                        "sets": 3,
                                        "reps": [10, 8, 6],
                                        "weight": [null, null, null],
                                        "weight_1rm": [90, 90, 90],
                                        "main_muscle": "Quadriceps",
                                        "equipment": "Barbell",
                                        "completed": false
                                    }
                                ],
                                "endurance_sessions": []
                            },
                            {
                                "day_of_week": "Tuesday",
                                "is_rest_day": true,
                                "training_type": "rest",
                                "justification": "Full rest day.",
                                "strength_exercises": [],
                                "endurance_sessions": []
                            }
                        ]
                    }
                ],
                "justification": "Designed to build foundational strength before higher-intensity phases.",
                "ai_message": "Here's your personalized one-week strength plan!"
            }
            """
        )
        marker = '\nIMPORTANT: Return ONLY valid JSON matching this schema.'
        base = prompt.split(marker)[0]
        return base.strip() + json_example
