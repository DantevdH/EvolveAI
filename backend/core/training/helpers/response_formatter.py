"""
Response Formatter for AI Question Responses

This module provides clean, structured formatting of user responses to AI-generated questions
for use in AI prompts and training plan generation.
"""

from typing import Dict, Any, List, Optional
from core.training.schemas.question_schemas import AIQuestion


class ResponseFormatter:
    """
    Formats user responses for AI prompts in a clear, structured way.

    This class handles different question types and response formats,
    providing context-aware formatting when question metadata is available.
    """

    @staticmethod
    def format_responses(
        responses: Dict[str, Any], questions: Optional[List[AIQuestion]] = None
    ) -> str:
        """
        Format user responses for AI prompts in a clear, structured way.

        Args:
            responses: Dict of question_id -> response_value from frontend
            questions: Optional list of AIQuestion objects for context

        Returns:
            Formatted string with Q: question_text\nA: formatted_response
        """
        formatted = []

        # Create a lookup map for questions by ID for efficient access
        question_map = {}
        if questions:
            question_map = {q.id: q for q in questions}

        for question_id, response in responses.items():
            try:
                question = question_map.get(question_id)
                question_text = question.text if question else question_id

                # Format response based on question type and response structure
                response_str = ResponseFormatter._format_single_response(
                    response, question
                )

                formatted.append(f"Q: {question_text}\nA: {response_str}")

            except Exception as e:
                # Fallback for any errors
                question_text = question.text if question else question_id
                formatted.append(
                    f"Q: {question_text}\nA: [Error formatting response: {str(e)}]"
                )

        return "\n\n".join(formatted)

    @staticmethod
    def _format_single_response(
        response: Any, question: Optional[AIQuestion] = None
    ) -> str:
        """
        Format a single response value based on its type and question context.

        Args:
            response: The response value from the frontend
            question: Optional AIQuestion object for context

        Returns:
            Formatted response string
        """
        # Handle None/empty responses
        if response is None or response == "":
            return "No response"

        # Handle different response types
        if isinstance(response, list):
            # Only treat as multiple choice if we have a question with options
            if question and question.options:
                return ResponseFormatter._format_multiple_choice_response(
                    response, question
                )
            else:
                # Format as regular list
                return "[" + ", ".join(str(item) for item in response) + "]"
        elif isinstance(response, dict) and "boolean" in response:
            return ResponseFormatter._format_conditional_boolean_response(response)
        elif isinstance(response, (int, float)):
            return ResponseFormatter._format_numeric_response(response, question)
        elif isinstance(response, str):
            return ResponseFormatter._format_text_response(response)
        else:
            return str(response)

    @staticmethod
    def _format_multiple_choice_response(
        response: List[str], question: Optional[AIQuestion] = None
    ) -> str:
        """Format multiple choice responses."""
        if len(response) == 0:
            return "No selection"
        elif len(response) == 1:
            # Try to find the option text if question context is available
            if question and question.options:
                option = next(
                    (opt for opt in question.options if opt.value == str(response[0])),
                    None,
                )
                return option.text if option else str(response[0])
            return str(response[0])
        else:
            # Multiple selections - try to map values to text
            if question and question.options:
                option_texts = []
                for value in response:
                    option = next(
                        (opt for opt in question.options if opt.value == str(value)),
                        None,
                    )
                    option_texts.append(option.text if option else str(value))
                return ", ".join(option_texts)
            return ", ".join(str(v) for v in response)

    @staticmethod
    def _format_conditional_boolean_response(response: Dict[str, Any]) -> str:
        """Format conditional boolean responses."""
        bool_val = response.get("boolean")
        text_val = response.get("text", "").strip()

        if bool_val is True:
            if text_val:
                return f"Yes - {text_val}"
            else:
                return "Yes"
        elif bool_val is False:
            return "No"
        else:
            return "Not answered"

    @staticmethod
    def _format_numeric_response(
        response: float, question: Optional[AIQuestion] = None
    ) -> str:
        """Format numeric responses (sliders, ratings) with proper context."""
        if question:
            if question.response_type == "slider":
                # Slider responses: show value with unit
                if question.unit:
                    return f"{response} {question.unit}"
                else:
                    return str(response)

            elif question.response_type == "rating":
                # Rating responses: show value with scale context
                min_val = question.min_value or 1
                max_val = question.max_value or 5

                # Try to provide meaningful context for the rating
                scale_context = ""
                if question.help_text:
                    scale_context = f" ({question.help_text})"
                elif max_val == 10:
                    scale_context = " (1=lowest, 10=highest)"
                elif max_val == 5:
                    scale_context = " (1=lowest, 5=highest)"

                return f"{int(response)}/{int(max_val)} rating{scale_context}"
            else:
                return str(response)
        else:
            # No question context - return raw numeric value
            return str(response)

    @staticmethod
    def _format_text_response(response: str) -> str:
        """Format text responses."""
        if response is None:
            return "No response"
        trimmed = response.strip()
        return trimmed if trimmed else "No response"
