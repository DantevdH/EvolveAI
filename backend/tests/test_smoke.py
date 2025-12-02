"""
Smoke tests - Basic connectivity and health checks
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from settings import settings

@pytest.mark.unit
class TestSmokeTests:
    """Basic smoke tests to verify system is operational."""
    
    def test_health_check_endpoint(self, client: TestClient):
        """Test that the root health check endpoint works."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "EvolveAI" in data["message"]
    
    def test_detailed_health_check_endpoint(self, client: TestClient):
        """Test that the detailed health check endpoint works."""
        response = client.get("/api/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
    
    def test_api_connectivity(self, client: TestClient):
        """Test that API is accessible and responding."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
    
    def test_environment_variables_loaded(self):
        """Test that critical environment variables are accessible."""
        # Note: In test environment, these might be mocked
        # This test verifies the settings module can access env vars
        assert hasattr(settings, 'SUPABASE_URL')
        assert hasattr(settings, 'LLM_API_KEY')
    
    def test_database_connection_config(self):
        """Test that database connection configuration exists."""
        # Verify settings have database-related configuration
        assert hasattr(settings, 'SUPABASE_URL')
        assert hasattr(settings, 'SUPABASE_ANON_KEY')
        # Note: Actual connection test would require real credentials
        # This is a configuration check, not a connection test

