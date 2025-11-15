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

from main import app

# Set test environment variables
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DEBUG", "true")

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

