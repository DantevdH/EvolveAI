"""
Pytest configuration for EvolveAI Agent System tests.
"""

import pytest
import os
import sys
from pathlib import Path

# Add the backend directory to the path so we can import our modules
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

@pytest.fixture(scope="session")
def test_environment():
    """Verify test environment is properly configured."""
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "OPENAI_API_KEY"]
    
    for var in required_vars:
        if not os.getenv(var):
            pytest.fail(f"Required environment variable {var} is not set")
    
    return True

@pytest.fixture(scope="session")
def supabase_client():
    """Create a Supabase client for testing."""
    from supabase import create_client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    return create_client(url, key)

@pytest.fixture(scope="session")
def openai_client():
    """Create an OpenAI client for testing."""
    import openai
    
    api_key = os.getenv("OPENAI_API_KEY")
    return openai.OpenAI(api_key=api_key)
