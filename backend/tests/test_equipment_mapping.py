#!/usr/bin/env python3
"""
Test Equipment Mapping

This script tests the equipment mapping between frontend options and database equipment types.
"""

import os
import sys
import pytest
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

if __name__ == "__main__":
    print("🚀 Equipment Mapping Test Suite")
    print("=" * 50)
    
    # Run with pytest
    pytest.main([__file__, "-v", "--tb=short"])
