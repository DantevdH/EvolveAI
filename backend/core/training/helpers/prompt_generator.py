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
        **ROLE:**
        You are an AI training coach that generates personalized training plans. Your role is to gather structured information about users so the AI system can create tailored training plans that match their constraints, preferences, and goals.
        
        **CONTEXT:**
        This is a mobile fitness app that creates SUPPLEMENTAL training programs (strength & conditioning).
        • ✅ Scope: Strength training, running, cycling, swimming, hiking, and general conditioning
        • ❌ NOT included: Sport-specific drills, technical skill training, or team practice schedules
        • 🎯 For athletes: We create supportive strength/conditioning work to complement existing sport training
        • ⚠️ Important: This is NOT real-life personal coaching—you are an AI assistant that needs structured information to generate effective plans programmatically
        
        **TASK:**
        Generate questions that gather essential information the AI needs to design personalized training plans.
        Questions must be structured, self-contained, and optimized for mobile app interaction (one question at a time).
        
        **INFORMATION TO COLLECT (What to Ask About):**
        Focus ONLY on information that directly affects plan design:
        • **Constraints:** Injuries, equipment access, time availability, existing training commitments, physical limitations
        • **Preferences:** Activities enjoyed/avoided, focus areas, training environments
        • **Schedule:** When they can train, existing commitments, time constraints
        • **Goals:** Specific performance targets, what they want to achieve
        • **Current Abilities:** Baseline fitness levels, known benchmarks, experience with specific activities
        
        **INFORMATION TO AVOID (What NOT to Ask About):**
        The AI system decides these based on user information—don't ask users to make technical decisions:
        • How to structure training (splits, frequency, progression models)
        • What volumes/intensities to prescribe
        • How to periodize the plan
        • Technical coaching decisions
        • Nutrition (not relevant to training plan generation)
        • Position/role in sport (ask about conditioning goals instead)
        
        **KEY PRINCIPLE:**
        Users provide information ABOUT themselves (constraints, preferences, goals, abilities).
        The AI uses this information to DESIGN the training plan (exercises, structure, volume, intensity).
        """

    @staticmethod
    def _get_question_presentation_context() -> str:
        """Get the shared explanation of how questions are presented to users."""
        return """
        **CRITICAL - QUESTION PRESENTATION CONTEXT:**
        • Questions are shown ONE AT A TIME in the mobile app
        • Users can only respond using the format you provide (multiple choice selection, slider value, dropdown choice, rating, etc.)
        • Users CANNOT add additional context, clarification, or follow-up information beyond what the formatted question allows
        • Therefore, each question must be complete, self-contained, and capture all necessary information in a single response
        • Each question stands alone—don't assume users can provide context from previous questions
        """

    @staticmethod
    def format_client_information(personal_info: PersonalInfo) -> str:
        """Format client information for prompts."""
        return f"""
        **USER PROFILE:**
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
                    lesson_context = getattr(lesson, "context", None)
                else:
                    text = lesson.get("text", "")
                    confidence = lesson.get("confidence", 0.5)
                    helpful = lesson.get("helpful_count", 0)
                    lesson_context = lesson.get("context", None)
                
                # Escape curly braces in lesson text to prevent format errors
                safe_text = str(text).replace("{", "{{").replace("}", "}}")

                if context == "outline":
                    content += f"        - {safe_text}\n"
                else:
                    content += f"        - {safe_text} (confidence: {confidence:.0%}, proven {helpful}x)\n"
                
                # Include context if available and not "context not found"
                if lesson_context and lesson_context != "context not found":
                    # Escape curly braces in context too
                    safe_context = str(lesson_context).replace("{", "{{").replace("}", "}}")
                    content += f"\n        📚 **Best Practices Context:**\n        {safe_context}\n"

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
                    lesson_context = getattr(lesson, "context", None)
                else:
                    text = lesson.get("text", "")
                    confidence = lesson.get("confidence", 0.5)
                    harmful = lesson.get("harmful_count", 0)
                    lesson_context = lesson.get("context", None)
                
                # Escape curly braces in lesson text to prevent format errors
                safe_text = str(text).replace("{", "{{").replace("}", "}}")

                if context == "outline":
                    content += f"        - {safe_text}\n"
                else:
                    content += f"        - {safe_text} (confidence: {confidence:.0%}, learned from {harmful} negative outcome(s))\n"
                
                # Include context if available and not "context not found"
                if lesson_context and lesson_context != "context not found":
                    # Escape curly braces in context too
                    safe_context = str(lesson_context).replace("{", "{{").replace("}", "}}")
                    content += f"\n        📚 **Best Practices Context:**\n        {safe_context}\n"

        return header + content + footer

    @staticmethod
    def get_question_generation_instructions() -> str:
        """Get detailed instructions for question type selection and formatting."""
        return """
        **QUESTION TYPE SELECTION GUIDE:**
        
        Choose the question type based on HOW the user should respond and what provides the best user experience.
        Use this decision tree:
        1. How many response options? → 2-4 = MULTIPLE_CHOICE, 5+ = DROPDOWN
        2. Is it numeric? → 6+ distinct values = SLIDER
        3. Is it subjective/rating? → 1-5 scale = RATING
        4. Is it complex narrative? → FREE_TEXT (use sparingly, 1-2 max)
        5. Is it Yes/No with conditional detail? → CONDITIONAL_BOOLEAN (use sparingly, 1-2 max)
        
        **1. MULTIPLE_CHOICE** - 2-4 distinct options (best for quick selections)
        **When to Use:**
        • User picks ONE from short list
        • Clear categories, mutually exclusive choices
        • Best for: Equipment access, training environment, experience level, preferences
        • CRITICAL: Use ONLY when you have 4 or fewer options. If you have 5+ options, use DROPDOWN instead
        
        **Examples:**
        • Question: "What training equipment do you have access to?"
          Options: Body Weight Only, Dumbbells, Full Gym Access, Resistance Bands (4 options) ✅
        • Question: "Preferred training environment?"
          Options: Home, Gym, Outdoors, Hybrid (4 options) ✅
        • If you have 5+ sports options → Use DROPDOWN instead ❌
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier, e.g., "equipment_access")
        - text: string (question text ending with "?")
        - help_text: string (optional guidance, can be empty string "")
        - response_type: "multiple_choice"
        - options: array of objects [{{"id": "opt1", "text": "Option 1", "value": "opt1"}}, ...]
          * Option text should be maximum 3 words
          * Use clear, mutually exclusive labels
        
        **2. DROPDOWN** - 5+ options (use when list exceeds 4 options)
        **When to Use:**
        • User selects ONE from longer list
        • Many predefined options, single selection
        • Best for: Sports selection, specific equipment types, lists with 5+ options
        • CRITICAL: Use DROPDOWN when you have 5 or more options. MULTIPLE_CHOICE is only for 2-4 options
        
        **Examples:**
        • Question: "What sport do you play?"
          Options: 50+ sports list (use dropdown) ✅
        • Question: If you have 5+ equipment types → Use DROPDOWN instead of multiple choice ✅
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (optional guidance)
        - response_type: "dropdown"
        - options: array of objects [{{"id": "sport1", "text": "Football", "value": "football"}}, ...]
        
        **3. RATING** - Subjective scale with labeled endpoints (up to 5 points)
        **When to Use:**
        • User rates on discrete scale with labeled endpoints
        • Opinions, quality assessments, subjective measures, satisfaction levels
        • Best for: Energy levels, motivation, pain/discomfort ratings, preference intensity
        
        **Examples:**
        • Question: "How would you rate your current energy level?"
          Scale: 1 (Always Tired) to 5 (Highly Energetic) ✅
        • Question: "How motivated are you to start training?"
          Scale: 1 (Not Motivated) to 5 (Very Motivated) ✅
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (optional guidance)
        - response_type: "rating"
        - min_value: number (typically 1)
        - max_value: number (typically 5, max 5 for rating type)
        - min_description: string (label for minimum value, e.g., "Always Tired") - use 1 word (low, poor, etc)
        - max_description: string (label for maximum value, e.g., "Highly Energetic") - use 1 word (high, good, etc)
        
        **4. SLIDER** - Continuous numeric range (6+ distinct values)
        **When to Use:**
        • User selects specific quantity from range using a slider
        • Quantities, measurements, continuous ranges, numeric values
        • Best for: Days per week, hours per session, weight/height, age ranges, distances
        
        **Examples:**
        • Question: "How many days per week can you train?"
          Range: min_value: 1, max_value: 7, step: 1, unit: "days" ✅
        • Question: "How many hours per week can you train?"
          Range: min_value: 2, max_value: 20, step: 0.5, unit: "hours" ✅
        • Question: "How many minutes per session?"
          Range: min_value: 15, max_value: 120, step: 5, unit: "minutes" ✅
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (optional guidance)
        - response_type: "slider"
        - min_value: number (minimum value, e.g., 1)
        - max_value: number (maximum value, e.g., 7)
        - step: number (increment step, e.g., 1, 0.5, 5)
        - unit: string (single string like "days", "hours", "minutes", "kg", "lbs") ⚠️ NOT an array!
        
        ⚠️ CRITICAL: unit must be a SINGLE STRING (e.g., "days", "hours", "kg") NOT an array
        ⚠️ DO NOT include: max_length, placeholder (those are for FREE_TEXT, not SLIDER)
        
        **5. FREE_TEXT** - Open-ended description (USE SPARINGLY - 1-2 max per assessment)
        **When to Use:**
        • Complex context requiring narrative explanation, detailed descriptions
        • Best for: Injury descriptions, specific goals in detail, complex constraints
        • Limit: 1-2 per assessment phase (slow to answer, higher cognitive load)
        • Only use when structured format is not possible
        
        **Examples:**
        • Question: "Describe any past injuries or physical limitations that might affect your training?"
          Format: Free text with max_length: 300, placeholder with examples ✅
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (optional guidance)
        - response_type: "free_text"
        - max_length: number (200-500 recommended, e.g., 300)
        - placeholder: string (example text to guide user, e.g., "E.g., lower back pain, knee sensitivity...")
        
        **6. CONDITIONAL_BOOLEAN** - Yes/No with conditional detail (USE SPARINGLY - 1-2 max)
        **When to Use:**
        • "Yes" requires elaboration in text field; "No" skips detail
        • Screening questions where "No" = no further info needed
        • Best for: Existing training commitments, injuries, dietary restrictions
        • Limit: 1-2 per assessment phase (adds complexity)
        
        **Examples:**
        • Question: "Do you already have regular training or practice sessions?"
          Format: Yes (describe in text field) / No (skip detail) ✅
        
        **REQUIRED FIELDS:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (guidance on what to include if Yes, e.g., "For example: team practices, club sessions, scheduled classes")
        - response_type: "conditional_boolean"
        - max_length: number (200-500 recommended, e.g., 300)
        - placeholder: string (example text for Yes response, e.g., "E.g., football practice Mon/Wed/Fri 2 hours + game Saturday...")
        
        **UX OPTIMIZATION RULES:**
        ✓ Prefer structured types (1-4) - faster, easier to answer, mobile-friendly
        ✓ Limit open formats (5-6) to 1-2 max per assessment (20-30% of total questions)
        ✓ Use CONDITIONAL_BOOLEAN instead of FREE_TEXT when a Yes/No filter is useful
        ✓ Make options clear, mutually exclusive, and easy to understand
        ✓ Use appropriate ranges for sliders (not too wide, reasonable steps)
        ✓ Write concise but helpful help_text (1-2 sentences max)
        
        **FORMATTING RULES:**
        ✓ CRITICAL: ALL question texts MUST end with a question mark (?)
        ✓ Questions should be properly formatted as interrogative sentences
        ✓ Generate unique, descriptive IDs (use snake_case, e.g., "equipment_access", "training_frequency")
        ✓ Examples:
          * ✅ "What training equipment do you have access to?" (proper question format)
          * ❌ "Training equipment access" (not a question, missing question mark)
        
        **FIELD REQUIREMENTS SUMMARY:**
        
        **ALL QUESTION TYPES require:**
        - id: string (unique identifier)
        - text: string (question text ending with "?")
        - help_text: string (can be empty string "")
        - response_type: string (one of the 6 types above)
        - order: int (display order, 1-based)
        
        **Type-specific required fields:**
        - MULTIPLE_CHOICE/DROPDOWN: options[] (array of {{id, text, value}})
        - RATING: min_value, max_value, min_description, max_description
        - SLIDER: min_value, max_value, step, unit (STRING, not array!)
        - FREE_TEXT/CONDITIONAL_BOOLEAN: max_length, placeholder
        
        **CRITICAL - Data Type Rules:**
        ⚠️ ALL fields must be the correct type:
        • Numeric fields: numbers (not strings) - e.g., 1, 7, 0.5, 300
        • String fields: single strings (NOT arrays!) - e.g., "days", "hours", "kg"
        • Array fields: arrays of objects - e.g., [{{"id": "opt1", "text": "Option 1", "value": "opt1"}}]
        
        **COMMON ERRORS TO AVOID:**
        ❌ WRONG: Slider with max_length and placeholder (those are FREE_TEXT fields!)
        ❌ WRONG: unit as array ["days"] (must be string "days")
        ❌ WRONG: min_value as string "1" (must be number 1)
        ❌ WRONG: Question text without question mark "What equipment do you have"
        ✓ CORRECT: Slider with min_value: 1, max_value: 7, step: 1, unit: "days"
        ✓ CORRECT: Question text "What equipment do you have access to?"
        """

    @staticmethod
    def generate_initial_training_plan_prompt(
        personal_info: PersonalInfo,
        user_playbook,
    ) -> str:
        """
        Generate prompt for creating the FIRST week (Week 1) during onboarding.
        
        This is used only once when the user completes onboarding.
        We re-assess by week and adjust - this creates ONLY Week 1.
        
        Uses user_playbook (extracted from onboarding responses) instead of raw assessment responses.
        Equipment and main_muscle constraints are enforced via Pydantic Enum validation
        in the schema (MainMuscleEnum and EquipmentEnum), not in the prompt.
        
        Args:
            personal_info: User's personal information and goals
            user_playbook: User's playbook with learned lessons from onboarding (instead of raw responses)
        """
        
        prompt = f"""
            **YOUR ROLE:**
            You are an Expert Training Coach who just completed a personalized assessment with {personal_info.username}.
            You gathered information in two phases and now need to create their Week 1 training plan.
            Remember: This is Week 1 only. We re-assess and adjust weekly based on their progress.
            
            **RULES & SCOPE:**
            • Respect CONSTRAINTS: equipment access, time availability, injuries, existing commitments
            • You decide HOW to train (structure, periodization, programming)
            • Only prescribe exercises matching available equipment
            • ✅ Provide: Strength training, running, cycling, swimming, hiking, general conditioning
            • ❌ Do NOT provide: Sport-specific drills, technical skill training, team practice schedules
            • 🎯 For athletes: Create supportive strength/conditioning to complement existing sport training
            • Work with what you know rather than making assumptions

            {PromptGenerator._get_exercise_metadata_requirements()}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(personal_info)}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

            {PromptGenerator._get_supplemental_training_scheduling()}

            **OUTPUT FORMAT & GUIDANCE:**
            • Schema enforces: title (required), summary (required), justification (required), weekly_schedules (exactly 1 with week_number: 1, exactly 7 daily_trainings), ai_message (optional)
            • All field types, required fields, and enum values are enforced by the schema.
            • ai_message: Warm message celebrating plan completion, explaining week-by-week approach (2-3 sentences, 2-3 emojis)
              Example: "🎉 Amazing! I've created your personalized Week 1 plan! We work week-by-week so we can track your progress and adapt as you grow stronger. Take a look — excited to hear your thoughts! 💪✨"
            
            ═══════════════════════════════════════════════════════════════════════════════
            USER-SPECIFIC CONTEXT (CRITICAL - APPLY THESE CONSTRAINTS)
            ═══════════════════════════════════════════════════════════════════════════════
            
            **CLIENT PROFILE:**
            {PromptGenerator.format_client_information(personal_info)}
            
            **USER PLAYBOOK (LEARNED LESSONS - CRITICAL CONSTRAINTS):**
            {PromptGenerator.format_playbook_lessons(user_playbook, personal_info, context="outline")}
            
            ═══════════════════════════════════════════════════════════════════════════════
            YOUR TASK
            ═══════════════════════════════════════════════════════════════════════════════
            
            Design Week 1 training schedule using the user context above:
            • Constraints and preferences from the user playbook (equipment, time, injuries, preferences, etc.)
            • Goal: "{personal_info.goal_description}"
            • Experience: {personal_info.experience_level}
            • Your coaching expertise (structure, volume, intensity, exercise selection)
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
        user_playbook,
        conversation_history: str = None,
    ) -> str:
        """
        Generate prompt for updating an existing week based on user feedback.
        
        This updates ONLY the specified week - we re-assess by week and adjust.
        Uses user_playbook instead of onboarding responses.
        
        Equipment and main_muscle constraints are enforced via Pydantic Enum validation
        in the schema (MainMuscleEnum and EquipmentEnum), not in the prompt.
        
        Args:
            personal_info: User's personal information and goals
            feedback_message: User's feedback message requesting week changes
            week_number: Week number to update
            current_week_summary: Summary of current week structure
            user_playbook: User's playbook with learned lessons (instead of onboarding responses)
            conversation_history: Optional conversation history for context
        """

        current_week_section = ""
        if current_week_summary:
            current_week_section = f"""
            **TO BE UP TRAINING WEEK {week_number}:**
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
            The user now has feedback on Week {week_number} - apply their feedback while respecting constraints.
            
            **WHAT YOU'VE COMPLETED:**
            1. Learned about the user through onboarding and interactions
            2. Designed Week {week_number} training plan based on user preferences and constraints
            3. Continuously learned from user feedback (stored in user playbook)
            
            **CRITICAL UPDATE RULES:**
            • **Structural changes** (e.g., "restructure into PPL", "change to upper/lower split", "Monday ONLY chest", "make it 3 days per week"): 
              When feedback requests a structural change, you MUST completely rebuild the week according to the requested structure. 
              Do NOT preserve the old structure - replace it entirely with the new structure while respecting constraints (equipment, injuries, rest days).
            • **Minor adjustments** (e.g., "remove bench press", "swap this exercise", "increase weight", "add more running"): 
              Make targeted changes while preserving the existing structure where appropriate.
            • Address the feedback above, but you can make adjustments beyond what's explicitly mentioned if needed to align with constraints from the user playbook
            • Respect ALL constraints from the user playbook: equipment access, time availability, injuries, existing commitments, preferences
            • If feedback conflicts with constraints, use your judgment to propose the best alternative that honors both
            • Maintain alignment with goal: "{personal_info.goal_description}" and experience: {personal_info.experience_level}
            • Schema enforces: exactly 7 days (Monday-Sunday), logical day ordering
            • Only prescribe exercises matching their available equipment from the user playbook
            
            **RULES & SCOPE:**
            • Respect CONSTRAINTS: equipment access, time availability, injuries, existing commitments
            • ✅ Provide: Strength training, running, cycling, swimming, hiking, general conditioning
            • ❌ Do NOT provide: Sport-specific drills, technical skill training, team practice schedules
            • 🎯 For athletes: Create supportive strength/conditioning to complement existing sport training

            {PromptGenerator._get_exercise_metadata_requirements()}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(personal_info)}
             
            {PromptGenerator._get_justification_requirements()}

            {PromptGenerator._get_training_principles()}

            {PromptGenerator._get_supplemental_training_scheduling()}

            **OUTPUT FORMAT & GUIDANCE:**
            • Schema enforces: daily_trainings (exactly 7 days with Literal day names), justification (required), ai_message (required)
            • All field types, required fields, and enum values are enforced by the schema.
            • execution_order must be sequential across ALL exercises and sessions on a day (e.g., if 2 strength exercises, endurance sessions should start at 3)
            • ai_message: Warm message acknowledging feedback (1-3 short items, 2-3 sentences, 2-3 emojis)
              - If adjustments were made: Explain what changed and why
              - If no adjustments were made: Explain why (e.g., feedback conflicts with constraints, plan already aligns with request, etc.)
            • Example ai_message (with changes): "🔁 I applied your feedback — swapped Monday's bench for push-ups and lowered Wednesday's volume. We'll run this week and adjust again next week if needed. Take a look and tell me what you think! 💪✨"
            • Example ai_message (no changes): "Thanks for the feedback! After reviewing your request alongside your constraints and current plan, I kept everything as is because [reason]. If you'd like to explore alternatives, let me know! 💪"
            
            {current_week_section}

            ═══════════════════════════════════════════════════════════════════════════════
            USER-SPECIFIC CONTEXT (CRITICAL - APPLY THESE CONSTRAINTS)
            ═══════════════════════════════════════════════════════════════════════════════
            
            **CLIENT PROFILE:**
            {PromptGenerator.format_client_information(personal_info)}
            
            **USER PLAYBOOK (LEARNED LESSONS - CRITICAL CONSTRAINTS):**
            {PromptGenerator.format_playbook_lessons(user_playbook, personal_info, context="training")}
            
            {conversation_section}
            
            **USER FEEDBACK ON WEEK {week_number}:**
            {feedback_message}
            
            ═══════════════════════════════════════════════════════════════════════════════
            YOUR TASK
            ═══════════════════════════════════════════════════════════════════════════════
            
            Adjust Week {week_number} based on the user's feedback above while respecting:
            1. Constraints and preferences from the user playbook (equipment, time, injuries, preferences)
            2. Prior changes documented in conversation history
            3. Your expertise as a training coach
            
            **IMPORTANT:** The user's feedback takes priority. If their feedback conflicts with constraints from the user playbook, prioritize the user's explicit request and adjust accordingly.
            """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("update_weekly_schedule_prompt", prompt)
        
        return prompt
    
    @staticmethod
    def create_new_weekly_schedule_prompt(
        personal_info: PersonalInfo,
        completed_weeks_context: str,
        progress_summary: str,
        playbook_lessons: List = None,
    ) -> str:
        """
        Generate prompt for creating a new week when previous week is completed.
        
        This creates the NEXT week (Week 2, 3, 4, etc.) based on:
        - Previous weeks' training history
        - User progress and adaptations
        - Playbook lessons learned from training
        
        We re-assess by week and adjust - this creates ONLY the next week.
        
        Equipment and main_muscle constraints are enforced via Pydantic Enum validation
        in the schema (MainMuscleEnum and EquipmentEnum), not in the prompt.
        """
        playbook_context = PromptGenerator.format_playbook_lessons(
            playbook_lessons, personal_info, context="training"
        )
        
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
            • ai_message: Generate a warm, encouraging message that:
              - Celebrates their progress completing the previous week
              - Explains what's new/different in this week (progression, variation, etc.)
              - Keeps them motivated and engaged
              - Stays concise (2–3 sentences) with 2–3 relevant emojis; tone: enthusiastic, supportive, professional
              - Example: "📈 Great work completing Week 1! Here's Week 2 with slightly increased volume and some exercise variations to keep you progressing. Keep up the excellent work! 💪✨"
            """

        prompt = f"""
            Create the NEXT week training schedule for {personal_info.username} after they completed previous week(s).

            **CRITICAL - APP SCOPE:**
            This app creates SUPPLEMENTAL training programs (strength & conditioning).
            • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
            • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
            • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training

            **PROGRESSION RULES:**
            • Progressively increase volume/intensity based on completed weeks
            • Introduce appropriate exercise variations to prevent plateaus
            • Maintain consistency with previous weeks while adding progressive challenge
            • Apply ALL playbook lessons learned from training history
            • Respect constraints and preferences established in previous weeks

            {PromptGenerator._get_exercise_metadata_requirements()}

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
             
            **OUTPUT FORMAT & GUIDANCE:**
            • Return: WeeklySchedule schema format ONLY (with exactly 7 daily_trainings, progressed from previous week)
            • Do NOT include TrainingPlan fields (title, summary, justification) - only return the WeeklySchedule
            {ai_message_section}
            
            ═══════════════════════════════════════════════════════════════════════════════
            USER-SPECIFIC CONTEXT (CRITICAL - APPLY THESE CONSTRAINTS)
            ═══════════════════════════════════════════════════════════════════════════════
            
            **GOAL:** {personal_info.goal_description}
            **LEVEL:** {personal_info.experience_level}

            {playbook_context}

            {progress_context_section}
            
            ═══════════════════════════════════════════════════════════════════════════════
            YOUR TASK
            ═══════════════════════════════════════════════════════════════════════════════
            
            Create the next week training schedule using the user context above:
            • Apply ALL playbook lessons (proven constraints and preferences from training history)
            • Progress from previous weeks (adjust volume/intensity based on completed weeks)
            • Maintain consistency while introducing appropriate variation
            • Respect all constraints and preferences established in previous weeks
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
            • Schema enforces: weekly_schedules array with exactly 1 WeeklySchedule (week_number: 1)
            • Schema enforces: daily_trainings array with exactly 7 days in Literal order (Monday-Sunday)
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
            • exercise_name: Descriptive name WITHOUT equipment type (e.g., "Chest Press", "Lateral Raise")
            • sets, reps, weight: Training parameters (weight is actual weight in {weight_unit_text}, not percentage)
            • Schema enforces: main_muscle and equipment must be valid Enum values, execution_order is required
            
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
            • Schema enforces: sport_type and unit must be valid Enum values, heart_rate_zone is required (1-5), execution_order is required
            • Heart rate zones:
              - Zone 1: Very Easy (50-60% max HR) - Recovery/warm-up
              - Zone 2: Easy (60-70% max HR) - Aerobic base building
              - Zone 3: Moderate (70-80% max HR) - Aerobic endurance
              - Zone 4: Hard (80-90% max HR) - Threshold/tempo
              - Zone 5: Very Hard (90-100% max HR) - Maximum effort/intervals
            • Vary session types (easy, tempo, intervals, recovery)
            • Interval sessions can be created by making several endurance sessions with different heart rate zones
            • Choose sport_type based on user's goal, equipment, and preferences
            
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
    def _get_exercise_metadata_requirements() -> str:
        """
        Get the exercise metadata requirements section for prompts.
        
        Note: main_muscle, equipment, sport_type, unit are all enforced by Pydantic schema
        (via Literal types for Gemini). Only the exercise_name formatting guidance is needed.
        """
        return """
            **EXERCISE METADATA REQUIREMENTS:**
            
            When creating or modifying STRENGTH exercises:
            • exercise_name: Descriptive name WITHOUT equipment type (e.g., "Bench Press", "Lateral Raise")
              - ✅ CORRECT: "Bench Press", "Lateral Raise", "Back Squat", "Chest Fly"
              - ❌ WRONG: "Barbell Bench Press", "Dumbbell Lateral Raise", "Seated Calf Raise (Machine)"
              - Equipment type is specified separately in the 'equipment' field
            • main_muscle and equipment: Schema validation ensures only valid Enum values are accepted
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
        Create a token-optimized summary using Matrix Schema pattern for context in prompts.
        
        Uses Header-Values JSON format to reduce token usage:
        - Schema defined once at top
        - Data stored as arrays matching schema order
        - Eliminates repeated field names
        
        Args:
            current_plan: Current training plan dictionary
            
        Returns:
            JSON string with Matrix Schema format
        """
        import json
        try:
            weekly_schedules = current_plan.get("weekly_schedules", [])
            if not weekly_schedules:
                return json.dumps({"error": "Empty plan - no weekly schedules found."})
            
            week = weekly_schedules[0]
            daily_trainings = week.get("daily_trainings", [])
            
            if not daily_trainings:
                return json.dumps({"error": "Plan structure exists but no daily trainings found."})
            
            # Define schema once (reused for all exercises)
            exercise_schema = ["order", "id", "name", "equipment", "sets", "weights", "target", "muscles", "movement_pattern"]
            
            plan_data = {
                "schema": exercise_schema,
                "days": {}
            }
            
            for day in daily_trainings:
                day_name = day.get("day_of_week", "Unknown")
                training_type = day.get("training_type", "unknown").lower()
                is_rest = day.get("is_rest_day", False)
                
                if is_rest or training_type == "rest":
                    plan_data["days"][day_name] = {"type": "REST", "exercises": []}
                    continue
                
                # Strength exercises
                strength_exercises = day.get("strength_exercises", [])
                exercises = []
                
                if strength_exercises:
                    for ex in strength_exercises:
                        # Get exercise data
                        ex_name = ex.get("exercise_name", "Unknown Exercise")
                        equipment = ex.get("equipment", "Unknown")
                        target_area = ex.get("target_area", "")
                        main_muscles = ex.get("main_muscles", [])
                        if not main_muscles:
                            # Fallback to main_muscle if main_muscles not available
                            main_muscle = ex.get("main_muscle", "")
                            main_muscles = [main_muscle] if main_muscle else []
                        pattern = ex.get("force", "")  # "force" field from DB represents movement pattern (Push/Pull/Push & Pull)
                        
                        # Exercise details
                        exercise_id = ex.get("exercise_id")
                        if exercise_id:
                            try:
                                exercise_id = int(exercise_id)
                            except (ValueError, TypeError):
                                exercise_id = None
                        else:
                            exercise_id = None
                        
                        execution_order = ex.get("execution_order", 0)
                        try:
                            execution_order = int(execution_order)
                        except (ValueError, TypeError):
                            execution_order = 0
                        
                        # Get sets (reps) and weights (backend format: sets is int, reps/weight are arrays)
                        sets_data = ex.get("sets", 0)
                        reps = ex.get("reps", [])
                        weight = ex.get("weight", [])
                        
                        # Format sets: reps array (matches user's example where "sets" = reps array)
                        if isinstance(reps, list) and len(reps) > 0:
                            sets_array = reps
                        elif sets_data:
                            # If sets is an int but no reps, duplicate it to match expected format
                            sets_array = [sets_data] if isinstance(sets_data, int) else []
                        else:
                            sets_array = []
                        
                        # Format weights: weight array (ensure all weights are numbers)
                        weights_array = []
                        if isinstance(weight, list) and len(weight) > 0:
                            weights_array = [float(w) if w and w > 0 else None for w in weight]
                            weights_array = [w for w in weights_array if w is not None]  # Remove None values
                        elif weight and weight > 0:
                            # Single weight value
                            weights_array = [float(weight)]
                        
                        # Build exercise array matching schema order:
                        # ["order", "id", "name", "equipment", "sets", "weights", "target", "muscles", "pattern"]
                        # Only include fields that have values (omit None to save tokens)
                        exercise_row = []
                        exercise_row.append(execution_order if execution_order > 0 else None)
                        exercise_row.append(exercise_id)
                        exercise_row.append(ex_name)
                        exercise_row.append(equipment)
                        exercise_row.append(sets_array if sets_array else None)
                        exercise_row.append(weights_array if weights_array else None)
                        exercise_row.append(target_area if target_area else None)
                        exercise_row.append(main_muscles if main_muscles else None)
                        exercise_row.append(pattern if pattern else None)
                        
                        exercises.append(exercise_row)
                
                # Endurance sessions (append to exercises array with extended schema if needed)
                endurance_sessions = day.get("endurance_sessions", [])
                if endurance_sessions:
                    for session in endurance_sessions:
                        session_name = session.get("name", "Endurance Session")
                        sport_type = session.get("sport_type", "")
                        training_volume = session.get("training_volume")
                        unit = session.get("unit", "")
                        heart_rate_zone = session.get("heart_rate_zone")
                        execution_order = session.get("execution_order", 0)
                        try:
                            execution_order = int(execution_order)
                        except (ValueError, TypeError):
                            execution_order = 0
                        
                        # Format volume
                        volume_str = f"{training_volume}{unit}" if training_volume and unit else None
                        
                        # Endurance session as exercise row (using same schema, adapting fields)
                        # For endurance: sets=volume, weights=HR zone, target=sport_type
                        endurance_row = [
                            execution_order if execution_order > 0 else None,
                            None,  # No exercise ID for endurance
                            session_name,
                            sport_type if sport_type else None,
                            [volume_str] if volume_str else None,  # Volume in sets position
                            [heart_rate_zone] if heart_rate_zone else None,  # HR zone in weights position
                            None,
                            None,
                            "Endurance"
                        ]
                        exercises.append(endurance_row)
                
                plan_data["days"][day_name] = {
                    "type": training_type.upper(),
                    "exercises": exercises
                }
            
            # Use simple approach: convert to matrix format, then format with JSON
            # The plan_data already has the correct structure, just need proper formatting
            json_str = json.dumps(plan_data, indent=2, separators=(',', ':'), ensure_ascii=False)
            
            # Post-process to match exact format:
            # 1. Remove indentation from root-level keys ("schema" and "days")
            # 2. Keep all other indentation as-is (indent=2 handles it correctly)
            lines = json_str.split('\n')
            formatted_lines = []
            
            for line in lines:
                stripped = line.strip()
                # Remove 2-space indentation from root-level keys
                if stripped.startswith('"schema"') or stripped.startswith('"days"'):
                    if line.startswith('  '):
                        formatted_lines.append(line[2:])
                    else:
                        formatted_lines.append(line)
                else:
                    formatted_lines.append(line)
            
            return '\n'.join(formatted_lines)
            
        except Exception as e:
            return json.dumps({"error": f"Error summarizing plan: {str(e)}"})
    
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

    @staticmethod
    def generate_athlete_type_classification_prompt(goal_description: str) -> str:
        """Generate prompt for Step 1: Athlete Type Classification."""
        prompt = f"""
        **WHO YOU ARE:**
        You are an AI assistant that classifies user training goals to determine which question themes to load.
        
        **YOUR TASK:**
        Classify the user's training focus based on their goal description. This classification determines which athlete-type-specific question themes will be loaded (strength, endurance, or sport-specific themes).
        
        **GOAL DESCRIPTION:**
        "{goal_description}"
        
        **CLASSIFICATION GROUPS:**
        
        1. **Strength Training** - Primary focus on strength, power, muscle building:
           - Powerlifting, bodybuilding, general strength, hypertrophy, muscle gain
           - Weight lifting, strength goals, building muscle mass
           - Focus on lifting weights, increasing strength
           
        2. **Endurance Training** - Primary focus on cardiovascular endurance:
           - Running, cycling, swimming, triathlon, cardio
           - Distance training, endurance goals, aerobic fitness
           - Focus on improving cardiovascular capacity, stamina
           
        3. **Sport Specific** - Training for a specific sport:
           - Football, hockey, basketball, tennis, martial arts, etc.
           - Team sports, individual sports, competitive sports
           - Focus on sport-specific performance and conditioning
        
        **SPECIAL CASES:**
        - **Weight Loss**: Classify based on approach mentioned (strength if weight training, endurance if cardio-focused)
        - **General Fitness**: If unclear, classify based on what seems most relevant (default to strength if truly ambiguous)
        - **Mixed Goals**: Return primary type + secondary types (e.g., "strength" + "endurance" for someone wanting both)
        
        **OUTPUT REQUIREMENTS:**
        - primary_type: One of "strength", "endurance", or "sport_specific"
        - secondary_types: List of additional types (can be empty if single focus)
        - confidence: 0.0-1.0 (how confident you are in this classification)
        
        **EXAMPLES:**
        - "I want to build muscle and get stronger" → primary_type: "strength", secondary_types: [], confidence: 0.95
        - "I want to run a marathon and improve my 5K time" → primary_type: "endurance", secondary_types: [], confidence: 0.9
        - "I play football and want to improve my conditioning" → primary_type: "sport_specific", secondary_types: [], confidence: 0.9
        - "I want to lose weight through strength training and running" → primary_type: "strength", secondary_types: ["endurance"], confidence: 0.85
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_athlete_type_classification_prompt", prompt)
        
        return prompt

    @staticmethod
    def generate_question_content_prompt_initial(
        personal_info: PersonalInfo,
        unified_checklist: List[str],
        athlete_type: Dict[str, Any]
    ) -> str:
        """Generate prompt for Step 3: Question Content Generation (Initial Questions)."""
        primary_type = athlete_type.get("primary_type", "")
        secondary_types = athlete_type.get("secondary_types", [])
        
        athlete_type_desc = primary_type
        if secondary_types:
            athlete_type_desc += f" + {', '.join(secondary_types)}"
        
        checklist_text = "\n".join([f"  - {item}" for item in unified_checklist])
        
        prompt = f"""
        {PromptGenerator.get_question_generation_intro()}
        
        **TASK:**
        Generate personalized question content for initial assessment (Round 1 of 2).
        Create questions that gather essential information needed to generate a tailored training plan.
        
        **CONTEXT:**
        • Workflow: This is the FIRST round of questions. A second round of follow-up questions will clarify and refine after user responses.
        • User Status: {personal_info.username} has provided basic profile information (age, weight, height, goal, experience level).
        • Athlete Type: Primary: {primary_type}{" | Secondary: " + ", ".join(secondary_types) if secondary_types else ""}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        {PromptGenerator._get_question_presentation_context()}
        
        **QUESTION THEMES TO COVER:**
        Generate personalized questions that cover these themes. Each theme represents essential information needed for plan generation:
        
        {checklist_text}
        
        **STEP-BY-STEP APPROACH:**
        
        Step 1: Review Themes
        - Review all themes above
        - Identify which themes are most relevant for this user (age: {personal_info.age}, experience: {personal_info.experience_level}, goal: "{personal_info.goal_description}")
        - Consider combining related themes into single comprehensive questions
        
        Step 2: Generate Question Content
        - Create 7-10 questions total (quality over quantity—better to ask 5 focused questions than 8 irrelevant ones)
        - Each question should cover one or more related themes
        - Ensure questions are self-contained and don't require follow-ups
        
        Step 3: Assign Order
        - Order questions logically: Equipment → Schedule → Goals → Constraints → Preferences
        - Assign order numbers (1, 2, 3, ...) where 1 is the first question
        
        Step 4: Validate
        - Ensure each question is ~20 words, clear, and self-contained
        - Verify all themes are covered
        - Confirm questions don't require follow-ups
        
        **CONSTRAINTS & REQUIREMENTS:**
        
        1. **Question Characteristics**
           - Length: Approximately 20 words per question (clear and concise)
           - Clarity: Direct, easy to understand at a glance, no ambiguity
           - Self-contained: Complete and comprehensive—no follow-up questions needed
           - Examples:
             * ✅ Good: "What training equipment do you have access to?" (9 words, clear, self-contained)
             * ❌ Bad: "Do you have equipment?" (requires follow-up: "What kind?")
             * ❌ Bad: "How many days per week?" (missing context—unclear what it refers to)
             * ✅ Better: "How many days per week can you dedicate to training?" (clear context)
        
        2. **Question Type Strategy**
           - Prefer structured formats: multiple choice (2-4 options), dropdown (5+ options), slider, rating
           - Avoid open-ended (free_text): Maximum 1-2 per assessment, only when absolutely necessary
           - Frame questions for structured responses:
             * "What equipment do you have?" → "What training equipment do you have access to?" (multiple choice, 2-4 options)
             * "Tell me about your schedule" → "How many days per week can you train?" (slider)
             * "What are your goals?" → "What is your primary strength goal?" (multiple choice 2-4, or dropdown if 5+)
           - CRITICAL: MULTIPLE_CHOICE only for 2-4 options. Use DROPDOWN for 5+ options
        
        3. **Personalization**
           - Tailor to user: Age {personal_info.age}, Experience {personal_info.experience_level}, Goal "{personal_info.goal_description}", Type {athlete_type_desc}
           - Adapt complexity: Simpler language for beginners, technical terms for advanced users
           - Be specific: Avoid generic templates, make questions relevant to their situation
        
        4. **Theme Coverage**
           - Cover ALL themes above (they represent essential information)
           - Combine related themes into single comprehensive questions when logical
           - Skip themes only if clearly not applicable to this user
           - Add questions if critical gaps are identified
        
        5. **Question Ordering**
           - Logical flow: Equipment → Schedule → Goals → Constraints → Preferences
           - Group related questions together
           - Assign order numbers (1, 2, 3, ...) where 1 is first
        
        **FEW-SHOT EXAMPLES:**
        
        Example 1: Equipment Question
        Theme: "Current strength levels for key lifts and any known one-rep max values"
        Generated Question: "What training equipment do you have access to?"
        Order: 1
        Note: This question is self-contained, ~9 words, and can be answered with multiple choice (2-4 options)
        
        Example 2: Schedule Question
        Theme: "Training environment preferences including indoor versus outdoor or pool versus open water"
        Generated Question: "How many days per week can you dedicate to training?"
        Order: 2
        Note: This question is self-contained, ~10 words, and can be answered with a slider (1-7 days)
        
        Example 3: Goals Question
        Theme: "Specific strength goals"
        Generated Question: "What is your primary strength training goal?"
        Order: 3
        Note: This question is self-contained, ~8 words, and can be answered with multiple choice (2-4 options) or dropdown (if 5+ goal types)
        
        **OUTPUT FORMAT:**
        Return a list of question content items, each with:
        - question_text: The actual question text (~20 words, clear, self-contained)
        - order: Display order number (1-based, lower numbers appear first)
        
        **VALIDATION CHECKLIST:**
        Before finalizing, ensure:
        ✓ All themes are covered
        ✓ Each question is ~20 words, clear, and self-contained
        ✓ Questions don't require follow-ups
        ✓ Questions are ordered logically (Equipment → Schedule → Goals → Constraints → Preferences)
        ✓ Questions are personalized to this user's profile
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_question_content_prompt_initial", prompt)
        
        return prompt

    @staticmethod
    def generate_question_content_prompt_followup(
        personal_info: PersonalInfo,
        formatted_responses: str,
    ) -> str:
        """Generate prompt for Step 3: Question Content Generation (Follow-Up Questions)."""
        prompt = f"""
        {PromptGenerator.get_question_generation_intro()}
        
        **TASK:**
        Generate personalized question content for follow-up assessment (Round 2 of 2 - FINAL).
        Review the user's initial responses and identify critical gaps that need clarification for plan generation.
        
        **CONTEXT:**
        • Workflow Status: ✅ Initial Assessment Questions (Round 1) - COMPLETED | 🎯 Follow-up Questions (Round 2 of 2) - CURRENT (FINAL)
        • User Status: {personal_info.username} has completed the first round. Generate targeted follow-up questions to fill critical gaps.
        • Goal: Identify missing information that prevents optimal plan generation
        
        {PromptGenerator.format_client_information(personal_info)}
        
        {PromptGenerator._get_question_presentation_context()}
        
        **INITIAL RESPONSES FROM USER:**
        {formatted_responses}
        
        **STEP-BY-STEP APPROACH:**
        
        Step 1: Analyze Initial Responses
        - Carefully review the user's initial responses above
        - Identify critical missing information that affects plan design
        - Focus on gaps in: equipment, schedule, constraints, goals, current abilities
        - Look for areas that need clarification or are incomplete
        - Distinguish between "nice to have" and "critical for plan generation"
        
        Step 2: Determine Question Count
        - Generate 1-7 questions total (fewer is better if info is nearly complete)
        - Better to ask 1 essential question than 7 redundant ones
        - If information is nearly complete, fewer questions are acceptable
        - Only ask about critical gaps that directly affect plan generation
        
        Step 3: Generate Question Content
        - Create self-contained questions that fill specific gaps
        - Each question should address a critical missing piece of information
        - Ensure questions don't repeat already-covered topics
        - Reference specific details from their initial responses to show attentiveness
        
        Step 4: Assign Order
        - Order by priority: Most critical gaps first
        - Group related questions together
        - Assign order numbers (1, 2, 3, ...) where 1 is first
        
        Step 5: Validate
        - Ensure each question is ~20 words, clear, and self-contained
        - Verify questions fill critical gaps (not just "nice to have")
        - Confirm questions don't repeat initial questions
        
        **CONSTRAINTS & REQUIREMENTS:**
        
        1. **Question Generation Strategy**
           - Generate 1-7 questions total (fewer is better if info is nearly complete)
           - Better to ask 1 essential question than 7 redundant ones
           - Focus on filling critical gaps, NOT repeating already-covered topics
           - Each question should address a specific gap that affects plan generation
           - If information is nearly complete, fewer questions are acceptable
           - Do NOT ask about things already covered in initial responses
        
        2. **Question Characteristics**
           - Length: Approximately 20 words per question (clear and concise)
           - Clarity: Direct, easy to understand at a glance, no ambiguity
           - Self-contained: Complete and comprehensive—no follow-up questions needed
           - Examples:
             * ✅ Good: "How many days per week can you train?" (9 words, clear, self-contained)
             * ❌ Bad: "Tell me about your schedule" (too vague, requires follow-up)
             * ✅ Better: "What specific training times work best for your schedule?" (clear, specific)
        
        3. **Question Type Strategy**
           - Prefer structured formats: multiple choice (2-4 options), dropdown (5+ options), slider, rating
           - Avoid open-ended (free_text): Maximum 1-2 per assessment, only when absolutely necessary
           - Frame questions for structured responses (see examples in initial questions prompt)
           - CRITICAL: MULTIPLE_CHOICE only for 2-4 options. Use DROPDOWN for 5+ options
        
        4. **Personalization**
           - Reference specific details from their initial responses to show attentiveness
           - Tailor to user: Age {personal_info.age}, Experience {personal_info.experience_level}, Goal "{personal_info.goal_description}"
           - Adapt complexity: Simpler language for beginners, technical terms for advanced users
           - Make questions specific to their situation and responses
        
        5. **Information Focus**
           - Only ask about information the AI can use to influence the training plan
           - Focus on critical missing information that directly affects plan design
           - Do NOT ask about things already covered in initial responses
        
        6. **Question Ordering**
           - Order by priority: Most critical gaps first
           - Group related questions together
           - Assign order numbers (1, 2, 3, ...) where 1 is first
        
        **FEW-SHOT EXAMPLES:**
        
        Example 1: Gap in Equipment Information
        Initial Response: User selected "Home Gym" but didn't specify equipment types
        Gap: Need to know what equipment is available to design appropriate exercises
        Generated Question: "What equipment is available in your home gym?"
        Order: 1
        Note: This fills a critical gap, is self-contained, and can be answered with multiple choice (2-4 options) or dropdown (if many equipment types)
        
        Example 2: Gap in Schedule Details
        Initial Response: User said "3 days per week" but didn't specify which days
        Gap: Need to know if days are flexible or fixed to optimize plan
        Generated Question: "Are your training days flexible or do you have fixed days each week?"
        Order: 2
        Note: This fills a critical gap, is self-contained, and can be answered with multiple choice (2 options: Flexible/Fixed)
        
        Example 3: Gap in Injury Information
        Initial Response: User mentioned "back issues" but didn't provide details
        Gap: Need specific information to design safe exercises
        Generated Question: "What specific back issues or limitations should the training plan accommodate?"
        Order: 3
        Note: This fills a critical gap, is self-contained, and can be answered with free_text (if complex) or structured format (if can be categorized)
        
        **OUTPUT FORMAT:**
        Return a list of question content items, each with:
        - question_text: The actual question text (~20 words, clear, self-contained)
        - order: Display order number (1-based, lower numbers appear first)
        
        **VALIDATION CHECKLIST:**
        Before finalizing, ensure:
        ✓ Questions fill critical gaps (not just "nice to have")
        ✓ Each question is ~20 words, clear, and self-contained
        ✓ Questions don't require follow-ups
        ✓ Questions don't repeat initial questions
        ✓ Questions are ordered by priority (most critical first)
        ✓ Questions are personalized to this user's responses
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_question_content_prompt_followup", prompt)
        
        return prompt

    @staticmethod
    def generate_question_formatting_prompt(
        question_content: List[Dict[str, Any]],
        personal_info: PersonalInfo,
        is_initial: bool = True
    ) -> str:
        """Generate prompt for Step 4: Question Formatting (Schema Formatting)."""
        # Format question content for prompt (questions should already be sorted by order)
        questions_text = "\n".join([
            f"  {i+1}. Order: {q.get('order', i+1)} - {q.get('question_text', 'N/A')}"
            for i, q in enumerate(question_content)
        ])
        
        # Determine assessment phase context
        assessment_phase = "Initial Assessment Questions (Round 1 of 2)" if is_initial else "Follow-up Questions (Round 2 of 2 - FINAL)"
        phase_context = "This is the first round of questions. There will be a follow-up round after these responses to clarify any remaining details." if is_initial else "This is the FINAL round of questions. After these responses, no more questions will be asked and the training plan will be generated."
        
        # Build AI message guidelines based on phase
        if is_initial:
            ai_message_guidelines = f"""
        **FOR INITIAL QUESTIONS:**
        Write an enthusiastic and motivational message that:
        • Opens with a friendly greeting using {personal_info.username}
        • Briefly mentions that you have analysed their profile and are excited about their goal: {personal_info.goal_description}
        • Mention that based on your analysis you have a few more questions to refine their plan
        • Clearly indicate that follow-up questions may be asked after these responses to ensure the plan is perfect
        • Includes 2–3 fitting emojis (e.g., fitness, energy, or motivation themed)
        • Ends with a strong call-to-action that makes them eager to start training
        • The tone should be energetic, personal, and confidence-boosting, making the user feel like they're about to begin something transformative.
        """
        else:
            ai_message_guidelines = f"""
        **FOR FOLLOW-UP QUESTIONS:**
        Write a warm, upbeat message that:
        • Starts with a friendly greeting using {personal_info.username}
        • Acknowledges their great initial responses with positivity and encouragement
        • References specific details they mentioned (e.g., equipment, goals, or constraints) to show attentiveness
        • Explains how these details help refine their perfect personalized plan
        • Clearly states that this is the FINAL round of questions - after these responses, their personalized training plan will be generated
        • Includes 2–3 relevant emojis (fitness, excitement, or motivation themed)
        • Ends with a clear next step or call to action
        • The tone should be motivational, conversational, and reassuring, making the user feel confident that their plan is being expertly customized for them.
        """
        
        prompt = f"""
        **ROLE:**
        You are an AI assistant that formats questions for a mobile fitness app. Your role is to convert raw question text into well-structured, user-friendly question formats that provide an excellent user experience.
        
        **CONTEXT:**
        • Assessment Phase: {assessment_phase}
        • Phase Context: {phase_context}
        • Goal: Create a smooth, engaging onboarding experience that makes users excited about their fitness journey, not overwhelmed by complex forms
        • User Experience Priorities: Easy to answer, visually appealing, mobile-friendly, actionable for AI
        
        {PromptGenerator.format_client_information(personal_info)}
        
        {PromptGenerator._get_question_presentation_context()}
        
        **TASK:**
        Convert the question content below into properly formatted questions with correct UI structure and schema compliance.
        Format each question using the most appropriate question type that balances user experience with information collection needs.
        
        **QUESTION CONTENT TO FORMAT:**
        {questions_text}
        
        **STEP-BY-STEP FORMATTING PROCESS:**
        
        Step 1: Analyze Each Question
        - Review the question text and its order number
        - Determine the best question type based on the information being collected
        - Consider: Can this be structured (multiple choice, dropdown, slider, rating) or must it be open-ended?
        
        Step 2: Rephrase if Needed
        - You are allowed and encouraged to rephrase questions to better fit a specific question schema/type
        - If a question suggests an open-ended answer but could be structured, rephrase it
        - Adjust question text, wording, and phrasing to optimize for the best question type
        - Goal: Maximize structured responses (multiple_choice, dropdown, slider, rating) and minimize free_text usage
        - Examples:
          * "What equipment do you have?" → "What training equipment do you have access to?" (better for multiple_choice)
          * "How often can you train?" → "How many days per week can you train?" (better for slider)
        
        Step 3: Select Question Type
        - Choose the most appropriate type based on response options:
          * 2-4 options → MULTIPLE_CHOICE
          * 5+ options → DROPDOWN
          * Numeric range (6+ values) → SLIDER
          * Subjective scale (1-5) → RATING
          * Complex narrative → FREE_TEXT (use sparingly, 1-2 max)
          * Yes/No with conditional detail → CONDITIONAL_BOOLEAN (use sparingly, 1-2 max)
        
        Step 4: Format Question
        - Generate unique, descriptive ID (snake_case, e.g., "equipment_access", "training_frequency")
        - Ensure question text ends with a question mark (?)
        - Write concise help_text (1-2 sentences max)
        - Add all required fields for the selected question type
        - Include the 'order' field from question content
        
        Step 5: Validate
        - Verify schema compliance (all required fields present, correct data types)
        - Check question is self-contained and doesn't require follow-ups
        - Ensure options are clear, mutually exclusive, and easy to understand
        - Confirm appropriate ranges for sliders (not too wide, reasonable steps)
        
        **CONSTRAINTS:**
        
        1. **Schema Compliance**
           - Use AIQuestion schema structure
           - Include ALL required fields based on question type (see detailed instructions below)
           - Populate ONLY relevant fields for each question type (omit unused fields)
           - Ensure correct data types: numbers (not strings), strings (not arrays), arrays (for options)
           - CRITICAL: For sliders, unit must be a SINGLE STRING (e.g., "days", "hours", "kg") NOT an array
        
        2. **Question Formatting Rules**
           - ALL question texts MUST end with a question mark (?)
           - Generate unique, descriptive IDs (snake_case, e.g., "equipment_access", "training_frequency")
           - Write helpful, concise help_text (1-2 sentences max)
           - Include the 'order' field from question content to preserve logical ordering
        
        3. **User Experience Optimization**
           - Prefer structured types (multiple_choice, dropdown, slider, rating) over open text
           - Make options clear, mutually exclusive, and easy to understand
           - Use appropriate ranges for sliders (not too wide, reasonable steps)
           - Write descriptive placeholder text for free_text questions
           - Keep help_text concise but informative
           - Ensure questions are self-contained—users cannot add additional context
        
        4. **Question Type Selection Rules**
           - MULTIPLE_CHOICE: Only for 2-4 options
           - DROPDOWN: Use for 5+ options
           - SLIDER: For numeric ranges with 6+ distinct values
           - RATING: For subjective scales (1-5 points)
           - FREE_TEXT: Maximum 1-2 per assessment, only when absolutely necessary
           - CONDITIONAL_BOOLEAN: Maximum 1-2 per assessment, only when Yes/No filter is useful
        
        {PromptGenerator.get_question_generation_instructions()}
        
        **FEW-SHOT FORMATTING EXAMPLES:**
        
        Example 1: Equipment Question
        Input: Order: 1 - "What training equipment do you have access to?"
        Analysis: This can be structured with multiple choice options
        Output:
        {{
          "id": "equipment_access",
          "text": "What training equipment do you have access to?",
          "help_text": "Select the option that best describes your equipment availability",
          "response_type": "multiple_choice",
          "order": 1,
          "options": [
            {{"id": "bodyweight", "text": "Body Weight Only", "value": "bodyweight"}},
            {{"id": "dumbbells", "text": "Dumbbells", "value": "dumbbells"}},
            {{"id": "full_gym", "text": "Full Gym Access", "value": "full_gym"}},
            {{"id": "resistance_bands", "text": "Resistance Bands", "value": "resistance_bands"}}
          ]
        }}
        
        Example 2: Schedule Question
        Input: Order: 2 - "How many days per week can you train?"
        Analysis: This is numeric and can use a slider
        Output:
        {{
          "id": "training_days",
          "text": "How many days per week can you train?",
          "help_text": "Select your realistic training frequency",
          "response_type": "slider",
          "order": 2,
          "min_value": 1,
          "max_value": 7,
          "step": 1,
          "unit": "days"
        }}
        
        Example 3: Goals Question (Rephrased)
        Input: Order: 3 - "What are your goals?"
        Analysis: Too vague, needs rephrasing and can be structured
        Rephrased: "What is your primary strength training goal?"
        Output:
        {{
          "id": "strength_goal",
          "text": "What is your primary strength training goal?",
          "help_text": "Select your main focus for strength training",
          "response_type": "multiple_choice",
          "order": 3,
          "options": [
            {{"id": "increase_strength", "text": "Increase Strength", "value": "increase_strength"}},
            {{"id": "build_muscle", "text": "Build Muscle Size", "value": "build_muscle"}},
            {{"id": "functional", "text": "Functional Strength", "value": "functional"}},
            {{"id": "endurance", "text": "Muscular Endurance", "value": "endurance"}}
          ]
        }}
        
        **OUTPUT FORMAT:**
        Return AIQuestionResponse schema with:
        - questions: List of properly formatted AIQuestion objects (ordered by 'order' field, sorted 1, 2, 3, ...)
        - total_questions: Count of questions in the list
        - estimated_time_minutes: Realistic estimate (based on question types and count)
        - ai_message: Warm, encouraging message (max 70 words) with 2-3 relevant emojis
        
        **VALIDATION CHECKLIST:**
        Before finalizing, ensure:
        ✓ All questions are properly formatted with correct schema
        ✓ Questions are ordered by 'order' field (1, 2, 3, ...)
        ✓ All required fields are present for each question type
        ✓ Data types are correct (numbers not strings, strings not arrays)
        ✓ Question texts end with question marks (?)
        ✓ Questions are self-contained and don't require follow-ups
        ✓ Structured types are preferred (minimum free_text usage)
        
        **AI MESSAGE GUIDELINES:**
        {ai_message_guidelines}
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_question_formatting_prompt", prompt)
        
        return prompt

