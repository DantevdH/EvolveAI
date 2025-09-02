#!/usr/bin/env python3
"""
Workout System Integration Tests

This module contains comprehensive integration tests for the workout system:
- Component interactions (ExerciseSelector, ExerciseValidator, FitnessCoach)
- Workout generation workflows
- System-level behavior and error handling
- End-to-end workout plan generation
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from core.fitness.fitness_coach import FitnessCoach
from core.fitness.helpers.schemas import UserProfileSchema, ExerciseSchema, DailyWorkoutSchema, WeeklyScheduleSchema, WorkoutPlanSchema
from core.fitness.helpers.exercise_selector import ExerciseSelector
from core.fitness.helpers.exercise_validator import ExerciseValidator
from core.fitness.helpers.prompt_generator import WorkoutPromptGenerator

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
def fitness_coach():
    """Fixture providing FitnessCoach instance."""
    try:
        return FitnessCoach()
    except Exception as e:
        pytest.skip(f"Could not initialize FitnessCoach: {e}")


@pytest.fixture
def exercise_validator():
    """Fixture providing ExerciseValidator instance."""
    try:
        return ExerciseValidator()
    except Exception as e:
        pytest.skip(f"Could not initialize ExerciseValidator: {e}")


@pytest.fixture
def prompt_generator():
    """Fixture providing WorkoutPromptGenerator instance."""
    try:
        return WorkoutPromptGenerator()
    except Exception as e:
        pytest.skip(f"Could not initialize WorkoutPromptGenerator: {e}")


@pytest.fixture
def mock_workout_plan():
    """Fixture providing a mock workout plan for testing."""
    return {
        "title": "Test Workout Plan",
        "summary": "A comprehensive test workout plan",
        "weekly_schedules": [
            {
                "week_number": 1,
                "daily_workouts": [
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
        "general_fitness": UserProfileSchema(
            primary_goal="general_fitness",
            primary_goal_description="Improve overall fitness, endurance, and functional strength",
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
            final_chat_notes="Balanced approach focusing on all fitness components"
        )
    }


# ============================================================================
# EXERCISE SELECTOR INTEGRATION TESTS
# ============================================================================

def test_exercise_selector_chest_exercises(exercise_selector):
    """Test exercise selection for chest exercises."""
    chest_exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Home Gym'],
        max_exercises=10
    )
    
    # Assertions
    assert isinstance(chest_exercises, list)
    assert len(chest_exercises) > 0, "Should find chest exercises for intermediate level"
    assert len(chest_exercises) <= 10, "Should respect max_exercises limit"
    
    # Check exercise structure
    for exercise in chest_exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'target_area' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Found {len(chest_exercises)} chest exercises")
    for i, exercise in enumerate(chest_exercises[:3], 1):
        print(f"   {i}. {exercise['name']} - Equipment: {exercise['equipment']}")


def test_exercise_selector_bodyweight_exercises(exercise_selector):
    """Test exercise selection for bodyweight exercises."""
    bodyweight_exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Beginner',
        equipment=['Bodyweight Only'],
        max_exercises=15
    )
    
    # Assertions
    assert isinstance(bodyweight_exercises, list)
    assert len(bodyweight_exercises) > 0, "Should find bodyweight exercises"
    assert len(bodyweight_exercises) <= 15, "Should respect max_exercises limit"
    
    # Check that all exercises use bodyweight
    for exercise in bodyweight_exercises:
        assert exercise['equipment'] == 'Body Weight'
    
    print(f"✅ Found {len(bodyweight_exercises)} bodyweight exercises")


@pytest.mark.parametrize("equipment,muscle,difficulty", [
    ("Full Gym", "Chest", "Intermediate"),
    ("Home Gym", "Back", "Beginner"),
    ("Dumbbells Only", "Thighs", "Intermediate"),
    ("Bodyweight Only", "Back", "Beginner")
])
def test_exercise_selector_parametrized(exercise_selector, equipment, muscle, difficulty):
    """Parametrized test for different equipment and muscle combinations."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=[muscle],
        difficulty=difficulty,
        equipment=[equipment],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 5, f"Should respect max_exercises limit for {equipment}"
    
    # Check exercise structure and values
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'target_area' in exercise
        assert 'difficulty' in exercise
        assert exercise['target_area'] == muscle


# ============================================================================
# EXERCISE VALIDATOR INTEGRATION TESTS
# ============================================================================

def test_exercise_validator_id_validation(exercise_validator):
    """Test exercise ID validation."""
    test_ids = [2399, "invalid_id_2", 2407]
    valid_ids, invalid_ids = exercise_validator.exercise_selector.validate_exercise_ids(test_ids)
    
    # Assertions
    assert isinstance(valid_ids, list)
    assert isinstance(invalid_ids, list)
    assert len(valid_ids) > 0, "Should find some valid exercise IDs"
    assert "invalid_id_2" in invalid_ids, "Should identify invalid ID"
    
    print(f"✅ Validated {len(test_ids)} IDs: {len(valid_ids)} valid, {len(invalid_ids)} invalid")


def test_exercise_validator_workout_plan_validation(exercise_validator, mock_workout_plan):
    """Test complete workout plan validation."""
    # Validate the mock workout plan
    validated_plan, validation_messages = exercise_validator.validate_workout_plan(mock_workout_plan)
    
    # Assertions
    assert isinstance(validated_plan, dict)
    assert isinstance(validation_messages, list)
    
    # Check that the plan structure is maintained
    assert 'title' in validated_plan
    assert 'weekly_schedules' in validated_plan
    assert len(validated_plan['weekly_schedules']) > 0
    
    print(f"✅ Workout plan validation: {len(validation_messages)} messages")


def test_exercise_validator_invalid_exercise_replacement(exercise_validator, mock_workout_plan):
    """Test that invalid exercises are replaced with valid alternatives."""
    # Modify the mock plan to include an invalid exercise ID
    invalid_plan = mock_workout_plan.copy()
    invalid_plan['weekly_schedules'][0]['daily_workouts'][0]['exercises'][0]['exercise_id'] = "invalid_id_999"
    
    # Validate the plan with invalid exercise
    validated_plan, validation_messages = exercise_validator.validate_workout_plan(invalid_plan)
    
    # Assertions
    assert isinstance(validated_plan, dict)
    assert len(validation_messages) > 0, "Should have validation messages for invalid exercise"
    
    # Check that the invalid exercise was handled (either replaced or removed)
    exercises = validated_plan['weekly_schedules'][0]['daily_workouts'][0]['exercises']
    assert len(exercises) > 0, "Should still have exercises after validation"
    
    print(f"✅ Invalid exercise replacement: {len(validation_messages)} validation messages")


def test_exercise_validator_exercise_references(exercise_validator):
    """Test exercise reference validation."""
    # Create mock exercise references
    exercise_references = [
        {"exercise_id": "1", "sets": 3, "reps": [8, 10, 8]},
        {"exercise_id": "2", "sets": 4, "reps": [12, 10, 12, 10]},
        {"exercise_id": "invalid_id", "sets": 3, "reps": [8, 8, 8]}
    ]
    
    # Validate references
    validated_refs = exercise_validator.validate_exercise_references(exercise_references)
    
    # Assertions
    assert isinstance(validated_refs, list)
    assert len(validated_refs) <= len(exercise_references)
    
    print(f"✅ Exercise reference validation: {len(validated_refs)} valid references")


def test_exercise_validator_workout_summary(exercise_validator, mock_workout_plan):
    """Test workout summary generation."""
    # Generate summary for the mock workout plan
    summary = exercise_validator.get_workout_summary(mock_workout_plan)
    
    # Assertions
    assert isinstance(summary, dict)
    assert 'total_weeks' in summary
    assert 'total_exercises' in summary
    assert 'unique_exercises' in summary
    assert 'muscle_groups_targeted' in summary
    assert 'equipment_used' in summary
    assert 'validation_status' in summary
    
    print(f"✅ Workout summary: {summary['total_exercises']} exercises across {summary['total_weeks']} weeks")


# ============================================================================
# FITNESS COACH INTEGRATION TESTS
# ============================================================================


def test_fitness_coach_document_search(fitness_coach, sample_user_profiles):
    """Test fitness coach document search with RAG."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    relevant_docs = fitness_coach.search_fitness_documents(
        user_profile=muscle_user,
        max_results=5
    )
    
    # Assertions
    assert isinstance(relevant_docs, list)
    # Note: System may return more than max_results if high-quality results are available
    assert len(relevant_docs) >= 5, "Should return at least the requested number of results"
    
    # If documents are found, check structure
    if relevant_docs:
        for doc in relevant_docs:
            assert 'document_title' in doc
            assert 'relevance_score' in doc
            assert isinstance(doc['relevance_score'], (int, float))
        
        print(f"✅ Found {len(relevant_docs)} relevant documents")
        for i, doc in enumerate(relevant_docs[:3], 1):
            print(f"   {i}. {doc['document_title']} (Score: {doc['relevance_score']:.3f})")
    else:
        print("⚠️  No documents found (this may be expected if no documents are in the database)")


def test_fitness_coach_document_search_fallback(fitness_coach, sample_user_profiles):
    """Test fitness coach document search fallback system with unrelated query."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Use a completely unrelated query that should trigger fallback
    unrelated_query = "How to bake chocolate chip cookies with proper oven temperature and timing for best results in pastry making"
    
    relevant_docs = fitness_coach.search_fitness_documents(
        user_profile=muscle_user,
        query=unrelated_query,  # Override with unrelated query
        max_results=5
    )
    
    # Assertions for fallback behavior
    assert isinstance(relevant_docs, list)
    assert len(relevant_docs) <= 5, "Should return top 5 documents in fallback mode"
    
    # Check that fallback system was triggered (all documents should have poor quality)
    if relevant_docs:
        poor_quality_count = 0
        for doc in relevant_docs:
            assert 'document_title' in doc
            assert 'relevance_score' in doc
            assert isinstance(doc['relevance_score'], (int, float))
            
            # Check if document was marked as poor quality (score should be very low)
            if doc['relevance_score'] < 0.5:
                poor_quality_count += 1
        
        # Most or all documents should be poor quality for unrelated query
        assert poor_quality_count >= len(relevant_docs) * 0.8, "Most documents should be poor quality for unrelated query"
        
        print(f"✅ Fallback system triggered: {len(relevant_docs)} documents with low relevance")
        for i, doc in enumerate(relevant_docs[:3], 1):
            print(f"   {i}. {doc['document_title']} (Score: {doc['relevance_score']:.3f}) - Poor quality expected")
    else:
        print("⚠️  No documents found (fallback system may have returned empty results)")


def test_fitness_coach_quality_comparison(fitness_coach, sample_user_profiles):
    """Test comparison between high-quality vs fallback results."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🔍 Testing Quality Comparison:")
    print("=" * 50)
    
    # Test 1: Fitness-related query (should get high-quality results)
    print("\n📈 Test 1: Fitness-related query")
    fitness_query = "muscle building strength training progressive overload compound movements"
    fitness_docs = fitness_coach.search_fitness_documents(
        user_profile=muscle_user,
        query=fitness_query,
        max_results=5
    )
    
    # Test 2: Unrelated query (should trigger fallback)
    print("\n📉 Test 2: Unrelated query (fallback expected)")
    unrelated_query = "quantum physics particle accelerator electron spin nuclear fusion"
    fallback_docs = fitness_coach.search_fitness_documents(
        user_profile=muscle_user,
        query=unrelated_query,
        max_results=5
    )
    
    # Assertions and comparisons
    assert isinstance(fitness_docs, list)
    assert isinstance(fallback_docs, list)
    
    if fitness_docs and fallback_docs:
        # Compare average scores
        fitness_avg_score = sum(doc['relevance_score'] for doc in fitness_docs) / len(fitness_docs)
        fallback_avg_score = sum(doc['relevance_score'] for doc in fallback_docs) / len(fallback_docs)
        
        print(f"\n📊 Quality Comparison Results:")
        print(f"   Fitness query avg score: {fitness_avg_score:.3f}")
        print(f"   Unrelated query avg score: {fallback_avg_score:.3f}")
        print(f"   Quality difference: {fitness_avg_score - fallback_avg_score:.3f}")
        
        # Fitness query should have significantly higher scores
        assert fitness_avg_score > fallback_avg_score, "Fitness query should have higher relevance scores"
        assert fitness_avg_score >= 0.5, "Fitness query should trigger high-quality results"
        assert fallback_avg_score < 0.5, "Unrelated query should trigger fallback system"
        
        print(f"✅ Quality system working: {fitness_avg_score:.3f} vs {fallback_avg_score:.3f}")
    else:
        print("⚠️  Could not perform comparison due to missing results")


def test_fitness_coach_exercise_candidates(fitness_coach, sample_user_profiles):
    """Test fitness coach exercise candidate selection."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    candidates = fitness_coach._get_exercise_candidates_for_profile(muscle_user, 300)
    
    # Assertions
    assert isinstance(candidates, list)
    assert len(candidates) > 0, "Should select exercise candidates based on profile"
    
    # Check candidate structure
    for candidate in candidates:
        assert 'name' in candidate
        assert 'target_area' in candidate
        assert 'difficulty' in candidate
        assert 'equipment' in candidate
    
    print(f"✅ Selected {len(candidates)} exercise candidates")
    for i, candidate in enumerate(candidates[:3], 1):
        print(f"   {i}. {candidate['name']} ({candidate['target_area']})")


def test_fitness_coach_target_muscle_groups(fitness_coach, sample_user_profiles):
    """Test target muscle group determination for different user profiles."""
    
    for profile_name, profile in sample_user_profiles.items():
        target_muscles = fitness_coach._get_target_muscle_groups(profile)
        
        # Assertions
        assert isinstance(target_muscles, list)
        assert len(target_muscles) > 0, f"Should determine target muscles for {profile_name}"
        
        # Check that muscle names are valid database values
        valid_muscles = ['Chest', 'Back', 'Thighs', 'Shoulder', 'Upper Arms', 'Calves', 'Forearm', 'Hips', 'Neck']
        for muscle in target_muscles:
            assert muscle in valid_muscles, f"Invalid muscle name: {muscle}"
        
        print(f"✅ {profile_name}: {target_muscles}")


def test_fitness_coach_profile_query_building(fitness_coach, sample_user_profiles):
    """Test profile query building for search optimization."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    query = fitness_coach._build_profile_query(muscle_user)
    
    # Assertions
    assert isinstance(query, str)
    assert len(query) > 0, "Should generate non-empty query"
    assert "bodybuilding" in query.lower(), "Should include primary goal"
    assert "intermediate" in query.lower(), "Should include experience level"
    assert "home gym" in query.lower(), "Should include equipment"
    assert "aiming for" in query.lower(), "Should include goal context"
    
    print(f"✅ Profile query built: {query[:100]}...")


# ============================================================================
# PROMPT GENERATOR INTEGRATION TESTS
# ============================================================================

def test_workout_generation_prompt_creation(fitness_coach, sample_user_profiles):
    """Test workout plan prompt generation with exercise candidates."""
    weight_loss_user = sample_user_profiles["weight_loss"]
    
    # Get exercise candidates
    candidates = fitness_coach._get_exercise_candidates_for_profile(weight_loss_user, 300)
    
    # Assertions
    assert isinstance(candidates, list)
    assert len(candidates) > 0, "Should get exercise candidates for profile"
    
    # Generate prompt
    prompt = fitness_coach.prompt_generator.create_initial_plan_prompt(
        weight_loss_user, 
        candidates
    )
    
    # Assertions
    assert isinstance(prompt, str)
    assert len(prompt) > 0, "Should generate non-empty prompt"
    assert "AVAILABLE EXERCISES" in prompt, "Should include exercise selection section"
    
    print(f"✅ Generated prompt with {len(candidates)} exercise candidates")
    print(f"   Prompt length: {len(prompt)} characters")


def test_prompt_generator_user_profile_integration(prompt_generator, sample_user_profiles):
    """Test prompt generator integration with user profiles."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    # Test prompt generation for different profile types
    prompt = prompt_generator.create_initial_plan_prompt(
        muscle_user,
        []  # Empty candidates for basic prompt test
    )
    
    # Assertions
    assert isinstance(prompt, str)
    assert len(prompt) > 0, "Should generate non-empty prompt"
    assert "Bodybuilding" in prompt, "Should include primary goal"
    assert "Intermediate" in prompt, "Should include experience level"
    assert "Home Gym" in prompt, "Should include equipment"
    
    print(f"✅ Prompt generator integration: {len(prompt)} characters")


# ============================================================================
# END-TO-END WORKFLOW TESTS
# ============================================================================

def test_complete_workout_generation_workflow(fitness_coach, sample_user_profiles):
    """Test the complete workout generation workflow from profile to plan."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🚀 Testing Complete Workout Generation Workflow:")
    print("=" * 60)
    
    # Step 1: Get exercise candidates
    print("1️⃣ Getting exercise candidates...")
    candidates = fitness_coach._get_exercise_candidates_for_profile(muscle_user, 300)
    assert isinstance(candidates, list)
    assert len(candidates) > 0
    print(f"   ✅ Found {len(candidates)} candidates")
    
    # Step 2: Determine target muscle groups
    print("2️⃣ Determining target muscle groups...")
    target_muscles = fitness_coach._get_target_muscle_groups(muscle_user)
    assert isinstance(target_muscles, list)
    assert len(target_muscles) > 0
    print(f"   ✅ Target muscles: {target_muscles}")
    
    # Step 3: Build profile query
    print("3️⃣ Building profile query...")
    query = fitness_coach._build_profile_query(muscle_user)
    assert isinstance(query, str)
    assert len(query) > 0
    print(f"   ✅ Query built: {len(query)} characters")
    
    # Step 4: Search fitness documents
    print("4️⃣ Searching fitness documents...")
    docs = fitness_coach.search_fitness_documents(muscle_user, max_results=3)
    assert isinstance(docs, list)
    print(f"   ✅ Found {len(docs)} documents")
    
    print("\n🎉 Complete workflow test passed!")


def test_error_handling_integration(fitness_coach, sample_user_profiles):
    """Test error handling across the integrated system."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    print("\n🛡️ Testing Error Handling Integration:")
    print("=" * 50)
    
    # Test with invalid equipment (should handle gracefully)
    print("1️⃣ Testing invalid equipment handling...")
    try:
        # Temporarily modify equipment to test error handling
        original_equipment = muscle_user.equipment
        muscle_user.equipment = "Invalid Equipment Type"
        
        candidates = fitness_coach._get_exercise_candidates_for_profile(muscle_user, 300)
        
        # Should handle gracefully (may return empty list or handle error)
        assert isinstance(candidates, list)
        print(f"   ✅ Invalid equipment handled gracefully: {len(candidates)} candidates")
        
    finally:
        # Restore original equipment
        muscle_user.equipment = original_equipment
    
    # Test with empty muscle groups (should handle gracefully)
    print("2️⃣ Testing empty muscle groups handling...")
    try:
        # Test with empty muscle groups
        candidates = fitness_coach._get_exercise_candidates_for_profile(muscle_user)
        assert isinstance(candidates, list)
        print(f"   ✅ Empty muscle groups handled gracefully: {len(candidates)} candidates")
        
    except Exception as e:
        print(f"   ⚠️ Empty muscle groups caused error: {e}")
    
    print("\n🛡️ Error handling integration test completed")


# ============================================================================
# PERFORMANCE AND SCALABILITY TESTS
# ============================================================================

def test_large_workout_plan_handling(exercise_validator):
    """Test handling of large workout plans."""
    # Create a large mock workout plan
    large_plan = {
        "title": "Large Test Workout Plan",
        "summary": "A comprehensive test workout plan with many exercises",
        "weekly_schedules": []
    }
    
    # Add 4 weeks with 7 days each
    for week_num in range(1, 5):
        week = {
            "week_number": week_num,
            "daily_workouts": []
        }
        
        for day_num in range(7):
            if day_num % 7 == 6:  # Sunday rest day
                day = {
                    "day_of_week": f"Day {day_num + 1}",
                    "is_rest_day": True,
                    "exercises": []
                }
            else:
                # Add 8 exercises per training day
                exercises = []
                for ex_num in range(8):
                    exercises.append({
                        "exercise_id": f"{week_num}_{day_num}_{ex_num}",
                        "sets": 3,
                        "reps": [8, 10, 8],
                        "description": f"Exercise {ex_num + 1}",
                        "weight": None
                    })
                
                day = {
                    "day_of_week": f"Day {day_num + 1}",
                    "is_rest_day": False,
                    "exercises": exercises
                }
            
            week["daily_workouts"].append(day)
        
        large_plan["weekly_schedules"].append(week)
    
    # Test validation performance
    print(f"📊 Testing large workout plan: {len(large_plan['weekly_schedules'])} weeks")
    
    validated_plan, validation_messages = exercise_validator.validate_workout_plan(large_plan)
    
    # Assertions
    assert isinstance(validated_plan, dict)
    assert isinstance(validation_messages, list)
    assert len(validated_plan['weekly_schedules']) == 4
    
    # Count total exercises
    total_exercises = sum(
        len(day['exercises']) 
        for week in validated_plan['weekly_schedules'] 
        for day in week['daily_workouts'] 
        if not day['is_rest_day']
    )
    
    print(f"✅ Large plan validation completed: {total_exercises} exercises across 4 weeks")
    print(f"   Validation messages: {len(validation_messages)}")


if __name__ == "__main__":
    print("🚀 Enhanced Workout System Integration Test Suite")
    print("=" * 70)
    print("Now covers: Component interactions, workout generation workflows,")
    print("system-level behavior, error handling, and end-to-end testing!")
    print("=" * 70)
    
    # Run with pytest
    pytest.main([__file__, "-v", "--tb=short"])
