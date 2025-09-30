"""
Enhanced Fitness Coach Agent with AI Question Generation and Training Plan Creation
"""

import os
import openai
from typing import List, Dict, Any, Optional

from core.base.base_agent import BaseAgent
from core.base.rag_tool import RAGTool

# Import schemas and services
from core.fitness.helpers.schemas import WorkoutPlanSchema
from core.fitness.helpers.exercise_selector import ExerciseSelector
from core.fitness.helpers.exercise_validator import ExerciseValidator
from core.fitness.helpers.database_service import db_service
from core.fitness.helpers.models import GenerateWorkoutRequest, GenerateWorkoutResponse
from core.fitness.helpers.ai_question_schemas import (
    AIQuestionResponse,
    AIQuestionResponseWithFormatted,
    PersonalInfo,
    QuestionType,
    QuestionCategory,
    AIQuestion,
    QuestionOption,
    TrainingPlanOutline
)
from core.fitness.helpers.response_formatter import ResponseFormatter
from core.fitness.helpers.mock_data import create_mock_training_plan_outline

class FitnessCoach(BaseAgent):
    """
    Enhanced Fitness Coach that provides AI-generated questions and training plans.
    """
    
    def __init__(self):
        # Initialize the base agent with fitness-specific configuration
        super().__init__(
            agent_name="Fitness Coach",
            agent_description="Expert in strength training, muscle building, weight loss routines, and workout planning",
            topic="fitness"  # This automatically filters documents by topic
        )
        
        # Initialize RAG tool for fitness-specific knowledge retrieval
        self.rag_tool = RAGTool(self)
        
        # Initialize exercise services
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()
    
    def _get_capabilities(self) -> List[str]:
        """Get the agent's capabilities."""
        return [
            "workout_plan_generation",
            "exercise_recommendation", 
            "fitness_question_generation",
            "training_plan_creation",
            "exercise_validation",
            "fitness_knowledge_retrieval"
        ]
    
    def process_request(self, user_request: str) -> str:
        """Process a user request - required by BaseAgent."""
        return self.process_fitness_request(user_request)
    
    def process_fitness_request(self, user_request: str, context: Dict[str, Any] = None) -> str:
        """
        Process fitness-related requests using RAG-enhanced knowledge retrieval.
        
        Args:
            user_request: The user's fitness-related question or request
            context: Additional context for the request
            
        Returns:
            Formatted fitness response with relevant information
        """
        try:
            # Search for relevant fitness documents
            relevant_docs = self.search_knowledge_base(
                query=user_request,
                max_results=5,
                metadata_filters=None
            )
            
            if relevant_docs:
                # Use RAG tool to generate response with context
                response = self.rag_tool.generate_response(
                    user_request, 
                    relevant_docs, 
                    context=context
                )
                return self._format_fitness_response(response, relevant_docs)
            else:
                # Fallback to general fitness guidance
                return self._generate_fallback_response(user_request)
                
        except Exception as e:
            print(f"❌ Error processing fitness request: {e}")
            return self._generate_error_response(user_request)
    
    def generate_initial_questions(self, personal_info: PersonalInfo) -> AIQuestionResponse:
        """Generate initial questions for onboarding based on personal information."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.fitness.helpers.mock_data import create_mock_initial_questions
                initial_questions = create_mock_initial_questions()
                return initial_questions
            
            # Create a comprehensive prompt for initial questions
            prompt = f"""
            {self._get_question_generation_intro()}
            
            {self._format_client_information(personal_info)}
            
            Generate some questions that will help you create a personalized training plan. 
            Only ask questions that will influence the training plan. Areas to consider are:
            1. Their current fitness level and experience
            2. Available equipment and facilities
            3. Time constraints and schedule
            4. Any injuries or limitations
            5. Specific preferences and dislikes
            6. Training history and past results
            7. Upcoming events or specific achievements
            
            {self._get_question_generation_instructions()}
            
            Return the questions in the AIQuestionResponse format.
            """
            
            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            return completion.choices[0].message.parsed
            
        except Exception as e:
            print(f"❌ Error generating initial questions: {e}")
            # Return a fallback response
            return AIQuestionResponse(
                questions=[
                    AIQuestion(
                        id="fallback_1",
                        text="What is your primary fitness goal?",
                        response_type=QuestionType.MULTIPLE_CHOICE,
                        category=QuestionCategory.GOALS_PREFERENCES,
                        options=[
                            QuestionOption(id="goal_1", text="Build Muscle", value="build_muscle"),
                            QuestionOption(id="goal_2", text="Lose Weight", value="lose_weight"),
                            QuestionOption(id="goal_3", text="Improve Strength", value="improve_strength"),
                            QuestionOption(id="goal_4", text="General Fitness", value="general_fitness")
                        ]
                    )
                ],
                total_questions=1,
                estimated_time_minutes=2,
                categories=[QuestionCategory.GOALS_PREFERENCES]
            )
    
    def generate_follow_up_questions(self, personal_info: PersonalInfo, formatted_responses: str, initial_questions: List[AIQuestion] = None) -> AIQuestionResponseWithFormatted:
        """Generate follow-up questions based on initial responses."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.fitness.helpers.mock_data import create_mock_follow_up_questions
                follow_up_questions = create_mock_follow_up_questions()
                print(f"🐛 DEBUG MODE: User responses for follow-up questions: {formatted_responses}")
                return AIQuestionResponseWithFormatted(
                    questions=follow_up_questions.questions,
                    total_questions=follow_up_questions.total_questions,
                    estimated_time_minutes=follow_up_questions.estimated_time_minutes,
                    categories=follow_up_questions.categories,
                    formatted_responses=formatted_responses
                )
            
            # Create a comprehensive prompt for follow-up questions
            prompt = f"""
            {self._get_question_generation_intro()}
            
            {self._format_client_information(personal_info)}
            
            Initial questions and answers that you have already asked:
            {formatted_responses}
            
            Generate a few follow-up questions to this initial questions that help you better understand the client 
            and will in the end help you create a personalized training plan.
            
            {self._get_question_generation_instructions()}
            
            Return the questions in the AIQuestionResponse format.
            """
            
            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            # Get the parsed response
            question_response = completion.choices[0].message.parsed
            
            # Format the responses for database storage
            formatted_responses = ResponseFormatter.format_responses(responses, initial_questions)
            
            # Return with formatted responses
            return AIQuestionResponseWithFormatted(
                questions=question_response.questions,
                total_questions=question_response.total_questions,
                estimated_time_minutes=question_response.estimated_time_minutes,
                categories=question_response.categories,
                formatted_responses=formatted_responses
            )
            
        except Exception as e:
            print(f"❌ Error generating follow-up questions: {e}")
            # Return a fallback response
            formatted_responses = ResponseFormatter.format_responses(responses, initial_questions)
            return AIQuestionResponseWithFormatted(
                questions=[
                    AIQuestion(
                        id="followup_1",
                        text="How many days per week can you commit to training?",
                        response_type=QuestionType.SLIDER,
                        category=QuestionCategory.TIME_COMMITMENT,
                        min_value=1,
                        max_value=7,
                        step=1
                    )
                ],
                total_questions=1,
                estimated_time_minutes=1,
                categories=[QuestionCategory.TIME_COMMITMENT],
                formatted_responses=formatted_responses
            )
    
    def generate_training_plan_outline(self, personal_info: PersonalInfo, formatted_initial_responses: str, formatted_follow_up_responses: str, initial_questions: List[AIQuestion] = None, follow_up_questions: List[AIQuestion] = None) -> Dict[str, Any]:
        """Generate a training plan outline before creating the final detailed plan."""
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                print("🐛 DEBUG MODE: Using mock training plan outline")
                outline = create_mock_training_plan_outline()
                return {
                    'success': True,
                    'outline': outline.model_dump(),
                    'metadata': {
                        'generation_method': 'Mock Data (Debug Mode)',
                        'user_goals': personal_info.goal_description
                    }
                }
            
            # Create a comprehensive prompt for outline generation
            prompt = self._create_outline_prompt(personal_info, formatted_initial_responses, formatted_follow_up_responses, initial_questions, follow_up_questions)
            
            # Generate the outline using OpenAI with structured output
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert fitness coach creating training plan outlines. Provide structured, detailed outlines that give users a clear preview of their upcoming workout plan."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format=TrainingPlanOutline
            )
            
            # Parse the structured response
            outline = response.choices[0].message.parsed
            
            return {
                'success': True,
                'outline': outline.model_dump(),
                'metadata': {
                    'generation_method': 'AI Generated',
                    'user_goals': personal_info.goal_description,
                    'experience_level': personal_info.experience_level
                }
            }
            
        except Exception as e:
            print(f"❌ Error generating training plan outline: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to generate training plan outline: {str(e)}"
            }
    
    def generate_training_plan(self, personal_info: PersonalInfo, formatted_initial_responses: str, formatted_follow_up_responses: str, plan_outline: dict = None, initial_questions: List[AIQuestion] = None, follow_up_questions: List[AIQuestion] = None) -> Dict[str, Any]:
        """Generate a comprehensive training plan using the new flow: get_exercise_candidates -> prompt -> workout plan -> validate_workout_plan."""
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                print("🐛 DEBUG MODE: Using mock workout plan")
                from core.fitness.helpers.mock_data import create_mock_workout_plan
                workout_plan = create_mock_workout_plan()
                workout_dict = workout_plan.model_dump()
                print(f"🐛 DEBUG MODE: Generated mock workout plan with {len(workout_dict.get('weekly_schedules', []))} weeks")
                return {
                    'success': True,
                    'workout_plan': workout_dict,
                    'metadata': {
                        'exercises_candidates': 0,
                        'validation_messages': ['Debug mode: Using mock data'],
                        'generation_method': 'Mock Data (Debug Mode)'
                    }
                }
            
            # Step 1: Retrieve ALL exercises using get_exercise_candidates
            print(f"🎯 Retrieving exercise candidates...")
            difficulty = personal_info.experience_level or "beginner"
            
            all_exercises = self.exercise_selector.get_exercise_candidates(
                max_exercises=100,  # Get a large pool of exercises
                difficulty=difficulty
            )
            
            print(f"✅ Retrieved {len(all_exercises)} exercise candidates")
            
            # Check if we have exercises available
            if not all_exercises:
                return {
                    'success': False,
                    'error': 'No exercises available for the specified difficulty level. Please try a different experience level.'
                }
            
            # Step 2: Get formatted exercises for AI prompt
            exercise_info = self.exercise_selector.get_formatted_exercises_for_ai(
                max_exercises=100,
                difficulty=difficulty
            )
            
            # Check if formatting was successful
            if exercise_info == "No exercises available":
                return {
                    'success': False,
                    'error': 'Failed to format exercises for AI. Please try again.'
                }
            
            # Combine formatted responses for context
            combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
            
            # Add plan outline context if available
            outline_context = ""
            if plan_outline:
                # Extract user feedback if available
                user_feedback = plan_outline.get('user_feedback', '')
                feedback_context = ""
                if user_feedback:
                    feedback_context = f"""
            
            IMPORTANT: The user has provided specific feedback on the training plan outline:
            "{user_feedback}"
            
            Please incorporate this feedback into the final training plan.
            """
                
                outline_context = f"""
            
            Training Plan Outline (follow this structure):
            {plan_outline}
            {feedback_context}
            """
            
            prompt = f"""
            You are an ELITE PERFORMANCE COACH. Create a personalized training plan based on the following information:
            
            Personal Information:
            - Age: {personal_info.age}
            - Weight: {personal_info.weight} {personal_info.weight_unit}
            - Height: {personal_info.height} {personal_info.height_unit}
            - Goal: {personal_info.goal_description}
            
            To get some better understand you have asked the following initial and follow-up questions:
            {combined_responses}
            {outline_context}
            
            Available Exercises (use ONLY these exercise IDs):
            {exercise_info}
            
            Create a training plan that:
            1. Is specifically tailored to their goal and utilizing the information from the initial and follow-up questions
            2. Uses ONLY the provided exercise IDs (do not create new exercises)
            3. Includes proper progression and structure
            4. Is realistic and achievable
            5. Covers the full training week with appropriate rest days
            6. Follows the training plan outline structure if provided
            7. Incorporates any user feedback provided on the training plan outline
            
            Return the plan in the WorkoutPlanSchema format.
            """
            
            # Step 3: Get the workout plan
            print(f"🤖 Generating workout plan with AI...")
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=WorkoutPlanSchema,
                temperature=0.7
            )
            
            training_plan = completion.choices[0].message.parsed
            workout_dict = training_plan.model_dump()
            
            # Step 4: Validate the workout plan with exercise_validator
            print(f"🔍 Validating workout plan...")
            validated_workout, validation_messages = self.exercise_validator.validate_workout_plan(workout_dict)
            
            print(f"✅ Validation complete: {len(validation_messages)} messages")
            for message in validation_messages:
                print(f"   📝 {message}")
            
            return {
                'success': True,
                'workout_plan': validated_workout,
                'metadata': {
                    'exercises_candidates': len(all_exercises),
                    'validation_messages': validation_messages,
                    'generation_method': 'AI + Exercise Database + Validation'
                }
            }
                
        except Exception as e:
            print(f"❌ Error generating training plan: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    
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
    

    def _get_question_generation_intro(self) -> str:
        """Get standardized introduction for AI question generation."""
        return "You are an expert fitness coach creating personalized training plans for a new client."
    
    def _format_client_information(self, personal_info: PersonalInfo) -> str:
        """Format client information for AI prompts."""
        return f"""
            Client Information:
            - Age: {personal_info.age}
            - Weight: {personal_info.weight} {personal_info.weight_unit}
            - Height: {personal_info.height} {personal_info.height_unit}
            - Gender: {personal_info.gender}
            - Measurement System: {personal_info.measurement_system}
            - Goal: {personal_info.goal_description}
            - Experience Level: {personal_info.experience_level}
            
            IMPORTANT: Use the {personal_info.measurement_system} measurement system in all questions. 
            If metric: use kg, cm, km, etc. If imperial: use lbs, feet/inches, miles, etc.
        """
    
    def _get_question_generation_instructions(self) -> str:
        """Get standardized instructions for AI question generation."""
        return """
            Use appropriate question types:
            - multiple_choice: for <= 5 options
            - dropdown: for > 5 options  
            - rating: for <= 5 scale
            - slider: for > 5 scale (MUST include 'unit' field with appropriate measurement)
            - text_input: for open-ended responses
            - conditional_boolean: for ALL yes/no questions (REQUIRED for any Yes/No question)
            
            IMPORTANT: Use conditional_boolean for ALL Yes/No questions because:
            - "Yes" answers often need detailed clarification (e.g., "What equipment do you have?")
            - The text input only appears when user selects "Yes" - "No" answers don't need additional context
            - This creates more personalized workout plans by capturing specific details
            - There are no exceptions - always use conditional_boolean for Yes/No questions
            
            For conditional_boolean questions, ALWAYS provide:
            - placeholder: Clear instruction for what details to provide when "Yes" is selected
            - max_length: Reasonable character limit for the text field (200-500 characters)
            - help_text: Explanation of why the details are important (only shown when "Yes" is selected)
            
            For slider questions, ALWAYS provide:
            - min_value: minimum value
            - max_value: maximum value  
            - step: step increment
            - unit: appropriate unit based on measurement system (kg/lbs, minutes, hours, etc.)
            
            For rating questions, ALWAYS provide:
            - min_value: minimum rating (usually 1)
            - max_value: maximum rating (usually 5 or 10)
            - help_text: Explanation of what the scale means (e.g., "1 = Very Low, 5 = Very High")
        """
    
    def _get_outline_generation_intro(self) -> str:
        """Get standardized introduction for training plan outline generation."""
        return "You are an expert sports coach creating a detailed training plan outline for a new athlete. Your goal is to provide a comprehensive preview of their upcoming personalized training program across any sport or athletic discipline."
    
    def _get_outline_generation_instructions(self) -> str:
        """Get standardized instructions for training plan outline generation."""
        return """
Create a structured training plan outline with three levels:

1. **Training Plan Level** (Top Level):
   - Title: A compelling, personalized name for the program
   - Duration: Total program length in weeks (typically 8-16 weeks)
   - Explanation: High-level overview of the training plan, goals, and approach

2. **Weekly Level** (Middle Level):
   - Week number and focus area for each week
   - Daily workouts for each week (7 days)

3. **Daily Level** (Bottom Level):
   - Day name and workout type
   - Comprehensive description including duration, intensity, muscle groups, heart rate zones, distance, and equipment
   - Optional tags for categorization (e.g., 'strength', 'cardio', 'recovery', 'high-intensity')

For each daily workout, include all relevant details in the description:
- Duration and intensity level
- Target muscle groups (for strength training)
- Heart rate zones (for cardio)
- Distance (for running/cycling)
- Required equipment
- Any special instructions or focus areas

Use tags to categorize workouts (e.g., 'strength', 'cardio', 'recovery', 'high-intensity', 'upper-body', 'lower-body', 'endurance', 'power', 'mobility').

Make the outline specific to the user's goals, experience level, and chosen sports. Focus on creating excitement and clarity about what the program will deliver.
        """
    
    def _get_outline_generation_requirements(self) -> str:
        """Get standardized requirements for training plan outline generation."""
        return """
**Requirements:**
- Use the athlete's measurement system consistently throughout
- Tailor the program to their experience level and chosen sport
- Make the title engaging and personalized to their sport and goals
- Ensure the progression strategy is appropriate for their sport and goals
- Include a variety of training methods appropriate for their discipline (strength, endurance, technique, recovery, etc.)
- Keep weekly structure realistic and sustainable for their sport
- Address any specific goals, events, or limitations mentioned in their responses
- Consider sport-specific training principles (e.g., periodization for endurance sports, skill development for technical sports)
- Include appropriate recovery and adaptation strategies for their chosen discipline
        """
    
    def _create_outline_prompt(self, personal_info: PersonalInfo, formatted_initial_responses: str, formatted_follow_up_responses: str, initial_questions: List[AIQuestion] = None, follow_up_questions: List[AIQuestion] = None) -> str:
        """Create a comprehensive prompt for generating training plan outlines."""
        
        # Combine formatted responses for context
        combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
        
        prompt = f"""
{self._get_outline_generation_intro()}

{self._format_client_information(personal_info)}

**User Responses:**
{formatted_responses}

{self._get_outline_generation_instructions()}

{self._get_outline_generation_requirements()}
        """
        
        return prompt.strip()