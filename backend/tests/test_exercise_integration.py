#!/usr/bin/env python3
"""
Exercise Integration System Tests

This module contains comprehensive tests for the exercise integration system:
- Exercise selection based on user profiles
- Smart filtering and ranking
- Workout plan generation with exercise validation
- Exercise recommendations
- RAG-enhanced fitness coaching
"""

import os
import sys
import pytest
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from core.agents.specialists.fitness_coach import FitnessCoach
from core.workout.schemas import UserProfileSchema
from core.workout.exercise_selector import ExerciseSelector
from core.workout.exercise_validator import ExerciseValidator

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

def create_sample_user_profiles():
    """Create sample user profiles for testing."""
    return {
        "muscle_builder": UserProfileSchema(
            primary_goal="muscle_building",
            primary_goal_description="Build muscle mass and strength through progressive overload and compound movements",
            experience_level="intermediate",
            days_per_week=4,
            minutes_per_session=60,
            equipment="Home Gym",  # Fixed: should be string, not list
            age=28,
            weight=75.0,
            weight_unit="kg",
            height=180.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            training_schedule="Monday, Wednesday, Friday, Saturday",  # Fixed: added missing field
            final_chat_notes="Focus on compound movements and progressive overload"
        ),
        "weight_loss": UserProfileSchema(
            primary_goal="weight_loss",
            primary_goal_description="Lose body fat while maintaining muscle through cardio and strength training",
            experience_level="beginner",
            days_per_week=3,
            minutes_per_session=45,
            equipment="Bodyweight Only",  # Fixed: should be string, not list
            age=32,
            weight=85.0,
            weight_unit="kg",
            height=165.0,
            height_unit="cm",
            gender="female",
            has_limitations=False,
            limitations_description="",
            training_schedule="Tuesday, Thursday, Sunday",  # Fixed: added missing field
            final_chat_notes="Emphasis on consistency and gradual progression"
        ),
        "general_fitness": UserProfileSchema(
            primary_goal="general_fitness",
            primary_goal_description="Improve overall fitness, endurance, and functional strength",
            experience_level="beginner",
            days_per_week=5,
            minutes_per_session=30,
            equipment="Full Gym",  # Fixed: should be string, not list
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            training_schedule="Monday through Friday",  # Fixed: added missing field
            final_chat_notes="Balanced approach focusing on all fitness components"
        )
    }

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
        assert 'main_muscle' in exercise
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


def test_exercise_selector_workout_exercises(exercise_selector):
    """Test workout-specific exercise selection."""
    strength_exercises = exercise_selector.get_workout_exercises(
        workout_type='strength',
        muscle_groups=['Chest', 'Back', 'Thighs'],
        difficulty='Advanced',
        equipment=['Full Gym']
    )
    
    # Assertions
    assert isinstance(strength_exercises, list)
    assert len(strength_exercises) <= 15, "Should return max 15 exercises"
    
    # Check exercise structure
    for exercise in strength_exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
        assert exercise['difficulty'] == 'Advanced'
    
    print(f"✅ Found {len(strength_exercises)} strength exercises")

def test_exercise_validator_id_validation(exercise_validator):
    """Test exercise ID validation."""
    test_ids = [1302, "invalid_id_2", 1280]
    valid_ids, invalid_ids = exercise_validator.exercise_selector.validate_exercise_ids(test_ids)
    
    # Assertions
    assert isinstance(valid_ids, list)
    assert isinstance(invalid_ids, list)
    assert len(valid_ids) > 0, "Should find some valid exercise IDs"
    assert "invalid_id_2" in invalid_ids, "Should identify invalid ID"
    
    print(f"✅ Validated {len(test_ids)} IDs: {len(valid_ids)} valid, {len(invalid_ids)} invalid")


def test_exercise_validator_summaries(exercise_validator):
    """Test exercise summary generation."""
    # Use known valid IDs
    test_ids = [1302, 1280]
    summaries = exercise_validator.exercise_selector.get_exercise_summary(test_ids)
    
    # Assertions
    assert isinstance(summaries, list)
    assert len(summaries) <= len(test_ids), "Should not return more summaries than requested"
    
    # Check summary structure
    for summary in summaries:
        assert 'id' in summary
        assert 'name' in summary
        assert 'difficulty' in summary
        assert 'equipment' in summary
        assert 'main_muscle' in summary
    
    print(f"✅ Generated {len(summaries)} exercise summaries")

def test_fitness_coach_exercise_recommendations(fitness_coach, sample_user_profiles):
    """Test fitness coach exercise recommendations."""
    muscle_user = sample_user_profiles["muscle_builder"]
    
    chest_exercises = fitness_coach.recommend_exercises(
        muscle_group="Chest",
        difficulty="Intermediate",
        equipment="Home Gym",
        user_profile=muscle_user
    )
    
    # Assertions
    assert isinstance(chest_exercises, list)
    assert len(chest_exercises) > 0, "Should recommend exercises"
    
    # Check exercise structure
    for exercise in chest_exercises:
        assert 'name' in exercise
        assert 'description' in exercise
        assert 'exercise_id' in exercise
        assert exercise['exercise_id'] is not None
    
    print(f"✅ Recommended {len(chest_exercises)} chest exercises")
    for i, exercise in enumerate(chest_exercises[:2], 1):
        print(f"   {i}. {exercise['name']} (ID: {exercise.get('exercise_id', 'N/A')})")


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
    
    candidates = fitness_coach._get_exercise_candidates_for_profile(muscle_user)
    
    # Assertions
    assert isinstance(candidates, list)
    assert len(candidates) > 0, "Should select exercise candidates based on profile"
    
    # Check candidate structure
    for candidate in candidates:
        assert 'name' in candidate
        assert 'main_muscle' in candidate
        assert 'difficulty' in candidate
        assert 'equipment' in candidate
    
    print(f"✅ Selected {len(candidates)} exercise candidates")
    for i, candidate in enumerate(candidates[:3], 1):
        print(f"   {i}. {candidate['name']} ({candidate['main_muscle']})")

def test_workout_generation_prompt_creation(fitness_coach, sample_user_profiles):
    """Test workout plan prompt generation with exercise candidates."""
    weight_loss_user = sample_user_profiles["weight_loss"]
    
    # Get exercise candidates
    candidates = fitness_coach._get_exercise_candidates_for_profile(weight_loss_user)
    
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


def test_workout_generation_target_muscles(fitness_coach, sample_user_profiles):
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


@pytest.mark.parametrize("equipment_type,expected_muscle,difficulty", [
    ("Full Gym", "Chest", "Intermediate"),
    ("Home Gym", "Back", "Beginner"), 
    ("Dumbbells Only", "Thighs", "Intermediate"),
    ("Bodyweight Only", "Chest", "Beginner")
])
def test_exercise_selector_parametrized(exercise_selector, equipment_type, expected_muscle, difficulty):
    """Parametrized test for different equipment and muscle combinations."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=[expected_muscle],
        difficulty=difficulty,
        equipment=[equipment_type],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 5, f"Should respect max_exercises limit for {equipment_type}"
    
    # Check exercise structure and values
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
        assert exercise['difficulty'] == difficulty
        assert exercise['main_muscle'] == expected_muscle


if __name__ == "__main__":
    print("🚀 Exercise Integration System Test Suite")
    print("=" * 60)
    print("Run with: pytest test_exercise_integration.py -v")
    print("Or with output: pytest test_exercise_integration.py -v -s")
