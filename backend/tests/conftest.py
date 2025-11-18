"""
Pytest configuration and shared fixtures
"""
import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

# Add backend directory to Python path so we can import main
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# CRITICAL: Set test environment variables BEFORE importing main
# This prevents validation errors during module import
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DEBUG", "true")

# Set minimal test environment variables to satisfy validation
# These are dummy values - actual tests should mock services that use them
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
# Optional but useful for tests that need service role
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

# Now import main - validation will pass with test values
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


# Pytest configuration hook - runs before test collection
def pytest_configure(config):
    """
    Pytest configuration hook.
    Ensures test environment is set up before any tests run.
    This runs before conftest imports, providing an early safety net.
    """
    # Ensure test environment is set (in case conftest import order varies)
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("DEBUG", "true")
    
    # Set minimal test env vars if not already set (allows CI to override with real values)
    os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
    os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

