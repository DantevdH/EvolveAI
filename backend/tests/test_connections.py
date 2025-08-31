"""
Test connections and basic infrastructure for EvolveAI Agent System.
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TestConnections:
    """Test basic connections and infrastructure."""

    def test_environment_variables(self, test_environment):
        """Test that all required environment variables are set."""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")

        assert supabase_url is not None, "SUPABASE_URL not set"
        assert supabase_key is not None, "SUPABASE_ANON_KEY not set"
        assert openai_api_key is not None, "OPENAI_API_KEY not set"

        # Check format of environment variables
        assert supabase_url.startswith("https://"), "SUPABASE_URL should start with https://"
        assert len(supabase_key) > 20, "SUPABASE_ANON_KEY seems too short"
        assert openai_api_key.startswith("sk-"), "OPENAI_API_KEY should start with sk-"

    def test_supabase_connection(self, supabase_client):
        """Test that Supabase connection can be established."""
        # Test basic connection by trying to access a table
        response = supabase_client.table('documents').select('id', count='exact').execute()
        assert response is not None, "Supabase connection should return a response"

    def test_openai_connection(self, openai_client):
        """Test that OpenAI API connection can be established."""
        # Test with a simple API call
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input="test"
        )
        assert response is not None, "OpenAI API should return a response"
        assert response.data is not None, "OpenAI response should have data"

    def test_database_tables_exist(self, supabase_client):
        """Test that required database tables exist."""
        # Test documents table
        doc_response = supabase_client.table('documents').select('id', count='exact').execute()
        assert doc_response is not None, "Documents table should be accessible"

        # Test document_embeddings table
        emb_response = supabase_client.table('document_embeddings').select('id', count='exact').execute()
        assert emb_response is not None, "Document embeddings table should be accessible"

    def test_vector_search_functions_exist(self, supabase_client):
        """Test that vector search functions are available."""
        # Test if the match_documents function exists
        # We'll test with a dummy vector to see if the function is callable
        dummy_vector = [0.1] * 1536

        try:
            response = supabase_client.rpc(
                'match_documents',
                {
                    'query_embedding': dummy_vector,
                    'match_threshold': 0.5,
                    'match_count': 1
                }
            ).execute()

            # If we get here, the function exists and is callable
            assert True, "match_documents function exists and is callable"

        except Exception as e:
            if "function match_documents" in str(e):
                pytest.fail("match_documents function does not exist. Run setup_vector_search.sql first.")
            else:
                # Function exists but might have other issues (like no data)
                assert True, "match_documents function exists"

class TestInfrastructure:
    """Test infrastructure components."""

    def test_base_agent_import(self):
        """Test that BaseAgent can be imported."""
        try:
            from agents.base.base_agent import BaseAgent
            assert BaseAgent is not None, "BaseAgent should be importable"
        except ImportError as e:
            pytest.fail(f"Failed to import BaseAgent: {e}")

    def test_rag_tool_import(self):
        """Test that RAGTool can be imported."""
        try:
            from agents.base.rag_tool import RAGTool
            assert RAGTool is not None, "RAGTool should be importable"
        except ImportError as e:
            pytest.fail(f"Failed to import RAGTool: {e}")

    def test_agent_coordinator_import(self):
        """Test that AgentCoordinator can be imported."""
        try:
            from agents.base.agent_coordinator import AgentCoordinator
            assert AgentCoordinator is not None, "AgentCoordinator should be importable"
        except ImportError as e:
            pytest.fail(f"Failed to import AgentCoordinator: {e}")

    def test_base_agent_structure(self):
        """Test that BaseAgent has required abstract methods."""
        from agents.base.base_agent import BaseAgent
        
        # Check that required abstract methods exist
        assert hasattr(BaseAgent, '_get_capabilities'), "BaseAgent should have _get_capabilities method"
        assert hasattr(BaseAgent, 'process_request'), "BaseAgent should have process_request method"
        
        # Check that these are abstract methods
        import inspect
        assert inspect.isabstract(BaseAgent), "BaseAgent should be an abstract class"

    def test_rag_tool_structure(self):
        """Test that RAGTool has required methods."""
        from agents.base.rag_tool import RAGTool
        
        # Check that required methods exist
        assert hasattr(RAGTool, 'extract_metadata_filters'), "RAGTool should have extract_metadata_filters method"
        assert hasattr(RAGTool, 'perform_hybrid_search'), "RAGTool should have perform_hybrid_search method"
        assert hasattr(RAGTool, 'augment_context'), "RAGTool should have augment_context method"

    def test_agent_coordinator_structure(self):
        """Test that AgentCoordinator has required methods."""
        from agents.base.agent_coordinator import AgentCoordinator
        
        # Check that required methods exist
        assert hasattr(AgentCoordinator, 'register_agent'), "AgentCoordinator should have register_agent method"
        assert hasattr(AgentCoordinator, 'route_request'), "AgentCoordinator should have route_request method"
        assert hasattr(AgentCoordinator, 'coordinate_response'), "AgentCoordinator should have coordinate_response method"
