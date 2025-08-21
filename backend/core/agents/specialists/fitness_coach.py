"""
Fitness Coach Agent

A specialist agent for fitness training, workout plans, and exercise advice.
Automatically filters knowledge base to only fitness-related documents.
Uses the existing WorkoutPromptGenerator and schemas for consistency.
"""

from typing import List, Dict, Any, Optional
from ..base.base_agent import BaseAgent
from ..base.rag_tool import RAGTool

# Import your existing schemas and prompt generator
from ...workout.schemas import WorkoutPlanSchema, UserProfileSchema
from ...workout.prompt_generator import WorkoutPromptGenerator

import os
import json

class FitnessCoach(BaseAgent):
    """Specialist agent for fitness training and workout planning."""
    
    def __init__(self):
        """Initialize the Fitness Coach agent."""
        super().__init__(
            agent_name="Fitness Coach",
            agent_description="Expert in strength training, muscle building, weight loss routines, and workout planning",
            topic="fitness"  # This automatically filters documents by topic
        )
        
        # Initialize RAG tool for fitness-specific knowledge retrieval
        self.rag_tool = RAGTool(self)
        
        # Initialize the existing prompt generator
        self.prompt_generator = WorkoutPromptGenerator()
    
    def _get_capabilities(self) -> List[str]:
        """Get the agent's capabilities."""
        return [
            "workout_plan_generation",
            "exercise_selection",
            "progression_tracking",
            "strength_training",
            "muscle_building",
            "weight_loss_routines",
            "form_guidance",
            "equipment_recommendations"
        ]
    
    def process_request(self, user_request: str) -> str:
        """
        Process fitness-related requests using RAG-enhanced knowledge.
        
        Args:
            user_request: User's fitness request
            
        Returns:
            Comprehensive fitness advice with workout plans
        """
        try:
            # Step 1: Extract metadata filters from the request
            metadata_filters = self.rag_tool.extract_metadata_filters(user_request)
            
            # Step 2: Search knowledge base for relevant fitness documents
            # Note: topic="fitness" automatically filters out nutrition, running, etc.
            relevant_docs = self.search_knowledge_base(
                query=user_request,
                max_results=5,
                metadata_filters=metadata_filters
            )
            
            # Step 3: Generate comprehensive response using retrieved context
            if relevant_docs:
                response = self.generate_response(user_request, relevant_docs)
                return self._format_fitness_response(response, relevant_docs)
            else:
                return self._generate_fallback_response(user_request)
                
        except Exception as e:
            print(f"❌ Error processing fitness request: {e}")
            return self._generate_error_response(user_request)
    
    def generate_workout_plan(self, 
                            user_profile: UserProfileSchema,
                            openai_client) -> WorkoutPlanSchema:
        """
        Generate a comprehensive workout plan using your existing system + RAG enhancement.
        
        Args:
            user_profile: User profile data (same as your current system)
            openai_client: OpenAI client for API calls
            
        Returns:
            WorkoutPlanSchema instance (same as your current system)
        """
        try:
            # Step 1: Search knowledge base for relevant fitness documents
            # Build query based on user profile
            query = self._build_profile_query(user_profile)
            
            relevant_docs = self.search_knowledge_base(
                query=query,
                max_results=3,
                metadata_filters=self._extract_profile_filters(user_profile)
            )
            
            # Step 2: Use your existing prompt generator
            base_prompt = self.prompt_generator.create_initial_plan_prompt(user_profile)
            
            # Step 3: Enhance prompt with retrieved knowledge if available
            enhanced_prompt = self._enhance_prompt_with_knowledge(base_prompt, relevant_docs)
            
            # Step 4: Generate workout plan using OpenAI (same as your current system)
            completion = openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": enhanced_prompt}],
                response_format=WorkoutPlanSchema,
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
            )
            
            # Parse the response (same as your current system)
            response_content = completion.choices[0].message.content
            workout_plan_data = json.loads(response_content)
            workout_plan = WorkoutPlanSchema(**workout_plan_data)
            
            return workout_plan
            
        except Exception as e:
            print(f"❌ Error generating workout plan: {e}")
            raise
    
    def _build_profile_query(self, user_profile: UserProfileSchema) -> str:
        """Build a search query based on user profile."""
        query_parts = []
        
        if user_profile.primary_goal:
            query_parts.append(user_profile.primary_goal)
        
        if user_profile.experience_level:
            query_parts.append(f"{user_profile.experience_level} level")
        
        if user_profile.equipment:
            query_parts.append(f"using {', '.join(user_profile.equipment)}")
        
        if user_profile.days_per_week:
            query_parts.append(f"{user_profile.days_per_week} days per week")
        
        return " ".join(query_parts) if query_parts else "fitness training"
    
    def _extract_profile_filters(self, user_profile: UserProfileSchema) -> Dict[str, Any]:
        """Extract metadata filters from user profile."""
        filters = {}
        
        if user_profile.experience_level:
            filters["difficulty_level"] = user_profile.experience_level.lower()
        
        if user_profile.primary_goal:
            filters["goal"] = user_profile.primary_goal.lower()
        
        if user_profile.days_per_week:
            filters["training_frequency"] = f"{user_profile.days_per_week}_days"
        
        if user_profile.equipment:
            filters["equipment_needed"] = user_profile.equipment
        
        return filters
    
    def _enhance_prompt_with_knowledge(self, base_prompt: str, relevant_docs: List[Dict[str, Any]]) -> str:
        """Enhance the base prompt with retrieved knowledge."""
        if not relevant_docs:
            return base_prompt
        
        # Add knowledge context to the prompt
        knowledge_context = "\n\n**Additional Knowledge Base Context:**\n"
        for i, doc in enumerate(relevant_docs, 1):
            chunk_text = doc.get('chunk_text', '')
            if chunk_text:
                knowledge_context += f"\n{i}. {chunk_text}\n"
        
        enhanced_prompt = base_prompt + knowledge_context
        
        # Add instruction to use the knowledge
        enhanced_prompt += "\n\n**Instructions:** Use the knowledge base context above to enhance your workout plan recommendations. Ensure the plan is evidence-based and follows best practices from the provided context."
        
        return enhanced_prompt
    
    def recommend_exercises(self, 
                           muscle_group: str, 
                           difficulty: str,
                           equipment: List[str] = None) -> List[Dict[str, Any]]:
        """
        Recommend exercises for a specific muscle group.
        
        Args:
            muscle_group: Target muscle group (chest, back, legs, etc.)
            difficulty: Exercise difficulty level
            equipment: Available equipment
            
        Returns:
            List of recommended exercises with details
        """
        query = f"{difficulty} {muscle_group} exercises"
        if equipment:
            query += f" using {', '.join(equipment)}"
        
        relevant_docs = self.search_knowledge_base(
            query=query,
            max_results=5,
            metadata_filters={
                "body_part": muscle_group.lower(),
                "difficulty_level": difficulty.lower()
            }
        )
        
        if relevant_docs:
            return self._extract_exercise_recommendations(relevant_docs)
        else:
            return self._get_default_exercises(muscle_group, difficulty)
    
    def _format_fitness_response(self, response: str, relevant_docs: List[Dict[str, Any]]) -> str:
        """Format the fitness response with additional context."""
        formatted_response = f"🏋️‍♂️ **Fitness Coach Response**\n\n{response}\n\n"
        
        # Add source information
        if relevant_docs:
            formatted_response += "📚 **Sources:**\n"
            for i, doc in enumerate(relevant_docs[:3], 1):
                title = doc.get('document_title', 'Unknown')
                formatted_response += f"{i}. {title}\n"
        
        return formatted_response
    
    def _extract_exercise_recommendations(self, relevant_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract exercise recommendations from retrieved documents."""
        exercises = []
        for doc in relevant_docs:
            # Extract exercise information from document chunks
            chunk_text = doc.get('chunk_text', '')
            if chunk_text:
                exercises.append({
                    "name": f"Exercise from {doc.get('document_title', 'Unknown')}",
                    "description": chunk_text[:100] + "..." if len(chunk_text) > 100 else chunk_text,
                    "source": doc.get('document_title', 'Unknown')
                })
        
        return exercises
    
    def _get_default_exercises(self, muscle_group: str, difficulty: str) -> List[Dict[str, Any]]:
        """Get default exercises when no context is available."""
        # Basic exercise recommendations
        default_exercises = {
            "chest": ["Push-ups", "Dumbbell Press", "Bench Press"],
            "back": ["Pull-ups", "Rows", "Deadlifts"],
            "legs": ["Squats", "Lunges", "Deadlifts"],
            "shoulders": ["Overhead Press", "Lateral Raises", "Front Raises"],
            "arms": ["Bicep Curls", "Tricep Dips", "Hammer Curls"],
            "core": ["Planks", "Crunches", "Russian Twists"]
        }
        
        exercises = default_exercises.get(muscle_group.lower(), ["General exercises"])
        return [
            {"name": exercise, "description": f"Standard {exercise}", "source": "Default"}
            for exercise in exercises
        ]
    
    def _generate_fallback_response(self, user_request: str) -> str:
        """Generate a fallback response when no relevant documents are found."""
        return f"""I understand you're asking about: "{user_request}"

While I don't have specific information about this in my knowledge base yet, I can provide general fitness guidance based on best practices.

For more personalized advice, please try:
- Being more specific about your goals
- Mentioning your experience level
- Specifying available equipment

Would you like me to create a general workout plan or recommend some basic exercises?"""
    
    def _generate_error_response(self, user_request: str) -> str:
        """Generate an error response when processing fails."""
        return f"""I apologize, but I encountered an error while processing your request: "{user_request}"

This might be due to:
- Temporary system issues
- Knowledge base access problems
- Complex request format

Please try rephrasing your request or contact support if the issue persists."""
