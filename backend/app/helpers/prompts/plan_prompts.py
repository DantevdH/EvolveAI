"""
Training plan generation prompts.
Includes prompts for initial plan creation, week updates, new week creation, and future week outlines.
"""

from typing import Optional, Dict, Any, List
from app.schemas.question_schemas import PersonalInfo
from app.helpers.prompts.formatting_helpers import (
    format_client_information,
    format_onboarding_responses,
    format_playbook_lessons,
)
from app.helpers.prompts.plan_helpers import (
    get_app_scope_section,
    render_modality_decision_summary,
    get_one_week_enforcement,
    get_modality_instructions,
    get_justification_requirements,
    get_training_principles,
    get_exercise_metadata_requirements,
    get_supplemental_training_scheduling,
)


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
    """
    
    prompt = f"""
        **YOUR ROLE:**
        You are an Expert Training Coach who just completed a personalized assessment with {personal_info.username}.
        You gathered information in two phases and now need to create their Week 1 training plan.
        Remember: This is Week 1 only. We re-assess and adjust weekly based on their progress.
        

        {get_app_scope_section()}
         
         {render_modality_decision_summary(
            include_bodyweight_strength,
            include_equipment_strength,
            include_endurance,
            modality_rationale or "LLM decision unavailable—defaulting to balanced coverage."
        )}

        {get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

        {get_one_week_enforcement()}
         
        {get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
         
        {get_justification_requirements()}

        {get_training_principles()}

        {get_supplemental_training_scheduling()}

        **OUTPUT FORMAT & GUIDANCE:**
        • Schema enforces: title (required), summary (required), justification (required), weekly_schedules (exactly 1 with week_number: 1, exactly 7 daily_trainings), ai_message (optional)
        • All field types, required fields, and enum values are enforced by the schema.
        • ai_message: Warm message celebrating plan completion, explaining week-by-week approach (2-3 sentences, 2-3 emojis)
          Example: "🎉 Amazing! I've created your personalized Week 1 plan! We work week-by-week so we can track your progress and adapt as you grow stronger. Take a look — excited to hear your thoughts! 💪✨"
        
        ═══════════════════════════════════════════════════════════════════════════════
        USER-SPECIFIC CONTEXT (CRITICAL - APPLY THESE CONSTRAINTS)
        ═══════════════════════════════════════════════════════════════════════════════
        
        **CLIENT PROFILE:**
        {format_client_information(personal_info)}
        
        **ONBOARDING RESPONSES (CRITICAL Q&A CONSTRAINTS):**
        {format_onboarding_responses(onboarding_responses)}
        
        ═══════════════════════════════════════════════════════════════════════════════
        YOUR TASK
        ═══════════════════════════════════════════════════════════════════════════════
        
        Design Week 1 training schedule using the user context above:
        • Constraints and preferences from the user playbook (equipment, time, injuries, preferences, etc.)
        • Goal: "{personal_info.goal_description}"
        • Experience: {personal_info.experience_level}
        • Your coaching expertise (structure, volume, intensity, exercise selection)
     """
    
    return prompt


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
        

        {get_app_scope_section()}
         
        {render_modality_decision_summary(
            include_bodyweight_strength,
            include_equipment_strength,
            include_endurance,
            modality_rationale or "Defaulting to include both modalities for flexibility."
        )}

        {get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

        {get_one_week_enforcement()}
         
        {get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
         
        {get_justification_requirements()}

        {get_training_principles()}

        {get_supplemental_training_scheduling()}

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
        {format_client_information(personal_info)}
        
        **USER PLAYBOOK (LEARNED LESSONS - CRITICAL CONSTRAINTS):**
        {format_playbook_lessons(user_playbook, personal_info, context="training")}
        
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
    
    return prompt


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
    """
    playbook_context = format_playbook_lessons(
        playbook_lessons, personal_info, context="training"
    )
    
    progress_context_section = f"""
    **COMPLETED WEEKS CONTEXT:**
    {completed_weeks_context}
    
    **USER PROGRESS SUMMARY:**
    {progress_summary}
    
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

        {render_modality_decision_summary(
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

        {get_exercise_metadata_requirements(include_bodyweight_strength or include_equipment_strength, personal_info)}

        {get_one_week_enforcement()}
         
        {get_modality_instructions(include_bodyweight_strength, include_equipment_strength, include_endurance, personal_info)}
         
        {get_justification_requirements()}

        {get_training_principles()}

        **CRITICAL REQUIREMENTS:**
        ✓ Match {personal_info.experience_level} complexity
        ✓ Align with "{personal_info.goal_description}" (primary driver)
        ✓ Apply goal-appropriate periodization
        ✓ Apply ALL playbook lessons (if provided - these are proven constraints and preferences from training history)
        ✓ Stay concise
         
        {get_supplemental_training_scheduling()}
         
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

    return prompt


def generate_future_week_outline_prompt(
    personal_info: PersonalInfo,
    onboarding_responses: Optional[str],
    completed_weeks_summary: str,
    start_week_number: int = 2,
    total_weeks: int = 12,
) -> str:
    """Prompt for generating lightweight outlines for upcoming weeks."""

    onboarding_context = format_onboarding_responses(onboarding_responses)

    return f"""
        You are an expert training coach extending {personal_info.username}'s plan beyond Week 1.
        You already designed Week 1 (summary below). Now draft the NEXT {total_weeks} weeks (week numbers {start_week_number} through {start_week_number + total_weeks - 1})
        as high-level outlines only—no daily programming.

        **CURRENT WEEK SUMMARY (already completed):**
        {completed_weeks_summary}

        **USER PROFILE:**
        {format_client_information(personal_info)}

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
