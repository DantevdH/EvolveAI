#!/usr/bin/env python3
"""
Unit tests for DatabaseService component.

This module tests the DatabaseService class to ensure comprehensive coverage
of all database operations and error handling.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import os
import json
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to the Python path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.fitness.helpers.database_service import DatabaseService


class TestDatabaseService:
    """Unit tests for DatabaseService class."""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings for testing."""
        with patch('core.fitness.helpers.database_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = "https://test.supabase.co"
            mock_settings.SUPABASE_ANON_KEY = "test-supabase-key"
            yield mock_settings
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing."""
        with patch('core.fitness.helpers.database_service.create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def database_service(self, mock_settings, mock_supabase_client):
        """Create DatabaseService instance for testing."""
        return DatabaseService()
    
    @pytest.fixture
    def sample_workout_plan_data(self):
        """Sample workout plan data for testing."""
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
                                    "exercise_id": 1,
                                    "sets": 3,
                                    "reps": [8, 10, 8],
                                    "weight_1rm": [70, 70, 70]
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
    
    def test_database_service_initialization(self, mock_settings, mock_supabase_client):
        """Test DatabaseService initialization."""
        with patch('core.fitness.helpers.database_service.create_client') as mock_create_client:
            mock_create_client.return_value = mock_supabase_client
            service = DatabaseService()
            
            assert service.supabase == mock_supabase_client
            mock_create_client.assert_called_once_with(
                mock_settings.SUPABASE_URL,
                mock_settings.SUPABASE_ANON_KEY
            )
    
    def test_get_user_profile_success(self, database_service, mock_supabase_client):
        """Test successful user profile retrieval."""
        # Mock successful database response
        mock_response = Mock()
        mock_response.data = [{"id": 1, "user_id": "test-user", "name": "Test User"}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = database_service.get_user_profile("test-user")
        
        assert result["success"] is True
        assert result["data"]["id"] == 1
        assert result["message"] == "User profile found"
        
        # Verify database call
        mock_supabase_client.table.assert_called_with("user_profiles")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with("user_id", "test-user")
    
    def test_get_user_profile_not_found(self, database_service, mock_supabase_client):
        """Test user profile retrieval when profile not found."""
        # Mock empty database response
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = database_service.get_user_profile("nonexistent-user")
        
        assert result["success"] is False
        assert result["error"] == "User profile not found"
    
    def test_get_user_profile_database_error(self, database_service, mock_supabase_client):
        """Test user profile retrieval with database error."""
        # Mock database error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database connection failed")
        
        result = database_service.get_user_profile("test-user")
        
        assert result["success"] is False
        assert "Failed to fetch user profile" in result["error"]
    
    def test_save_workout_plan_success(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test successful workout plan saving."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data)
        
        assert result["success"] is True
        assert result["data"]["workout_plan_id"] == 1
        assert result["message"] == "Workout plan saved successfully"
    
    def test_save_workout_plan_existing_plan(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving when plan already exists."""
        # Mock existing plan found
        mock_existing_response = Mock()
        mock_existing_response.data = [{"id": 1}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data)
        
        assert result["success"] is False
        assert "Workout plan already exists" in result["error"]
    
    def test_save_workout_plan_with_jwt_token(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with JWT token authentication."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data, "test-jwt-token")
        
        assert result["success"] is True
        # Verify JWT token was used for authentication
        mock_supabase_client.postgrest.auth.assert_called_with("test-jwt-token")
    
    def test_save_workout_plan_duplicate_key_violation(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with duplicate key constraint violation."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock duplicate key error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("duplicate key value violates unique constraint")
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data)
        
        assert result["success"] is False
        assert "Duplicate key constraint violation" in result["error"]
    
    def test_save_workout_plan_foreign_key_violation(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with foreign key constraint violation."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock foreign key error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("foreign key constraint")
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data)
        
        assert result["success"] is False
        assert "Database constraint violation" in result["error"]
    
    def test_save_workout_plan_generic_error(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with generic error."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock generic error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("Generic database error")
        
        result = database_service.save_workout_plan(1, sample_workout_plan_data)
        
        assert result["success"] is False
        assert "Failed to save workout plan" in result["error"]
    
    def test_save_workout_plan_pydantic_model(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with Pydantic model data."""
        # Create a mock Pydantic model
        mock_model = Mock()
        mock_model.model_dump.return_value = sample_workout_plan_data
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = database_service.save_workout_plan(1, mock_model)
        
        assert result["success"] is True
        mock_model.model_dump.assert_called_once()
    
    def test_save_workout_plan_dict_method(self, database_service, mock_supabase_client, sample_workout_plan_data):
        """Test workout plan saving with object that has dict() method."""
        # Create a mock object with dict() method
        mock_object = Mock()
        mock_object.dict.return_value = sample_workout_plan_data
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = database_service.save_workout_plan(1, mock_object)
        
        assert result["success"] is True
        mock_object.dict.assert_called_once()
    
    def test_save_workout_plan_rest_day_only(self, database_service, mock_supabase_client):
        """Test workout plan saving with only rest days."""
        rest_day_plan = {
            "title": "Rest Day Plan",
            "summary": "A plan with only rest days",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_workouts": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": True,
                            "exercises": []
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
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        # Chain the mock responses (no exercise insertions for rest days)
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion (Monday)
            mock_daily_response,  # Daily workout insertion (Tuesday)
        ]
        
        result = database_service.save_workout_plan(1, rest_day_plan)
        
        assert result["success"] is True
    
    def test_get_workout_plan_success(self, database_service, mock_supabase_client):
        """Test successful workout plan retrieval."""
        # Mock workout plan data
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "workout_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3, "weekly_schedule_id": 2, "day_of_week": "Monday", "is_rest_day": False}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4, "daily_workout_id": 3, "exercise_id": 1}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get workout plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily workouts
            mock_exercise_response  # Get exercises
        ]
        
        result = database_service.get_workout_plan(1)
        
        assert result["success"] is True
        assert result["data"]["id"] == 1
        assert result["message"] == "Workout plan retrieved successfully"
    
    def test_get_workout_plan_not_found(self, database_service, mock_supabase_client):
        """Test workout plan retrieval when plan not found."""
        # Mock empty plan response
        mock_plan_response = Mock()
        mock_plan_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_plan_response
        
        result = database_service.get_workout_plan(999)
        
        assert result["success"] is False
        assert result["error"] == "No workout plan found"
    
    def test_get_workout_plan_database_error(self, database_service, mock_supabase_client):
        """Test workout plan retrieval with database error."""
        # Mock database error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database connection failed")
        
        result = database_service.get_workout_plan(1)
        
        assert result["success"] is False
        assert "Failed to fetch workout plan" in result["error"]
    
    def test_get_workout_plan_with_rest_days(self, database_service, mock_supabase_client):
        """Test workout plan retrieval with rest days."""
        # Mock workout plan data with rest days
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "workout_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [
            {"id": 3, "weekly_schedule_id": 2, "day_of_week": "Monday", "is_rest_day": False},
            {"id": 4, "weekly_schedule_id": 2, "day_of_week": "Tuesday", "is_rest_day": True}
        ]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 5, "daily_workout_id": 3, "exercise_id": 1}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get workout plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily workouts
            mock_exercise_response  # Get exercises (only for non-rest day)
        ]
        
        result = database_service.get_workout_plan(1)
        
        assert result["success"] is True
        # Verify rest day has empty exercises list
        daily_workouts = result["data"]["weekly_schedules"][0]["daily_workouts"]
        rest_day = next(d for d in daily_workouts if d["is_rest_day"])
        assert rest_day["exercises"] == []


class TestDatabaseServiceEdgeCases:
    """Test edge cases and error scenarios for DatabaseService."""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings for testing."""
        with patch('core.fitness.helpers.database_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = "https://test.supabase.co"
            mock_settings.SUPABASE_ANON_KEY = "test-supabase-key"
            yield mock_settings
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing."""
        with patch('core.fitness.helpers.database_service.create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def database_service(self, mock_settings, mock_supabase_client):
        """Create DatabaseService instance for testing."""
        return DatabaseService()
    
    def test_save_workout_plan_weekly_schedule_failure(self, database_service, mock_supabase_client):
        """Test workout plan saving when weekly schedule insertion fails."""
        workout_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_workouts": []
                }
            ]
        }
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful plan insertion
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        # Mock failed weekly schedule insertion
        mock_weekly_response = Mock()
        mock_weekly_response.data = []
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion (fails)
        ]
        
        result = database_service.save_workout_plan(1, workout_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    def test_save_workout_plan_daily_workout_failure(self, database_service, mock_supabase_client):
        """Test workout plan saving when daily workout insertion fails."""
        workout_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_workouts": [
                        {
                            "day_of_week": "Monday",
                            "is_rest_day": False,
                            "exercises": []
                        }
                    ]
                }
            ]
        }
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        # Mock failed daily workout insertion
        mock_daily_response = Mock()
        mock_daily_response.data = []
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion (fails)
        ]
        
        result = database_service.save_workout_plan(1, workout_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    def test_save_workout_plan_exercise_failure(self, database_service, mock_supabase_client):
        """Test workout plan saving when exercise insertion fails."""
        workout_plan = {
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
                                    "exercise_id": 1,
                                    "sets": 3,
                                    "reps": [8, 10, 8],
                                    "weight_1rm": [70, 70, 70]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        # Mock failed exercise insertion
        mock_exercise_response = Mock()
        mock_exercise_response.data = []
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response,  # Exercise insertion (fails)
        ]
        
        result = database_service.save_workout_plan(1, workout_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    def test_save_workout_plan_missing_exercise_data(self, database_service, mock_supabase_client):
        """Test workout plan saving with missing exercise data."""
        workout_plan = {
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
                                    # Missing exercise_id, sets, reps, weight_1rm
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock successful insertions
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4}]
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily workout insertion
            mock_exercise_response,  # Exercise insertion
        ]
        
        result = database_service.save_workout_plan(1, workout_plan)
        
        # Should handle missing data gracefully
        assert result["success"] is True
    
    def test_get_workout_plan_empty_weekly_schedules(self, database_service, mock_supabase_client):
        """Test workout plan retrieval with empty weekly schedules."""
        # Mock workout plan data with empty weekly schedules
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = []  # Empty weekly schedules
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get workout plan
            mock_weekly_response,  # Get weekly schedules (empty)
        ]
        
        result = database_service.get_workout_plan(1)
        
        assert result["success"] is True
        assert result["data"]["weekly_schedules"] == []
    
    def test_get_workout_plan_empty_daily_workouts(self, database_service, mock_supabase_client):
        """Test workout plan retrieval with empty daily workouts."""
        # Mock workout plan data with empty daily workouts
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "workout_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = []  # Empty daily workouts
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get workout plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily workouts (empty)
        ]
        
        result = database_service.get_workout_plan(1)
        
        assert result["success"] is True
        assert result["data"]["weekly_schedules"][0]["daily_workouts"] == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
