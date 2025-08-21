"""
Smart Workout Service

This service intelligently routes workout plan generation requests to either:
- Simple LLM (free tier) - for basic workout plans
- Enhanced Fitness Coach (premium tier) - for RAG-enhanced, knowledge-based plans

The service automatically detects which tier to use and provides a unified interface.
"""

import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Import your existing schemas and prompt generator
from .schemas import WorkoutPlanSchema, UserProfileSchema
from .prompt_generator import WorkoutPromptGenerator

# Import the enhanced Fitness Coach
from ..agents.specialists.fitness_coach import FitnessCoach

# Load environment variables
load_dotenv()

class SmartWorkoutService:
    """
    Smart workout service that provides both free and premium workout generation.
    
    Features:
    - Automatic tier detection
    - Seamless fallback between tiers
    - Unified response format
    - Performance monitoring
    """
    
    def __init__(self):
        """Initialize the smart workout service."""
        self.prompt_generator = WorkoutPromptGenerator()
        self.fitness_coach = None  # Lazy initialization for premium tier
        
        # Configuration
        self.premium_enabled = os.getenv("PREMIUM_TIER_ENABLED", "true").lower() == "true"
        self.fallback_to_free = os.getenv("FALLBACK_TO_FREE", "true").lower() == "true"
        
        # Performance tracking
        self.stats = {
            "free_tier_requests": 0,
            "premium_tier_requests": 0,
            "fallback_requests": 0,
            "errors": 0
        }
    
    def generate_workout_plan(self, 
                             user_profile: UserProfileSchema,
                             openai_client,
                             tier: str = "auto",
                             force_tier: bool = False) -> Dict[str, Any]:
        """
        Generate a workout plan using the appropriate tier.
        
        Args:
            user_profile: User profile data
            openai_client: OpenAI client instance
            tier: "free", "premium", or "auto" (default)
            force_tier: If True, use specified tier even if premium fails
            
        Returns:
            Dictionary with workout plan and metadata
        """
        try:
            # Determine which tier to use
            selected_tier = self._determine_tier(tier, user_profile)
            
            if selected_tier == "premium" and self.premium_enabled:
                return self._generate_premium_workout(user_profile, openai_client, force_tier)
            else:
                return self._generate_free_workout(user_profile, openai_client)
                
        except Exception as e:
            self.stats["errors"] += 1
            print(f"❌ Error in smart workout service: {e}")
            
            # Fallback to free tier if enabled
            if self.fallback_to_free:
                self.stats["fallback_requests"] += 1
                print("🔄 Falling back to free tier...")
                return self._generate_free_workout(user_profile, openai_client)
            else:
                raise
    
    def _determine_tier(self, requested_tier: str, user_profile: UserProfileSchema) -> str:
        """
        Intelligently determine which tier to use.
        
        Logic:
        - If user explicitly requests a tier, use it
        - If premium is disabled, use free
        - If user has premium features, prefer premium
        - Otherwise, use free
        """
        if requested_tier == "free":
            return "free"
        elif requested_tier == "premium":
            return "premium"
        elif requested_tier == "auto":
            # Auto-detect based on user profile and system capabilities
            if not self.premium_enabled:
                return "free"
            
            # Check if user has premium features (you can extend this logic)
            # For now, default to premium if available
            return "premium"
        else:
            # Invalid tier, default to free
            return "free"
    
    def _generate_premium_workout(self, 
                                 user_profile: UserProfileSchema,
                                 openai_client,
                                 force_tier: bool = False) -> Dict[str, Any]:
        """Generate workout plan using the enhanced Fitness Coach."""
        try:
            # Lazy initialize Fitness Coach
            if self.fitness_coach is None:
                self.fitness_coach = FitnessCoach()
            
            # Generate enhanced workout plan
            workout_plan = self.fitness_coach.generate_workout_plan(user_profile, openai_client)
            
            self.stats["premium_tier_requests"] += 1
            
            return {
                "status": "success",
                "tier": "premium",
                "message": "Enhanced workout plan generated using AI Fitness Coach",
                "workout_plan": workout_plan,
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
            print(f"❌ Premium tier failed: {e}")
            
            if force_tier:
                # User explicitly requested premium, don't fallback
                raise
            elif self.fallback_to_free:
                # Fallback to free tier
                self.stats["fallback_requests"] += 1
                print("🔄 Premium tier failed, falling back to free tier...")
                return self._generate_free_workout(user_profile, openai_client)
            else:
                # No fallback allowed
                raise
    
    def _generate_free_workout(self, 
                              user_profile: UserProfileSchema,
                              openai_client) -> Dict[str, Any]:
        """Generate workout plan using simple LLM (your existing system)."""
        try:
            # Use your existing prompt generator
            prompt = self.prompt_generator.create_initial_plan_prompt(user_profile)
            
            # Call OpenAI API (same as your current system)
            completion = openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=WorkoutPlanSchema,
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
            )
            
            # Parse the response (same as your current system)
            response_content = completion.choices[0].message.content
            workout_plan_data = json.loads(response_content)
            workout_plan = WorkoutPlanSchema(**workout_plan_data)
            
            self.stats["free_tier_requests"] += 1
            
            return {
                "status": "success",
                "tier": "free",
                "message": "Workout plan generated using standard AI",
                "workout_plan": workout_plan,
                "enhancements": {
                    "knowledge_base_used": False,
                    "rag_enhanced": False,
                    "context_aware": False
                },
                "metadata": {
                    "agent_used": "Standard LLM",
                    "knowledge_sources": "OpenAI only",
                    "generation_method": "Direct LLM"
                }
            }
            
        except Exception as e:
            print(f"❌ Free tier failed: {e}")
            raise
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service performance statistics."""
        total_requests = self.stats["free_tier_requests"] + self.stats["premium_tier_requests"]
        
        return {
            "total_requests": total_requests,
            "free_tier_requests": self.stats["free_tier_requests"],
            "premium_tier_requests": self.stats["premium_tier_requests"],
            "fallback_requests": self.stats["fallback_requests"],
            "errors": self.stats["errors"],
            "success_rate": (total_requests - self.stats["errors"]) / total_requests if total_requests > 0 else 0,
            "premium_usage_rate": self.stats["premium_tier_requests"] / total_requests if total_requests > 0 else 0,
            "configuration": {
                "premium_enabled": self.premium_enabled,
                "fallback_to_free": self.fallback_to_free
            }
        }
    
    def reset_stats(self):
        """Reset service statistics."""
        self.stats = {
            "free_tier_requests": 0,
            "premium_tier_requests": 0,
            "fallback_requests": 0,
            "errors": 0
        }
    
    def update_config(self, premium_enabled: bool = None, fallback_to_free: bool = None):
        """Update service configuration."""
        if premium_enabled is not None:
            self.premium_enabled = premium_enabled
        
        if fallback_to_free is not None:
            self.fallback_to_free = fallback_to_free
        
        print(f"✅ Service config updated: premium_enabled={self.premium_enabled}, fallback_to_free={self.fallback_to_free}")


# Convenience function for easy integration
def create_smart_workout_service() -> SmartWorkoutService:
    """Create and return a configured smart workout service."""
    return SmartWorkoutService()
