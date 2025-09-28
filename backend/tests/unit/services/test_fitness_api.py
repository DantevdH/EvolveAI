#!/usr/bin/env python3
"""
Unit tests for Fitness API endpoints.

This module tests the FastAPI endpoints in fitness_api.py to ensure
comprehensive coverage of all API routes and error handling.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import os
import json

# Add the backend directory to the Python path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.fitness.fitness_api import router, get_fitness_coach
from core.fitness.helpers.ai_question_schemas import (
    InitialQuestionsRequest,
    FollowUpQuestionsRequest,
    PlanGenerationRequest,
    PersonalInfo
)


class TestFitnessAPI:
    """Unit tests for Fitness API endpoints."""
    
    @pytest.fixture
    def mock_fitness_coach(self):
        """Mock FitnessCoach for testing."""
        mock_coach = Mock()
        return mock_coach
    
    @pytest.fixture
    def client(self, mock_fitness_coach):
        """Create test client with mocked dependencies."""
        from fastapi import FastAPI
        
        app = FastAPI()
        app.include_router(router)
        
        # Override the dependency
        app.dependency_overrides[get_fitness_coach] = lambda: mock_fitness_coach
        
        return TestClient(app)
    
    @pytest.fixture
    def sample_personal_info(self):
        """Sample personal info for testing."""
        return PersonalInfo(
            username="testuser",
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            goal_description="Build muscle and strength",
            experience_level="intermediate"
        )
    
    @pytest.fixture
    def sample_initial_questions_request(self, sample_personal_info):
        """Sample initial questions request."""
        return InitialQuestionsRequest(personal_info=sample_personal_info)
    
    @pytest.fixture
    def sample_follow_up_questions_request(self, sample_personal_info):
        """Sample follow-up questions request."""
        return FollowUpQuestionsRequest(
            personal_info=sample_personal_info,
            initial_responses={
                "primary_goal": "strength_training",
                "experience_level": "intermediate",
                "equipment": "home_gym"
            }
        )
    
    @pytest.fixture
    def sample_plan_generation_request(self, sample_personal_info):
        """Sample plan generation request."""
        return PlanGenerationRequest(
            personal_info=sample_personal_info,
            initial_responses={
                "primary_goal": "strength_training",
                "experience_level": "intermediate",
                "equipment": "home_gym"
            },
            follow_up_responses={
                "days_per_week": 4,
                "minutes_per_session": 60,
                "has_limitations": False
            }
        )
    
    def test_get_fitness_coach_dependency(self):
        """Test the get_fitness_coach dependency function."""
        coach = get_fitness_coach()
        assert coach is not None
        # Should return a FitnessCoach instance
        assert hasattr(coach, 'generate_initial_questions')
        assert hasattr(coach, 'generate_follow_up_questions')
        assert hasattr(coach, 'generate_training_plan')
    
    def test_initial_questions_endpoint_success(self, client, mock_fitness_coach, sample_initial_questions_request):
        """Test successful initial questions generation."""
        # Mock successful response
        from unittest.mock import Mock
        mock_questions_response = Mock()
        mock_questions_response.total_questions = 5
        mock_questions_response.questions = [
            {"text": "How many days per week do you train?", "response_type": "multiple_choice"},
            {"text": "What equipment do you have access to?", "response_type": "multiple_choice"}
        ]
        # Set as dict for JSON serialization  
        mock_questions_response.__dict__.update({
            "total_questions": 5,
            "questions": [
                {"text": "How many days per week do you train?", "response_type": "multiple_choice"},
                {"text": "What equipment do you have access to?", "response_type": "multiple_choice"}
            ]
        })

        mock_fitness_coach.generate_initial_questions.return_value = mock_questions_response
        
        response = client.post("/api/fitness/initial-questions", json=sample_initial_questions_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Initial questions generated successfully"
        assert "data" in data
        
        # Verify the coach was called correctly
        mock_fitness_coach.generate_initial_questions.assert_called_once()
        call_args = mock_fitness_coach.generate_initial_questions.call_args[0][0]
        assert call_args.username == "testuser"
        assert call_args.age == 25
    
    def test_initial_questions_endpoint_error(self, client, mock_fitness_coach, sample_initial_questions_request):
        """Test initial questions endpoint with error."""
        # Mock error response
        mock_fitness_coach.generate_initial_questions.side_effect = Exception("AI service unavailable")

        response = client.post("/api/fitness/initial-questions", json=sample_initial_questions_request.model_dump())

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "AI service unavailable" in data["message"]
    
    def test_initial_questions_endpoint_invalid_request(self, client, mock_fitness_coach):
        """Test initial questions endpoint with invalid request."""
        # Send invalid request data
        invalid_request = {"invalid": "data"}
        
        response = client.post("/api/fitness/initial-questions", json=invalid_request)
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_follow_up_questions_endpoint_success(self, client, mock_fitness_coach, sample_follow_up_questions_request):
        """Test successful follow-up questions generation."""
        # Mock successful response
        from unittest.mock import Mock
        mock_questions_response = Mock()
        mock_questions_response.total_questions = 3
        mock_questions_response.questions = [
            {"text": "How many minutes can you dedicate per session?", "response_type": "multiple_choice"},
            {"text": "Do you have any physical limitations?", "response_type": "boolean"}
        ]
        # Set as dict for JSON serialization  
        mock_questions_response.__dict__.update({
            "total_questions": 3,
            "questions": [
                {"text": "How many minutes can you dedicate per session?", "response_type": "multiple_choice"},
                {"text": "Do you have any physical limitations?", "response_type": "boolean"}
            ]
        })

        mock_fitness_coach.generate_follow_up_questions.return_value = mock_questions_response
        
        response = client.post("/api/fitness/follow-up-questions", json=sample_follow_up_questions_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Follow-up questions generated successfully"
        assert "data" in data
        
        # Verify the coach was called correctly
        mock_fitness_coach.generate_follow_up_questions.assert_called_once()
        call_args = mock_fitness_coach.generate_follow_up_questions.call_args
        assert call_args[0][0].username == "testuser"  # personal_info
        assert call_args[0][1]["primary_goal"] == "strength_training"  # initial_responses
    
    def test_follow_up_questions_endpoint_error(self, client, mock_fitness_coach, sample_follow_up_questions_request):
        """Test follow-up questions endpoint with error."""
        # Mock error response
        mock_fitness_coach.generate_follow_up_questions.side_effect = Exception("AI service unavailable")

        response = client.post("/api/fitness/follow-up-questions", json=sample_follow_up_questions_request.model_dump())

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "AI service unavailable" in data["message"]
    
    def test_follow_up_questions_endpoint_invalid_request(self, client, mock_fitness_coach):
        """Test follow-up questions endpoint with invalid request."""
        # Send invalid request data
        invalid_request = {"invalid": "data"}
        
        response = client.post("/api/fitness/follow-up-questions", json=invalid_request)
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_generate_plan_endpoint_success(self, client, mock_fitness_coach, sample_plan_generation_request):
        """Test successful workout plan generation."""
        # Mock successful response
        mock_workout_plan = {
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
                                    "description": "Test exercise"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        mock_fitness_coach.generate_training_plan.return_value = {
            "success": True,
            "workout_plan": mock_workout_plan
        }
        
        response = client.post("/api/fitness/generate-plan", json=sample_plan_generation_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["workout_plan"] == mock_workout_plan
        assert data["message"] == "Workout plan generated successfully"
        
        # Verify the coach was called correctly
        mock_fitness_coach.generate_training_plan.assert_called_once()
        call_args = mock_fitness_coach.generate_training_plan.call_args
        assert call_args[1]["personal_info"].username == "testuser"
        assert call_args[1]["user_responses"]["primary_goal"] == "strength_training"
    
    def test_generate_plan_endpoint_failure(self, client, mock_fitness_coach, sample_plan_generation_request):
        """Test workout plan generation failure."""
        # Mock failure response
        mock_fitness_coach.generate_training_plan.return_value = {
            "success": False,
            "error": "Failed to generate workout plan"
        }
        
        response = client.post("/api/fitness/generate-plan", json=sample_plan_generation_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["data"] is None
        assert "Failed to generate workout plan" in data["message"]
    
    def test_generate_plan_endpoint_exception(self, client, mock_fitness_coach, sample_plan_generation_request):
        """Test workout plan generation with exception."""
        # Mock exception
        mock_fitness_coach.generate_training_plan.side_effect = Exception("AI service unavailable")
        
        response = client.post("/api/fitness/generate-plan", json=sample_plan_generation_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["data"] is None
        assert "Failed to generate workout plan" in data["error"]
    
    def test_generate_plan_endpoint_invalid_request(self, client, mock_fitness_coach):
        """Test workout plan generation with invalid request."""
        # Send invalid request data
        invalid_request = {"invalid": "data"}
        
        response = client.post("/api/fitness/generate-plan", json=invalid_request)
        
        # Should return validation error
        assert response.status_code == 422
    
    def test_generate_plan_endpoint_missing_success_field(self, client, mock_fitness_coach, sample_plan_generation_request):
        """Test workout plan generation with missing success field."""
        # Mock response without success field
        mock_fitness_coach.generate_training_plan.return_value = {
            "workout_plan": {"title": "Test Plan"}
        }
        
        response = client.post("/api/fitness/generate-plan", json=sample_plan_generation_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Failed to generate workout plan" in data["message"]
    
    def test_generate_plan_endpoint_empty_responses(self, client, mock_fitness_coach):
        """Test workout plan generation with empty responses."""
        # Create request with empty responses
        empty_request = PlanGenerationRequest(
            personal_info=PersonalInfo(
                username="testuser",
                age=25,
                weight=70.0,
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                goal_description="Build muscle",
                experience_level="intermediate"
            ),
            initial_responses={},
            follow_up_responses={}
        )
        
        # Mock successful response
        mock_workout_plan = {"title": "Test Plan"}
        mock_fitness_coach.generate_training_plan.return_value = {
            "success": True,
            "workout_plan": mock_workout_plan
        }
        
        response = client.post("/api/fitness/generate-plan", json=empty_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify empty responses were passed correctly
        call_args = mock_fitness_coach.generate_training_plan.call_args
        assert call_args[1]["user_responses"] == {}
    
    def test_generate_plan_endpoint_combined_responses(self, client, mock_fitness_coach):
        """Test workout plan generation with combined initial and follow-up responses."""
        # Create request with both initial and follow-up responses
        combined_request = PlanGenerationRequest(
            personal_info=PersonalInfo(
                username="testuser",
                age=25,
                weight=70.0,
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                goal_description="Build muscle",
                experience_level="intermediate"
            ),
            initial_responses={"primary_goal": "strength_training"},
            follow_up_responses={"days_per_week": 4}
        )
        
        # Mock successful response
        mock_workout_plan = {"title": "Test Plan"}
        mock_fitness_coach.generate_training_plan.return_value = {
            "success": True,
            "workout_plan": mock_workout_plan
        }
        
        response = client.post("/api/fitness/generate-plan", json=combined_request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify responses were combined correctly
        call_args = mock_fitness_coach.generate_training_plan.call_args
        combined_responses = call_args[1]["user_responses"]
        assert combined_responses["primary_goal"] == "strength_training"
        assert combined_responses["days_per_week"] == 4


class TestFitnessAPIEdgeCases:
    """Test edge cases and error scenarios for Fitness API."""
    
    @pytest.fixture
    def mock_fitness_coach(self):
        """Mock FitnessCoach for testing."""
        mock_coach = Mock()
        return mock_coach
    
    @pytest.fixture
    def client(self, mock_fitness_coach):
        """Create test client with mocked dependencies."""
        from fastapi import FastAPI
        
        app = FastAPI()
        app.include_router(router)
        
        # Override the dependency
        app.dependency_overrides[get_fitness_coach] = lambda: mock_fitness_coach
        
        return TestClient(app)
    
    def test_initial_questions_endpoint_logging(self, client, mock_fitness_coach):
        """Test that initial questions endpoint logs correctly."""
        # Mock successful response
        mock_questions_response = Mock()
        mock_questions_response.total_questions = 5
        mock_questions_response.questions = []
        
        mock_fitness_coach.generate_initial_questions.return_value = mock_questions_response
        
        # Create request with specific goal description for logging
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle and strength",
                "experience_level": "intermediate"
            }
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/initial-questions", json=request_data)
            
            assert response.status_code == 200
            
            # Verify logging calls
            mock_logger.info.assert_called()
            # Check that goal description was logged
            log_calls = [call[0][0] for call in mock_logger.info.call_args_list]
            assert any("Build muscle and strength" in call for call in log_calls)
    
    def test_follow_up_questions_endpoint_logging(self, client, mock_fitness_coach):
        """Test that follow-up questions endpoint logs correctly."""
        # Mock successful response
        mock_questions_response = Mock()
        mock_questions_response.total_questions = 3
        mock_questions_response.questions = []
        
        mock_fitness_coach.generate_follow_up_questions.return_value = mock_questions_response
        
        # Create request with specific goal description for logging
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle and strength",
                "experience_level": "intermediate"
            },
            "initial_responses": {
                "primary_goal": "strength_training"
            }
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/follow-up-questions", json=request_data)
            
            assert response.status_code == 200
            
            # Verify logging calls
            mock_logger.info.assert_called()
            # Check that goal description was logged
            log_calls = [call[0][0] for call in mock_logger.info.call_args_list]
            assert any("Build muscle and strength" in call for call in log_calls)
    
    def test_generate_plan_endpoint_logging(self, client, mock_fitness_coach):
        """Test that generate plan endpoint logs correctly."""
        # Mock successful response
        mock_workout_plan = {"title": "Test Plan"}
        mock_fitness_coach.generate_training_plan.return_value = {
            "success": True,
            "workout_plan": mock_workout_plan
        }
        
        # Create request with specific goal description for logging
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle and strength",
                "experience_level": "intermediate"
            },
            "initial_responses": {
                "primary_goal": "strength_training"
            },
            "follow_up_responses": {
                "days_per_week": 4
            }
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/generate-plan", json=request_data)
            
            assert response.status_code == 200
            
            # Verify logging calls
            mock_logger.info.assert_called()
            # Check that goal description was logged
            log_calls = [call[0][0] for call in mock_logger.info.call_args_list]
            assert any("Build muscle and strength" in call for call in log_calls)
    
    def test_generate_plan_endpoint_error_logging(self, client, mock_fitness_coach):
        """Test that generate plan endpoint logs errors correctly."""
        # Mock exception
        mock_fitness_coach.generate_training_plan.side_effect = Exception("AI service unavailable")
        
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle",
                "experience_level": "intermediate"
            },
            "initial_responses": {},
            "follow_up_responses": {}
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/generate-plan", json=request_data)
            
            assert response.status_code == 200
            
            # Verify error logging
            mock_logger.error.assert_called()
            error_calls = [call[0][0] for call in mock_logger.error.call_args_list]
            assert any("AI service unavailable" in call for call in error_calls)
    
    def test_initial_questions_endpoint_error_logging(self, client, mock_fitness_coach):
        """Test that initial questions endpoint logs errors correctly."""
        # Mock exception
        mock_fitness_coach.generate_initial_questions.side_effect = Exception("AI service unavailable")
        
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle",
                "experience_level": "intermediate"
            }
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/initial-questions", json=request_data)
            
            assert response.status_code == 200
            
            # Verify error logging
            mock_logger.error.assert_called()
            error_calls = [call[0][0] for call in mock_logger.error.call_args_list]
            assert any("AI service unavailable" in call for call in error_calls)
    
    def test_follow_up_questions_endpoint_error_logging(self, client, mock_fitness_coach):
        """Test that follow-up questions endpoint logs errors correctly."""
        # Mock exception
        mock_fitness_coach.generate_follow_up_questions.side_effect = Exception("AI service unavailable")
        
        request_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle",
                "experience_level": "intermediate"
            },
            "initial_responses": {
                "primary_goal": "strength_training"
            }
        }
        
        with patch('core.fitness.fitness_api.logger') as mock_logger:
            response = client.post("/api/fitness/follow-up-questions", json=request_data)
            
            assert response.status_code == 200
            
            # Verify error logging
            mock_logger.error.assert_called()
            error_calls = [call[0][0] for call in mock_logger.error.call_args_list]
            assert any("AI service unavailable" in call for call in error_calls)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
