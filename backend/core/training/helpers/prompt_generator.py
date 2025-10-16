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
        You are an expert training coach designing personalized training plans. Your questions must gather ONLY information that directly impacts the final training plan structure and is relevant to the user's specific goal.
        
        **Your Goal:** Collect specific data needed to create a detailed, actionable training plan tailored to their goal.
        
        **Training Plan Components to Design (goal-dependent):**
        • Activities - Relevant modalities (strength, running, cycling, swimming, sport drills)
        • Structure - Weekly organization (split, frequency, activity combinations)
        • Periodization - Progressive difficulty increases (weekly/phase progressions)
        • Availability - How many days per week are available for training and how many minutes for each session
        • Equipment - Available resources and requirements
        • Limitations - Physical constraints, injuries, preferences to accommodate
        • Lifestyle - How does the user's lifestyle look like (work, stress, sleep, etc.)
        • Current Abilities - Starting baseline for goal-relevant activities
        
        **Question Strategy:** 
        • Analyze their goal → determine relevant components
        • Ask ONLY about components applicable to their specific goal
        • Match training context (strength/endurance/mixed/sport-specific)
        • Adapt complexity to experience level (beginner-friendly language vs technical terms for advanced)
        • Ensure every question drives concrete training decisions

        **DO NOT ASK ABOUT (Coach determines these):**
        ❌ Intensity metrics (sets/reps, HR zones, pace targets)
        ❌ Volume prescriptions (total sets, weekly mileage)
        ❌ Current weights lifted
        ❌ Specific rep ranges or load percentages
        ❌ Progress tracking methods or apps

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

                if context == "outline":
                    content += f"        - {text}\n"
                else:
                    content += f"        - {text} (confidence: {confidence:.0%}, proven {helpful}x)\n"

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

                if context == "outline":
                    content += f"        - {text}\n"
                else:
                    content += f"        - {text} (confidence: {confidence:.0%}, learned from {harmful} negative outcome(s))\n"

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
        • SLIDER: min_value, max_value, step, unit
        • FREE_TEXT: max_length, placeholder
        • CONDITIONAL_BOOLEAN: max_length, placeholder
        
        ⚠️ Validation will FAIL if you mix fields from different types!
        
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
          "unit": "days"
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
        """

    @staticmethod
    def generate_initial_questions_prompt(personal_info: PersonalInfo) -> str:
        """Generate the complete prompt for initial questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **WORKFLOW STATUS:**
        🎯 **CURRENT STEP:** Initial Assessment Questions
        
        **OBJECTIVE:** Generate targeted questions to collect data for {personal_info.username}'s training plan.
        
        **GOAL ANALYSIS:**
        Goal: "{personal_info.goal_description}"
        Experience: {personal_info.experience_level}
        
        Determine what information is needed:
        • Specific outcomes and timeline?
        • Relevant training activities for this goal?
        • Available resources and constraints?
        • Current baseline abilities?
        
        **QUESTION FOCUS AREAS:**
        1. Goal specifics (targets, timeline, priorities)
        2. Resources (equipment, location, schedule availability)
        3. Current abilities (baseline for goal-relevant activities)
        4. Preferences (preferred/avoided training approaches)
        5. Limitations (injuries, restrictions, constraints)
        
        **REQUIREMENTS:**
        ✓ Ask ONLY what impacts plan design (not tracking tools, measurement apps, etc.)
        ✓ Use varied question types - limit open formats to 20-30% (1-2 questions max)
        ✓ Adapt complexity to {personal_info.experience_level} level
        ✓ Generate 5-8 questions total
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
        ✅ **COMPLETED:** Initial Questions Phase
        🎯 **CURRENT STEP:** Follow-up Questions Phase
        
        **OBJECTIVE:** Generate 3-7 targeted questions to fill critical gaps in the training plan blueprint.
        
        **INITIAL RESPONSES:**
        {formatted_responses}
        
        **STRATEGIC APPROACH:**
        1. Review responses → identify missing information for complete plan design
        2. Focus on gaps, NOT redundant or new unrelated topics
        3. Zoom in on already-discovered areas requiring clarification
        4. At least ask 1 question
        
        **REQUIREMENTS:**
        ✓ ONLY ask what fills critical plan design gaps
        ✓ NO tracking methods, measurement apps, or monitoring tools
        ✓ NO repetition of already-gathered information
        ✓ Use varied question types - still limit open formats to 30% max (2 questions)
        ✓ Be specific to their responses and goal
        ✓ Generate 3-7 questions (fewer if info is nearly complete)
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **AI MESSAGE (max 70 words):**
        Format: Greeting "{personal_info.username}" → Acknowledge great initial responses → Reference specific things mentioned (equipment/goals/constraints) → Explain these refine their perfect plan → 2-3 emojis → Next steps
        
        Return: AIQuestionResponse schema with ai_message populated.
        """

    @staticmethod
    def get_outline_generation_intro() -> str:
        """Get the introduction for outline generation prompts."""
        return """
        You are an expert training coach creating a training plan outline based on assessment responses.
        
        **OUTLINE PURPOSE:** Provide a structured preview that:
        • Shows the overall program structure and timeline
        • Demonstrates how training will progress through distinct phases
        • Builds user excitement and buy-in before full plan generation
        • Serves as the blueprint for detailed daily training prescriptions
        
        **YOUR ROLE:** Transform assessment data into a clear, motivating program roadmap.
        """

    @staticmethod
    def get_outline_generation_instructions() -> str:
        """Get instructions for outline generation."""
        return """
        **OUTLINE STRUCTURE:**
        1. **Title** - Catchy program name (3 words max)
        2. **Duration** - Total program length in weeks
        3. **Explanation** - High-level training approach (2-3 sentences)
        4. **User Observations** - Comprehensive summary of ALL personal info + responses (2 sentences max)
        5. **Training Phases** - 2-3 distinct periodization phases
        6. **Phase Details** - For each phase:
           • Name (e.g., "Foundation Building", "Intensity Development")
           • Duration in weeks
           • Explanation (1-2 sentences)
           • Sample weekly pattern (5-7 example daily trainings showing the training flow)
        7. **Daily Training Samples** - Each should have:
           • Day number (1-7 representing a typical week)
           • Training name
           • Description (max 20 words)
           • Relevant tags (strength/endurance/mixed)
        
        **QUALITY STANDARDS:**
        ✓ Tailored to user's specific goal and experience level
        ✓ Follows proper periodization principles for their goal type
        ✓ Realistic and achievable within stated timeline
        ✓ Builds excitement and motivation for the full plan
        """

    @staticmethod
    def get_outline_generation_requirements() -> str:
        """Get requirements for outline generation."""
        return """
        **STRICT REQUIREMENTS:**
        • Schema: Use TrainingPlanOutline format
        • Duration: up to a maximum of 8 weeks total (keeps plans focused and achievable)
        • Phases: 2-3 training phases (optimal for 8 week programs)
        • Phase samples: 5-7 daily trainings per phase (shows weekly pattern)
        • Descriptions: Max 20 words per training
        • Tags: Use relevant types - 'strength', 'endurance', 'mixed'
        • Tone: Engaging and motivating, but concise
        
        **EXCEPTION HANDLING:**
        If user goal requires >8 weeks (e.g., marathon training from scratch), acknowledge in explanation and design 8-week first phase with note about progression continuation.
        """

    @staticmethod
    def generate_training_plan_outline_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        playbook=None,
    ) -> str:
        """Generate the complete prompt for training plan outline."""
        combined_responses = (
            f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        )

        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook, personal_info, context="outline"
        )

        return f"""
        {PromptGenerator.get_outline_generation_intro()}

        {PromptGenerator.format_client_information(personal_info)}

        **WORKFLOW STATUS:**
        ✅ Initial Questions → ✅ Follow-ups → ✅ Lesson Extraction
        🎯 **CURRENT STEP:** Training Plan Outline Creation

        **ASSESSMENT DATA:**
        {combined_responses}
        {playbook_context}

        **OUTLINE DESIGN STRATEGY:**
        Use assessment data to determine:
        
        **1. Training Split & Frequency**
        • Available days → training days per week
        • Preferences → which days are strength/endurance/mixed/rest
        • Goal → primary focus and modality ratio
        
        **2. Training Activities**
        • Goal → required modalities (strength exercises, running, cycling, sport drills, etc.)
        • Equipment → available resources for chosen activities
        • Limitations → activities/movements to avoid
        
        **3. Training Load** (Coach Determines)
        • Experience level → starting point and progression rate
        • Goal → training emphasis distribution
        • Time availability → session structure
        
        **4. Periodization**
        • Timeline → total weeks and number of phases (2-3)
        • Goal → periodization model (linear/undulating/block)
        • Experience → complexity and progression rate

        **USER OBSERVATIONS FORMAT:**
        Write 2 sentences maximum capturing ALL personal info + responses. Format: "User is [age]yo [gender], [weight][unit], [height][unit] tall, focusing on [goal], with [experience_level] experience. [ALL response details: equipment, availability, limitations, preferences, motivations, etc.]"

        **CRITICAL VALIDATION:**
        ✓ Daily trainings match available days from responses
        ✓ Activities match available equipment
        ✓ Training types align with goal
        ✓ Periodization suits experience level
        ✓ 2-3 phases total (not 2-4)

        {PromptGenerator.get_outline_generation_instructions()}

        {PromptGenerator.get_outline_generation_requirements()}

        **AI MESSAGE (max 70 words):**
        Format: Greeting "{personal_info.username}" → Celebrate assessment completion → Show thorough analysis → Explain crafting personalized outline → Emphasize tailoring to "{personal_info.goal_description}" → Build excitement → 2-3 emojis
        
        Return: TrainingPlanOutline schema with ai_message populated.
        """

    @staticmethod
    def generate_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        plan_outline: dict = None,
        exercise_info: str = "",
        playbook_lessons: List = None,
    ) -> str:
        """Generate the complete prompt for training plan generation."""

        outline_context = ""
        if plan_outline:
            outline_context = f"""
            **APPROVED OUTLINE:**
            Title: {plan_outline.get('title', 'N/A')}
            Duration: {plan_outline.get('duration_weeks', 'N/A')} weeks
            User Profile: {plan_outline.get('user_observations', 'N/A')}

            Training Phases:"""
            for period in plan_outline.get("training_periods", []):
                outline_context += f"\n\n{period.get('period_name', 'N/A')} ({period.get('duration_weeks', 'N/A')} weeks): {period.get('explanation', 'N/A')}"
                daily_trainings = period.get("daily_trainings", [])
                if daily_trainings:
                    outline_context += "\n  Weekly Pattern:"
                    for training in daily_trainings:
                        outline_context += f"\n    Day {training.get('day', 'N/A')}: {training.get('training_name', 'N/A')} - {training.get('description', 'N/A')}"

        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook_lessons, personal_info, context="training"
        )

        prompt = f"""
            Create detailed training plan for {personal_info.username}.

            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {outline_context}
            {playbook_context}

            **AVAILABLE EXERCISES:**
            {exercise_info}

             **PLAN STRUCTURE:**
             1. Match outline EXACTLY (same title, duration, phases)
             2. Each phase → weekly schedules with 7 daily trainings (Mon-Sun)
             3. Each day → set training_type: strength/endurance/mixed/rest
             
             **MODALITY-SPECIFIC INSTRUCTIONS:**
             
             **STRENGTH days:** provide exercises with sets, reps, weight_1rm
             • Select movements for goal, equipment, experience
             • Balance movement patterns (push/pull, upper/lower, etc.)
             
             **ENDURANCE days:** Sessions with name, description (≤20 words), sport_type, training_volume, unit
             • Vary session types (easy, tempo, intervals, recovery)
             • Interval sessions can be created by making several endurance sessions with different tempo's / heart rate zones
             • Heart_rate_zone optional (not all users track HR)

             
             **MIXED days:** 2-3 strength exercises + 1 endurance session
             • Balance modalities to avoid interference
             • Consider recovery demands
             
             **REST days:** training_type="rest", is_rest_day=true, empty exercise/session arrays
             
             **MOTIVATION TEXT LIMITS:**
             • Daily: 1-2 sentences
             • Weekly: 2-3 sentences
             • Overall plan: 3-4 sentences

             **TRAINING PRINCIPLES:**
             ✓ Progressive Overload - gradual difficulty increases
             ✓ Variety - prevent plateaus, vary week-to-week
             ✓ Specificity - matches goal requirements
             ✓ Recovery - adequate rest between hard sessions
             ✓ Individualization - respects constraints/preferences

             **CRITICAL REQUIREMENTS:**
             ✓ Match {personal_info.experience_level} complexity
             ✓ Align with "{personal_info.goal_description}" (primary driver)
             ✓ Apply goal-appropriate periodization
             ✓ APPLY ALL PLAYBOOK LESSONS (proven outcomes - must incorporate)
             ✓ Stay concise (avoid token limits)
             
             **FLEXIBILITY NOTE:**
             If outline has obvious errors or user equipment changed, note the discrepancy and proceed with best judgment for user safety/success.

            Return: TrainingPlan schema format.
         """

        return prompt

    @staticmethod
    def generate_exercise_decision_prompt(
        personal_info: PersonalInfo, formatted_responses: str, plan_outline: dict
    ) -> str:
        """Generate the prompt for AI to decide if exercises are needed."""
        return f"""
        You are an expert training coach analyzing training requirements.
        
        **User Profile:**
        Goal: {personal_info.goal_description}
        Experience: {personal_info.experience_level}
        
        **Responses:** {formatted_responses}
        **Outline:** {plan_outline}
        
        **EXERCISE DATABASE SCOPE:**
        
        ✅ **What we HAVE:** Strength training exercises with these equipment types:
        Barbell | Dumbbell | Cable | Machine | Smith Machine | Body Weight | Resistance Bands | Suspension Trainer | Sled | Plyometric | Isometric
        
        ❌ **What we DON'T have:**
        Running/cycling/swimming programs | Sport-specific skills drills | Yoga/dance sequences
        
        **EQUIPMENT TYPE STRINGS (use EXACTLY as shown):**
        • "Barbell"
        • "Dumbbell"
        • "Cable"
        • "Machine"
        • "Smith"
        • "Body Weight"
        • "Band Resistive"
        • "Suspension"
        • "Sled"
        • "Weighted"
        • "Plyometric"
        • "Isometric"
        
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
        Based on user's available equipment from responses:
        • Match user equipment to database strings EXACTLY
        • Select ALL applicable types (can be multiple)
        • Use EXACT capitalization from list above
        
        **VALIDATION:** Equipment strings must match database exactly - check capitalization, spacing, and special characters.
        """
