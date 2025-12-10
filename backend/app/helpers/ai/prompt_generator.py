"""
Prompt Generator for training Coach AI interactions.

This module aggregates prompts from dedicated prompt files and provides
a unified interface through the PromptGenerator class.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.schemas.question_schemas import PersonalInfo

# Import from dedicated prompt modules
from app.helpers.prompts.classification_prompts import (
    generate_lightweight_intent_classification_prompt as _generate_lightweight_intent_classification_prompt,
)
from app.helpers.prompts.question_prompts import (
    generate_initial_question_prompt as _generate_initial_question_prompt,
)
from app.helpers.prompts.plan_prompts import (
    generate_initial_training_plan_prompt as _generate_initial_training_plan_prompt,
    update_weekly_schedule_prompt as _update_weekly_schedule_prompt,
    create_new_weekly_schedule_prompt as _create_new_weekly_schedule_prompt,
    generate_future_week_outline_prompt as _generate_future_week_outline_prompt,
)
from app.helpers.prompts.insights_prompts import (
    generate_insights_summary_prompt as _generate_insights_summary_prompt,
)
from app.helpers.prompts.formatting_helpers import (
    format_client_information as _format_client_information,
    format_playbook_lessons as _format_playbook_lessons,
    format_onboarding_responses as _format_onboarding_responses,
    format_exercise_info as _format_exercise_info,
)

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
            f.write(f"# Location: backend/app/helpers/ai/prompt_generator.py\n")
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

    # Classification prompts
    @staticmethod
    def generate_lightweight_intent_classification_prompt(
        feedback_message: str,
        conversation_context: str,
        training_plan: Dict[str, Any] = None
    ) -> str:
        """Generate lightweight prompt for STAGE 1: Intent classification only (no operations)."""
        prompt = _generate_lightweight_intent_classification_prompt(
            feedback_message, conversation_context, training_plan
        )
        _save_prompt_to_file("generate_lightweight_intent_classification_prompt", prompt)
        return prompt

    # Question prompts
    @staticmethod
    def generate_initial_question_prompt(
        personal_info: PersonalInfo,
        question_history: Optional[str] = None,
    ) -> str:
        """Generate a single onboarding question with full formatting in one LLM call."""
        prompt = _generate_initial_question_prompt(personal_info, question_history)
        _save_prompt_to_file("generate_initial_question_prompt", prompt)
        return prompt

    # Plan prompts
    @staticmethod
    def generate_initial_training_plan_prompt(
        personal_info: PersonalInfo,
        onboarding_responses: Optional[str],
        include_bodyweight_strength: bool = True,
        include_equipment_strength: bool = False,
        include_endurance: bool = True,
        modality_rationale: Optional[str] = None,
    ) -> str:
        """Generate prompt for creating the FIRST week (Week 1) during onboarding."""
        prompt = _generate_initial_training_plan_prompt(
            personal_info,
            onboarding_responses,
            include_bodyweight_strength,
            include_equipment_strength,
            include_endurance,
            modality_rationale,
        )
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
        """Generate prompt for updating an existing week based on user feedback."""
        prompt = _update_weekly_schedule_prompt(
            personal_info,
            feedback_message,
            week_number,
            current_week_summary,
            user_playbook,
            include_bodyweight_strength,
            include_equipment_strength,
            include_endurance,
            modality_rationale,
            conversation_history,
        )
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
        """Generate prompt for creating a new week when previous week is completed."""
        prompt = _create_new_weekly_schedule_prompt(
            personal_info,
            completed_weeks_context,
            progress_summary,
            playbook_lessons,
            include_bodyweight_strength,
            include_equipment_strength,
            include_endurance,
            modality_rationale,
        )
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
        return _generate_future_week_outline_prompt(
            personal_info,
            onboarding_responses,
            completed_weeks_summary,
            start_week_number,
            total_weeks,
        )

    # Insights prompts
    @staticmethod
    def generate_insights_summary_prompt(metrics: Dict[str, Any]) -> str:
        """Generate prompt for AI insights summary."""
        return _generate_insights_summary_prompt(metrics)

    # Formatting helpers (delegated to formatting_helpers module)
    @staticmethod
    def format_client_information(personal_info: PersonalInfo) -> str:
        """Format client information for prompts."""
        return _format_client_information(personal_info)

    @staticmethod
    def format_playbook_lessons(
        playbook, personal_info: PersonalInfo, context: str = "training"
    ) -> str:
        """Format playbook lessons for inclusion in prompts."""
        return _format_playbook_lessons(playbook, personal_info, context)

    @staticmethod
    def format_onboarding_responses(formatted_responses: Optional[str]) -> str:
        """Format onboarding Q&A responses for inclusion in prompts."""
        return _format_onboarding_responses(formatted_responses)

    @staticmethod
    def _format_exercise_info(exercises: List[Dict]) -> str:
        """Format exercise information for prompts."""
        return _format_exercise_info(exercises)
