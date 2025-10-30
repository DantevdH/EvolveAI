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
        
        **FORMATTING RULES:**
        ✓ CRITICAL: ALL question texts MUST end with a question mark (?)
        ✓ Questions should be properly formatted as interrogative sentences
        ✓ Example: "What training equipment do you have access to?" ✅
        ✓ Example: "Training equipment access" ❌
        
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
        ✓ IMPORTANT: All question texts MUST end with a question mark (?)
        
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
        ✓ IMPORTANT: All question texts MUST end with a question mark (?)
        
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

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions()}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

             **CRITICAL REQUIREMENTS:**
             ✓ Match {personal_info.experience_level} complexity
             ✓ Align with "{personal_info.goal_description}" (primary driver)
             ✓ Apply goal-appropriate periodization
             ✓ Apply ALL playbook lessons (if provided - these are proven constraints and preferences)
             ✓ Stay concise
             
            {PromptGenerator._get_supplemental_training_scheduling()}
             
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
    def _get_one_week_enforcement() -> str:
        """Shared section enforcing exactly 1-week output."""
        return """
            ⚠️ **CRITICAL: GENERATE EXACTLY 1 WEEK (7 DAYS)**
            • Create ONE weekly_schedule object with week_number: 1
            • Include exactly 7 daily_trainings with day_of_week in this EXACT order:
              1. Monday
              2. Tuesday
              3. Wednesday
              4. Thursday
              5. Friday
              6. Saturday
              7. Sunday
            • DO NOT duplicate any days or generate 8+ days
            • DO NOT generate multiple weeks or reference future weeks in your output
            • The system will handle repetition and progression downstream
        """
    
    @staticmethod
    def _get_modality_instructions() -> str:
        """Shared section with modality-specific instructions (STRENGTH, ENDURANCE, MIXED, REST)."""
        return """
            **MODALITY-SPECIFIC INSTRUCTIONS:**
            
            **STRENGTH days:** provide exercises with sets, reps, weight_1rm
            • For each strength exercise, provide:
              - exercise_name: Descriptive name WITHOUT equipment (e.g., "Chest Press", "Lateral Raise", "Farmer Carry")
              - main_muscle: Choose from the EXACT values in the AVAILABLE MAIN MUSCLE OPTIONS list provided above
              - equipment: Choose from the EXACT values in the AVAILABLE EQUIPMENT OPTIONS list provided above
              - sets, reps, weight, weight_1rm: Training parameters
            • Select movements for goal, equipment, experience
            • Balance movement patterns (push/pull, upper/lower, etc.)
            • DO NOT set exercise_id (will be matched automatically)
            • CRITICAL: Equipment type should ONLY be in the equipment field, NOT in exercise_name
            
            **ENDURANCE days:** Sessions with name, description (MAX 15 words), sport_type, training_volume, unit
            • sport_type MUST be EXACTLY one of these values (case-sensitive): 
              running | cycling | swimming | rowing | hiking | walking | elliptical | stair_climbing | jump_rope | other
            • unit MUST be EXACTLY one of these values (case-sensitive):
              minutes | km | miles | meters
            • Vary session types (easy, tempo, intervals, recovery)
            • Interval sessions can be created by making several endurance sessions with different tempo's / heart rate zones
            • Heart_rate_zone (Zone 1, Zone 2, Zone 3, Zone 4, Zone 5)
            • Choose sport_type based on user's goal, equipment, and preferences
            • Examples: {"sport_type": "running", "unit": "km"} or {"sport_type": "cycling", "unit": "minutes"}
            
            **MIXED days:** strength exercises + endurance session(s)
            • Balance modalities to avoid interference
            • Consider recovery demands
            
            **REST days:** training_type="rest", is_rest_day=true, empty exercise/session arrays
        """
    
    @staticmethod
    def _get_justification_requirements() -> str:
        """Shared section with all justification length requirements."""
        return """
            **JUSTIFICATION TEXT REQUIREMENTS (BE CONCISE):**
            
            • **Plan title (3-5 words):**
              - Short phase name (e.g., "Foundation Building Phase", "Base Endurance Development")
            
            • **Plan summary (MAX 25 words, 2 sentences):**
              - Brief overview of what this training phase accomplishes
              
            • **Plan justification (MAX 40 words, ~3 sentences):**
              - Explain the training approach and philosophy
              - How this week's training accomplishes their goal
              - Keep it focused and actionable
              
            • **Weekly justification (MAX 30 words, ~2 sentences):**
              - This week's training focus and purpose
              - How it progresses toward their goal
              
            • **Daily justification (MAX 20 words, 1 sentence):**
              - Today's specific training focus and what it develops
        """
    
    @staticmethod
    def _get_training_principles() -> str:
        """Shared section with core training principles."""
        return """
            **TRAINING PRINCIPLES:**
            ✓ Progressive Overload - gradual difficulty increases
            ✓ Variety - prevent plateaus, vary exercises and sessions week-to-week
            ✓ Specificity - matches goal requirements
            ✓ Recovery - adequate rest between hard sessions
            ✓ Individualization - respects constraints/preferences
        """
    
    @staticmethod
    def _get_supplemental_training_scheduling() -> str:
        """Shared section for scheduling around existing sport commitments."""
        return """
            **SUPPLEMENTAL TRAINING SCHEDULING (for sport athletes):**
            If user has existing sport training commitments (e.g., "football practice Tuesday & Saturday", "tennis matches on Wednesdays"):
            • MARK those days as REST days in our program (training_type="rest", is_rest_day=true)
            • Their sport training IS their training for that day - we don't add to it
            • Schedule our strength/conditioning work on their OFF days from sport
            • Example: If they have football Tuesday/Saturday → Mark Tuesday/Saturday as rest → Schedule our training on the other days
            • Keep total weekly volume manageable to support (not interfere with) sport performance
            • Do NOT schedule high-intensity strength work the day before games/matches
        """

    @staticmethod
    def _format_exercise_metadata_section(metadata_options: Dict[str, List[str]]) -> str:
        """
        Format exercise metadata options section for prompts.
        
        This section lists the exact valid values for main_muscle and equipment
        that the AI must choose from when generating strength exercises.
        
        Args:
            metadata_options: Dict with keys: equipment, main_muscles
        
        Returns:
            Formatted string section for prompts
        """
        if not metadata_options:
            return """
            **NO METADATA OPTIONS PROVIDED:**
            • The user's focus may be endurance-only (e.g., running-only). Do NOT add new strength_exercises.
            • If updating existing strength_exercises, preserve exercise_id and only adjust sets/reps/intensity.
            """
        
        # Extract and format the lists
        equipment_list = metadata_options.get("equipment", [])
        muscles_list = metadata_options.get("main_muscles", [])
        
        # Format equipment as a bulleted list
        equipment_str = "\n              ".join([f"- {eq}" for eq in sorted(equipment_list)]) if equipment_list else "- (none available)"
        
        # Format muscles as a bulleted list
        muscles_str = "\n              ".join([f"- {mm}" for mm in sorted(muscles_list)]) if muscles_list else "- (none available)"
        
        return f"""
            **EXERCISE METADATA REQUIREMENTS:**
            
            When creating or modifying STRENGTH exercises, you must provide:
            - exercise_name: A descriptive name for the exercise WITHOUT equipment type (e.g., "Bench Press", "Shoulder Press", "Push-ups", "Lateral Raise", "Farmer Carry")
            - main_muscle: MUST be one of the values listed below (exact case-sensitive match required)
            - equipment: MUST be one of the values listed below (exact case-sensitive match required)
            
            **AVAILABLE EQUIPMENT OPTIONS (choose from these exact values):**
              {equipment_str}
            
            **AVAILABLE MAIN MUSCLE OPTIONS (choose from these exact values):**
              {muscles_str}
            
            **IMPORTANT FIELD DESCRIPTIONS:**
            • exercise_name: A clear, descriptive name that identifies the exercise WITHOUT including equipment type
              - ✅ CORRECT: "Bench Press", "Lateral Raise", "Back Squat", "Chest Fly", "Farmer Carry"
              - ❌ WRONG: "Barbell Bench Press", "Dumbbell Lateral Raise (Machine)", "Seated Calf Raise (Machine)"
              - The equipment type should ONLY be specified in the 'equipment' field, NOT in the exercise_name
            • main_muscle: Choose from the EXACT values in the list above (case-sensitive)
            • equipment: Choose from the EXACT values in the list above (case-sensitive)
            
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
    def generate_lightweight_intent_classification_prompt(
        feedback_message: str,
        conversation_context: str
    ) -> str:
        """
        Generate lightweight prompt for STAGE 1: Intent classification only (no operations).
        
        Fast and efficient - only uses feedback and conversation history.
        No plan details, assessment data, or metadata needed.
        """
        return f"""
        Classify the user's intent from their feedback about their training plan.
        
        **CONVERSATION HISTORY:**
        {conversation_context}
        
        **USER'S CURRENT FEEDBACK:**
        "{feedback_message}"
        
        ═══════════════════════════════════════════════════════════════════════════════
        CLASSIFY INTO ONE OF FIVE INTENTS
        ═══════════════════════════════════════════════════════════════════════════════
        
        **1. question** - User asks a clear question you can answer
           Examples: "Can I do this at home?", "What equipment do I need?", "Why running on Tuesday?"
           → ANSWER their question directly
           
        **2. unclear** - ONLY when you genuinely cannot make reasonable assumptions
           Use this SPARINGLY - prefer making reasonable assumptions over asking questions.
           Examples: "Change it" (change what?), "Different" (different how?)
           → Ask ONE specific follow-up question maximum
           → The goal is efficiency, not perfection - avoid back-and-forth
           
        **3. update_request** - User wants specific changes
           Examples: "Replace bench press with push-ups", "Make Monday easier", "Move Wed to Friday"
           → This will trigger operation parsing in next step
           
        **4. satisfied** - User is happy and ready to start
           Examples: "Looks great!", "Let's go!", "Perfect, thanks!"
           → User will navigate to main app
           
        **5. other** - Off-topic or unrelated
           Examples: "What's the weather?", "Tell me a joke"
           → Redirect to training topics
        
        **IMPORTANT DISTINCTION:**
        - "This is too hard" → **unclear** (which day? which exercise?)
        - "Monday is too hard" → **update_request** (specific day identified)
        - "Bench press is too hard" → **update_request** (specific exercise identified)
        
        ═══════════════════════════════════════════════════════════════════════════════
        OUTPUT (FeedbackIntentClassification schema)
        ═══════════════════════════════════════════════════════════════════════════════
        
        Your response will be automatically structured with these fields:
        - intent: "question" | "unclear" | "update_request" | "satisfied" | "other"
        - action: "respond_only" | "update_plan" | "navigate_to_main_app"
        - confidence: 0.0-1.0
        - needs_plan_update: true | false
        - navigate_to_main_app: true | false
        - reasoning: Brief explanation of classification
        - ai_message: Your response to the user
        
        **ai_message by intent:**
        - **question**: Answer their question with helpful information
        - **unclear**: Ask follow-up questions to get missing details
        - **update_request**: Acknowledge and say you'll make the changes
        - **satisfied**: Not needed (handled separately)
        - **other**: Explain your capabilities and redirect
        
        **CRITICAL AI_MESSAGE RULES:**
        - Maximum 40 words (strict limit)
        - Always address the user directly (use "you", "your", "I'll")
        - Be conversational and friendly
        - Stay on topic (training plan feedback)
        - ALWAYS end by asking: "Any other changes, or are you ready to start?"
          (or similar variation - keep it natural and conversational)
        """

    @staticmethod
    def generate_operation_parsing_prompt(
        feedback_message: str,
        personal_info,
        current_plan_summary: str,
        formatted_initial_responses: str = "",
        formatted_follow_up_responses: str = "",
        metadata_options: Dict[str, List[str]] = None
    ) -> str:
        """
        Generate prompt for STAGE 2: Operation parsing (only for update_request intent).
        
        Uses full context: assessment data, plan details, metadata options.
        Only called when Stage 1 determined intent is "update_request".
        """
        # Format metadata section
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)
        
        # Format personal info section
        client_info = PromptGenerator.format_client_information(personal_info) if personal_info else ""
        
        return f"""
        Parse the user's requested changes into specific operations.
        
        {client_info}
        
        **USER'S CONTEXT:**
        Initial Assessment: {formatted_initial_responses if formatted_initial_responses else "Not available"}
        Follow-up Responses: {formatted_follow_up_responses if formatted_follow_up_responses else "Not available"}
        Current Plan Summary: {current_plan_summary if current_plan_summary else "Not available"}
        
        **USER'S CHANGE REQUEST:**
        "{feedback_message}"
        
        ═══════════════════════════════════════════════════════════════════════════════
        YOUR TASK: Parse this into specific operations (MAKE REASONABLE ASSUMPTIONS)
        ═══════════════════════════════════════════════════════════════════════════════
        
        The intent has already been classified as "update_request", meaning the user wants specific changes.
        Your job is to extract the operations with ALL required fields.
        
        **CRITICAL: MAKE REASONABLE ASSUMPTIONS**
        - User says "too hard" → reduce intensity on ALL training days
        - User says "don't like X exercise" → swap X on ALL days it appears
        - User says "make it easier" → reduce intensity globally
        - User says "need more legs" → adjust volume for leg exercises across plan
        - When vague, apply changes broadly rather than returning empty operations
        - Only return empty operations if request is truly incomprehensible
        
        **AVAILABLE OPERATION TYPES:**
        
        1. **swap_exercise**: type, day_of_week, old_exercise_name, new_exercise_name, new_main_muscle, new_equipment
        2. **adjust_intensity**: type, scope (day/exercise/week), day_of_week (if day/exercise), direction (easier/harder)
        3. **move_day**: type, source_day, target_day, swap (true/false)
        4. **add_rest_day**: type, day_of_week
        5. **adjust_volume**: type, scope, change_type (sets/reps/duration), adjustment (number), day_of_week (if day/exercise)
        6. **add_exercise**: type, day_of_week, new_exercise_name, new_main_muscle, new_equipment, sets, reps, weight_1rm
        7. **remove_exercise**: type, day_of_week, exercise_name
        
        {metadata_section}
        
        **FOR SWAP_EXERCISE AND ADD_EXERCISE:**
        - Extract new_main_muscle from AVAILABLE MAIN MUSCLE OPTIONS above
        - Extract new_equipment from AVAILABLE EQUIPMENT OPTIONS above
        - Respect user's available equipment from initial assessment
        - Examples: "push-ups" → "Pectoralis Major Sternal" + "Body Weight"
        
        **FOR ADD_EXERCISE:**
        - Adds a new exercise to the specified day
        - REQUIRED: Must specify sets (number), reps (array), weight_1rm (array)
        - Array lengths for reps and weight_1rm must match the number of sets
        - Example: sets=4, reps=[12,10,8,6], weight_1rm=[60,70,80,90]
        - System will gracefully default if accidentally omitted, but always try to provide them
        
        **FOR REMOVE_EXERCISE:**
        - Removes the specified exercise from the specified day based on the exercise_name
        
        ═══════════════════════════════════════════════════════════════════════════════
        OUTPUT (FeedbackOperations schema)
        ═══════════════════════════════════════════════════════════════════════════════
        
        Your response will be automatically structured with these fields:
        - operations: List of PlanOperation objects (must have at least 1 with ALL required fields)
        - ai_message: Confirmation of what changes you'll make
        
        **Example operation:**
        - type: "swap_exercise"
        - day_of_week: "Monday"
        - old_exercise_name: "Bench Press"
        - new_exercise_name: "Push-Up"
        - new_main_muscle: "Pectoralis Major Sternal"
        - new_equipment: "Body Weight"
        
        **CRITICAL AI_MESSAGE RULES:**
        - Maximum 40 words (strict limit)
        - Always address the user directly (use "you", "your", "I'll")
        - Be conversational and friendly (e.g., "I'll swap bench press for push-ups on Monday!")
        - Summarize the changes you're making
        - ALWAYS end by asking: "Any other changes, or ready to go?"
          (or similar variation - keep it natural and conversational)
        
        ⚠️ RETURN EMPTY OPERATIONS ONLY AS LAST RESORT
        - Make reasonable assumptions first (apply changes broadly if vague)
        - Empty operations should be EXTREMELY RARE
        - Only return [] if the request is truly incomprehensible (e.g., "asdfgh", "xyz")
        """

