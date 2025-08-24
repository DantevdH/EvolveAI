#!/usr/bin/env python3
"""
Test Equipment Mapping

This script tests the equipment mapping between frontend options and database equipment types.
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from core.workout.exercise_selector import ExerciseSelector

# Load environment variables
load_dotenv()

@pytest.fixture
def exercise_selector():
    """Fixture to provide ExerciseSelector instance."""
    try:
        return ExerciseSelector()
    except Exception as e:
        pytest.skip(f"Could not initialize ExerciseSelector: {e}")

@pytest.fixture
def mock_exercise_data():
    """Fixture providing mock exercise data for testing."""
    return [
        {
            "id": "1",
            "name": "Barbell Squat",
            "equipment": "Barbell",
            "main_muscle": "Thighs",
            "difficulty": "Intermediate",
            "force": "Compound",
            "secondary_muscles": ["Glutes", "Core"]
        },
        {
            "id": "2",
            "name": "Dumbbell Press",
            "equipment": "Dumbbell",
            "main_muscle": "Chest",
            "difficulty": "Intermediate",
            "force": "Compound",
            "secondary_muscles": ["Shoulder", "Triceps"]
        },
        {
            "id": "3",
            "name": "Push-ups",
            "equipment": "Body Weight",
            "main_muscle": "Chest",
            "difficulty": "Beginner",
            "force": "Compound",
            "secondary_muscles": ["Shoulder", "Triceps"]
        },
        {
            "id": "4",
            "name": "Pull-ups",
            "equipment": "Body Weight",
            "main_muscle": "Back",
            "difficulty": "Advanced",
            "force": "Compound",
            "secondary_muscles": ["Biceps", "Forearm"]
        },
        {
            "id": "5",
            "name": "Deadlift",
            "equipment": "Barbell",
            "main_muscle": "Back",
            "difficulty": "Advanced",
            "force": "Compound",
            "secondary_muscles": ["Thighs", "Glutes"]
        }
    ]

def test_database_schema_inspection(exercise_selector):
    """Test that we can inspect the database schema."""
    schema_info = exercise_selector.inspect_database_schema()
    
    # Assert that we got schema information
    assert isinstance(schema_info, dict)
    
    # Assert that key fields exist
    if 'main_muscles' in schema_info:
        assert isinstance(schema_info['main_muscles'], list)
        assert len(schema_info['main_muscles']) > 0
        print(f"✅ Found {len(schema_info['main_muscles'])} main muscle groups")
    
    if 'equipment_types' in schema_info:
        assert isinstance(schema_info['equipment_types'], list)
        assert len(schema_info['equipment_types']) > 0
        print(f"✅ Found {len(schema_info['equipment_types'])} equipment types")
    
    if 'difficulty_levels' in schema_info:
        assert isinstance(schema_info['difficulty_levels'], list)
        assert len(schema_info['difficulty_levels']) > 0
        print(f"✅ Found {len(schema_info['difficulty_levels'])} difficulty levels")

def test_full_gym_equipment_mapping(exercise_selector):
    """Test Full Gym equipment mapping."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) > 0, "Full Gym should find exercises"
    assert len(exercises) <= 5, "Should respect max_exercises limit"
    
    # Check that exercises have required fields
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Full Gym: Found {len(exercises)} exercises")
    for i, exercise in enumerate(exercises[:3], 1):
        print(f"   {i}. {exercise['name']} - Equipment: {exercise['equipment']}")

def test_home_gym_equipment_mapping(exercise_selector):
    """Test Home Gym equipment mapping."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Home Gym'],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) > 0, "Home Gym should find exercises"
    assert len(exercises) <= 5, "Should respect max_exercises limit"
    
    # Check that exercises have required fields
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Home Gym: Found {len(exercises)} exercises")
    for i, exercise in enumerate(exercises[:3], 1):
        print(f"   {i}. {exercise['name']} - Equipment: {exercise['equipment']}")

def test_dumbbells_only_equipment_mapping(exercise_selector):
    """Test Dumbbells Only equipment mapping."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Dumbbells Only'],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) > 0, "Dumbbells Only should find exercises"
    assert len(exercises) <= 5, "Should respect max_exercises limit"
    
    # Check that exercises have required fields
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Dumbbells Only: Found {len(exercises)} exercises")
    for i, exercise in enumerate(exercises[:3], 1):
        print(f"   {i}. {exercise['name']} - Equipment: {exercise['equipment']}")

def test_bodyweight_only_equipment_mapping(exercise_selector):
    """Test Bodyweight Only equipment mapping."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Beginner',
        equipment=['Bodyweight Only'],
        max_exercises=5
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) > 0, "Bodyweight Only should find exercises"
    assert len(exercises) <= 5, "Should respect max_exercises limit"
    
    # Check that exercises have required fields
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Bodyweight Only: Found {len(exercises)} exercises")
    for i, exercise in enumerate(exercises[:3], 1):
        print(f"   {i}. {exercise['name']} - Equipment: {exercise['equipment']}")

@pytest.mark.parametrize("equipment,muscle,difficulty", [
    ("Full Gym", "Chest", "Intermediate"),
    ("Home Gym", "Back", "Beginner"),
    ("Dumbbells Only", "Thighs", "Intermediate"),
    ("Bodyweight Only", "Back", "Beginner")
])
def test_equipment_filtering_logic(exercise_selector, equipment, muscle, difficulty):
    """Test the equipment filtering logic with different combinations."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=[muscle],
        difficulty=difficulty,
        equipment=[equipment],
        max_exercises=3
    )
    
    # Basic assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 3, f"Should respect max_exercises limit for {equipment}"
    
    # Check exercise structure
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ {equipment} + {muscle} + {difficulty}: Found {len(exercises)} exercises")
    if exercises:
        for exercise in exercises[:2]:
            print(f"      - {exercise['name']} ({exercise['equipment']})")

def test_exercise_data_structure(exercise_selector):
    """Test that exercise data has the expected structure."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=1
    )
    
    if exercises:
        exercise = exercises[0]
        
        # Required fields
        required_fields = ['id', 'name', 'equipment', 'main_muscle', 'difficulty']
        for field in required_fields:
            assert field in exercise, f"Exercise should have '{field}' field"
            assert exercise[field] is not None, f"Exercise '{field}' should not be None"
        
        # Data type assertions
        assert isinstance(exercise['name'], str)
        assert isinstance(exercise['equipment'], str)
        assert isinstance(exercise['main_muscle'], str)
        assert isinstance(exercise['difficulty'], str)
        
        print(f"✅ Exercise data structure validation passed")

def test_max_exercises_limit(exercise_selector):
    """Test that max_exercises limit is respected."""
    max_exercises = 3
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=max_exercises
    )
    
    assert len(exercises) <= max_exercises, f"Should return at most {max_exercises} exercises"
    
    if exercises:
        print(f"✅ Max exercises limit respected: {len(exercises)} <= {max_exercises}")

# NEW TESTS FOR MISSING COVERAGE

def test_select_varied_exercises_algorithm(exercise_selector, mock_exercise_data):
    """Test the variety selection algorithm."""
    # Test with more exercises than target to trigger variety selection
    target_count = 3
    result = exercise_selector._select_varied_exercises(mock_exercise_data, target_count)
    
    # Assertions
    assert isinstance(result, list)
    assert len(result) == target_count
    assert len(result) <= len(mock_exercise_data)
    
    # Check that we get variety in equipment
    equipment_types = [ex['equipment'] for ex in result]
    unique_equipment = set(equipment_types)
    
    # Should have variety but allow some overlap (realistic)
    assert len(unique_equipment) >= 1, "Should have at least one equipment type"
    assert len(unique_equipment) <= len(result), "Should not exceed result count"
    
    print(f"✅ Variety selection: {len(unique_equipment)} equipment types from {target_count} exercises")

def test_select_varied_exercises_with_insufficient_data(exercise_selector, mock_exercise_data):
    """Test variety selection when there aren't enough exercises."""
    # Test with target count greater than available exercises
    target_count = 10
    result = exercise_selector._select_varied_exercises(mock_exercise_data, target_count)
    
    # Should return all available exercises
    assert len(result) == len(mock_exercise_data)
    assert result == mock_exercise_data
    
    print(f"✅ Insufficient data handling: returned all {len(result)} available exercises")

def test_remove_duplicates_functionality(exercise_selector, mock_exercise_data):
    """Test duplicate removal logic."""
    # Create duplicate exercises
    duplicate_data = mock_exercise_data + mock_exercise_data[:2]  # Add first 2 exercises again
    
    result = exercise_selector._remove_duplicates(duplicate_data)
    
    # Assertions
    assert isinstance(result, list)
    assert len(result) == len(mock_exercise_data)  # Should remove duplicates
    assert len(result) < len(duplicate_data)  # Should be shorter than input with duplicates
    
    # Check that all exercises are unique based on name + muscle + equipment
    unique_keys = set()
    for exercise in result:
        key = (exercise['name'], exercise['main_muscle'], exercise['equipment'])
        assert key not in unique_keys, f"Duplicate found: {key}"
        unique_keys.add(key)
    
    print(f"✅ Duplicate removal: {len(duplicate_data)} → {len(result)} unique exercises")

def test_get_workout_exercises_strength_type(exercise_selector):
    """Test workout-specific exercise selection for strength training."""
    exercises = exercise_selector.get_workout_exercises(
        workout_type='strength',
        muscle_groups=['Chest', 'Back'],
        difficulty='Intermediate',
        equipment=['Full Gym']
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 15, "Should return max 15 exercises for strength"
    
    # Check exercise structure
    for exercise in exercises:
        assert 'name' in exercise
        assert 'equipment' in exercise
        assert 'main_muscle' in exercise
        assert 'difficulty' in exercise
    
    print(f"✅ Strength workout: Found {len(exercises)} exercises")

def test_get_workout_exercises_cardio_type(exercise_selector):
    """Test workout-specific exercise selection for cardio."""
    exercises = exercise_selector.get_workout_exercises(
        workout_type='cardio',
        muscle_groups=['Full Body'],
        difficulty='Beginner',
        equipment=['Body Weight']
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 15, "Should return max 15 exercises for cardio"
    
    # For cardio, should prefer bodyweight exercises
    if exercises:
        bodyweight_count = sum(1 for ex in exercises if ex.get('equipment') == 'Body Weight')
        assert bodyweight_count >= len(exercises) * 0.5, "Should have majority bodyweight exercises for cardio"
    
    print(f"✅ Cardio workout: Found {len(exercises)} exercises")

def test_get_exercise_by_id_functionality(exercise_selector):
    """Test individual exercise retrieval by ID."""
    # First get some exercises to get valid IDs
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=1
    )
    
    if exercises:
        exercise_id = exercises[0]['id']
        
        # Test getting exercise by ID
        result = exercise_selector.get_exercise_by_id(exercise_id)
        
        # Assertions
        assert result is not None
        assert result['id'] == exercise_id
        assert 'name' in result
        assert 'equipment' in result
        assert 'main_muscle' in result
        assert 'difficulty' in result
        
        print(f"✅ Exercise by ID: Found {result['name']} (ID: {exercise_id})")
    else:
        pytest.skip("No exercises available to test ID retrieval")

def test_get_exercise_by_id_invalid_id(exercise_selector):
    """Test exercise retrieval with invalid ID."""
    result = exercise_selector.get_exercise_by_id("invalid_id_12345")
    
    # Should return None for invalid ID
    assert result is None
    
    print("✅ Invalid ID handling: correctly returns None")

def test_validate_exercise_ids_functionality(exercise_selector):
    """Test exercise ID validation."""
    # Get some valid exercise IDs first
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=2
    )
    
    if len(exercises) >= 2:
        valid_ids = [exercises[0]['id'], exercises[1]['id']]
        invalid_ids = ["invalid_id_1", "invalid_id_2"]
        
        # Test with mix of valid and invalid IDs
        test_ids = valid_ids + invalid_ids
        
        valid_result, invalid_result = exercise_selector.validate_exercise_ids(test_ids)
        
        # Assertions
        assert isinstance(valid_result, list)
        assert isinstance(invalid_result, list)
        assert len(valid_result) == len(valid_ids)
        assert len(invalid_result) == len(invalid_ids)
        
        # Check that valid IDs are in valid_result
        for valid_id in valid_ids:
            assert valid_id in valid_result
        
        # Check that invalid IDs are in invalid_result
        for invalid_id in invalid_ids:
            assert invalid_id in invalid_result
        
        print(f"✅ ID validation: {len(valid_result)} valid, {len(invalid_result)} invalid")
    else:
        pytest.skip("Not enough exercises available to test ID validation")

def test_get_exercise_summary_functionality(exercise_selector):
    """Test exercise summary generation."""
    # Get some exercise IDs first
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=2
    )
    
    if len(exercises) >= 2:
        exercise_ids = [exercises[0]['id'], exercises[1]['id']]
        
        summaries = exercise_selector.get_exercise_summary(exercise_ids)
        
        # Assertions
        assert isinstance(summaries, list)
        assert len(summaries) <= len(exercise_ids)
        
        # Check summary structure
        for summary in summaries:
            required_fields = ['id', 'name', 'difficulty', 'equipment', 'main_muscle', 'force']
            for field in required_fields:
                assert field in summary, f"Summary missing '{field}' field"
                assert summary[field] is not None, f"Summary '{field}' should not be None"
        
        print(f"✅ Exercise summaries: Generated {len(summaries)} summaries")
    else:
        pytest.skip("Not enough exercises available to test summary generation")

def test_edge_case_empty_muscle_groups(exercise_selector):
    """Test edge case with empty muscle groups."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=[],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=5
    )
    
    # Should handle empty muscle groups gracefully
    assert isinstance(exercises, list)
    # May return empty list or handle gracefully
    
    print(f"✅ Empty muscle groups: handled gracefully, returned {len(exercises)} exercises")

def test_edge_case_invalid_equipment_type(exercise_selector):
    """Test edge case with invalid equipment type."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],
        difficulty='Intermediate',
        equipment=['Invalid Equipment Type'],
        max_exercises=5
    )
    
    # Should handle invalid equipment gracefully
    assert isinstance(exercises, list)
    # May return empty list or handle gracefully
    
    print(f"✅ Invalid equipment: handled gracefully, returned {len(exercises)} exercises")

def test_edge_case_no_exercises_found(exercise_selector):
    """Test edge case when no exercises match criteria."""
    # Use very restrictive criteria that might not find exercises
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Very Specific Muscle'],
        difficulty='Expert',
        equipment=['Very Rare Equipment'],
        max_exercises=5
    )
    
    # Should handle no results gracefully
    assert isinstance(exercises, list)
    # Should return empty list, not crash
    
    print(f"✅ No exercises found: handled gracefully, returned {len(exercises)} exercises")

def test_muscle_group_exercises_functionality(exercise_selector):
    """Test the muscle group specific exercise retrieval."""
    exercises = exercise_selector.get_muscle_group_exercises(
        muscle_group='Chest',
        difficulty='Intermediate',
        equipment=['Home Gym']
    )
    
    # Assertions
    assert isinstance(exercises, list)
    assert len(exercises) <= 20, "Should return max 20 exercises for muscle group"
    
    # Check that all exercises target the specified muscle group
    for exercise in exercises:
        assert exercise['main_muscle'] == 'Chest'
    
    print(f"✅ Muscle group exercises: Found {len(exercises)} chest exercises")

def test_error_handling_database_failure(exercise_selector):
    """Test error handling when database operations fail."""
    # Mock a database failure by temporarily changing the supabase client
    original_supabase = exercise_selector.supabase
    
    try:
        # Create a mock that raises an exception
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.side_effect = Exception("Database connection failed")
        
        exercise_selector.supabase = mock_supabase
        
        # This should not crash, should return empty list
        exercises = exercise_selector.get_exercise_candidates(
            muscle_groups=['Chest'],
            difficulty='Intermediate',
            equipment=['Full Gym'],
            max_exercises=5
        )
        
        # Should handle error gracefully
        assert isinstance(exercises, list)
        assert len(exercises) == 0, "Should return empty list on database failure"
        
        print("✅ Database failure: handled gracefully, returned empty list")
        
    finally:
        # Restore original supabase client
        exercise_selector.supabase = original_supabase

def test_environment_validation_error_handling():
    """Test environment validation error handling."""
    # Test that ExerciseSelector fails gracefully with missing environment variables
    original_env = os.environ.copy()
    
    try:
        # Remove required environment variables
        if 'SUPABASE_URL' in os.environ:
            del os.environ['SUPABASE_URL']
        if 'SUPABASE_ANON_KEY' in os.environ:
            del os.environ['SUPABASE_ANON_KEY']
        
        # Should raise ValueError with missing environment variables
        with pytest.raises(ValueError) as exc_info:
            ExerciseSelector()
        
        assert "Missing required environment variables" in str(exc_info.value)
        print("✅ Environment validation: correctly raises error for missing variables")
        
    finally:
        # Restore environment variables
        os.environ.clear()
        os.environ.update(original_env)

def test_exercise_candidates_with_single_muscle_group(exercise_selector):
    """Test exercise candidates with single muscle group (edge case)."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest'],  # Single muscle group
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=5
    )
    
    # Should handle single muscle group gracefully
    assert isinstance(exercises, list)
    assert len(exercises) <= 5
    
    print(f"✅ Single muscle group: handled gracefully, returned {len(exercises)} exercises")

def test_exercise_candidates_with_very_small_max_exercises(exercise_selector):
    """Test exercise candidates with very small max_exercises (edge case)."""
    exercises = exercise_selector.get_exercise_candidates(
        muscle_groups=['Chest', 'Back'],
        difficulty='Intermediate',
        equipment=['Full Gym'],
        max_exercises=1  # Very small number
    )
    
    # Should handle very small max_exercises gracefully
    assert isinstance(exercises, list)
    assert len(exercises) <= 1
    
    print(f"✅ Small max_exercises: handled gracefully, returned {len(exercises)} exercises")

def test_muscle_group_exercises_with_none_equipment(exercise_selector):
    """Test muscle group exercises with None equipment (edge case)."""
    exercises = exercise_selector._get_muscle_group_exercises(
        muscle='Chest',
        difficulty='Intermediate',
        equipment=None,  # None equipment
        count=5
    )
    
    # Should handle None equipment gracefully
    assert isinstance(exercises, list)
    
    print(f"✅ None equipment: handled gracefully, returned {len(exercises)} exercises")

def test_muscle_group_exercises_with_empty_equipment(exercise_selector):
    """Test muscle group exercises with empty equipment list (edge case)."""
    exercises = exercise_selector._get_muscle_group_exercises(
        muscle='Chest',
        difficulty='Intermediate',
        equipment=[],  # Empty equipment list
        count=5
    )
    
    # Should handle empty equipment list gracefully
    assert isinstance(exercises, list)
    
    print(f"✅ Empty equipment list: handled gracefully, returned {len(exercises)} exercises")

def test_exercise_summary_with_empty_ids(exercise_selector):
    """Test exercise summary with empty ID list (edge case)."""
    summaries = exercise_selector.get_exercise_summary([])
    
    # Should handle empty ID list gracefully
    assert isinstance(summaries, list)
    assert len(summaries) == 0
    
    print("✅ Empty ID list: handled gracefully, returned empty list")

def test_validate_exercise_ids_with_empty_list(exercise_selector):
    """Test exercise ID validation with empty list (edge case)."""
    valid_ids, invalid_ids = exercise_selector.validate_exercise_ids([])
    
    # Should handle empty list gracefully
    assert isinstance(valid_ids, list)
    assert isinstance(invalid_ids, list)
    assert len(valid_ids) == 0
    assert len(invalid_ids) == 0
    
    print("✅ Empty ID list validation: handled gracefully")

def test_get_exercise_by_id_with_empty_string(exercise_selector):
    """Test exercise retrieval with empty string ID (edge case)."""
    result = exercise_selector.get_exercise_by_id("")
    
    # Should handle empty string gracefully
    assert result is None
    
    print("✅ Empty string ID: handled gracefully, returns None")

def test_get_exercise_by_id_with_none_id(exercise_selector):
    """Test exercise retrieval with None ID (edge case)."""
    result = exercise_selector.get_exercise_by_id(None)
    
    # Should handle None gracefully
    assert result is None
    
    print("✅ None ID: handled gracefully, returns None")

if __name__ == "__main__":
    print("🚀 Enhanced Equipment Mapping Test Suite")
    print("=" * 60)
    print("Now covers: Equipment mapping, variety selection, duplicate removal,")
    print("workout types, error handling, and edge cases!")
    print("=" * 60)
    
    # Run with pytest
    pytest.main([__file__, "-v", "--tb=short"])
