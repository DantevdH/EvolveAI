"""
Test the Fitness Coach agent functionality.
"""

import pytest
from unittest.mock import patch, MagicMock

class TestFitnessCoach:
    """Test FitnessCoach agent functionality."""

    def test_fitness_coach_import(self):
        """Test that FitnessCoach can be imported."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        assert FitnessCoach is not None, "FitnessCoach should be importable"

    def test_fitness_coach_initialization(self):
        """Test that FitnessCoach can be initialized."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        # Mock the BaseAgent dependencies
        with patch('agents.specialists.fitness_coach.BaseAgent.__init__') as mock_base_init:
            with patch('agents.specialists.fitness_coach.RAGTool') as mock_rag_tool:
                with patch('agents.specialists.fitness_coach.WorkoutPromptGenerator') as mock_prompt_gen:
                    mock_rag_instance = MagicMock()
                    mock_rag_tool.return_value = mock_rag_instance
                    
                    mock_prompt_instance = MagicMock()
                    mock_prompt_gen.return_value = mock_prompt_instance
                    
                    # This should not raise an exception
                    coach = FitnessCoach()
                    
                    # Verify BaseAgent was called with correct parameters
                    mock_base_init.assert_called_once_with(
                        "Fitness Coach",
                        "Expert in strength training, muscle building, weight loss routines, and workout planning",
                        "fitness"
                    )
                    
                    # Verify RAG tool was initialized
                    mock_rag_tool.assert_called_once()
                    
                    # Verify prompt generator was initialized
                    mock_prompt_gen.assert_called_once()

    def test_fitness_coach_capabilities(self):
        """Test that FitnessCoach has the expected capabilities."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    coach = FitnessCoach()
                    capabilities = coach._get_capabilities()
                    
                    expected_capabilities = [
                        "workout_plan_generation",
                        "exercise_selection", 
                        "progression_tracking",
                        "strength_training",
                        "muscle_building",
                        "weight_loss_routines",
                        "form_guidance",
                        "equipment_recommendations"
                    ]
                    
                    for capability in expected_capabilities:
                        assert capability in capabilities, f"Missing capability: {capability}"

    def test_fitness_coach_topic_filtering(self):
        """Test that FitnessCoach automatically filters for fitness documents."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    coach = FitnessCoach()
                    
                    # The topic should be "fitness" to automatically filter documents
                    assert coach.topic == "fitness", "Topic should be 'fitness' for automatic filtering"

    def test_workout_plan_generation(self):
        """Test workout plan generation functionality."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    with patch.object(FitnessCoach, 'search_knowledge_base') as mock_search:
                        with patch('core.agents.specialists.fitness_coach.os.getenv') as mock_getenv:
                            with patch('core.agents.specialists.fitness_coach.json.loads') as mock_json:
                                # Mock search to return some documents
                                mock_search.return_value = [
                                    {
                                        'chunk_text': 'Sample workout content',
                                        'document_title': 'Fitness Guide'
                                    }
                                ]
                                
                                # Mock environment variables
                                mock_getenv.side_effect = lambda x, default=None: {
                                    'OPENAI_MODEL': 'gpt-4',
                                    'OPENAI_TEMPERATURE': '0.7'
                                }.get(x, default)
                                
                                # Mock JSON parsing
                                mock_workout_data = {
                                    'name': 'Test Workout',
                                    'description': 'Test Description',
                                    'workout_days': []
                                }
                                mock_json.return_value = mock_workout_data
                                
                                # Mock OpenAI client
                                mock_openai_client = MagicMock()
                                mock_completion = MagicMock()
                                mock_choice = MagicMock()
                                mock_message = MagicMock()
                                mock_message.content = '{"name": "Test"}'
                                mock_choice.message = mock_message
                                mock_completion.choices = [mock_choice]
                                mock_openai_client.chat.completions.parse.return_value = mock_completion
                                
                                # Mock UserProfileSchema
                                mock_user_profile = MagicMock()
                                mock_user_profile.primary_goal = "strength"
                                mock_user_profile.experience_level = "beginner"
                                mock_user_profile.days_per_week = 3
                                mock_user_profile.equipment = ["dumbbells"]
                                
                                # Mock prompt generator
                                mock_prompt_gen = MagicMock()
                                mock_prompt_gen.create_initial_plan_prompt.return_value = "Test prompt"
                                
                                coach = FitnessCoach()
                                coach.prompt_generator = mock_prompt_gen
                                
                                # This should work now
                                workout_plan = coach.generate_workout_plan(mock_user_profile, mock_openai_client)
                                
                                # Verify the workout plan was generated
                                assert workout_plan is not None

    def test_exercise_recommendations(self):
        """Test exercise recommendation functionality."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    with patch.object(FitnessCoach, 'search_knowledge_base') as mock_search:
                        # Mock search to return some documents
                        mock_search.return_value = [
                            {
                                'chunk_text': 'Sample exercise content for chest',
                                'document_title': 'Exercise Guide'
                            }
                        ]
                        
                        coach = FitnessCoach()
                        exercises = coach.recommend_exercises(
                            muscle_group="chest",
                            difficulty="beginner"
                        )
                        
                        # Verify exercises were returned
                        assert len(exercises) > 0
                        assert 'name' in exercises[0]
                        assert 'description' in exercises[0]

    def test_fallback_response(self):
        """Test fallback response when no documents are found."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    with patch.object(FitnessCoach, 'search_knowledge_base') as mock_search:
                        # Mock search to return no documents
                        mock_search.return_value = []
                        
                        coach = FitnessCoach()
                        response = coach.process_request("advanced powerlifting routine")
                        
                        # Should generate a fallback response
                        assert "advanced powerlifting routine" in response
                        assert "general fitness guidance" in response.lower()

    def test_error_handling(self):
        """Test error handling in request processing."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        with patch('core.agents.specialists.fitness_coach.BaseAgent.__init__'):
            with patch('core.agents.specialists.fitness_coach.RAGTool'):
                with patch('core.agents.specialists.fitness_coach.WorkoutPromptGenerator'):
                    with patch.object(FitnessCoach, 'search_knowledge_base') as mock_search:
                        # Mock search to raise an exception
                        mock_search.side_effect = Exception("Database error")
                        
                        coach = FitnessCoach()
                        response = coach.process_request("test request")
                        
                        # Should generate an error response
                        assert "encountered an error" in response.lower()
                        assert "test request" in response

class TestFitnessCoachIntegration:
    """Test FitnessCoach integration with other components."""

    @patch('core.agents.specialists.fitness_coach.create_client')
    @patch('core.agents.specialists.fitness_coach.openai.OpenAI')
    def test_fitness_coach_with_real_clients(self, mock_openai, mock_create_client):
        """Test FitnessCoach with mocked but realistic clients."""
        from core.agents.specialists.fitness_coach import FitnessCoach
        
        # Mock the clients
        mock_supabase = MagicMock()
        mock_create_client.return_value = mock_supabase
        
        mock_openai_instance = MagicMock()
        mock_openai.return_value = mock_openai_instance
        
        # Create the coach
        coach = FitnessCoach()
        
        # Verify it has the expected attributes
        assert hasattr(coach, 'supabase')
        assert hasattr(coach, 'openai_client')
        assert hasattr(coach, 'rag_tool')
        assert hasattr(coach, 'prompt_generator')
        assert coach.topic == "fitness"
