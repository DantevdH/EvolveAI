"""
InterviewAgent handles onboarding questions, chat intent classification, and
lightweight training-request responses. Logic is extracted from the legacy
TrainingCoach to align with the refactored architecture.
"""

import time
from typing import Dict, Any, List, Optional

from logging_config import get_logger
from settings import settings

from app.agents.base_agent import BaseAgent
from app.services.rag_service import RAGService
from app.schemas.question_schemas import (
    AIQuestionResponse,
    PersonalInfo,
    QuestionUnion,
    QuestionOption,
    FeedbackIntentClassification,
    MultipleChoiceQuestion,
    DropdownQuestion,
)
from app.helpers.ai.prompt_generator import PromptGenerator
from app.helpers.utils.mock_data import create_mock_initial_questions
from app.services.database_service import db_service
from app.helpers.ai.llm_client import LLMClient


class InterviewAgent(BaseAgent):
    """Specialized agent for onboarding questions and chat intent handling."""

    def __init__(self):
        self.logger = get_logger(__name__)
        super().__init__(
            agent_name="Interview Agent",
            agent_description="Handles onboarding questions, chat intents, and lightweight training Q&A",
            topic="training",
        )
        self.rag_service = RAGService(self)
        # Override llm to keep parity with legacy coach initialization
        self.llm = LLMClient()

    # ------------------------------------------------------------------ #
    # Capabilities & utilities
    # ------------------------------------------------------------------ #
    def _get_capabilities(self) -> List[str]:
        return [
            "training_question_generation",
            "intent_classification",
            "training_knowledge_retrieval",
            "chat_response",
        ]

    def _build_conversation_context(self, conversation_history: List[Dict[str, str]]) -> str:
        """Build conversation context from history."""
        if not conversation_history:
            return "No previous conversation."

        context_lines = []
        for msg in conversation_history[-5:]:  # Last 5 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            context_lines.append(f"{role.upper()}: {content}")

        return "\n".join(context_lines)

    def _filter_valid_questions(self, questions: List[QuestionUnion]) -> List[QuestionUnion]:
        """
        Filter questions to only include valid ones. Invalid questions are logged but skipped.
        """
        valid_questions = []

        def sanitize_string(s: Optional[str]) -> Optional[str]:
            if not s or not isinstance(s, str):
                return s
            cleaned = s.replace("},{", "").replace("{", "").replace("}", "").strip()
            return cleaned if cleaned else s

        for question in questions:
            try:
                if hasattr(question, "unit") and question.unit:
                    question.unit = sanitize_string(question.unit)
                if hasattr(question, "placeholder") and question.placeholder:
                    question.placeholder = sanitize_string(question.placeholder)
                if hasattr(question, "min_description") and question.min_description:
                    question.min_description = sanitize_string(question.min_description)
                if hasattr(question, "max_description") and question.max_description:
                    question.max_description = sanitize_string(question.max_description)

                is_valid = True

                if question.response_type == "slider":
                    if question.min_value >= question.max_value:
                        self.logger.warning(
                            f"Invalid SLIDER question '{question.id}': min_value ({question.min_value}) "
                            f"must be less than max_value ({question.max_value})"
                        )
                        is_valid = False
                    if question.step <= 0:
                        self.logger.warning(
                            f"Invalid SLIDER question '{question.id}': step must be positive, got {question.step}"
                        )
                        is_valid = False

                elif question.response_type in ["multiple_choice", "dropdown"]:
                    if len(question.options) < 2:
                        self.logger.warning(
                            f"Invalid {question.response_type} question '{question.id}': "
                            f"needs at least 2 options, got {len(question.options)}"
                        )
                        is_valid = False

                elif question.response_type == "rating":
                    if question.min_value >= question.max_value:
                        self.logger.warning(
                            f"Invalid RATING question '{question.id}': min_value ({question.min_value}) "
                            f"must be less than max_value ({question.max_value})"
                        )
                        is_valid = False

                if is_valid:
                    valid_questions.append(question)
                else:
                    self.logger.warning(
                        f"Excluding invalid question '{question.id}': '{question.text}'. Skipping to prevent errors."
                    )

            except Exception as e:
                self.logger.error(
                    f"Exception while validating question '{getattr(question, 'id', 'unknown')}': {str(e)}."
                    " Skipping to prevent crash."
                )
                continue

        return valid_questions

    def _postprocess_questions(self, questions: List[QuestionUnion]) -> List[QuestionUnion]:
        """Convert multiple_choice with >4 options to dropdown."""
        postprocessed = []
        converted_count = 0

        for question in questions:
            if isinstance(question, MultipleChoiceQuestion) and question.options and len(question.options) > 4:
                dropdown_question = DropdownQuestion(
                    id=question.id,
                    text=question.text,
                    help_text=question.help_text,
                    options=question.options,
                    multiselect=question.multiselect,
                )
                postprocessed.append(dropdown_question)
                converted_count += 1
                self.logger.info(
                    f"Converted question '{question.id}' from multiple_choice to dropdown "
                    f"(had {len(question.options)} options)"
                )
            else:
                postprocessed.append(question)

        if converted_count > 0:
            self.logger.info(f"Post-processed {converted_count} question(s) to dropdown")

        return postprocessed

    # ------------------------------------------------------------------ #
    # Public methods
    # ------------------------------------------------------------------ #
    def process_training_request(self, user_request: str, context: Dict[str, Any] = None) -> str:
        """Lightweight training request using RAG for quick answers."""
        try:
            relevant_docs = self.rag_service.search_knowledge_base(
                query=user_request, max_results=5, metadata_filters=None
            )

            if relevant_docs:
                response = self.rag_service.generate_response(user_request, relevant_docs, context=context)
                return self._format_training_response(response, relevant_docs)
            return self._generate_fallback_response(user_request)
        except Exception as e:
            self.logger.error(
                f"Failed to process training request: {str(e)}. "
                f"Check RAG service availability and knowledge base connectivity."
            )
            return self._generate_error_response(user_request)

    def process_request(self, user_request: str) -> str:
        return self.process_training_request(user_request)

    async def generate_initial_questions(
        self,
        personal_info: PersonalInfo,
        user_profile_id: Optional[int] = None,
        question_history: Optional[str] = None,
    ) -> AIQuestionResponse:
        """Generate a single onboarding question with validation and post-processing."""
        try:
            if settings.DEBUG:
                return create_mock_initial_questions()

            self.logger.info("Generating question (single LLM call)...")

            prompt = PromptGenerator.generate_initial_question_prompt(
                personal_info=personal_info,
                question_history=question_history,
            )

            ai_start = time.time()
            response, completion = self.llm.parse_structured(
                prompt, AIQuestionResponse, model_type="complex"
            )
            duration = time.time() - ai_start

            await db_service.log_latency_event("initial_question_generation", duration, completion)

            if response.information_complete or len(response.questions) == 0:
                self.logger.info("Information collection complete — no more questions needed")
                return AIQuestionResponse(
                    questions=[],
                    total_questions=0,
                    estimated_time_minutes=0,
                    ai_message=response.ai_message
                    or "All information collected! Ready to generate your training plan. 🎯",
                    information_complete=True,
                )

            valid_questions = self._filter_valid_questions(response.questions)
            if not valid_questions:
                raise ValueError("No valid questions after filtering")

            valid_questions = valid_questions[:1]
            processed_questions = self._postprocess_questions(valid_questions)

            self.logger.info(f"Generated question in {duration:.2f}s: {processed_questions[0].text[:50]}...")

            return AIQuestionResponse(
                questions=processed_questions,
                total_questions=1,
                estimated_time_minutes=2,
                ai_message=response.ai_message,
                information_complete=False,
            )

        except Exception as e:
            self.logger.error(f"Failed to generate question: {str(e)}")
            return AIQuestionResponse(
                questions=[
                    MultipleChoiceQuestion(
                        id="fallback_1",
                        text="What is your primary training goal?",
                        help_text="Select your main training focus",
                        options=[
                            QuestionOption(id="goal_1", text="Build Muscle", value="build_muscle"),
                            QuestionOption(id="goal_2", text="Lose Weight", value="lose_weight"),
                            QuestionOption(id="goal_3", text="Improve Strength", value="improve_strength"),
                            QuestionOption(id="goal_4", text="General Fitness", value="general_fitness"),
                        ],
                        multiselect=False,
                    )
                ],
                total_questions=1,
                estimated_time_minutes=2,
                ai_message="Let's start with understanding your goals! 💪",
                information_complete=False,
            )

    async def classify_feedback_intent_lightweight(
        self,
        feedback_message: str,
        conversation_history: List[Dict[str, str]],
        training_plan: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Lightweight intent classification (no operations parsing) that can also
        answer plan questions.
        """
        try:
            context = self._build_conversation_context(conversation_history)
            prompt = PromptGenerator.generate_lightweight_intent_classification_prompt(
                feedback_message=feedback_message,
                conversation_context=context,
                training_plan=training_plan,
            )

            ai_start = time.time()
            parsed_obj, completion = self.llm.parse_structured(
                prompt, FeedbackIntentClassification, model_type="lightweight"
            )
            duration = time.time() - ai_start
            result = parsed_obj.model_dump() if hasattr(parsed_obj, "model_dump") else parsed_obj
            result["_classify_duration"] = duration

            await db_service.log_latency_event("feedback_classify", duration, completion)

            self.logger.info(
                f"Intent classified: {result['intent']} "
                f"(confidence: {result['confidence']:.2f}, {duration:.2f}s)"
            )

            return result

        except Exception as e:
            self.logger.error(
                f"Failed to classify feedback intent: {str(e)}. "
                f"Using safe fallback response."
            )
            return {
                "intent": "unclear",
                "confidence": 0.5,
                "action": "respond_only",
                "reasoning": "Error in classification, asking for clarification",
                "needs_plan_update": False,
                "navigate_to_main_app": False,
                "ai_message": "I'm having trouble understanding your feedback. Could you please be more specific?",
            }

    async def generate_rag_answer(
        self,
        user_query: str,
        training_plan: Dict[str, Any] = None,
        conversation_history: List[Dict[str, str]] = None,
        current_week: Dict[str, Any] = None,
        playbook: Any = None,
        personal_info: PersonalInfo = None,
    ) -> str:
        """
        Generate an answer to a user question using RAG (Retrieval-Augmented Generation).
        
        This method retrieves relevant context from the knowledge base and generates
        a comprehensive answer. Used for question intents after fast classification.
        Always includes current week and playbook context when available.
        
        Args:
            user_query: The user's question
            training_plan: Optional training plan context
            conversation_history: Optional conversation history for context
            current_week: Current week data from training plan (required for chat interface)
            playbook: User's playbook with lessons and context (required for chat interface)
            personal_info: User's personal information (required for chat interface)
            
        Returns:
            Generated answer string with RAG context
        """
        try:
            self.logger.info(f"🔍 Generating RAG answer for question: {user_query[:50]}...")
            
            # Retrieve relevant documents from knowledge base
            relevant_docs = self.rag_service.search_knowledge_base(
                query=user_query,
                max_results=5,
                metadata_filters=None
            )
            
            if not relevant_docs:
                self.logger.warning("No relevant documents found in knowledge base")
                # Fallback response without RAG
                return self._generate_fallback_response(user_query)
            
            self.logger.info(f"📚 Retrieved {len(relevant_docs)} relevant documents")
            
            # Build additional context (always include current_week and playbook for chat interface)
            context = {}
            if current_week:
                context["current_week"] = current_week
            if playbook:
                context["playbook"] = playbook
            if personal_info:
                context["personal_info"] = personal_info
            if training_plan:
                context["training_plan"] = training_plan
            if conversation_history:
                context["conversation_history"] = conversation_history
            
            # Generate response using RAG with best-practice prompt
            response = self.rag_service.generate_response(
                user_query=user_query,
                context_documents=relevant_docs,
                context=context
            )
            
            # Format response (keep it concise, max 40 words as per constraints)
            # The RAG service already generates a comprehensive response, but we'll ensure it's concise
            formatted_response = self._format_concise_response(response, user_query)
            
            self.logger.info("✅ RAG answer generated successfully")
            return formatted_response
            
        except Exception as e:
            self.logger.error(f"Error generating RAG answer: {str(e)}", exc_info=True)
            return self._generate_error_response(user_query)
    
    def _format_concise_response(self, response: str, user_query: str) -> str:
        """
        Format RAG response to be concise (max ~40 words) while maintaining helpfulness.
        """
        # Split into sentences
        sentences = response.split('. ')
        
        # Take first 2-3 sentences (usually covers the answer)
        if len(sentences) > 3:
            concise = '. '.join(sentences[:3])
            if not concise.endswith('.'):
                concise += '.'
        else:
            concise = response
        
        # Ensure it ends with engagement
        if not any(phrase in concise.lower() for phrase in ['?', 'ready', 'adjust', 'help', 'anything']):
            concise += " Anything else you'd like to know?"
        
        return concise

    # ------------------------------------------------------------------ #
    # Formatting helpers
    # ------------------------------------------------------------------ #
    def _format_training_response(self, response: str, relevant_docs: List[Dict[str, Any]]) -> str:
        formatted_response = f"🏋️‍♂️ **Interview Agent Response**\n\n{response}\n\n"

        if relevant_docs:
            formatted_response += "📚 **Sources:**\n"
            for i, doc in enumerate(relevant_docs[:3], 1):
                title = doc.get("document_title", "Unknown")
                formatted_response += f"{i}. {title}\n"

        return formatted_response

    def _generate_fallback_response(self, user_request: str) -> str:
        return f"""
            I understand you're asking about: "{user_request}"

            While I don't have specific information about this in my knowledge base yet, I can provide general training guidance based on best practices.

            For more personalized advice, please try:
            - Being more specific about your goals
            - Mentioning your experience level
            - Specifying available equipment

            Would you like me to create a general training plan or recommend some basic exercises?
        """

    def _generate_error_response(self, user_request: str) -> str:
        return f"""
            I apologize, but I encountered an error while processing your request: "{user_request}"

            This might be due to:
            - Temporary system issues
            - Knowledge base access problems
            - Complex request format

            Please try rephrasing your request or contact support if the issue persists.
        """
