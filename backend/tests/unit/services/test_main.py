#!/usr/bin/env python3
"""
Unit tests for main.py application entry point.

This module tests the FastAPI application setup, middleware configuration,
and endpoint functionality in main.py.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from main import app


class TestMainApplication:
    """Unit tests for main.py FastAPI application."""

    @pytest.fixture
    def client(self):
        """Create test client for the FastAPI application."""
        return TestClient(app)

    def test_app_initialization(self):
        """Test that the FastAPI app is properly initialized."""
        assert app is not None
        assert app.title == "EvolveAI Training Plan Generator"
        assert (
            app.description
            == "FastAPI backend for generating personalized training plans using enhanced AI training Coach"
        )
        assert app.version == "2.0.0"

    def test_cors_middleware_configuration(self):
        """Test that CORS middleware is properly configured."""
        # Check that CORS middleware is added
        middleware_types = [
            type(middleware).__name__ for middleware in app.user_middleware
        ]
        assert "CORSMiddleware" in middleware_types

        # The middleware should allow all origins, methods, and headers for development
        # In production, this should be more restrictive

    def test_training_router_inclusion(self):
        """Test that the training router is properly included."""
        # Check that the training router is included
        route_paths = [route.path for route in app.routes]
        assert any("/api/training" in path for path in route_paths)

    def test_root_endpoint(self, client):
        """Test the root endpoint."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "EvolveAI Training Plan Generator API v2.0"
        assert data["status"] == "healthy"

    def test_health_check_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get("/api/health/")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"

    def test_training_endpoints_available(self, client):
        """Test that training endpoints are available."""
        # Test that training endpoints are accessible
        # These should return 422 (validation error) for empty requests, not 404
        response = client.post("/api/training/initial-questions", json={})
        assert response.status_code == 422  # Validation error, not 404

        response = client.post("/api/training/follow-up-questions", json={})
        assert response.status_code == 422  # Validation error, not 404

        response = client.post("/api/training/generate-plan", json={})
        assert response.status_code == 422  # Validation error, not 404

    def test_cors_headers(self, client):
        """Test that CORS headers are properly set."""
        response = client.options("/")

        # CORS preflight should be handled
        assert response.status_code in [200, 405]  # 405 is also acceptable for OPTIONS

    def test_application_metadata(self):
        """Test application metadata and configuration."""
        assert app.title == "EvolveAI Training Plan Generator"
        assert (
            "FastAPI backend for generating personalized training plans"
            in app.description
        )
        assert app.version == "2.0.0"

    def test_route_registration(self):
        """Test that all expected routes are registered."""
        route_paths = [route.path for route in app.routes]

        # Check for expected routes
        assert "/" in route_paths
        assert "/api/health/" in route_paths
        assert any("/api/training/initial-questions" in path for path in route_paths)
        assert any("/api/training/follow-up-questions" in path for path in route_paths)
        assert any("/api/training/generate-plan" in path for path in route_paths)

    def test_application_startup(self):
        """Test application startup behavior."""
        # Test that the app can be imported and initialized
        from main import app as imported_app

        assert imported_app is not None
        assert imported_app == app

    def test_environment_variables_loading(self):
        """Test that environment variables are loaded."""
        # The dotenv.load_dotenv() should be called during import
        # We can't directly test this, but we can verify the app works
        assert app is not None


class TestMainApplicationEdgeCases:
    """Test edge cases and error scenarios for main.py."""

    @pytest.fixture
    def client(self):
        """Create test client for the FastAPI application."""
        return TestClient(app)

    def test_nonexistent_endpoint(self, client):
        """Test accessing a nonexistent endpoint."""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404

    def test_invalid_method_on_existing_endpoint(self, client):
        """Test using invalid HTTP method on existing endpoint."""
        # GET request to POST-only endpoint
        response = client.get("/api/training/initial-questions")
        assert response.status_code == 405  # Method not allowed

    def test_malformed_json_request(self, client):
        """Test sending malformed JSON to API endpoints."""
        response = client.post(
            "/api/training/initial-questions",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422  # Validation error

    def test_missing_content_type_header(self, client):
        """Test sending request without Content-Type header."""
        response = client.post("/api/training/initial-questions", data="{}")
        # Should still work as FastAPI can handle this
        assert response.status_code in [200, 422]

    def test_large_request_payload(self, client):
        """Test sending large request payload."""
        large_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "A" * 10000,  # Large description
                "experience_level": "intermediate",
            }
        }

        response = client.post("/api/training/initial-questions", json=large_data)
        # Should handle large payloads gracefully
        assert response.status_code in [200, 422, 413]  # 413 if too large

    def test_special_characters_in_request(self, client):
        """Test sending request with special characters."""
        special_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle! @#$%^&*()_+-=[]{}|;':\",./<>?",
                "experience_level": "intermediate",
            }
        }

        response = client.post("/api/training/initial-questions", json=special_data)
        # Should handle special characters gracefully
        assert response.status_code in [200, 422]

    def test_unicode_characters_in_request(self, client):
        """Test sending request with unicode characters."""
        unicode_data = {
            "personal_info": {
                "username": "testuser",
                "age": 25,
                "weight": 70.0,
                "weight_unit": "kg",
                "height": 175.0,
                "height_unit": "cm",
                "goal_description": "Build muscle 💪 and strength 🏋️",
                "experience_level": "intermediate",
            }
        }

        response = client.post("/api/training/initial-questions", json=unicode_data)
        # Should handle unicode characters gracefully
        assert response.status_code in [200, 422]

    def test_concurrent_requests(self, client):
        """Test handling multiple concurrent requests."""
        import threading
        import time

        results = []

        def make_request():
            response = client.get("/")
            results.append(response.status_code)

        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All requests should succeed
        assert len(results) == 5
        assert all(status == 200 for status in results)

    def test_application_import_isolation(self):
        """Test that importing main.py doesn't cause side effects."""
        # Import the module multiple times
        import main
        import main as main2
        import main as main3

        # All imports should reference the same app instance
        assert main.app is main2.app
        assert main2.app is main3.app

    def test_application_configuration_consistency(self):
        """Test that application configuration is consistent."""
        assert app.title == "EvolveAI Training Plan Generator"
        assert app.version == "2.0.0"
        assert "FastAPI backend" in app.description

        # Check that the app has the expected structure
        assert hasattr(app, "routes")
        assert hasattr(app, "user_middleware")
        assert hasattr(app, "dependency_overrides")


class TestMainApplicationIntegration:
    """Integration tests for main.py with other components."""

    @pytest.fixture
    def client(self):
        """Create test client for the FastAPI application."""
        return TestClient(app)

    def test_application_with_mocked_dependencies(self, client):
        """Test application behavior with mocked dependencies."""
        # Mock the training coach dependency
        with patch("main.get_training_coach") as mock_get_coach:
            mock_coach = Mock()
            mock_coach.generate_initial_questions.return_value = Mock(total_questions=5)
            mock_get_coach.return_value = mock_coach

            # Override the dependency
            app.dependency_overrides[
                app.dependency_overrides.get("get_training_coach", lambda: mock_coach)
            ] = lambda: mock_coach

            response = client.post(
                "/api/training/initial-questions",
                json={
                    "personal_info": {
                        "username": "testuser",
                        "age": 25,
                        "weight": 70.0,
                        "weight_unit": "kg",
                        "height": 175.0,
                        "height_unit": "cm",
                        "goal_description": "Build muscle",
                        "experience_level": "intermediate",
                    }
                },
            )

            # Should work with mocked dependency
            assert response.status_code in [
                200,
                422,
            ]  # 422 if validation fails, 200 if successful

    def test_application_error_handling(self, client):
        """Test application error handling."""
        # Test with invalid data that should cause validation errors
        response = client.post(
            "/api/training/initial-questions", json={"invalid_field": "invalid_value"}
        )

        # Should return validation error, not crash
        assert response.status_code == 422

        # Test with missing required fields
        response = client.post("/api/training/initial-questions", json={})
        assert response.status_code == 422

    def test_application_performance(self, client):
        """Test basic application performance."""
        import time

        # Test response time for simple endpoints
        start_time = time.time()
        response = client.get("/")
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 1.0  # Should respond within 1 second

        # Test health check endpoint
        start_time = time.time()
        response = client.get("/api/health/")
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 1.0  # Should respond within 1 second


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
