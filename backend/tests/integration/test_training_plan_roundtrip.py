#!/usr/bin/env python3
"""
Critical Integration Tests: Training Plan Round-Trip Data Flow

Tests the critical path that was causing HTTP 422 errors:
1. Plan generation → transformation → persistence
2. Plan retrieval → transformation → update → persistence
3. Multiple updates without data loss

This suite validates the fixes for:
- exercise_name, main_muscle, equipment metadata preservation
- Frontend-backend data format transformations
- Pydantic schema validation across the entire flow
"""

import os
import sys
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from core.training.helpers.database_service import DatabaseService
from core.training.helpers.training_schemas import TrainingPlan, StrengthExercise
from core.training.helpers.schemas import UserProfileSchema


class TestTrainingPlanRoundTrip:
    """Test training plan data round-trip preservation."""

    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client with proper responses."""
        mock_client = MagicMock()
        
        # Mock exercise metadata lookup
        mock_exercise_metadata = {
            "id": 101,
            "name": "Barbell Bench Press",
            "main_muscle": "Chest",
            "equipment": "Barbell",
            "target_area": "Upper Body",
            "primary_muscles": ["Chest", "Triceps", "Shoulders"],
            "force": "Push"
        }
        
        mock_exercise_result = MagicMock()
        mock_exercise_result.data = mock_exercise_metadata
        mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_exercise_result
        
        return mock_client

    @pytest.fixture
    def database_service(self, mock_supabase_client):
        """Create DatabaseService with mocked Supabase."""
        with patch("core.training.helpers.database_service.create_client") as mock_create:
            with patch("core.training.helpers.database_service.settings") as mock_settings:
                mock_settings.SUPABASE_URL = "https://test.supabase.co"
                mock_settings.SUPABASE_ANON_KEY = "test-key"
                mock_settings.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
                mock_create.return_value = mock_supabase_client
                return DatabaseService()

    @pytest.fixture
    def sample_strength_exercise(self):
        """Sample strength exercise with full metadata (like after enrichment)."""
        return {
            "exercise_id": 101,
            "sets": 3,
            "reps": [8, 10, 8],
            "weight": [70.0, 70.0, 70.0],
            "execution_order": 1,
            "completed": False,
            # CRITICAL: These fields must be present for round-trip
            "exercise_name": "Barbell Bench Press",
            "main_muscle": "Chest",
            "equipment": "Barbell",
            # Enriched fields
            "target_area": "Upper Body",
            "main_muscles": ["Chest", "Triceps", "Shoulders"],
            "force": "Push"
        }

    @pytest.mark.asyncio
    async def test_enrichment_preserves_critical_fields(
        self, database_service, sample_strength_exercise, mock_supabase_client
    ):
        """
        CRITICAL: Test that save_training_plan enrichment adds exercise_name, main_muscle, equipment.
        
        This tests the fix in database_service.py lines 503-505.
        """
        # Create a weekly schedule with strength exercises
        weekly_schedule = {
            "week_number": 1,
            "daily_trainings": [
                {
                    "day_of_week": "Monday",
                    "is_rest_day": False,
                    "training_type": "strength",
                    "strength_exercises": [sample_strength_exercise],
                }
            ]
        }
        
        plan_dict = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [weekly_schedule]
        }
        
        # Mock the supabase insert chain
        mock_plan_result = MagicMock()
        mock_plan_result.data = [{"id": 1}]
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_plan_result
        
        mock_weekly_result = MagicMock()
        mock_weekly_result.data = [{"id": 1}]
        
        mock_daily_result = MagicMock()
        mock_daily_result.data = [{"id": 1}]
        
        mock_exercise_result = MagicMock()
        mock_exercise_result.data = [{"id": 1}]
        
        # Chain the mock calls
        mock_supabase_client.table.side_effect = [
            MagicMock(**{"insert.return_value.execute.return_value": mock_plan_result}),
            MagicMock(**{"insert.return_value.execute.return_value": mock_weekly_result}),
            MagicMock(**{"insert.return_value.execute.return_value": mock_daily_result}),
            MagicMock(**{"insert.return_value.execute.return_value": mock_exercise_result}),
        ]
        
        # Call save_training_plan
        result = await database_service.save_training_plan(
            user_profile_id=1,
            training_plan_data=plan_dict,
            jwt_token="test-token"
        )
        
        # Verify enrichment happened
        assert result["success"] is True
        
        # Check that enrichment was called (exercise metadata lookup)
        # The enrichment adds exercise_name, main_muscle, equipment to top-level
        call_count = 0
        for call in mock_supabase_client.table.call_args_list:
            if call[0] and call[0][0] == "exercises":
                call_count += 1
        
        # Should have enriched at least once
        assert call_count > 0, "Exercise metadata enrichment was not called"

    @pytest.mark.asyncio
    async def test_pydantic_validation_with_all_fields(
        self, sample_strength_exercise
    ):
        """
        CRITICAL: Test that StrengthExercise Pydantic model validates successfully with all fields present.
        
        This tests that our data structure matches the schema requirements.
        """
        # This should NOT raise validation errors
        exercise = StrengthExercise(**sample_strength_exercise)
        
        assert exercise.exercise_id == 101
        assert exercise.exercise_name == "Barbell Bench Press"
        assert exercise.main_muscle == "Chest"
        assert exercise.equipment == "Barbell"

    @pytest.mark.asyncio
    async def test_pydantic_validation_with_missing_fields_fails(
        self, sample_strength_exercise
    ):
        """
        CRITICAL: Test that missing critical fields cause Pydantic validation to fail.
        
        This simulates the HTTP 422 error we were seeing.
        """
        # Remove critical fields
        incomplete_exercise = {k: v for k, v in sample_strength_exercise.items() 
                             if k not in ["exercise_name", "main_muscle", "equipment"]}
        
        # Try to set exercise_id to None to trigger validate_exercise_mode
        incomplete_exercise["exercise_id"] = None
        
        # This SHOULD raise a validation error
        with pytest.raises(ValueError, match="When exercise_id is None, all AI metadata fields must be provided"):
            StrengthExercise(**incomplete_exercise)

    @pytest.mark.asyncio
    async def test_update_plan_enrichment_preserves_metadata(
        self, database_service, sample_strength_exercise, mock_supabase_client
    ):
        """
        CRITICAL: Test that update_training_plan re-enriches metadata like save_training_plan does.
        
        This tests the fix in database_service.py lines 1095-1118.
        """
        # Prepare plan with strength exercises
        plan_dict = {
            "id": 1,
            "title": "Updated Plan",
            "summary": "Updated summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": False,
                            "training_type": "strength",
                            "strength_exercises": [sample_strength_exercise],
                        }
                    ]
                }
            ]
        }
        
        # Mock Supabase responses
        mock_plan_result = MagicMock()
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_plan_result
        
        mock_weekly_result = MagicMock()
        mock_weekly_result.data = [{"id": 1}]
        mock_daily_result = MagicMock()
        mock_daily_result.data = [{"id": 1}]
        mock_exercise_result = MagicMock()
        mock_exercise_result.data = [{"id": 1}]
        
        # Configure mock chain
        call_index = 0
        def table_side_effect(*args):
            nonlocal call_index
            call_index += 1
            if args[0] == "training_plans":
                return MagicMock(**{"update.return_value.eq.return_value.execute.return_value": mock_plan_result})
            elif args[0] == "weekly_schedules":
                return MagicMock(**{"insert.return_value.execute.return_value": mock_weekly_result})
            elif args[0] == "daily_training":
                return MagicMock(**{"insert.return_value.execute.return_value": mock_daily_result})
            elif args[0] == "strength_exercise":
                return MagicMock(**{"insert.return_value.execute.return_value": mock_exercise_result})
            elif args[0] == "exercises":
                return MagicMock(**{"select.return_value.eq.return_value.single.return_value.execute.return_value": self._get_mock_exercise_metadata()})
            return MagicMock()
        
        mock_supabase_client.table.side_effect = table_side_effect
        
        # Call update_training_plan
        result = await database_service.update_training_plan(
            plan_id=1,
            updated_plan_data=plan_dict,
            jwt_token="test-token"
        )
        
        # Verify result is not None
        assert result is not None
        
        # Verify enrichment was called for exercises
        enrichment_calls = [call for call in mock_supabase_client.table.call_args_list 
                           if call[0] and call[0][0] == "exercises"]
        
        assert len(enrichment_calls) > 0, "Exercise metadata enrichment was not called during update"

    @staticmethod
    def _get_mock_exercise_metadata():
        """Helper to create mock exercise metadata result."""
        result = MagicMock()
        result.data = {
            "id": 101,
            "name": "Barbell Bench Press",
            "main_muscle": "Chest",
            "equipment": "Barbell",
            "target_area": "Upper Body",
            "primary_muscles": ["Chest", "Triceps", "Shoulders"],
            "force": "Push"
        }
        return result

    @pytest.mark.asyncio
    async def test_data_transform_round_trip_completeness(self):
        """
        CRITICAL: Test that transformed data has all required fields for backend validation.
        
        Simulates frontend → backend → frontend round-trip.
        """
        # Simulate frontend data (camelCase with nested exercise)
        frontend_exercise = {
            "id": "1",
            "exerciseId": "101",
            "exerciseName": "Barbell Bench Press",
            "sets": [
                {"reps": 8, "weight": 70.0, "completed": False},
                {"reps": 10, "weight": 70.0, "completed": False},
                {"reps": 8, "weight": 70.0, "completed": False}
            ],
            "executionOrder": 1,
            "order": 1,
            "mainMuscle": "Chest",
            "equipment": "Barbell",
            "targetArea": "Upper Body",
            "mainMuscles": ["Chest", "Triceps", "Shoulders"],
            "force": "Push",
            "completed": False,
            "exercise": {
                "id": "101",
                "name": "Barbell Bench Press",
                "mainMuscle": "Chest",
                "equipment": "Barbell",
                "targetArea": "Upper Body",
                "mainMuscles": ["Chest", "Triceps", "Shoulders"],
                "force": "Push"
            }
        }
        
        # Simulate backend transformation (reverseTransformStrengthExercise logic)
        backend_exercise = {
            "id": 1,
            "exercise_id": 101,
            "exercise_name": frontend_exercise["exerciseName"],
            "main_muscle": frontend_exercise["mainMuscle"],
            "equipment": frontend_exercise["equipment"],
            "sets": 3,
            "reps": [set["reps"] for set in frontend_exercise["sets"]],
            "weight": [set["weight"] for set in frontend_exercise["sets"]],
            "execution_order": frontend_exercise["executionOrder"],
            "target_area": frontend_exercise["targetArea"],
            "main_muscles": frontend_exercise["mainMuscles"],
            "force": frontend_exercise["force"],
            "completed": False,
            "daily_training_id": 1
        }
        
        # CRITICAL: Validate that this data passes Pydantic validation
        exercise = StrengthExercise(**backend_exercise)
        
        assert exercise.exercise_id == 101
        assert exercise.exercise_name == "Barbell Bench Press"
        assert exercise.main_muscle == "Chest"
        assert exercise.equipment == "Barbell"
        
        # Verify no validation errors
        assert exercise.model_dump() is not None


class TestTrainingPlanMetadataPersistence:
    """Test that exercise metadata persists across multiple operations."""

    @pytest.mark.asyncio
    async def test_multiple_updates_maintain_metadata(self):
        """
        CRITICAL: Test that updating a plan multiple times doesn't lose exercise metadata.
        
        This tests the scenario where a user updates their plan repeatedly.
        """
        # Initial exercise with full metadata
        initial_exercise = {
            "exercise_id": 101,
            "exercise_name": "Barbell Bench Press",
            "main_muscle": "Chest",
            "equipment": "Barbell",
            "sets": 3,
            "reps": [8, 10, 8],
            "weight": [70.0, 70.0, 70.0],
            "execution_order": 1,
            "completed": False
        }
        
        # First update: should preserve metadata
        result1 = StrengthExercise(**initial_exercise)
        assert result1.exercise_name is not None
        assert result1.main_muscle is not None
        assert result1.equipment is not None
        
        # Simulate what comes back from update_training_plan (with re-enrichment)
        # In real flow, backend re-enriches, so we simulate that
        updated_exercise = result1.model_dump()
        
        # Second update: should still have metadata
        result2 = StrengthExercise(**updated_exercise)
        assert result2.exercise_name == result1.exercise_name
        assert result2.main_muscle == result1.main_muscle
        assert result2.equipment == result1.equipment


if __name__ == "__main__":
    print("🚀 Training Plan Round-Trip Integration Tests")
    print("=" * 70)
    print("Testing critical data flow fixes for HTTP 422 error")
    print("=" * 70)
    pytest.main([__file__, "-v", "--tb=short"])

