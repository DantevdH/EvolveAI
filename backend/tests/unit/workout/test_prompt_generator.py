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

from core.workout.prompt_generator import WorkoutPromptGenerator


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
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            },
            {
                "id": "2",
                "name": "Bench Press",
                "main_muscle": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            },
            {
                "id": "3",
                "name": "Deadlift",
                "main_muscle": "Back",
                "difficulty": "Advanced",
                "equipment": "Barbell",
                "force": "Compound"
            },
            {
                "id": "4",
                "name": "Push-ups",
                "main_muscle": "Chest",
                "difficulty": "Beginner",
                "equipment": "Body Weight",
                "force": "Compound"
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
        
        # Should contain muscle groups
        assert "THIGHS:" in prompt
        assert "CHEST:" in prompt
        assert "BACK:" in prompt
        
        # Should contain critical guidelines
        assert "Safety First" in prompt
        assert "Goal-Focused" in prompt
        assert "Equipment Constraints" in prompt
        assert "Progressive Structure" in prompt
        assert "Exercise Authenticity" in prompt
        
        # Should contain exercise usage rules
        assert "You MUST only use exercises from the above list" in prompt
        assert "Reference exercises by their exact ID" in prompt
        assert "Do NOT create new exercise names" in prompt
        
        # Should contain exercise requirements
        assert "Training days should match the user's requested frequency" in prompt
        assert "Remaining days should be rest days" in prompt
        assert "Reps must be a list of integers matching the number of sets" in prompt
        assert "exercise_id field from the provided list" in prompt

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
        
        # Should contain safety guidelines
        assert "Safety First" in prompt
        assert "Respect stated limitations" in prompt

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
        
        # Should contain muscle groups
        assert "THIGHS:" in exercise_section
        assert "CHEST:" in exercise_section
        assert "BACK:" in exercise_section
        
        # Should contain exercise details
        assert "ID: 1 | Barbell Squat (Intermediate, Barbell, Compound)" in exercise_section
        assert "ID: 2 | Bench Press (Intermediate, Barbell, Compound)" in exercise_section
        assert "ID: 3 | Deadlift (Advanced, Barbell, Compound)" in exercise_section
        assert "ID: 4 | Push-ups (Beginner, Body Weight, Compound)" in exercise_section
        
        # Should contain total count
        assert "Total Available Exercises: 4" in exercise_section
        
        # Should contain important note
        assert "IMPORTANT: Only use exercises from this list. Reference by ID." in exercise_section

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
                "difficulty": "Unknown",  # Provide default
                "equipment": "Unknown",   # Provide default
                "force": "Unknown"        # Default value
            },
            {
                "id": "2",
                "name": "Exercise 2",
                "main_muscle": "Chest",
                "difficulty": "Unknown",  # Provide default
                "equipment": "Unknown",   # Provide default
                "force": "Unknown"        # Default value
            }
        ]
        
        exercise_section = prompt_generator._build_exercise_selection_section(incomplete_exercises)
        
        # Should handle missing fields gracefully
        assert "Exercise 1" in exercise_section
        assert "Exercise 2" in exercise_section
        assert "Unknown" in exercise_section  # Default for missing fields

    def test_create_exercise_recommendation_prompt(self, prompt_generator, sample_exercise_candidates):
        """Test creating exercise recommendation prompt."""
        muscle_group = "Chest"
        difficulty = "Intermediate"
        equipment = ["Barbell", "Dumbbell"]
        
        prompt = prompt_generator.create_exercise_recommendation_prompt(
            muscle_group, difficulty, equipment, sample_exercise_candidates
        )
        
        # Should be a string
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        
        # Should contain requirements
        assert "Muscle Group: Chest" in prompt
        assert "Difficulty Level: Intermediate" in prompt
        assert "Available Equipment: Barbell, Dumbbell" in prompt
        
        # Should contain recommendation rules
        assert "Select 5-8 exercises that best match the criteria" in prompt
        assert "Prioritize exercises that target the specified muscle group" in prompt
        assert "Consider the user's difficulty level" in prompt
        assert "Only use exercises from the provided list" in prompt
        
        # Should contain output format
        assert "Exercise ID (from the provided list)" in prompt
        assert "Exercise name" in prompt
        assert "Brief explanation of why it's recommended" in prompt
        assert "Suggested sets and reps" in prompt
        
        # Should contain exercise list
        assert "AVAILABLE EXERCISES (You MUST only use these):" in prompt

    def test_create_exercise_recommendation_prompt_empty_equipment(self, prompt_generator, sample_exercise_candidates):
        """Test creating exercise recommendation prompt with empty equipment list."""
        muscle_group = "Chest"
        difficulty = "Beginner"
        equipment = []
        
        prompt = prompt_generator.create_exercise_recommendation_prompt(
            muscle_group, difficulty, equipment, sample_exercise_candidates
        )
        
        # Should handle empty equipment gracefully
        assert "Available Equipment: " in prompt  # Empty string

    def test_create_workout_modification_prompt(self, prompt_generator, sample_exercise_candidates):
        """Test creating workout modification prompt."""
        current_workout = {
            "title": "Current Workout Plan",
            "weeks": [
                {
                    "days": [
                        {
                            "day_name": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {"name": "Barbell Squat", "sets": 3, "reps": [8, 8, 8]},
                                {"name": "Bench Press", "sets": 3, "reps": [8, 8, 8]}
                            ]
                        },
                        {
                            "day_name": "Tuesday",
                            "is_rest_day": True,
                            "exercises": []
                        }
                    ]
                }
            ]
        }
        
        user_feedback = "I want to add more leg exercises and reduce chest work"
        
        prompt = prompt_generator.create_workout_modification_prompt(
            current_workout, user_feedback, sample_exercise_candidates
        )
        
        # Should be a string
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        
        # Should contain current workout
        assert "CURRENT WORKOUT:" in prompt
        assert "Current Workout Plan" in prompt
        assert "Number of weeks: 1" in prompt
        assert "Monday: 2 exercises" in prompt
        assert "Tuesday: Rest day" in prompt
        
        # Should contain user feedback
        assert "I want to add more leg exercises and reduce chest work" in prompt
        
        # Should contain available exercises
        assert "AVAILABLE EXERCISES FOR MODIFICATIONS:" in prompt
        
        # Should contain modification rules
        assert "Only use exercises from the provided list" in prompt
        assert "Maintain the workout structure and goals" in prompt
        assert "Address the user's specific feedback" in prompt
        assert "Keep exercises appropriate for the user's level" in prompt
        assert "Ensure all exercises have valid exercise_ids" in prompt
        
        # Should contain output format
        assert "Return the modified workout plan with the same structure as the original" in prompt
        assert "Highlight any changes made and explain the reasoning" in prompt

    def test_create_workout_modification_prompt_empty_workout(self, prompt_generator, sample_exercise_candidates):
        """Test creating workout modification prompt with empty workout."""
        current_workout = {}
        user_feedback = "Create a new workout plan"
        
        prompt = prompt_generator.create_workout_modification_prompt(
            current_workout, user_feedback, sample_exercise_candidates
        )
        
        # Should handle empty workout gracefully
        assert "CURRENT WORKOUT:" in prompt
        assert "Untitled Workout" in prompt  # Default title
        assert "Number of weeks: 0" in prompt

    def test_format_workout_for_prompt_complete_workout(self, prompt_generator):
        """Test formatting complete workout for prompt."""
        workout = {
            "title": "Test Workout Plan",
            "weeks": [
                {
                    "days": [
                        {
                            "day_name": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {"name": "Exercise 1", "sets": 3, "reps": [8, 8, 8]},
                                {"name": "Exercise 2", "sets": 3, "reps": [8, 8, 8]},
                                {"name": "Exercise 3", "sets": 3, "reps": [8, 8, 8]},
                                {"name": "Exercise 4", "sets": 3, "reps": [8, 8, 8]}
                            ]
                        },
                        {
                            "day_name": "Tuesday",
                            "is_rest_day": True,
                            "exercises": []
                        }
                    ]
                }
            ]
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should be a string
        assert isinstance(formatted, str)
        assert len(formatted) > 0
        
        # Should contain workout information
        assert "Title: Test Workout Plan" in formatted
        assert "Number of weeks: 1" in formatted
        
        # Should contain day information
        assert "Week 1:" in formatted
        assert "Monday: 4 exercises" in formatted
        assert "Tuesday: Rest day" in formatted
        
        # Should show first 3 exercises
        assert "Exercise 1" in formatted
        assert "Exercise 2" in formatted
        assert "Exercise 3" in formatted
        
        # Should indicate more exercises
        assert "... and 1 more" in formatted

    def test_format_workout_for_prompt_workout_with_many_exercises(self, prompt_generator):
        """Test formatting workout with many exercises (truncation)."""
        workout = {
            "title": "High Volume Workout",
            "weeks": [
                {
                    "days": [
                        {
                            "day_name": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {"name": f"Exercise {i}", "sets": 3, "reps": [8, 8, 8]}
                                for i in range(1, 11)  # 10 exercises
                            ]
                        }
                    ]
                }
            ]
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should show first 3 exercises
        assert "Exercise 1" in formatted
        assert "Exercise 2" in formatted
        assert "Exercise 3" in formatted
        
        # Should indicate more exercises
        assert "... and 7 more" in formatted

    def test_format_workout_for_prompt_missing_fields(self, prompt_generator):
        """Test formatting workout with missing fields."""
        workout = {
            "title": "Incomplete Workout",
            "weeks": [
                {
                    "days": [
                        {
                            "is_rest_day": False,  # Missing day_name
                            "exercises": [
                                {"name": "Exercise 1"}  # Missing sets and reps
                            ]
                        }
                    ]
                }
            ]
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should handle missing fields gracefully
        assert "Title: Incomplete Workout" in formatted
        assert "Day 1: 1 exercises" in formatted  # Default day name
        assert "Exercise 1" in formatted

    def test_format_workout_for_prompt_error_handling(self, prompt_generator):
        """Test formatting workout with error handling."""
        # Create a workout that will cause an error
        workout = {
            "title": "Problematic Workout",
            "weeks": None  # This will cause an error
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should return error message
        assert "Error formatting workout:" in formatted
        assert "NoneType" in formatted

    def test_format_workout_for_prompt_empty_weeks(self, prompt_generator):
        """Test formatting workout with empty weeks."""
        workout = {
            "title": "Empty Workout",
            "weeks": []
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should handle empty weeks gracefully
        assert "Title: Empty Workout" in formatted
        assert "Number of weeks: 0" in formatted

    def test_format_workout_for_prompt_missing_exercises(self, prompt_generator):
        """Test formatting workout with missing exercises array."""
        workout = {
            "title": "Missing Exercises",
            "weeks": [
                {
                    "days": [
                        {
                            "day_name": "Monday",
                            "is_rest_day": False
                            # Missing exercises array
                        }
                    ]
                }
            ]
        }
        
        formatted = prompt_generator._format_workout_for_prompt(workout)
        
        # Should handle missing exercises gracefully
        assert "Title: Missing Exercises" in formatted
        assert "Monday: 0 exercises" in formatted  # Default to 0


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

    def test_build_exercise_selection_section_large_exercise_list(self, prompt_generator_edge_cases):
        """Test building exercise selection section with large exercise list."""
        # Create a large list of exercises
        large_exercise_list = [
            {
                "id": str(i),
                "name": f"Exercise {i}",
                "main_muscle": f"Muscle {i % 5}",  # 5 different muscle groups
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            }
            for i in range(1, 101)  # 100 exercises
        ]
        
        exercise_section = prompt_generator_edge_cases._build_exercise_selection_section(large_exercise_list)
        
        # Should handle large lists gracefully
        assert "Total Available Exercises: 100" in exercise_section
        assert "MUSCLE 0:" in exercise_section
        assert "MUSCLE 1:" in exercise_section
        assert "MUSCLE 2:" in exercise_section
        assert "MUSCLE 3:" in exercise_section
        assert "MUSCLE 4:" in exercise_section

    def test_build_exercise_selection_section_mixed_case_muscles(self, prompt_generator_edge_cases):
        """Test building exercise selection section with mixed case muscle names."""
        exercises = [
            {
                "id": "1",
                "name": "Exercise 1",
                "main_muscle": "Chest",
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            },
            {
                "id": "2",
                "name": "Exercise 2",
                "main_muscle": "chest",  # Lowercase
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            },
            {
                "id": "3",
                "name": "Exercise 3",
                "main_muscle": "CHEST",  # Uppercase
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "force": "Compound"
            }
        ]
        
        exercise_section = prompt_generator_edge_cases._build_exercise_selection_section(exercises)
        
        # The method converts all muscle names to uppercase for consistency
        assert "CHEST:" in exercise_section
        
        # Should have separate sections for each case variation (all converted to uppercase)
        assert exercise_section.count("**CHEST:**") == 3  # Three separate chest sections
        
        # Should contain all exercises
        assert "Exercise 1" in exercise_section
        assert "Exercise 2" in exercise_section
        assert "Exercise 3" in exercise_section

    def test_format_workout_for_prompt_deep_nesting(self, prompt_generator_edge_cases):
        """Test formatting workout with deep nesting."""
        workout = {
            "title": "Deep Nested Workout",
            "weeks": [
                {
                    "days": [
                        {
                            "day_name": f"Day {i}",
                            "is_rest_day": i % 2 == 0,  # Alternate rest days
                            "exercises": [
                                {
                                    "name": f"Exercise {i}_{j}",
                                    "sets": 3,
                                    "reps": [8, 8, 8]
                                }
                                for j in range(1, 6)  # 5 exercises per day
                            ]
                        }
                        for i in range(1, 8)  # 7 days
                    ]
                }
                for week in range(1, 5)  # 4 weeks
            ]
        }
        
        formatted = prompt_generator_edge_cases._format_workout_for_prompt(workout)
        
        # Should handle deep nesting gracefully
        assert "Title: Deep Nested Workout" in formatted
        assert "Number of weeks: 4" in formatted
        assert "Week 1:" in formatted
        assert "Week 2:" in formatted
        assert "Week 3:" in formatted
        assert "Week 4:" in formatted


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
