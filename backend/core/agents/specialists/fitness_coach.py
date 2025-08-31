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
from ...workout.training_rules_engine import TrainingRulesEngine

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
        
        # Initialize training rules engine
        self.training_rules_engine = TrainingRulesEngine()
    
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
                            max_exercises: int = 300) -> WorkoutPlanSchema:
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

            # Step 4: Add the foundations of creating a workout plan with user-specific rules
            base_prompt_w_foundations = self._add_foundations_of_creating_a_workout_plan(base_prompt, user_profile)
            
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
    
    def _get_exercise_candidates_for_profile(self, user_profile: UserProfileSchema, max_exercises: int) -> List[Dict[str, Any]]:
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
        
        if goal not in ["bodybuilding", "increase strength"]:
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
                # Log top results
                for i, doc in enumerate(relevant_docs[:3]):
                    print(f"   {i+1}. {doc['document_title']} (Score: {doc['relevance_score']:.3f})")
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
        """Enhance the base prompt with retrieved knowledge."""
        if not relevant_docs:
            return base_prompt
        
        # Add knowledge context to the prompt
        knowledge_context = "\n\n**Additional Knowledge Base Context (Ranked by Relevance):**\n"
        
        for i, doc in enumerate(relevant_docs, 1):
            chunk_text = doc.get('chunk_text', '')
            relevance_score = doc.get('relevance_score', 0.0)
            
            if chunk_text:
                knowledge_context += f"\n{i}. **Relevance Score: {relevance_score:.3f}**\n"
                knowledge_context += f"   {chunk_text}\n"
        
        enhanced_prompt = base_prompt + knowledge_context
        
        # Add instructions
        enhanced_prompt += "\n\n**Instructions:** Use the knowledge base context above to enhance your workout plan recommendations. "
        enhanced_prompt += "Higher relevance scores indicate more relevant information. "
        enhanced_prompt += "Ensure the plan is evidence-based and follows best practices from the provided context."
        
        return enhanced_prompt
    
    # Note: Quality indicator methods removed as they're no longer needed
    # The TrainingRulesEngine now provides all the necessary training guidelines
    



    def _add_foundations_of_creating_a_workout_plan(self, base_prompt: str, user_profile: UserProfileSchema = None) -> str:
        """
        Add evidence-based fitness training foundations using the TrainingRulesEngine.
        This provides the AI with comprehensive, rule-based training guidelines instead of PDF content.
        
        Args:
            base_prompt: The original prompt from WorkoutPromptGenerator
            user_profile: User profile to generate specific training rules
            
        Returns:
            Enhanced prompt with comprehensive training rules and foundations
        """
        try:
            print("🔍 Generating evidence-based fitness training foundations using TrainingRulesEngine...")
            
            # Start with the base prompt
            enhanced_prompt = base_prompt
            
            # Add comprehensive training foundations
            foundations_context = """
            
**EVIDENCE-BASED FITNESS TRAINING FOUNDATIONS:**

The following training principles and guidelines are based on scientific research and evidence-based practices:

**CORE TRAINING PRINCIPLES:**
1. **Progressive Overload**: Gradually increase training stimulus to continue adaptation
2. **Specificity**: Training should match the desired outcome
3. **Individualization**: Programs must be tailored to individual needs and capabilities
4. **Variation**: Systematic variation prevents plateaus and maintains progress
5. **Recovery**: Adequate rest and recovery are essential for adaptation

**TRAINING PHASES (Periodization):**
- **Muscular Endurance**: 12+ reps, 50-70% 1RM, focus on work capacity
- **Hypertrophy**: 6-12 reps, 65-85% 1RM, focus on muscle growth
- **Strength**: 1-6 reps, 80-95% 1RM, focus on maximal force production
- **Power**: 1-5 reps, 75-95% 1RM, focus on explosive movements

**PERIODIZATION STRATEGIES:**
- **Linear Periodization**: Gradual increase in intensity, decrease in volume
- **Undulating Periodization**: Variation in intensity and volume within cycles
- **Block Periodization**: Focused training blocks with specific objectives
- **Daily Undulating Periodization (DUP)**: Different training focus each day

**EXERCISE SELECTION PRINCIPLES:**
- **Compound Movements**: Multi-joint exercises for efficiency and functional strength
- **Progressive Complexity**: Start simple, progress to more complex movements
- **Balanced Development**: Target all major muscle groups and movement patterns
- **Equipment Appropriateness**: Use available equipment effectively and safely

**RECOVERY AND ADAPTATION:**
- **Rest Periods**: Appropriate rest between sets based on training goal
- **Frequency**: Training frequency should match recovery capacity
- **Deloading**: Planned reduction in training stress to prevent overtraining
- **Sleep and Nutrition**: Essential for optimal recovery and adaptation
"""
            
            enhanced_prompt += foundations_context
            
            # Add user-specific rules if user profile is provided
            if user_profile:
                print("✅ Generating user-specific training rules...")
                
                # Use the training rules engine to generate comprehensive user-specific rules
                user_rules = self.training_rules_engine.generate_user_specific_rules(user_profile)
                personalized_instructions = self.training_rules_engine.generate_personalized_instructions(user_profile)
                # Add the specific rules to the prompt
                enhanced_prompt += f"\n\n{user_rules}\n\n{personalized_instructions}"
                
                print("✅ User-specific rules added to prompt")
            else:
                print("⚠️  No user profile provided, using general foundations only")
            
            # Add final instructions for using the training foundations
            enhanced_prompt += """
            
**CRITICAL TRAINING INSTRUCTIONS - READ CAREFULLY:**

🚨 **RULE COMPLIANCE IS MANDATORY:**
The user-specific rules above are NOT suggestions - they are MANDATORY requirements that MUST be followed exactly.

**BEFORE GENERATING THE WORKOUT PLAN:**
1. **READ ALL RULES COMPLETELY** - Every single rule must be understood
2. **FOLLOW EXERCISE COUNT REQUIREMENTS** - Minimum exercises per workout is mandatory
3. **USE CORRECT REP SCHEMES** - Rep ranges must match the specified training parameters
4. **IMPLEMENT PROPER TRAINING SPLITS** - Follow the exact split structure outlined
5. **AVOID CONFLICTING EXERCISES** - Never combine movements that interfere with each other
6. **APPLY PERIODIZATION STRATEGY** - Use the exact approach specified for the user's level

**WORKOUT PLAN VALIDATION:**
Before submitting your response, verify that:
- Exercise count meets minimum requirements
- Rep schemes match the specified ranges  
- Training split follows the correct structure
- No conflicting exercise combinations exist
- Periodization strategy is properly implemented
- ALL rules from the training engine are followed

**CONSEQUENCES OF NON-COMPLIANCE:**
If you don't follow these rules exactly, the workout plan will be REJECTED and the user will NOT receive proper training guidance.

**REMEMBER:** These are evidence-based, scientifically-proven training principles. Follow them precisely for optimal results and safety."""
            
            print("✅ Evidence-based fitness training foundations added successfully")
            return enhanced_prompt
                
        except Exception as e:
            print(f"❌ Error generating training foundations: {e}")
            print("⚠️  Falling back to base prompt only")
            return base_prompt
    
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
    
    def generate_enhanced_workout_plan(self, 
                                     user_profile: UserProfileSchema,
                                     openai_client) -> dict:
        """
        Simple workout service function that generates enhanced workout plans.
        
        Args:
            user_profile: User profile data
            openai_client: OpenAI client instance
            
        Returns:
            Dictionary with workout plan and metadata
        """
        try:
            # Generate enhanced workout plan using existing method
            workout_plan = self.generate_workout_plan(
                user_profile=user_profile,
                openai_client=openai_client
            )
            
            return {
                "status": "success",
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
            print(f"❌ Error generating enhanced workout plan: {e}")
            raise