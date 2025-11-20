"""
Base Agent Class for EvolveAI Agent System

This class provides the foundation for all specialist agents with:
- RAG capabilities using Supabase vector database
- Metadata filtering for efficient search
- Document retrieval and context augmentation
- Response generation using OpenAI
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from supabase import create_client, Client
from core.training.helpers.llm_client import LLMClient
from settings import settings


class BaseAgent(ABC):
    """Abstract base class for all specialist agents."""

    def __init__(self, agent_name: str, agent_description: str, topic: str):
        """
        Initialize the base agent.

        Args:
            agent_name: Name of the agent (e.g., "training Coach")
            agent_description: Description of the agent's expertise
            topic: Topic this agent specializes in (e.g., "training", "nutrition")
        """
        self.agent_name = agent_name
        self.agent_description = agent_description
        self.topic = topic

        # Initialize clients
        self._init_clients()

    def _init_clients(self):
        """Initialize LLM (OpenAI or Gemini) and Supabase clients."""
        # Unified LLM client
        self.llm = LLMClient()

        # Supabase client - use settings (which reads from environment dynamically)
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_ANON_KEY
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not found in environment variables")
        self.supabase: Client = create_client(supabase_url, supabase_key)

    @abstractmethod
    def process_request(self, user_request: str) -> str:
        """
        Process a user request. Must be implemented by each specialist agent.

        Args:
            user_request: User's request

        Returns:
            Agent's response
        """
        pass

    def get_agent_info(self) -> Dict[str, str]:
        """Get information about this agent."""
        return {
            "name": self.agent_name,
            "description": self.agent_description,
            "topic": self.topic,
            "capabilities": self._get_capabilities(),
        }

    @abstractmethod
    def _get_capabilities(self) -> List[str]:
        """Return list of agent capabilities. Must be implemented by each specialist."""
        pass
