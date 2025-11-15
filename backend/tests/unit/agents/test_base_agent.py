#!/usr/bin/env python3
"""
Unit tests for BaseAgent component.

This module tests the BaseAgent abstract class and its concrete implementations
to ensure comprehensive coverage of all methods and error handling.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import json
from typing import List, Dict, Any

# Add the backend directory to the Python path
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from core.base.base_agent import BaseAgent


class ConcreteTestAgent(BaseAgent):
    """Concrete implementation of BaseAgent for testing."""

    def __init__(
        self,
        agent_name: str = "Test Agent",
        agent_description: str = "Test Description",
        topic: str = "test",
    ):
        super().__init__(agent_name, agent_description, topic)

    def process_request(self, user_request: str) -> str:
        """Process a user request."""
        return f"Processed: {user_request}"

    def _get_capabilities(self) -> List[str]:
        """Return list of agent capabilities."""
        return ["test_capability", "mock_processing"]


class TestBaseAgent:
    """Unit tests for BaseAgent abstract class."""

    @pytest.fixture
    def mock_environment(self):
        """Mock environment variables for testing."""
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-openai-key",
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-supabase-key",
            },
        ):
            yield

    @pytest.fixture
    def mock_clients(self):
        """Mock OpenAI and Supabase clients."""
        with patch("core.base.base_agent.openai.OpenAI") as mock_openai, patch(
            "core.base.base_agent.create_client"
        ) as mock_supabase:

            mock_openai_client = Mock()
            mock_supabase_client = Mock()

            mock_openai.return_value = mock_openai_client
            mock_supabase.return_value = mock_supabase_client

            yield mock_openai_client, mock_supabase_client

    def test_base_agent_initialization(self, mock_environment, mock_clients):
        """Test BaseAgent initialization with valid environment."""
        mock_openai_client, mock_supabase_client = mock_clients

        agent = ConcreteTestAgent("Test Agent", "Test Description", "test")

        assert agent.agent_name == "Test Agent"
        assert agent.agent_description == "Test Description"
        assert agent.topic == "test"
        assert agent.openai_client == mock_openai_client
        assert agent.supabase == mock_supabase_client
        assert "Test Agent" in agent.system_prompt
        assert "test" in agent.system_prompt

    def test_base_agent_missing_openai_key(self, mock_clients):
        """Test BaseAgent initialization with missing OpenAI API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OPENAI_API_KEY not found"):
                ConcreteTestAgent()

    def test_base_agent_missing_supabase_credentials(self, mock_clients):
        """Test BaseAgent initialization with missing Supabase credentials."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}, clear=True):
            with pytest.raises(ValueError, match="Supabase credentials not found"):
                ConcreteTestAgent()

    def test_system_prompt_creation(self, mock_environment, mock_clients):
        """Test system prompt creation."""
        agent = ConcreteTestAgent("training Coach", "Expert in training", "training")

        prompt = agent.system_prompt
        assert "training Coach" in prompt
        assert "training" in prompt
        assert "Expert in training" in prompt
        assert "IMPORTANT: Always use your knowledge base" in prompt

    def test_search_knowledge_base_success(self, mock_environment, mock_clients):
        """Test successful knowledge base search."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock database responses
        mock_docs_response = Mock()
        mock_docs_response.data = [
            {
                "id": "doc1",
                "title": "Test Doc",
                "content": "Test content",
                "topic": "test",
                "keywords": ["test"],
            }
        ]

        mock_embeddings_response = Mock()
        mock_embeddings_response.data = [
            {
                "id": "emb1",
                "chunk_text": "Test chunk",
                "chunk_index": 0,
                "embedding": json.dumps([0.1, 0.2, 0.3]),
                "document_id": "doc1",
            }
        ]

        # Mock Supabase queries
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            mock_docs_response
        )
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = (
            mock_embeddings_response
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query", max_results=5)

        assert isinstance(results, list)
        assert len(results) > 0
        assert "chunk_text" in results[0]
        assert "relevance_score" in results[0]

    def test_search_knowledge_base_no_documents(self, mock_environment, mock_clients):
        """Test knowledge base search with no documents found."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock empty database response
        mock_docs_response = Mock()
        mock_docs_response.data = []

        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            mock_docs_response
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        assert results == []

    def test_search_knowledge_base_embedding_failure(
        self, mock_environment, mock_clients
    ):
        """Test knowledge base search with embedding generation failure."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation failure
        mock_openai_client.embeddings.create.side_effect = Exception("Embedding failed")

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        assert results == []

    def test_search_knowledge_base_database_error(self, mock_environment, mock_clients):
        """Test knowledge base search with database error."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock database error
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception(
            "Database error"
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        assert results == []

    def test_cosine_similarity_with_sklearn(self, mock_environment, mock_clients):
        """Test cosine similarity calculation with sklearn."""
        agent = ConcreteTestAgent()

        vec1 = [1.0, 2.0, 3.0]
        vec2 = [4.0, 5.0, 6.0]

        with patch("sklearn.metrics.pairwise.cosine_similarity") as mock_cosine:
            mock_cosine.return_value = [[0.8]]

            similarity = agent._cosine_similarity(vec1, vec2)

            assert similarity == 0.8
            mock_cosine.assert_called_once()

    def test_cosine_similarity_fallback_calculation(
        self, mock_environment, mock_clients
    ):
        """Test cosine similarity fallback calculation without sklearn."""
        agent = ConcreteTestAgent()

        vec1 = [1.0, 2.0, 3.0]
        vec2 = [1.0, 2.0, 3.0]  # Same vector for similarity = 1.0

        with patch(
            "sklearn.metrics.pairwise.cosine_similarity", side_effect=ImportError
        ):
            similarity = agent._cosine_similarity(vec1, vec2)

            assert abs(similarity - 1.0) < 0.001  # Should be close to 1.0

    def test_cosine_similarity_zero_vectors(self, mock_environment, mock_clients):
        """Test cosine similarity with zero vectors."""
        agent = ConcreteTestAgent()

        vec1 = [0.0, 0.0, 0.0]
        vec2 = [1.0, 2.0, 3.0]

        similarity = agent._cosine_similarity(vec1, vec2)

        assert similarity == 0.0

    def test_cosine_similarity_different_lengths(self, mock_environment, mock_clients):
        """Test cosine similarity with vectors of different lengths."""
        agent = ConcreteTestAgent()

        vec1 = [1.0, 2.0]
        vec2 = [1.0, 2.0, 3.0]

        similarity = agent._cosine_similarity(vec1, vec2)

        assert similarity == 0.0

    def test_generate_embedding_success(self, mock_environment, mock_clients):
        """Test successful embedding generation."""
        mock_openai_client, mock_supabase_client = mock_clients

        expected_embedding = [0.1, 0.2, 0.3]
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=expected_embedding)]
        )

        agent = ConcreteTestAgent()
        embedding = agent._generate_embedding("test text")

        assert embedding == expected_embedding

    def test_generate_embedding_failure(self, mock_environment, mock_clients):
        """Test embedding generation failure."""
        mock_openai_client, mock_supabase_client = mock_clients

        mock_openai_client.embeddings.create.side_effect = Exception("API error")

        agent = ConcreteTestAgent()
        embedding = agent._generate_embedding("test text")

        assert embedding == []

    def test_generate_response_success(self, mock_environment, mock_clients):
        """Test successful response generation."""
        mock_openai_client, mock_supabase_client = mock_clients

        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Generated response"))]
        mock_openai_client.chat.completions.create.return_value = mock_response

        agent = ConcreteTestAgent()
        context_docs = [{"chunk_text": "Test content", "document_title": "Test Doc"}]

        response = agent.generate_response("test query", context_docs)

        assert response == "Generated response"
        mock_openai_client.chat.completions.create.assert_called_once()

    def test_generate_response_failure(self, mock_environment, mock_clients):
        """Test response generation failure."""
        mock_openai_client, mock_supabase_client = mock_clients

        mock_openai_client.chat.completions.create.side_effect = Exception("API error")

        agent = ConcreteTestAgent()
        context_docs = [{"chunk_text": "Test content", "document_title": "Test Doc"}]

        response = agent.generate_response("test query", context_docs)

        assert "I apologize, but I encountered an error" in response

    def test_generate_response_no_context(self, mock_environment, mock_clients):
        """Test response generation with no context documents."""
        mock_openai_client, mock_supabase_client = mock_clients

        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Generated response"))]
        mock_openai_client.chat.completions.create.return_value = mock_response

        agent = ConcreteTestAgent()
        response = agent.generate_response("test query", [])

        assert response == "Generated response"
        # Should still call OpenAI even with no context

    def test_prepare_context_with_documents(self, mock_environment, mock_clients):
        """Test context preparation with documents."""
        agent = ConcreteTestAgent()

        documents = [
            {
                "chunk_text": "Test content 1",
                "document_title": "Test Doc 1",
                "document_keywords": ["test", "training"],
            },
            {
                "chunk_text": "Test content 2",
                "document_title": "Test Doc 2",
                "document_keywords": [],
            },
        ]

        context = agent._prepare_context(documents)

        assert "Test content 1" in context
        assert "Test content 2" in context
        assert "Test Doc 1" in context
        assert "Test Doc 2" in context
        assert "test, training" in context
        assert "None" in context  # Empty keywords

    def test_prepare_context_no_documents(self, mock_environment, mock_clients):
        """Test context preparation with no documents."""
        agent = ConcreteTestAgent()

        context = agent._prepare_context([])

        assert context == "No relevant information found in knowledge base."

    def test_get_agent_info(self, mock_environment, mock_clients):
        """Test getting agent information."""
        agent = ConcreteTestAgent("Test Agent", "Test Description", "test")

        info = agent.get_agent_info()

        assert info["name"] == "Test Agent"
        assert info["description"] == "Test Description"
        assert info["topic"] == "test"
        assert "capabilities" in info
        assert "test_capability" in info["capabilities"]

    def test_process_request_implementation(self, mock_environment, mock_clients):
        """Test that concrete agent implements process_request."""
        agent = ConcreteTestAgent()

        result = agent.process_request("test request")

        assert result == "Processed: test request"

    def test_get_capabilities_implementation(self, mock_environment, mock_clients):
        """Test that concrete agent implements _get_capabilities."""
        agent = ConcreteTestAgent()

        capabilities = agent._get_capabilities()

        assert isinstance(capabilities, list)
        assert "test_capability" in capabilities
        assert "mock_processing" in capabilities


class TestBaseAgentEdgeCases:
    """Test edge cases and error scenarios for BaseAgent."""

    @pytest.fixture
    def mock_environment(self):
        """Mock environment variables for testing."""
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-openai-key",
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-supabase-key",
            },
        ):
            yield

    @pytest.fixture
    def mock_clients(self):
        """Mock OpenAI and Supabase clients."""
        with patch("core.base.base_agent.openai.OpenAI") as mock_openai, patch(
            "core.base.base_agent.create_client"
        ) as mock_supabase:

            mock_openai_client = Mock()
            mock_supabase_client = Mock()

            mock_openai.return_value = mock_openai_client
            mock_supabase.return_value = mock_supabase_client

            yield mock_openai_client, mock_supabase_client

    def test_search_knowledge_base_invalid_embedding_json(
        self, mock_environment, mock_clients
    ):
        """Test knowledge base search with invalid embedding JSON."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock database responses with invalid JSON
        mock_docs_response = Mock()
        mock_docs_response.data = [
            {
                "id": "doc1",
                "title": "Test Doc",
                "content": "Test content",
                "topic": "test",
                "keywords": ["test"],
            }
        ]

        mock_embeddings_response = Mock()
        mock_embeddings_response.data = [
            {
                "id": "emb1",
                "chunk_text": "Test chunk",
                "chunk_index": 0,
                "embedding": "invalid json",  # Invalid JSON
                "document_id": "doc1",
            }
        ]

        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            mock_docs_response
        )
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = (
            mock_embeddings_response
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        # Should handle invalid JSON gracefully
        assert isinstance(results, list)

    def test_search_knowledge_base_empty_embedding_vector(
        self, mock_environment, mock_clients
    ):
        """Test knowledge base search with empty embedding vector."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock database responses with empty embedding
        mock_docs_response = Mock()
        mock_docs_response.data = [
            {
                "id": "doc1",
                "title": "Test Doc",
                "content": "Test content",
                "topic": "test",
                "keywords": ["test"],
            }
        ]

        mock_embeddings_response = Mock()
        mock_embeddings_response.data = [
            {
                "id": "emb1",
                "chunk_text": "Test chunk",
                "chunk_index": 0,
                "embedding": json.dumps([]),  # Empty vector
                "document_id": "doc1",
            }
        ]

        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            mock_docs_response
        )
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = (
            mock_embeddings_response
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        # Should handle empty vector gracefully
        assert isinstance(results, list)

    def test_search_knowledge_base_zero_similarity_scores(
        self, mock_environment, mock_clients
    ):
        """Test knowledge base search with zero similarity scores."""
        mock_openai_client, mock_supabase_client = mock_clients

        # Mock embedding generation
        mock_openai_client.embeddings.create.return_value = Mock(
            data=[Mock(embedding=[0.1, 0.2, 0.3])]
        )

        # Mock database responses
        mock_docs_response = Mock()
        mock_docs_response.data = [
            {
                "id": "doc1",
                "title": "Test Doc",
                "content": "Test content",
                "topic": "test",
                "keywords": ["test"],
            }
        ]

        mock_embeddings_response = Mock()
        mock_embeddings_response.data = [
            {
                "id": "emb1",
                "chunk_text": "Test chunk",
                "chunk_index": 0,
                "embedding": json.dumps([0.0, 0.0, 0.0]),  # Zero vector
                "document_id": "doc1",
            }
        ]

        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            mock_docs_response
        )
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.execute.return_value = (
            mock_embeddings_response
        )

        agent = ConcreteTestAgent()
        results = agent.search_knowledge_base("test query")

        # Should handle zero similarity gracefully
        assert isinstance(results, list)

    def test_cosine_similarity_exception_handling(self, mock_environment, mock_clients):
        """Test cosine similarity with exception handling."""
        agent = ConcreteTestAgent()

        vec1 = [1.0, 2.0, 3.0]
        vec2 = [4.0, 5.0, 6.0]

        with patch(
            "sklearn.metrics.pairwise.cosine_similarity",
            side_effect=Exception("Unexpected error"),
        ):
            similarity = agent._cosine_similarity(vec1, vec2)

            # Should return 0.0 on any exception
            assert similarity == 0.0

    def test_prepare_context_missing_fields(self, mock_environment, mock_clients):
        """Test context preparation with documents missing fields."""
        agent = ConcreteTestAgent()

        documents = [
            {
                "chunk_text": "Test content 1",
                # Missing document_title and document_keywords
            },
            {
                # Missing all fields
            },
        ]

        context = agent._prepare_context(documents)

        # Should handle missing fields gracefully
        assert "Test content 1" in context
        assert "Unknown Title" in context
        assert "No content" in context


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
