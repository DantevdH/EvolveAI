#!/usr/bin/env python3
"""
Unit tests for WorkoutPromptGenerator component.

This module tests the WorkoutPromptGenerator in isolation to ensure
comprehensive coverage of prompt creation logic for workout plans,
exercise recommendations, and workout modifications.
"""

import pytest
from unittest.mock import Mock, MagicMock
from typing import List, Dict, Any
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.fitness.helpers.prompt_generator import WorkoutPromptGenerator


class TestWorkoutPromptGenerator:
    """Unit tests for WorkoutPromptGenerator component."""
    
    @pytest.fixture
    def prompt_generator(self):
        """Create a WorkoutPromptGenerator instance for testing."""
        return WorkoutPromptGenerator()
    
    @pytest.fixture
    def mock_user_profile(self):
        """Create a mock user profile for testing."""
        profile = Mock()
        profile.primary_goal = "Strength Training"
        profile.primary_goal_description = "Build muscle and increase strength"
        profile.experience_level = "Intermediate"
        profile.days_per_week = 4
        profile.minutes_per_session = 60
        profile.equipment = "Home Gym"
        profile.age = 28
        profile.gender = "male"
        profile.height = 180.0
        profile.height_unit = "cm"
        profile.has_limitations = False
        profile.limitations_description = ""
        profile.final_chat_notes = "Focus on compound movements"
        return profile
    
    @pytest.fixture
    def sample_exercise_candidates(self):
        """Create sample exercise candidates for testing."""
        return [
            {
                "id": "1",
                "name": "Barbell Squat",
                "main_muscle": "Thighs",
                "target_area": "Thighs",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "foundational"
            },
            {
                "id": "2",
                "name": "Bench Press",
                "main_muscle": "Chest",
                "target_area": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "foundational"
            },
            {
                "id": "3",
                "name": "Deadlift",
                "main_muscle": "Back",
                "target_area": "Back",
                "difficulty": "Advanced",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "foundational"
            },
            {
                "id": "4",
                "name": "Push-ups",
                "main_muscle": "Chest",
                "target_area": "Chest",
                "difficulty": "Beginner",
                "equipment": "Body Weight",
                "force": "Compound",
                "exercise_tier": "standard"
            }
        ]

    def test_prompt_generator_initialization(self, prompt_generator):
        """Test WorkoutPromptGenerator initialization."""
        assert isinstance(prompt_generator, WorkoutPromptGenerator)

    def test_create_initial_plan_prompt_with_exercises(self, prompt_generator, mock_user_profile, sample_exercise_candidates):
        """Test creating initial plan prompt with exercise candidates."""
        prompt = prompt_generator.create_initial_plan_prompt(mock_user_profile, sample_exercise_candidates)
        
        # Should be a string
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        
        # Should contain user profile information
        assert "Strength Training" in prompt
        assert "Intermediate" in prompt
        assert "4 days per week" in prompt
        assert "60 minutes per session" in prompt
        assert "Home Gym" in prompt
        assert "28 years old" in prompt
        assert "male" in prompt
        assert "180.0 cm" in prompt
        
        # Should contain exercise information
        assert "Barbell Squat" in prompt
        assert "Bench Press" in prompt
        assert "Deadlift" in prompt
        assert "Push-ups" in prompt
        
        # Should contain exercise IDs
        assert "ID: 1" in prompt
        assert "ID: 2" in prompt
        assert "ID: 3" in prompt
        assert "ID: 4" in prompt
        
        # Should contain critical guidelines
        assert "CRITICAL GUIDELINES:" in prompt
        assert "Equipment Constraints" in prompt
        assert "Progressive Structure" in prompt
        assert "Exercise Authenticity" in prompt
        assert "Program Duration" in prompt
        
        # Should contain exercise usage rules
        assert "No duplicate exercise names in the same workout" in prompt
        assert "Each exercise must have a valid exercise_id" in prompt
        
        # Should contain exercise requirements
        assert "Training days should match the user's requested frequency" in prompt
        assert "Remaining days should be rest days" in prompt
        assert "Reps must be a list of integers matching the number of sets" in prompt
        assert "You only need to specify: exercise_id, sets, reps, weight_1rm an description" in prompt
        assert "ALWAYS provide the weight as percentage of 1RM (weight_1rm)" in prompt
        assert "Follow the inverse relationship principle" in prompt
        assert "For training days, provide specific warming_up_instructions" in prompt
        assert "For training days, provide specific cooling_down_instructions" in prompt
        
        # Should contain justification requirements
        assert "Program-Level Justification (program_justification):" in prompt
        assert "Weekly-Level Justification (weekly_justification):" in prompt
        assert "Daily-Level Justification (daily_justification):" in prompt
        
        # Should contain output format requirements
        assert "Your response must include multiple weeks (not just 1 week)" in prompt
        assert "Generate a program with at least 4 weeks" in prompt
        
    def test_create_initial_plan_prompt_without_exercises(self, prompt_generator, mock_user_profile):
        """Test creating initial plan prompt without exercise candidates."""
        prompt = prompt_generator.create_initial_plan_prompt(mock_user_profile, None)
        
        # Should be a string
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        
        # Should contain user profile information
        assert "Strength Training" in prompt
        assert "Intermediate" in prompt
        
        # Should contain fallback exercise message
        assert "No specific exercises provided" in prompt
        assert "You may select appropriate exercises based on the user's goals and equipment" in prompt

    def test_create_initial_plan_prompt_with_limitations(self, prompt_generator, mock_user_profile):
        """Test creating initial plan prompt with user limitations."""
        # Set limitations
        mock_user_profile.has_limitations = True
        mock_user_profile.limitations_description = "Lower back pain, avoid heavy deadlifts"
        
        prompt = prompt_generator.create_initial_plan_prompt(mock_user_profile, [])
        
        # Should contain limitations
        assert "Yes: Lower back pain, avoid heavy deadlifts" in prompt
    

    def test_create_initial_plan_prompt_without_limitations(self, prompt_generator, mock_user_profile):
        """Test creating initial plan prompt without user limitations."""
        # Ensure no limitations
        mock_user_profile.has_limitations = False
        mock_user_profile.limitations_description = ""
        
        prompt = prompt_generator.create_initial_plan_prompt(mock_user_profile, [])
        
        # Should contain no limitations message
        assert "No limitations reported" in prompt

    def test_create_initial_plan_prompt_without_chat_notes(self, prompt_generator, mock_user_profile):
        """Test creating initial plan prompt without final chat notes."""
        # Remove chat notes
        mock_user_profile.final_chat_notes = None
        
        prompt = prompt_generator.create_initial_plan_prompt(mock_user_profile, [])
        
        # Should contain fallback for chat notes
        assert "None provided" in prompt

    def test_build_exercise_selection_section_with_exercises(self, prompt_generator, sample_exercise_candidates):
        """Test building exercise selection section with exercise candidates."""
        exercise_section = prompt_generator._build_exercise_selection_section(sample_exercise_candidates)
        
        # Should be a string
        assert isinstance(exercise_section, str)
        assert len(exercise_section) > 0
        
        # Should contain exercise list header
        assert "AVAILABLE EXERCISES (You MUST only use these):" in exercise_section
    
        # Should contain exercise details
        assert "ID: 1 | Barbell Squat (Intermediate, Barbell, foundational)" in exercise_section
        assert "ID: 2 | Bench Press (Intermediate, Barbell, foundational)" in exercise_section
        assert "ID: 3 | Deadlift (Advanced, Barbell, foundational)" in exercise_section
        assert "ID: 4 | Push-ups (Beginner, Body Weight, standard)" in exercise_section
        
        # Should contain important note
        assert "AVAILABLE EXERCISES (You MUST only use these):" in exercise_section

    def test_build_exercise_selection_section_without_exercises(self, prompt_generator):
        """Test building exercise selection section without exercise candidates."""
        exercise_section = prompt_generator._build_exercise_selection_section(None)
        
        # Should be a string
        assert isinstance(exercise_section, str)
        assert len(exercise_section) > 0
        
        # Should contain fallback message
        assert "No specific exercises provided" in exercise_section
        assert "You may select appropriate exercises based on the user's goals and equipment" in exercise_section

    def test_build_exercise_selection_section_empty_list(self, prompt_generator):
        """Test building exercise selection section with empty exercise list."""
        exercise_section = prompt_generator._build_exercise_selection_section([])
        
        # Should be a string
        assert isinstance(exercise_section, str)
        assert len(exercise_section) > 0
        
        # Should contain fallback message
        assert "No specific exercises provided" in exercise_section

    def test_build_exercise_selection_section_missing_fields(self, prompt_generator):
        """Test building exercise selection section with missing exercise fields."""
        incomplete_exercises = [
            {
                "id": "1",
                "name": "Exercise 1",
                "main_muscle": "Other",  # Default value
                "target_area": "Other",
                "difficulty": "Unknown",  # Provide default
                "equipment": "Unknown",   # Provide default
                "force": "Unknown",        # Default value
                "exercise_tier": "unknown"
            },
            {
                "id": "2",
                "name": "Exercise 2",
                "main_muscle": "Chest",
                "target_area": "Chest",
                "difficulty": "Unknown",  # Provide default
                "equipment": "Unknown",   # Provide default
                "force": "Unknown",        # Default value
                "exercise_tier": "unknown"
            }
        ]
        
        exercise_section = prompt_generator._build_exercise_selection_section(incomplete_exercises)
        
        # Should handle missing fields gracefully
        assert "Exercise 1" in exercise_section
        assert "Exercise 2" in exercise_section


class TestWorkoutPromptGeneratorEdgeCases:
    """Test edge cases and error scenarios for WorkoutPromptGenerator."""
    
    @pytest.fixture
    def prompt_generator_edge_cases(self):
        """Create prompt generator for edge case testing."""
        return WorkoutPromptGenerator()
    
    def test_create_initial_plan_prompt_extreme_values(self, prompt_generator_edge_cases):
        """Test creating initial plan prompt with extreme values."""
        profile = Mock()
        profile.primary_goal = "Ultra Marathon Training"
        profile.primary_goal_description = "Very long description " * 10  # Very long description
        profile.experience_level = "Elite"
        profile.days_per_week = 7
        profile.minutes_per_session = 180
        profile.equipment = "Full Gym with Olympic Lifting Platform"
        profile.age = 18
        profile.gender = "non-binary"
        profile.height = 200.0
        profile.height_unit = "cm"
        profile.has_limitations = False
        profile.limitations_description = ""
        profile.final_chat_notes = ""
        
        prompt = prompt_generator_edge_cases.create_initial_plan_prompt(profile, [])
        
        # Should handle extreme values gracefully
        assert "Ultra Marathon Training" in prompt
        assert "Elite" in prompt
        assert "7 days per week" in prompt
        assert "180 minutes per session" in prompt
        assert "Full Gym with Olympic Lifting Platform" in prompt
        assert "18 years old" in prompt
        assert "non-binary" in prompt
        assert "200.0 cm" in prompt

    def test_build_exercise_selection_section_mixed_case_muscles(self, prompt_generator_edge_cases):
        """Test building exercise selection section with mixed case muscle names."""
        exercises = [
            {
                "id": "1",
                "name": "Exercise 1",
                "main_muscle": "Chest",
                "target_area": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "foundational"
            },
            {
                "id": "2",
                "name": "Exercise 2",
                "main_muscle": "chest",  # Lowercase
                "target_area": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "standard"
            },
            {
                "id": "3",
                "name": "Exercise 3",
                "main_muscle": "CHEST",  # Uppercase
                "target_area": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound",
                "exercise_tier": "variety"
            }
        ]
        
        exercise_section = prompt_generator_edge_cases._build_exercise_selection_section(exercises)
        
        
        # Should contain all exercises
        assert "Exercise 1" in exercise_section
        assert "Exercise 2" in exercise_section
        assert "Exercise 3" in exercise_section


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
