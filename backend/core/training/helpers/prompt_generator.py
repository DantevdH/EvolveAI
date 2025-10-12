"""
Prompt Generator for training Coach AI interactions.

This module contains all the prompts used by the TrainingCoach for generating
questions, training plan outlines, and training plans.
"""

from typing import List
from core.training.helpers.ai_question_schemas import PersonalInfo, AIQuestion


class PromptGenerator:
    """Generates prompts for different AI interactions in the training coaching system."""

    @staticmethod
    def get_question_generation_intro() -> str:
        """Get the introduction for question generation prompts."""
        return """
        You are an expert training coach designing personalized training plans. Your questions must 
        gather ONLY information that directly impacts the final training plan structure AND that are relevant to the user's specific goal.
        
        **Your Goal:** Collect specific data needed to create a detailed, actionable training plan tailored to their goal.
        
        **Training Plan Components You May Need to Design (depending on their goal):**
        
        1. **Training Activities** - Which activities are relevant (strength exercises, running, cycling, swimming, sport-specific drills, etc.)
        2. **Training Structure** - How to organize training across the week (split, frequency, combination of activities)
        3. **Training Frequency** - How many sessions per week and which days
        4. **Intensity & Volume** - Appropriate levels (sets/reps, distance/time, zones, pace, etc.). Do NOT ask for currently lifted weights as this will be determined after the plan is generated.
        5. **Periodization** - How to increase difficulty over time (weekly increments, phase changes)
        6. **Recovery** - When and how to schedule rest/recovery
        7. **Equipment & Resources** - What's available and needed for their activities
        8. **Limitations** - Physical constraints, injuries, or preferences to work around
        
        **Question Focus:** 
        - Analyze their goal to determine which components are relevant
        - Only ask about components that apply to THEIR specific goal
        - Adapt your questions to match their training context (strength, endurance, mixed, sport-specific, etc.)
        - Adapt question complexity and terminology to their experience level (simpler for beginners, you are allowed to go more technical for advanced)
        - Every question must help you make concrete decisions about their training plan
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
    def get_question_generation_instructions() -> str:
        """Get instructions for question generation."""
        return """
        **QUESTION TYPE SELECTION GUIDE:**
        
        Choose the right type based on HOW the user should respond:
        
        1. **MULTIPLE_CHOICE** - Use when there are 2-5 clear, distinct options to choose from
           - Phrase question so user picks ONE option from a short list
           - Example: "What is your preferred learning style?" → Options: Visual, Auditory, Kinesthetic, Reading/Writing
           - When to use: Clear categories, limited options, mutually exclusive choices
           - REQUIRED fields: help_text, options (list of QuestionOption with id, text, value)
        
        2. **DROPDOWN** - Use when there are more than 5 options to choose from
           - Phrase question so user selects ONE option from a longer list
           - Example: "Which country were you born in?" → Options: List of 150+ countries
           - When to use: Many options, single selection, predefined list
           - REQUIRED fields: help_text, options (list of QuestionOption with id, text, value)
        
        3. **RATING** - Use for subjective scales with 5 or fewer points
           - Phrase question asking to rate something on a scale (1-5) if more than 5 points, use slider instead
           - Example: "How would you rate your current cooking skills?" → Scale: 1 (Starter) to 5 (Chef)
           - When to use: Opinion/feeling measurement, quality assessment, experience level
           - REQUIRED fields: help_text, min_value, max_value, min_description (e.g., 'Poor', 'Low', 'Never'), max_description (e.g., 'Excellent', 'High', 'Always')
        
        4. **SLIDER** - Use for numeric values with more than 5 possible values
           - Phrase question asking for a specific numeric amount
           - Example: "How many hours do you sleep per night?" → Slider: 4-12 hours with 0.5 step
           - When to use: Quantities, measurements, continuous ranges
           - REQUIRED fields: help_text, min_value, max_value, step, unit (hours, kg, minutes, km, etc.)
        
        5. **FREE_TEXT** - Use ONLY when user must write a descriptive answer
           - Phrase as an open-ended question requiring explanation
           - Example: "Describe your previous work experience" → Text field
           - When to use: Complex descriptions, personal stories, detailed explanations
           - Use SPARINGLY - prefer structured types when possible
           - REQUIRED fields: help_text, placeholder (instruction text), max_length (200-500 chars)
        
        6. **CONDITIONAL_BOOLEAN** - Use when a yes/no answer determines if details are needed
           - Phrase as a yes/no question where "Yes" needs elaboration
           - Example: "Do you have any allergies?" → Yes (describe them) / No (skip)
           - When to use: Screening questions where "No" needs no follow-up
           - Use instead of free_text when the question can start with "Do you have..." or "Have you ever..."
           - REQUIRED fields: help_text, placeholder (for text input), max_length (200-500 chars)
        
        **IMPORTANT - Avoid Over-Using Open Formats:**
        - If the answer can be structured (multiple choice, slider, rating), use structured types instead
        - free text questions or conditional boolean questions should be used sparingly as they take longer to answer.
        - Structured questions are faster and easier for users to answer
        - Reserve open formats for when you truly need unstructured information
        """

    @staticmethod
    def generate_initial_questions_prompt(personal_info: PersonalInfo) -> str:
        """Generate the complete prompt for initial questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **WORKFLOW STATUS:**
        🎯 **CURRENT STEP:** Initial Questions Phase
        - Gather specific information needed to build their training plan
        - Focus on understanding their goal and collecting actionable training data
        - Generate 5-8 targeted questions that directly impact plan design
        - Use a nice combination of different question types
        
        **PRIMARY OBJECTIVE:** Collect concrete data needed to design their complete training plan.
        
        **ANALYZE THEIR GOAL:** 
        Goal: "{personal_info.goal_description}"
        Experience: {personal_info.experience_level}
        
        Based on their goal, determine what information you need to create their plan:
        - What specific outcomes do they want to achieve?
        - What training activities are relevant to their goal?
        - What resources and constraints affect their training?
        - What is their current starting point?
        
        **QUESTION STRATEGY:**
        Generate 5-8 questions that help you determine the training plan components from the intro.
        Only ask questions that are:
        - Directly relevant to their specific goal
        - Necessary to make concrete decisions about their plan
        - Not already answered by the information you have
        
        Focus your questions on gathering:
        - Goal clarification (specific targets, timeline, priorities)
        - Training resources (equipment, location, schedule availability)
        - Current abilities (starting point for their goal-relevant activities)
        - Preferences (training approaches they prefer or want to avoid)
        - Limitations (physical constraints, injuries, restrictions)
        
        **CRITICAL REQUIREMENTS:**
        - Ask ONLY about information that directly impacts training plan design
        - DO NOT ask about tracking methods, apps, or how they'll measure progress (not relevant for plan design)
        - Avoid generic lifestyle questions unless they affect training schedule or recovery
        - Focus on concrete, actionable data that helps you make specific training decisions
        - Use varied question types (not just open-ended) for better user experience
        - Adapt complexity to their experience level
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **EXPECTED OUTPUT:**
        - 5-8 targeted questions that provide the data needed to design their training plan
        - Personalized AI coach message welcoming them to the assessment
        - Questions tailored to their specific goal and experience level
        
        **AI COACH MESSAGE REQUIREMENTS:**
        Generate a personalized message that:
        - Greets them warmly using their username "{personal_info.username}"
        - References their specific goal: "{personal_info.goal_description}" and you're very excited to help them
        - Mention that you have analysed their profile but you have some further questions to refine the plan
        - Uses 2-3 relevant emojis
        - Use a maximum of 70 words
        - Format: Greeting → Analysis → Call to action
        
        Return in AIQuestionResponse format with ai_message populated.
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
        - Gathered foundational information about their goal, training preferences, and constraints
        - As we're asking follow-up questions, do not ask completely new or redundant questions. But zoom in on already discovered topics.
        - As we're asking follow-up questions you are allowed to use more free format question types as we need more detailed information.
        
        🎯 **CURRENT STEP:** Follow-up Questions Phase
        - Fill remaining gaps needed to finalize training plan design
        - Generate as much as needed (max 7 but prefer less) targeted questions to complete the training plan blueprint
        
        **INITIAL RESPONSES TO ANALYZE:**
        {formatted_responses}
        
        **STRATEGIC FOLLOW-UP APPROACH:**
        Review their responses and identify what's STILL MISSING to create the complete training plan.
        
        Generate max 7 follow-up questions that fill these specific gaps for THEIR goal
             
        {PromptGenerator.get_question_generation_instructions()}
        
        **CRITICAL REQUIREMENTS:**
        - ONLY ask questions that fill critical gaps for training plan design
        - DO NOT ask about progress tracking, measurement methods, or monitoring tools
        - AVOID repeating information already gathered
        - AVOID generic questions - be specific to their goal and responses
        - If all necessary information is gathered, ask fewer questions (3 minimum)
        
        **EXPECTED OUTPUT:**
        - Max 7 targeted questions that complete the training plan blueprint
        - Personalized AI coach message acknowledging their initial responses
        - Questions that provide the final pieces of data needed for plan creation
        
        **AI COACH MESSAGE REQUIREMENTS:**
        Generate a personalized message that:
        - Greets them warmly using their username "{personal_info.username}"
        - Acknowledges their great initial responses
        - Shows you're building a clearer picture of their training needs
        - References specific things they mentioned (equipment, goals, constraints)
        - Explains these follow-up questions will fine-tune their perfect plan
        - Uses 2-3 relevant emojis
        - Use a maximum of 70 words
        - Format: Acknowledgment → Analysis → Next steps
        
        Return in AIQuestionResponse format with ai_message populated.
        """

    @staticmethod
    def get_outline_generation_intro() -> str:
        """Get the introduction for outline generation prompts."""
        return """
        You are an expert training coach creating a comprehensive training plan outline. 
        Based on the client's responses, create a structured outline that gives them 
        a clear preview of their upcoming personalized training plan.
        """

    @staticmethod
    def get_outline_generation_instructions() -> str:
        """Get instructions for outline generation."""
        return """
        Create a training plan outline that includes:
        1. A catchy program title (3 words or less)
        2. Total program duration in weeks
        3. High-level explanation of the training approach
        4. Breakdown into training periods/phases
        5. For each period: name, duration, explanation, and sample daily trainings
        6. Each daily training should have: day number, training name, description (max 20 words), and relevant tags
        
        Make sure the outline:
        - Is tailored to their specific goals and experience level
        - Follows proper periodization principles
        - Is realistic and achievable
        - Builds excitement for the full plan
        """

    @staticmethod
    def get_outline_generation_requirements() -> str:
        """Get requirements for outline generation."""
        return """
        Requirements:
        - Use the TrainingPlanOutline schema format
        - Limit to 8-12 weeks total duration (prevent overly long plans)
        - Include 2-3 training periods max
        - Each period should have 3-7 daily trainings
        - Training descriptions: max 20 words each
        - Tags should be relevant (e.g., 'strength', 'cardio', 'recovery', 'high-intensity')
        - Make it engaging and motivating but concise
        """

    @staticmethod
    def generate_training_plan_outline_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
    ) -> str:
        """Generate the complete prompt for training plan outline."""
        combined_responses = (
            f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        )

        return f"""
        {PromptGenerator.get_outline_generation_intro()}

        {PromptGenerator.format_client_information(personal_info)}

        **WORKFLOW STATUS:**
        ✅ **COMPLETED:** Initial Questions Phase
        - Gathered foundational data: goal details, training type preferences, equipment, availability
        - Collected information on current performance level and physical limitations
        
        ✅ **COMPLETED:** Follow-up Questions Phase
        - Filled critical gaps for training plan design
        
        **COMPLETE TRAINING DATA TO USE:**
        {combined_responses}

        🎯 **CURRENT STEP:** Training Plan Outline Phase
        - Create a training plan outline based on the SPECIFIC data gathered
        - Design the weekly structure showing which days are strength, endurance, mixed, or recovery
        - Define periodization strategy across training periods
        - Show them the blueprint of their personalized program


        **OUTLINE CREATION STRATEGY:**
        Use the SPECIFIC information from their responses to determine:
        
        1. **Training Split & Frequency**:
           - Based on available days → How many training days per week?
           - Based on preferences → Which days are strength, endurance, mixed, or recovery?
           - Based on goal → What's the primary focus (strength vs. endurance ratio)?
        
        2. **Exercise & Session Selection**:
           - Based on equipment → Which exercise categories are available?
           - Based on goal & preferences → Push/pull/legs? Full body? Endurance sport type?
           - Based on limitations → Any exercises or movements to avoid?
        
        3. **Intensity & Volume Approach**:
           - Based on experience level → Starting intensity and volume
           - Based on goal → Higher volume or higher intensity focus?
           - Based on time availability → Session duration and density
        
        4. **Periodization**:
           - Based on timeline → How many weeks and training periods?
           - Based on goal → Linear periodization? Undulating? Block periodization?
           - Based on experience → Rate of difficulty increases and complexity

        **OUTLINE STRUCTURE:**
        - **Title**: 3 words max, reflects their specific goal
        - **Duration**: 8-12 weeks maximum (keep plans focused and achievable)
        - **Explanation**: Directly references their goal, available training days, and approach (2-3 sentences max)
        - **User Observations**: Comprehensive summary capturing ALL information from personal info and responses
        - **Training Periods**: 2-3 phases showing periodization (e.g., Build Base → Increase Intensity → Peak)
        - **Daily Trainings**: Show weekly pattern (e.g., Mon: Strength Upper, Wed: Endurance Run, Fri: Strength Lower)

        **USER OBSERVATIONS REQUIREMENTS:**
        Create a comprehensive summary capturing ALL information from personal info and responses in maximum 2 sentences. Analyze the actual questions asked and responses given - include every relevant detail about their training preferences, equipment, availability, limitations, motivations, and more...
          - Write in the following format: the user is a [age] year old [gender] who weighs [weight] [unit] and is [height] [unit] tall. They want to focus on [goal_description] and 
            have [experience_level] experience level. [Continue with ALL details from responses in proper sentence structure] 

        **CRITICAL REQUIREMENTS FOR OUTLINE:**
        - Daily trainings must reflect their available days and preferences from responses
        - Exercise types must match their available equipment
        - Training_type for each day must align with their goal (strength/endurance/mixed/recovery)
        - Periodization across periods must be clear and goal-appropriate
        - Volume and intensity should match their experience level

        {PromptGenerator.get_outline_generation_instructions()}

        {PromptGenerator.get_outline_generation_requirements()}

        **EXPECTED OUTPUT:**
        - Training plan outline that directly reflects the data gathered in questions
        - Comprehensive user observations summary capturing ALL personal info and responses
        - Weekly structure showing specific training types for each available day
        - Clear periodization strategy across 2-4 training periods
        - Personalized AI coach message celebrating their assessment completion

        **AI COACH MESSAGE REQUIREMENTS:**
        Generate a personalized message that:
        - Greets them warmly using their username "{personal_info.username}"
        - Celebrates completing the comprehensive assessment
        - Shows you've analyzed all their responses thoroughly
        - Explains you're crafting their personalized training plan outline
        - Emphasizes how it's tailored to their specific goal and situation
        - Builds excitement for seeing their complete plan
        - Uses 2-3 relevant emojis
        - Use a maximum of 70 words
        - Format: Celebration → Analysis → Anticipation

        Return in TrainingPlanOutline format with ai_message populated.
        """

    @staticmethod
    def generate_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        plan_outline: dict = None,
        exercise_info: str = "",
    ) -> str:
        """Generate the complete prompt for training plan generation."""
        
        # Build outline context
        outline_context = ""

        if plan_outline:
            outline_context = f"""
            **APPROVED OUTLINE:**
            Title: {plan_outline.get('title', 'N/A')}
            Duration: {plan_outline.get('duration_weeks', 'N/A')} weeks
            
            **USER PROFILE SUMMARY:**
            {plan_outline.get('user_observations', 'N/A')}

            Training Periods:"""
            for period in plan_outline.get("training_periods", []):
               outline_context += f"\n\n{period.get('period_name', 'N/A')} ({period.get('duration_weeks', 'N/A')} weeks):"
               outline_context += f"\n  {period.get('explanation', 'N/A')}"
               
               # Add daily trainings pattern for this period
               daily_trainings = period.get('daily_trainings', [])
               if daily_trainings:
                  outline_context += "\n  Weekly Pattern:"
                  for training in daily_trainings:
                        outline_context += f"\n    Day {training.get('day', 'N/A')}: {training.get('training_name', 'N/A')} - {training.get('description', 'N/A')}"

        # Build the complete prompt
        prompt = f"""
            Create a detailed training plan for {personal_info.username}.

            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {outline_context}

            **AVAILABLE EXERCISES:**
            {exercise_info}

             **INSTRUCTIONS:**
             1. Use the EXACT outline structure (same title, duration, periods)
             2. For each period, create weekly schedules with 7 daily trainings (Mon-Sun)
             3. Set training_type: "strength", "endurance", "mixed", or "recovery"
             4. For STRENGTH: Add 3-5 exercises max with sets, reps, weight_1rm (include compound movements)
             5. For ENDURANCE: Create sessions with name, description (20 words max), sport_type, training_volume, unit, heart_rate_zone
             6. For MIXED: Include 2-3 strength exercises AND 1 endurance session max
             7. For RECOVERY: Set is_rest_day=true, empty arrays
             8. Keep motivation concise:
                - Daily training: 1-2 sentences max
                - Weekly schedule: 2-3 sentences max
                - Overall plan: 3-4 sentences max

             **CRITICAL:**
             - Match {personal_info.experience_level} complexity
             - Support goal: "{personal_info.goal_description}"
             - Increase difficulty across weeks and periods (periodization)
             - VARIETY IS KEY: Vary activities week-to-week to prevent plateaus
             - STAY CONCISE: Keep descriptions brief to avoid exceeding token limits

            Return in TrainingPlan schema format.
         """
        
        return prompt

    @staticmethod
    def generate_exercise_decision_prompt(
        personal_info: PersonalInfo, formatted_responses: str, plan_outline: dict
    ) -> str:
        """Generate the prompt for AI to decide if exercises are needed."""
        return f"""
        You are an expert training coach analyzing a user's training goals and responses.
        
        **User Profile:**
        - Goal: {personal_info.goal_description}
        - Experience: {personal_info.experience_level}
        
        **User Responses:**
        {formatted_responses}

        **Training Plan Outline:**
        {plan_outline}
        
        **Available Exercise Database:**
        Our exercise database contains strength training exercises with the following EXACT equipment types (use these exact strings):
        
        **Primary Equipment:**
        - "Barbell" - Olympic bar, standard barbell
        - "Dumbbell" - Single or pair of dumbbells
        - "Cable" - Cable machines, pull stations
        - "Cable (pull side)" - Cable pull exercises
        - "Machine" - General gym machines
        - "Machine (selectorized)" - Pin-loaded machines
        - "Machine (plate loaded)" - Plate-loaded machines
        - "Smith" - Smith machine
        - "Body Weight" - No equipment needed (capitalize both words)
        - "Body weight" - No equipment needed (lowercase 'weight')
        
        **Resistance & Support:**
        - "Band Resistive" - Resistance bands
        - "Band-assisted" - Bands for assistance
        - "Suspension" - TRX, suspension trainers
        - "Suspended" - Suspended exercises
        - "Sled" - Pushing/pulling sleds
        - "Weighted" - Added weight, weighted vests
        
        **Specialized:**
        - "Assisted (machine)" - Assisted pull-up/dip machines
        - "Self-assisted" - Using own body for assistance
        - "Isometric" - Static holds
        - "Plyometric" - Explosive/jumping movements
        
        **What we DON'T have:**
        - Running-specific drills or endurance programs
        - Swimming techniques or training plans
        - Cycling training plans
        - Sport-specific skills training (ball sports, martial arts, etc.)
        - Yoga sequences or flows
        - Dance routines
        
        **Decision Task:**
        Based on the user's goal, questions and anwers providing more detail and training plan outline, decide:
        1. Do you need exercises from our database? (Yes if any strength training is needed)
        2. What difficulty level? (beginner/intermediate/advanced)
        3. Which equipment types should we retrieve? 
           - Use the EXACT strings from the list above (including quotes, capitalization, and parentheses)
           - Select based on what equipment the user has access to
           - You can select multiple equipment types
        
        **CRITICAL:** The equipment strings must EXACTLY match the database values listed above, including capitalization and special characters.
        """
