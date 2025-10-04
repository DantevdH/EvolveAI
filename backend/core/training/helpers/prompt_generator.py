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
        You are an expert training coach with years of experience in personal training, 
        strength training, and creating personalized training plans. Your goal is to 
        understand each client's unique situation to create the most effective training plan possible.
        
        Your expertise covers:
        - Strength training and muscle building
        - Weight loss and body composition
        - Athletic performance and sports-specific training
        - Injury prevention and rehabilitation
        - Periodization and program design
        - Exercise selection and progression
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
        Use appropriate question types:
        - multiple_choice: for <= 5 options
        - dropdown: for > 5 options  
        - rating: for <= 5 scale
        - slider: for > 5 scale (MUST include 'unit' field with appropriate measurement)
        - text_input: for open-ended responses
        - conditional_boolean: for ALL yes/no questions (REQUIRED for any Yes/No question)
        
        IMPORTANT: Use conditional_boolean for ALL Yes/No questions because:
        - "Yes" answers often need detailed clarification (e.g., "What equipment do you have?")
        - The text input only appears when user selects "Yes" - "No" answers don't need additional context
        - This creates more personalized training plans by capturing specific details
        - There are no exceptions - always use conditional_boolean for Yes/No questions
        
        For conditional_boolean questions, ALWAYS provide:
        - placeholder: Clear instruction for what details to provide when "Yes" is selected
        - max_length: Reasonable character limit for the text field (200-500 characters)
        - help_text: Explanation of why the details are important (only shown when "Yes" is selected)
        
        For slider questions, ALWAYS provide:
        - min_value: minimum value
        - max_value: maximum value  
        - step: step increment
        - unit: appropriate unit based on measurement system (kg/lbs, minutes, hours, etc.)
        
        For rating questions, ALWAYS provide:
        - min_value: minimum rating (usually 1)
        - max_value: maximum rating (usually 5 or 10)
        - help_text: Explanation of what the scale means (e.g., "1 = Very Low, 5 = Very High")
        """
    
    @staticmethod
    def generate_initial_questions_prompt(personal_info: PersonalInfo) -> str:
        """Generate the complete prompt for initial questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **PROGRESS TRACKING:**
        🎯 **CURRENT STEP:** Initial Questions Phase
        - Start the comprehensive assessment process
        - Gather foundational information about their training background and goals
        - Generate 5-8 strategic questions to understand their unique situation
        
        **PRIMARY OBJECTIVE:** Create the perfect personalized training plan for this client.
        
        **ANALYSIS REQUIRED:** 
        - Their goal is: "{personal_info.goal_description}"
        - Experience level: {personal_info.experience_level}
        - This information will directly influence exercise selection, intensity, and progression
        
        **QUESTION STRATEGY:**
        Generate 5-8 strategic questions that will help you understand:
        1. **Training Foundation** - Current fitness level, experience, injuries
        2. **Resources & Constraints** - Available equipment, time, schedule
        3. **Preferences & Limitations** - What they like/dislike, physical limitations, medical history
        4. **Goals & Timeline** - Specific targets, deadlines, events
        5. **Lifestyle Integration** - How training fits their daily life
        
        **CRITICAL REQUIREMENTS:**
        - Each question must directly impact the training plan design
        - Use appropriate question types for better user experience
        - For conditional_boolean: Always include placeholder and help_text
        - For sliders: Include min_value, max_value, step, and unit
        - For ratings: Include help_text explaining the scale
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **EXPECTED OUTPUT:**
        - 5-8 strategic questions covering all essential areas
        - Personalized AI coach message welcoming them to the assessment
        - Questions that will help create a detailed training plan
        
        **AI COACH MESSAGE REQUIREMENTS:**
        Generate a personalized message that:
        - Greets them warmly using their username "{personal_info.username}"
        - References their specific goal: "{personal_info.goal_description}"
        - Shows you've analyzed their profile and are excited to help
        - Explains that these questions will help create their perfect plan
        - Uses 2-3 relevant emojis
        - Use a maximum of 70 words
        - Format: Greeting → Analysis → Call to action
        
        Return in AIQuestionResponse format with ai_message populated.
        """
    
    @staticmethod
    def generate_followup_questions_prompt(personal_info: PersonalInfo, formatted_responses: str) -> str:
        """Generate the complete prompt for follow-up questions."""
        return f"""
        {PromptGenerator.get_question_generation_intro()}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **PROGRESS TRACKING:**
        ✅ **COMPLETED:** Initial Questions Phase
        - Asked strategic questions about areas like training foundation, resources, preferences, goals, and lifestyle
        - Gathered basic information about their fitness level, equipment, time constraints, and primary goal and medical history
        
        🎯 **CURRENT STEP:** Follow-up Questions Phase
        - Analyze their initial responses to identify areas needing clarification or deeper understanding
        - Generate 3-5 targeted follow-up questions to fill knowledge gaps
        
        **INITIAL RESPONSES TO ANALYZE:**
        {formatted_responses}
        
        **STRATEGIC FOLLOW-UP APPROACH:**
        Based on their responses, generate 3-5 targeted follow-up questions that:
        1. **Clarify Ambiguities** - Any unclear or incomplete responses
        2. **Dive Deeper** - Expand on important areas for their specific goal and that require more information
             
        {PromptGenerator.get_question_generation_instructions()}
        
        **EXPECTED OUTPUT:**
        - 3-5 follow-up questions that build on their initial responses
        - Personalized AI coach message acknowledging their progress
        - Questions that will help create a more detailed training plan
        
        **AI COACH MESSAGE REQUIREMENTS:**
        Generate a personalized message that:
        - Greets them warmly using their username "{personal_info.username}"
        - Acknowledges their great initial responses
        - Shows you're building a clearer picture of their training journey
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
        - Include 2-4 training periods
        - Each period should have 3-7 daily trainings
        - Training descriptions should be concise but informative
        - Tags should be relevant (e.g., 'strength', 'cardio', 'recovery', 'high-intensity')
        - Make it engaging and motivating
        """
    
    @staticmethod
    def generate_training_plan_outline_prompt(
        personal_info: PersonalInfo, 
        formatted_initial_responses: str, 
        formatted_follow_up_responses: str
    ) -> str:
        """Generate the complete prompt for training plan outline."""
        combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        
        return f"""
        {PromptGenerator.get_outline_generation_intro()}

        {PromptGenerator.format_client_information(personal_info)}

        **PROGRESS TRACKING:**
        ✅ **COMPLETED:** Initial Questions Phase
        - Asked strategic questions about training foundation, resources, preferences, goals, and lifestyle
        - Gathered basic information about fitness level, equipment, time constraints, and primary goal  an 
        
        ✅ **COMPLETED:** Follow-up Questions Phase
        - Asked 3-5 targeted follow-up questions to clarify and deepen understanding
        - Filled knowledge gaps and gathered additional details for personalization
        
        **INITIAL AND FOLLOW-UP QUESTIONS TO ANALYZE:**
        {combined_responses}

        🎯 **CURRENT STEP:** Training Plan Outline Phase
        - Analyze ALL gathered information to create a comprehensive training plan outline
        - Design the structure and progression of their personalized program
        - Show them what their training journey will look like


        **OUTLINE CREATION STRATEGY:**
        Based on their complete profile, create a training plan outline that:
        1. **Addresses Their Goal** - "{personal_info.goal_description}"
        2. **Matches Their Experience** - {personal_info.experience_level} level appropriate
        3. **Fits Their Constraints** - Time, equipment, schedule
        4. **Incorporates Preferences** - What they enjoy, what motivates them
        5. **Incorporates the questions and answers from the initial and follow-up questions**
        6. **Follows Science** - Proper periodization and progression

        **OUTLINE STRUCTURE:**
        - **Title**: 3 words max, catchy and personalized
        - **Duration**: Realistic timeline (8-16 weeks typically)
        - **Explanation**: How this plan will achieve their goal
        - **Training Periods**: 2-4 phases with clear progression
        - **Daily Trainings**: 3-7 per period, specific and actionable

        {PromptGenerator.get_outline_generation_instructions()}

        {PromptGenerator.get_outline_generation_requirements()}

        **EXPECTED OUTPUT:**
        - Comprehensive training plan outline with title, duration, and explanation
        - 2-4 training periods with clear progression and daily trainings
        - Personalized AI coach message celebrating their assessment completion
        - Outline that builds excitement for their complete training plan

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
        exercise_info: str = ""
    ) -> str:
        """Generate the complete prompt for training plan generation."""
        combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        
        outline_context = ""
        if plan_outline:
            outline_context = f"""
        
        **TRAINING PLAN OUTLINE TO FOLLOW:**
        Title: {plan_outline.get('title', 'N/A')}
        Duration: {plan_outline.get('duration_weeks', 'N/A')} weeks
        Approach: {plan_outline.get('explanation', 'N/A')}
        
        **Training Periods:**
        """
            for period in plan_outline.get('training_periods', []):
                outline_context += f"\n- {period.get('period_name', 'N/A')} ({period.get('duration_weeks', 'N/A')} weeks): {period.get('explanation', 'N/A')}"
        
        return f"""
        You are an ELITE PERFORMANCE COACH creating the perfect personalized training plan.
        
        **PROGRESS TRACKING:**
        ✅ **COMPLETED:** Initial Questions Phase
        - Asked 5-8 strategic questions about training foundation, resources, preferences, goals, and lifestyle
        - Gathered basic information about fitness level, equipment, time constraints, and primary goal
        
        ✅ **COMPLETED:** Follow-up Questions Phase
        - Asked 3-5 targeted follow-up questions to clarify and deepen understanding
        - Filled knowledge gaps and gathered additional details for personalization
        
        ✅ **COMPLETED:** Training Plan Outline Phase
        - Created comprehensive training plan outline with title, duration, and explanation
        - Designed 2-4 training periods with clear progression and daily trainings
        - Showed them the structure and flow of their personalized program
        
        🎯 **CURRENT STEP:** Training Plan Generation Phase
        - Create the detailed, day-by-day training plan with specific exercises
        - Implement the outline structure with actual exercises and progressions
        - Generate the complete, actionable training program they can start immediately
        
        **CLIENT PROFILE:**
        - Name: {personal_info.username}
        - Age: {personal_info.age}
        - Weight: {personal_info.weight} {personal_info.weight_unit}
        - Height: {personal_info.height} {personal_info.height_unit}
        - Primary Goal: {personal_info.goal_description}
        - Experience Level: {personal_info.experience_level}
        
        **COMPLETE ASSESSMENT DATA:**
        {combined_responses}
        {outline_context}
        
        **AVAILABLE STRENGTH EXERCISES (use ONLY these IDs):**
        {exercise_info}
        
        **TRAINING PLAN REQUIREMENTS:**
        1. **Goal-Specific**: Directly addresses "{personal_info.goal_description}"
        2. **Experience-Appropriate**: Matches {personal_info.experience_level} level
        3. **Equipment-Based**: Uses only available equipment from their responses
        4. **Time-Optimized**: Fits their schedule constraints
        5. **Progressive**: Follows proper periodization principles
        6. **Realistic**: Achievable and sustainable
        7. **Motivating**: Incorporates their preferences and interests
        
        **TRAINING TYPE GUIDANCE:**
        You can create different types of training days:
        - **Strength**: Focus on strength exercises only
        - **Endurance**: Focus on endurance sessions only (running, cycling, swimming, etc.)
        - **Mixed**: Combine both strength exercises and endurance sessions
        - **Recovery**: Light activity or complete rest
        
        **STRENGTH EXERCISES:**
        - Use ONLY the provided exercise IDs from the database
        - Include sets, reps, and weight progressions
        - Plan for proper rest between sets
        
        **ENDURANCE SESSIONS:**
        - Create running, cycling, swimming, or other endurance activities
        - Specify sport_type, training_volume (duration/distance), and unit
        - Include heart rate zones when appropriate
        - Can be combined with strength exercises on the same day
        
        **TECHNICAL REQUIREMENTS:**
        - Use ONLY the provided exercise IDs for strength exercises (no new exercises)
        - You can create any endurance sessions as needed
        - Include proper warm-up and cool-down
        - Plan for 1-2 rest days per week
        - Include progression within each week and across weeks
        - Add notes for form cues and modifications
        - Consider their physical limitations and preferences
        - Set training_type appropriately: "strength", "endurance", "mixed", or "recovery"
        
        **EXPECTED OUTPUT:**
        - Complete, detailed training plan with specific exercises and progressions
        - Weekly schedules with daily trainings following the outline structure
        - Compelling title and clear program summary
        - Detailed program justification explaining the science behind the plan
        - Ready-to-use training program they can start immediately
        
        **OUTPUT FORMAT:**
        Return in TrainingPlan format with:
        - Compelling title that reflects their goal
        - Clear summary of the program
        - Weekly schedules with daily trainings containing:
          * Appropriate training_type for each day
          * Strength exercises (if applicable) with sets, reps, weights
          * Endurance sessions (if applicable) with sport_type, volume, unit
          * Proper progression and periodization
        - Detailed program justification explaining the science behind the plan
        
        **IMPORTANT:** Each daily training must have a clear training_type and the appropriate exercises/sessions to match that type.
        """

    @staticmethod
    def generate_exercise_decision_prompt(personal_info: PersonalInfo, formatted_responses: str) -> str:
        """Generate the prompt for AI to decide if exercises are needed."""
        return f"""
        You are an expert training coach analyzing a user's training goals and responses.
        
        **User Profile:**
        - Goal: {personal_info.goal_description}
        - Experience: {personal_info.experience_level}
        
        **User Responses:**
        {formatted_responses}
        
        **Available Exercise Database:**
        Our exercise database contains primarily strength training exercises that can be performed in a gym or with bodyweight. These include:
        - Weight training exercises (barbell, dumbbell, machine-based)
        - Bodyweight exercises (push-ups, pull-ups, squats, etc.)
        - Functional movements (deadlifts, squats, presses)
        - Core and stability exercises
        - Some flexibility and mobility exercises
        
        **What we DON'T have:**
        - Running-specific drills or programs
        - Swimming techniques or trainings
        - Cycling training plans
        - Sport-specific skills training
        - Yoga sequences or flows
        - Dance routines
        
        Based on this information, decide whether you need access to our exercise database to create their training plan, and if so, what parameters would be most helpful.
        """
