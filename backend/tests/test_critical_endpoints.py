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
        # Mock the training coach to avoid actual AI calls
        with patch('core.training.training_api.get_training_coach') as mock_coach:
            mock_coach_instance = Mock()
            mock_coach.return_value = mock_coach_instance
            
            # Mock the response
            mock_response = {
                "success": True,
                "questions": [
                    {"id": "1", "text": "What is your primary goal?", "type": "multiple_choice"}
                ]
            }
            mock_coach_instance.generate_initial_questions.return_value = mock_response
            
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
        with patch('core.training.training_api.get_training_coach') as mock_coach:
            mock_coach_instance = Mock()
            mock_coach.return_value = mock_coach_instance
            
            payload = {
                "personal_info": {
                    "age": 30,
                    "gender": "male",
                    "weight": 75,
                    "height": 180,
                    "experience_level": "intermediate",
                    "primary_goal": "strength"
                },
                "initial_responses": {},
                "jwt_token": "test.token"
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

