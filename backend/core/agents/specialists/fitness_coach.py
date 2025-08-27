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
from ...workout.exercise_selector import ExerciseSelector
from ...workout.exercise_validator import ExerciseValidator

import os
import json
import openai

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
        
        # Initialize exercise services
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()
    
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
                            openai_client: openai.OpenAI,
                            enrich_with_knowledge: bool = False,
                            max_exercises: int = 100) -> WorkoutPlanSchema:
        """
        Generate a comprehensive workout plan using your existing system + RAG enhancement.
        
        Args:
            user_profile: User profile data (same as your current system)
            openai_client: OpenAI client for API calls
            
        Returns:
            WorkoutPlanSchema instance (same as your current system)
        """
        try:
            # Step 1: Get relevant exercise candidates based on user profile
            print("🔍 Selecting exercise candidates...")
            exercise_candidates = self._get_exercise_candidates_for_profile(user_profile, max_exercises)
            
            if not exercise_candidates:
                print("⚠️  No exercise candidates found, using fallback approach")
                # Fallback: get basic exercises without strict filtering
                exercise_candidates = self.exercise_selector.get_exercise_candidates(
                    muscle_groups=['full_body'],
                    difficulty=user_profile.experience_level,
                    equipment=user_profile.equipment,
                    max_exercises=max_exercises
                )
            
            print(f"✅ Found {len(exercise_candidates)} exercise candidates")
            
            # Step 3: Use your existing prompt generator with exercise candidates
            base_prompt = self.prompt_generator.create_initial_plan_prompt(
                user_profile, 
                exercise_candidates
            )

            # Step 4: Add the foundations of creating a workout plan
            base_prompt_w_foundations = self._add_foundations_of_creating_a_workout_plan(base_prompt)
            
            # Step 5: Enhance prompt with retrieved knowledge if available
            # TODO: we can add extra information to the prompt based on primary goal description and physical limitations (user profided textual fiels)
            if enrich_with_knowledge:
                # Step 5.1: Search knowledge base for relevant fitness documents using profile
                relevant_docs = self.search_fitness_documents(
                    user_profile=user_profile,
                    max_results=5
                )
                enhanced_prompt = self._enhance_prompt_with_knowledge(base_prompt_w_foundations, relevant_docs)
            else:
                enhanced_prompt = base_prompt_w_foundations
            
            # Step 6: Generate workout plan using OpenAI (same as your current system)
            print("🤖 Generating workout plan with OpenAI...")
            completion = openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": enhanced_prompt}],
                response_format=WorkoutPlanSchema,
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
            )
            
            # Parse the response (same as your current system)
            response_content = completion.choices[0].message.content
            workout_plan_data = json.loads(response_content)
            
            # Step 7: Validate and fix the generated workout plan
            print("🔍 Validating generated workout plan...")
            validated_plan, validation_messages = self.exercise_validator.validate_workout_plan(
                workout_plan_data
            )
            
            # Log validation results
            for message in validation_messages:
                print(f"   {message}")
            print(validated_plan)

            # Step 8: Create final workout plan schema
            workout_plan = WorkoutPlanSchema(**validated_plan)
            
            print("✅ Workout plan generated and validated successfully!")
            return workout_plan
            
        except Exception as e:
            print(f"❌ Error generating workout plan: {e}")
            raise
    
    def _get_exercise_candidates_for_profile(self, user_profile: UserProfileSchema, max_exercises: int = 200) -> List[Dict[str, Any]]:
        """
        Get exercise candidates based on user profile for workout generation.
        
        Args:
            user_profile: User profile data
            
        Returns:
            List of relevant exercise candidates
        """
        try:
            # Determine target muscle groups based on user goals
            target_muscles = self._get_target_muscle_groups(user_profile)
            
            # Convert equipment string to list for the exercise selector
            equipment_list = [user_profile.equipment] if user_profile.equipment else []
            
            # Get exercise candidates - use higher number to allow for better variety selection
            candidates = self.exercise_selector.get_exercise_candidates(
                muscle_groups=target_muscles,
                difficulty=user_profile.experience_level,
                equipment=equipment_list,
                max_exercises=max_exercises
            )
            
            return candidates
            
        except Exception as e:
            print(f"❌ Error getting exercise candidates: {e}")
            return []
    
    def _get_target_muscle_groups(self, user_profile: UserProfileSchema) -> List[str]:
        """
        Determine target muscle groups based on user profile and goals.
        
        Args:
            user_profile: User profile data
            
        Returns:
            List of target muscle groups (using actual database values)
        """
        goal = user_profile.primary_goal.lower()
        
        all_muscle_groups = ["Upper Arms", "Neck", "Chest", "Shoulder", "Calves", "Back", "Hips", "Thighs", "Forearm"]
        
        if goal != "bodybuilding":
            # for Improve Endurance, Increase Strength, General Fitness, Weight Loss, Power & Speed, we want to exclude the smaller muscle groups
            # TODO: for some goals, such as improve endurance, general fitness and weight loss we want to redirect to a different specialist agent including cardio and mobility exercises
            smaller_muscles = ["Upper Arms", "Neck", "Calves", "Forearm"]
            # Filter out smaller muscle groups for non-bodybuilding goals
            return [muscle for muscle in all_muscle_groups if muscle not in smaller_muscles]
        else:
            # Bodybuilding goal: target all muscle groups
            return all_muscle_groups
        
    def _build_profile_query(self, user_profile: UserProfileSchema) -> str:
        """Build a comprehensive search query based on user profile."""
        query_parts = []
        
        # Gender and age context
        if user_profile.gender and user_profile.age:
            query_parts.append(f"{user_profile.age} year old {user_profile.gender.lower()}")
        elif user_profile.age:
            query_parts.append(f"{user_profile.age} year old person")
        elif user_profile.gender:
            query_parts.append(f"{user_profile.gender.lower()} person")
        
        # Primary goal and description
        if user_profile.primary_goal:
            goal_text = user_profile.primary_goal.replace('_', ' ')
            if user_profile.primary_goal_description:
                query_parts.append(f"aiming for {goal_text} with focus on {user_profile.primary_goal_description}")
            else:
                query_parts.append(f"aiming for {goal_text}")
        
        # Experience level
        if user_profile.experience_level:
            query_parts.append(f"at {user_profile.experience_level} level")
        
        # Equipment
        if user_profile.equipment:
            query_parts.append(f"using {user_profile.equipment}")
        
        # Training frequency
        if user_profile.days_per_week:
            query_parts.append(f"training {user_profile.days_per_week} days per week")
        
        # Weight context
        if user_profile.weight:
            query_parts.append(f"weighing {user_profile.weight} {user_profile.weight_unit}")
        
        # Limitations and considerations
        if user_profile.has_limitations and user_profile.limitations_description:
            query_parts.append(f"with limitations including {user_profile.limitations_description}")
        
        # Final chat notes for additional context
        if user_profile.final_chat_notes:
            query_parts.append(f"with specific notes: {user_profile.final_chat_notes}")
        
        # Build comprehensive query
        if query_parts:
            base_query = " ".join(query_parts)
            # Add fitness context and make it a proper sentence
            return f"{base_query} seeking fitness training workout plan recommendations"
        else:
            return "seeking fitness training workout plan recommendations"
    

    
    def search_fitness_documents(self, user_profile: UserProfileSchema, 
                                query: str = None, max_results: int = 8) -> List[Dict[str, Any]]:
        """
        Search for fitness documents based on user profile and optional query.
        
        Args:
            user_profile: User profile data
            query: Optional specific query (if None, builds from profile)
            max_results: Maximum number of results to return
            
        Returns:
            List of relevant fitness documents
        """
        try:
            # Build query from profile if none provided
            if not query:
                query = self._build_profile_query(user_profile)
            
            print(f"🔍 Searching with query: '{query}'")
            print(f"🔍 Filtering by topic: 'fitness'")
            
            # Search knowledge base (only filtered by topic)
            relevant_docs = self.search_knowledge_base(
                query=query,
                max_results=max_results,
                metadata_filters=None  # Skip metadata filtering for now
            )
            
            if relevant_docs:
                print(f"✅ Found {len(relevant_docs)} relevant documents")
                # Log top results with quality indicators
                for i, doc in enumerate(relevant_docs[:3]):
                    quality_level, weight, emoji = self._get_document_quality(doc)
                    print(f"   {i+1}. {doc['document_title']} (Score: {doc['relevance_score']:.3f}, Quality: {emoji} {quality_level.upper()}, Weight: {weight:.1f})")
            else:
                print("⚠️  No relevant documents found, trying broader search...")
                # Try broader search without filters
                relevant_docs = self.search_knowledge_base(
                    query=query,
                    max_results=max_results,
                    metadata_filters=None
                )
                if relevant_docs:
                    print(f"✅ Found {len(relevant_docs)} documents in broader search")
            
            return relevant_docs
            
        except Exception as e:
            print(f"❌ Error searching fitness documents: {e}")
            return []
    
    def _enhance_prompt_with_knowledge(self, base_prompt: str, relevant_docs: List[Dict[str, Any]]) -> str:
        """Enhance the base prompt with retrieved knowledge with quality indicators."""
        if not relevant_docs:
            return base_prompt
        
        # Add knowledge context to the prompt with quality indicators
        knowledge_context = "\n\n**Additional Knowledge Base Context (Ranked by Relevance):**\n"
        
        for i, doc in enumerate(relevant_docs, 1):
            chunk_text = doc.get('chunk_text', '')
            relevance_score = doc.get('relevance_score', 0.0)
            
            if chunk_text:
                # Determine quality level and weight
                quality_level, weight, emoji = self._get_document_quality(doc)
                
                knowledge_context += f"\n{i}. **{emoji} {quality_level.upper()} QUALITY** (Relevance: {relevance_score:.3f}, Weight: {weight:.1f})\n"
                knowledge_context += f"   {chunk_text}\n"
        
        enhanced_prompt = base_prompt + knowledge_context
        
        # Add weighted instructions
        enhanced_prompt += "\n\n**Instructions:** Use the knowledge base context above to enhance your workout plan recommendations. "
        enhanced_prompt += "**Pay special attention to HIGH and VERY GOOD quality sources** - these are most relevant to the user's profile. "
        enhanced_prompt += "Use GOOD quality sources as supporting information. "
        enhanced_prompt += "ACCEPTABLE quality sources should be used sparingly and only when they provide unique insights not available in higher-quality sources. "
        enhanced_prompt += "Ensure the plan is evidence-based and follows best practices from the provided context."
        
        return enhanced_prompt
    
    def _get_quality_indicators(self, relevance_score: float) -> tuple[str, float, str]:
        """Get quality level, weight, and emoji for a relevance score."""
        if relevance_score >= 0.55:
            return "excellent", 1.0, "🌟"
        elif relevance_score >= 0.50:
            return "very good", 0.9, "⭐"
        elif relevance_score >= 0.45:
            return "good", 0.8, "✅"
        elif relevance_score >= 0.40:
            return "acceptable", 0.6, "⚠️"
        else:
            return "poor", 0.0, "❌"
    
    def _get_document_quality(self, doc: Dict[str, Any]) -> tuple[str, float, str]:
        """Get quality level, weight, and emoji for a document, handling pre-set quality levels."""
        # Check if quality level was already set (e.g., for poor quality fallback)
        if 'quality_level' in doc:
            quality_level = doc['quality_level']
            weight = doc.get('weight', 0.0)
            emoji = self._get_quality_emoji(quality_level)
            return quality_level, weight, emoji
        
        # Calculate quality based on relevance score
        relevance_score = doc.get('relevance_score', 0.0)
        return self._get_quality_indicators(relevance_score)
    
    def _add_foundations_of_creating_a_workout_plan(self, base_prompt: str) -> str:
        """
        Retrieve the entire Evidence-Based Fitness Training PDF directly from the documents table.
        This provides the AI with the complete document as workout plan foundations.
        
        Args:
            base_prompt: The original prompt from WorkoutPromptGenerator
            
        Returns:
            Enhanced prompt with the entire fitness training document
        """
        try:
            print("🔍 Retrieving Evidence-Based Fitness Training document from documents table...")
            
            # Directly query the documents table for the specific document
            response = self.supabase.table('documents').select('*').eq('title', 'Evidence-Based Fitness Training').execute()
            
            if response.data and len(response.data) > 0:
                document = response.data[0]
                full_content = document.get('content', '')
                
                if full_content:
                    print("✅ Retrieved complete Evidence-Based Fitness Training document")
                    
                    # Build the foundations context with the entire document
                    foundations_context = f"\n\n**COMPLETE EVIDENCE-BASED FITNESS TRAINING DOCUMENT:**\n\n{full_content}"
                    
                    enhanced_prompt = base_prompt + foundations_context
                    
                    # Add instructions for using the complete document
                    enhanced_prompt += """
                    
**INSTRUCTIONS:** Use the complete Evidence-Based Fitness Training document above as your comprehensive foundation for creating workout plans. 
This document contains all the principles, guidelines, and evidence-based practices you need. 
Apply the appropriate methodologies, training principles, and best practices based on the user's profile and goals. 
Ensure your workout plan follows the scientific foundations and recommendations outlined in this document."""
                    
                    return enhanced_prompt
                else:
                    print("⚠️  Document found but content is empty")
                    return base_prompt
            else:
                print("⚠️  Evidence-Based Fitness Training document not found in documents table")
                return base_prompt
                
        except Exception as e:
            print(f"❌ Error retrieving Evidence-Based Fitness Training document: {e}")
            print("⚠️  Falling back to base prompt only")
            return base_prompt
    
    def _get_quality_emoji(self, quality_level: str) -> str:
        """Get emoji for a quality level."""
        emoji_map = {
            'excellent': '🌟',
            'very_good': '⭐',
            'good': '✅',
            'acceptable': '⚠️',
            'poor': '❌'
        }
        return emoji_map.get(quality_level, '❓')
    
    def recommend_exercises(self, 
                           muscle_group: str, 
                           difficulty: str,
                           equipment: List[str] = None,
                           user_profile: UserProfileSchema = None) -> List[Dict[str, Any]]:
        """
        Recommend exercises for a specific muscle group.
        
        Args:
            muscle_group: Target muscle group (chest, back, legs, etc.)
            difficulty: Exercise difficulty level
            equipment: Available equipment
            user_profile: Optional user profile for better recommendations
            
        Returns:
            List of recommended exercises with details
        """
        try:
            # Use the exercise selector service for better recommendations
            if user_profile:
                # Use user profile for enhanced filtering
                equipment_list = [equipment] if isinstance(equipment, str) else (equipment or [user_profile.equipment])
                candidates = self.exercise_selector.get_exercise_candidates(
                    muscle_groups=[muscle_group],
                    difficulty=difficulty,
                    equipment=equipment_list,
                    max_exercises=10
                )
            else:
                # Basic filtering without user profile
                equipment_list = [equipment] if isinstance(equipment, str) else (equipment or ['Body Weight'])
                candidates = self.exercise_selector.get_exercise_candidates(
                    muscle_groups=[muscle_group],
                    difficulty=difficulty,
                    equipment=equipment_list,
                    max_exercises=10
                )
            
            if candidates:
                # Convert to the expected format
                exercises = []
                for candidate in candidates:
                    exercise = {
                        "name": candidate['name'],
                        "description": f"{candidate['difficulty']} {candidate['main_muscle']} exercise using {candidate['equipment']}",
                        "source": "Database",
                        "exercise_id": candidate['id'],
                        "difficulty": candidate['difficulty'],
                        "equipment": candidate['equipment'],
                        "main_muscle": candidate['main_muscle']
                    }
                    exercises.append(exercise)
                
                return exercises
            else:
                # Fallback to default exercises
                return self._get_default_exercises(muscle_group, difficulty)
                
        except Exception as e:
            print(f"❌ Error recommending exercises: {e}")
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
    

    
    def _get_default_exercises(self, muscle_group: str, difficulty: str) -> List[Dict[str, Any]]:
        """Get default exercises when no context is available."""
        # Handle None values gracefully
        if muscle_group is None:
            muscle_group = "general"
        
        # Basic exercise recommendations
        default_exercises = {
            "chest": ["Push-ups", "Dumbbell Press", "Bench Press"],
            "back": ["Pull-ups", "Rows", "Deadlifts"],
            "legs": ["Squats", "Lunges", "Deadlifts"],
            "shoulders": ["Overhead Press", "Lateral Raises", "Front Raises"],
            "arms": ["Bicep Curls", "Tricep Dips", "Hammer Curls"],
            "core": ["Planks", "Crunches", "Russian Twists"],
            "general": ["Push-ups", "Squats", "Planks", "Jumping Jacks", "Burpees"]
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
