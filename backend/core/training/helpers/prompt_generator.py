"""
Prompt Generator for training Coach AI interactions.

This module contains all the prompts used by the TrainingCoach for generating
questions, training plan outlines, and training plans.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
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
           
        3. **Functional Fitness** - Blended strength + conditioning for overall performance or lifestyle:
           - CrossFit, hybrid training, HIIT classes, general conditioning
           - Goals like "get fitter overall," "increase functional capacity," "move better for life"
           - Focus on versatility, movement quality, and time-efficient sessions
        
        4. **Sport Specific** - Training for a specific sport:
           - Football, hockey, basketball, tennis, martial arts, etc.
           - Team sports, individual sports, competitive sports
           - Focus on sport-specific performance and conditioning
        
        **SPECIAL CASES:**
        - **Weight Loss**: Classify based on approach mentioned (strength if weight training, endurance if cardio-focused, functional if balanced or class-based)
        - **General Fitness / Move Better**: Default to functional fitness unless goal clearly emphasizes only strength or only endurance
        - **Mixed Goals**: Return primary type + secondary types (e.g., "strength" + "endurance" for someone wanting both)
        
        **OUTPUT REQUIREMENTS:**
        Produce output that conforms to the `AthleteTypeClassification` schema:
        - primary_type: One of "strength", "endurance", "functional_fitness", or "sport_specific"
        - secondary_types: List of additional types (can be empty if single focus)
        - confidence: 0.0-1.0 (how confident you are in this classification)
        - reasoning: Brief explanation (2-3 sentences) of why this classification fits, referencing keywords from the goal description
        
        **EXAMPLES:**
        - "I want to build muscle and get stronger" → primary_type: "strength", secondary_types: [], confidence: 0.95, reasoning: "User explicitly mentions building muscle and strength."
        - "I want to run a marathon and improve my 5K time" → primary_type: "endurance", secondary_types: [], confidence: 0.9, reasoning: "Goal references marathon and 5K performance."
        - "I go to CrossFit and want to feel fitter for daily life" → primary_type: "functional_fitness", secondary_types: [], confidence: 0.9, reasoning: "Mentions CrossFit and overall functional fitness."
        - "I play football and want to improve my conditioning" → primary_type: "sport_specific", secondary_types: [], confidence: 0.9, reasoning: "Mentions football competition and conditioning."
        - "I want to lose weight through strength training and running" → primary_type: "strength", secondary_types: ["endurance"], confidence: 0.85, reasoning: "User cites strength training plus running for weight loss."
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_athlete_type_classification_prompt", prompt)
        
        return prompt

    @staticmethod
    def generate_modality_selection_prompt(
        personal_info: PersonalInfo,
        onboarding_responses: Optional[str] = None,
        user_playbook=None,
    ) -> str:
        """Prompt to decide whether to include strength and endurance sessions."""

        if onboarding_responses:
            context_block = PromptGenerator.format_onboarding_responses(onboarding_responses)
            context_label = "Onboarding Q&A"
        else:
            context_block = PromptGenerator.format_playbook_lessons(
                user_playbook, personal_info, context="training"
            )
            context_label = "Playbook lessons"

        if not context_block:
            context_block = "No detailed context is available from onboarding or playbook lessons."

        return f"""
        You are an expert training coach preparing to design a supplemental training plan for {personal_info.username}.
        Before building the plan, decide which modalities should be included this week.

        Consider:
        • Primary goal: "{personal_info.goal_description}"
        • Experience level: {personal_info.experience_level}
        • Measurement system: {personal_info.measurement_system}
        • {context_label}:\n{context_block}

        OUTPUT REQUIREMENTS:
        Return JSON that conforms to the ModalityDecision schema:
        - include_bodyweight_strength: true/false
        - include_equipment_strength: true/false
        - include_endurance: true/false
        - rationale: Short justification explaining the chosen modalities and explicitly referencing the user's goal, limiter, and equipment/evironment constraints taken from the context above.

        Decision rules:
        • include_equipment_strength → true only when the goal or limiter needs loaded strength work AND the context explicitly confirms access to barbells/dumbbells/machines.
        • include_bodyweight_strength → true when strength work is still beneficial but only bodyweight/minimal tools are confirmed (or when no equipment information exists but strength is still helpful).
        • You may set both strength flags to true if the user benefits from loaded work and also uses bodyweight sessions for variety.
        • include_endurance → true when aerobic work directly advances the primary goal or mitigates a limiter highlighted in the context.
        • If unsure about a modality, default to false and describe the uncertainty in the rationale.
        """

    @staticmethod
    def get_question_generation_context() -> str:
        """Get the context section (ROLE, CONTEXT, TASK) for question generation prompts."""
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
        """
    
    @staticmethod
    def get_question_generation_guidelines() -> str:
        """Get the key principle section for question generation prompts."""
        return """
        **KEY PRINCIPLE:**
        Users provide information ABOUT themselves (constraints, preferences, goals, abilities).
        The AI uses this information to DESIGN the training plan (exercises, structure, volume, intensity).
        """
    
    @staticmethod
    def _get_general_themes_to_collect() -> str:
        """Get the general themes to collect information on."""
        return """
        **General Themes (Apply to All Users):**
        Focus ONLY on information that directly affects plan design:
        • **Schedule:** time availability, existing training commitments you need to plan around
        • **Preferences:** activities enjoyed/avoided, focus areas, training environments
        • **Fitness Baseline:** baseline fitness levels, known benchmarks, experience with specific activities
        • **Health:** injuries, physical limitations, sleep, stress, etc.
        """
    
    @staticmethod
    def _get_question_presentation_context() -> str:
        """Get the shared explanation of how questions are presented to users."""
        return """
        **CRITICAL - QUESTION PRESENTATION CONTEXT:**
        • Questions are shown ONE AT A TIME in the mobile app
        • Users can only respond using the format you provide (multiple choice selection, slider value, rating, etc.)
        • Users CANNOT add additional context, clarification, or follow-up information beyond what the formatted question allows
        • Therefore, each question must be complete, self-contained, and capture all necessary information in a single response
        • Each question stands alone—don't assume users can provide context from previous questions
        """
        
    @staticmethod
    def _get_themes_to_avoid() -> str:
        """Get the themes to avoid collecting information on."""
        return """
        **Themes to AVOID (What NOT to Ask About):**
        The AI system decides these based on user information, don't ask users to make these kind of technical decisions:
        • How to structure training (splits, frequency, progression models)
        • What volumes/intensities to prescribe
        • How to periodize the plan
        • Technical coaching decisions
        • Nutrition 
        """

    @staticmethod
    def _format_intent_summaries(
        intents: List[Dict[str, Any]],
        experience_level: str,
    ) -> str:
        lines: List[str] = []
        for intent in intents:
            priority = intent.get("priority", "primary").upper()
            intent_id = intent.get("intent_id", "unknown_intent")
            description = intent.get("description", "").strip()
            header = f"  - [{priority}] {intent_id}: {description}"
            lines.append(header)
            tags = intent.get("tags") or []
            if tags:
                lines.append(f"    • Tags: {', '.join(tags)}")
            experience_note = intent.get("experience_note")
            if experience_note:
                lines.append(
                    f"    • {experience_level.title()} focus: {experience_note}"
                )
            applicability = intent.get("applicability_conditions") or []
            if applicability:
                lines.append(
                    f"    • Applicability: {'; '.join(applicability)}"
                )
        return "\n".join(lines) if lines else "  - No athlete-specific intents available."

    @staticmethod
    def _get_app_scope_section() -> str:
        """Shared app scope description used across prompts."""
        return """
        **CRITICAL - APP SCOPE:**
        This app creates SUPPLEMENTAL training programs (strength & conditioning).
        • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
        • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
        • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
        """

    @staticmethod
    def _render_modality_decision_summary(
        include_bodyweight_strength: bool,
        include_equipment_strength: bool,
        include_endurance: bool,
        rationale: str,
    ) -> str:
        """Render modality summary section for plan prompts."""
        return f"""
            **MODALITY DECISION (BASED ON CURRENT GOAL AND PLAYBOOK):**
            • Include Bodyweight Strength Sessions: {"Yes" if include_bodyweight_strength else "No"}
            • Include Equipment-Based Strength Sessions: {"Yes" if include_equipment_strength else "No"}
            • Include Endurance Sessions: {"Yes" if include_endurance else "No"}
            • Rationale: {rationale}
        """

    @staticmethod
    def generate_question_content_prompt_initial(
        personal_info: PersonalInfo,
        unified_checklist: List[Dict[str, Any]],
        athlete_type: Dict[str, Any]
    ) -> str:
        """Generate prompt for Step 3: Question Content Generation (Initial Questions)."""
        primary_type = athlete_type.get("primary_type", "")
        secondary_types = athlete_type.get("secondary_types", [])
        
        athlete_type_desc = primary_type
        if secondary_types:
            athlete_type_desc += f" + {', '.join(secondary_types)}"
        
        checklist_text = PromptGenerator._format_intent_summaries(
            unified_checklist,
            personal_info.experience_level,
        )
        
        prompt = f"""
        {PromptGenerator.get_question_generation_context()}
        
        {PromptGenerator.get_question_generation_guidelines()}
        
        {PromptGenerator._get_question_presentation_context()}
        
        **TASK:**
        Generate personalized question content for the assessment. This is the ONLY opportunity to ask questions.
        Create comprehensive questions that gather ALL essential information needed to generate a tailored training plan.
        
        **CONTEXT:**
        • Workflow: This is the ONLY round of questions. There will be NO follow-up questions after this. You must ask ALL essential questions now—if you miss critical information, it cannot be collected later. Ensure your questions are comprehensive and cover all necessary themes.
        • User Status: {personal_info.username} has provided basic profile information (age, weight, height, goal, experience level).
        • Athlete Type: Primary: {primary_type}{" | Secondary: " + ", ".join(secondary_types) if secondary_types else ""}
        • Classification Rationale: {athlete_type.get("reasoning", "Not provided")}
        
        {PromptGenerator.format_client_information(personal_info)}
        
        **QUESTION THEMES TO COVER:**
        Generate personalized questions that cover these themes. Each theme represents essential information needed for plan generation.
        Treat athlete-specific themes as inspiration—translate them into tailored questions that reflect this user's goal and experience level.
        Ensure you cover ALL relevant themes below while avoiding the themes listed in the "Themes to AVOID" section.
        
        {PromptGenerator._get_general_themes_to_collect()}
        
        **Athlete-Specific Themes (For {athlete_type_desc}):**
        {checklist_text}
        
        {PromptGenerator._get_themes_to_avoid()}
        
        **META REASONING (INTERNAL ONLY):**
        Before drafting the final output, silently list must-have information gaps for this user, map each gap to the relevant intent IDs, and decide whether it is primary or optional. Use this internal plan to guide question creation. Do NOT include the internal plan text verbatim in the final answer—summarize it in the structured `intent_plan` output instead.
        
        **STEP-BY-STEP APPROACH:**
        
        Step 0: Plan Coverage
        - Review ALL themes above: general themes (apply to all users) and athlete-specific intents (for {athlete_type_desc})
        - Identify which themes are most relevant for this user (age: {personal_info.age}, experience: {personal_info.experience_level}, goal: "{personal_info.goal_description}")
        - Map each must-have information gap to intent IDs and note whether it is primary or optional for this user
        - Prepare to report this plan in the `intent_plan` output field
        
        Step 1: Draft Questions
        - Create an initial set of 7-10 questions (quality over quantity—better to ask 5 focused questions than 8 irrelevant ones)
        - Each question should cover one or more related intents and add new insight beyond general themes
        - Ensure questions are self-contained and don't require follow-ups
        
        Step 2: Self-Review & Revise (Two-Pass Loop)
        - Re-read each drafted question for clarity, uniqueness, and whether it captures the mapped intent
        - Revise or replace questions that are redundant, unclear, or insufficiently personalized
        
        Step 3: Assign Order
        - Order questions logically: Equipment → Schedule → Goals → Constraints → Preferences
        - Assign order numbers (1, 2, 3, ...) where 1 is the first question
        
        Step 4: Validate
        - Ensure each question is ~20 words, clear, and self-contained
        - Verify all intents in the `intent_plan` are addressed appropriately
        - Confirm questions don't require follow-ups
        
        **CONSTRAINTS & REQUIREMENTS:**
        
        {PromptGenerator._get_common_question_constraints(personal_info, include_athlete_type=True, athlete_type_desc=athlete_type_desc)}
        
        3. **Theme Coverage**
           - Cover ALL relevant themes: general themes (apply to all) and athlete-specific themes (for {athlete_type_desc})
           - DO NOT ask about themes listed in "Themes to AVOID" section
           - Combine related themes into single comprehensive questions when logical
           - Do not restate information already covered by the general themes; ensure each question contributes new theme-specific insight
           - Skip themes only if clearly not applicable to this user
           - Add questions if critical gaps are identified
        
        **FEW-SHOT EXAMPLES:**
        
        Example 1: Equipment Question
        Theme: "Current strength levels for key lifts and any known one-rep max values"
        Generated Question: "What training equipment do you have access to?"
        Order: 1
        Note: This question is self-contained, ~9 words, clear, and captures essential information
        
        Example 2: Schedule Question
        Theme: "Training environment preferences including indoor versus outdoor or pool versus open water"
        Generated Question: "How many days per week can you dedicate to training?"
        Order: 2
        Note: This question is self-contained, ~10 words, clear, and captures essential information
        
        Example 3: Goals Question
        Theme: "Specific strength goals"
        Generated Question: "What is your primary strength training goal?"
        Order: 3
        Note: This question is self-contained, ~8 words, clear, and captures essential information
        
        {PromptGenerator._get_initial_output_format()}
        
        **VALIDATION CHECKLIST:**
        Before finalizing, ensure:
        ✓ All themes are covered
        {PromptGenerator._get_common_validation_base()}
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
        # Follow-up prompt generation has been deprecated and removed from the onboarding flow.
        # This function remains as a no-op to maintain backward compatibility and will return
        # a short notice string if invoked.
        return "DEPRECATED: follow-up prompt generation removed."

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
        
        # Build AI message guidelines based on phase
        if is_initial:
            ai_message_guidelines = f"""
        **AI MESSAGE GUIDELINES (Initial Questions):**
        Write an enthusiastic message (max 70 words, 2-3 emojis) that:
        • Greets {personal_info.username} warmly
        • Mentions you've analyzed their profile and are excited about their goal: {personal_info.goal_description}
        • Indicates you have a few questions to refine their plan
        • Tone: Energetic, personal, confidence-boosting
        """
        else:
            ai_message_guidelines = f"""
        **AI MESSAGE GUIDELINES (Follow-up Questions):**
        Write a warm message (max 70 words, 2-3 emojis) that:
        • Greets {personal_info.username} and acknowledges their initial responses
        • References specific details they mentioned to show attentiveness
        • States this is the FINAL round—after this, their plan will be generated
        • Tone: Motivational, conversational, reassuring
        """
        
        prompt = f"""
        **ROLE:**
        You are an AI assistant that formats questions for a mobile fitness app. Convert raw question text into well-structured, user-friendly formats optimized for mobile interaction.
        
        **CONTEXT:**
        • Goal: Create an engaging onboarding experience that makes users excited about their fitness journey, not overwhelmed
        • User Experience Priorities: Easy to answer, visually appealing, mobile-friendly, actionable for AI
        • Questions are shown ONE AT A TIME—users can only respond using the format you provide
        • Users CANNOT add additional context beyond what the formatted question allows
        • Each question must be complete, self-contained, and capture all necessary information in a single response
        
        **TASK:**
        Convert the question content below into properly formatted questions with correct UI structure and schema compliance.
        Format each question using the most appropriate question type that balances user experience with information collection needs.
        You are allowed and encouraged to rephrase questions to better fit structured question types.
        
        **QUESTION CONTENT TO FORMAT:**
        {questions_text}
        
        **CRITICAL RULES:**
        
        1. **Question Type Selection (STRICT)**
           • 2+ options → MULTIPLE_CHOICE (use for ANY number of options: 2, 3, 4, 5, 10, 50+, etc.)
             - CRITICAL: You MUST explicitly set multiselect to true or false based on the question context
             - Set multiselect: true if user can select multiple options (e.g., "Which equipment do you have?" allows multiple selections)
             - Set multiselect: false if user selects only ONE option (e.g., "What is your primary goal?" - single selection)
           • Numeric range (6+ distinct values) → SLIDER
           • Subjective scale (1-5) → RATING
           • Questions requiring detailed text/narrative → Consider CONDITIONAL_BOOLEAN if it makes sense (Yes/No where Yes requires detail)
             - If a question needs free text/narrative, consider converting it to a Yes/No question where Yes allows for detailed information
             - Example: "Describe any injuries" → "Do you have any injuries or physical limitations?" (Yes = provide details, No = skip)
             - Use CONDITIONAL_BOOLEAN when it makes sense and provides better UX
           • Questions requiring open-ended text → FREE_TEXT
             - Use FREE_TEXT when the question genuinely needs open-ended text and cannot be naturally converted to Yes/No
             - Example: "Describe your specific training goals in detail" (if everyone must provide context, not just Yes/No)
             - Try to use CONDITIONAL_BOOLEAN when possible, but use FREE_TEXT when it makes more sense
        
        2. **Schema Compliance**
           • Include ALL required fields for selected question type
           • Correct data types: numbers (not strings), strings (not arrays), arrays (for options)
           • CRITICAL: Slider unit must be SINGLE STRING (e.g., "days") NOT array
           • ALL question texts MUST end with question mark (?)
           • Include 'order' field from question content
        
        3. **User Experience**
           • Prefer structured types (multiple_choice, slider, rating, conditional_boolean) - minimize unstructured free text
           • If a question needs narrative/detailed text, consider converting it to CONDITIONAL_BOOLEAN (Yes/No with conditional detail) if it makes sense
           • Use FREE_TEXT when the question genuinely requires open-ended text and CONDITIONAL_BOOLEAN doesn't fit naturally
           • Options must be clear, mutually exclusive, easy to understand
           • Slider ranges: reasonable width, appropriate steps
           • help_text: Concise (1-2 sentences max)
        
        **OUTPUT FORMAT:**
        Return AIQuestionResponse schema:
        - questions: List[AIQuestion] (ordered by 'order' field: 1, 2, 3, ...)
        - total_questions: int
        - estimated_time_minutes: int
        - ai_message: string (max 70 words, 2-3 emojis)
        
        {ai_message_guidelines}
        
        **FEW-SHOT EXAMPLES:**
        
        Example 1: Equipment (Multiple Choice - 4 options)
        Input: "What training equipment do you have access to?"
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
        Note: Any number of options = MULTIPLE_CHOICE
        
        Example 2: Training Days (Slider)
        Input: "How many days per week can you train?"
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
        Note: Numeric range (7 values) = SLIDER, unit is string not array
        
        Example 3: Goals (Rephrased to Multiple Choice)
        Input: "What are your goals?"
        Rephrased: "What is your primary strength training goal?"
        Output:
        {{
          "id": "strength_goal",
          "text": "What is your primary strength training goal?",
          "help_text": "Select your main focus",
          "response_type": "multiple_choice",
          "order": 3,
          "options": [
            {{"id": "increase_strength", "text": "Increase Strength", "value": "increase_strength"}},
            {{"id": "build_muscle", "text": "Build Muscle", "value": "build_muscle"}},
            {{"id": "functional", "text": "Functional Strength", "value": "functional"}},
            {{"id": "endurance", "text": "Muscular Endurance", "value": "endurance"}}
          ]
        }}
        Note: Rephrased vague question into structured format with 4 options = MULTIPLE_CHOICE
        
        **QUESTION TYPE REFERENCE AND REQUIRED FIELDS:**
        
        **MULTIPLE_CHOICE** (2+ options): 
            When to use: Use when user selects ONE or MULTIPLE options from a list of predefined choices (equipment, environment, preferences, sports, etc.). 
            Required fields: id, text, help_text, response_type: "multiple_choice", options[], multiselect (boolean), order
            - multiselect: true if user can select multiple options (e.g., "Which equipment do you have?" - user may have multiple)
            - multiselect: false if user selects only ONE option (e.g., "What is your primary goal?" - single selection)
            CRITICAL: multiselect MUST be explicitly set to either true or false - you must decide based on the question context
        
        **SLIDER** (6+ values): 
            When to use: Use when user needs to select a specific numeric value from a continuous range (days per week, hours, weight, etc.). 
            Required fields: id, text, help_text, response_type: "slider", min_value, max_value, step, unit (STRING), order
        
        **RATING** (1-5 scale): 
            When to use: Use when user rates something on a subjective scale with labeled endpoints (energy level, motivation, satisfaction, etc.). 
            Required fields: id, text, help_text, response_type: "rating", min_value, max_value, min_description, max_description, order
        
        **CONDITIONAL_BOOLEAN**: 
            When to use: Use when a question can be answered with Yes/No and the Yes answer requires further detailed information. Consider this format for questions that would otherwise need free text/narrative, if it makes sense. You can convert questions that need detailed descriptions into Yes/No format where Yes allows for detail (e.g., "Do you have any injuries?" instead of "Describe any injuries"). 
            Required fields: id, text, help_text, response_type: "conditional_boolean", max_length, placeholder, order
            Examples:
            - "Do you have any past injuries or physical limitations?" (Yes = describe in detail, No = skip)
            - "Do you have existing training commitments?" (Yes = describe schedule, No = skip)
            - "Do you have any dietary restrictions?" (Yes = specify details, No = skip)
            Note: Try CONDITIONAL_BOOLEAN when it makes sense, but use FREE_TEXT if the question naturally requires open-ended text
        
        **FREE_TEXT**: 
            When to use: Use when a question genuinely requires open-ended text that doesn't fit naturally into a Yes/No format. 
            Required fields: id, text, help_text, response_type: "free_text", max_length, placeholder, order
            Examples where FREE_TEXT makes sense:
            - "Describe your specific training goals in detail" (if everyone must provide context, not just Yes/No)
            - "How many days per week can you commit to training, and what are your preferred training times?" (requires multiple details that don't fit Yes/No)
            - Use when the question naturally needs open-ended text rather than forcing it into Yes/No format
        
        **STEP-BY-STEP PROCESS:**
        
        Step 1: Analyze question text and determine if it can be structured (prefer structured types)
        Step 2: Rephrase if needed to fit structured format (you are encouraged to rephrase)
        Step 3: If question needs narrative/detailed text, consider CONDITIONAL_BOOLEAN (Yes/No format) if it makes sense
        Step 4: Use FREE_TEXT when the question naturally requires open-ended text and CONDITIONAL_BOOLEAN doesn't fit well
        Step 5: Select question type based on response options (STRICT: 2+ options = MULTIPLE_CHOICE)
        Step 6: Format with all required fields, ensure question text ends with "?"
        Step 7: Validate schema compliance, data types, and self-containment
        
        **VALIDATION CHECKLIST:**
        ✓ Question type matches option count (2+ options = MULTIPLE_CHOICE)
        ✓ All required fields present for question type
        ✓ Data types correct (numbers not strings, strings not arrays)
        ✓ Question text ends with "?"
        ✓ Questions self-contained (no follow-ups needed)
        ✓ Structured types preferred - consider CONDITIONAL_BOOLEAN when it makes sense, use FREE_TEXT when appropriate
        ✓ Questions ordered by 'order' field (1, 2, 3, ...)
        """
        
        # TODO: REMOVE THIS - Prompt saving for review only
        _save_prompt_to_file("generate_question_formatting_prompt", prompt)
        
        return prompt

    

    
    
    @staticmethod
    def _get_common_question_constraints(personal_info: PersonalInfo, include_athlete_type: bool = False, athlete_type_desc: str = "", start_number: int = 1) -> str:
        """Get common constraints & requirements section for question content generation prompts.
        
        Focuses on content quality only - formatting/schema details are handled in the formatting prompt.
        
        Args:
            personal_info: User's personal information
            include_athlete_type: Whether to include athlete type in personalization
            athlete_type_desc: Description of athlete type (if include_athlete_type is True)
            start_number: Starting number for section numbering (default: 1)
        """
        personalization_line = f"- Tailor to user: Age {personal_info.age}, Experience {personal_info.experience_level}, Goal \"{personal_info.goal_description}\""
        if include_athlete_type and athlete_type_desc:
            personalization_line += f", Type {athlete_type_desc}"
        
        num1 = start_number
        num2 = start_number + 1
        
        return f"""
        {num1}. **Question Characteristics**
           - Length: Approximately 20 words per question (clear and concise)
           - Clarity: Direct, easy to understand at a glance, no ambiguity
           - Self-contained: Complete and comprehensive—no follow-up questions needed
           - Examples:
             * ✅ Good: "What training equipment do you have access to?" (9 words, clear, self-contained)
             * ❌ Bad: "Do you have equipment?" (requires follow-up: "What kind?")
             * ❌ Bad: "How many days per week?" (missing context—unclear what it refers to)
             * ✅ Better: "How many days per week can you dedicate to training?" (clear context)
        
        {num2}. **Personalization**
           {personalization_line}
           - Adapt complexity: Simpler language for beginners, technical terms for advanced users
           - Be specific: Avoid generic templates, make questions relevant to their situation
        """
    
    @staticmethod
    def _get_common_output_format() -> str:
        """Get common output format section for question generation prompts."""
        return """
        **OUTPUT FORMAT:**
        Return data that conforms to the `QuestionContent` schema:
        - intent_plan: List of intent plan items (can be empty if not needed for this round)
        - questions_content: List of objects, each with:
          * question_text: The actual question text (~20 words, clear, self-contained)
          * order: Display order number (1-based, lower numbers appear first)
        """

    @staticmethod
    def _get_initial_output_format() -> str:
        """Get output format for initial question generation with intent planning."""
        return """
        **OUTPUT FORMAT:**
        Return data that conforms to the `QuestionContent` schema:
        - intent_plan: Required. List of items documenting your coverage plan. Each item must include:
          * information_gap: The critical information to gather
          * selected_intent_ids: List of intent IDs used to address this gap
          * priority: "primary" or "optional" for this user
          * reasoning: Brief explanation of why this gap and intents were selected
        - questions_content: Required. List of question content items, each with:
          * question_text: The final, revised question (~20 words, clear, self-contained)
          * order: Display order number (1-based, lower numbers appear first)
        """
    
    @staticmethod
    def _get_common_validation_base() -> str:
        """Get base validation checklist items that are common to both initial and follow-up prompts."""
        return """
        ✓ Each question is ~20 words, clear, and self-contained
        ✓ Questions don't require follow-ups
        ✓ Questions are ordered logically
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
    def format_onboarding_responses(formatted_responses: Optional[str]) -> str:
        """Format onboarding Q&A responses for inclusion in prompts."""
        if not formatted_responses:
            return "No onboarding responses captured yet."

        safe_responses = str(formatted_responses).replace("{", "{{").replace("}", "}}")
        return f"""
        **ONBOARDING RESPONSE SUMMARY (Q → A):**
        {safe_responses}
        """

    @staticmethod
    def generate_initial_training_plan_prompt(
        personal_info: PersonalInfo,
        onboarding_responses: Optional[str],
        include_bodyweight_strength: bool = True,
        include_equipment_strength: bool = False,
        include_endurance: bool = True,
        modality_rationale: Optional[str] = None,
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
            

            {PromptGenerator._get_app_scope_section()}
             
             {PromptGenerator._render_modality_decision_summary(
                 include_bodyweight_strength,
                 include_equipment_strength,
                 include_endurance,
                 modality_rationale or "LLM decision unavailable—defaulting to balanced coverage."
             )}

            {PromptGenerator._get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
             
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
            
            **ONBOARDING RESPONSES (CRITICAL Q&A CONSTRAINTS):**
            {PromptGenerator.format_onboarding_responses(onboarding_responses)}
            
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
        include_bodyweight_strength: bool = True,
        include_equipment_strength: bool = False,
        include_endurance: bool = True,
        modality_rationale: Optional[str] = None,
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
            

            {PromptGenerator._get_app_scope_section()}
             
            {PromptGenerator._render_modality_decision_summary(
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
                modality_rationale or "Defaulting to include both modalities for flexibility."
            )}

            {PromptGenerator._get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
             
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
        include_bodyweight_strength: bool = True,
        include_equipment_strength: bool = False,
        include_endurance: bool = True,
        modality_rationale: Optional[str] = None,
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

            {PromptGenerator._render_modality_decision_summary(
                include_bodyweight_strength,
                include_equipment_strength,
                include_endurance,
                modality_rationale or "Maintaining balanced modality coverage for continued progression."
            )}

            **PROGRESSION RULES:**
            • Progressively increase volume/intensity based on completed weeks
            • Introduce appropriate exercise variations to prevent plateaus
            • Maintain consistency with previous weeks while adding progressive challenge
            • Apply ALL playbook lessons learned from training history
            • Respect constraints and preferences established in previous weeks

            {PromptGenerator._get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

            {PromptGenerator._get_one_week_enforcement()}
             
            {PromptGenerator._get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
             
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
    def generate_future_week_outline_prompt(
        personal_info: PersonalInfo,
        onboarding_responses: Optional[str],
        completed_weeks_summary: str,
        start_week_number: int = 2,
        total_weeks: int = 12,
    ) -> str:
        """Prompt for generating lightweight outlines for upcoming weeks."""

        onboarding_context = PromptGenerator.format_onboarding_responses(
            onboarding_responses
        )

        return f"""
            You are an expert training coach extending {personal_info.username}'s plan beyond Week 1.
            You already designed Week 1 (summary below). Now draft the NEXT {total_weeks} weeks (week numbers {start_week_number} through {start_week_number + total_weeks - 1})
            as high-level outlines only—no daily programming.

            **CURRENT WEEK SUMMARY (already completed):**
            {completed_weeks_summary}

            **USER PROFILE:**
            {PromptGenerator.format_client_information(personal_info)}

            **ONBOARDING RESPONSES:**
            {onboarding_context}

            **OUTPUT RULES:**
            • Return data that conforms to the WeeklyOutlinePlan schema.
            • Provide exactly {total_weeks} WeeklySchedule entries, starting at week_number={start_week_number} and incrementing by 1.
            • Each WeeklySchedule must include:
              - week_number
              - focus_theme, primary_goal, progression_lever, justification
              - training_plan_id: Use {personal_info.user_id or 'the user profile ID'} for every entry
              - daily_trainings: [] (keep empty; outlines only)

            **DESIGN CONSTRAINTS:**
            • Keep progression logical (e.g., Foundation → Build → Intensify → Peak → Deload).
            • Respect the user's equipment, experience, and preferences inferred from onboarding.
            • Highlight how each week evolves from the prior ones (change stimulus, density, intensity, skill, etc.).
            • Spread recovery/deload weeks strategically (e.g., after 3 hard weeks).
        """
    
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
            • Provide a complete 7-day overview (Monday-Sunday) with each day labeled as training or rest. 
              If mentioned, respect the user's available training days from playbook lessons—only schedule active sessions on the days they can train.
            • Schema enforces: weekly_schedules array with exactly 1 WeeklySchedule (week_number: 1)
            • Schema enforces: daily_trainings array with exactly 7 days in Literal order (Monday-Sunday)
            • DO NOT generate multiple weeks or reference future weeks in your output
            • The system will handle repetition and progression downstream
        """
    
    @staticmethod
    def _get_modality_instructions(
        include_bodyweight_strength: bool = True,
        include_equipment_strength: bool = False,
        include_endurance: bool = True,
        personal_info: PersonalInfo = None,
    ) -> str:
        """Shared section with modality-specific instructions tailored to modality decisions."""
        weight_unit_text = personal_info.weight_unit if personal_info else "kg or lbs"
        include_any_strength = include_bodyweight_strength or include_equipment_strength
        include_mixed = include_any_strength and include_endurance

        sections = ["**MODALITY-SPECIFIC INSTRUCTIONS:**"]

        if include_any_strength:
            sections.append(
                """
            **STRENGTH (General Rules):**
            • Schema enforces: main_muscle and equipment must be valid Enum values, execution_order is required
            • DO NOT set exercise_id (will be matched automatically)
            
            **⚠️ CRITICAL: SETS vs REPS (MUST UNDERSTAND):**
            • SETS = Number of times you perform the exercise (e.g., 3 sets means you do the exercise 3 times)
              - Normal range: 1-6 sets per exercise (typically 3-5 sets) unless specified otherwise by the user
              - Example: If doing "Bench Press" with 3 sets of 10 reps, you perform 10 repetitions, rest, then do 10 more, rest, then 10 more (3 total sets)
            • REPS = Number of repetitions per set (e.g., 10 reps means you do the movement 10 times in one set)
              - Normal range: 1-30 reps per set (typically 6-15 reps for most exercises) unless specified otherwise by the user
              - Example: In "3 sets of 10 reps", the 10 is the reps (repetitions per set), the 3 is the sets (number of times)
            • IMPORTANT: The "sets" field must be an INTEGER (1-6), representing how many times you perform the exercise
            • IMPORTANT: The "reps" field must be an ARRAY of integers, with one value per set
            • IMPORTANT: The "weight" field must be an ARRAY of floats, with one value per set
            • IMPORTANT: reps and weight arrays MUST have the same length as the number of sets
            • IMPORTANT: The number of reps per set should typically be an even number (easier to track)
            
            **⚠️ CRITICAL: EXERCISE NAMING RULES (MUST FOLLOW):**
            • exercise_name: Use ONLY the standard/common exercise name WITHOUT any equipment prefix or suffix
            • Equipment type MUST appear ONLY in the 'equipment' field, NEVER in exercise_name
            • Use the most widely recognized, standard names that will match the exercise database
            • ✅ CORRECT examples: "Bench Press", "Row", "Squat", "Deadlift", "Lateral Raise", "Chest Fly", "Shoulder Press"
            • ❌ WRONG examples: "Barbell Row", "Dumbbell Lateral Raise", "Barbell Bench Press", "Overhead Press" (use "Shoulder Press" instead)
            • ❌ WRONG examples: "Seated Calf Raise (Machine)", "Cable Fly", "Barbell Squat"
            • The exercise matching system requires clean names without equipment - including equipment in the name will cause matching failures
            """
            )

        if include_bodyweight_strength:
            sections.append(
                f"""
            **BODYWEIGHT STRENGTH days:** Minimal or no equipment.
            • Use equipment="Body weight" (or bands/suspension only when confirmed).
            • Focus on tempo, pauses, unilateral work, range of motion, or volume to drive difficulty.
            • Skip weight prescriptions—leave weights empty or set to 0 since body weight is the resistance.
            • Provide sets/reps and clear execution_order for each movement.
            """
            )

        if include_equipment_strength:
            sections.append(
                f"""
            **EQUIPMENT-BASED STRENGTH days:** Loaded implements (barbells, dumbbells, machines) are available.
            • Provide sets, reps, weight, and execution_order for each exercise (weight in {weight_unit_text}).
            • Select movements that respect confirmed equipment access and the user's experience level.
            
            **WEIGHT GENERATION GUIDELINES:**
            • Extract benchmark lifts from assessment responses (if provided) - look for 1RM values for squat, bench press, deadlift, overhead press
            • Use benchmark lifts to assess the user's overall strength level (strength-to-body-weight ratios, relative strength capacity)
            • For exercises that match known benchmarks (e.g., user provided bench press 1RM, and plan includes bench press), calculate weights directly based on rep ranges:
              - 3-5 reps: 80-85% of 1RM
              - 6-8 reps: 75-80% of 1RM
              - 9-12 reps: 70-75% of 1RM
              - 12+ reps: 65-70% of 1RM
            • For all other exercises, use the benchmark-derived strength assessment to estimate appropriate weights relative to their strength level
            • If no benchmarks provided, estimate weights based on user's body weight, age, gender, experience level, and goal
            • Conservative estimates for beginners, progressive for experienced users
            """
            )

        if include_endurance:
            sections.append(
                """
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
            """
            )

        if include_mixed:
            sections.append(
                """
            **MIXED days:** strength exercises + endurance session(s)
            • Balance modalities to avoid interference
            • Consider recovery demands
            • Use execution_order to sequence training: strength exercises first (typically 1, 2, 3...), then endurance sessions (continue numbering)
            • Example: Bench Press (1), Cable Fly (2), Long Run (3) - strength first, then endurance
            """
            )

        sections.append(
            """
            **REST days:** training_type="rest", is_rest_day=true, empty exercise/session arrays
            """
        )

        return "\n".join(section.strip("\n") for section in sections if section)
    
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
    def _get_exercise_metadata_requirements(
        include_strength_elements: bool = True,
        personal_info: PersonalInfo = None,
    ) -> str:
        """
        Get the exercise metadata requirements section for prompts.
        
        Note: main_muscle, equipment, sport_type, unit are all enforced by Pydantic schema
        (via Literal types for Gemini). Only the exercise_name formatting guidance is needed.
        """
        if not include_strength_elements:
            return ""

        return """
            **EXERCISE METADATA REQUIREMENTS:**
            
            When creating or modifying STRENGTH exercises:
            
            **⚠️ CRITICAL: EXERCISE NAME FORMATTING (MUST FOLLOW TO AVOID MATCHING FAILURES):**
            • exercise_name: Use ONLY the standard, widely recognized exercise name WITHOUT any equipment prefix, suffix, or modifier
            • Equipment type MUST be specified separately in the 'equipment' field - NEVER include it in the exercise name
            • Use the most common, standard names that will successfully match exercises in the database
            • ✅ CORRECT examples: 
              - "Bench Press" (NOT "Barbell Bench Press" or "Dumbbell Bench Press")
              - "Row" (NOT "Barbell Row" or "Cable Row")
              - "Squat" (NOT "Barbell Squat" or "Back Squat" unless that's the standard name)
              - "Deadlift" (NOT "Barbell Deadlift")
              - "Lateral Raise" (NOT "Dumbbell Lateral Raise")
              - "Chest Fly" (NOT "Dumbbell Fly" or "Cable Fly")
              - "Shoulder Press" (NOT "Overhead Press" or "Barbell Overhead Press")
            • ❌ WRONG examples (will cause matching failures):
              - "Barbell Row" → Use "Row" instead
              - "Dumbbell Lateral Raise" → Use "Lateral Raise" instead
              - "Barbell Bench Press" → Use "Bench Press" instead
              - "Overhead Press" → Use "Shoulder Press" instead
              - "Seated Calf Raise (Machine)" → Use "Calf Raise" instead
              - "Cable Fly" → Use "Chest Fly" instead
            • The exercise matching system searches by name and equipment separately - including equipment in the name prevents successful matching
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
    def generate_insights_summary_prompt(metrics: Dict[str, Any]) -> str:
        """
        Generate prompt for AI insights summary.
        
        Args:
            metrics: Dictionary with volume_progress, training_frequency, training_intensity, 
                    weak_points, top_exercises
        """
        prompt = f"""
            You are a friendly training coach. Generate insights EXCLUSIVELY from the data below.

            **TRAINING DATA:**
            Volume: {metrics.get('volume_progress', 'N/A')}
            Frequency: {metrics.get('training_frequency', 'N/A')}
            Intensity: {metrics.get('training_intensity', 'N/A')}
        """
        
        weak_points = metrics.get('weak_points', [])
        if weak_points:
            prompt += "Weak Points:\n"
            for wp in weak_points[:3]:
                prompt += f"- {wp.get('muscle_group', 'Unknown')}: {wp.get('issue', 'N/A')} ({wp.get('severity', 'N/A')})\n"
        else:
            prompt += "Weak Points: None\n"
        
        top_exercises = metrics.get('top_exercises', [])
        if top_exercises:
            prompt += "Top Exercises:\n"
            for ex in top_exercises[:3]:
                prompt += f"- {ex.get('name', 'Unknown')}: {ex.get('trend', 'N/A')}"
                if ex.get('change'):
                    prompt += f" ({ex.get('change')})"
                prompt += "\n"
        else:
            prompt += "Top Exercises: None\n"
        
        prompt += """
            **CRITICAL RULES:**
            • ALL insights MUST come directly from the data above - no assumptions
            • Use NON-TECHNICAL, everyday language - write as if talking to a friend
            • Avoid ALL numbers, percentages, and technical metrics in the output
            • Use descriptive words instead: "more", "less", "better", "consistent", "improving", "stable", "increasing", "decreasing"
            • Only mention exercises/muscles listed in the data
            • Forbidden: "likely", "probably", "might be" - only state facts
            • Forbidden: Numbers, percentages, specific values - use descriptive language instead

            **Language Examples:**
            ✅ "Your training volume is looking great and consistent" (non-technical, no numbers)
            ✅ "You've been training more frequently lately" (descriptive, no numbers)
            ✅ "Your intensity feels manageable" (friendly, no numbers)
            ❌ "Volume increased 20% this week" (has numbers - FORBIDDEN)
            ❌ "You completed 3 of 4 days" (has numbers - FORBIDDEN)
            ❌ "Your RPE is stable" (technical term - avoid if possible, use "intensity feels manageable" instead)

            **Task:**
            Generate friendly 2-3 sentence summary with:
            1. Progress celebration (only if data shows it)
            2. EXACTLY 2 findings (observations/insights derived from the data)
            3. EXACTLY 2 recommendations (actionable next steps based on the findings)

            **Findings vs Recommendations:**
            - Findings: Simple observations from the data in plain language (e.g., "Your training volume is stable", "Some muscle groups need more attention", "Your consistency is improving")
            - Recommendations: Actionable next steps in simple terms (e.g., "Focus on training your chest more often", "Consider taking a lighter week", "Keep up the great consistency")

            **Output (JSON):**
            - summary: 2-3 sentences (friendly, non-technical, no numbers)
            - findings: EXACTLY 2 observations in plain language (no numbers, no technical terms)
            - recommendations: EXACTLY 2 actionable items in simple terms (no numbers, no technical terms)
        """
        
        return prompt

    

