"""
Error handling tests - Verify sensitive data is not exposed
"""
import pytest
from fastapi.testclient import TestClient
from fastapi.exceptions import RequestValidationError
from unittest.mock import patch, Mock

@pytest.mark.unit
class TestErrorHandling:
    """Test that error responses don't expose sensitive data."""
    
    def test_validation_error_no_sensitive_data(self, client: TestClient):
        """Test that validation errors don't expose request body."""
        # Mock the training coach and db_service to avoid initialization issues
        with patch('core.training.training_api.get_training_coach') as mock_coach, \
             patch('core.training.training_api.db_service') as mock_db_service:
            mock_coach_instance = Mock()
            mock_coach.return_value = mock_coach_instance
            
            # Send invalid request that will trigger validation error
            response = client.post("/api/training/initial-questions", json={
                "invalid": "data",
                "password": "secret123",  # Simulated sensitive data
                "api_key": "should-not-appear"  # Simulated sensitive data
            })
        
        assert response.status_code == 422
        data = response.json()
        
        # Should have error details but NOT the full request body
        assert "detail" in data
        # Should NOT contain sensitive fields
        assert "password" not in str(data)
        assert "api_key" not in str(data)
        # Should NOT have "body" field with full request
        assert "body" not in data
    
    def test_error_response_structure(self, client: TestClient):
        """Test that error responses have proper structure."""
        # Mock the training coach and db_service to avoid initialization issues
        with patch('core.training.training_api.get_training_coach') as mock_coach, \
             patch('core.training.training_api.db_service') as mock_db_service:
            mock_coach_instance = Mock()
            mock_coach.return_value = mock_coach_instance
            
            response = client.post("/api/training/initial-questions", json={})
        
        assert response.status_code in [400, 422]
        data = response.json()
        
        # Should have error details
        assert "detail" in data or "message" in data
        # Should be JSON
        assert response.headers["content-type"] == "application/json"
    
    def test_invalid_endpoint_returns_404(self, client: TestClient):
        """Test that invalid endpoints return proper 404."""
        response = client.get("/api/nonexistent/endpoint")
        assert response.status_code == 404
    
    def test_invalid_method_returns_405(self, client: TestClient):
        """Test that invalid HTTP methods return proper 405."""
        # Try GET on POST-only endpoint
        response = client.get("/api/training/generate-plan")
        assert response.status_code in [404, 405]  # FastAPI might return 404 for missing GET route

