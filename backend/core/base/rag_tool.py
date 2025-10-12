"""
RAG Tool for Advanced Document Retrieval

This tool provides sophisticated RAG capabilities including:
- Multi-stage filtering (metadata + vector search)
- Hybrid search (semantic + keyword)
- Re-ranking for better relevance
- Context augmentation
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .base_agent import BaseAgent

class RAGTool:
    """Advanced RAG tool for document retrieval and context augmentation."""
    
    def __init__(self, base_agent: BaseAgent):
        """
        Initialize RAG tool with a base agent.
        
        Args:
            base_agent: The specialist agent using this tool
        """
        self.base_agent = base_agent
    
    def extract_metadata_filters(self, user_query: str) -> Dict[str, Any]:
        """
        Extract metadata filters from user query using pattern matching.
        
        Args:
            user_query: User's natural language query
            
        Returns:
            Dictionary of metadata filters to apply
        """
        filters = {}
        query_lower = user_query.lower()
        
        # Difficulty level detection
        difficulty_patterns = {
            'beginner': ['beginner', 'new', 'starting', 'first time', 'never done'],
            'intermediate': ['intermediate', 'some experience', 'moderate', 'progressed'],
            'advanced': ['advanced', 'experienced', 'expert', 'pro', 'seasoned']
        }
        
        for level, patterns in difficulty_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['difficulty_level'] = level
                break
        
        # Body part detection
        body_part_patterns = {
            'legs': ['legs', 'leg', 'quad', 'hamstring', 'calf', 'glute', 'squat', 'deadlift'],
            'chest': ['chest', 'pec', 'bench', 'push-up', 'dumbbell press'],
            'back': ['back', 'lat', 'row', 'pull-up', 'deadlift'],
            'shoulders': ['shoulder', 'deltoid', 'press', 'lateral raise'],
            'arms': ['arm', 'bicep', 'tricep', 'curl', 'extension'],
            'core': ['core', 'abs', 'abdominal', 'plank', 'crunch'],
            'full_body': ['full body', 'total body', 'whole body', 'compound']
        }
        
        for part, patterns in body_part_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['body_part'] = part
                break
        
        # Sport type detection
        sport_patterns = {
            'strength_training': ['strength', 'power', 'muscle', 'hypertrophy', 'bodybuilding'],
            'endurance': ['endurance', 'cardio', 'aerobic', 'stamina', 'running'],
            'flexibility': ['flexibility', 'mobility', 'stretching', 'yoga', 'pilates'],
            'sports': ['sport', 'athletic', 'performance', 'competition']
        }
        
        for sport, patterns in sport_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['sport_type'] = sport
                break
        
        # Equipment detection
        equipment_patterns = {
            'bodyweight': ['bodyweight', 'no equipment', 'at home', 'minimal'],
            'dumbbells': ['dumbbell', 'dumbbells', 'free weight'],
            'barbell': ['barbell', 'barbells', 'rack', 'squat rack'],
            'machine': ['machine', 'gym equipment', 'cable', 'pulley']
        }
        
        for equip, patterns in equipment_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['equipment_needed'] = [equip]
                break
        
        # Training frequency detection
        frequency_patterns = {
            '2-3_times_per_week': ['2-3', 'twice', 'three times', 'few times'],
            '4-5_times_per_week': ['4-5', 'four', 'five', 'most days'],
            'daily': ['daily', 'every day', '7 days', 'continuous']
        }
        
        for freq, patterns in frequency_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['training_frequency'] = freq
                break
        
        # Goal detection
        goal_patterns = {
            'weight_loss': ['weight loss', 'fat loss', 'burn calories', 'slim down'],
            'muscle_gain': ['muscle gain', 'bulk up', 'build muscle', 'size'],
            'strength': ['strength', 'power', 'lift more', 'stronger'],
            'endurance': ['endurance', 'stamina', 'last longer', 'cardio training']
        }
        
        for goal, patterns in goal_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters['goal'] = goal
                break
        
        return filters
    
    def perform_hybrid_search(self, user_query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining metadata filtering and vector similarity.
        
        Args:
            user_query: User's search query
            max_results: Maximum number of results to return
            
        Returns:
            List of relevant documents with relevance scores
        """
        # Step 1: Extract metadata filters
        metadata_filters = self.extract_metadata_filters(user_query)
        print(f"🔍 Extracted metadata filters: {metadata_filters}")
        
        # Step 2: Perform filtered vector search
        filtered_results = self.base_agent.search_knowledge_base(
            query=user_query,
            max_results=max_results,
            metadata_filters=metadata_filters
        )
        
        # Step 3: If filtered search returns few results, try broader search
        if len(filtered_results) < 3:
            print(f"⚠️  Filtered search returned only {len(filtered_results)} results, trying broader search...")
            broader_results = self.base_agent.search_knowledge_base(
                query=user_query,
                max_results=max_results,
                metadata_filters=None  # No filters
            )
            
            # Combine and deduplicate results
            all_results = filtered_results + broader_results
            seen_docs = set()
            unique_results = []
            
            for result in all_results:
                doc_id = result.get('document_title', '')
                if doc_id not in seen_docs:
                    seen_docs.add(doc_id)
                    unique_results.append(result)
            
            results = unique_results[:max_results]
        else:
            results = filtered_results
        
        # Step 4: Re-rank results for better relevance
        ranked_results = self._re_rank_results(user_query, results)
        
        return ranked_results[:max_results]
    
    def _re_rank_results(self, user_query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-rank results using a simple scoring algorithm.
        
        Args:
            user_query: Original user query
            results: List of search results
            
        Returns:
            Re-ranked results
        """
        if not results:
            return results
        
        # Simple re-ranking based on multiple factors
        for result in results:
            score = 0.0
            
            # Base relevance score
            score += result.get('relevance_score', 0.0) * 0.6
            
            # Query term matching bonus
            query_terms = set(user_query.lower().split())
            content_terms = set(result.get('chunk_text', '').lower().split())
            term_overlap = len(query_terms.intersection(content_terms))
            score += min(term_overlap * 0.1, 0.3)  # Cap at 0.3
            
            # Metadata relevance bonus
            metadata = result.get('document_metadata', {})
            if metadata:
                # Check if metadata matches user intent
                if 'difficulty_level' in metadata and 'beginner' in user_query.lower():
                    if metadata['difficulty_level'] == 'beginner':
                        score += 0.2
                
                if 'body_part' in metadata and any(part in user_query.lower() for part in ['leg', 'chest', 'back']):
                    score += 0.1
            
            result['final_score'] = score
        
        # Sort by final score
        return sorted(results, key=lambda x: x.get('final_score', 0), reverse=True)
    
    def augment_context(self, user_query: str, max_context_length: int = 2000) -> str:
        """
        Augment user query with relevant context from knowledge base.
        
        Args:
            user_query: User's original query
            max_context_length: Maximum length of context to include
            
        Returns:
            Augmented query with relevant context
        """
        # Get relevant documents
        relevant_docs = self.perform_hybrid_search(user_query, max_results=3)
        
        if not relevant_docs:
            return user_query
        
        # Build context string
        context_parts = []
        current_length = 0
        
        for doc in relevant_docs:
            doc_context = f"Context: {doc.get('chunk_text', '')[:500]}..."
            
            if current_length + len(doc_context) > max_context_length:
                break
            
            context_parts.append(doc_context)
            current_length += len(doc_context)
        
        if context_parts:
            return f"{user_query}\n\nRelevant Information:\n" + "\n\n".join(context_parts)
        
        return user_query
    
    def get_search_insights(self, user_query: str) -> Dict[str, Any]:
        """
        Get insights about the search process and results.
        
        Args:
            user_query: User's search query
            
        Returns:
            Dictionary with search insights
        """
        metadata_filters = self.extract_metadata_filters(user_query)
        search_results = self.perform_hybrid_search(user_query, max_results=5)
        
        return {
            "query": user_query,
            "extracted_filters": metadata_filters,
            "results_count": len(search_results),
            "top_results": [
                {
                    "title": result.get('document_title', 'Unknown'),
                    "relevance_score": result.get('relevance_score', 0.0),
                    "final_score": result.get('final_score', 0.0)
                }
                for result in search_results[:3]
            ],
            "search_strategy": "hybrid_metadata_vector" if metadata_filters else "vector_only"
        }
