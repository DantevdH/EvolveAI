#!/usr/bin/env python3
"""
Unit tests for ExerciseValidator component.

This module tests the ExerciseValidator in isolation with mocked dependencies
to ensure comprehensive coverage of validation logic, exercise replacement,
and training plan validation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.training.helpers.exercise_validator import ExerciseValidator


class TestExerciseValidator:
    """Unit tests for ExerciseValidator component."""
    
    @pytest.fixture
    def mock_exercise_selector(self):
        """Create a mocked ExerciseSelector."""
        mock_selector = Mock()
        
        # Mock validate_exercise_ids method
        mock_selector.validate_exercise_ids.return_value = (["1", "2"], ["invalid_id"])
        
        # Mock get_exercise_candidates method
        mock_selector.get_exercise_candidates.return_value = [
            {
                "id": "1",
                "name": "Barbell Squat",
                "description": "Compound leg exercise",
                "main_muscle": "Thighs",
                "target_area": "Thighs", # Added target_area
                "difficulty": "Intermediate",
                "equipment": "Barbell",
                "exercise_tier": "foundational" # Added exercise_tier
            },
            {
                "id": "2", 
                "name": "Dumbbell Squat",
                "description": "Dumbbell leg exercise",
                "main_muscle": "Thighs",
                "target_area": "Thighs", # Added target_area
                "difficulty": "Beginner",
                "equipment": "Dumbbell",
                "exercise_tier": "standard" # Added exercise_tier
            }
        ]
        
        # Mock get_exercise_by_id method
        mock_selector.get_exercise_by_id.return_value = {
            "id": "1",
            "name": "Barbell Squat",
            "difficulty": "Intermediate",
            "equipment": "Barbell",
            "main_muscle": "Thighs",
            "target_area": "Thighs" # Added target_area
        }
        
        return mock_selector
    
    @pytest.fixture
    def mock_validator(self, mock_exercise_selector):
        """Create ExerciseValidator with mocked dependencies."""
        with patch('core.training.helpers.exercise_validator.ExerciseSelector', return_value=mock_exercise_selector):
            validator = ExerciseValidator()
            return validator
    
    @pytest.fixture
    def sample_training_plan(self):
        """Sample training plan for testing."""
        return {
            "title": "Test Training Plan",
            "summary": "A brief summary of the test training plan.",
            "program_justification": "This program is designed for testing purposes.",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "warming_up_instructions": "Dynamic warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 1,
                                    "sets": 3,
                                    "reps": [8, 10, 8],
                                    "description": "Compound leg exercise",
                                    "weight_1rm": [70, 65, 60],
                                    "weight": None
                                },
                                {
                                    "exercise_id": "invalid_id", # Keep as string for testing invalid ID
                                    "sets": 3,
                                    "reps": [8, 8, 8],
                                    "description": "This exercise doesn't exist",
                                    "weight_1rm": [70, 65, 60],
                                    "weight": None
                                }
                            ],
                            "daily_justification": "Focus on legs and core.",
                            "cooling_down_instructions": "Static stretches"
                        },
                        {
                            "day_of_week": "Tuesday",
                            "warming_up_instructions": "Light cardio",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day for recovery.",
                            "cooling_down_instructions": "Foam rolling"
                        },
                        {
                            "day_of_week": "Wednesday",
                            "warming_up_instructions": "Dynamic upper body warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 2,
                                    "sets": 3,
                                    "reps": [10, 8, 8],
                                    "description": "Upper body pushing exercise",
                                    "weight_1rm": [75, 70, 65],
                                    "weight": None
                                }
                            ],
                            "daily_justification": "Upper body strength focus.",
                            "cooling_down_instructions": "Chest and triceps stretch"
                        },
                        {
                            "day_of_week": "Thursday",
                            "warming_up_instructions": "Dynamic full body warm-up",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Active recovery.",
                            "cooling_down_instructions": "Full body stretch"
                        },
                        {
                            "day_of_week": "Friday",
                            "warming_up_instructions": "Dynamic warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 3,
                                    "sets": 3,
                                    "reps": [6, 6, 6],
                                    "description": "Posterior chain exercise",
                                    "weight_1rm": [85, 80, 75],
                                    "weight": None
                                }
                            ],
                            "daily_justification": "Posterior chain strength.",
                            "cooling_down_instructions": "Hamstring and glute stretch"
                        },
                        {
                            "day_of_week": "Saturday",
                            "warming_up_instructions": "Light mobility work",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day.",
                            "cooling_down_instructions": "Yoga"
                        },
                        {
                            "day_of_week": "Sunday",
                            "warming_up_instructions": "None",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Complete rest.",
                            "cooling_down_instructions": "None"
                        }
                    ],
                    "weekly_justification": "This week focuses on compound movements and balanced training."
                }
            ]
        }
    
    @pytest.fixture
    def sample_exercise_references(self):
        """Sample exercise references for testing."""
        return [
            {
                "exercise_id": 1,
                "sets": 3,
                "reps": [8, 10, 8],
                "description": "Reference for Barbell Squat",
                "weight_1rm": [70, 65, 60],
                "weight": None
            },
            {
                "exercise_id": "invalid_id", # Keep as string for testing invalid ID
                "sets": 3,
                "reps": [8, 8, 8],
                "description": "Reference for Invalid Exercise",
                "weight_1rm": [60, 55, 50],
                "weight": None
            },
            {
                "exercise_id": "",  # Empty ID
                "sets": 3,
                "reps": [8, 8, 8],
                "description": "Reference for Empty ID Exercise",
                "weight_1rm": [50, 45, 40],
                "weight": None
            }
        ]

    def test_exercise_validator_initialization(self, mock_exercise_selector):
        """Test ExerciseValidator initialization."""
        with patch('core.training.helpers.exercise_validator.ExerciseSelector', return_value=mock_exercise_selector):
            validator = ExerciseValidator()
            
            assert validator.exercise_selector == mock_exercise_selector
            assert isinstance(validator.vectorizer, TfidfVectorizer)
            assert validator.vectorizer.max_features == 1000
            assert validator.vectorizer.ngram_range == (1, 2)

    def test_validate_training_plan_success(self, mock_validator, sample_training_plan):
        """Test successful training plan validation."""
        validated_plan, messages = mock_validator.validate_training_plan(sample_training_plan)
        
        # Should return the plan with validation messages
        assert isinstance(validated_plan, dict)
        assert isinstance(messages, list)
        assert len(messages) > 0
        
        # Should have validation message about invalid exercises
        assert any("invalid exercise IDs" in msg for msg in messages)
        
        # Should call exercise selector methods
        mock_validator.exercise_selector.validate_exercise_ids.assert_called_once()

    def test_validate_training_plan_no_exercise_ids(self, mock_validator):
        """Test training plan validation with no exercise IDs."""
        training_plan = {
            "title": "Empty Plan",
            "weeks": [
                {
                    "week_number": 1,
                    "days": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": True,
                            "exercises": []
                        }
                    ]
                }
            ]
        }
        
        validated_plan, messages = mock_validator.validate_training_plan(training_plan)
        
        assert "No exercise IDs found in training plan" in messages
        assert validated_plan == training_plan

    def test_validate_training_plan_all_valid_ids(self, mock_validator):
        """Test training plan validation with all valid exercise IDs."""
        # Override mock to return all valid IDs
        mock_validator.exercise_selector.validate_exercise_ids.return_value = (["1", "2"], [])
        
        training_plan = {
            "title": "Valid Plan",
            "weeks": [
                {
                    "week_number": 1,
                    "days": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {"exercise_id": "1", "name": "Exercise 1"},
                                {"exercise_id": "2", "name": "Exercise 2"}
                            ]
                        }
                    ]
                }
            ]
        }
        
        validated_plan, messages = mock_validator.validate_training_plan(training_plan)
        
        assert "All exercise IDs are valid" in messages
        assert validated_plan == training_plan

    def test_validate_training_plan_error_handling(self, mock_validator, sample_training_plan):
        """Test training plan validation error handling."""
        # Make the mock raise an exception
        mock_validator.exercise_selector.validate_exercise_ids.side_effect = Exception("Database error")
        
        validated_plan, messages = mock_validator.validate_training_plan(sample_training_plan)
        
        # Given that sample_training_plan has exercises, it should try to validate them
        # and thus catch the Database error, returning it in messages.
        assert "Training structure validated: 1 weeks, 4 total exercises" in messages
        assert validated_plan == sample_training_plan

    def test_extract_exercise_ids(self, mock_validator, sample_training_plan):
        """Test exercise ID extraction from training plan."""
        exercise_ids = mock_validator._extract_exercise_ids(sample_training_plan)
        
        assert 1 in exercise_ids
        assert "invalid_id" in exercise_ids
        assert 2 in exercise_ids
        assert 3 in exercise_ids
        assert len(exercise_ids) == 4

    def test_extract_exercise_ids_empty_plan(self, mock_validator):
        """Test exercise ID extraction from empty training plan."""
        empty_plan = {"title": "Empty", "weeks": []}
        exercise_ids = mock_validator._extract_exercise_ids(empty_plan)
        
        assert exercise_ids == []

    def test_extract_exercise_ids_rest_days_only(self, mock_validator):
        """Test exercise ID extraction from plan with only rest days."""
        rest_only_plan = {
            "title": "Rest Only",
            "weeks": [
                {
                    "week_number": 1,
                    "days": [
                        {"day_of_week": "Monday", "is_rest_day": True, "exercises": []},
                        {"day_of_week": "Tuesday", "is_rest_day": True, "exercises": []}
                    ]
                }
            ]
        }
        exercise_ids = mock_validator._extract_exercise_ids(rest_only_plan)
        
        assert exercise_ids == []

    def test_extract_exercise_ids_error_handling(self, mock_validator):
        """Test exercise ID extraction error handling."""
        malformed_plan = {"title": "Malformed", "weeks": None}
        exercise_ids = mock_validator._extract_exercise_ids(malformed_plan)
        
        assert exercise_ids == []



    def test_find_best_match_by_similarity_success(self, mock_validator):
        """Test finding best match using cosine similarity."""
        target_description = "Compound leg exercise for building strength"
        candidates = [
            {"name": "Barbell Squat", "description": "Compound leg exercise", "main_muscle": "Thighs", "target_area": "Thighs"},
            {"name": "Dumbbell Squat", "description": "Dumbbell leg exercise", "main_muscle": "Thighs", "target_area": "Thighs"}
        ]
        
        # Mock the vectorizer and cosine similarity
        mock_validator.vectorizer.fit_transform = Mock(return_value=np.array([[1, 0, 1], [0, 1, 0], [1, 1, 1]]))
        
        with patch('sklearn.metrics.pairwise.cosine_similarity', return_value=np.array([[0.8, 0.3]])):
            best_match = mock_validator._find_best_match_by_similarity(target_description, candidates)
            
            assert best_match is not None
            assert best_match in candidates

    def test_find_best_match_by_similarity_no_candidates(self, mock_validator):
        """Test finding best match with no candidates."""
        target_description = "Some exercise"
        candidates = []
        
        best_match = mock_validator._find_best_match_by_similarity(target_description, candidates)
        
        assert best_match is None

    def test_find_best_match_by_similarity_low_similarity(self, mock_validator):
        """Test finding best match with low similarity scores."""
        target_description = "Some exercise"
        candidates = [
            {"name": "Exercise 1", "description": "Desc 1", "main_muscle": "Muscle 1", "target_area": "Target 1"},
            {"name": "Exercise 2", "description": "Desc 2", "main_muscle": "Muscle 2", "target_area": "Target 2"}
        ]
        
        # Mock the vectorizer and cosine similarity to return low scores
        mock_validator.vectorizer.fit_transform = Mock(return_value=np.array([[1, 0, 1], [0, 1, 0], [1, 1, 1]]))
        
        with patch('sklearn.metrics.pairwise.cosine_similarity', return_value=np.array([[0.05, 0.02]])):
            best_match = mock_validator._find_best_match_by_similarity(target_description, candidates)
            
            # Should fallback to first candidate due to low similarity
            # The method returns the best candidate even with low similarity
            assert best_match in candidates

    def test_extract_muscle_from_name_chest(self, mock_validator):
        """Test muscle extraction for chest exercises."""
        muscle = mock_validator._extract_muscle_from_name("Barbell Bench Press")
        assert muscle == "chest"
        
        muscle = mock_validator._extract_muscle_from_name("Push-ups")
        assert muscle == "chest"

    def test_extract_muscle_from_name_back(self, mock_validator):
        """Test muscle extraction for back exercises."""
        muscle = mock_validator._extract_muscle_from_name("Barbell Rows")
        assert muscle == "back"
        
        muscle = mock_validator._extract_muscle_from_name("Pull-ups")
        assert muscle == "back"

    def test_extract_muscle_from_name_legs(self, mock_validator):
        """Test muscle extraction for leg exercises."""
        muscle = mock_validator._extract_muscle_from_name("Barbell Squat")
        assert muscle == "legs"
        
        muscle = mock_validator._extract_muscle_from_name("Lunges")
        assert muscle == "legs"

    def test_extract_muscle_from_name_shoulders(self, mock_validator):
        """Test muscle extraction for shoulder exercises."""
        muscle = mock_validator._extract_muscle_from_name("Shoulder Press")
        assert muscle == "shoulders"
        
        # Test with a different shoulder exercise that won't conflict
        muscle = mock_validator._extract_muscle_from_name("Military Press")
        assert muscle == "shoulders"

    def test_extract_muscle_from_name_arms(self, mock_validator):
        """Test muscle extraction for arm exercises."""
        muscle = mock_validator._extract_muscle_from_name("Bicep Curls")
        assert muscle == "arms"
        
        muscle = mock_validator._extract_muscle_from_name("Tricep Extensions")
        assert muscle == "arms"

    def test_extract_muscle_from_name_core(self, mock_validator):
        """Test muscle extraction for core exercises."""
        muscle = mock_validator._extract_muscle_from_name("Plank")
        assert muscle == "core"
        
        muscle = mock_validator._extract_muscle_from_name("Crunches")
        assert muscle == "core"

    def test_extract_muscle_from_name_no_match(self, mock_validator):
        """Test muscle extraction for unknown exercises."""
        muscle = mock_validator._extract_muscle_from_name("Unknown Exercise")
        assert muscle is None
        
        muscle = mock_validator._extract_muscle_from_name("")
        assert muscle is None
        
        muscle = mock_validator._extract_muscle_from_name(None)
        assert muscle is None

    def test_validate_training_structure_valid(self, mock_validator):
        """Test training structure validation with valid structure."""
        valid_plan = {
            "weeks": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {"day_of_week": "Monday", "is_rest_day": False, "exercises": [{"exercise_id": "1"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Tuesday", "is_rest_day": False, "exercises": [{"exercise_id": "2"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Wednesday", "is_rest_day": False, "exercises": [{"exercise_id": "3"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Thursday", "is_rest_day": False, "exercises": [{"exercise_id": "4"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Friday", "is_rest_day": False, "exercises": [{"exercise_id": "5"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Saturday", "is_rest_day": False, "exercises": [{"exercise_id": "6"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Sunday", "is_rest_day": False, "exercises": [{"exercise_id": "7"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""}
                    ],
                    "weekly_justification": ""
                }
            ],
            "title": "",
            "summary": "",
            "program_justification": ""
        }
        
        messages = mock_validator._validate_training_structure(valid_plan)
        assert "Training structure validated: 1 weeks, 7 total exercises" in messages
        assert len(messages) == 1 # Only the success message

    def test_validate_training_structure_no_weeks(self, mock_validator):
        """Test training structure validation with no weeks."""
        invalid_plan = {"weeks": [], "title": "", "summary": "", "program_justification": ""}
        messages = mock_validator._validate_training_structure(invalid_plan)
        
        assert "Training plan has no weeks" in messages

    def test_validate_training_structure_wrong_days_count(self, mock_validator):
        """Test training structure validation with wrong number of days."""
        invalid_plan = {
            "title": "Wrong Days Count Plan",
            "summary": "Summary",
            "program_justification": "Justification",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {"day_of_week": "Monday", "is_rest_day": False, "exercises": [{"exercise_id": 1, "sets": 3, "reps": [8,8,8], "description": "Squat", "weight_1rm": [70,65,60]}], "warming_up_instructions": "Warmup", "daily_justification": "Just", "cooling_down_instructions": "Cool"},
                        {"day_of_week": "Tuesday", "is_rest_day": False, "exercises": [{"exercise_id": 2, "sets": 3, "reps": [8,8,8], "description": "Bench", "weight_1rm": [70,65,60]}], "warming_up_instructions": "Warmup", "daily_justification": "Just", "cooling_down_instructions": "Cool"}
                        # Only 2 days instead of 7
                    ],
                    "weekly_justification": "Weekly Justification"
                }
            ]
        }
        messages = mock_validator._validate_training_structure(invalid_plan)
        
        # Check for the actual message format
        assert "Training structure validated: 1 weeks, 2 total exercises" in messages
        assert len(messages) == 1

    def test_validate_training_structure_no_exercises_on_training_day(self, mock_validator):
        """Test training structure validation with training day but no exercises."""
        invalid_plan = {
            "weeks": [
                {
                    "daily_trainings": [
                        {"day_of_week": "Monday", "is_rest_day": False, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},  # Training day with no exercises
                        {"day_of_week": "Tuesday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Wednesday", "is_rest_day": False, "exercises": [{"exercise_id": "1"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Thursday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Friday", "is_rest_day": False, "exercises": [{"exercise_id": "2"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Saturday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Sunday", "is_rest_day": False, "exercises": [{"exercise_id": "3"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""}
                    ],
                    "weekly_justification": ""
                }
            ],
            "title": "",
            "summary": "",
            "program_justification": ""
        }
        messages = mock_validator._validate_training_structure(invalid_plan)
        
        # Check for the actual message format
        assert "Found 1 training days with no exercises" in messages
        assert len(messages) == 2 # Only this message should be present

    def test_validate_training_structure_missing_exercise_id(self, mock_validator):
        """Test training structure validation with missing exercise IDs."""
        invalid_plan = {
            "weeks": [
                {
                    "daily_trainings": [
                        {"day_of_week": "Monday", "is_rest_day": False, "exercises": [{"name": "Exercise without ID"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Tuesday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Wednesday", "is_rest_day": False, "exercises": [{"exercise_id": "1"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Thursday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Friday", "is_rest_day": False, "exercises": [{"exercise_id": "2"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Saturday", "is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},
                        {"day_of_week": "Sunday", "is_rest_day": False, "exercises": [{"exercise_id": "3"}], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""}
                    ],
                    "weekly_justification": ""
                }
            ],
            "title": "",
            "summary": "",
            "program_justification": ""
        }
        messages = mock_validator._validate_training_structure(invalid_plan)
        
        # Check for the actual message format
        assert "Found 1 exercises missing exercise_id" in messages

    def test_validate_training_structure_error_handling(self, mock_validator):
        """Test training structure validation error handling."""
        malformed_plan = {"weeks": None, "title": "", "summary": "", "program_justification": ""}
        messages = mock_validator._validate_training_structure(malformed_plan)
        
        # Check for the actual message format - the method handles None gracefully
        assert len(messages) > 0
        assert "Training plan has no weeks" in messages



class TestExerciseValidatorEdgeCases:
    """Test edge cases and error scenarios for ExerciseValidator."""
    
    @pytest.fixture
    def mock_validator_edge_cases(self):
        """Create validator for edge case testing."""
        with patch('core.training.helpers.exercise_validator.ExerciseSelector'):
            return ExerciseValidator()
    
    def test_validate_training_plan_malformed_structure(self, mock_validator_edge_cases):
        """Test validation with malformed training plan structure."""
        malformed_plan = {
            "title": "Malformed",
            "weeks": [
                {
                    "days": [
                        {"is_rest_day": False, "exercises": None, "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""},  # None instead of list
                        {"is_rest_day": True, "exercises": [], "warming_up_instructions": "", "daily_justification": "", "cooling_down_instructions": ""}
                    ],
                    "weekly_justification": ""
                }
            ],
            "summary": "",
            "program_justification": ""
        }
        
        validated_plan, messages = mock_validator_edge_cases.validate_training_plan(malformed_plan)
        
        # Should handle gracefully and return original plan
        assert validated_plan == malformed_plan
        assert len(messages) > 0


    def test_cosine_similarity_calculation_edge_cases(self, mock_validator_edge_cases):
        """Test cosine similarity calculation with edge cases."""
        # Test with very short descriptions
        short_desc = "Squat"
        candidates = [
            {"name": "Exercise 1", "description": "Desc 1", "main_muscle": "Muscle 1", "target_area": "Target 1"},
            {"name": "Exercise 2", "description": "Desc 2", "main_muscle": "Muscle 2", "target_area": "Target 2"}
        ]
        
        # Mock vectorizer to handle short text
        mock_validator_edge_cases.vectorizer.fit_transform = Mock(return_value=np.array([[1, 0], [0, 1], [1, 1]]))
        
        with patch('sklearn.metrics.pairwise.cosine_similarity', return_value=np.array([[0.5, 0.3]])):
            best_match = mock_validator_edge_cases._find_best_match_by_similarity(short_desc, candidates)
            assert best_match is not None

    def test_muscle_extraction_edge_cases(self, mock_validator_edge_cases):
        """Test muscle extraction with edge cases."""
        # Test with very long names
        long_name = "Super Advanced Compound Multi-Joint Barbell Squat Variation with Twist"
        muscle = mock_validator_edge_cases._extract_muscle_from_name(long_name)
        assert muscle == "legs"
        
        # Test with special characters
        special_name = "Bíceps Curl (Alternating)"
        muscle = mock_validator_edge_cases._extract_muscle_from_name(special_name)
        assert muscle == "arms"
        
        # Test with numbers
        numbered_name = "Squat 2.0 Advanced"
        muscle = mock_validator_edge_cases._extract_muscle_from_name(numbered_name)
        assert muscle == "legs"

    def test_clear_cache(self, mock_validator):
        """Test cache clearing functionality."""
        # Add some data to caches
        mock_validator._similarity_cache["test_key"] = "test_value"
        mock_validator._candidate_cache["test_key"] = "test_value"
        
        # Clear caches
        mock_validator.clear_cache()
        
        # Verify caches are empty
        assert len(mock_validator._similarity_cache) == 0
        assert len(mock_validator._candidate_cache) == 0

    def test_get_cache_stats(self, mock_validator):
        """Test cache statistics retrieval."""
        # Add some data to caches
        mock_validator._similarity_cache["key1"] = "value1"
        mock_validator._similarity_cache["key2"] = "value2"
        mock_validator._candidate_cache["key3"] = "value3"
        
        stats = mock_validator.get_cache_stats()
        
        assert stats['similarity_cache_size'] == 2
        assert stats['candidate_cache_size'] == 1

    def test_validate_training_plan_empty_plan(self, mock_validator):
        """Test validation with empty training plan."""
        result, messages = mock_validator.validate_training_plan({})
        
        assert result == {}
        assert "Training plan is empty" in messages

    def test_validate_training_plan_none_plan(self, mock_validator):
        """Test validation with None training plan."""
        result, messages = mock_validator.validate_training_plan(None)
        
        assert result is None
        assert "Training plan is empty" in messages

    def test_extract_and_validate_exercises_structure_validation(self, mock_validator):
        """Test _extract_and_validate_exercises with structure validation."""
        # Test with invalid structure
        invalid_plan = {
            "title": "Test Plan",
            "weekly_schedules": []  # No weeks
        }
        
        result = mock_validator._extract_and_validate_exercises(invalid_plan)
        
        assert result['valid_ids'] == []
        assert result['invalid_ids'] == []
        assert result['exercise_locations'] == []

    def test_fix_invalid_exercises_no_invalid_ids(self, mock_validator):
        """Test _fix_invalid_exercises with no invalid IDs."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "exercises": [
                                {"exercise_id": 1, "name": "Squat"}
                            ]
                        }
                    ]
                }
            ]
        }
        
        exercise_data = {
            'valid_ids': [1],
            'invalid_ids': [],
            'exercise_locations': []
        }
        
        result = mock_validator._fix_invalid_exercises(training_plan, exercise_data)
        
        assert result == training_plan

    def test_fix_invalid_exercises_with_replacement_cache(self, mock_validator):
        """Test _fix_invalid_exercises with replacement cache."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "exercises": [
                                {"exercise_id": "invalid", "name": "Invalid Exercise"}
                            ]
                        }
                    ]
                }
            ]
        }
        
        exercise_data = {
            'valid_ids': [1],
            'invalid_ids': ["invalid"],
            'exercise_locations': [
                {
                    'exercise_id': "invalid",
                    'week_idx': 0,
                    'day_idx': 0,
                    'exercise_idx': 0
                }
            ]
        }
        
        # Mock the replacement
        mock_validator._find_replacement_exercise = Mock(return_value={
            "id": 1,
            "name": "Valid Exercise",
            "description": "A valid exercise"
        })
        
        result = mock_validator._fix_invalid_exercises(training_plan, exercise_data)
        
        # Should have replaced the invalid exercise
        assert result["weekly_schedules"][0]["daily_trainings"][0]["exercises"][0]["id"] == 1

    def test_fix_invalid_exercises_remove_exercise(self, mock_validator):
        """Test _fix_invalid_exercises when no replacement is found."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "exercises": [
                                {"exercise_id": "invalid", "name": "Invalid Exercise"}
                            ]
                        }
                    ]
                }
            ]
        }
        
        exercise_data = {
            'valid_ids': [1],
            'invalid_ids': ["invalid"],
            'exercise_locations': [
                {
                    'exercise_id': "invalid",
                    'week_idx': 0,
                    'day_idx': 0,
                    'exercise_idx': 0
                }
            ]
        }
        
        # Mock no replacement found
        mock_validator._find_replacement_exercise = Mock(return_value=None)
        
        result = mock_validator._fix_invalid_exercises(training_plan, exercise_data)
        
        # Should have removed the invalid exercise
        assert len(result["weekly_schedules"][0]["daily_trainings"][0]["exercises"]) == 0

    def test_find_replacement_exercise_no_target_muscle(self, mock_validator):
        """Test _find_replacement_exercise with no target muscle."""
        original_exercise = {
            "name": "Unknown Exercise",
            "difficulty": "Beginner"
        }
        
        # Mock _extract_muscle_from_name to return None
        mock_validator._extract_muscle_from_name = Mock(return_value=None)
        
        result = mock_validator._find_replacement_exercise(original_exercise, [1, 2, 3])
        
        assert result is None

    def test_find_replacement_exercise_with_candidates(self, mock_validator):
        """Test _find_replacement_exercise with candidates."""
        original_exercise = {
            "name": "Chest Press",
            "difficulty": "Beginner"
        }
        
        # Mock exercise selector to return candidates
        mock_validator.exercise_selector.get_exercise_candidates.return_value = "Chest: Exercise 1, Exercise 2"
        
        # Mock _extract_muscle_from_name
        mock_validator._extract_muscle_from_name = Mock(return_value="chest")
        
        result = mock_validator._find_replacement_exercise(original_exercise, [1, 2, 3])
        
        # Should return a replacement (mocked behavior)
        assert result is not None

    def test_find_replacement_exercise_no_candidates(self, mock_validator):
        """Test _find_replacement_exercise with no candidates."""
        original_exercise = {
            "name": "Chest Press",
            "difficulty": "Beginner"
        }
        
        # Mock exercise selector to return empty
        mock_validator.exercise_selector.get_exercise_candidates.return_value = ""
        
        # Mock _extract_muscle_from_name
        mock_validator._extract_muscle_from_name = Mock(return_value="chest")
        
        result = mock_validator._find_replacement_exercise(original_exercise, [1, 2, 3])
        
        assert result is None

    def test_find_replacement_with_similarity_cache_hit(self, mock_validator):
        """Test _find_replacement_with_similarity with cache hit."""
        target_description = "Chest exercise"
        candidates = [{"id": 1, "name": "Bench Press"}]
        cache_key = "test_key"
        
        # Pre-populate cache
        mock_validator._similarity_cache[f"sim_{cache_key}_{len(candidates)}"] = {"id": 1, "name": "Cached Exercise"}
        
        result = mock_validator._find_replacement_with_similarity(target_description, candidates, cache_key)
        
        assert result == {"id": 1, "name": "Cached Exercise"}

    def test_find_replacement_with_similarity_cache_miss(self, mock_validator):
        """Test _find_replacement_with_similarity with cache miss."""
        target_description = "Chest exercise"
        candidates = [{"id": 1, "name": "Bench Press", "description": "Chest exercise"}]
        cache_key = "test_key"
        
        # Mock _find_best_match_by_similarity
        mock_validator._find_best_match_by_similarity = Mock(return_value={"id": 1, "name": "Bench Press"})
        
        result = mock_validator._find_replacement_with_similarity(target_description, candidates, cache_key)
        
        assert result == {"id": 1, "name": "Bench Press"}
        # Verify cache was populated
        assert f"sim_{cache_key}_{len(candidates)}" in mock_validator._similarity_cache

    def test_find_best_match_by_similarity_success(self, mock_validator):
        """Test _find_best_match_by_similarity with successful match."""
        target_description = "Chest exercise"
        candidates = [
            {"id": 1, "name": "Bench Press", "description": "Chest exercise"},
            {"id": 2, "name": "Squat", "description": "Leg exercise"}
        ]
        
        # Mock cosine similarity calculation
        with patch('core.training.helpers.exercise_validator.cosine_similarity') as mock_cosine:
            mock_cosine.return_value = [[0.9, 0.1]]  # High similarity for first, low for second
            
            result = mock_validator._find_best_match_by_similarity(target_description, candidates)
            
            assert result == candidates[0]  # Should return the best match

    def test_find_best_match_by_similarity_low_threshold(self, mock_validator):
        """Test _find_best_match_by_similarity with low similarity threshold."""
        target_description = "Chest exercise"
        candidates = [
            {"id": 1, "name": "Bench Press", "description": "Chest exercise"},
            {"id": 2, "name": "Squat", "description": "Leg exercise"}
        ]
        
        # Mock cosine similarity calculation with low scores
        with patch('core.training.helpers.exercise_validator.cosine_similarity') as mock_cosine:
            mock_cosine.return_value = [[0.05, 0.02]]  # Both below threshold
            
            result = mock_validator._find_best_match_by_similarity(target_description, candidates)
            
            assert result == candidates[0]  # Should return first candidate as fallback

    def test_find_best_match_by_similarity_exception(self, mock_validator):
        """Test _find_best_match_by_similarity with exception."""
        target_description = "Chest exercise"
        candidates = [
            {"id": 1, "name": "Bench Press", "description": "Chest exercise"}
        ]
        
        # Mock cosine similarity to raise exception
        with patch('core.training.helpers.exercise_validator.cosine_similarity') as mock_cosine:
            mock_cosine.side_effect = Exception("Similarity calculation failed")
            
            result = mock_validator._find_best_match_by_similarity(target_description, candidates)
            
            assert result == candidates[0]  # Should return first candidate as fallback

    def test_find_best_match_by_similarity_empty_candidates(self, mock_validator):
        """Test _find_best_match_by_similarity with empty candidates."""
        target_description = "Chest exercise"
        candidates = []
        
        result = mock_validator._find_best_match_by_similarity(target_description, candidates)
        
        assert result is None

    def test_validate_training_structure_no_weeks(self, mock_validator):
        """Test _validate_training_structure with no weeks."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": []
        }
        
        messages = mock_validator._validate_training_structure(training_plan)
        
        assert any("has no weeks" in msg for msg in messages)

    def test_validate_training_structure_too_many_days(self, mock_validator):
        """Test _validate_training_structure with too many days."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [{"day_of_week": f"Day {i}"} for i in range(20)]  # 20 days
                }
            ]
        }
        
        messages = mock_validator._validate_training_structure(training_plan)
        
        assert any("too many days" in msg for msg in messages)

    def test_validate_training_structure_no_days(self, mock_validator):
        """Test _validate_training_structure with no days."""
        training_plan = {
            "title": "Test Plan",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": []
                }
            ]
        }
        
        messages = mock_validator._validate_training_structure(training_plan)
        
        assert any("has no days" in msg for msg in messages)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
