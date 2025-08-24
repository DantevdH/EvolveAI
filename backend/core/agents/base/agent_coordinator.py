"""
Agent Coordinator Interface

This module provides the foundation for coordinating multiple specialist agents,
enabling them to work together on complex requests that span multiple domains.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from .base_agent import BaseAgent

class AgentCoordinator(ABC):
    """Abstract interface for coordinating multiple specialist agents."""
    
    def __init__(self):
        """Initialize the agent coordinator."""
        self.agents: Dict[str, BaseAgent] = {}
        self.agent_topics: Dict[str, str] = {}
    
    def register_agent(self, agent: BaseAgent) -> None:
        """
        Register a specialist agent with the coordinator.
        
        Args:
            agent: The specialist agent to register
        """
        self.agents[agent.agent_name] = agent
        self.agent_topics[agent.agent_name] = agent.topic
        print(f"✅ Registered agent: {agent.agent_name} (Topic: {agent.topic})")
    
    def get_agent_by_topic(self, topic: str) -> Optional[BaseAgent]:
        """
        Get an agent by topic.
        
        Args:
            topic: The topic to search for
            
        Returns:
            The agent specializing in that topic, or None if not found
        """
        for agent_name, agent_topic in self.agent_topics.items():
            if agent_topic == topic:
                return self.agents[agent_name]
        return None
    
    def get_agent_by_name(self, name: str) -> Optional[BaseAgent]:
        """
        Get an agent by name.
        
        Args:
            name: The name of the agent
            
        Returns:
            The agent with that name, or None if not found
        """
        return self.agents.get(name)
    
    def list_available_agents(self) -> List[Dict[str, str]]:
        """
        List all available agents and their capabilities.
        
        Returns:
            List of agent information dictionaries
        """
        return [
            {
                "name": agent.agent_name,
                "topic": agent.topic,
                "description": agent.agent_description,
                "capabilities": agent._get_capabilities()
            }
            for agent in self.agents.values()
        ]
    
    def get_agent_capabilities(self) -> Dict[str, List[str]]:
        """
        Get capabilities of all registered agents.
        
        Returns:
            Dictionary mapping agent names to their capabilities
        """
        return {
            agent.agent_name: agent._get_capabilities()
            for agent in self.agents.values()
        }
    
    @abstractmethod
    def route_request(self, user_request: str) -> Dict[str, Any]:
        """
        Route a user request to appropriate agent(s).
        
        Args:
            user_request: The user's request
            
        Returns:
            Dictionary containing routing decision and agent assignments
        """
        pass
    
    @abstractmethod
    def coordinate_response(self, user_request: str, agent_responses: Dict[str, str]) -> str:
        """
        Coordinate responses from multiple agents into a coherent answer.
        
        Args:
            user_request: The original user request
            agent_responses: Dictionary of agent responses
            
        Returns:
            Coordinated, coherent response
        """
        pass
    
    def can_handle_request(self, user_request: str) -> bool:
        """
        Check if the coordinator can handle a specific request.
        
        Args:
            user_request: The user's request
            
        Returns:
            True if the request can be handled, False otherwise
        """
        # This is a basic implementation - subclasses can override
        return len(self.agents) > 0
    
    def get_request_analysis(self, user_request: str) -> Dict[str, Any]:
        """
        Analyze a user request to understand what agents might be needed.
        
        Args:
            user_request: The user's request
            
        Returns:
            Analysis of the request including relevant topics and complexity
        """
        analysis = {
            "request": user_request,
            "relevant_topics": [],
            "complexity": "single_domain",
            "estimated_agents_needed": 1,
            "agent_suggestions": []
        }
        
        # Identify relevant topics from the request
        request_lower = user_request.lower()
        
        for agent_name, agent in self.agents.items():
            topic = agent.topic
            topic_keywords = self._get_topic_keywords(topic)
            
            if any(keyword in request_lower for keyword in topic_keywords):
                analysis["relevant_topics"].append(topic)
                analysis["agent_suggestions"].append(agent_name)
        
        # Determine complexity
        if len(analysis["relevant_topics"]) > 1:
            analysis["complexity"] = "multi_domain"
            analysis["estimated_agents_needed"] = len(analysis["relevant_topics"])
        
        return analysis
    
    def _get_topic_keywords(self, topic: str) -> List[str]:
        """
        Get keywords associated with a specific topic.
        
        Args:
            topic: The topic to get keywords for
            
        Returns:
            List of keywords associated with that topic
        """
        topic_keywords = {
            "fitness": ["workout", "exercise", "training", "strength", "muscle", "fitness"],
            "nutrition": ["nutrition", "diet", "food", "meal", "protein", "carb", "fat"],
            "running": ["running", "cardio", "endurance", "jog", "sprint", "marathon"],
            "physiotherapy": ["injury", "recovery", "physio", "therapy", "rehabilitation", "pain"]
        }
        
        return topic_keywords.get(topic, [topic])
    
    def validate_agent_setup(self) -> Dict[str, Any]:
        """
        Validate that the agent system is properly configured.
        
        Returns:
            Validation results including any issues found
        """
        validation = {
            "status": "valid",
            "total_agents": len(self.agents),
            "topics_covered": list(set(self.agent_topics.values())),
            "issues": [],
            "warnings": []
        }
        
        # Check for duplicate topics
        topic_counts = {}
        for topic in self.agent_topics.values():
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
        
        for topic, count in topic_counts.items():
            if count > 1:
                validation["warnings"].append(f"Multiple agents cover topic '{topic}' ({count} agents)")
        
        # Check for missing critical topics
        critical_topics = ["fitness", "nutrition"]
        for topic in critical_topics:
            if topic not in self.agent_topics.values():
                validation["warnings"].append(f"Missing agent for critical topic: {topic}")
        
        # Check if any agents have issues
        for agent_name, agent in self.agents.items():
            try:
                # Test basic agent functionality
                agent.get_agent_info()
            except Exception as e:
                validation["issues"].append(f"Agent '{agent_name}' has issues: {str(e)}")
                validation["status"] = "invalid"
        
        if validation["issues"]:
            validation["status"] = "invalid"
        
        return validation
