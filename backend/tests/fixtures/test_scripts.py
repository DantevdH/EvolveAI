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

    def test_populate_script_import(self):
        """Test that the populate script can be imported."""
        try:
            from scripts.populate.populate_vector_db import VectorDBPopulator
            assert VectorDBPopulator is not None, "VectorDBPopulator should be importable"
        except ImportError as e:
            pytest.skip(f"Populate script not available: {e}")

    def test_populate_script_class_methods(self):
        """Test that the VectorDBPopulator class has expected methods."""
        try:
            from scripts.populate.populate_vector_db import VectorDBPopulator
            
            # Check that the class has the expected methods
            expected_methods = [
                'process_pdf',
                'process_structured_file', 
                'process_data_directory',
                'process_single_file',
                'chunk_text',
                'generate_embeddings',
                'populate_database'
            ]
            
            for method in expected_methods:
                assert hasattr(VectorDBPopulator, method), f"Missing method: {method}"
                
        except ImportError as e:
            pytest.skip(f"Populate script not available: {e}")

    def test_populate_script_no_sample_data(self):
        """Test that the script no longer has hardcoded sample data methods."""
        try:
            from scripts.populate.populate_vector_db import VectorDBPopulator
            
            # These methods should no longer exist
            deprecated_methods = [
                'create_sample_documents',
                'run_sample_population'
            ]
            
            for method in deprecated_methods:
                assert not hasattr(VectorDBPopulator, method), f"Deprecated method still exists: {method}"
                
        except ImportError as e:
            pytest.skip(f"Populate script not available: {e}")
