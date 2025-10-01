"""
Unit tests for RAGTool.

Tests the advanced RAG capabilities including metadata extraction, hybrid search, 
re-ranking, and context augmentation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.base.base_agent import BaseAgent
from core.base.rag_tool import RAGTool


class TestRAGTool:
    """Test the RAGTool class."""
    
    @pytest.fixture
    def mock_base_agent(self):
        """Create a mocked BaseAgent."""
        mock_agent = Mock(spec=BaseAgent)
        mock_agent.search_knowledge_base = Mock()
        return mock_agent
    
    @pytest.fixture
    def rag_tool(self, mock_base_agent):
        """Create RAGTool with mocked dependencies."""
        return RAGTool(mock_base_agent)
    
    @pytest.fixture
    def sample_search_results(self):
        """Create sample search results for testing."""
        return [
            {
                'document_title': 'training Guide 1',
                'chunk_text': 'Beginner training plan for chest exercises',
                'relevance_score': 0.8,
                'document_metadata': {
                    'difficulty_level': 'beginner',
                    'body_part': 'chest'
                }
            },
            {
                'document_title': 'training Guide 2',
                'chunk_text': 'Advanced strength training for legs',
                'relevance_score': 0.9,
                'document_metadata': {
                    'difficulty_level': 'advanced',
                    'body_part': 'legs'
                }
            },
            {
                'document_title': 'training Guide 3',
                'chunk_text': 'Intermediate back training routine',
                'relevance_score': 0.7,
                'document_metadata': {
                    'difficulty_level': 'intermediate',
                    'body_part': 'back'
                }
            }
        ]
    
    def test_rag_tool_initialization(self, mock_base_agent):
        """Test RAGTool initialization."""
        rag_tool = RAGTool(mock_base_agent)
        
        assert rag_tool.base_agent == mock_base_agent
    
    def test_extract_metadata_filters_difficulty_beginner(self, rag_tool):
        """Test metadata extraction for beginner difficulty."""
        query = "I'm a beginner and want to start working out"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters['difficulty_level'] == 'beginner'
        assert 'body_part' not in filters
    
    def test_extract_metadata_filters_difficulty_intermediate(self, rag_tool):
        """Test metadata extraction for intermediate difficulty."""
        query = "I have some experience and want to progress"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters['difficulty_level'] == 'intermediate'
    
    def test_extract_metadata_filters_difficulty_advanced(self, rag_tool):
        """Test metadata extraction for advanced difficulty."""
        query = "I'm an experienced lifter looking for pro routines"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters['difficulty_level'] == 'advanced'
    
    def test_extract_metadata_filters_body_parts(self, rag_tool):
        """Test metadata extraction for various body parts."""
        # Test legs
        query = "I want to work on my legs and glutes"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'legs'
        
        # Test chest
        query = "Looking for chest and pec exercises"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'chest'
        
        # Test back
        query = "Need back and lat training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'back'
        
        # Test shoulders
        query = "Shoulder and deltoid training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'shoulders'
        
        # Test arms
        query = "Bicep and tricep exercises"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'arms'
        
        # Test core
        query = "Core and abs training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'core'
        
        # Test full body
        query = "Full body compound training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['body_part'] == 'full_body'
    
    def test_extract_metadata_filters_sport_types(self, rag_tool):
        """Test metadata extraction for sport types."""
        # Test strength training
        query = "Strength and muscle building training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['sport_type'] == 'strength_training'
        
        # Test endurance
        query = "Endurance and cardio training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['sport_type'] == 'endurance'
        
        # Test flexibility
        query = "Flexibility and mobility exercises"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['sport_type'] == 'flexibility'
        
        # Test sports
        query = "Athletic performance training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['sport_type'] == 'sports'
    
    def test_extract_metadata_filters_equipment(self, rag_tool):
        """Test metadata extraction for equipment types."""
        # Test bodyweight
        query = "Bodyweight exercises at home"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['equipment_needed'] == ['bodyweight']
        
        # Test dumbbells
        query = "Dumbbell training routine"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['equipment_needed'] == ['dumbbells']
        
        # Test barbell
        query = "Barbell strength training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['equipment_needed'] == ['barbell']
        
        # Test machine
        query = "Machine-based training"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['equipment_needed'] == ['machine']
    
    def test_extract_metadata_filters_training_frequency(self, rag_tool):
        """Test metadata extraction for training frequency."""
        # Test 2-3 times per week
        query = "I want to work out 2-3 times per week"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['training_frequency'] == '2-3_times_per_week'
        
        # Test 4-5 times per week
        query = "I can train four to five times per week"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['training_frequency'] == '4-5_times_per_week'
        
        # Test daily
        query = "Daily training routine"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['training_frequency'] == 'daily'
    
    def test_extract_metadata_filters_goals(self, rag_tool):
        """Test metadata extraction for training goals."""
        # Test weight loss
        query = "I want to lose weight and burn calories"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['goal'] == 'weight_loss'
        
        # Test muscle gain
        query = "I want to build muscle and bulk up"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['goal'] == 'muscle_gain'
        
        # Test strength
        query = "I want to get stronger and lift more"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['goal'] == 'strength'
        
        # Test endurance
        query = "I want to improve my endurance and stamina"
        filters = rag_tool.extract_metadata_filters(query)
        assert filters['goal'] == 'endurance'
    
    def test_extract_metadata_filters_multiple_filters(self, rag_tool):
        """Test metadata extraction with multiple filters."""
        query = "I'm a beginner and want to work on my chest with dumbbells for muscle gain"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters['difficulty_level'] == 'beginner'
        assert filters['body_part'] == 'chest'
        assert filters['equipment_needed'] == ['dumbbells']
        assert filters['goal'] == 'muscle_gain'
    
    def test_extract_metadata_filters_no_matches(self, rag_tool):
        """Test metadata extraction with no pattern matches."""
        query = "I am a rabbit"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters == {}
    
    def test_extract_metadata_filters_case_insensitive(self, rag_tool):
        """Test metadata extraction is case insensitive."""
        query = "I'm a BEGINNER and want to work on my CHEST"
        filters = rag_tool.extract_metadata_filters(query)
        
        assert filters['difficulty_level'] == 'beginner'
        assert filters['body_part'] == 'chest'
    
    def test_perform_hybrid_search_success(self, rag_tool, sample_search_results):
        """Test successful hybrid search."""
        # Mock the base agent to return results
        rag_tool.base_agent.search_knowledge_base.return_value = sample_search_results
        
        query = "beginner chest training"
        results = rag_tool.perform_hybrid_search(query, max_results=5)
        
        # Should call search_knowledge_base with metadata filters
        rag_tool.base_agent.search_knowledge_base.assert_called_once()
        call_args = rag_tool.base_agent.search_knowledge_base.call_args
        assert call_args[1]['query'] == query
        assert call_args[1]['max_results'] == 5
        assert 'metadata_filters' in call_args[1]
        
        # Should return re-ranked results
        assert len(results) <= 5
        assert all('final_score' in result for result in results)
    
    def test_perform_hybrid_search_few_results_fallback(self, rag_tool):
        """Test hybrid search with fallback to broader search."""
        # Mock filtered search to return few results
        rag_tool.base_agent.search_knowledge_base.side_effect = [
            [{'document_title': 'Doc1', 'chunk_text': 'Content1'}],  # Filtered results
            [{'document_title': 'Doc2', 'chunk_text': 'Content2'}]   # Broader results
        ]
        
        query = "specific query"
        results = rag_tool.perform_hybrid_search(query, max_results=5)
        
        # Should call search_knowledge_base twice
        assert rag_tool.base_agent.search_knowledge_base.call_count == 2
        
        # Should return combined results
        assert len(results) > 0
    
    def test_perform_hybrid_search_no_results(self, rag_tool):
        """Test hybrid search with no results."""
        # Mock search to return no results
        rag_tool.base_agent.search_knowledge_base.return_value = []
        
        query = "very specific query"
        results = rag_tool.perform_hybrid_search(query, max_results=5)
        
        # Should return empty list
        assert results == []
    
    def test_re_rank_results(self, rag_tool, sample_search_results):
        """Test result re-ranking."""
        query = "beginner chest training"
        ranked_results = rag_tool._re_rank_results(query, sample_search_results)
        
        # Should add final_score to each result
        assert all('final_score' in result for result in ranked_results)
        
        # Should sort by final_score in descending order
        scores = [result['final_score'] for result in ranked_results]
        assert scores == sorted(scores, reverse=True)
    
    def test_re_rank_results_empty_list(self, rag_tool):
        """Test re-ranking with empty results."""
        results = rag_tool._re_rank_results("query", [])
        assert results == []
    
    def test_re_rank_results_no_relevance_score(self, rag_tool):
        """Test re-ranking with missing relevance scores."""
        results_without_scores = [
            {'document_title': 'Doc1', 'chunk_text': 'Content1'},
            {'document_title': 'Doc2', 'chunk_text': 'Content2'}
        ]
        
        ranked_results = rag_tool._re_rank_results("query", results_without_scores)
        
        # Should handle missing scores gracefully
        assert all('final_score' in result for result in ranked_results)
    
    def test_augment_context_success(self, rag_tool, sample_search_results):
        """Test successful context augmentation."""
        # Mock hybrid search to return results
        rag_tool.perform_hybrid_search = Mock(return_value=sample_search_results)
        
        query = "beginner training"
        augmented = rag_tool.augment_context(query, max_context_length=1000)
        
        # Should include original query
        assert query in augmented
        
        # Should include context information
        assert "Relevant Information:" in augmented
        assert "Context:" in augmented
    
    def test_augment_context_no_results(self, rag_tool):
        """Test context augmentation with no search results."""
        # Mock hybrid search to return no results
        rag_tool.perform_hybrid_search = Mock(return_value=[])
        
        query = "very specific query"
        augmented = rag_tool.augment_context(query)
        
        # Should return original query unchanged
        assert augmented == query
    
    def test_augment_context_max_length_limit(self, rag_tool):
        """Test context augmentation respects max length limit."""
        # Mock search results with long content
        long_results = [
            {
                'document_title': 'Long Doc',
                'chunk_text': 'A' * 1000,  # Very long content
                'relevance_score': 0.9
            }
        ]
        rag_tool.perform_hybrid_search = Mock(return_value=long_results)
        
        query = "test query"
        augmented = rag_tool.augment_context(query, max_context_length=500)
        
        # Should respect max length limit
        assert len(augmented) <= len(query) + 500
    
    def test_get_search_insights(self, rag_tool, sample_search_results):
        """Test getting search insights."""
        # Mock the required methods
        rag_tool.extract_metadata_filters = Mock(return_value={'difficulty_level': 'beginner'})
        rag_tool.perform_hybrid_search = Mock(return_value=sample_search_results)
        
        query = "beginner chest training"
        insights = rag_tool.get_search_insights(query)
        
        # Should return structured insights
        assert insights['query'] == query
        assert 'extracted_filters' in insights
        assert 'results_count' in insights
        assert 'top_results' in insights
        assert 'search_strategy' in insights
        
        # Should include top results
        assert len(insights['top_results']) <= 3
        assert all('title' in result for result in insights['top_results'])
        assert all('relevance_score' in result for result in insights['top_results'])
        assert all('final_score' in result for result in insights['top_results'])
    
    def test_get_search_insights_no_filters(self, rag_tool, sample_search_results):
        """Test search insights with no metadata filters."""
        # Mock no metadata filters
        rag_tool.extract_metadata_filters = Mock(return_value={})
        rag_tool.perform_hybrid_search = Mock(return_value=sample_search_results)
        
        query = "general training"
        insights = rag_tool.get_search_insights(query)
        
        # Should indicate vector-only strategy
        assert insights['search_strategy'] == 'vector_only'
    
    def test_get_search_insights_empty_results(self, rag_tool):
        """Test search insights with empty results."""
        # Mock empty results
        rag_tool.extract_metadata_filters = Mock(return_value={'difficulty_level': 'beginner'})
        rag_tool.perform_hybrid_search = Mock(return_value=[])
        
        query = "very specific query"
        insights = rag_tool.get_search_insights(query)
        
        # Should handle empty results gracefully
        assert insights['results_count'] == 0
        assert insights['top_results'] == []
    
    def test_metadata_filter_priority(self, rag_tool):
        """Test that metadata filters are applied in priority order."""
        query = "I'm a beginner and want to work on my chest with dumbbells for muscle gain"
        filters = rag_tool.extract_metadata_filters(query)
        
        # Should extract multiple filters
        assert len(filters) >= 4
        
        # Should include all expected filter types
        assert 'difficulty_level' in filters
        assert 'body_part' in filters
        assert 'equipment_needed' in filters
        assert 'goal' in filters
    
    def test_edge_case_empty_query(self, rag_tool):
        """Test edge case with empty query."""
        filters = rag_tool.extract_metadata_filters("")
        assert filters == {}
        
        # Test with whitespace only
        filters = rag_tool.extract_metadata_filters("   ")
        assert filters == {}
    
    def test_edge_case_special_characters(self, rag_tool):
        """Test edge case with special characters in query."""
        query = "I want a training plan! @#$%^&*()"
        filters = rag_tool.extract_metadata_filters(query)
        
        # Should still extract relevant filters if patterns match
        # This test ensures special characters don't break the extraction
        assert isinstance(filters, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
