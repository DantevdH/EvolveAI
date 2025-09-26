"""
AI Question Generation Service

This service handles the generation of personalized questions for the onboarding flow
using OpenAI with Pydantic response format.
"""

import os
import logging
from typing import Dict, Any
from openai import OpenAI

from .helpers.ai_question_schemas import (
    AIQuestionResponse,
    PersonalInfo,
    QuestionCategory,
    QuestionType
)

logger = logging.getLogger(__name__)


class AIQuestionService:
    """Service for generating AI-powered questions."""
    
    def __init__(self, openai_client: OpenAI):
        self.openai_client = openai_client
    
    def generate_initial_questions(self, personal_info: PersonalInfo) -> AIQuestionResponse:
        """Generate initial personalized questions based on personal info and goal."""
        try:
            prompt = f"""
            You are an ELITE PERFORMANCE COACH. Generate 8-12 personalized questions for a user with the following information:
            
            Personal Information:
            - Age: {personal_info.age}
            - Weight: {personal_info.weight} {personal_info.weight_unit}
            - Height: {personal_info.height} {personal_info.height_unit}
            - Goal: {personal_info.goal_description}
            
            Generate questions that:
            1. Cover all essential areas: training experience, goals, equipment, time, health, lifestyle, nutrition, motivation
            2. Are personalized to their specific goal (e.g., if they want to run a marathon, focus on running-specific questions)
            3. Use appropriate response types for each question
            4. Include proper validation rules
            5. Are relevant and skip irrelevant areas (e.g., don't ask about gym equipment if they want to do yoga at home)
            
            Question Categories to consider:
            - TRAINING_EXPERIENCE: Experience level, training history, favorite exercises
            - GOALS_PREFERENCES: Specific goals, preferences, what they want to achieve
            - EQUIPMENT_AVAILABILITY: What equipment they have access to (only if relevant to their goal)
            - TIME_COMMITMENT: How much time they can dedicate to training
            - MEDICAL_HEALTH: Any injuries, limitations, medical conditions
            - LIFESTYLE_RECOVERY: Sleep, stress, job activity, recovery habits
            - NUTRITION: Current eating habits, tracking, dietary preferences
            - MOTIVATION_COMMITMENT: Motivation level, commitment, upcoming events
            
            Response Types:
            - single_choice: One option selection (radio buttons)
            - multiple_choice: Multiple option selection (checkboxes)
            - free_text: Open text input
            - slider: Numeric input with min/max/step
            - boolean: Yes/No questions
            - rating: 1-10 rating scale
            
            Make questions conversational and coach-like. Ask follow-up questions that dig deeper into their specific situation.
            """
            
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            return completion.choices[0].message.parsed
            
        except Exception as e:
            logger.error(f"Error generating initial questions: {str(e)}")
            raise Exception(f"Failed to generate initial questions: {str(e)}")
    
    def generate_follow_up_questions(self, personal_info: PersonalInfo, initial_responses: Dict[str, Any]) -> AIQuestionResponse:
        """Generate follow-up questions based on initial responses."""
        try:
            prompt = f"""
            You are an ELITE PERFORMANCE COACH. Based on the user's initial responses, generate 3-5 personalized follow-up questions.
            
            Personal Information:
            - Age: {personal_info.age}
            - Weight: {personal_info.weight} {personal_info.weight_unit}
            - Height: {personal_info.height} {personal_info.height_unit}
            - Goal: {personal_info.goal_description}
            
            Initial Responses:
            {self._format_responses(initial_responses)}
            
            Generate follow-up questions that:
            1. Dig deeper into their specific goal and situation
            2. Clarify any ambiguous or incomplete responses
            3. Address potential concerns or limitations you've identified
            4. Gather additional context for personalization
            5. Are open-ended and conversational (use free_text response type)
            6. Show you understand their specific situation and goals
            
            Make these questions feel like a real coach asking clarifying questions to better understand their needs.
            Be specific and reference their previous answers when relevant.
            """
            
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            return completion.choices[0].message.parsed
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {str(e)}")
            raise Exception(f"Failed to generate follow-up questions: {str(e)}")
    
    def _format_responses(self, responses: Dict[str, Any]) -> str:
        """Format responses for AI prompt."""
        formatted = []
        for question_id, response in responses.items():
            if isinstance(response, list):
                response_str = ", ".join(str(item) for item in response)
            else:
                response_str = str(response)
            formatted.append(f"- {question_id}: {response_str}")
        return "\n".join(formatted)
