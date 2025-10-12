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
            agent_name: Name of the agent (e.g., "training Coach")
            agent_description: Description of the agent's expertise
            topic: Topic this agent specializes in (e.g., "training", "nutrition")
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

    def search_knowledge_base(
        self,
        query: str,
        max_results: int = 5,
        metadata_filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
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
            if not query_embedding:
                print("❌ Failed to generate query embedding")
                return []

            print(f"🔍 Query embedding generated: {len(query_embedding)} dimensions")

            # Step 2: First get all document embeddings for the topic
            embeddings_query = self.supabase.table("document_embeddings").select(
                "id, chunk_text, chunk_index, embedding, document_id"
            )

            # Step 3: Get documents filtered by topic only
            docs_query = (
                self.supabase.table("documents")
                .select("id, title, content, topic, keywords")
                .eq("topic", self.topic)
            )

            # Skip metadata/keyword filtering - only filter by topic for training agent

            # Execute documents query
            docs_response = docs_response = docs_query.execute()
            if not docs_response.data:
                print(
                    f"⚠️  No documents found for topic '{self.topic}' with filters: {metadata_filters}"
                )
                return []

            # Get document IDs that match our criteria
            matching_doc_ids = [doc["id"] for doc in docs_response.data]

            # Step 4: Get embeddings for matching documents
            embeddings_response = embeddings_query.in_(
                "document_id", matching_doc_ids
            ).execute()
            if not embeddings_response.data:
                print("⚠️  No embeddings found for matching documents")
                return []

            # Step 5: Calculate similarity scores and rank results
            results = []
            print(f"🔍 Processing {len(embeddings_response.data)} embeddings...")

            for embedding_data in embeddings_response.data:
                if "embedding" in embedding_data and embedding_data["embedding"]:
                    # Parse string embedding back to vector
                    embedding = embedding_data["embedding"]
                    if isinstance(embedding, str):
                        try:
                            import json

                            embedding_vector = json.loads(embedding)
                            if not isinstance(embedding_vector, list):
                                print(
                                    f"⚠️  Parsed embedding is not a list: {type(embedding_vector)}"
                                )
                                continue
                        except (json.JSONDecodeError, ValueError) as e:
                            print(f"⚠️  Failed to parse embedding string: {e}")
                            continue
                    else:
                        embedding_vector = embedding

                    # Debug: Check vector dimensions
                    if len(embedding_vector) == 0:
                        print(
                            f"⚠️  Empty embedding vector for document {embedding_data['document_id']}"
                        )
                        continue

                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(
                        query_embedding, embedding_vector
                    )

                    # Debug similarity calculation
                    if similarity == 0.0:
                        print(
                            f"⚠️  Zero similarity for document {embedding_data['document_id']} - query_dim: {len(query_embedding)}, doc_dim: {len(embedding_vector)}"
                        )

                    # Get document info
                    doc_info = next(
                        (
                            doc
                            for doc in docs_response.data
                            if doc["id"] == embedding_data["document_id"]
                        ),
                        None,
                    )

                    if doc_info:
                        results.append(
                            {
                                "chunk_text": embedding_data["chunk_text"],
                                "chunk_index": embedding_data["chunk_index"],
                                "document_title": doc_info["title"],
                                "document_keywords": doc_info.get(
                                    "keywords", []
                                ),  # Use keywords instead of metadata
                                "relevance_score": similarity,
                                "document_id": embedding_data["document_id"],
                            }
                        )
                else:
                    print(f"⚠️  Skipping embedding_data without valid embedding")

            # Step 6: Apply cutoff score with smart fallback
            CUTOFF_SCORE = 0.5  # Minimum acceptable similarity score

            # Filter by cutoff score
            high_quality_results = [
                r for r in results if r["relevance_score"] >= CUTOFF_SCORE
            ]

            if high_quality_results:
                # We have good quality results above cutoff
                print(
                    f"✅ Found {len(high_quality_results)} high-quality results (≥{CUTOFF_SCORE})"
                )
                # Return all high-quality results (up to max_results or 10, whichever is higher)
                max_high_quality = max(
                    max_results, 10
                )  # Allow more high-quality results
                final_results = high_quality_results[:max_high_quality]
                if len(high_quality_results) > max_results:
                    print(
                        f"📈 Returning {len(final_results)} high-quality results (exceeded requested {max_results})"
                    )
            else:
                # All results below cutoff, use top 5 with "poor" quality
                print(
                    f"⚠️  All results below cutoff ({CUTOFF_SCORE}), using top 5 with poor quality"
                )
                final_results = results[:5]
                # Mark all as poor quality
                for result in final_results:
                    result["quality_level"] = "poor"
                    result["weight"] = 0.0

            # Sort final results by relevance score
            final_results.sort(key=lambda x: x["relevance_score"], reverse=True)

            print(f"🎯 Returning {len(final_results)} documents")
            return final_results

        except Exception as e:
            print(f"❌ Error searching knowledge base: {e}")
            return []

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors using scikit-learn."""
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np

            # Convert to numpy arrays and reshape for sklearn
            vec1_array = np.array(vec1).reshape(1, -1)
            vec2_array = np.array(vec2).reshape(1, -1)

            # Calculate cosine similarity
            similarity = cosine_similarity(vec1_array, vec2_array)[0][0]
            return float(similarity)

        except ImportError:
            # Fallback calculation if sklearn not available
            if not vec1 or not vec2 or len(vec1) != len(vec2):
                return 0.0

            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm_a = sum(a * a for a in vec1) ** 0.5
            norm_b = sum(b * b for b in vec2) ** 0.5

            if norm_a == 0 or norm_b == 0:
                return 0.0

            return dot_product / (norm_a * norm_b)

        except Exception as e:
            # Silently handle errors to avoid cluttering debug output
            return 0.0

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate OpenAI embedding for text."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small", input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            return []

    def generate_response(
        self, user_query: str, context_documents: List[Dict[str, Any]]
    ) -> str:
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
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
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
            keywords = doc.get("document_keywords", [])
            keywords_str = ", ".join(keywords) if keywords else "None"
            context_parts.append(
                f"""
Document {i}: {doc.get('document_title', 'Unknown Title')}
Content: {doc.get('chunk_text', 'No content')}
Keywords: {keywords_str}
---"""
            )

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
            "capabilities": self._get_capabilities(),
        }

    @abstractmethod
    def _get_capabilities(self) -> List[str]:
        """Return list of agent capabilities. Must be implemented by each specialist."""
        pass
