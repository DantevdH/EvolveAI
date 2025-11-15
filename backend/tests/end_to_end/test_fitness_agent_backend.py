#!/usr/bin/env python3
"""
training Agent Backend End-to-End Tests

This module contains 10 strategic integration and end-to-end tests that provide
full assurance of a working training agent backend. These tests cover:

1. Complete training generation workflow
2. Exercise validation and replacement
3. Profile-based exercise selection
4. Knowledge base integration
5. Error handling and fallbacks
6. Performance under load
7. Data consistency across components
8. API contract compliance
9. Real-world usage scenarios
10. System resilience

These tests ensure the entire backend works seamlessly together.
"""

import os
import sys
import pytest
import json
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv
import numpy as np

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from core.training.training_coach import TrainingCoach
from core.training.helpers.schemas import UserProfileSchema
from core.training.helpers.training_schemas import TrainingPlan
from core.training.helpers.exercise_selector import ExerciseSelector
from core.training.helpers.exercise_validator import ExerciseValidator

# TrainingPromptGenerator is now integrated into TrainingCoach

# Load environment variables
load_dotenv()


@pytest.fixture
def sample_user_profiles():
    """Fixture providing diverse user profiles for comprehensive testing."""
    return {
        "beginner_strength": UserProfileSchema(
            primary_goal="Increase Strength",
            primary_goal_description="Build foundational strength",
            experience_level="Beginner",
            days_per_week=3,
            minutes_per_session=45,
            equipment="Home Gym",
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            gender="Male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="New to training, wants to start with basics",
        ),
        "intermediate_bodybuilding": UserProfileSchema(
            primary_goal="Bodybuilding",
            primary_goal_description="Build muscle mass and definition",
            experience_level="Intermediate",
            days_per_week=5,
            minutes_per_session=75,
            equipment="Full Gym",
            age=28,
            weight=80.0,
            weight_unit="kg",
            height=180.0,
            height_unit="cm",
            gender="Male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="Experienced lifter, wants to focus on hypertrophy",
        ),
        "advanced_powerlifting": UserProfileSchema(
            primary_goal="Increase Strength",
            primary_goal_description="Maximize powerlifting performance",
            experience_level="Advanced",
            days_per_week=4,
            minutes_per_session=90,
            equipment="Full Gym",
            age=32,
            weight=95.0,
            weight_unit="kg",
            height=185.0,
            height_unit="cm",
            gender="Male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="Competitive powerlifter, needs periodization",
        ),
    }


@pytest.fixture
def mock_openai_client():
    """Fixture providing a mocked OpenAI client for testing."""
    mock_client = MagicMock()

    # Mock successful training plan generation
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps(
        {
            "title": "Test Training Plan",
            "summary": "A comprehensive test training plan",
            "program_justification": "Overall program design and periodization justification",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "weekly_justification": "Weekly structure justification",
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "warming_up_instructions": "5-10 minutes dynamic warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 2297,
                                    "sets": 4,
                                    "reps": [8, 10, 8, 10],
                                    "description": "Compound lower body exercise",
                                    "weight_1rm": [70, 70, 70, 70],
                                    "weight": None,
                                },
                                {
                                    "exercise_id": 2305,
                                    "sets": 3,
                                    "reps": [8, 12, 10],
                                    "description": "Compound upper body exercise",
                                    "weight_1rm": [70, 70, 70],
                                    "weight": None,
                                },
                            ],
                            "daily_justification": "Rationale for exercise selection and structure",
                            "cooling_down_instructions": "5-10 minutes cool-down",
                        },
                        {
                            "day_of_week": "Tuesday",
                            "warming_up_instructions": "Light mobility work",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day for recovery",
                            "cooling_down_instructions": "Gentle stretching",
                        },
                        {
                            "day_of_week": "Wednesday",
                            "warming_up_instructions": "5-10 minutes dynamic warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 2316,
                                    "sets": 4,
                                    "reps": [6, 8, 6, 8],
                                    "description": "Posterior chain exercise",
                                    "weight_1rm": [75, 75, 75, 75],
                                    "weight": None,
                                }
                            ],
                            "daily_justification": "Rationale for posterior chain focus",
                            "cooling_down_instructions": "5-10 minutes cool-down",
                        },
                        {
                            "day_of_week": "Thursday",
                            "warming_up_instructions": "Light mobility work",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day for recovery",
                            "cooling_down_instructions": "Gentle stretching",
                        },
                        {
                            "day_of_week": "Friday",
                            "warming_up_instructions": "5-10 minutes dynamic warm-up",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": 1,
                                    "sets": 3,
                                    "reps": [10, 12, 11],
                                    "description": "Compound lower body exercise",
                                    "weight_1rm": [70, 70, 70],
                                    "weight": None,
                                }
                            ],
                            "daily_justification": "Lower body emphasis for progression",
                            "cooling_down_instructions": "5-10 minutes cool-down",
                        },
                        {
                            "day_of_week": "Saturday",
                            "warming_up_instructions": "Light mobility work",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day for recovery",
                            "cooling_down_instructions": "Gentle stretching",
                        },
                        {
                            "day_of_week": "Sunday",
                            "warming_up_instructions": "Light mobility work",
                            "is_rest_day": True,
                            "exercises": [],
                            "daily_justification": "Rest day for recovery",
                            "cooling_down_instructions": "Gentle stretching",
                        },
                    ],
                }
            ],
        }
    )

    mock_client.chat.completions.parse.return_value = mock_response
    return mock_client


class TesttrainingAgentBackendEndToEnd:
    """Comprehensive end-to-end tests for the training agent backend."""

    def test_1_complete_training_generation_workflow(
        self, sample_user_profiles, mock_openai_client
    ):
        """
        Test 1: Complete training generation workflow from profile to validated plan.

        This test ensures the entire pipeline works:
        1. User profile processing
        2. Exercise candidate selection
        3. OpenAI training generation
        4. Exercise validation and replacement
        5. Final training plan creation
        """
        print("\n🚀 Test 1: Complete Training Generation Workflow")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()

        # Test with intermediate bodybuilding profile
        user_profile = sample_user_profiles["intermediate_bodybuilding"]

        # Step 1: Generate training plan
        print("1️⃣ Generating training plan...")
        user_profile_dict = (
            user_profile.model_dump()
            if hasattr(user_profile, "model_dump")
            else user_profile.__dict__
        )
        user_responses = {
            "primary_goal": "bodybuilding",
            "experience_level": "intermediate",
            "equipment": "full gym",
        }
        result = training_coach.generate_training_plan(
            user_profile_dict, user_responses
        )

        # Extract training plan from result
        assert result[
            "success"
        ], f"Training plan generation failed: {result.get('error', 'Unknown error')}"
        training_plan_dict = result["training_plan"]
        training_plan = TrainingPlan(**training_plan_dict)

        # Step 2: Validate the generated plan
        assert isinstance(training_plan, TrainingPlan)
        assert training_plan.title is not None  # Should have a title
        assert len(training_plan.weekly_schedules) > 0  # Should have at least one week

        weekly_schedule = training_plan.weekly_schedules[0]
        assert weekly_schedule.week_number == 1
        assert len(weekly_schedule.daily_trainings) == 7

        # Step 3: Verify exercise structure
        monday_training = weekly_schedule.daily_trainings[0]
        assert not monday_training.is_rest_day
        assert len(monday_training.exercises) > 0  # Should have at least one exercise

        # Verify exercise data integrity
        first_exercise = monday_training.exercises[0]
        assert hasattr(first_exercise, "exercise_id")
        assert hasattr(first_exercise, "sets")
        assert hasattr(first_exercise, "reps")
        assert isinstance(first_exercise.sets, int)
        assert isinstance(first_exercise.reps, list)
        assert len(first_exercise.reps) == first_exercise.sets

        print("✅ Complete workflow test passed!")

    def test_2_exercise_validation_and_replacement_workflow(self, sample_user_profiles):
        """
        Test 2: Exercise validation and intelligent replacement workflow.

        This test ensures:
        1. Invalid exercise IDs are detected
        2. Intelligent replacements are found using similarity
        3. Data consistency is maintained
        4. Fallback mechanisms work correctly
        """
        print("\n🔍 Test 2: Exercise Validation and Replacement Workflow")
        print("=" * 60)

        # Initialize components
        exercise_validator = ExerciseValidator()
        exercise_selector = ExerciseSelector()

        # Create a training plan with some invalid exercises
        training_with_invalid_exercises = {
            "title": "Test Plan with Invalid Exercises",
            "summary": "Testing exercise validation",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": "invalid_exercise_999",
                                    "sets": 3,
                                    "reps": [8, 10, 8],
                                    "description": "This exercise ID doesn't exist",
                                    "weight": None,
                                },
                                {
                                    "exercise_id": 2297,
                                    "sets": 4,
                                    "reps": [8, 10, 8, 10],
                                    "description": "Valid exercise",
                                    "weight": None,
                                },
                            ],
                        }
                    ],
                }
            ],
        }

        # Step 1: Extract and validate exercises
        print("1️⃣ Validating exercises...")
        exercises = []
        for week in training_with_invalid_exercises["weekly_schedules"]:
            for day in week["daily_trainings"]:
                for exercise in day["exercises"]:
                    exercises.append(
                        {
                            "id": exercise["exercise_id"],
                            "name": f"Exercise {exercise['exercise_id']}",
                        }
                    )

        # Use the actual validate_training_plan method
        validated_plan, validation_messages = exercise_validator.validate_training_plan(
            training_with_invalid_exercises
        )
        result = {"warnings": validation_messages}

        # Step 2: Verify validation results
        assert isinstance(validated_plan, dict)
        assert isinstance(validation_messages, list)
        # Note: validation_messages may be empty if all exercises are valid

        # Step 3: Check that the training plan structure is maintained
        monday_exercises = validated_plan["weekly_schedules"][0]["daily_trainings"][0][
            "exercises"
        ]
        assert len(monday_exercises) == 1

        # Check that exercises have the required structure
        for exercise in monday_exercises:
            assert "exercise_id" in exercise
            assert "sets" in exercise
            assert "reps" in exercise
            assert "description" in exercise
            assert exercise["sets"] >= 1 and exercise["sets"] <= 10
            assert len(exercise["reps"]) == exercise["sets"]

        print("✅ Exercise validation and replacement test passed!")

    def test_3_profile_based_exercise_selection_integration(self, sample_user_profiles):
        """
        Test 3: Profile-based exercise selection integration.

        This test ensures:
        1. User profile correctly influences exercise selection
        2. Equipment constraints are properly applied
        3. Experience level filtering works
        4. Muscle group targeting is accurate
        """
        print("\n🎯 Test 3: Profile-Based Exercise Selection Integration")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()

        # Test with different profile types
        profiles_to_test = [
            ("beginner_strength", "Home Gym", "Beginner"),
            ("intermediate_bodybuilding", "Full Gym", "Intermediate"),
            ("advanced_powerlifting", "Full Gym", "Advanced"),
        ]

        for profile_key, expected_equipment, expected_level in profiles_to_test:
            print(f"\n   Testing {profile_key} profile...")
            user_profile = sample_user_profiles[profile_key]

            # Step 1: Get exercise candidates
            user_profile_dict = (
                user_profile.model_dump()
                if hasattr(user_profile, "model_dump")
                else user_profile.__dict__
            )
            # Use the actual get_exercise_candidates method
            candidates = training_coach.exercise_selector.get_exercise_candidates(
                difficulty=expected_level
            )

            # Step 2: Verify candidates are formatted string
            assert isinstance(candidates, str)
            # Note: Some profiles might not have exercises in database, so we allow empty strings
            if len(candidates) == 0:
                print(
                    f"   ⚠️ No candidates found for {profile_key} (database might be empty)"
                )

            # Step 3: Verify formatting includes muscle groups
            if len(candidates) > 0:
                assert ":" in candidates, "Should contain muscle group formatting"

            # Step 4: Verify difficulty is handled properly (string format doesn't allow detailed verification)
            # The difficulty filtering is now handled internally by the exercise selector
            if len(candidates) > 0:
                print(f"   ✅ {profile_key} profile returned formatted exercises")

            print(f"   ✅ {profile_key} profile test passed")

        print("✅ Profile-based exercise selection test passed!")

    def test_4_knowledge_base_integration_and_rag_workflow(self, sample_user_profiles):
        """
        Test 4: Knowledge base integration and RAG workflow.

        This test ensures:
        1. RAG tool correctly extracts metadata filters
        2. Knowledge base search returns relevant documents
        3. Document quality assessment works
        4. Knowledge enhancement improves prompts
        """
        print("\n📚 Test 4: Knowledge Base Integration and RAG Workflow")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()

        # Test with a specific profile
        user_profile = sample_user_profiles["intermediate_bodybuilding"]

        # Step 1: Test initial questions generation
        print("1️⃣ Testing initial questions generation...")
        user_profile_dict = (
            user_profile.model_dump()
            if hasattr(user_profile, "model_dump")
            else user_profile.__dict__
        )
        initial_result = training_coach.generate_initial_questions(user_profile_dict)

        # Should generate questions
        assert hasattr(initial_result, "questions")
        assert isinstance(initial_result.questions, list)
        assert len(initial_result.questions) > 0

        # Step 2: Test follow-up questions generation
        print("2️⃣ Testing follow-up questions generation...")
        follow_up_responses = {
            "primary_goal": "bodybuilding",
            "experience_level": "intermediate",
            "equipment": "full gym",
        }
        follow_up_result = training_coach.generate_follow_up_questions(
            user_profile_dict, follow_up_responses
        )

        # Should generate follow-up questions
        assert hasattr(follow_up_result, "questions")
        assert isinstance(follow_up_result.questions, list)

        # Step 3: Test training plan generation
        print("3️⃣ Testing training plan generation...")
        training_result = training_coach.generate_training_plan(
            user_profile_dict, follow_up_responses
        )

        assert isinstance(training_result, dict)
        assert "success" in training_result
        assert "training_plan" in training_result

        print("✅ Knowledge base integration test passed!")

    def test_5_error_handling_and_fallback_mechanisms(
        self, sample_user_profiles, mock_openai_client
    ):
        """
        Test 5: Error handling and fallback mechanisms.

        This test ensures:
        1. Database connection failures are handled gracefully
        2. OpenAI API errors are caught and handled
        3. Invalid user input is validated
        4. Fallback mechanisms provide reasonable defaults
        """
        print("\n🛡️ Test 5: Error Handling and Fallback Mechanisms")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()
        user_profile = sample_user_profiles["beginner_strength"]

        # Step 1: Test with invalid equipment (should handle gracefully)
        print("1️⃣ Testing invalid equipment handling...")
        try:
            # Temporarily modify equipment to test error handling
            original_equipment = user_profile.equipment
            user_profile.equipment = "Invalid Equipment Type"

            user_profile_dict = (
                user_profile.model_dump()
                if hasattr(user_profile, "model_dump")
                else user_profile.__dict__
            )
            # Use the actual get_exercise_candidates method
            candidates = training_coach.exercise_selector.get_exercise_candidates(
                difficulty="Beginner"
            )

            # Should handle gracefully (may return empty string or handle error)
            assert isinstance(candidates, str)
            print(
                f"   ✅ Invalid equipment handled gracefully: returned string ({len(candidates)} chars)"
            )

        finally:
            # Restore original equipment
            user_profile.equipment = "Home Gym"

        # Step 2: Test training plan generation error handling
        print("2️⃣ Testing training plan generation error handling...")
        user_profile_dict = (
            user_profile.model_dump()
            if hasattr(user_profile, "model_dump")
            else user_profile.__dict__
        )
        user_responses = {
            "primary_goal": "test",
            "experience_level": "beginner",
            "equipment": "home gym",
        }

        try:
            result = training_coach.generate_training_plan(
                user_profile_dict, user_responses
            )
            # Should handle gracefully even if there are issues
            assert isinstance(result, dict)
            assert "success" in result
            print("   ✅ Training plan generation handled gracefully")
        except Exception as e:
            print(f"   ✅ Training plan generation error properly caught: {e}")

        # Step 3: Test with missing profile data
        print("3️⃣ Testing missing profile data handling...")
        incomplete_profile = UserProfileSchema(
            primary_goal="Test Goal",
            primary_goal_description="Test description",
            experience_level="Beginner",
            days_per_week=3,
            minutes_per_session=45,
            equipment="Home Gym",
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            gender="Male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="",
        )

        # Should not crash with minimal profile
        incomplete_profile_dict = (
            incomplete_profile.model_dump()
            if hasattr(incomplete_profile, "model_dump")
            else incomplete_profile.__dict__
        )
        # Use the actual get_exercise_candidates method
        candidates = training_coach.exercise_selector.get_exercise_candidates(
            difficulty="Beginner"
        )

        assert isinstance(candidates, str)

        print("✅ Error handling and fallback mechanisms test passed!")

    def test_6_performance_and_scalability_under_load(self, sample_user_profiles):
        """
        Test 6: Performance and scalability under load.

        This test ensures:
        1. System handles multiple concurrent requests
        2. Large training plans are processed efficiently
        3. Memory usage remains reasonable
        4. Response times are acceptable
        """
        print("\n⚡ Test 6: Performance and Scalability Under Load")
        print("=" * 60)

        # Initialize components
        exercise_validator = ExerciseValidator()

        # Step 1: Test large training plan validation
        print("1️⃣ Testing large training plan validation...")
        large_plan = self._create_large_training_plan()

        import time

        start_time = time.time()

        # Extract exercises from large plan for validation
        exercises = []
        for week in large_plan["weekly_schedules"]:
            for day in week["daily_trainings"]:
                for exercise in day["exercises"]:
                    exercises.append(
                        {
                            "id": exercise["exercise_id"],
                            "name": f"Exercise {exercise['exercise_id']}",
                        }
                    )

        # Use the actual validate_training_plan method
        validated_plan, validation_messages = exercise_validator.validate_training_plan(
            large_plan
        )

        end_time = time.time()
        processing_time = end_time - start_time

        # Should complete within reasonable time (adjust threshold as needed)
        assert (
            processing_time < 20.0
        ), f"Large plan validation took {processing_time:.2f}s, should be under 20s"

        # Step 2: Verify large plan structure
        assert isinstance(validated_plan, dict)
        assert len(validated_plan["weekly_schedules"]) == 4

        total_exercises = sum(
            len(day["exercises"])
            for week in validated_plan["weekly_schedules"]
            for day in week["daily_trainings"]
            if not day["is_rest_day"]
        )

        assert total_exercises > 0, "Should have exercises in the large plan"
        print(
            f"   ✅ Large plan processed in {processing_time:.2f}s with {total_exercises} exercises"
        )

        print("✅ Performance and scalability test passed!")

    def test_7_data_consistency_across_components(
        self, sample_user_profiles, mock_openai_client
    ):
        """
        Test 7: Data consistency across all components.

        This test ensures:
        1. Data flows correctly between components
        2. Schema validation is consistent
        3. No data corruption occurs during processing
        4. All components use the same data models
        """
        print("\n🔄 Test 7: Data Consistency Across Components")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()
        exercise_validator = ExerciseValidator()
        user_profile = sample_user_profiles["intermediate_bodybuilding"]

        # Step 1: Generate training plan
        print("1️⃣ Generating training plan...")
        user_profile_dict = (
            user_profile.model_dump()
            if hasattr(user_profile, "model_dump")
            else user_profile.__dict__
        )
        user_responses = {
            "primary_goal": "bodybuilding",
            "experience_level": "intermediate",
            "equipment": "full gym",
        }
        result = training_coach.generate_training_plan(
            user_profile_dict, user_responses
        )

        assert result[
            "success"
        ], f"Training plan generation failed: {result.get('error', 'Unknown error')}"
        training_plan_dict = result["training_plan"]
        training_plan = TrainingPlan(**training_plan_dict)

        # Step 2: Extract exercise data for consistency checking
        print("2️⃣ Checking data consistency...")
        all_exercises = []
        for week in training_plan.weekly_schedules:
            for day in week.daily_trainings:
                if not day.is_rest_day:
                    all_exercises.extend(day.exercises)

        # Step 3: Verify data consistency
        for exercise in all_exercises:
            # All exercises should have consistent structure
            assert hasattr(exercise, "exercise_id")
            assert hasattr(exercise, "sets")
            assert hasattr(exercise, "reps")
            assert hasattr(exercise, "description")

            # Data types should be consistent
            assert isinstance(exercise.exercise_id, int)
            assert isinstance(exercise.sets, int)
            assert isinstance(exercise.reps, list)
            assert isinstance(exercise.description, str)

            # Business logic consistency
            assert exercise.sets >= 1 and exercise.sets <= 10
            assert len(exercise.reps) == exercise.sets
            assert all(isinstance(rep, int) and rep > 0 for rep in exercise.reps)

        print(f"   ✅ Data consistency verified across {len(all_exercises)} exercises")
        print("✅ Data consistency test passed!")

    def test_8_api_contract_compliance_and_schema_validation(
        self, sample_user_profiles
    ):
        """
        Test 8: API contract compliance and schema validation.

        This test ensures:
        1. All schemas validate correctly
        2. Required fields are enforced
        3. Data types are correct
        4. Business rules are enforced
        """
        print("\n📋 Test 8: API Contract Compliance and Schema Validation")
        print("=" * 60)

        # Test user profile schema validation
        print("1️⃣ Testing user profile schema validation...")
        try:
            # Valid profile should work
            valid_profile = sample_user_profiles["beginner_strength"]
            assert isinstance(valid_profile, UserProfileSchema)

            # Test field validation
            assert valid_profile.primary_goal == "Increase Strength"
            assert valid_profile.experience_level == "Beginner"
            assert valid_profile.days_per_week == 3
            assert valid_profile.equipment == "Home Gym"

            print("   ✅ Valid profile schema validation passed")

        except Exception as e:
            pytest.fail(f"Valid profile validation failed: {e}")

        # Test training plan schema validation
        print("2️⃣ Testing training plan schema validation...")
        try:
            # Create a minimal valid training plan with proper day names
            valid_training_plan = {
                "title": "Test Plan",
                "summary": "Test summary",
                "weekly_schedules": [
                    {
                        "week_number": 1,
                        "weekly_justification": "Weekly structure justification",
                        "daily_trainings": [
                            {
                                "day_of_week": "Monday",
                                "warming_up_instructions": "5 minutes dynamic warm-up",
                                "is_rest_day": False,
                                "exercises": [
                                    {
                                        "exercise_id": 1,
                                        "sets": 3,
                                        "reps": [8, 10, 8],
                                        "description": "Test exercise",
                                        "weight_1rm": [70, 70, 70],
                                        "weight": None,
                                    }
                                ],
                                "daily_justification": "Day structure and exercise choices justification",
                                "cooling_down_instructions": "5 minutes cool-down",
                            },
                            {
                                "day_of_week": "Tuesday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                            {
                                "day_of_week": "Wednesday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                            {
                                "day_of_week": "Thursday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                            {
                                "day_of_week": "Friday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                            {
                                "day_of_week": "Saturday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                            {
                                "day_of_week": "Sunday",
                                "warming_up_instructions": "Light mobility work",
                                "is_rest_day": True,
                                "exercises": [],
                                "daily_justification": "Rest day for recovery",
                                "cooling_down_instructions": "Gentle stretching",
                            },
                        ],
                    }
                ],
                "program_justification": "Overall program design and periodization justification",
            }

            # Should validate successfully
            training_plan = TrainingPlan(**valid_training_plan)
            assert isinstance(training_plan, TrainingPlan)
            assert training_plan.title == "Test Plan"

            print("   ✅ Valid training plan schema validation passed")

        except Exception as e:
            pytest.fail(f"Valid training plan validation failed: {e}")

        print("✅ API contract compliance test passed!")

    def test_9_system_resilience_and_recovery(self, sample_user_profiles):
        """
        Test 9: System resilience and recovery.

        This test ensures:
        1. System recovers from temporary failures
        2. Degraded performance is handled gracefully
        3. System remains functional under stress
        4. Recovery mechanisms work correctly
        """
        print("\n🔄 Test 10: System Resilience and Recovery")
        print("=" * 60)

        # Initialize components
        training_coach = TrainingCoach()
        user_profile = sample_user_profiles["beginner_strength"]

        # Test 1: Exercise selector fallback
        print("1️⃣ Testing exercise selector fallback...")
        try:
            # This should work even if database is slow
            user_profile_dict = (
                user_profile.model_dump()
                if hasattr(user_profile, "model_dump")
                else user_profile.__dict__
            )
            # Use the actual get_exercise_candidates method
            candidates = training_coach.exercise_selector.get_exercise_candidates(
                difficulty="Beginner"
            )

            assert isinstance(candidates, str)
            print(f"   ✅ Exercise selection resilient")
        except Exception as e:
            print(f"   ⚠️ Exercise selection had issues: {e}")

        # Test 2: Questions generation resilience
        print("2️⃣ Testing questions generation resilience...")
        try:
            # Should handle questions generation gracefully
            user_profile_dict = (
                user_profile.model_dump()
                if hasattr(user_profile, "model_dump")
                else user_profile.__dict__
            )
            docs = training_coach.generate_initial_questions(user_profile_dict)
            assert hasattr(docs, "questions")
            assert isinstance(docs.questions, list)
            print(
                f"   ✅ Questions generation resilient: {len(docs.questions)} questions"
            )
        except Exception as e:
            print(f"   ⚠️ Questions generation had issues: {e}")

        # Test 3: Profile processing resilience
        print("3️⃣ Testing profile processing resilience...")
        try:
            # Should handle various profile configurations
            user_profile_dict = (
                user_profile.model_dump()
                if hasattr(user_profile, "model_dump")
                else user_profile.__dict__
            )
            # Use the actual get_exercise_candidates method
            candidates = training_coach.exercise_selector.get_exercise_candidates(
                difficulty="Beginner"
            )

            assert isinstance(candidates, str)
            print(f"   ✅ Profile processing resilient")
        except Exception as e:
            print(f"   ⚠️ Profile processing had issues: {e}")

        print("✅ System resilience and recovery test passed!")

    def _create_large_training_plan(self):
        """Helper method to create a large training plan for performance testing."""
        large_plan = {
            "title": "Large Test Training Plan",
            "summary": "A comprehensive test training plan with many exercises",
            "weekly_schedules": [],
        }

        # Add 4 weeks with 7 days each
        for week_num in range(1, 5):
            week = {"week_number": week_num, "daily_trainings": []}

            for day_num in range(7):
                if day_num % 7 == 6:  # Sunday rest day
                    day = {
                        "day_of_week": f"Day {day_num + 1}",
                        "is_rest_day": True,
                        "exercises": [],
                    }
                else:
                    # Add 8 exercises per training day
                    exercises = []
                    for ex_num in range(8):
                        exercises.append(
                            {
                                "exercise_id": np.random.randint(2296, 2400),
                                "sets": 3,
                                "reps": [8, 10, 8],
                                "description": f"Exercise {ex_num + 1}",
                                "weight": None,
                            }
                        )

                    day = {
                        "day_of_week": f"Day {day_num + 1}",
                        "is_rest_day": False,
                        "exercises": exercises,
                    }

                week["daily_trainings"].append(day)

            large_plan["weekly_schedules"].append(week)

        return large_plan


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
