"""
Configuration for integration tests.
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture(autouse=True)
def mock_environment():
    """Mock environment variables for testing."""
    with patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "test-key",
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-anon-key",
            "SUPABASE_SERVICE_ROLE_KEY": "test-service-key",
            "DEBUG": "false",
        },
    ):
        yield


@pytest.fixture(autouse=True)
def mock_logging():
    """Mock logging to avoid noise in tests."""
    with patch("core.training.training_api.logger") as mock_logger:
        mock_logger.info = MagicMock()
        mock_logger.error = MagicMock()
        mock_logger.debug = MagicMock()
        mock_logger.warning = MagicMock()
        yield mock_logger


@pytest.fixture
def mock_openai():
    """Mock OpenAI client for testing."""
    with patch("core.training.training_coach.openai") as mock_openai:
        # Mock the chat completions response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.parsed = MagicMock()

        mock_openai.chat.completions.parse.return_value = mock_response
        yield mock_openai
