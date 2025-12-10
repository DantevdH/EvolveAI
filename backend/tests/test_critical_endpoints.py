"""
Critical API endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import json

@pytest.mark.unit
class TestCriticalEndpoints:
    """Test critical API endpoints that must work for the app to function."""
    
    def test_initial_questions_endpoint_exists(self, client: TestClient):
        """Test that initial-questions endpoint exists and accepts requests."""
        # Mock the interview agent to avoid actual AI calls
        with patch('app.api.dependencies.get_interview_agent') as mock_get_agent, \
             patch('app.api.questions_router.db_service') as mock_db_service:
            mock_agent_instance = Mock()
            mock_get_agent.return_value = mock_agent_instance
            
            # Mock the response
            mock_response = {
                "success": True,
                "questions": [
                    {"id": "1", "text": "What is your primary goal?", "type": "multiple_choice"}
                ]
            }
            mock_agent_instance.generate_initial_questions.return_value = mock_response
            
            # Mock db_service methods
            mock_db_service.create_user_profile.return_value = {
                "success": True,
                "data": {"id": 1},
                "message": "User profile created successfully"
            }
            mock_db_service.update_user_profile.return_value = {
                "success": True,
                "message": "User profile updated successfully"
            }
            
            payload = {
                "personal_info": {
                    "age": 30,
                    "gender": "male",
                    "weight": 75,
                    "height": 180,
                    "experience_level": "intermediate",
                    "primary_goal": "strength"
                },
                "jwt_token": "test.token"
            }
            
            response = client.post("/api/training/initial-questions", json=payload)
            # Should either succeed (200) or fail with proper error (not 404)
            assert response.status_code != 404, "Endpoint should exist"
    
    def test_generate_plan_endpoint_exists(self, client: TestClient):
        """Test that generate-plan endpoint exists and accepts requests."""
        with patch('app.api.dependencies.get_training_agent') as mock_get_agent, \
             patch('app.api.plan_router.db_service') as mock_db_service:
            mock_agent_instance = Mock()
            mock_get_agent.return_value = mock_agent_instance
            
            # Mock agent response
            mock_agent_instance.generate_initial_training_plan.return_value = {
                "success": True,
                "training_plan": {"id": 1, "title": "Test Plan"},
                "completion_message": "Plan generated"
            }
            
            # Mock db_service methods
            mock_db_service.get_training_plan.return_value = {"success": False, "data": None}
            mock_db_service.update_user_profile.return_value = {
                "success": True,
                "message": "User profile updated successfully"
            }
            mock_db_service.save_training_plan.return_value = {
                "success": True,
                "data": {"training_plan_id": 1, "training_plan": {"id": 1}},
                "message": "Training plan saved successfully"
            }
            
            payload = {
                "personal_info": {
                    "age": 30,
                    "gender": "male",
                    "weight": 75,
                    "height": 180,
                    "experience_level": "intermediate",
                    "primary_goal": "strength",
                    "goal_description": "Build strength",
                    "username": "testuser"
                },
                "initial_responses": {},
                "initial_questions": [{"id": "1", "text": "Test"}],
                "jwt_token": "test.token",
                "user_profile_id": 1
            }
            
            response = client.post("/api/training/generate-plan", json=payload)
            # Should either succeed (200) or fail with proper error (not 404)
            assert response.status_code != 404, "Endpoint should exist"
    
    def test_endpoints_require_authentication(self, client: TestClient):
        """Test that protected endpoints require authentication."""
        # Try to access endpoints without JWT token
        payload = {
            "personal_info": {
                "age": 30,
                "gender": "male"
            }
        }
        
        response = client.post("/api/training/initial-questions", json=payload)
        # Should fail validation (422) or authentication (401), not succeed
        assert response.status_code in [400, 401, 422], "Should require authentication or valid payload"

