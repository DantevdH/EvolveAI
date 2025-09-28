#!/usr/bin/env python3
"""
Unit tests for ResponseFormatter component.

This module tests the ResponseFormatter in isolation to ensure comprehensive coverage
of response formatting logic, including all question types and edge cases.
"""

import pytest
from unittest.mock import Mock, patch
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.fitness.helpers.response_formatter import ResponseFormatter
from core.fitness.helpers.ai_question_schemas import AIQuestion, QuestionType, QuestionOption, QuestionCategory


class TestResponseFormatter:
    """Unit tests for ResponseFormatter component."""
    
    @pytest.fixture
    def sample_questions(self):
        """Create sample questions for testing."""
        return [
            AIQuestion(
                id="training_frequency",
                text="How many days per week do you train?",
                response_type=QuestionType.MULTIPLE_CHOICE,
                category=QuestionCategory.TIME_COMMITMENT,
                options=[
                    QuestionOption(id="1", text="Daily", value="daily"),
                    QuestionOption(id="2", text="3-4 times per week", value="3-4"),
                    QuestionOption(id="3", text="1-2 times per week", value="1-2")
                ]
            ),
            AIQuestion(
                id="favorite_exercise_type",
                text="What's your favorite exercise type?",
                response_type=QuestionType.DROPDOWN,
                category=QuestionCategory.GOALS_PREFERENCES
            ),
            AIQuestion(
                id="specific_goals",
                text="Do you have any specific fitness goals?",
                response_type=QuestionType.FREE_TEXT,
                category=QuestionCategory.GOALS_PREFERENCES
            ),
            AIQuestion(
                id="session_duration",
                text="How long are your workout sessions?",
                response_type=QuestionType.SLIDER,
                category=QuestionCategory.TIME_COMMITMENT,
                min_value=15,
                max_value=120,
                unit="minutes"
            ),
            AIQuestion(
                id="current_weight",
                text="What's your current weight?",
                response_type=QuestionType.SLIDER,
                category=QuestionCategory.MEDICAL_HEALTH,
                min_value=40,
                max_value=200,
                unit="kg"
            ),
            AIQuestion(
                id="has_equipment",
                text="Do you have access to gym equipment?",
                response_type=QuestionType.CONDITIONAL_BOOLEAN,
                category=QuestionCategory.EQUIPMENT_AVAILABILITY
            ),
            AIQuestion(
                id="has_injuries",
                text="Do you have any injuries or limitations?",
                response_type=QuestionType.CONDITIONAL_BOOLEAN,
                category=QuestionCategory.MEDICAL_HEALTH
            ),
            AIQuestion(
                id="motivation_level",
                text="How motivated are you to achieve your goals?",
                response_type=QuestionType.RATING,
                category=QuestionCategory.MOTIVATION_COMMITMENT,
                min_value=1,
                max_value=5,
                help_text="1=Not motivated, 5=Very motivated"
            ),
            AIQuestion(
                id="satisfaction_rating",
                text="Rate your current fitness level",
                response_type=QuestionType.RATING,
                category=QuestionCategory.TRAINING_EXPERIENCE,
                min_value=1,
                max_value=10,
                help_text="1=Beginner, 10=Expert"
            )
        ]
    
    @pytest.fixture
    def sample_responses(self):
        """Create sample responses for testing."""
        return {
            'training_frequency': ['daily'],
            'favorite_exercise_type': 'pilates', 
            'specific_goals': 'Yes i am dante so pleaae',
            'session_duration': 45,
            'current_weight': 108,
            'has_equipment': {'boolean': False, 'text': ''},
            'has_injuries': {'boolean': False, 'text': ''},
            'motivation_level': 4,
            'satisfaction_rating': 7
        }
    
    def test_format_responses_with_questions(self, sample_responses, sample_questions):
        """Test formatting responses with question context."""
        result = ResponseFormatter.format_responses(sample_responses, sample_questions)
        
        # Should return formatted string
        assert isinstance(result, str)
        assert len(result) > 0
        
        # Should contain Q: A: format
        assert "Q: " in result
        assert "A: " in result
        
        # Should contain proper formatting for different question types
        assert "Q: How many days per week do you train?\nA: Daily" in result
        assert "Q: What's your favorite exercise type?\nA: pilates" in result
        assert "Q: Do you have any specific fitness goals?\nA: Yes i am dante so pleaae" in result
        assert "Q: How long are your workout sessions?\nA: 45 minutes" in result
        assert "Q: What's your current weight?\nA: 108 kg" in result
        assert "Q: Do you have access to gym equipment?\nA: No" in result
        assert "Q: Do you have any injuries or limitations?\nA: No" in result
        assert "Q: How motivated are you to achieve your goals?\nA: 4/5 rating (1=Not motivated, 5=Very motivated)" in result
        assert "Q: Rate your current fitness level\nA: 7/10 rating (1=Beginner, 10=Expert)" in result
    
    def test_format_responses_without_questions(self, sample_responses):
        """Test formatting responses without question context."""
        result = ResponseFormatter.format_responses(sample_responses)
        
        # Should return formatted string
        assert isinstance(result, str)
        assert len(result) > 0
        
        # Should contain Q: A: format with question IDs as questions
        assert "Q: training_frequency\nA: [daily]" in result
        assert "Q: favorite_exercise_type\nA: pilates" in result
        assert "Q: specific_goals\nA: Yes i am dante so pleaae" in result
        assert "Q: session_duration\nA: 45" in result
        assert "Q: current_weight\nA: 108" in result
        assert "Q: has_equipment\nA: No" in result
        assert "Q: has_injuries\nA: No" in result
        assert "Q: motivation_level\nA: 4" in result
        assert "Q: satisfaction_rating\nA: 7" in result
    
    def test_format_single_response_multiple_choice(self, sample_questions):
        """Test formatting multiple choice responses."""
        # Single selection
        question = sample_questions[0]  # training_frequency
        response = ['daily']
        result = ResponseFormatter._format_single_response(response, question)
        assert result == "Daily"
        
        # Multiple selections
        response = ['daily', '3-4']
        result = ResponseFormatter._format_single_response(response, question)
        assert result == "Daily, 3-4 times per week"
        
        # Empty selection
        response = []
        result = ResponseFormatter._format_single_response(response, question)
        assert result == "No selection"
    
    def test_format_single_response_multiple_choice_without_question(self):
        """Test formatting multiple choice responses without question context."""
        response = ['daily', '3-4']
        result = ResponseFormatter._format_single_response(response)
        assert result == "[daily, 3-4]"
        
        response = ['daily']
        result = ResponseFormatter._format_single_response(response)
        assert result == "[daily]"
    
    def test_format_single_response_conditional_boolean(self):
        """Test formatting conditional boolean responses."""
        # True with text
        response = {'boolean': True, 'text': 'I have a home gym'}
        result = ResponseFormatter._format_single_response(response)
        assert result == "Yes - I have a home gym"
        
        # True without text
        response = {'boolean': True, 'text': ''}
        result = ResponseFormatter._format_single_response(response)
        assert result == "Yes"
        
        # False
        response = {'boolean': False, 'text': ''}
        result = ResponseFormatter._format_single_response(response)
        assert result == "No"
        
        # False with text
        response = {'boolean': False, 'text': 'No equipment available'}
        result = ResponseFormatter._format_single_response(response)
        assert result == "No"
        
        # Invalid boolean
        response = {'boolean': None, 'text': ''}
        result = ResponseFormatter._format_single_response(response)
        assert result == "Not answered"
    
    def test_format_single_response_numeric_slider(self, sample_questions):
        """Test formatting numeric slider responses."""
        question = sample_questions[3]  # session_duration with unit
        response = 45
        result = ResponseFormatter._format_single_response(response, question)
        assert result == "45 minutes"
        
        # Slider without unit
        question_no_unit = AIQuestion(
            id="test",
            text="Test question",
            response_type=QuestionType.SLIDER,
            category=QuestionCategory.TIME_COMMITMENT
        )
        result = ResponseFormatter._format_single_response(response, question_no_unit)
        assert result == "45"
    
    def test_format_single_response_numeric_rating(self, sample_questions):
        """Test formatting numeric rating responses."""
        question = sample_questions[7]  # motivation_level with help_text
        response = 4
        result = ResponseFormatter._format_single_response(response, question)
        assert result == "4/5 rating (1=Not motivated, 5=Very motivated)"
        
        # Rating without help_text
        question_no_help = AIQuestion(
            id="test",
            text="Test question",
            response_type=QuestionType.RATING,
            category=QuestionCategory.TRAINING_EXPERIENCE,
            min_value=1,
            max_value=10
        )
        response = 7
        result = ResponseFormatter._format_single_response(response, question_no_help)
        assert result == "7/10 rating (1=lowest, 10=highest)"
        
        # Rating with 5-point scale
        question_5_scale = AIQuestion(
            id="test",
            text="Test question",
            response_type=QuestionType.RATING,
            category=QuestionCategory.TRAINING_EXPERIENCE,
            min_value=1,
            max_value=5
        )
        response = 3
        result = ResponseFormatter._format_single_response(response, question_5_scale)
        assert result == "3/5 rating (1=lowest, 5=highest)"
    
    def test_format_single_response_numeric_without_question(self):
        """Test formatting numeric responses without question context."""
        response = 45
        result = ResponseFormatter._format_single_response(response)
        assert result == "45"
        
        response = 4.5
        result = ResponseFormatter._format_single_response(response)
        assert result == "4.5"
    
    def test_format_single_response_text(self):
        """Test formatting text responses."""
        response = "This is a text response"
        result = ResponseFormatter._format_single_response(response)
        assert result == "This is a text response"
        
        # Empty text
        response = ""
        result = ResponseFormatter._format_single_response(response)
        assert result == "No response"
        
        # Whitespace only
        response = "   "
        result = ResponseFormatter._format_single_response(response)
        assert result == "No response"
        
        # None
        response = None
        result = ResponseFormatter._format_single_response(response)
        assert result == "No response"
    
    def test_format_single_response_other_types(self):
        """Test formatting other response types."""
        # Integer
        response = 42
        result = ResponseFormatter._format_single_response(response)
        assert result == "42"
        
        # Float
        response = 3.14
        result = ResponseFormatter._format_single_response(response)
        assert result == "3.14"
        
        # Boolean
        response = True
        result = ResponseFormatter._format_single_response(response)
        assert result == "True"
        
        # List (not multiple choice)
        response = [1, 2, 3]
        result = ResponseFormatter._format_single_response(response)
        assert result == "[1, 2, 3]"
    
    def test_format_multiple_choice_response_edge_cases(self, sample_questions):
        """Test edge cases for multiple choice formatting."""
        question = sample_questions[0]  # training_frequency
        
        # Empty list
        response = []
        result = ResponseFormatter._format_multiple_choice_response(response, question)
        assert result == "No selection"
        
        # Value not in options
        response = ['invalid_value']
        result = ResponseFormatter._format_multiple_choice_response(response, question)
        assert result == "invalid_value"
        
        # Mixed valid and invalid values
        response = ['daily', 'invalid_value']
        result = ResponseFormatter._format_multiple_choice_response(response, question)
        assert result == "Daily, invalid_value"
    
    def test_format_multiple_choice_response_without_question(self):
        """Test multiple choice formatting without question context."""
        response = ['daily', '3-4']
        result = ResponseFormatter._format_multiple_choice_response(response)
        assert result == "daily, 3-4"
        
        response = ['daily']
        result = ResponseFormatter._format_multiple_choice_response(response)
        assert result == "daily"
    
    def test_format_conditional_boolean_response_edge_cases(self):
        """Test edge cases for conditional boolean formatting."""
        # Missing boolean key
        response = {'text': 'Some text'}
        result = ResponseFormatter._format_conditional_boolean_response(response)
        assert result == "Not answered"
        
        # Empty response
        response = {}
        result = ResponseFormatter._format_conditional_boolean_response(response)
        assert result == "Not answered"
        
        # Boolean with whitespace text
        response = {'boolean': True, 'text': '   '}
        result = ResponseFormatter._format_conditional_boolean_response(response)
        assert result == "Yes"
    
    def test_format_numeric_response_edge_cases(self):
        """Test edge cases for numeric response formatting."""
        # Rating with custom min/max values
        question = AIQuestion(
            id="test",
            text="Test question",
            response_type=QuestionType.RATING,
            category=QuestionCategory.TRAINING_EXPERIENCE,
            min_value=0,
            max_value=100
        )
        response = 75
        result = ResponseFormatter._format_numeric_response(response, question)
        assert result == "75/100 rating"
        
        # Slider with zero value
        question = AIQuestion(
            id="test",
            text="Test question",
            response_type=QuestionType.SLIDER,
            category=QuestionCategory.MEDICAL_HEALTH,
            unit="kg"
        )
        response = 0
        result = ResponseFormatter._format_numeric_response(response, question)
        assert result == "0 kg"
    
    def test_format_text_response_edge_cases(self):
        """Test edge cases for text response formatting."""
        # None
        result = ResponseFormatter._format_text_response(None)
        assert result == "No response"
        
        # Empty string
        result = ResponseFormatter._format_text_response("")
        assert result == "No response"
        
        # Whitespace
        result = ResponseFormatter._format_text_response("   \n\t   ")
        assert result == "No response"
        
        # Normal text
        result = ResponseFormatter._format_text_response("  Normal text  ")
        assert result == "Normal text"
    
    def test_format_responses_error_handling(self, sample_questions):
        """Test error handling in format_responses."""
        # Malformed response data
        malformed_responses = {
            'valid_question': 'valid response',
            'malformed_question': {'invalid': 'structure'}
        }
        
        # Should not crash and should handle gracefully
        result = ResponseFormatter.format_responses(malformed_responses, sample_questions)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "Q: valid_question" in result
        assert "Q: malformed_question" in result
    
    def test_format_responses_empty_inputs(self):
        """Test formatting with empty inputs."""
        # Empty responses
        result = ResponseFormatter.format_responses({})
        assert result == ""
        
        # Empty questions
        result = ResponseFormatter.format_responses({'test': 'value'}, [])
        assert "Q: test\nA: value" in result
    
    def test_format_responses_question_id_mismatch(self, sample_questions):
        """Test formatting when response keys don't match question IDs."""
        responses = {
            'unknown_question': 'some response',
            'training_frequency': ['daily']
        }
        
        result = ResponseFormatter.format_responses(responses, sample_questions)
        assert isinstance(result, str)
        assert "Q: unknown_question\nA: some response" in result
        assert "Q: How many days per week do you train?\nA: Daily" in result
    
    def test_real_world_example(self, sample_responses, sample_questions):
        """Test with real-world example data."""
        print("\n🧪 Testing ResponseFormatter with real-world example:")
        print("=" * 60)
        
        # Test with question context
        result_with_context = ResponseFormatter.format_responses(sample_responses, sample_questions)
        print("✅ WITH Question Context:")
        print(result_with_context)
        
        # Test without question context
        result_without_context = ResponseFormatter.format_responses(sample_responses)
        print("\n⚠️  WITHOUT Question Context:")
        print(result_without_context)
        
        # Verify both results are valid
        assert isinstance(result_with_context, str)
        assert isinstance(result_without_context, str)
        assert len(result_with_context) > len(result_without_context)  # With context should be more detailed


class TestResponseFormatterEdgeCases:
    """Test edge cases and error scenarios for ResponseFormatter."""
    
    def test_very_long_responses(self):
        """Test handling of very long responses."""
        long_text = "A" * 1000
        responses = {'long_response': long_text}
        
        result = ResponseFormatter.format_responses(responses)
        assert isinstance(result, str)
        assert long_text in result
    
    def test_special_characters_in_responses(self):
        """Test handling of special characters in responses."""
        special_responses = {
            'unicode': 'café naïve résumé',
            'symbols': '!@#$%^&*()_+-=[]{}|;:\'",./<>?',
            'newlines': 'Line 1\nLine 2\nLine 3',
            'tabs': 'Column1\tColumn2\tColumn3'
        }
        
        result = ResponseFormatter.format_responses(special_responses)
        assert isinstance(result, str)
        for key, value in special_responses.items():
            assert f"Q: {key}\nA: {value}" in result
    
    def test_numeric_edge_cases(self):
        """Test numeric response edge cases."""
        numeric_responses = {
            'zero': 0,
            'negative': -5,
            'float': 3.14159,
            'large_number': 999999999,
            'scientific': 1e6
        }
        
        result = ResponseFormatter.format_responses(numeric_responses)
        assert isinstance(result, str)
        assert "Q: zero\nA: 0" in result
        assert "Q: negative\nA: -5" in result
        assert "Q: float\nA: 3.14159" in result
    
    def test_boolean_edge_cases(self):
        """Test boolean response edge cases."""
        boolean_responses = {
            'true_boolean': True,
            'false_boolean': False,
            'true_string': 'true',
            'false_string': 'false',
            'one': 1,
            'zero': 0
        }
        
        result = ResponseFormatter.format_responses(boolean_responses)
        assert isinstance(result, str)
        assert "Q: true_boolean\nA: True" in result
        assert "Q: false_boolean\nA: False" in result
        assert "Q: true_string\nA: true" in result
        assert "Q: false_string\nA: false" in result
        assert "Q: one\nA: 1" in result
        assert "Q: zero\nA: 0" in result
    
    def test_list_edge_cases(self):
        """Test list response edge cases."""
        list_responses = {
            'empty_list': [],
            'single_item': ['item'],
            'multiple_items': ['item1', 'item2', 'item3'],
            'mixed_types': ['string', 123, True, None],
            'nested_lists': [['nested1'], ['nested2']]
        }
        
        result = ResponseFormatter.format_responses(list_responses)
        assert isinstance(result, str)
        assert "Q: empty_list\nA: []" in result
        assert "Q: single_item\nA: [item]" in result
        assert "Q: multiple_items\nA: [item1, item2, item3]" in result
    
    def test_none_and_empty_values(self):
        """Test handling of None and empty values."""
        empty_responses = {
            'none_value': None,
            'empty_string': '',
            'empty_list': [],
            'empty_dict': {},
            'whitespace': '   '
        }
        
        result = ResponseFormatter.format_responses(empty_responses)
        assert isinstance(result, str)
        assert "Q: none_value\nA: No response" in result
        assert "Q: empty_string\nA: No response" in result
        assert "Q: empty_list\nA: []" in result
        assert "Q: empty_dict\nA: {}" in result
        assert "Q: whitespace\nA: No response" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
