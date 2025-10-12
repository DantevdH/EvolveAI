"""
Enhanced training Coach Agent with AI Question Generation and Training Plan Creation
"""

import os
import openai
from typing import List, Dict, Any, Optional

from core.base.base_agent import BaseAgent
from logging_config import get_logger
from core.base.rag_tool import RAGTool

# Import schemas and services
from core.training.helpers.training_schemas import TrainingPlan, DailyTraining, StrengthExercise, EnduranceSession
from core.training.helpers.exercise_selector import ExerciseSelector
from core.training.helpers.exercise_validator import ExerciseValidator
from core.training.helpers.database_service import db_service
from core.training.helpers.models import GenerateTrainingRequest, GenerateTrainingResponse
from core.training.helpers.ai_question_schemas import (
    AIQuestionResponse,
    AIQuestionResponseWithFormatted,
    PersonalInfo,
    QuestionType,
    AIQuestion,
    QuestionOption,
    TrainingPlanOutline,
    ExerciseRetrievalDecision
)
from core.training.helpers.response_formatter import ResponseFormatter
from core.training.helpers.mock_data import create_mock_training_plan_outline
from core.training.helpers.prompt_generator import PromptGenerator

class TrainingCoach(BaseAgent):
    """
    Enhanced training Coach that provides AI-generated questions and training plans.
    """
    
    def __init__(self):
        # Initialize logger
        self.logger = get_logger(__name__)
        # Initialize the base agent with training-specific configuration
        super().__init__(
            agent_name="training Coach",
            agent_description="Expert in strength training, muscle building, weight loss routines, and training planning",
            topic="training"  # This automatically filters documents by topic
        )
        
        # Initialize RAG tool for training-specific knowledge retrieval
        self.rag_tool = RAGTool(self)
        
        # Initialize exercise services
        self.exercise_selector = ExerciseSelector()
        self.exercise_validator = ExerciseValidator()
    
    def _get_capabilities(self) -> List[str]:
        """Get the agent's capabilities."""
        return [
            "training_plan_generation",
            "exercise_recommendation", 
            "training_question_generation",
            "training_plan_creation",
            "exercise_validation",
            "training_knowledge_retrieval"
        ]
    
    def process_request(self, user_request: str) -> str:
        """Process a user request - required by BaseAgent."""
        return self.process_training_request(user_request)
    
    def process_training_request(self, user_request: str, context: Dict[str, Any] = None) -> str:
        """
        Process training-related requests using RAG-enhanced knowledge retrieval.
        
        Args:
            user_request: The user's training-related question or request
            context: Additional context for the request
            
        Returns:
            Formatted training response with relevant information
        """
        try:
            # Search for relevant training documents
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
                return self._format_training_response(response, relevant_docs)
            else:
                # Fallback to general training guidance
                return self._generate_fallback_response(user_request)
                
        except Exception as e:
            self.logger.error(f"Error processing training request: {e}")
            return self._generate_error_response(user_request)
    
    def generate_initial_questions(self, personal_info: PersonalInfo) -> AIQuestionResponse:
        """Generate initial questions for onboarding based on personal information."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.training.helpers.mock_data import create_mock_initial_questions
                initial_questions = create_mock_initial_questions()
                return initial_questions
            
            # Create a comprehensive prompt for initial questions
            prompt = PromptGenerator.generate_initial_questions_prompt(personal_info)
            
            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            questions_response = completion.choices[0].message.parsed
            
            return questions_response
            
        except Exception as e:
            self.logger.error(f"Error generating initial questions: {e}")
            # Return a fallback response
            return AIQuestionResponse(
                questions=[
                    AIQuestion(
                        id="fallback_1",
                        text="What is your primary training goal?",
                        response_type=QuestionType.MULTIPLE_CHOICE,
                        options=[
                            QuestionOption(id="goal_1", text="Build Muscle", value="build_muscle"),
                            QuestionOption(id="goal_2", text="Lose Weight", value="lose_weight"),
                            QuestionOption(id="goal_3", text="Improve Strength", value="improve_strength"),
                            QuestionOption(id="goal_4", text="General training", value="general_training")
                        ]
                    )
                ],
                total_questions=1,
                estimated_time_minutes=2,
                ai_message="I'm here to help you create the perfect training plan! Let's start with understanding your goals. 💪"
            )
    
    def generate_follow_up_questions(self, personal_info: PersonalInfo, formatted_responses: str, initial_questions: List[AIQuestion] = None) -> AIQuestionResponseWithFormatted:
        """Generate follow-up questions based on initial responses."""
        try:
            # Check if debug mode is enabled
            if os.getenv("DEBUG", "false").lower() == "true":
                from core.training.helpers.mock_data import create_mock_follow_up_questions
                follow_up_questions = create_mock_follow_up_questions()
                self.logger.debug(f"DEBUG MODE: User responses for follow-up questions: {formatted_responses}")
                return AIQuestionResponseWithFormatted(
                    questions=follow_up_questions.questions,
                    total_questions=follow_up_questions.total_questions,
                    estimated_time_minutes=follow_up_questions.estimated_time_minutes,
                    formatted_responses=formatted_responses,
                    ai_message=follow_up_questions.ai_message
                )
            
            # Create a comprehensive prompt for follow-up questions
            prompt = PromptGenerator.generate_followup_questions_prompt(personal_info, formatted_responses)
            
            # Generate questions using OpenAI
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": prompt}],
                response_format=AIQuestionResponse,
                temperature=0.7
            )
            
            # Get the parsed response
            question_response = completion.choices[0].message.parsed
            
            # Return with formatted responses and AI message
            return AIQuestionResponseWithFormatted(
                questions=question_response.questions,
                total_questions=question_response.total_questions,
                estimated_time_minutes=question_response.estimated_time_minutes,
                formatted_responses=formatted_responses,  # Already formatted by API
                ai_message=question_response.ai_message
            )
            
        except Exception as e:
            self.logger.error(f"Error generating follow-up questions: {e}")
            # Return a fallback response
            return AIQuestionResponseWithFormatted(
                questions=[
                    AIQuestion(
                        id="followup_1",
                        text="How many days per week can you commit to training?",
                        response_type=QuestionType.SLIDER,
                        min_value=1,
                        max_value=7,
                        step=1
                    )
                ],
                total_questions=1,
                estimated_time_minutes=1,
                formatted_responses=formatted_responses,  # Already formatted by API
                ai_message="I need to ask a few more questions to create your perfect training plan. 💪"
            )
    
    def generate_training_plan_outline(self, personal_info: PersonalInfo, formatted_initial_responses: str, formatted_follow_up_responses: str, initial_questions: List[AIQuestion] = None, follow_up_questions: List[AIQuestion] = None) -> Dict[str, Any]:
        """Generate a training plan outline before creating the final detailed plan."""
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                self.logger.debug("DEBUG MODE: Using mock training plan outline")
                outline = create_mock_training_plan_outline()
                
                # Extract ai_message from outline to prevent duplication
                outline_dict = outline.model_dump()
                ai_message = outline_dict.pop('ai_message', None)
                
                return {
                    'success': True,
                    'outline': outline_dict,
                    'ai_message': ai_message,
                    'metadata': {
                        'generation_method': 'Mock Data (Debug Mode)',
                        'user_goals': personal_info.goal_description
                    }
                }
            
            # Create a comprehensive prompt for outline generation
            prompt = PromptGenerator.generate_training_plan_outline_prompt(personal_info, formatted_initial_responses, formatted_follow_up_responses)
            
            # Generate the outline using OpenAI with structured output
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {"role": "system", "content": "You are an expert training coach creating training plan outlines. Provide structured, detailed outlines that give users a clear preview of their upcoming training plan."},
                    {"role": "user", "content": prompt}
                ],
                response_format=TrainingPlanOutline,
                temperature=0.7
            )
            
            # Parse the structured response
            outline = completion.choices[0].message.parsed
            
            # Extract ai_message from outline to prevent duplication
            outline_dict = outline.model_dump()
            ai_message = outline_dict.pop('ai_message', None)
            
            return {
                'success': True,
                'outline': outline_dict,
                'ai_message': ai_message,
                'metadata': {
                    'generation_method': 'AI Generated',
                    'user_goals': personal_info.goal_description,
                    'experience_level': personal_info.experience_level
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating training plan outline: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to generate training plan outline: {str(e)}"
            }
    
    def generate_training_plan(self, personal_info: PersonalInfo, formatted_initial_responses: str, formatted_follow_up_responses: str, plan_outline: dict = None, initial_questions: List[AIQuestion] = None, follow_up_questions: List[AIQuestion] = None) -> Dict[str, Any]:
        """Generate a comprehensive training plan with AI-decided exercise retrieval."""
        try:
            # Check if debug mode is enabled - skip validation for mock data
            if os.getenv("DEBUG", "false").lower() == "true":
                self.logger.debug("DEBUG MODE: Using mock training plan")
                from core.training.helpers.mock_data import create_mock_training_plan
                training_plan = create_mock_training_plan()
                training_dict = training_plan.model_dump()
                self.logger.debug(f"DEBUG MODE: Generated mock training plan with {len(training_dict.get('weekly_schedules', []))} weeks")
                return {
                    'success': True,
                    'training_plan': training_dict,
                    'metadata': {
                        'exercises_candidates': 0,
                        'validation_messages': ['Debug mode: Using mock data'],
                        'generation_method': 'Mock Data (Debug Mode)'
                    }
                }
            
            # Step 1: Let AI decide if we need exercises
            self.logger.info("AI analyzing if exercises are needed...")
            
            combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"
            decision_prompt = PromptGenerator.generate_exercise_decision_prompt(
                personal_info, 
                combined_responses,
                plan_outline
            )
            
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[{"role": "system", "content": decision_prompt}],
                response_format=ExerciseRetrievalDecision,
                temperature=0.3  # Lower temp for consistent decisions
            )
            
            decision = completion.choices[0].message.parsed
            
            self.logger.info(f"AI Decision: {'Retrieve exercises' if decision.retrieve_exercises else 'No exercises needed'}")
            self.logger.info(f"Reasoning: {decision.reasoning}")
            
            # Step 2: Retrieve exercises if needed
            exercise_info = ""
            exercises_retrieved = 0
            
            if decision.retrieve_exercises:
                self.logger.info("Retrieving exercises with AI-decided parameters...")
                self.logger.info(f"   - Difficulty: {decision.difficulty or personal_info.experience_level}")
                
                # Extract equipment strings from enum values for SQL search
                equipment_list = [eq.value for eq in decision.equipment] if decision.equipment else None
                self.logger.info(f"   - Equipment: {equipment_list}")
                
                # Use AI-decided parameters or fallback to defaults
                difficulty = decision.difficulty or personal_info.experience_level or "beginner"
                
                # Get exercises using existing exercise_selector
                all_exercises = self.exercise_selector.get_exercise_candidates(
                    difficulty=difficulty,
                    equipment=equipment_list
                )
                
                exercises_retrieved = len(all_exercises)
                self.logger.info(f"Retrieved {exercises_retrieved} exercise candidates")
                
                # Check if we have exercises available
                if not all_exercises:
                    return {
                        'success': False,
                        'error': 'No exercises available for the specified difficulty level and equipment. Please try different parameters.'
                    }
                
                # Get formatted exercises for AI prompt
                exercise_info = self.exercise_selector.get_formatted_exercises_for_ai(
                    difficulty=difficulty,
                    equipment=equipment_list
                )
                
                # Check if formatting was successful
                if exercise_info == "No exercises available":
                    return {
                        'success': False,
                        'error': 'Failed to format exercises for AI. Please try again.'
                    }
            else:
                self.logger.info("Skipping exercise retrieval (not needed)")
                exercise_info = f"No exercises needed - {decision.alternative_approach or 'focus on sport-specific training sessions'}"
            
            # Step 3: Generate plan with or without exercises
            prompt = PromptGenerator.generate_training_plan_prompt(
                personal_info,
                formatted_initial_responses,
                formatted_follow_up_responses,
                plan_outline,
                exercise_info
            )
            
            # Step 4: Get the training plan
            self.logger.info("Generating training plan with AI...")
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                messages=[{"role": "system", "content": prompt}],
                response_format=TrainingPlan,
                temperature=0.7,
                max_completion_tokens=15_500  # Leave buffer below 16,384 max to ensure completion
            )
            
            training_plan = completion.choices[0].message.parsed
            training_dict = training_plan.model_dump()
            
            # Step 5: Validate the training plan with exercise_validator (only if exercises were used)
            validation_messages = []
            if decision.retrieve_exercises and exercises_retrieved > 0:
                self.logger.info("Validating training plan...")
                validated_training, validation_messages = self.exercise_validator.validate_training_plan(training_dict)
                
                self.logger.info(f"Validation complete: {len(validation_messages)} messages")
                for message in validation_messages:
                    self.logger.debug(f"   {message}")
            else:
                self.logger.info("Skipping exercise validation (no exercises used)")
                validated_training = training_dict
            
            return {
                'success': True,
                'training_plan': validated_training,
                'metadata': {
                    'exercises_candidates': exercises_retrieved,
                    'validation_messages': validation_messages,
                    'generation_method': 'AI + Smart Exercise Selection' if decision.retrieve_exercises else 'AI + Sport-Specific Training',
                    'ai_decision': {
                        'retrieve_exercises': decision.retrieve_exercises,
                        'reasoning': decision.reasoning,
                        'alternative_approach': decision.alternative_approach
                    }
                }
            }
                
        except Exception as e:
            self.logger.error(f"Error generating training plan: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    
    def _format_training_response(self, response: str, relevant_docs: List[Dict[str, Any]]) -> str:
        """Format the training response with additional context."""
        formatted_response = f"🏋️‍♂️ **training Coach Response**\n\n{response}\n\n"
        
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

While I don't have specific information about this in my knowledge base yet, I can provide general training guidance based on best practices.

For more personalized advice, please try:
- Being more specific about your goals
- Mentioning your experience level
- Specifying available equipment

Would you like me to create a general training plan or recommend some basic exercises?"""
    
    def _generate_error_response(self, user_request: str) -> str:
        """Generate an error response when processing fails."""
        return f"""I apologize, but I encountered an error while processing your request: "{user_request}"

This might be due to:
- Temporary system issues
- Knowledge base access problems
- Complex request format

Please try rephrasing your request or contact support if the issue persists."""
    

    