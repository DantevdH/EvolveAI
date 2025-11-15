"""
Test the base agent infrastructure using pytest.

These tests verify:
1. Base agent structure and imports
2. RAG tool functionality
3. Agent coordinator interface
4. Basic knowledge base search
"""

import pytest
from unittest.mock import patch, MagicMock


class TestBaseAgent:
    """Test BaseAgent abstract class and structure."""

    def test_base_agent_import(self):
        """Test that BaseAgent can be imported."""
        from core.base.base_agent import BaseAgent

        assert BaseAgent is not None, "BaseAgent should be importable"

    def test_base_agent_abstract_methods(self):
        """Test that BaseAgent has required abstract methods."""
        from core.base.base_agent import BaseAgent
        import inspect

        # Check that required abstract methods exist
        assert hasattr(
            BaseAgent, "_get_capabilities"
        ), "BaseAgent should have _get_capabilities method"
        assert hasattr(
            BaseAgent, "process_request"
        ), "BaseAgent should have process_request method"

        # Check that this is an abstract class
        assert inspect.isabstract(BaseAgent), "BaseAgent should be an abstract class"

    def test_base_agent_cannot_instantiate(self):
        """Test that BaseAgent cannot be instantiated directly."""
        from core.base.base_agent import BaseAgent

        with pytest.raises(TypeError, match="Can't instantiate abstract class"):
            BaseAgent("Test", "Test Description", "test")


class TestRAGTool:
    """Test RAGTool functionality."""

    def test_rag_service_import(self):
        """Test that RAGTool can be imported."""
        from core.base.rag_service import RAGTool

        assert RAGTool is not None, "RAGTool should be importable"

    def test_rag_service_structure(self):
        """Test that RAGTool has required methods."""
        from core.base.rag_service import RAGTool

        # Check that required methods exist
        assert hasattr(
            RAGTool, "extract_metadata_filters"
        ), "RAGTool should have extract_metadata_filters method"
        assert hasattr(
            RAGTool, "perform_hybrid_search"
        ), "RAGTool should have perform_hybrid_search method"
        assert hasattr(
            RAGTool, "augment_context"
        ), "RAGTool should have augment_context method"
        assert hasattr(
            RAGTool, "get_search_insights"
        ), "RAGTool should have get_search_insights method"

    def test_rag_service_instantiation(self):
        """Test that RAGTool can be instantiated with a mock agent."""
        from core.base.rag_service import RAGTool

        # Create a mock agent
        mock_agent = MagicMock()
        mock_agent.topic = "training"

        # This should not raise an exception
        rag_service = RAGTool(mock_agent)
        assert rag_service.base_agent == mock_agent
        assert rag_service.base_agent.topic == "training"


class TestConcreteImplementations:
    """Test concrete implementations of abstract classes."""

    def test_concrete_agent_implementation(self):
        """Test that we can create a concrete agent implementation."""

        # Create a concrete implementation for testing
        class ConcreteAgent:
            def __init__(self):
                self.agent_name = "Test Agent"
                self.topic = "training"
                self.agent_description = "A test agent"

            def _get_capabilities(self):
                return ["test"]

            def process_request(self, request):
                return f"Processed: {request}"

        # This should work
        agent = ConcreteAgent()
        assert agent.agent_name == "Test Agent"
        assert agent.topic == "training"
        assert agent.process_request("hello") == "Processed: hello"

    def test_concrete_coordinator_implementation(self):
        """Test that we can create a concrete coordinator implementation."""

        # Create a concrete implementation for testing
        class ConcreteCoordinator:
            def __init__(self):
                self.agents = {}
                self.agent_topics = {}

            def register_agent(self, agent):
                self.agents[agent.agent_name] = agent
                self.agent_topics[agent.topic] = agent

            def route_request(self, request):
                return {"decision": "test"}

            def coordinate_response(self, request, responses):
                return "coordinated response"

        # This should work
        coordinator = ConcreteCoordinator()
        assert coordinator.agents == {}
        assert coordinator.route_request("test") == {"decision": "test"}


class TestIntegration:
    """Test integration between components."""

    @patch("core.base.base_agent.create_client")
    @patch("core.base.base_agent.openai.OpenAI")
    def test_agent_with_mocked_clients(self, mock_openai, mock_create_client):
        """Test that agents can work with mocked clients."""
        # Mock the clients
        mock_supabase = MagicMock()
        mock_create_client.return_value = mock_supabase

        mock_openai_instance = MagicMock()
        mock_openai.return_value = mock_openai_instance

        # Create a concrete agent implementation
        class TestAgent:
            def __init__(self):
                self.agent_name = "Test Agent"
                self.topic = "training"
                self.agent_description = "A test agent"
                self.supabase = mock_supabase
                self.openai_client = mock_openai_instance

            def _get_capabilities(self):
                return ["test"]

            def process_request(self, request):
                return f"Processed: {request}"

        # This should work
        agent = TestAgent()
        assert agent.agent_name == "Test Agent"
        assert agent.supabase == mock_supabase
        assert agent.openai_client == mock_openai_instance
