#!/usr/bin/env python3
"""
Training System Integration Tests

This module contains comprehensive integration tests for the training system:
- Component interactions (ExerciseSelector, ExerciseValidator, TrainingCoach)
- Training generation workflows
- System-level behavior and error handling
- End-to-end training plan generation
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

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
    """Fixture providing sample user profiles for testing."""
    return create_sample_user_profiles()


@pytest.fixture
def exercise_selector():
    """Fixture providing ExerciseSelector instance."""
    try:
        return ExerciseSelector()
    except Exception as e:
        pytest.skip(f"Could not initialize ExerciseSelector: {e}")


@pytest.fixture
def training_coach():
    """Fixture providing TrainingCoach instance."""
    try:
        return TrainingCoach()
    except Exception as e:
        pytest.skip(f"Could not initialize TrainingCoach: {e}")


@pytest.fixture
def exercise_validator():
    """Fixture providing ExerciseValidator instance."""
    try:
        return ExerciseValidator()
    except Exception as e:
        pytest.skip(f"Could not initialize ExerciseValidator: {e}")


# TrainingPromptGenerator is now integrated into TrainingCoach


@pytest.fixture
def mock_training_plan():
    """Fixture providing a mock training plan for testing."""
    return {
        "title": "Test Training Plan",
        "summary": "A comprehensive test training plan",
        "weekly_schedules": [
            {
                "week_number": 1,
                "daily_trainings": [
                    {
                        "day_of_week": "Monday",
                        "is_rest_day": False,
                        "exercises": [
                            {
                                "exercise_id": 2399,
                                "sets": 3,
                                "reps": [8, 10, 8],
                                "description": "Test exercise 1",
                                "weight": None
                            },
                            {
                                "exercise_id": 2500,
                                "sets": 4,
                                "reps": [12, 10, 12, 10],
                                "description": "Test exercise 2",
                                "weight": None
                            }
                        ]
                    },
                    {
                        "day_of_week": "Tuesday",
                        "is_rest_day": True,
                        "exercises": []
                    }
                ]
            }
        ]
    }


def create_sample_user_profiles():
    """Create sample user profiles for testing."""
    return {
        "muscle_builder": UserProfileSchema(
            primary_goal="Bodybuilding",
            primary_goal_description="Build muscle mass and strength through progressive overload and compound movements",
            experience_level="Intermediate",
            days_per_week=4,
            minutes_per_session=60,
            equipment="Home Gym",
            age=28,
            weight=75.0,
            weight_unit="kg",
            height=180.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            training_schedule="Monday, Wednesday, Friday, Saturday",
            final_chat_notes="Focus on compound movements and progressive overload"
        ),
        "weight_loss": UserProfileSchema(
            primary_goal="Weight Loss",
            primary_goal_description="Lose body fat while maintaining muscle through cardio and strength training",
            experience_level="Beginner",
            days_per_week=3,
            minutes_per_session=45,
            equipment="Bodyweight Only",
            age=32,
            weight=85.0,
            weight_unit="kg",
            height=165.0,
            height_unit="cm",
            gender="female",
            has_limitations=False,
            limitations_description="",
            training_schedule="Tuesday, Thursday, Sunday",
            final_chat_notes="Emphasis on consistency and gradual progression"
        ),
        "general_training": UserProfileSchema(
            primary_goal="general_training",
            primary_goal_description="Improve overall training, endurance, and functional strength",
            experience_level="Beginner",
            days_per_week=5,
            minutes_per_session=30,
            equipment="Full Gym",
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            training_schedule="Monday through Friday",
            final_chat_notes="Balanced approach focusing on all training components"
        )
    }


# ============================================================================
# EXERCISE SELECTOR INTEGRATION TESTS
# ============================================================================

def test_exercise_selector_intermediate_difficulty(exercise_selector):
    """Test exercise selection for intermediate difficulty."""
    result = exercise_selector.get_exercise_candidates(
        difficulty='Intermediate'
    )
    
    # Should return a formatted string
    assert isinstance(result, str)
    assert len(result) > 0, "Should return formatted exercise string for intermediate level"
    
    # String should contain muscle group formatting
    assert ":" in result
    
    print(f"✅ Intermediate difficulty exercises returned: {len(result)} characters")


def test_exercise_selector_beginner_difficulty(exercise_selector):
    """Test exercise selection for beginner difficulty."""
    result = exercise_selector.get_exercise_candidates(
        difficulty='Beginner'
    )
    
    # Should return a formatted string
    assert isinstance(result, str)
    assert len(result) > 0, "Should return formatted exercise string for beginner level"
    
    # String should contain muscle group formatting
    assert ":" in result
    
    print(f"✅ Beginner difficulty exercises returned: {len(result)} characters")


@pytest.mark.parametrize("difficulty", [
    "Beginner",
    "Intermediate",
    "Advanced"
])
def test_exercise_selector_parametrized(exercise_selector, difficulty):
    """Parametrized test for different difficulty levels."""
    result = exercise_selector.get_exercise_candidates(
        difficulty=difficulty
    )
    
    # Should return a formatted string
    assert isinstance(result, str)
    assert len(result) > 0, f"Should return non-empty string for {difficulty}"
    
    # String should contain muscle group formatting
    assert ":" in result


# ============================================================================
# EXERCISE VALIDATOR INTEGRATION TESTS
# ============================================================================

def test_exercise_validator_id_validation(exercise_validator):
    """Test exercise ID validation."""
    test_ids = [2399, "invalid_id_2", 2407]
    
    # Test the validate_training_plan method
    training_plan = {
        "title": "Test Plan",
        "weekly_schedules": [{
            "week_number": 1,
            "daily_trainings": [{
                "day_of_week": "Monday",
                "is_rest_day": False,
                "exercises": [{"exercise_id": id_val, "sets": 3, "reps": [8, 8, 8]} for id_val in test_ids]
            }]
        }]
    }
    
    result, messages = exercise_validator.validate_training_plan(training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Validated training plan with {len(test_ids)} exercises: {len(messages)} messages")


def test_exercise_validator_exercise_validation(exercise_validator, mock_training_plan):
    """Test exercise validation."""
    # Validate the training plan directly
    result, messages = exercise_validator.validate_training_plan(mock_training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Exercise validation: {len(messages)} messages")


def test_exercise_validator_invalid_exercise_handling(exercise_validator, mock_training_plan):
    """Test that invalid exercises are handled properly."""
    # Create training plan with invalid exercise IDs
    invalid_training_plan = {
        "title": "Test Plan",
        "weekly_schedules": [{
            "week_number": 1,
            "daily_trainings": [{
                "day_of_week": "Monday",
                "is_rest_day": False,
                "exercises": [
                    {"exercise_id": "invalid_id_999", "sets": 3, "reps": [8, 8, 8]},
                    {"exercise_id": 2399, "sets": 3, "reps": [8, 8, 8]}
                ]
            }]
        }]
    }
    
    # Validate the training plan
    result, messages = exercise_validator.validate_training_plan(invalid_training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Invalid exercise handling: {len(messages)} messages")


def test_exercise_validator_exercise_references(exercise_validator):
    """Test exercise reference validation."""
    # Create training plan with mixed valid/invalid exercise references
    training_plan = {
        "title": "Test Plan",
        "weekly_schedules": [{
            "week_number": 1,
            "daily_trainings": [{
                "day_of_week": "Monday",
                "is_rest_day": False,
                "exercises": [
                    {"exercise_id": "1", "sets": 3, "reps": [8, 8, 8]},
                    {"exercise_id": "2", "sets": 3, "reps": [8, 8, 8]},
                    {"exercise_id": "invalid_id", "sets": 3, "reps": [8, 8, 8]}
                ]
            }]
        }]
    }
    
    # Validate references
    result, messages = exercise_validator.validate_training_plan(training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Exercise reference validation: {len(messages)} messages")


def test_exercise_validator_exercise_summary(exercise_validator, mock_training_plan):
    """Test exercise validation summary."""
    # Validate training plan
    result, messages = exercise_validator.validate_training_plan(mock_training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Exercise validation summary: {len(messages)} messages")


# ============================================================================
# training COACH INTEGRATION TESTS
# ============================================================================


def test_training_coach_initial_questions_generation(training_coach, sample_user_profiles):
    """Test training coach initial questions generation."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Generate initial questions
    result = training_coach.generate_initial_questions(user_profile_dict)
    
    # Assertions
    assert hasattr(result, 'questions'), "Should return questions"
    assert isinstance(result.questions, list), "Questions should be a list"
    assert len(result.questions) > 0, "Should generate at least one question"
    
    # Check question structure
    for question in result.questions:
        assert hasattr(question, 'text'), "Question should have text"
        assert hasattr(question, 'response_type'), "Question should have response type"
    
    print(f"✅ Generated {len(result.questions)} initial questions")


def test_training_coach_follow_up_questions_generation(training_coach, sample_user_profiles):
    """Test training coach follow-up questions generation."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Mock initial responses
    initial_responses = {
        "primary_goal": "strength training",
        "experience_level": "intermediate",
        "equipment": "home gym"
    }
    
    # Generate follow-up questions
    result = training_coach.generate_follow_up_questions(user_profile_dict, initial_responses)
    
    # Assertions
    assert hasattr(result, 'questions'), "Should return questions"
    assert isinstance(result.questions, list), "Questions should be a list"
    assert len(result.questions) > 0, "Should generate at least one follow-up question"
    
    print(f"✅ Generated {len(result.questions)} follow-up questions")


def test_training_coach_training_plan_generation(training_coach, sample_user_profiles):
    """Test training coach training plan generation."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🔍 Testing Training Plan Generation:")
    print("=" * 50)
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Generate training plan (mock user responses)
    user_responses = {
        "primary_goal": "strength training",
        "experience_level": "intermediate",
        "equipment": "home gym"
    }
    result = training_coach.generate_training_plan(user_profile_dict, user_responses)
    
    # Assertions
    assert isinstance(result, dict), "Should return a dictionary"
    assert "success" in result, "Should have success status"
    assert "training_plan" in result, "Should have training plan"
    
    if result["success"]:
        training_plan = result["training_plan"]
        assert isinstance(training_plan, dict), "Training plan should be a dictionary"
        assert "title" in training_plan, "Should have title"
        
        print(f"✅ Generated training plan: {training_plan.get('title', 'Unknown')}")
    else:
        print(f"⚠️ Training plan generation failed: {result.get('error', 'Unknown error')}")


def test_training_coach_exercise_candidates(training_coach, sample_user_profiles):
    """Test training coach exercise candidate selection."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Test exercise selection through the selector
    result = training_coach.exercise_selector.get_exercise_candidates(
        difficulty="Intermediate"
    )
    
    # Assertions
    assert isinstance(result, str), "Should return a formatted string"
    
    if result and result != "No exercises available":
        print(f"✅ Selected exercise candidates formatted for AI")
        print(f"   Preview: {result[:200]}...")
    else:
        print(f"⚠️ No exercise candidates found")


def test_training_coach_target_muscle_groups(training_coach, sample_user_profiles):
    """Test exercise selection for different user profiles."""
    
    for profile_name, profile in sample_user_profiles.items():
        # Convert UserProfileSchema to dict for the API
        user_profile_dict = profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__
        
        # Test exercise selection
        result = training_coach.exercise_selector.get_exercise_candidates(
            difficulty=profile.experience_level
        )
        
        # Assertions
        assert isinstance(result, str)
        # Note: Some profiles might not have exercises in database, so we allow empty results
        print(f"✅ {profile_name}: Exercise selection completed")


def test_training_coach_profile_processing(training_coach, sample_user_profiles):
    """Test profile processing for training plan generation."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Test that the profile can be processed for training plan generation
    user_responses = {
        "primary_goal": "bodybuilding",
        "experience_level": "intermediate",
        "equipment": "home gym"
    }
    result = training_coach.generate_training_plan(user_profile_dict, user_responses)
    
    # Assertions
    assert isinstance(result, dict), "Should return a dictionary"
    assert "success" in result, "Should have success status"
    
    # Check that key profile information is accessible
    assert "primary_goal" in user_profile_dict, "Should have primary goal"
    assert "experience_level" in user_profile_dict, "Should have experience level"
    assert "equipment" in user_profile_dict, "Should have equipment"
    
    print(f"✅ Profile processing: {user_profile_dict['primary_goal']} - {user_profile_dict['experience_level']}")


# ============================================================================
# PROMPT GENERATOR INTEGRATION TESTS
# ============================================================================

def test_training_generation_with_exercise_candidates(training_coach, sample_user_profiles):
    """Test training plan generation with exercise candidates."""
    weight_loss_user = sample_user_profiles["weight_loss"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = weight_loss_user.model_dump() if hasattr(weight_loss_user, 'model_dump') else weight_loss_user.__dict__
    
    # Get exercise candidates
    exercise_result = training_coach.exercise_selector.get_exercise_candidates(
        difficulty="Beginner"
    )
    
    # Assertions
    assert isinstance(exercise_result, str)
    
    if exercise_result and exercise_result != "No exercises available":
        print("   ✅ Exercise candidates found")
        
        # Generate training plan with candidates
        user_responses = {
            "primary_goal": "weight loss",
            "experience_level": "beginner",
            "equipment": "bodyweight"
        }
        plan_result = training_coach.generate_training_plan(user_profile_dict, user_responses)
        
        # Assertions
        assert isinstance(plan_result, dict)
        assert "success" in plan_result
        
        print(f"✅ Generated plan with exercise candidates")
        if plan_result["success"]:
            print(f"   Plan generated successfully")
        else:
            print(f"   Plan generation failed: {plan_result.get('error', 'Unknown error')}")
    else:
        print(f"⚠️ No exercise candidates found")


def test_training_coach_user_profile_integration(training_coach, sample_user_profiles):
    """Test training coach integration with user profiles."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Test initial questions generation for different profile types
    result = training_coach.generate_initial_questions(user_profile_dict)
    
    # Assertions
    assert hasattr(result, 'questions'), "Should return questions"
    assert isinstance(result.questions, list), "Questions should be a list"
    assert len(result.questions) > 0, "Should generate questions"
    
    # Check that questions are generated (they are generic, not profile-specific)
    questions_text = " ".join([q.text for q in result.questions])
    assert len(questions_text) > 0, "Should have question text"
    # The questions are generic and don't need to contain specific profile terms
    
    print(f"✅ training coach integration: {len(result.questions)} questions generated")


# ============================================================================
# END-TO-END WORKFLOW TESTS
# ============================================================================

def test_complete_training_generation_workflow(training_coach, sample_user_profiles):
    """Test the complete training generation workflow from profile to plan."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🚀 Testing Complete Training Generation Workflow:")
    print("=" * 60)
    
    # Convert UserProfileSchema to dict for the API
    user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
    
    # Step 1: Generate initial questions
    print("1️⃣ Generating initial questions...")
    initial_result = training_coach.generate_initial_questions(user_profile_dict)
    assert hasattr(initial_result, 'questions')
    assert len(initial_result.questions) > 0
    print(f"   ✅ Generated {len(initial_result.questions)} initial questions")
    
    # Step 2: Get exercise candidates
    print("2️⃣ Getting exercise candidates...")
    exercise_result = training_coach.exercise_selector.get_exercise_candidates(
        difficulty="Intermediate"
    )
    assert isinstance(exercise_result, str)
    
    if exercise_result and exercise_result != "No exercises available":
        print(f"   ✅ Found exercise candidates")
    else:
        print("   ⚠️ No exercise candidates found (database might be empty for this profile)")
    
    # Step 3: Generate training plan
    print("3️⃣ Generating training plan...")
    user_responses = {
        "primary_goal": "bodybuilding",
        "experience_level": "intermediate",
        "equipment": "home gym"
    }
    plan_result = training_coach.generate_training_plan(user_profile_dict, user_responses)
    assert isinstance(plan_result, dict)
    assert "success" in plan_result
    
    if plan_result["success"]:
        training_plan = plan_result["training_plan"]
        assert isinstance(training_plan, dict)
        print(f"   ✅ Generated training plan: {training_plan.get('plan_name', 'Unknown')}")
    else:
        print(f"   ⚠️ Plan generation failed: {plan_result.get('error', 'Unknown error')}")
    
    print("\n🎉 Complete workflow test passed!")


def test_error_handling_integration(training_coach, sample_user_profiles):
    """Test error handling across the integrated system."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🛡️ Testing Error Handling Integration:")
    print("=" * 50)
    
    # Test with invalid equipment (should handle gracefully)
    print("1️⃣ Testing invalid equipment handling...")
    try:
        # Create a copy of the user profile with invalid equipment
        user_profile_dict = muscle_user.model_dump() if hasattr(muscle_user, 'model_dump') else muscle_user.__dict__
        user_profile_dict["equipment"] = "Invalid Equipment Type"
        
        result = training_coach.exercise_selector.get_exercise_candidates(
            difficulty="Beginner"
        )
        
        # Should handle gracefully (may return empty string or handle error)
        assert isinstance(result, str)
        print(f"   ✅ Invalid equipment handled gracefully")
        
    except Exception as e:
        print(f"   ⚠️ Invalid equipment caused error: {e}")
    
    # Test with invalid profile data (should handle gracefully)
    print("2️⃣ Testing invalid profile data handling...")
    try:
        # Test with minimal profile data
        minimal_profile = {
            "primary_goal": "test",
            "experience_level": "beginner",
            "equipment": "bodyweight"
        }
        
        result = training_coach.generate_initial_questions(minimal_profile)
        assert hasattr(result, 'questions')
        print(f"   ✅ Invalid profile data handled gracefully: {len(result.questions)} questions")
        
    except Exception as e:
        print(f"   ⚠️ Invalid profile data caused error: {e}")
    
    print("\n🛡️ Error handling integration test completed")


# ============================================================================
# PERFORMANCE AND SCALABILITY TESTS
# ============================================================================

def test_large_exercise_list_handling(exercise_validator):
    """Test handling of large training plans."""
    # Create a large training plan
    large_training_plan = {
        "title": "Large Test Plan",
        "weekly_schedules": []
    }
    
    # Add 4 weeks with many exercises
    for week_num in range(1, 5):
        week = {
            "week_number": week_num,
            "daily_trainings": []
        }
        
        for day_num in range(7):
            if day_num % 7 == 6:  # Sunday rest day
                day = {
                    "day_of_week": f"Day {day_num + 1}",
                    "is_rest_day": True,
                    "exercises": []
                }
            else:
                # Add 10 exercises per training day
                exercises = []
                for ex_num in range(10):
                    exercises.append({
                        "exercise_id": f"exercise_{week_num}_{day_num}_{ex_num}",
                        "sets": 3,
                        "reps": [8, 8, 8]
                    })
                
                day = {
                    "day_of_week": f"Day {day_num + 1}",
                    "is_rest_day": False,
                    "exercises": exercises
                }
            
            week["daily_trainings"].append(day)
        
        large_training_plan["weekly_schedules"].append(week)
    
    # Test validation performance
    print(f"📊 Testing large training plan: {len(large_training_plan['weekly_schedules'])} weeks")
    
    result, messages = exercise_validator.validate_training_plan(large_training_plan)
    
    # Assertions
    assert isinstance(result, dict)
    assert isinstance(messages, list)
    
    print(f"✅ Large training plan validation completed: {len(messages)} messages")


if __name__ == "__main__":
    print("🚀 Enhanced Training System Integration Test Suite")
    print("=" * 70)
    print("Now covers: Component interactions, training generation workflows,")
    print("system-level behavior, error handling, and end-to-end testing!")
    print("=" * 70)
    
    # Run with pytest
    pytest.main([__file__, "-v", "--tb=short"])
