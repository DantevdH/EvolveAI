"""
RAG Tool for Advanced Document Retrieval

This tool provides sophisticated RAG capabilities including:
- Multi-stage filtering (metadata + vector search)
- Hybrid search (semantic + keyword)
- Re-ranking for better relevance
- Context augmentation
- Embedding generation (OpenAI/Gemini)
"""

import os
import re
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
import openai
from .base_agent import BaseAgent
from logging_config import get_logger

load_dotenv()


class RAGTool:
    """Advanced RAG tool for document retrieval and context augmentation."""

    def __init__(self, base_agent: BaseAgent):
        """
        Initialize RAG tool with a base agent.

        Args:
            base_agent: The specialist agent using this tool
        """
        self.base_agent = base_agent
        self.logger = get_logger(__name__)
        self._init_embedding_clients()
    
    def _init_embedding_clients(self):
        """Initialize embedding clients based on provider."""
        # Determine provider from model name
        model_name = os.getenv("LLM_MODEL_CHAT", os.getenv("LLM_MODEL", "gpt-4o"))
        self.use_gemini = model_name.lower().startswith("gemini")
        
        # Get embedding model from env var (default based on provider)
        if self.use_gemini:
            embedding_model = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
            # Ensure model name has "models/" prefix if not present
            if not embedding_model.startswith("models/"):
                self.embedding_model = f"models/{embedding_model}"
            else:
                self.embedding_model = embedding_model
        else:
            self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        
        # Initialize embedding clients based on provider
        api_key = os.getenv("LLM_API_KEY")
        if not api_key:
            raise ValueError("LLM_API_KEY not found in environment variables")
        
        if self.use_gemini:
            from google import genai  # type: ignore
            self.gemini_client = genai.Client(api_key=api_key)
            self.openai_client = None
        else:
            self.openai_client = openai.OpenAI(api_key=api_key)
            self.gemini_client = None
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI or Gemini based on provider."""
        try:
            if self.use_gemini:
                if self.gemini_client is None:
                    return []
                # Use gemini-embedding-001 with 1536 dimensions
                try:
                    from google.genai import types
                    response = self.gemini_client.models.embed_content(
                        model=self.embedding_model,
                        contents=[{"role": "user", "parts": [{"text": text}]}],
                        config=types.EmbedContentConfig(output_dimensionality=1536)
                    )
                except (AttributeError, TypeError, ImportError):
                    # Fallback to dict config
                    response = self.gemini_client.models.embed_content(
                        model=self.embedding_model,
                        contents=[{"role": "user", "parts": [{"text": text}]}],
                        config={"output_dimensionality": 1536}
                    )
                
                # Extract embedding from response
                embedding = None
                if hasattr(response, "embeddings") and response.embeddings:
                    first_emb = response.embeddings[0]
                    if hasattr(first_emb, "values"):
                        embedding = list(first_emb.values)
                    elif isinstance(first_emb, (list, tuple)):
                        embedding = list(first_emb)
                
                if not embedding and hasattr(response, "embedding") and response.embedding:
                    emb = response.embedding
                    if hasattr(emb, "values"):
                        embedding = list(emb.values)
                    elif isinstance(emb, (list, tuple)):
                        embedding = list(emb)
                
                return embedding if embedding else []
            else:
                # Use OpenAI embeddings
                if self.openai_client is None:
                    return []
                response = self.openai_client.embeddings.create(
                    model=self.embedding_model, input=text
                )
                return response.data[0].embedding
        except Exception as e:
            self.logger.error(f"Error generating embedding: {e}")
            return []

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
            query_embedding = self.generate_embedding(query)
            if not query_embedding:
                self.logger.error("Failed to generate query embedding")
                return []

            self.logger.debug(f"Query embedding generated: {len(query_embedding)} dimensions")

            # Step 2: Get document embeddings
            embeddings_query = self.base_agent.supabase.table("document_embeddings").select(
                "id, chunk_text, chunk_index, embedding, document_id"
            )

            # Step 3: Get documents filtered by topic only
            docs_query = (
                self.base_agent.supabase.table("documents")
                .select("id, title, content, topic, keywords")
                .eq("topic", self.base_agent.topic)
            )

            # Execute documents query
            docs_response = docs_query.execute()
            if not docs_response.data:
                self.logger.warning(
                    f"No documents found for topic '{self.base_agent.topic}' with filters: {metadata_filters}"
                )
                return []

            # Get document IDs that match our criteria
            matching_doc_ids = [doc["id"] for doc in docs_response.data]

            # Step 4: Get embeddings for matching documents
            embeddings_response = embeddings_query.in_(
                "document_id", matching_doc_ids
            ).execute()
            if not embeddings_response.data:
                self.logger.warning("No embeddings found for matching documents")
                return []

            # Step 5: Calculate similarity scores and rank results
            results = []
            self.logger.debug(f"Processing {len(embeddings_response.data)} embeddings...")

            for embedding_data in embeddings_response.data:
                if "embedding" in embedding_data and embedding_data["embedding"]:
                    # Parse string embedding back to vector
                    embedding = embedding_data["embedding"]
                    if isinstance(embedding, str):
                        try:
                            import json
                            embedding_vector = json.loads(embedding)
                            if not isinstance(embedding_vector, list):
                                self.logger.warning(
                                    f"Parsed embedding is not a list: {type(embedding_vector)}"
                                )
                                continue
                        except (json.JSONDecodeError, ValueError) as e:
                            self.logger.warning(f"Failed to parse embedding string: {e}")
                            continue
                    else:
                        embedding_vector = embedding

                    # Debug: Check vector dimensions
                    if len(embedding_vector) == 0:
                        self.logger.warning(
                            f"Empty embedding vector for document {embedding_data['document_id']}"
                        )
                        continue

                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(
                        query_embedding, embedding_vector
                    )

                    # Debug similarity calculation
                    if similarity == 0.0:
                        self.logger.debug(
                            f"Zero similarity for document {embedding_data['document_id']} - query_dim: {len(query_embedding)}, doc_dim: {len(embedding_vector)}"
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
                                ),
                                "relevance_score": similarity,
                                "document_id": embedding_data["document_id"],
                            }
                        )
                else:
                    self.logger.warning("Skipping embedding_data without valid embedding")

            # Step 6: Apply cutoff score with smart fallback
            CUTOFF_SCORE = 0.5  # Minimum acceptable similarity score

            # Filter by cutoff score
            high_quality_results = [
                r for r in results if r["relevance_score"] >= CUTOFF_SCORE
            ]

            if high_quality_results:
                # We have good quality results above cutoff
                self.logger.debug(
                    f"Found {len(high_quality_results)} high-quality results (≥{CUTOFF_SCORE})"
                )
                # Return all high-quality results (up to max_results or 10, whichever is higher)
                max_high_quality = max(max_results, 10)
                final_results = high_quality_results[:max_high_quality]
                if len(high_quality_results) > max_results:
                    self.logger.debug(
                        f"Returning {len(final_results)} high-quality results (exceeded requested {max_results})"
                    )
            else:
                # All results below cutoff, use top 5 with "poor" quality
                self.logger.warning(
                    f"All results below cutoff ({CUTOFF_SCORE}), using top 5 with poor quality"
                )
                final_results = results[:5]
                # Mark all as poor quality
                for result in final_results:
                    result["quality_level"] = "poor"
                    result["weight"] = 0.0

            # Sort final results by relevance score
            final_results.sort(key=lambda x: x["relevance_score"], reverse=True)

            self.logger.debug(f"Returning {len(final_results)} documents")
            return final_results

        except Exception as e:
            error_msg = str(e)
            if "timed out" in error_msg.lower():
                self.logger.error(
                    f"Database query timed out while searching knowledge base. "
                    f"This may indicate slow database performance or network issues. "
                    f"Error: {error_msg}"
                )
            else:
                self.logger.error(f"Error searching knowledge base: {error_msg}")
            return []

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
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
            "beginner": ["beginner", "new", "starting", "first time", "never done"],
            "intermediate": [
                "intermediate",
                "some experience",
                "moderate",
                "progressed",
            ],
            "advanced": ["advanced", "experienced", "expert", "pro", "seasoned"],
        }

        for level, patterns in difficulty_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["difficulty_level"] = level
                break

        # Body part detection
        body_part_patterns = {
            "legs": [
                "legs",
                "leg",
                "quad",
                "hamstring",
                "calf",
                "glute",
                "squat",
                "deadlift",
            ],
            "chest": ["chest", "pec", "bench", "push-up", "dumbbell press"],
            "back": ["back", "lat", "row", "pull-up", "deadlift"],
            "shoulders": ["shoulder", "deltoid", "press", "lateral raise"],
            "arms": ["arm", "bicep", "tricep", "curl", "extension"],
            "core": ["core", "abs", "abdominal", "plank", "crunch"],
            "full_body": ["full body", "total body", "whole body", "compound"],
        }

        for part, patterns in body_part_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["body_part"] = part
                break

        # Sport type detection
        sport_patterns = {
            "strength_training": [
                "strength",
                "power",
                "muscle",
                "hypertrophy",
                "bodybuilding",
            ],
            "endurance": ["endurance", "cardio", "aerobic", "stamina", "running"],
            "flexibility": ["flexibility", "mobility", "stretching", "yoga", "pilates"],
            "sports": ["sport", "athletic", "performance", "competition"],
        }

        for sport, patterns in sport_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["sport_type"] = sport
                break

        # Equipment detection
        equipment_patterns = {
            "bodyweight": ["bodyweight", "no equipment", "at home", "minimal"],
            "dumbbells": ["dumbbell", "dumbbells", "free weight"],
            "barbell": ["barbell", "barbells", "rack", "squat rack"],
            "machine": ["machine", "gym equipment", "cable", "pulley"],
        }

        for equip, patterns in equipment_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["equipment_needed"] = [equip]
                break

        # Training frequency detection
        frequency_patterns = {
            "2-3_times_per_week": ["2-3", "twice", "three times", "few times"],
            "4-5_times_per_week": ["4-5", "four", "five", "most days"],
            "daily": ["daily", "every day", "7 days", "continuous"],
        }

        for freq, patterns in frequency_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["training_frequency"] = freq
                break

        # Goal detection
        goal_patterns = {
            "weight_loss": ["weight loss", "fat loss", "burn calories", "slim down"],
            "muscle_gain": ["muscle gain", "bulk up", "build muscle", "size"],
            "strength": ["strength", "power", "lift more", "stronger"],
            "endurance": ["endurance", "stamina", "last longer", "cardio training"],
        }

        for goal, patterns in goal_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["goal"] = goal
                break

        return filters

    def perform_hybrid_search(
        self, user_query: str, max_results: int = 8
    ) -> List[Dict[str, Any]]:
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
        self.logger.debug(f"Extracted metadata filters: {metadata_filters}")

        # Step 2: Perform filtered vector search
        filtered_results = self.search_knowledge_base(
            query=user_query, max_results=max_results, metadata_filters=metadata_filters
        )

        # Step 3: If filtered search returns few results, try broader search
        if len(filtered_results) < 3:
            self.logger.debug(
                f"Filtered search returned only {len(filtered_results)} results, trying broader search..."
            )
            broader_results = self.search_knowledge_base(
                query=user_query,
                max_results=max_results,
                metadata_filters=None,  # No filters
            )

            # Combine and deduplicate results
            all_results = filtered_results + broader_results
            seen_docs = set()
            unique_results = []

            for result in all_results:
                doc_id = result.get("document_title", "")
                if doc_id not in seen_docs:
                    seen_docs.add(doc_id)
                    unique_results.append(result)

            results = unique_results[:max_results]
        else:
            results = filtered_results

        # Step 4: Re-rank results for better relevance
        ranked_results = self._re_rank_results(user_query, results)

        return ranked_results[:max_results]

    def _re_rank_results(
        self, user_query: str, results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
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
            score += result.get("relevance_score", 0.0) * 0.6

            # Query term matching bonus
            query_terms = set(user_query.lower().split())
            content_terms = set(result.get("chunk_text", "").lower().split())
            term_overlap = len(query_terms.intersection(content_terms))
            score += min(term_overlap * 0.1, 0.3)  # Cap at 0.3

            # Metadata relevance bonus
            metadata = result.get("document_metadata", {})
            if metadata:
                # Check if metadata matches user intent
                if "difficulty_level" in metadata and "beginner" in user_query.lower():
                    if metadata["difficulty_level"] == "beginner":
                        score += 0.2

                if "body_part" in metadata and any(
                    part in user_query.lower() for part in ["leg", "chest", "back"]
                ):
                    score += 0.1

            result["final_score"] = score

        # Sort by final score
        return sorted(results, key=lambda x: x.get("final_score", 0), reverse=True)

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
            return f"{user_query}\n\nRelevant Information:\n" + "\n\n".join(
                context_parts
            )

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
                    "title": result.get("document_title", "Unknown"),
                    "relevance_score": result.get("relevance_score", 0.0),
                    "final_score": result.get("final_score", 0.0),
                }
                for result in search_results[:3]
            ],
            "search_strategy": (
                "hybrid_metadata_vector" if metadata_filters else "vector_only"
            ),
        }

    def generate_response(
        self, user_query: str, context_documents: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a response using the agent's knowledge and retrieved context.

        Args:
            user_query: User's original query
            context_documents: Retrieved relevant documents
            context: Additional context dictionary (optional)

        Returns:
            Generated response with context and citations
        """
        try:
            # Prepare context for the LLM
            context_text = self._prepare_context(context_documents)

            # Create the prompt
            agent_name = self.base_agent.agent_name
            prompt = f"""User Query: {user_query}

Relevant Information from Knowledge Base:
{context_text}

Based on the above information and your expertise as {agent_name}, provide a comprehensive, accurate response.

Guidelines:
1. Use the provided context as your primary source
2. Cite specific information from the documents
3. Provide actionable, practical advice
4. If the context doesn't fully answer the question, acknowledge this and provide general guidance
5. Maintain a professional, encouraging tone

Response:"""

            # Generate response using unified LLM
            content = self.base_agent.llm.chat_text([
                {
                    "role": "system",
                    "content": f"You are {agent_name}, an expert AI. Use your specialized knowledge base to provide accurate, evidence-based responses. Always cite your sources."
                },
                {"role": "user", "content": prompt},
            ])
            return content

        except Exception as e:
            self.logger.error(f"Error generating response: {e}")
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

    def validate_and_retrieve_context(
        self, lesson_text: str, max_sentences: int = 10
    ) -> str:
        """
        Retrieve and validate context for a playbook lesson.
        
        This method performs a two-stage process:
        1. Retrieve context from knowledge base using RAG
        2. Validate if retrieved context is relevant to the lesson
        
        Args:
            lesson_text: The playbook lesson text
            max_sentences: Maximum number of sentences to include in context (default: 10)
            
        Returns:
            Validated context text (max 10 sentences) or "context not found" if not relevant
        """
        try:
            # Stage 1: Retrieve context via RAG
            relevant_docs = self.perform_hybrid_search(
                user_query=lesson_text, max_results=3
            )
            
            if not relevant_docs:
                return "context not found"
            
            # Check if top result has very high confidence (skip LLM rewriting for high-confidence matches)
            # Uses final_score (re-ranked score) which combines relevance_score + term matching + metadata
            top_result = relevant_docs[0]
            top_score = top_result.get("final_score", top_result.get("relevance_score", 0.0))
            
            # High confidence threshold: if match is very strong, skip LLM rewriting
            HIGH_CONFIDENCE_THRESHOLD = 0.85
            
            if top_score >= HIGH_CONFIDENCE_THRESHOLD:
                # High confidence match - skip LLM rewriting, use top result directly
                top_chunk = top_result.get("chunk_text", "")
                if not top_chunk:
                    return "context not found"
                
                # Truncate to max_sentences (simple sentence splitting)
                sentences = top_chunk.split('. ')
                if len(sentences) > max_sentences:
                    top_chunk = '. '.join(sentences[:max_sentences]) + '.'
                
                return top_chunk
            
            # Lower confidence - proceed with LLM rewriting/refinement
            # Combine retrieved context chunks
            context_chunks = []
            for doc in relevant_docs:
                chunk_text = doc.get("chunk_text", "")
                if chunk_text:
                    context_chunks.append(chunk_text)
            
            if not context_chunks:
                return "context not found"
            
            # Combine all chunks into single context string
            combined_context = "\n\n".join(context_chunks)
            
            # Stage 2: Rewrite/refine context and check relevance using LLM
            # The LLM rewrites/refines the context to be more relevant AND checks if it's relevant at all
            validation_prompt = f"""
                You are an expert training coach preparing context from a knowledge base to augment a personalized playbook lesson. This context will be used when generating training plans to help the AI coach create better, evidence-based programs.

                **What We're Doing:**
                We have a playbook lesson (a personalized insight about a user's training preferences, constraints, or goals). We've retrieved some context from our knowledge base that might contain relevant best practices, training methodologies, or principles. Your job is to:
                1. Validate if this context is truly relevant to the lesson
                2. If relevant: Rewrite/refine it to be concise, actionable, and directly applicable to training plan generation
                3. If not relevant: Return "context not found"

                **How This Will Be Used:**
                This validated context will be included in prompts when generating training plans. The AI coach will use it alongside the playbook lesson to:
                - Understand best practices related to the user's goals/preferences
                - Apply evidence-based training principles
                - Create more effective and scientifically sound training programs
                - Avoid common mistakes and follow proven methodologies

                **Playbook Lesson:**
                {lesson_text}

                **Retrieved Context from Knowledge Base:**
                {combined_context}

                **Your Task:**
                1. **Relevance Check**: Is this context relevant to the playbook lesson? Does it provide useful best practices, training principles, or methodologies that would help create a better training plan?

                2. **If Relevant**: Rewrite/refine the context to be:
                - **Actionable**: Focus on specific, applicable training principles and best practices
                - **Concise**: Maximum {max_sentences} sentences - be selective and prioritize the most important information
                - **Directly Applicable**: Focus on information that directly helps with training plan design (volume, intensity, frequency, exercise selection, progression, recovery, etc.)
                - **Evidence-Based**: Emphasize proven methodologies and principles
                - **Plan-Focused**: Information should help the AI coach make better decisions when creating training plans

                3. **If NOT Relevant**: If the context doesn't relate to the lesson or won't help with training plan generation, return exactly: "context not found"

                **Example Good Context:**
                - "Hypertrophy training requires 3-5 sets per exercise, 6-12 reps per set, with 60-90 seconds rest. Progressive overload through volume or intensity increases is essential. Training each muscle group 2-3 times per week maximizes muscle growth."

                **Example Bad Context (too vague/general):**
                - "Exercise is good for health. People should train regularly."

                **Response:**
            """

            # Use LLM to validate
            validated_context = self.base_agent.llm.chat_text([
                {
                    "role": "system",
                    "content": "You are an expert training coach specializing in translating knowledge base content into actionable, evidence-based training principles for training plan generation. You understand how to refine technical information into concise, practical guidance that helps create effective training programs."
                },
                {"role": "user", "content": validation_prompt}
            ]).strip()
            
            # Check if validation returned "context not found"
            if validated_context.lower() == "context not found":
                return "context not found"
            
            # Limit to max_sentences
            sentences = validated_context.split('. ')
            if len(sentences) > max_sentences:
                validated_context = '. '.join(sentences[:max_sentences]) + '.'
            
            return validated_context
            
        except Exception as e:
            # Log error but return "context not found" to not break the flow
            self.logger.warning(f"Error validating context for lesson: {e}")
            return "context not found"
