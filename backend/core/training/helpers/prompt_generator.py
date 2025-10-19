"""
Prompt Generator for training Coach AI interactions.

This module contains all the prompts used by the TrainingCoach for generating
questions, training plan outlines, and training plans.
"""

from typing import List
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
        • **Preferences:** Activities enjoyed/avoided, training environment, focus areas
        • **Situation:** Lifestyle factors (work, stress, sleep), schedule, recovery capacity
        • **Goals:** Specific outcomes, timeline, motivation, priorities
        
        YOU decide: activities, structure, periodization, volume, intensity, and all programming.

        **What NOT to Ask (YOU Decide):**
        • How to structure their training (splits, frequency, progression models)
        • What volumes and intensities to prescribe
        • How to periodize their plan
        • All technical coaching decisions based on their goal and experience level
        • When and where to train (this is up to the user to decide and thus irrelevant to the training plan)

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
        Format: Greeting using "{personal_info.username}" → Reference "{personal_info.goal_description}" with excitement → Mention profile analysis + need for refinement questions → 2-3 emojis → Call to action
        
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
        Format: Greeting "{personal_info.username}" → Acknowledge great initial responses → Reference specific things mentioned (equipment/goals/constraints) → Explain these refine their perfect plan → 2-3 emojis → Next steps
        
        Return: AIQuestionResponse schema with ai_message populated.
        """

    @staticmethod
    def generate_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        exercise_info: str = "",
        playbook_lessons: List = None,
    ) -> str:
        """Generate the complete prompt for training plan generation."""

        combined_responses = (
            f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        )
        
        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook_lessons, personal_info, context="training"
        )

        prompt = f"""
            Create detailed 4-week training plan for {personal_info.username}.

            **CRITICAL - APP SCOPE:**
            This app creates SUPPLEMENTAL training programs (strength & conditioning).
            • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
            • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
            • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
            
            **4-WEEK TRAINING PHASE:**
            This is a focused 4-week training phase. After completion, we'll create the next phase using insights from their progress.
            
            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {playbook_context}

            **AVAILABLE EXERCISES:**
            {exercise_info}

            **ASSESSMENT DATA:**
            {combined_responses}
            
            **CRITICAL: USE THE ASSESSMENT DATA CORRECTLY**
            • Respect their stated CONSTRAINTS: equipment, time, injuries, existing commitments, preferences
            • Use coaching expertise to design the PROGRAM: structure, volume, intensity, progression, exercise selection
            • Only prescribe exercises that match their available equipment
            • If a constraint is unclear, work with what you have rather than making assumptions
            • You decide HOW to train, they tell you WHAT'S possible

             **PLAN STRUCTURE:**
             1. Match outline EXACTLY (same title, duration=4 weeks, phases)
             2. Create EXACTLY 4 weekly schedules (Weeks 1-4)
             3. Each week → 7 days consisting of training or rest days
             4. Each day → set training_type: strength/endurance/mixed/rest
             
             **MODALITY-SPECIFIC INSTRUCTIONS:**
             
             **STRENGTH days:** provide exercises with sets, reps, weight_1rm
             • Select movements for goal, equipment, experience
             • Balance movement patterns (push/pull, upper/lower, etc.)
             
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
               - What these 4 weeks accomplish for their goal
               - Mention: "We'll adapt your next 4-week phase based on your progress"
               
             • **Weekly motivation (2 sentences):**
               - This week's purpose in the 4-week phase
               - How it progresses toward phase goals
               
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
             If user has existing sport training (practice, games, matches):
             • Schedule strength/conditioning on OFF days from their sport training
             • Keep volume manageable to avoid interfering with sport performance
             • Prioritize injury prevention and athletic development
             • Do NOT schedule high-intensity work before games/matches
             
             **FLEXIBILITY NOTE:**
             If outline has obvious errors or user equipment changed, note the discrepancy and proceed with best judgment for user safety/success.

            Return: TrainingPlan schema format.
         """

        return prompt

    @staticmethod
    def generate_exercise_decision_prompt(
        personal_info: PersonalInfo, formatted_responses: str
    ) -> str:
        """Generate the prompt for AI to decide if exercises are needed."""
        return f"""
        You are an expert training coach analyzing training requirements.
        
        **User Profile:**
        Goal: {personal_info.goal_description}
        Experience: {personal_info.experience_level}
        
        **Responses:** {formatted_responses}
        
        **EXERCISE DATABASE SCOPE:**
        
        ✅ **What we HAVE:** Strength training exercises with these equipment types:
        Barbell | Dumbbell | Cable | Machine | Smith | Body weight | Band Resistive | Suspension | Sled | Weighted | Plyometric | Isometric
        
        ❌ **What we DON'T have:**
        Running/cycling/swimming programs | Sport-specific skills drills | Yoga/dance sequences
        
        **EQUIPMENT TYPE STRINGS (use EXACTLY as shown):**
        • "Barbell"
        • "Dumbbell"
        • "Cable"
        • "Cable (pull side)"
        • "Machine"
        • "Assisted (machine)"
        • "Smith"
        • "Body weight"
        • "Band Resistive"
        • "Suspension"
        • "Suspended"
        • "Sled"
        • "Weighted"
        • "Plyometric"
        • "Isometric"
        • "Self-assisted"
        
        **DECISION TASK:**
        
        **1. Need exercises from database?**
        → YES if plan includes ANY strength training
        → NO if purely endurance/cardio/sport-specific
        
        **2. Difficulty level?**
        Determine based on:
        • {personal_info.experience_level} experience level
        • Responses about training history
        • Goal complexity
        → Return: beginner | intermediate | advanced
        
        **3. Equipment types to retrieve?**
        Based on user's available equipment from responses, map to database strings:
        
        **EQUIPMENT MAPPING:**
        User selected "Body Weight Only" → ["Body weight"]
        User selected "Dumbbells" → ["Dumbbell", "Body weight"]
        User selected "Full Gym Access" → ALL (include all equipment types from database)
        User selected "Resistance Bands" → ["Band Resistive", "Body weight"]
        
        **RULES:**
        • Match user equipment to database strings EXACTLY (see list above)
        • Select ALL applicable types (can be multiple)
        • Use EXACT capitalization from list above
        • Always include "Body weight" since it requires no equipment
        
        **VALIDATION:** Equipment strings must match database exactly - check capitalization, spacing, and special characters.
        """
