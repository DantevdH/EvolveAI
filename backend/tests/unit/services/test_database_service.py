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

from core.training.helpers.database_service import DatabaseService


class TestDatabaseService:
    """Unit tests for DatabaseService class."""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings for testing."""
        with patch('core.training.helpers.database_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = "https://test.supabase.co"
            mock_settings.SUPABASE_ANON_KEY = "test-supabase-key"
            yield mock_settings
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing."""
        with patch('core.training.helpers.database_service.create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def database_service(self, mock_settings, mock_supabase_client):
        """Create DatabaseService instance for testing."""
        return DatabaseService()
    
    @pytest.fixture
    def sample_training_plan_data(self):
        """Sample training plan data for testing."""
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
    
    @pytest.mark.asyncio

    
    async def test_database_service_initialization(self, mock_settings, mock_supabase_client):
        """Test DatabaseService initialization."""
        with patch('core.training.helpers.database_service.create_client') as mock_create_client:
            mock_create_client.return_value = mock_supabase_client
            service = DatabaseService()
            
            assert service.supabase == mock_supabase_client
            mock_create_client.assert_called_once_with(
                mock_settings.SUPABASE_URL,
                mock_settings.SUPABASE_ANON_KEY
            )
    
    @pytest.mark.asyncio

    async def test_get_user_profile_success(self, database_service, mock_supabase_client):
        """Test successful user profile retrieval."""
        # Mock successful database response
        mock_response = Mock()
        mock_response.data = [{"id": 1, "user_id": "test-user", "name": "Test User"}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = await database_service.get_user_profile("test-user")
        
        assert result["success"] is True
        assert result["data"]["id"] == 1
        assert result["message"] == "User profile found"
        
        # Verify database call
        mock_supabase_client.table.assert_called_with("user_profiles")
        mock_supabase_client.table.return_value.select.assert_called_with("*")
        mock_supabase_client.table.return_value.select.return_value.eq.assert_called_with("user_id", "test-user")
    
    @pytest.mark.asyncio

    
    async def test_get_user_profile_not_found(self, database_service, mock_supabase_client):
        """Test user profile retrieval when profile not found."""
        # Mock empty database response
        mock_response = Mock()
        mock_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = await database_service.get_user_profile("nonexistent-user")
        
        assert result["success"] is False
        assert result["error"] == "User profile not found"
    
    @pytest.mark.asyncio

    
    async def test_get_user_profile_database_error(self, database_service, mock_supabase_client):
        """Test user profile retrieval with database error."""
        # Mock database error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database connection failed")
        
        result = await database_service.get_user_profile("test-user")
        
        assert result["success"] is False
        assert "Failed to fetch user profile" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_success(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test successful training plan saving."""
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
            mock_daily_response,  # Daily training insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = await database_service.save_training_plan(1, sample_training_plan_data)
        
        assert result["success"] is True
        assert result["data"]["training_plan_id"] == 1
        assert result["message"] == "Training plan saved successfully"
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_existing_plan(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving when plan already exists."""
        # Mock existing plan found
        mock_existing_response = Mock()
        mock_existing_response.data = [{"id": 1}]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        
        result = await database_service.save_training_plan(1, sample_training_plan_data)
        
        assert result["success"] is False
        assert "Training plan already exists" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_with_jwt_token(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with JWT token authentication."""
        # Mock the service role key to be None to force JWT token path
        with patch('core.training.helpers.database_service.settings.SUPABASE_SERVICE_ROLE_KEY', None):
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
                mock_daily_response,  # Daily training insertion
                mock_exercise_response  # Exercise insertion
            ]
            
            # Mock the postgrest.auth method
            mock_supabase_client.postgrest.auth = Mock()
            
            result = await database_service.save_training_plan(1, sample_training_plan_data, "test-jwt-token")
            
            assert result["success"] is True
            # Verify JWT token was used for authentication
            mock_supabase_client.postgrest.auth.assert_called_with("test-jwt-token")
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_duplicate_key_violation(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with duplicate key constraint violation."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock duplicate key error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("duplicate key value violates unique constraint")
        
        result = await database_service.save_training_plan(1, sample_training_plan_data)
        
        assert result["success"] is False
        assert "Duplicate key constraint violation" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_foreign_key_violation(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with foreign key constraint violation."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock foreign key error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("foreign key constraint")
        
        result = await database_service.save_training_plan(1, sample_training_plan_data)
        
        assert result["success"] is False
        assert "Database constraint violation" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_generic_error(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with generic error."""
        # Mock no existing plan
        mock_existing_response = Mock()
        mock_existing_response.data = []
        
        # Mock generic error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("Generic database error")
        
        result = await database_service.save_training_plan(1, sample_training_plan_data)
        
        assert result["success"] is False
        assert "Failed to save training plan" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_pydantic_model(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with Pydantic model data."""
        # Create a mock Pydantic model
        mock_model = Mock()
        mock_model.model_dump.return_value = sample_training_plan_data
        
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
            mock_daily_response,  # Daily training insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = await database_service.save_training_plan(1, mock_model)
        
        assert result["success"] is True
        mock_model.model_dump.assert_called_once()
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_dict_method(self, database_service, mock_supabase_client, sample_training_plan_data):
        """Test training plan saving with object that has dict() method."""
        # Create a mock object with dict() method that returns the actual data
        class MockObjectWithDict:
            def __init__(self, data):
                self.data = data
            def dict(self):
                return self.data
        
        mock_object = MockObjectWithDict(sample_training_plan_data)
        
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
            mock_daily_response,  # Daily training insertion
            mock_exercise_response  # Exercise insertion
        ]
        
        result = await database_service.save_training_plan(1, mock_object)
        
        assert result["success"] is True
        # The dict() method was called during the conversion process
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_rest_day_only(self, database_service, mock_supabase_client):
        """Test training plan saving with only rest days."""
        rest_day_plan = {
            "title": "Rest Day Plan",
            "summary": "A plan with only rest days",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
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
            mock_daily_response,  # Daily training insertion (Monday)
            mock_daily_response,  # Daily training insertion (Tuesday)
        ]
        
        result = await database_service.save_training_plan(1, rest_day_plan)
        
        assert result["success"] is True
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_success(self, database_service, mock_supabase_client):
        """Test successful training plan retrieval."""
        # Mock training plan data
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "training_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [{"id": 3, "weekly_schedule_id": 2, "day_of_week": "Monday", "is_rest_day": False}]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 4, "daily_training_id": 3, "exercise_id": 1}]
        
        mock_endurance_response = Mock()
        mock_endurance_response.data = []  # No endurance sessions
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get training plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily trainings
            mock_exercise_response,  # Get exercises
            mock_endurance_response  # Get endurance sessions
        ]
        
        result = await database_service.get_training_plan(1)
        
        assert result["success"] is True
        assert result["data"]["id"] == 1
        assert result["message"] == "Training plan retrieved successfully"
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_not_found(self, database_service, mock_supabase_client):
        """Test training plan retrieval when plan not found."""
        # Mock empty plan response
        mock_plan_response = Mock()
        mock_plan_response.data = []
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_plan_response
        
        result = await database_service.get_training_plan(999)
        
        assert result["success"] is False
        assert result["error"] == "No training plan found"
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_database_error(self, database_service, mock_supabase_client):
        """Test training plan retrieval with database error."""
        # Mock database error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database connection failed")
        
        result = await database_service.get_training_plan(1)
        
        assert result["success"] is False
        assert "Failed to fetch training plan" in result["error"]
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_with_rest_days(self, database_service, mock_supabase_client):
        """Test training plan retrieval with rest days."""
        # Mock training plan data with rest days
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "training_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = [
            {"id": 3, "weekly_schedule_id": 2, "day_of_week": "Monday", "is_rest_day": False},
            {"id": 4, "weekly_schedule_id": 2, "day_of_week": "Tuesday", "is_rest_day": True}
        ]
        
        mock_exercise_response = Mock()
        mock_exercise_response.data = [{"id": 5, "daily_training_id": 3, "exercise_id": 1}]
        
        mock_endurance_response = Mock()
        mock_endurance_response.data = []  # No endurance sessions
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get training plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily trainings
            mock_exercise_response,  # Get exercises (only for non-rest day)
            mock_endurance_response  # Get endurance sessions
        ]
        
        result = await database_service.get_training_plan(1)
        
        assert result["success"] is True
        # Verify rest day has empty exercises list
        daily_trainings = result["data"]["weekly_schedules"][0]["daily_trainings"]
        rest_day = next(d for d in daily_trainings if d["is_rest_day"])
        assert rest_day["strength_exercises"] == []
        assert rest_day["endurance_sessions"] == []


class TestDatabaseServiceEdgeCases:
    """Test edge cases and error scenarios for DatabaseService."""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings for testing."""
        with patch('core.training.helpers.database_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = "https://test.supabase.co"
            mock_settings.SUPABASE_ANON_KEY = "test-supabase-key"
            yield mock_settings
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing."""
        with patch('core.training.helpers.database_service.create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def database_service(self, mock_settings, mock_supabase_client):
        """Create DatabaseService instance for testing."""
        return DatabaseService()
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_weekly_schedule_failure(self, database_service, mock_supabase_client):
        """Test training plan saving when weekly schedule insertion fails."""
        training_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": []
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
        
        result = await database_service.save_training_plan(1, training_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_daily_training_failure(self, database_service, mock_supabase_client):
        """Test training plan saving when daily training insertion fails."""
        training_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
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
        
        # Mock failed daily training insertion
        mock_daily_response = Mock()
        mock_daily_response.data = []
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_existing_response
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = [
            mock_plan_response,  # Plan insertion
            mock_weekly_response,  # Weekly schedule insertion
            mock_daily_response,  # Daily training insertion (fails)
        ]
        
        result = await database_service.save_training_plan(1, training_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_exercise_failure(self, database_service, mock_supabase_client):
        """Test training plan saving when exercise insertion fails."""
        training_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
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
            mock_daily_response,  # Daily training insertion
            mock_exercise_response,  # Exercise insertion (fails)
        ]
        
        result = await database_service.save_training_plan(1, training_plan)
        
        # Should still return success as the main plan was created
        assert result["success"] is True
    
    @pytest.mark.asyncio

    
    async def test_save_training_plan_missing_exercise_data(self, database_service, mock_supabase_client):
        """Test training plan saving with missing exercise data."""
        training_plan = {
            "title": "Test Plan",
            "summary": "Test summary",
            "weekly_schedules": [
                {
                    "week_number": 1,
                    "daily_trainings": [
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
            mock_daily_response,  # Daily training insertion
            mock_exercise_response,  # Exercise insertion
        ]
        
        result = await database_service.save_training_plan(1, training_plan)
        
        # Should handle missing data gracefully
        assert result["success"] is True
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_empty_weekly_schedules(self, database_service, mock_supabase_client):
        """Test training plan retrieval with empty weekly schedules."""
        # Mock training plan data with empty weekly schedules
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = []  # Empty weekly schedules
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get training plan
            mock_weekly_response,  # Get weekly schedules (empty)
        ]
        
        result = await database_service.get_training_plan(1)
        
        assert result["success"] is True
        assert result["data"]["weekly_schedules"] == []
    
    @pytest.mark.asyncio

    
    async def test_get_training_plan_empty_daily_trainings(self, database_service, mock_supabase_client):
        """Test training plan retrieval with empty daily trainings."""
        # Mock training plan data with empty daily trainings
        mock_plan_response = Mock()
        mock_plan_response.data = [{"id": 1, "title": "Test Plan", "user_profile_id": 1}]
        
        mock_weekly_response = Mock()
        mock_weekly_response.data = [{"id": 2, "training_plan_id": 1, "week_number": 1}]
        
        mock_daily_response = Mock()
        mock_daily_response.data = []  # Empty daily trainings
        
        # Chain the mock responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_plan_response,  # Get training plan
            mock_weekly_response,  # Get weekly schedules
            mock_daily_response,  # Get daily trainings (empty)
        ]
        
        result = await database_service.get_training_plan(1)
        
        assert result["success"] is True
        assert result["data"]["weekly_schedules"][0]["daily_trainings"] == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
