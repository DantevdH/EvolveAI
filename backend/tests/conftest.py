"""
Pytest configuration and shared fixtures.

BEST PRACTICES:
1. pytest_configure hook sets ENVIRONMENT=test BEFORE any imports
2. This prevents .env files from loading during test execution
3. Test environment variables are set with dummy values
4. Actual tests should mock external services (OpenAI, Supabase, etc.)
"""
import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock
from fastapi.testclient import TestClient

# Add backend directory to Python path so we can import main
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


# Pytest configuration hook - runs BEFORE conftest.py imports
# This is the EARLIEST point in pytest execution
def pytest_configure(config):
    """
    Pytest configuration hook.
    
    Sets test environment variables BEFORE any module imports.
    This ensures test environment is detected and .env files are NOT loaded.
    
    CRITICAL: This runs before conftest.py is even imported, providing
    the earliest possible safety net to prevent .env file loading.
    """
    # CRITICAL: Set ENVIRONMENT=test FIRST with direct assignment
    # This ensures test mode is detected before any load_dotenv() calls
    os.environ["ENVIRONMENT"] = "test"
    os.environ["PYTEST"] = "true"
    os.environ["DEBUG"] = "true"
    
    # Set minimal test env vars with direct assignment (not setdefault)
    # This ensures test values are used even if .env file exists
    # CI/CD can override these with real values if needed for integration tests
    test_env_vars = {
        "OPENAI_API_KEY": "test-openai-key",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
        "LLM_API_KEY": "test-llm-api-key",
    }
    
    # Only set if not already set (allows CI/CD to override)
    for key, value in test_env_vars.items():
        if key not in os.environ or not os.environ[key]:
            os.environ[key] = value


# Now import main - test environment is already set, so .env won't load
from main import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)

@pytest.fixture
def mock_jwt_token():
    """Create a mock JWT token for testing."""
    return "mock.jwt.token.here"

@pytest.fixture
def mock_user_id():
    """Create a mock user ID for testing."""
    return "123e4567-e89b-12d3-a456-426614174000"

@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    mock_client = Mock()
    mock_client.table.return_value = Mock()
    return mock_client

