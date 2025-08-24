"""
Workout Service

This service provides workout plan generation using the enhanced Fitness Coach.
Simplified to use only the premium tier with RAG-enhanced, knowledge-based plans.
"""

import os
from typing import Dict, Any
from dotenv import load_dotenv

# Import schemas and Fitness Coach
from .schemas import WorkoutPlanSchema, UserProfileSchema
from ..agents.specialists.fitness_coach import FitnessCoach

# Load environment variables
load_dotenv()

class WorkoutService:
    """
    Workout service that provides enhanced workout generation using Fitness Coach.
    
    Features:
    - RAG-enhanced workout plans
    - Knowledge-based recommendations
    - Unified response format
    - Performance monitoring
    """
    
    def __init__(self):
        """Initialize the workout service."""
        self.fitness_coach = FitnessCoach()
        
        # Performance tracking
        self.stats = {
            "requests": 0,
            "errors": 0
        }
    
    def generate_workout_plan(self, 
                             user_profile: UserProfileSchema,
                             openai_client) -> Dict[str, Any]:
        """
        Generate a workout plan using the Fitness Coach.
        
        Args:
            user_profile: User profile data
            openai_client: OpenAI client instance
            
        Returns:
            Dictionary with workout plan and metadata
        """
        try:
            # Generate enhanced workout plan using Fitness Coach
            workout_plan = self.fitness_coach.generate_workout_plan(user_profile, openai_client)
            
            self.stats["requests"] += 1
            
            return {
                "status": "success",
                "message": "Enhanced workout plan generated using AI Fitness Coach",
                "workout_plan": workout_plan,  # Now returns WorkoutPlanSchema directly
                "enhancements": {
                    "knowledge_base_used": True,
                    "rag_enhanced": True,
                    "context_aware": True
                },
                "metadata": {
                    "agent_used": "Fitness Coach",
                    "knowledge_sources": "Fitness database + OpenAI",
                    "generation_method": "RAG-enhanced LLM"
                }
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            print(f"❌ Error generating workout plan: {e}")
            raise
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service performance statistics."""
        total_requests = self.stats["requests"]
        
        return {
            "total_requests": total_requests,
            "errors": self.stats["errors"],
            "success_rate": (total_requests - self.stats["errors"]) / total_requests if total_requests > 0 else 0
        }
    
    def reset_stats(self):
        """Reset service statistics."""
        self.stats = {
            "requests": 0,
            "errors": 0
        }


# Convenience function for easy integration
def create_workout_service() -> WorkoutService:
    """Create and return a configured workout service."""
    return WorkoutService()
