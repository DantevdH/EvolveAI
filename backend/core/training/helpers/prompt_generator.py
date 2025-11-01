"""
Prompt Generator for training Coach AI interactions.

This module contains all the prompts used by the TrainingCoach for generating
questions, training plan outlines, and training plans.
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any
from core.training.schemas.question_schemas import PersonalInfo, AIQuestion

SAVE_PROMPTS = False

# TODO: REMOVE THIS FUNCTION - Prompt saving for review only
def _save_prompt_to_file(prompt_name: str, prompt_content: str):
    """
    Save generated prompt to a text file for review.
    
    Creates a 'prompts' subdirectory if it doesn't exist and saves the prompt
    with a timestamp to avoid overwrites.
    """
    if not SAVE_PROMPTS:
        return
    
    try:
        # Get the directory of this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompts_dir = os.path.join(current_dir, "prompts")
        
        # Create prompts directory if it doesn't exist
        os.makedirs(prompts_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prompt_name}_{timestamp}.txt"
        filepath = os.path.join(prompts_dir, filename)
        
        # Write prompt to file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# TODO: REMOVE THIS FILE - Prompt saved for review only\n")
            f.write(f"# Prompt: {prompt_name}\n")
            f.write(f"# Generated: {datetime.now().isoformat()}\n")
            f.write(f"# Location: backend/core/training/helpers/prompt_generator.py\n")
            f.write(f"\n{'='*80}\n")
            f.write(f"PROMPT CONTENT:\n")
            f.write(f"{'='*80}\n\n")
            f.write(prompt_content)
        
    except Exception as e:
        # Don't fail if saving prompt fails - just log and continue
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not save prompt to file: {e}")


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
        • Required: help_text, options[{{id, text, value}}]
        
        **2. DROPDOWN** - 6+ options
        • User selects ONE from longer list
        • Example: "Primary sport?" → 50+ sports list
        • Use for: Many predefined options, single selection
        • Required: help_text, options[{{id, text, value}}]
        
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
        
        • MULTIPLE_CHOICE: options[] (array of {{id, text, value}})
        • DROPDOWN: options[] (array of {{id, text, value}})
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
        {{
          "id": "training_days",
          "text": "How many days per week can you train?",
          "help_text": "Select your realistic training frequency",
          "response_type": "slider",
          "min_value": 1,
          "max_value": 7,
          "step": 1,
          "unit": "days"  // ⚠️ Must be string, NOT ["days"]
        }}
        
        ✅ FREE_TEXT (open-ended input):
        {{
          "id": "injury_details",
          "text": "Describe any injuries or limitations",
          "help_text": "Help us design a safe program",
          "response_type": "free_text",
          "max_length": 300,
          "placeholder": "E.g., lower back pain, knee sensitivity..."
        }}
        
        ✅ MULTIPLE_CHOICE (select from options):
        {{
          "id": "training_goal",
          "text": "What is your primary training goal?",
          "help_text": "Choose the goal that matters most to you",
          "response_type": "multiple_choice",
          "options": [
            {{"id": "strength", "text": "Build Strength", "value": "strength"}},
            {{"id": "muscle", "text": "Gain Muscle", "value": "muscle"}},
            {{"id": "endurance", "text": "Improve Endurance", "value": "endurance"}}
          ]
        }}
        
        ✅ CONDITIONAL_BOOLEAN (ONLY when user has EXISTING scheduled training commitments):
        {{
          "id": "existing_training",
          "text": "Do you already have regular training or practice sessions?",
          "help_text": "For example: team practices, club sessions, scheduled classes, or matches",
          "response_type": "conditional_boolean",
          "max_length": 300,
          "placeholder": "E.g., football practice Mon/Wed/Fri 2 hours + game Saturday, tennis club Tuesday/Thursday, martial arts class Wednesday..."
        }}
        Note: Only use this if user has EXISTING commitments (team practices, sport club sessions, scheduled classes). NOT for general fitness goals where we're creating their plan from scratch.
        """

    @staticmethod
    def generate_initial_questions_prompt(personal_info: PersonalInfo) -> str:
        """Generate the complete prompt for initial questions."""
        prompt = f"""
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
        If the plan will include ANY strength training, you MUST ask these questions:
        
        1. **Equipment Access (REQUIRED):**
        • Question: "What training equipment do you have access to?"
        • Type: multiple_choice
        • Options (in this order):
          - "Body Weight Only" → No equipment available
          - "Dumbbells" → Have dumbbells at home or gym
          - "Full Gym Access" → Barbell, machines, cables, racks, etc.
          - "Resistance Bands" → Bands and similar portable equipment
        • This is ESSENTIAL to match exercises to available equipment
        
        2. **Benchmark Lifts (REQUIRED):**
        • Question: "Do you know your current 1-rep max (1RM) for key lifts like squat, bench press, deadlift, or overhead press?"
        • Type: conditional_boolean
        • Help text: "If yes, we can provide more accurate weight recommendations. Don't worry if you don't know - we'll make a smart estimate based on your profile!"
        • Placeholder: "Please list any lifts you know. Format: Exercise Name - Weight. Provide weights in {personal_info.weight_unit} only, e.g., 'Bench Press - 100 {personal_info.weight_unit}', 'Squat - 135 {personal_info.weight_unit}', 'Deadlift - 180 {personal_info.weight_unit}'"
        • Max length: 300
        • This helps generate accurate weight prescriptions - users can provide any benchmark lifts they know
        • IMPORTANT: Use the actual weight_unit value from the user's profile above ({personal_info.weight_unit}) - this will be either "kg" or "lbs"
        • If they select "No", that's fine - we'll estimate based on body weight, age, gender, and experience
        
        **QUESTION FOCUS AREAS FOR INITIAL QUESTIONS:**
        1. Goal specifics (targets, timeline, priorities)
        2. Existing commitments (team practices, sport club sessions, scheduled classes, or matches that we need to work around)
        3. Resources (equipment, location, schedule availability for NEW training sessions we need to schedule)
        4. Current abilities (baseline for goal-relevant activities, including benchmark lifts if known)
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
        • The tone should be energetic, personal, and confidence-boosting, making the user feel like they're about to begin something transformative.
        
        Return: AIQuestionResponse schema with ai_message populated.
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_initial_questions_prompt", prompt)
        
        return prompt

    @staticmethod
    def generate_followup_questions_prompt(
        personal_info: PersonalInfo, formatted_responses: str
    ) -> str:
        """Generate the complete prompt for follow-up questions."""
        prompt = f"""
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
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_followup_questions_prompt", prompt)
        
        return prompt

    @staticmethod
    def generate_initial_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        metadata_options: Dict[str, List[str]] = None,
    ) -> str:
        """
        Generate prompt for creating the FIRST week (Week 1) during onboarding.
        
        This is used only once when the user completes onboarding.
        We re-assess by week and adjust - this creates ONLY Week 1.
        """
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)
        
        prompt = f"""
            **YOUR ROLE:**
            You are an Expert Training Coach who just completed a personalized assessment with {personal_info.username}.
            You gathered information in two phases and now need to create their Week 1 training plan.
            Remember: This is Week 1 only. We re-assess and adjust weekly based on their progress.
            
            **CLIENT PROFILE:**
            {PromptGenerator.format_client_information(personal_info)}
            
            **ASSESSMENT PHASE 1 - INITIAL RESPONSES:**
            {formatted_initial_responses}
            
            **ASSESSMENT PHASE 2 - FOLLOW-UP RESPONSES:**
            {formatted_follow_up_responses}
            
            **YOUR TASK:**
            Design Week 1 training schedule using:
            • Assessment data above (constraints, preferences, situation)
            • Goal: "{personal_info.goal_description}"
            • Experience: {personal_info.experience_level}
            • Your coaching expertise (structure, volume, intensity, exercise selection)
            
            **RULES & SCOPE:**
            • Respect CONSTRAINTS: equipment access, time availability, injuries, existing commitments
            • You decide HOW to train (structure, periodization, programming)
            • Only prescribe exercises matching available equipment
            • ✅ Provide: Strength training, running, cycling, swimming, hiking, general conditioning
            • ❌ Do NOT provide: Sport-specific drills, technical skill training, team practice schedules
            • 🎯 For athletes: Create supportive strength/conditioning to complement existing sport training
            • Work with what you know rather than making assumptions

            {metadata_section}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(personal_info)}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

            {PromptGenerator._get_supplemental_training_scheduling()}

            **OUTPUT:**
            Return TrainingPlan schema with:
            - title: Descriptive plan title (3-5 words, e.g., "Foundation Strength Plan")
            - summary: Brief plan summary (MAX 25 words)
            - justification: Plan approach explanation (MAX 40 words)
            - weekly_schedules: Array with ONE WeeklySchedule (week_number: 1, exactly 7 daily_trainings)
            - ai_message: Warm message celebrating plan completion, explaining week-by-week approach (2-3 sentences, 2-3 emojis)
              Example: "🎉 Amazing! I've created your personalized Week 1 plan! We work week-by-week so we can track your progress and adapt as you grow stronger. Take a look — excited to hear your thoughts! 💪✨"
         """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_initial_training_plan_prompt", prompt)
        
        return prompt
    
    @staticmethod
    def update_weekly_schedule_prompt(
        personal_info: PersonalInfo,
        feedback_message: str,
        week_number: int,
        current_week_summary: str,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        metadata_options: Dict[str, List[str]] = None,
        conversation_history: str = None,
    ) -> str:
        """
        Generate prompt for updating an existing week based on user feedback.
        
        This updates ONLY the specified week - we re-assess by week and adjust.
        Uses onboarding responses (initial + follow-up questions) like initial generation.
        
        Args:
            personal_info: User's personal information and goals
            feedback_message: User's feedback message requesting week changes
            week_number: Week number to update
            current_week_summary: Summary of current week structure
            formatted_initial_responses: REQUIRED - Formatted responses from initial questions
            formatted_follow_up_responses: REQUIRED - Formatted responses from follow-up questions
            metadata_options: Exercise metadata options from database
            conversation_history: Optional conversation history for context
        """
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)

        current_week_section = ""
        if current_week_summary:
            current_week_section = f"""
            **CURRENT WEEK {week_number} STRUCTURE:**
            {current_week_summary}
            """

        conversation_section = ""
        if conversation_history:
            conversation_section = f"""
            **CONVERSATION HISTORY:**
            {conversation_history}
            """

        prompt = f"""
            **YOUR ROLE:**
            You are an Expert Training Coach who previously created {personal_info.username}'s Week {week_number} training plan.
            You completed a two-phase assessment and designed their plan based on your findings.
            The user now has feedback on Week {week_number} - adjust ONLY what they request.
            
            **WHAT YOU'VE COMPLETED:**
            1. Conducted initial assessment (Phase 1)
            2. Conducted follow-up assessment (Phase 2)
            3. Designed Week {week_number} training plan based on assessment findings
            
            **CLIENT PROFILE:**
            {PromptGenerator.format_client_information(personal_info)}
            
            **ASSESSMENT PHASE 1 - INITIAL RESPONSES:**
            {formatted_initial_responses}
            
            **ASSESSMENT PHASE 2 - FOLLOW-UP RESPONSES:**
            {formatted_follow_up_responses}
            
            {current_week_section}
            {conversation_section}
            
            **USER FEEDBACK ON WEEK {week_number}:**
            {feedback_message}
            
            **YOUR TASK:**
            Adjust Week {week_number} based on the user's feedback while respecting:
            1. Constraints from initial and follow-up assessment responses (equipment, time, injuries, preferences)
            2. Prior changes documented in conversation history
            3. Your expertise as a training coach
            
            You have autonomy to make adjustments within these constraints - not just apply the exact feedback, but consider what makes sense given the constraints and history.
            
            **CRITICAL UPDATE RULES:**
            • Address the feedback above, but you can make adjustments beyond what's explicitly mentioned if needed to align with constraints from initial/follow-up responses
            • Use conversation history to understand prior changes - preserve those changes and build upon them when relevant
            • Respect ALL constraints from assessment responses: equipment access, time availability, injuries, existing commitments, preferences
            • You can adjust exercises, volume, intensity, or structure if needed to better align with constraints or conversation history
            • If feedback conflicts with constraints, use your judgment to propose the best alternative that honors both
            • Maintain alignment with goal: "{personal_info.goal_description}" and experience: {personal_info.experience_level}
            • Preserve structure where it makes sense (same 7 days, logical day ordering)
            • Only prescribe exercises matching their available equipment from assessment responses
            
            **RULES & SCOPE:**
            • Respect CONSTRAINTS: equipment access, time availability, injuries, existing commitments
            • ✅ Provide: Strength training, running, cycling, swimming, hiking, general conditioning
            • ❌ Do NOT provide: Sport-specific drills, technical skill training, team practice schedules
            • 🎯 For athletes: Create supportive strength/conditioning to complement existing sport training

            {metadata_section}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(personal_info)}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

            {PromptGenerator._get_supplemental_training_scheduling()}

            **OUTPUT:**
            WeeklyScheduleResponse consists of daily_trainings (array) plus justification and ai_message:
            
            **REQUIRED FIELDS (all must be present):**
            1. daily_trainings: Array of exactly 7 DailyTraining objects (one per day)
               Each DailyTraining fields:
               • day_of_week: String ("Monday", "Tuesday", etc.)
               • is_rest_day: Boolean (true if no exercises/sessions, false otherwise)
               • training_type: String ("strength", "endurance", "mixed", "rest")
               • strength_exercises: Array of StrengthExercise objects (empty [] if no strength training)
                 Each StrengthExercise must include execution_order (1, 2, 3...) for ordering within the day
               • endurance_sessions: Array of EnduranceSession objects (empty [] if no endurance)
                 Each EnduranceSession must include execution_order (1, 2, 3...) for ordering within the day
               • justification: String (explain this day's training purpose, MAX 15 words)
               • CRITICAL: execution_order must be sequential across ALL exercises and sessions on a day (e.g., if 2 strength exercises, endurance sessions should start at 3)
            
            2. justification: String (MAX 40 words) - Explain the specific changes made to this week based on feedback
            
            3. ai_message: String (REQUIRED) - Warm message acknowledging feedback and specific changes made (1-3 short items, 2-3 sentences, 2-3 emojis)
               • If adjustments were made: Explain what changed and why
               • If no adjustments were made: Explain why (e.g., feedback conflicts with constraints, plan already aligns with request, etc.)
            
            **CRITICAL:** You MUST return ALL three required fields: daily_trainings (7 days), justification (week changes), ai_message (feedback acknowledgment)
            
            Example ai_message (with changes): "🔁 I applied your feedback — swapped Monday's bench for push-ups and lowered Wednesday's volume. We'll run this week and adjust again next week if needed. Take a look and tell me what you think! 💪✨"
            Example ai_message (no changes): "Thanks for the feedback! After reviewing your request alongside your constraints and current plan, I kept everything as is because [reason]. If you'd like to explore alternatives, let me know! 💪"
            """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("update_weekly_schedule_prompt", prompt)
        
        return prompt
    
    @staticmethod
    def create_new_weekly_schedule_prompt(
        personal_info: PersonalInfo,
        completed_weeks_context: str,
        progress_summary: str,
        metadata_options: Dict[str, List[str]] = None,
        playbook_lessons: List = None,
    ) -> str:
        """
        Generate prompt for creating a new week when previous week is completed.
        
        This creates the NEXT week (Week 2, 3, 4, etc.) based on:
        - Previous weeks' training history
        - User progress and adaptations
        - Playbook lessons learned from training
        
        We re-assess by week and adjust - this creates ONLY the next week.
        """
        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook_lessons, personal_info, context="training"
        )
        
        metadata_section = PromptGenerator._format_exercise_metadata_section(metadata_options)
        
        progress_context_section = f"""
        **COMPLETED WEEKS CONTEXT:**
        {completed_weeks_context}
        
        **USER PROGRESS SUMMARY:**
        {progress_summary}
        
        **IMPORTANT:** Use this context to:
        • Progressively adjust volume/intensity based on what they've completed
        • Incorporate lessons learned from their training history (playbook)
        • Maintain consistency while introducing appropriate variation
        • Respect their constraints and preferences (from playbook)
        """
        
        ai_message_section = f"""
        **AI MESSAGE GENERATION (new week):**
             Generate a warm, encouraging message that:
        • Celebrates their progress completing the previous week
        • Explains what's new/different in this week (progression, variation, etc.)
        • Keeps them motivated and engaged
             • Stays concise (2–3 sentences) with 2–3 relevant emojis; tone: enthusiastic, supportive, professional

        Example ai_message (new week): "📈 Great work completing Week 1! Here's Week 2 with slightly increased volume and some exercise variations to keep you progressing. Keep up the excellent work! 💪✨"
            """

        prompt = f"""
            Create the NEXT week training schedule for {personal_info.username} after they completed previous week(s).

            **CRITICAL - APP SCOPE:**
            This app creates SUPPLEMENTAL training programs (strength & conditioning).
            • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
            • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
            • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
            
            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {playbook_context}

            {metadata_section}

            {progress_context_section}

            **PROGRESSION RULES:**
            • Progressively increase volume/intensity based on completed weeks
            • Introduce appropriate exercise variations to prevent plateaus
            • Maintain consistency with previous weeks while adding progressive challenge
            • Apply ALL playbook lessons learned from training history
            • Respect constraints and preferences established in previous weeks

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(personal_info)}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

             **CRITICAL REQUIREMENTS:**
             ✓ Match {personal_info.experience_level} complexity
             ✓ Align with "{personal_info.goal_description}" (primary driver)
             ✓ Apply goal-appropriate periodization
             ✓ Apply ALL playbook lessons (if provided - these are proven constraints and preferences from training history)
             ✓ Stay concise
             
            {PromptGenerator._get_supplemental_training_scheduling()}
             
            {ai_message_section}

            Return: WeeklySchedule schema format ONLY (with exactly 7 daily_trainings, progressed from previous week).
            Do NOT include TrainingPlan fields (title, summary, justification) - only return the WeeklySchedule.
         """

        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("create_new_weekly_schedule_prompt", prompt)

        return prompt
    
    @staticmethod
    def generate_training_plan_prompt(
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
        metadata_options: Dict[str, List[str]] = None,
        playbook_lessons: List = None,
        feedback_message: str = None,
        current_plan_summary: str = None,
        conversation_history: str = None,
    ) -> str:
        """
        DEPRECATED: Use generate_initial_weekly_schedule_prompt instead.
        Kept for backward compatibility - delegates to new function.
        """
        # Legacy support: if feedback_message provided, it's a regeneration (should use update_weekly_schedule_prompt)
        # For now, delegate to initial generation prompt for backward compatibility
        return PromptGenerator.generate_initial_weekly_schedule_prompt(
            personal_info=personal_info,
            formatted_initial_responses=formatted_initial_responses,
            formatted_follow_up_responses=formatted_follow_up_responses,
            metadata_options=metadata_options,
            playbook_lessons=playbook_lessons,
        )

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
    def _get_modality_instructions(personal_info: PersonalInfo = None) -> str:
        """Shared section with modality-specific instructions (STRENGTH, ENDURANCE, MIXED, REST)."""
        # Get weight unit - use from personal_info if provided, otherwise generic instruction
        weight_unit_text = personal_info.weight_unit if personal_info else "kg or lbs"
        
        return f"""
            **MODALITY-SPECIFIC INSTRUCTIONS:**
            
            **STRENGTH days:** provide exercises with sets, reps, weight, execution_order
            • For each strength exercise, provide:
              - exercise_name: Descriptive name WITHOUT equipment (e.g., "Chest Press", "Lateral Raise", "Farmer Carry")
              - main_muscle: Choose from the EXACT values in the AVAILABLE MAIN MUSCLE OPTIONS list provided above
              - equipment: Choose from the EXACT values in the AVAILABLE EQUIPMENT OPTIONS list provided above
              - sets, reps, weight: Training parameters (weight is actual weight in {weight_unit_text}, not percentage)
              - execution_order: Integer (1, 2, 3, etc.) - The order to perform this exercise within the day's training (1 = first, 2 = second, etc.)
            
            **WEIGHT GENERATION GUIDELINES:**
            • Extract benchmark lifts from assessment responses (if provided) - look for 1RM values for squat, bench press, deadlift, overhead press
            • Use benchmark lifts to assess the user's overall strength level (strength-to-body-weight ratios, relative strength capacity)
            • For exercises that match known benchmarks (e.g., user provided bench press 1RM, and plan includes bench press), calculate weights directly based on rep ranges:
              - 3-5 reps: 80-85% of 1RM
              - 6-8 reps: 75-80% of 1RM
              - 9-12 reps: 70-75% of 1RM
              - 12+ reps: 65-70% of 1RM
            • For all other exercises, use the benchmark-derived strength assessment to estimate appropriate weights relative to their strength level (e.g., if bench press is strong, upper body exercises should reflect that; if squat/deadlift are strong, lower body should reflect that)
            • If no benchmarks provided, estimate weights based on user's body weight, age, gender, experience level, and goal from their profile
            • Conservative estimates for beginners, progressive for experienced users
            • Select movements for goal, equipment, experience
            • Balance movement patterns (push/pull, upper/lower, etc.)
            • DO NOT set exercise_id (will be matched automatically)
            • CRITICAL: Equipment type should ONLY be in the equipment field, NOT in exercise_name
            
            **ENDURANCE days:** Sessions with name, description (MAX 15 words), sport_type, training_volume, unit, execution_order, heart_rate_zone
            • sport_type MUST be EXACTLY one of these values (case-sensitive): 
              running | cycling | swimming | rowing | hiking | walking | elliptical | stair_climbing | jump_rope | other
            • unit MUST be EXACTLY one of these values (case-sensitive):
              minutes | km | miles | meters
            • execution_order: Integer (1, 2, 3, etc.) - The order to perform this session within the day's training (1 = first, 2 = second, etc.)
            • heart_rate_zone: Integer (REQUIRED, 1-5) - Target heart rate zone for this session
              - Zone 1: Very Easy (50-60% max HR) - Recovery/warm-up
              - Zone 2: Easy (60-70% max HR) - Aerobic base building
              - Zone 3: Moderate (70-80% max HR) - Aerobic endurance
              - Zone 4: Hard (80-90% max HR) - Threshold/tempo
              - Zone 5: Very Hard (90-100% max HR) - Maximum effort/intervals
            • Vary session types (easy, tempo, intervals, recovery)
            • Interval sessions can be created by making several endurance sessions with different tempo's / heart rate zones
            • Choose sport_type based on user's goal, equipment, and preferences
            • Examples: {{"sport_type": "running", "unit": "km"}} or {{"sport_type": "cycling", "unit": "minutes"}}
            
            **MIXED days:** strength exercises + endurance session(s)
            • Balance modalities to avoid interference
            • Consider recovery demands
            • Use execution_order to sequence training: strength exercises first (typically 1, 2, 3...), then endurance sessions (continue numbering)
            • Example: Bench Press (1), Cable Fly (2), Long Run (3) - strength first, then endurance
            
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
    def format_current_plan_summary(current_plan: Dict[str, Any]) -> str:
        """
        Create a nicely formatted summary of the current training plan for context in prompts.
        
        Used for regenerations to give AI context about the existing plan structure.
        Includes exercise details like sets, reps, equipment, and endurance session info.
        
        Args:
            current_plan: Current training plan dictionary
            
        Returns:
            Formatted plan summary string
        """
        try:
            weekly_schedules = current_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                return "Empty plan - no weekly schedules found."
            
            week = weekly_schedules[0]
            daily_trainings = week.get("daily_trainings", [])
            
            if not daily_trainings:
                return "Plan structure exists but no daily trainings found."
            
            summary_lines = []
            summary_lines.append("Current Training Plan Structure:\n")
            
            for day in daily_trainings:
                day_name = day.get("day_of_week", "Unknown")
                training_type = day.get("training_type", "unknown").lower()
                is_rest = day.get("is_rest_day", False)
                
                if is_rest or training_type == "rest":
                    summary_lines.append(f"📅 {day_name}: REST DAY")
                    continue
                
                # Build day header
                day_header = f"📅 {day_name}: {training_type.upper()}"
                summary_lines.append(day_header)
                
                # Strength exercises
                strength_exercises = day.get("strength_exercises", [])
                if strength_exercises:
                    for idx, ex in enumerate(strength_exercises, 1):
                        ex_name = ex.get("exercise_name", "Unknown Exercise")
                        equipment = ex.get("equipment", "Unknown")
                        main_muscle = ex.get("main_muscle", "")
                        
                        # Get sets/reps info
                        sets = ex.get("sets")
                        reps = ex.get("reps", [])
                        
                        # Format reps
                        if isinstance(reps, list) and len(reps) > 0:
                            reps_str = f"{len(reps)} sets: {', '.join(map(str, reps))} reps"
                        elif sets:
                            reps_str = f"{sets} set(s)"
                        else:
                            reps_str = "sets/reps not specified"
                        
                        # Format exercise line
                        muscle_info = f" ({main_muscle})" if main_muscle else ""
                        summary_lines.append(f"  💪 {idx}. {ex_name}{muscle_info} - {equipment} | {reps_str}")
                
                # Endurance sessions
                endurance_sessions = day.get("endurance_sessions", [])
                if endurance_sessions:
                    for idx, session in enumerate(endurance_sessions, 1):
                        session_name = session.get("name", "Endurance Session")
                        sport_type = session.get("sport_type", "")
                        training_volume = session.get("training_volume")
                        unit = session.get("unit", "")
                        
                        # Format volume
                        if training_volume and unit:
                            volume_str = f"{training_volume} {unit}"
                        else:
                            volume_str = "volume not specified"
                        
                        sport_info = f" - {sport_type}" if sport_type else ""
                        summary_lines.append(f"  🏃 {idx}. {session_name}{sport_info} | {volume_str}")
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            return f"Error summarizing plan: {str(e)}"
    
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
        conversation_context: str,
        training_plan: Dict[str, Any] = None
    ) -> str:
        """
        Generate lightweight prompt for STAGE 1: Intent classification only (no operations).
        
        Fast and efficient - uses feedback, conversation history, and current training plan.
        Includes plan summary so AI can answer questions about the plan.
        """
        # Format training plan summary if provided
        plan_summary = ""
        if training_plan:
            plan_summary = PromptGenerator.format_current_plan_summary(training_plan)
        
        plan_section = ""
        if plan_summary:
            plan_section = f"""
        **CURRENT TRAINING PLAN (for context):**
        {plan_summary}
        
        """
        
        return f"""
        **YOUR ROLE:**
        You are an Expert Training Coach and a helpful, supportive assistant who has just created a personalized training plan for your user. 
        Your primary goal is to be genuinely helpful—understanding what they need, answering their questions, making adjustments when requested, and guiding them confidently toward their fitness goals. 
        You're not just classifying intent—you're having a conversation with someone who trusts you to help them succeed.
        
        **SETTING THE SCENE:**
        You recently created their training plan based on an in-depth assessment (initial questions about their goals, experience, and preferences, followed by targeted follow-up questions). 
        The plan is now ready for their review, and they're sharing their thoughts, questions, or feedback.
        
        {plan_section}**CONVERSATION HISTORY:**
        {conversation_context}
        
        **USER'S CURRENT FEEDBACK:**
        "{feedback_message}"
        
        ═══════════════════════════════════════════════════════════════════════════════
        CLASSIFY THEIR INTENT - UNDERSTAND WHAT THEY REALLY NEED
        ═══════════════════════════════════════════════════════════════════════════════
        
        Your job is to understand the user's intent and respond appropriately. Think like a helpful coach: 
        Are they asking a question? Do they need clarification? Do they want changes? Are they ready to go? Classify into ONE of these five intents:
        
        **1. question** - They're asking a clear question you can answer
           They want information, explanation, or guidance about the plan.
           Examples: 
           - "Can I do this at home?"
           - "What equipment do I need?"
           - "Why running on Tuesday?"
           - "How many rest days?"
           - "Is this good for beginners?"
           
           → **Your response**: Answer their question directly with helpful, clear information. Be supportive and encouraging. 
           If they're asking about something that could be adjusted, mention that you can help modify it if needed.
           
        **2. unclear** - Their feedback is vague and you genuinely need more information
           They mentioned wanting a change but didn't specify what exactly needs to change.
           Examples:
           - "Change it" (change what?)
           - "Different" (different how?)
           - "Too hard" (which day? which exercise?)
           - "Make it better" (better in what way?)
           
           → **Your response**: Ask ONE (ONLY IF REALLY NEEDED AND NO ASSUMPTIONS CAN BE MADE) specific, helpful follow-up question to clarify. Be efficient—don't ask multiple questions. 
           Make reasonable assumptions when possible (e.g., if they say "too hard" and you know their experience level, suggest adjustments rather than asking for clarification). 
           The goal is to help them quickly, not create back-and-forth.
           
           ⚠️ **Use this SPARINGLY**: Prefer making reasonable assumptions over asking questions. Only use "unclear" when you genuinely cannot make a reasonable assumption.
           
        **3. update_request** - They want specific changes to the plan
           They've identified exactly what they want to change (specific day, exercise, intensity, etc.).
           Examples:
           - "Replace bench press with push-ups"
           - "Make Monday easier"
           - "Move Wednesday to Friday"
           - "Add more cardio"
           - "Remove leg day"
           - "Increase weights on chest day"
           
           → **Your response**: Acknowledge their request warmly and let them know you'll make the changes. Be enthusiastic and supportive. 
           After you classify this, the system will parse the specific operations and update their plan accordingly.
           
        **4. satisfied** - They're happy with the plan and ready to start
           They've reviewed the plan and are expressing approval or readiness to begin.
           Examples:
           - "Looks great!"
           - "Let's go!"
           - "Perfect, thanks!"
           - "I'm ready!"
           - "This looks good"
           - "Let's do this!"
           
           → **Your response**: Celebrate with them! Express enthusiasm and encouragement. This will trigger navigation to their main dashboard where they can start their training journey.
           
        **5. other** - Their message is off-topic or unrelated to the training plan
           They're asking about something completely unrelated to their training plan.
           Examples:
           - "What's the weather?"
           - "Tell me a joke"
           - General small talk unrelated to fitness
           
           → **Your response**: Politely redirect them back to the training plan topic. Be friendly and remind them you're here to help with their training plan.
        
        **IMPORTANT DISTINCTIONS (Be a Helpful Assistant):**
        Think like a helpful coach who wants to minimize back-and-forth while ensuring the user gets exactly what they need:
        
        - "This is too hard" → **unclear** (you need to know: which day? which exercise?)
        - "Monday is too hard" → **update_request** (specific day identified—you can help!)
        - "Bench press is too hard" → **update_request** (specific exercise identified—you can adjust!)
        - "Can I do this without weights?" → **question** (they want information)
        - "What if I can't do this on Tuesdays?" → **question** (they're asking about scheduling)
        - "Replace bench press with push-ups" → **update_request** (clear change request)
        
        ═══════════════════════════════════════════════════════════════════════════════
        YOUR OUTPUT (FeedbackIntentClassification schema)
        ═══════════════════════════════════════════════════════════════════════════════
        
        Your response will be automatically structured with these fields:
        - **intent**: "question" | "unclear" | "update_request" | "satisfied" | "other"
        - **action**: "respond_only" | "update_plan" | "navigate_to_main_app"
        - **confidence**: 0.0-1.0 (how confident you are in your classification)
        - **needs_plan_update**: true | false (does their request require changing the plan?)
        - **navigate_to_main_app**: true | false (should they proceed to start training?)
        - **reasoning**: Brief explanation of why you classified it this way
        - **ai_message**: Your actual response to the user (this is what they'll see)
        
        **GUIDELINES FOR YOUR AI_MESSAGE (Your Response to the User):**
        
        Your `ai_message` is how you actually communicate with the user. This is where you show you're a helpful, supportive coach:
        
        - **For "question" intent**: Answer their question with clear, helpful information. Be encouraging. If relevant, mention you can adjust things if needed. Example: "Great question! Yes, you can do most of these exercises at home. [answer details]... Any other questions, or would you like to adjust anything?"
        
        - **For "unclear" intent**: Ask ONE specific follow-up question to clarify. Be warm and helpful. Example: "I'd love to help make it better! Which day feels too challenging, or is it a specific exercise?"
        
        - **For "update_request" intent**: Acknowledge their request enthusiastically and let them know you'll make the changes. Example: "Perfect! I'll update your plan to [briefly summarize change]. Give me a moment to adjust it..."
        
        - **For "satisfied" intent**: Celebrate with them! Express enthusiasm and encouragement. Example: "Amazing! You're all set to start your fitness journey. I'm excited to see your progress! Let's get you to your dashboard."
        
        - **For "other" intent**: Politely redirect back to the training plan topic. Example: "I'm focused on helping you with your training plan! How does the plan look to you?"
        
        **CRITICAL AI_MESSAGE RULES:**
        
        1. **Be a helpful assistant**: Your tone should be warm, supportive, and genuinely helpful. You're their coach, not a robot.
        
        2. **Address them directly**: Use "you", "your", "I'll" to create a personal connection. Example: "I'll adjust that for you" not "The system will adjust that."
        
        3. **Be conversational**: Write as if you're texting a friend—natural, friendly, but professional.
        
        4. **Stay focused**: Keep everything related to their training plan and fitness goals.
        
        5. **End with engagement**: Almost always end by asking: "Any other changes, or are you ready to start?" or a natural variation like "Anything else you'd like to adjust?" or "Ready to begin your journey?" This keeps the conversation flowing and shows you're available to help.
        
        6. **Maximum 40 words**: Keep it concise but warm. You want to be helpful, not verbose.
        
        7. **Show enthusiasm**: When they're ready or satisfied, match their energy! Celebrate their commitment.
        """

        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_lightweight_intent_classification_prompt", prompt)
        
        return prompt


