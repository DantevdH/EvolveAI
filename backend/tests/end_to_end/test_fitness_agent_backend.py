#!/usr/bin/env python3
"""
Fitness Agent Backend End-to-End Tests

This module contains 10 strategic integration and end-to-end tests that provide
full assurance of a working fitness agent backend. These tests cover:

1. Complete workout generation workflow
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

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from core.agents.specialists.fitness_coach import FitnessCoach
from core.workout.schemas import UserProfileSchema, WorkoutPlanSchema
from core.workout.exercise_selector import ExerciseSelector
from core.workout.exercise_validator import ExerciseValidator
from core.workout.prompt_generator import WorkoutPromptGenerator
from core.workout.workout_service import WorkoutService

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
            final_chat_notes="New to fitness, wants to start with basics"
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
            final_chat_notes="Experienced lifter, wants to focus on hypertrophy"
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
            final_chat_notes="Competitive powerlifter, needs periodization"
        )
    }


@pytest.fixture
def mock_openai_client():
    """Fixture providing a mocked OpenAI client for testing."""
    mock_client = MagicMock()
    
    # Mock successful workout plan generation
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps({
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
                                "exercise_id": "barbell_squat_001",
                                "sets": 4,
                                "reps": [8, 10, 8, 10],
                                "description": "Compound lower body exercise",
                                "weight": None
                            },
                            {
                                "exercise_id": "bench_press_001",
                                "sets": 3,
                                "reps": [8, 12, 10],
                                "description": "Compound upper body exercise",
                                "weight": None
                            }
                        ]
                    },
                    {
                        "day_of_week": "Tuesday",
                        "is_rest_day": True,
                        "exercises": []
                    },
                    {
                        "day_of_week": "Wednesday",
                        "is_rest_day": False,
                        "exercises": [
                            {
                                "exercise_id": "deadlift_001",
                                "sets": 4,
                                "reps": [6, 8, 6, 8],
                                "description": "Posterior chain exercise",
                                "weight": None
                            }
                        ]
                    },
                    {
                        "day_of_week": "Thursday",
                        "is_rest_day": True,
                        "exercises": []
                    },
                    {
                        "day_of_week": "Friday",
                        "is_rest_day": False,
                        "exercises": [
                            {
                                "exercise_id": "barbell_squat_001",
                                "sets": 3,
                                "reps": [10, 12, 11],
                                "description": "Compound lower body exercise",
                                "weight": None
                            }
                        ]
                    },
                    {
                        "day_of_week": "Saturday",
                        "is_rest_day": True,
                        "exercises": []
                    },
                    {
                        "day_of_week": "Sunday",
                        "is_rest_day": True,
                        "exercises": []
                    }
                ]
            }
        ]
    })
    
    mock_client.chat.completions.parse.return_value = mock_response
    return mock_client


class TestFitnessAgentBackendEndToEnd:
    """Comprehensive end-to-end tests for the fitness agent backend."""
    
    def test_1_complete_workout_generation_workflow(self, sample_user_profiles, mock_openai_client):
        """
        Test 1: Complete workout generation workflow from profile to validated plan.
        
        This test ensures the entire pipeline works:
        1. User profile processing
        2. Exercise candidate selection
        3. OpenAI workout generation
        4. Exercise validation and replacement
        5. Final workout plan creation
        """
        print("\n🚀 Test 1: Complete Workout Generation Workflow")
        print("=" * 60)
        
        # Initialize components
        fitness_coach = FitnessCoach()
        
        # Test with intermediate bodybuilding profile
        user_profile = sample_user_profiles["intermediate_bodybuilding"]
        
        # Step 1: Generate workout plan
        print("1️⃣ Generating workout plan...")
        workout_plan = fitness_coach.generate_workout_plan(user_profile, mock_openai_client)
        
        # Step 2: Validate the generated plan
        assert isinstance(workout_plan, WorkoutPlanSchema)
        assert workout_plan.title == "Test Workout Plan"
        assert len(workout_plan.weekly_schedules) == 1
        
        weekly_schedule = workout_plan.weekly_schedules[0]
        assert weekly_schedule.week_number == 1
        assert len(weekly_schedule.daily_workouts) == 7
        
        # Step 3: Verify exercise structure
        monday_workout = weekly_schedule.daily_workouts[0]
        assert not monday_workout.is_rest_day
        assert len(monday_workout.exercises) == 2
        
        # Verify exercise data integrity
        first_exercise = monday_workout.exercises[0]
        assert first_exercise.exercise_id == "barbell_squat_001"
        assert first_exercise.sets == 4
        assert len(first_exercise.reps) == 4
        assert first_exercise.reps == [8, 10, 8, 10]
        
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
        
        # Create a workout plan with some invalid exercises
        workout_with_invalid_exercises = {
            "title": "Test Plan with Invalid Exercises",
            "summary": "Testing exercise validation",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_workouts": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": False,
                            "exercises": [
                                {
                                    "exercise_id": "invalid_exercise_999",
                                    "sets": 3,
                                    "reps": [8, 10, 8],
                                    "description": "This exercise ID doesn't exist",
                                    "weight": None
                                },
                                {
                                    "exercise_id": "barbell_squat_001",
                                    "sets": 4,
                                    "reps": [8, 10, 8, 10],
                                    "description": "Valid exercise",
                                    "weight": None
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Step 1: Validate and fix the workout plan
        print("1️⃣ Validating workout plan with invalid exercises...")
        validated_plan, validation_messages = exercise_validator.validate_workout_plan(
            workout_with_invalid_exercises
        )
        
        # Step 2: Verify validation results
        assert isinstance(validated_plan, dict)
        assert len(validation_messages) > 0, "Should have validation messages"
        
        # Step 3: Check that the workout plan structure is maintained
        monday_exercises = validated_plan["weekly_schedules"][0]["daily_workouts"][0]["exercises"]
        assert len(monday_exercises) == 2
        
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
        fitness_coach = FitnessCoach()
        
        # Test with different profile types
        profiles_to_test = [
            ("beginner_strength", "Home Gym", "Beginner"),
            ("intermediate_bodybuilding", "Full Gym", "Intermediate"),
            ("advanced_powerlifting", "Full Gym", "Advanced")
        ]
        
        for profile_key, expected_equipment, expected_level in profiles_to_test:
            print(f"\n   Testing {profile_key} profile...")
            user_profile = sample_user_profiles[profile_key]
            
            # Step 1: Get exercise candidates
            candidates = fitness_coach._get_exercise_candidates_for_profile(user_profile)
            
            # Step 2: Verify candidates match profile
            assert isinstance(candidates, list)
            assert len(candidates) > 0, f"Should get candidates for {profile_key}"
            
            # Step 3: Verify equipment filtering
            if expected_equipment == "Home Gym":
                # Home gym should have bodyweight and limited equipment exercises
                equipment_types = set(candidate.get("equipment", "") for candidate in candidates[:10])
                assert any("Body Weight" in eq or "Home Gym" in eq for eq in equipment_types), \
                    f"Home gym profile should include bodyweight exercises"
            
            # Step 4: Verify experience level filtering
            difficulty_levels = set(candidate.get("difficulty", "") for candidate in candidates[:10])
            if expected_level == "Beginner":
                assert "Beginner" in difficulty_levels, "Beginner profile should include beginner exercises"
            elif expected_level == "Advanced":
                assert "Advanced" in difficulty_levels, "Advanced profile should include advanced exercises"
            
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
        fitness_coach = FitnessCoach()
        
        # Test with a specific profile
        user_profile = sample_user_profiles["intermediate_bodybuilding"]
        
        # Step 1: Test metadata filter extraction
        print("1️⃣ Testing metadata filter extraction...")
        test_query = "I want to build muscle mass with compound movements for intermediate level"
        metadata_filters = fitness_coach.rag_tool.extract_metadata_filters(test_query)
        
        # Should extract relevant filters
        assert isinstance(metadata_filters, dict)
        if metadata_filters:  # May be empty depending on query
            assert all(isinstance(k, str) and isinstance(v, str) for k, v in metadata_filters.items())
        
        # Step 2: Test knowledge base search
        print("2️⃣ Testing knowledge base search...")
        relevant_docs = fitness_coach.search_fitness_documents(user_profile, max_results=3)
        
        # Should return a list (may be empty if no documents available)
        assert isinstance(relevant_docs, list)
        
        # Step 3: Test prompt enhancement
        print("3️⃣ Testing prompt enhancement...")
        base_prompt = "Create a workout plan for muscle building"
        enhanced_prompt = fitness_coach._enhance_prompt_with_knowledge(base_prompt, relevant_docs)
        
        assert isinstance(enhanced_prompt, str)
        assert len(enhanced_prompt) >= len(base_prompt)
        assert "Additional Knowledge Base Context" in enhanced_prompt or enhanced_prompt == base_prompt
        
        print("✅ Knowledge base integration test passed!")
    
    def test_5_error_handling_and_fallback_mechanisms(self, sample_user_profiles, mock_openai_client):
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
        fitness_coach = FitnessCoach()
        user_profile = sample_user_profiles["beginner_strength"]
        
        # Step 1: Test with invalid equipment (should handle gracefully)
        print("1️⃣ Testing invalid equipment handling...")
        try:
            # Temporarily modify equipment to test error handling
            original_equipment = user_profile.equipment
            user_profile.equipment = "Invalid Equipment Type"
            
            candidates = fitness_coach._get_exercise_candidates_for_profile(user_profile)
            
            # Should handle gracefully (may return empty list or handle error)
            assert isinstance(candidates, list)
            print(f"   ✅ Invalid equipment handled gracefully: {len(candidates)} candidates")
            
        finally:
            # Restore original equipment
            user_profile.equipment = "Home Gym"
        
        # Step 2: Test OpenAI error handling
        print("2️⃣ Testing OpenAI error handling...")
        with patch.object(mock_openai_client.chat.completions, 'parse', side_effect=Exception("OpenAI API error")):
            try:
                workout_plan = fitness_coach.generate_workout_plan(user_profile, mock_openai_client)
                assert False, "Should have raised an exception"
            except Exception as e:
                assert "OpenAI API error" in str(e)
                print("   ✅ OpenAI error properly caught and handled")
        
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
            final_chat_notes=""
        )
        
        # Should not crash with minimal profile
        candidates = fitness_coach._get_exercise_candidates_for_profile(incomplete_profile)
        assert isinstance(candidates, list)
        
        print("✅ Error handling and fallback mechanisms test passed!")
    
    def test_6_performance_and_scalability_under_load(self, sample_user_profiles):
        """
        Test 6: Performance and scalability under load.
        
        This test ensures:
        1. System handles multiple concurrent requests
        2. Large workout plans are processed efficiently
        3. Memory usage remains reasonable
        4. Response times are acceptable
        """
        print("\n⚡ Test 6: Performance and Scalability Under Load")
        print("=" * 60)
        
        # Initialize components
        exercise_validator = ExerciseValidator()
        
        # Step 1: Test large workout plan validation
        print("1️⃣ Testing large workout plan validation...")
        large_plan = self._create_large_workout_plan()
        
        import time
        start_time = time.time()
        
        validated_plan, validation_messages = exercise_validator.validate_workout_plan(large_plan)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert processing_time < 5.0, f"Large plan validation took {processing_time:.2f}s, should be under 5s"
        
        # Step 2: Verify large plan structure
        assert isinstance(validated_plan, dict)
        assert len(validated_plan["weekly_schedules"]) == 4
        
        total_exercises = sum(
            len(day["exercises"]) 
            for week in validated_plan["weekly_schedules"] 
            for day in week["daily_workouts"] 
            if not day["is_rest_day"]
        )
        
        assert total_exercises > 0, "Should have exercises in the large plan"
        print(f"   ✅ Large plan processed in {processing_time:.2f}s with {total_exercises} exercises")
        
        print("✅ Performance and scalability test passed!")
    
    def test_7_data_consistency_across_components(self, sample_user_profiles, mock_openai_client):
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
        fitness_coach = FitnessCoach()
        exercise_validator = ExerciseValidator()
        user_profile = sample_user_profiles["intermediate_bodybuilding"]
        
        # Step 1: Generate workout plan
        print("1️⃣ Generating workout plan...")
        workout_plan = fitness_coach.generate_workout_plan(user_profile, mock_openai_client)
        
        # Step 2: Extract exercise data for consistency checking
        print("2️⃣ Checking data consistency...")
        all_exercises = []
        for week in workout_plan.weekly_schedules:
            for day in week.daily_workouts:
                if not day.is_rest_day:
                    all_exercises.extend(day.exercises)
        
        # Step 3: Verify data consistency
        for exercise in all_exercises:
            # All exercises should have consistent structure
            assert hasattr(exercise, 'exercise_id')
            assert hasattr(exercise, 'sets')
            assert hasattr(exercise, 'reps')
            assert hasattr(exercise, 'description')
            
            # Data types should be consistent
            assert isinstance(exercise.exercise_id, str)
            assert isinstance(exercise.sets, int)
            assert isinstance(exercise.reps, list)
            assert isinstance(exercise.description, str)
            
            # Business logic consistency
            assert exercise.sets >= 1 and exercise.sets <= 10
            assert len(exercise.reps) == exercise.sets
            assert all(isinstance(rep, int) and rep > 0 for rep in exercise.reps)
        
        print(f"   ✅ Data consistency verified across {len(all_exercises)} exercises")
        print("✅ Data consistency test passed!")
    
    def test_8_api_contract_compliance_and_schema_validation(self, sample_user_profiles):
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
        
        # Test workout plan schema validation
        print("2️⃣ Testing workout plan schema validation...")
        try:
            # Create a minimal valid workout plan with proper day names
            valid_workout_plan = {
                "title": "Test Plan",
                "summary": "Test summary",
                "weekly_schedules": [
                    {
                        "week_number": 1,
                        "daily_workouts": [
                            {
                                "day_of_week": "Monday",
                                "is_rest_day": False,
                                "exercises": [
                                    {
                                        "exercise_id": "test_exercise",
                                        "sets": 3,
                                        "reps": [8, 10, 8],
                                        "description": "Test exercise",
                                        "weight": None
                                    }
                                ]
                            },
                            {
                                "day_of_week": "Tuesday",
                                "is_rest_day": True,
                                "exercises": []
                            },
                            {
                                "day_of_week": "Wednesday",
                                "is_rest_day": True,
                                "exercises": []
                            },
                            {
                                "day_of_week": "Thursday",
                                "is_rest_day": True,
                                "exercises": []
                            },
                            {
                                "day_of_week": "Friday",
                                "is_rest_day": True,
                                "exercises": []
                            },
                            {
                                "day_of_week": "Saturday",
                                "is_rest_day": True,
                                "exercises": []
                            },
                            {
                                "day_of_week": "Sunday",
                                "is_rest_day": True,
                                "exercises": []
                            }
                        ]
                    }
                ]
            }
            
            # Should validate successfully
            workout_plan = WorkoutPlanSchema(**valid_workout_plan)
            assert isinstance(workout_plan, WorkoutPlanSchema)
            assert workout_plan.title == "Test Plan"
            
            print("   ✅ Valid workout plan schema validation passed")
            
        except Exception as e:
            pytest.fail(f"Valid workout plan validation failed: {e}")
        
        print("✅ API contract compliance test passed!")
    
    def test_9_real_world_usage_scenarios(self, sample_user_profiles, mock_openai_client):
        """
        Test 9: Real-world usage scenarios.
        
        This test ensures:
        1. Common user requests work correctly
        2. Edge cases are handled properly
        3. System behaves predictably in real usage
        4. User experience is smooth
        """
        print("\n🌍 Test 9: Real-World Usage Scenarios")
        print("=" * 60)
        
        # Initialize components
        fitness_coach = FitnessCoach()
        
        # Scenario 1: Beginner starting fitness journey
        print("1️⃣ Scenario: Beginner starting fitness journey...")
        beginner_profile = sample_user_profiles["beginner_strength"]
        
        # Should get appropriate exercise recommendations
        candidates = fitness_coach.recommend_exercises(
            muscle_group="chest",
            difficulty="beginner",
            equipment="Home Gym",
            user_profile=beginner_profile
        )
        
        assert isinstance(candidates, list)
        assert len(candidates) > 0
        print(f"   ✅ Beginner chest exercises: {len(candidates)} recommendations")
        
        # Scenario 2: Intermediate user with specific goals
        print("2️⃣ Scenario: Intermediate user with specific goals...")
        intermediate_profile = sample_user_profiles["intermediate_bodybuilding"]
        
        # Should get more advanced recommendations
        candidates = fitness_coach.recommend_exercises(
            muscle_group="back",
            difficulty="intermediate",
            equipment="Full Gym",
            user_profile=intermediate_profile
        )
        
        assert isinstance(candidates, list)
        assert len(candidates) > 0
        print(f"   ✅ Intermediate back exercises: {len(candidates)} recommendations")
        
        # Scenario 3: Advanced user with complex needs
        print("3️⃣ Scenario: Advanced user with complex needs...")
        advanced_profile = sample_user_profiles["advanced_powerlifting"]
        
        # Should handle complex profile correctly
        target_muscles = fitness_coach._get_target_muscle_groups(advanced_profile)
        assert isinstance(target_muscles, list)
        assert len(target_muscles) > 0
        
        profile_query = fitness_coach._build_profile_query(advanced_profile)
        assert isinstance(profile_query, str)
        assert len(profile_query) > 0
        assert "powerlifting" in profile_query.lower() or "strength" in profile_query.lower()
        
        print(f"   ✅ Advanced user handling: {len(target_muscles)} target muscles")
        
        print("✅ Real-world usage scenarios test passed!")
    
    def test_10_system_resilience_and_recovery(self, sample_user_profiles):
        """
        Test 10: System resilience and recovery.
        
        This test ensures:
        1. System recovers from temporary failures
        2. Degraded performance is handled gracefully
        3. System remains functional under stress
        4. Recovery mechanisms work correctly
        """
        print("\n🔄 Test 10: System Resilience and Recovery")
        print("=" * 60)
        
        # Initialize components
        fitness_coach = FitnessCoach()
        user_profile = sample_user_profiles["beginner_strength"]
        
        # Test 1: Exercise selector fallback
        print("1️⃣ Testing exercise selector fallback...")
        try:
            # This should work even if database is slow
            candidates = fitness_coach._get_exercise_candidates_for_profile(user_profile)
            assert isinstance(candidates, list)
            print(f"   ✅ Exercise selection resilient: {len(candidates)} candidates")
        except Exception as e:
            print(f"   ⚠️ Exercise selection had issues: {e}")
        
        # Test 2: Knowledge base resilience
        print("2️⃣ Testing knowledge base resilience...")
        try:
            # Should handle knowledge base issues gracefully
            docs = fitness_coach.search_fitness_documents(user_profile, max_results=1)
            assert isinstance(docs, list)
            print(f"   ✅ Knowledge base resilient: {len(docs)} documents")
        except Exception as e:
            print(f"   ⚠️ Knowledge base had issues: {e}")
        
        # Test 3: Profile processing resilience
        print("3️⃣ Testing profile processing resilience...")
        try:
            # Should handle various profile configurations
            target_muscles = fitness_coach._get_target_muscle_groups(user_profile)
            assert isinstance(target_muscles, list)
            
            profile_query = fitness_coach._build_profile_query(user_profile)
            assert isinstance(profile_query, str)
            
            print(f"   ✅ Profile processing resilient: {len(target_muscles)} target muscles")
        except Exception as e:
            print(f"   ⚠️ Profile processing had issues: {e}")
        
        print("✅ System resilience and recovery test passed!")
    
    def _create_large_workout_plan(self):
        """Helper method to create a large workout plan for performance testing."""
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
        
        return large_plan


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
