#!/usr/bin/env python3
"""
Database Training Type Integration Tests

These tests specifically verify that the database service correctly handles
the training_type field in both save and retrieve operations.
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from core.training.helpers.database_service import DatabaseService
from core.training.helpers.training_schemas import TrainingPlan, DailyTraining, DayOfWeek


class TestDatabaseTrainingTypeHandling:
    """Test database service training_type field handling."""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing."""
        client = MagicMock()
        
        # Mock successful insert responses
        client.table.return_value.insert.return_value.execute.return_value.data = [{'id': 1}]
        
        # Mock successful select responses
        client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        return client
    
    @pytest.fixture
    def sample_training_plan_data(self):
        """Sample training plan data with training_type fields."""
        return {
            'title': 'Test Training Plan',
            'summary': 'A test training plan with proper training_type handling',
            'weekly_schedules': [
                {
                    'week_number': 1,
                    'daily_trainings': [
                        {
                            'day_of_week': 'Monday',
                            'is_rest_day': False,
                            'training_type': 'strength',
                            'strength_exercises': [
                                {
                                    'exercise_id': 1,
                                    'sets': 3,
                                    'reps': [10, 10, 10],
                                    'weight': [0.0, 0.0, 0.0],
                                    'weight_1rm': [80.0, 80.0, 80.0]
                                }
                            ],
                            'endurance_sessions': []
                        },
                        {
                            'day_of_week': 'Tuesday',
                            'is_rest_day': True,
                            'training_type': 'recovery',
                            'strength_exercises': [],
                            'endurance_sessions': []
                        },
                        {
                            'day_of_week': 'Wednesday',
                            'is_rest_day': False,
                            'training_type': 'mixed',
                            'strength_exercises': [
                                {
                                    'exercise_id': 2,
                                    'sets': 3,
                                    'reps': [8, 8, 8],
                                    'weight': [0.0, 0.0, 0.0],
                                    'weight_1rm': [90.0, 90.0, 90.0]
                                }
                            ],
                            'endurance_sessions': [
                                {
                                    'sport_type': 'running',
                                    'training_volume': 20.0,
                                    'unit': 'minutes',
                                    'heart_rate_zone': 3
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_save_training_plan_includes_training_type(self, sample_training_plan_data, mock_supabase_client):
        """Test that save_training_plan includes training_type in daily_training records."""
        
        # Create database service with mocked client
        db_service = DatabaseService()
        db_service.supabase = mock_supabase_client
        
        # Mock the _get_authenticated_client method
        db_service._get_authenticated_client = MagicMock(return_value=mock_supabase_client)
        
        # Call save_training_plan
        result = await db_service.save_training_plan(
            user_profile_id=1,
            training_plan_data=sample_training_plan_data,
            jwt_token="test-jwt-token"
        )
        
        # Verify the result
        assert result['success'] is True
        
        # Verify that daily_training records were created with training_type
        # Get the calls to the daily_training table insert
        daily_training_calls = []
        for call in mock_supabase_client.table.call_args_list:
            if call[0][0] == 'daily_training':
                # Get the insert call
                insert_call = call[0][1].insert.call_args[0][0]
                daily_training_calls.append(insert_call)
        
        # Should have 3 daily training records
        assert len(daily_training_calls) == 3
        
        # Verify each record has training_type
        training_types = [call['training_type'] for call in daily_training_calls]
        assert 'strength' in training_types
        assert 'recovery' in training_types
        assert 'mixed' in training_types
        
        # Verify the structure of each record
        for call in daily_training_calls:
            assert 'training_type' in call
            assert 'day_of_week' in call
            assert 'is_rest_day' in call
            assert 'weekly_schedule_id' in call
            assert call['training_type'] in ['strength', 'endurance', 'mixed', 'recovery']
    
    @pytest.mark.asyncio
    async def test_save_training_plan_fallback_training_type(self, mock_supabase_client):
        """Test that save_training_plan uses fallback training_type when not provided."""
        
        # Training plan data without training_type
        training_plan_data = {
            'title': 'Test Plan',
            'summary': 'Test summary',
            'weekly_schedules': [
                {
                    'week_number': 1,
                    'daily_trainings': [
                        {
                            'day_of_week': 'Monday',
                            'is_rest_day': False,
                            # Missing training_type
                            'strength_exercises': [],
                            'endurance_sessions': []
                        },
                        {
                            'day_of_week': 'Tuesday',
                            'is_rest_day': True,
                            # Missing training_type
                            'strength_exercises': [],
                            'endurance_sessions': []
                        }
                    ]
                }
            ]
        }
        
        # Create database service with mocked client
        db_service = DatabaseService()
        db_service.supabase = mock_supabase_client
        db_service._get_authenticated_client = MagicMock(return_value=mock_supabase_client)
        
        # Call save_training_plan
        result = await db_service.save_training_plan(
            user_profile_id=1,
            training_plan_data=training_plan_data,
            jwt_token="test-jwt-token"
        )
        
        # Verify the result
        assert result['success'] is True
        
        # Verify that fallback training_type was used
        daily_training_calls = []
        for call in mock_supabase_client.table.call_args_list:
            if call[0][0] == 'daily_training':
                insert_call = call[0][1].insert.call_args[0][0]
                daily_training_calls.append(insert_call)
        
        # Should have 2 daily training records
        assert len(daily_training_calls) == 2
        
        # Verify fallback training_type was used
        monday_call = next(call for call in daily_training_calls if call['day_of_week'] == 'Monday')
        tuesday_call = next(call for call in daily_training_calls if call['day_of_week'] == 'Tuesday')
        
        # Monday: is_rest_day=False, so should be 'strength'
        assert monday_call['training_type'] == 'strength'
        
        # Tuesday: is_rest_day=True, so should be 'recovery'
        assert tuesday_call['training_type'] == 'recovery'
    
    @pytest.mark.asyncio
    async def test_get_training_plan_preserves_training_type(self, mock_supabase_client):
        """Test that get_training_plan preserves training_type from database."""
        
        # Mock database responses with training_type
        mock_training_plan = {
            'id': 1,
            'user_profile_id': 1,
            'title': 'Test Plan',
            'summary': 'Test summary'
        }
        
        mock_weekly_schedules = [
            {
                'id': 1,
                'training_plan_id': 1,
                'week_number': 1
            }
        ]
        
        mock_daily_trainings = [
            {
                'id': 1,
                'weekly_schedule_id': 1,
                'day_of_week': 'Monday',
                'is_rest_day': False,
                'training_type': 'strength',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': 2,
                'weekly_schedule_id': 1,
                'day_of_week': 'Tuesday',
                'is_rest_day': True,
                'training_type': 'recovery',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
        ]
        
        # Configure mock responses
        def mock_table_response(table_name):
            if table_name == 'training_plans':
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[mock_training_plan])))))))
            elif table_name == 'weekly_schedules':
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=mock_weekly_schedules)))))))
            elif table_name == 'daily_training':
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=mock_daily_trainings)))))))
            elif table_name == 'strength_exercise':
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))
            elif table_name == 'endurance_session':
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))
        
        mock_supabase_client.table.side_effect = mock_table_response
        
        # Create database service
        db_service = DatabaseService()
        db_service.supabase = mock_supabase_client
        
        # Call get_training_plan
        result = await db_service.get_training_plan(user_profile_id=1)
        
        # Verify the result
        assert result['success'] is True
        assert 'data' in result
        
        training_plan = result['data']
        assert training_plan['title'] == 'Test Plan'
        
        # Verify weekly schedules
        assert 'weekly_schedules' in training_plan
        assert len(training_plan['weekly_schedules']) == 1
        
        weekly_schedule = training_plan['weekly_schedules'][0]
        assert 'daily_trainings' in weekly_schedule
        assert len(weekly_schedule['daily_trainings']) == 2
        
        # Verify daily trainings preserve training_type
        daily_trainings = weekly_schedule['daily_trainings']
        
        monday_training = next(dt for dt in daily_trainings if dt['day_of_week'] == 'Monday')
        tuesday_training = next(dt for dt in daily_trainings if dt['day_of_week'] == 'Tuesday')
        
        assert monday_training['training_type'] == 'strength'
        assert tuesday_training['training_type'] == 'recovery'
        
        # Verify other fields are preserved
        assert monday_training['is_rest_day'] is False
        assert tuesday_training['is_rest_day'] is True
        assert 'strength_exercises' in monday_training
        assert 'endurance_sessions' in monday_training
    
    def test_training_type_validation(self):
        """Test that training_type values are valid."""
        
        valid_training_types = ['strength', 'endurance', 'mixed', 'recovery']
        
        # Test each valid training type
        for training_type in valid_training_types:
            daily_training = DailyTraining(
                weekly_schedule_id=1,
                day_of_week=DayOfWeek.MONDAY,
                is_rest_day=False,
                training_type=training_type,
                strength_exercises=[],
                endurance_sessions=[]
            )
            
            assert daily_training.training_type == training_type
        
        # Test invalid training type (should raise validation error)
        with pytest.raises(Exception):
            DailyTraining(
                weekly_schedule_id=1,
                day_of_week=DayOfWeek.MONDAY,
                is_rest_day=False,
                training_type="invalid_type",  # Invalid training type
                strength_exercises=[],
                endurance_sessions=[]
            )
    
    @pytest.mark.asyncio
    async def test_database_error_handling(self, mock_supabase_client):
        """Test error handling when database operations fail."""
        
        # Mock database error
        mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception("Database connection failed")
        
        # Create database service
        db_service = DatabaseService()
        db_service.supabase = mock_supabase_client
        db_service._get_authenticated_client = MagicMock(return_value=mock_supabase_client)
        
        # Call save_training_plan
        result = await db_service.save_training_plan(
            user_profile_id=1,
            training_plan_data={'title': 'Test', 'summary': 'Test', 'weekly_schedules': []},
            jwt_token="test-jwt-token"
        )
        
        # Should return error
        assert result['success'] is False
        assert 'error' in result
        assert 'Database connection failed' in result['error']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
