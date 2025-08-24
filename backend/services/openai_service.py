"""
OpenAI service wrapper for EvolveAI.

This service provides a clean interface for OpenAI API interactions,
including workout plan generation and embeddings.
"""

import openai
from typing import Dict, Any, List
from config.settings import settings

class OpenAIService:
    """Service for OpenAI API interactions."""
    
    def __init__(self):
        """Initialize OpenAI service."""
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
    
    def generate_workout_plan(self, prompt: str, response_format: Any) -> Any:
        """
        Generate a workout plan using OpenAI.
        
        Args:
            prompt: The system prompt for workout generation
            response_format: The expected response format (e.g., WorkoutPlanSchema)
            
        Returns:
            Parsed workout plan response
        """
        try:
            completion = self.client.chat.completions.parse(
                model=self.model,
                messages=[{"role": "system", "content": prompt}],
                response_format=response_format,
                temperature=self.temperature
            )
            
            return completion
            
        except Exception as e:
            print(f"❌ OpenAI workout plan generation failed: {e}")
            raise
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for text chunks.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            
            return [embedding.embedding for embedding in response.data]
            
        except Exception as e:
            print(f"❌ OpenAI embedding generation failed: {e}")
            raise
    
    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """
        Generate a chat completion.
        
        Args:
            messages: List of message dictionaries
            **kwargs: Additional OpenAI parameters
            
        Returns:
            Generated response text
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                **kwargs
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ OpenAI chat completion failed: {e}")
            raise
    
    def get_available_models(self) -> List[str]:
        """Get list of available OpenAI models."""
        try:
            models = self.client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            print(f"❌ Failed to get OpenAI models: {e}")
            return []

# Global OpenAI service instance
openai_service = OpenAIService()
