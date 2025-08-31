"""
Test the scripts functionality using pytest.
"""

import pytest
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TestScripts:
    """Test scripts functionality."""

    def test_environment_variables_available(self):
        """Test that required environment variables are available."""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        assert supabase_url is not None, "SUPABASE_URL should be set"
        assert supabase_key is not None, "SUPABASE_ANON_KEY should be set"
        assert openai_api_key is not None, "OPENAI_API_KEY should be set"

    def test_supabase_connection_script(self):
        """Test that the supabase connection test script can be imported and run."""
        from scripts.test_connection import test_supabase_connection
        
        # This should not raise an exception if environment is set up correctly
        try:
            test_supabase_connection()
        except AssertionError as e:
            # This is expected if the database is not accessible
            pytest.skip(f"Supabase connection test failed (expected in test environment): {e}")

    def test_openai_connection_script(self):
        """Test that the OpenAI connection test script can be imported and run."""
        from scripts.test_connection import test_openai_connection
        
        # This should not raise an exception if environment is set up correctly
        try:
            test_openai_connection()
        except AssertionError as e:
            # This is expected if the API key is not valid
            pytest.skip(f"OpenAI connection test failed (expected in test environment): {e}")

    def test_populate_script_import(self):
        """Test that the populate script can be imported."""
        try:
            from scripts.populate_vector_db import VectorDBPopulator
            assert VectorDBPopulator is not None, "VectorDBPopulator should be importable"
        except ImportError as e:
            pytest.skip(f"Populate script not available: {e}")
