"""
Base Agent Class for EvolveAI Agent System

This class provides the foundation for all specialist agents with:
- RAG capabilities using Supabase vector database
- Metadata filtering for efficient search
- Document retrieval and context augmentation
- Response generation using OpenAI
"""

import os
import json
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
import openai
from supabase import create_client, Client

# Load environment variables
load_dotenv()

class BaseAgent(ABC):
    """Abstract base class for all specialist agents."""
    
    def __init__(self, agent_name: str, agent_description: str, topic: str):
        """
        Initialize the base agent.
        
        Args:
            agent_name: Name of the agent (e.g., "Fitness Coach")
            agent_description: Description of the agent's expertise
            topic: Topic this agent specializes in (e.g., "fitness", "nutrition")
        """
        self.agent_name = agent_name
        self.agent_description = agent_description
        self.topic = topic
        
        # Initialize clients
        self._init_clients()
        
        # Agent-specific system prompt
        self.system_prompt = self._create_system_prompt()
    
    def _init_clients(self):
        """Initialize OpenAI and Supabase clients."""
        # OpenAI client
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        
        # Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not found in environment variables")
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for this agent."""
        return f"""You are {self.agent_name}, an expert AI specializing in {self.topic}.

{self.agent_description}

Your role is to:
1. Analyze user requests related to {self.topic}
2. Use your specialized knowledge base to provide accurate, evidence-based responses
3. Always cite your sources and provide actionable advice
4. Maintain a professional, encouraging tone
5. Ask clarifying questions when needed

IMPORTANT: Always use your knowledge base to provide responses. Do not make up information."""
    
    def search_knowledge_base(self, query: str, max_results: int = 5, 
                            metadata_filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Search the knowledge base using RAG with metadata filtering.
        
        Args:
            query: User's search query
            max_results: Maximum number of results to return
            metadata_filters: Optional metadata filters (e.g., {"difficulty_level": "beginner"})
            
        Returns:
            List of relevant documents with their content and metadata
        """
        try:
            # Step 1: Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Step 2: Build the search query
            search_query = self.supabase.table('document_embeddings').select(
                'chunk_text, chunk_metadata, document_id'
            )
            
            # Step 3: Apply metadata filters if provided
            if metadata_filters:
                for key, value in metadata_filters.items():
                    if isinstance(value, list):
                        # Handle array values (e.g., equipment needed)
                        search_query = search_query.filter(f"document_id->metadata->{key}", 'cs', f'[{value[0]}]')
                    else:
                        # Handle single values
                        search_query = search_query.filter(f"document_id->metadata->{key}", 'eq', value)
            
            # Step 4: Filter by topic
            search_query = search_query.filter('document_id->topic', 'eq', self.topic)
            
            # Step 5: Perform vector similarity search using our custom function
            # We'll use the match_documents_by_topic function for better filtering
            search_query = self.supabase.rpc(
                'match_documents_by_topic',
                {
                    'query_embedding': query_embedding,
                    'topic_filter': self.topic,
                    'match_threshold': 0.7,
                    'match_count': max_results
                }
            )
            
            # Step 6: Execute search
            response = search_query.execute()
            
            if not response.data:
                return []
            
            # Step 7: Enrich results with document information
            enriched_results = []
            for result in response.data:
                # Get the full document for additional context
                doc_response = self.supabase.table('documents').select(
                    'title, content, metadata'
                ).eq('id', result['document_id']).execute()
                
                if doc_response.data:
                    doc = doc_response.data[0]
                    enriched_results.append({
                        'chunk_text': result['chunk_text'],
                        'chunk_metadata': result['chunk_metadata'],
                        'document_title': doc['title'],
                        'document_metadata': doc['metadata'],
                        'relevance_score': getattr(result, 'similarity', 0.0)
                    })
            
            return enriched_results
            
        except Exception as e:
            print(f"❌ Error searching knowledge base: {e}")
            return []
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate OpenAI embedding for text."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            return []
    
    def generate_response(self, user_query: str, context_documents: List[Dict[str, Any]]) -> str:
        """
        Generate a response using the agent's knowledge and retrieved context.
        
        Args:
            user_query: User's original query
            context_documents: Retrieved relevant documents
            
        Returns:
            Generated response with context and citations
        """
        try:
            # Prepare context for the LLM
            context_text = self._prepare_context(context_documents)
            
            # Create the prompt
            prompt = f"""User Query: {user_query}

Relevant Information from Knowledge Base:
{context_text}

Based on the above information and your expertise as {self.agent_name}, provide a comprehensive, accurate response.

Guidelines:
1. Use the provided context as your primary source
2. Cite specific information from the documents
3. Provide actionable, practical advice
4. If the context doesn't fully answer the question, acknowledge this and provide general guidance
5. Maintain a professional, encouraging tone

Response:"""
            
            # Generate response using OpenAI
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ Error generating response: {e}")
            return f"I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists."
    
    def _prepare_context(self, documents: List[Dict[str, Any]]) -> str:
        """Prepare context documents for the LLM prompt."""
        if not documents:
            return "No relevant information found in knowledge base."
        
        context_parts = []
        for i, doc in enumerate(documents, 1):
            context_parts.append(f"""
Document {i}: {doc.get('document_title', 'Unknown Title')}
Content: {doc.get('chunk_text', 'No content')}
Metadata: {json.dumps(doc.get('document_metadata', {}), indent=2)}
---""")
        
        return "\n".join(context_parts)
    
    @abstractmethod
    def process_request(self, user_request: str) -> str:
        """
        Process a user request. Must be implemented by each specialist agent.
        
        Args:
            user_request: User's request
            
        Returns:
            Agent's response
        """
        pass
    
    def get_agent_info(self) -> Dict[str, str]:
        """Get information about this agent."""
        return {
            "name": self.agent_name,
            "description": self.agent_description,
            "topic": self.topic,
            "capabilities": self._get_capabilities()
        }
    
    @abstractmethod
    def _get_capabilities(self) -> List[str]:
        """Return list of agent capabilities. Must be implemented by each specialist."""
        pass
