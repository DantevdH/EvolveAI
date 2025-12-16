"""
RAG Service for Advanced Document Retrieval

This service provides production-grade RAG capabilities including:
- Two-stage retrieval (cosine similarity → re-ranker)
- Hybrid search (semantic + metadata filtering)
- Jina reranker (v1-tiny-en) for fast, lightweight precision
- Context validation with LLM
- Embedding generation (OpenAI/Gemini)
"""

import os
from typing import List, Dict, Any, Optional

import openai

from app.agents.base_agent import BaseAgent
from logging_config import get_logger
from settings import settings

# Use centralized environment loader (respects test environment)
try:
    from app.utils.env_loader import load_environment, is_test_environment

    load_environment()  # Will automatically skip in test environment
except ImportError:
    # Fallback if app.utils not available
    from dotenv import load_dotenv

    load_dotenv()

    # Fallback test detection
    def is_test_environment():
        return (
            os.getenv("ENVIRONMENT", "").lower() == "test"
            or os.getenv("PYTEST_CURRENT_TEST") is not None
            or "pytest" in os.getenv("_", "").lower()
            or "PYTEST" in os.environ
        )


# =============================================================================
# Re-Ranker Class (Lightweight FlagEmbedding model)
# =============================================================================

class ReRanker:
    """
    Lazy-loaded cross-encoder reranker for production-quality results.

    Default model: jinaai/jina-reranker-v1-tiny-en
    - Very lightweight: Only 33M parameters (vs 278M for bge-reranker-base)
    - Fast inference: ~248ms latency (10x faster than bge-reranker-base)
    - Handles sequences up to 8,192 tokens
    - Optimized for CPU deployment with knowledge distillation
    - Loads via sentence-transformers CrossEncoder

    Security Notes:
    - trust_remote_code=False for this model (standard HF code)
    - For production: Pre-download models during deployment (see scripts/download_models.py)
    - Consider: Using a private model registry for maximum security
    - Model is cached after first download
    """

    _model = None
    _available = None
    _logger = get_logger(__name__)
    MODEL_NAME = "jinaai/jina-reranker-v1-tiny-en"

    @classmethod
    def is_available(cls) -> bool:
        """Check if re-ranker can be loaded."""
        if cls._available is None:
            try:
                from sentence_transformers import CrossEncoder  # noqa: F401
                cls._available = True
                cls._logger.info(f"{cls.MODEL_NAME} reranker is available")
            except ImportError:
                cls._available = False
                cls._logger.warning(
                    "sentence-transformers not installed. Re-ranking disabled. "
                    "Install with: pip install sentence-transformers"
                )
        return cls._available

    @classmethod
    def _get_device(cls):
        """Use explicit override or default to CPU (safer for lightweight testing)."""
        env_device = os.getenv("RERANK_DEVICE")
        if env_device:
            return env_device
        # Default to CPU to mirror the minimal test script and avoid GPU OOMs
        return "cpu"

    @classmethod
    def get_model(cls):
        """Lazy load the re-ranker model."""
        if cls._model is None and cls.is_available():
            try:
                from sentence_transformers import CrossEncoder
                cls._logger.info(f"Loading {cls.MODEL_NAME} model (this may take a few seconds)...")
                
                # Get the appropriate device
                device = cls._get_device()
                cls._logger.debug(f"Using device: {device}")
                
                # Initialize CrossEncoder with explicit device to avoid device_map issues
                # By explicitly setting device, we prevent the library from trying to use
                # device_map which requires accelerate. The device parameter is sufficient.
                cls._model = CrossEncoder(
                    cls.MODEL_NAME,
                    trust_remote_code=False,
                    device=device,
                )
                cls._logger.info(f"{cls.MODEL_NAME} model loaded successfully")
            except Exception as e:
                # If device parameter causes issues, try without it as fallback
                if "device" in str(e).lower() or "device_map" in str(e).lower():
                    cls._logger.warning(f"Device specification failed: {e}. Trying without explicit device...")
                    try:
                        cls._model = CrossEncoder(
                            cls.MODEL_NAME,
                            trust_remote_code=False
                        )
                        cls._logger.info(f"{cls.MODEL_NAME} model loaded successfully (without explicit device)")
                    except Exception as e2:
                        cls._logger.error(f"Failed to load re-ranker model: {e2}")
                        cls._available = False
                else:
                    cls._logger.error(f"Failed to load re-ranker model: {e}")
                    cls._available = False
        return cls._model

    @classmethod
    def preload(cls):
        """Pre-load the model at application startup."""
        if cls.is_available():
            cls._logger.info(f"Pre-loading {cls.MODEL_NAME} re-ranker model at startup...")
            model = cls.get_model()
            if model is not None:
                cls._logger.info("✓ Re-ranker model pre-loaded successfully")
            else:
                cls._logger.warning("⚠ Re-ranker model pre-loading failed, will use lazy loading")
        else:
            cls._logger.info("Re-ranker not available, skipping pre-load")

    @classmethod
    def rerank(
        cls,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 5,
        text_key: str = "chunk_text"
    ) -> List[Dict[str, Any]]:
        """
        Re-rank documents using Jina lightweight reranker.

        Args:
            query: Search query
            documents: List of document dicts with chunk_text
            top_k: Number of top results to return
            text_key: Key containing text to score

        Returns:
            Top-k documents sorted by reranker score
        """
        if not documents:
            return []

        model = cls.get_model()
        if model is None:
            # Fallback: return documents as-is (already sorted by cosine similarity)
            cls._logger.debug("Re-ranker unavailable, using cosine similarity ranking")
            return documents[:top_k]

        try:
            # Create query-document pairs
            pairs = [(query, doc.get(text_key, "")) for doc in documents]

            # Predict similarity scores with CrossEncoder (compute_score not available)
            scores = model.predict(pairs)

            # Normalize scores to a flat python list to avoid numpy scalar/shape issues
            try:
                import numpy as np

                scores = np.asarray(scores).reshape(-1).tolist()
            except Exception:
                if not isinstance(scores, (list, tuple)):
                    scores = [scores]

            # Add reranker scores to documents
            for doc, score in zip(documents, scores):
                doc["rerank_score"] = float(score)

            # Sort by reranker score and return top-k
            sorted_docs = sorted(
                documents,
                key=lambda x: x.get("rerank_score", 0),
                reverse=True
            )

            cls._logger.debug(
                f"Re-ranked {len(documents)} documents. "
                f"Top score: {sorted_docs[0].get('rerank_score', 0):.3f}"
            )
            return sorted_docs[:top_k]

        except Exception as e:
            cls._logger.error(f"Re-ranking failed: {e}. Falling back to cosine similarity.")
            return documents[:top_k]


# =============================================================================
# RAG Service Class
# =============================================================================

class RAGService:
    """
    Advanced RAG service for document retrieval and context augmentation.

    Implements a two-stage retrieval pipeline:
    1. Cosine similarity search → top-20 candidates (high recall)
    2. Jina reranker → top-5 results (high precision)
    """

    # Configuration constants
    CANDIDATE_POOL_SIZE = 20  # Number of candidates for re-ranking

    def __init__(self, base_agent: BaseAgent):
        """
        Initialize RAG service with a base agent.

        Args:
            base_agent: The specialist agent using this service
        """
        self.base_agent = base_agent
        self.logger = get_logger(__name__)
        self._init_embedding_clients()

    def _init_embedding_clients(self):
        """Initialize embedding clients based on provider."""
        # Determine provider from model name
        model_name = settings.LLM_MODEL_COMPLEX
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
        api_key = settings.LLM_API_KEY
        if not api_key:
            if is_test_environment():
                self.logger.warning(
                    "LLM_API_KEY not found in test environment. "
                    "Tests should mock RAGService or set test API key."
                )
                self.openai_client = None
                self.gemini_client = None
                return
            else:
                raise ValueError("LLM_API_KEY not found in environment variables")

        if self.use_gemini:
            from google import genai  # type: ignore
            self.gemini_client = genai.Client(api_key=api_key)
            self.openai_client = None
        else:
            self.openai_client = openai.OpenAI(api_key=api_key)
            self.gemini_client = None

    # =========================================================================
    # Embedding Generation
    # =========================================================================

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using OpenAI or Gemini.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        try:
            if self.use_gemini:
                return self._generate_gemini_embedding(text)
            else:
                return self._generate_openai_embedding(text)
        except Exception as e:
            self.logger.error(f"Error generating embedding: {e}")
            return []

    def _generate_gemini_embedding(self, text: str) -> List[float]:
        """Generate embedding using Gemini."""
        if self.gemini_client is None:
            return []

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

    def _generate_openai_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI."""
        if self.openai_client is None:
            return []
        response = self.openai_client.embeddings.create(
            model=self.embedding_model, input=text
        )
        return response.data[0].embedding

    # =========================================================================
    # Vector Search (Stage 1: High Recall)
    # =========================================================================

    def search_knowledge_base(
        self,
        query: str,
        max_results: int = 20,
        metadata_filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search knowledge base using cosine similarity.

        This is Stage 1 of the two-stage retrieval pipeline.
        Returns top candidates for re-ranking.

        Args:
            query: User's search query
            max_results: Maximum number of results to return (default: 20 for re-ranking)
            metadata_filters: Optional metadata filters (currently unused, reserved for future)

        Returns:
            List of relevant documents sorted by cosine similarity
        """
        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query)
            if not query_embedding:
                self.logger.error("Failed to generate query embedding")
                return []

            self.logger.debug(f"Query embedding generated: {len(query_embedding)} dimensions")

            # Preferred: perform vector similarity directly in the database (fast + indexed)
            try:
                rpc_payload = {
                    "query_embedding": query_embedding,
                    "match_count": max_results,
                    # must match SQL signature: match_document_chunks(query_embedding, match_count, p_topic)
                    "p_topic": self.base_agent.topic,
                }
                rpc_response = (
                    self.base_agent.supabase.rpc("match_document_chunks", rpc_payload).execute()
                )
                if rpc_response.data:
                    self.logger.debug(
                        f"Vector search RPC returned {len(rpc_response.data)} rows (limit {max_results})"
                    )
                    return [
                        {
                            "chunk_text": row.get("chunk_text", ""),
                            "chunk_index": row.get("chunk_index"),
                            "document_title": row.get("document_title"),
                            "document_keywords": row.get("document_keywords", []),
                            "relevance_score": float(row.get("similarity", 0.0)),
                            "document_id": row.get("document_id"),
                        }
                        for row in rpc_response.data
                    ]
            except Exception as rpc_error:
                self.logger.warning(
                    f"Vector search RPC failed ({rpc_error}), falling back to client-side search"
                )

            # Fallback: client-side cosine similarity (may be slower)
            docs_query = (
                self.base_agent.supabase.table("documents")
                .select("id, title, content, topic, keywords")
                .eq("topic", self.base_agent.topic)
            )

            docs_response = docs_query.execute()
            if not docs_response.data:
                self.logger.warning(
                    f"No documents found for topic '{self.base_agent.topic}'"
                )
                return []

            matching_doc_ids = [doc["id"] for doc in docs_response.data]

            # Get embeddings for matching documents (apply a hard cap to reduce load)
            embeddings_response = (
                self.base_agent.supabase.table("document_embeddings")
                .select("id, chunk_text, chunk_index, embedding, document_id")
                .in_("document_id", matching_doc_ids)
                .limit(max_results * 50)  # cap to avoid timeouts in fallback path
                .execute()
            )

            if not embeddings_response.data:
                self.logger.warning("No embeddings found for matching documents")
                return []

            # Calculate similarity scores
            results = []
            for embedding_data in embeddings_response.data:
                if not embedding_data.get("embedding"):
                    continue

                # Parse embedding
                embedding_vector = self._parse_embedding(embedding_data["embedding"])
                if not embedding_vector:
                    continue

                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_embedding, embedding_vector)

                # Get document info
                doc_info = next(
                    (doc for doc in docs_response.data
                     if doc["id"] == embedding_data["document_id"]),
                    None,
                )

                if doc_info:
                    results.append({
                        "chunk_text": embedding_data["chunk_text"],
                        "chunk_index": embedding_data["chunk_index"],
                        "document_title": doc_info["title"],
                        "document_keywords": doc_info.get("keywords", []),
                        "relevance_score": similarity,
                        "document_id": embedding_data["document_id"],
                    })

            # Sort by relevance score
            results.sort(key=lambda x: x["relevance_score"], reverse=True)

            # Return top results (no cosine cutoff)
            return results[:max_results]

        except Exception as e:
            self.logger.error(f"Error searching knowledge base: {e}")
            return []

    def _parse_embedding(self, embedding: Any) -> List[float]:
        """Parse embedding from database (may be string or list)."""
        if isinstance(embedding, str):
            try:
                import json
                parsed = json.loads(embedding)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, ValueError):
                return []
        return embedding if isinstance(embedding, list) else []

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np

            vec1_array = np.array(vec1).reshape(1, -1)
            vec2_array = np.array(vec2).reshape(1, -1)
            return float(cosine_similarity(vec1_array, vec2_array)[0][0])

        except ImportError:
            # Fallback calculation
            if not vec1 or not vec2 or len(vec1) != len(vec2):
                return 0.0

            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm_a = sum(a * a for a in vec1) ** 0.5
            norm_b = sum(b * b for b in vec2) ** 0.5

            if norm_a == 0 or norm_b == 0:
                return 0.0
            return dot_product / (norm_a * norm_b)

        except Exception:
            return 0.0

    # =========================================================================
    # Hybrid Search with Re-Ranking (Two-Stage Pipeline)
    # =========================================================================

    def perform_hybrid_search(
        self, user_query: str, max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Two-stage retrieval: cosine similarity → Jina reranker.

        Stage 1: Get top-20 candidates via cosine similarity (high recall)
        Stage 2: Re-rank with Jina reranker to get top-5 (high precision)

        Args:
            user_query: User's search query
            max_results: Maximum number of final results (default: 5)

        Returns:
            List of top documents after re-ranking
        """
        # Step 1: Extract metadata filters from query
        metadata_filters = self.extract_metadata_filters(user_query)
        self.logger.debug(f"Extracted metadata filters: {metadata_filters}")

        # Step 2: Get top-20 candidates via cosine similarity
        candidates = self.search_knowledge_base(
            query=user_query,
            max_results=self.CANDIDATE_POOL_SIZE,
            metadata_filters=metadata_filters
        )

        # Fallback to broader search if too few results
        if len(candidates) < 3:
            self.logger.debug(f"Only {len(candidates)} candidates, trying broader search")
            broader_results = self.search_knowledge_base(
                query=user_query,
                max_results=self.CANDIDATE_POOL_SIZE,
                metadata_filters=None
            )
            # Merge and deduplicate
            seen_ids = {c.get("document_id") for c in candidates}
            for result in broader_results:
                if result.get("document_id") not in seen_ids:
                    candidates.append(result)
                    seen_ids.add(result.get("document_id"))

        # Step 3: Re-rank with Jina reranker
        if len(candidates) > max_results:
            self.logger.debug(f"Re-ranking {len(candidates)} candidates to top-{max_results}")
            candidates = ReRanker.rerank(user_query, candidates, top_k=max_results)

        return candidates[:max_results]

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
            "intermediate": ["intermediate", "some experience", "moderate", "progressed"],
            "advanced": ["advanced", "experienced", "expert", "pro", "seasoned"],
        }

        for level, patterns in difficulty_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                filters["difficulty_level"] = level
                break

        # Body part detection
        body_part_patterns = {
            "legs": ["legs", "leg", "quad", "hamstring", "calf", "glute", "squat", "deadlift"],
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
            "strength_training": ["strength", "power", "muscle", "hypertrophy", "bodybuilding"],
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

    # =========================================================================
    # Context Validation (for Playbook Enrichment)
    # =========================================================================

    def validate_and_retrieve_context(
        self, lesson_text: str, max_sentences: int = 10
    ) -> str:
        """
        Retrieve and validate context for a playbook lesson.

        Uses two-stage retrieval (cosine + re-ranker) then LLM validation.

        Args:
            lesson_text: The playbook lesson text
            max_sentences: Maximum sentences in context (default: 10)

        Returns:
            Validated context or "context not found"
        """
        try:
            # Stage 1: Retrieve top candidates via hybrid search
            relevant_docs = self.perform_hybrid_search(
                user_query=lesson_text, max_results=3
            )

            if not relevant_docs:
                return "context not found"

            # Stage 2: LLM validation and rewriting
            context_chunks = [
                doc.get("chunk_text", "")
                for doc in relevant_docs
                if doc.get("chunk_text")
            ]

            if not context_chunks:
                return "context not found"

            combined_context = "\n\n".join(context_chunks)

            # Validate and refine with LLM
            validated_context = self._validate_context_with_llm(
                lesson_text, combined_context, max_sentences
            )

            return validated_context

        except Exception as e:
            self.logger.warning(f"Error validating context: {e}")
            return "context not found"

    def _validate_context_with_llm(
        self, lesson_text: str, combined_context: str, max_sentences: int
    ) -> str:
        """
        Use LLM to validate and refine retrieved context.

        Args:
            lesson_text: The playbook lesson
            combined_context: Combined context from retrieval
            max_sentences: Maximum sentences to return

        Returns:
            Validated/refined context or "context not found"
        """
        validation_prompt = f"""
        You are an expert training coach who turns knowledge-base evidence into a cohesive, directive mini-brief that an AI coach will use to build a training plan.

        Goal: Decide if the retrieved context truly helps apply the playbook lesson. If useful, return a short story-like coaching note (not bullets) that explains how to incorporate the context into a plan; if not, return exactly "context not found".

        Inputs:
        - Playbook lesson (user-specific preference, constraint, or goal)
        - Retrieved context (candidate evidence/best practices)

        Steps:
        1) Relevance: If the retrieved context does not clearly support the playbook lesson, return "context not found".
        2) If relevant, write at most {max_sentences} sentences that:
           - Read as a connected narrative (no bullets) that flows from goal/constraint to specific actions
           - Start with action-oriented guidance and link elements to each other (e.g., how volume ties to recovery, how exercise choices align with constraints, how progression adjusts intensity/frequency)
           - Are specific about volume, intensity, frequency, exercise selection, progression, recovery, and safety modifications where applicable
           - Tie guidance back to the playbook lesson without restating it verbatim
           - Remain evidence-grounded with no filler or disclaimers
        3) Do not invent new assumptions. Keep sentences concise and directive while maintaining cohesion.

        Playbook Lesson:
        {lesson_text}

        Retrieved Context:
        {combined_context}

        Response:"""

        validated_context = self.base_agent.llm.chat_text([
            {
                "role": "system",
                "content": "You are an expert training coach. Output a concise, narrative coaching note (no bullets) that links actions together and guides plan construction; omit filler."
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

    # =========================================================================
    # Response Generation (Used by InterviewAgent)
    # =========================================================================

    def generate_response(
        self, 
        user_query: str, 
        context_documents: List[Dict[str, Any]], 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a response using retrieved context and best-practice prompt.

        Used by InterviewAgent for answering training questions from chat interface.

        Args:
            user_query: User's original query
            context_documents: Retrieved relevant documents from knowledge base
            context: Additional context dictionary with:
                - training_plan: Full training plan (optional)
                - current_week: Current week data (optional)
                - playbook: User playbook with context (optional)
                - personal_info: PersonalInfo object (optional)

        Returns:
            Generated response with context and citations
        """
        try:
            from app.helpers.prompts.question_prompts import generate_rag_answer_prompt
            
            # Extract context components
            current_week = context.get("current_week") if context else None
            playbook = context.get("playbook") if context else None
            personal_info = context.get("personal_info") if context else None
            conversation_history = context.get("conversation_history") if context else None
            
            # Generate prompt using best practices
            prompt = generate_rag_answer_prompt(
                user_query=user_query,
                context_documents=context_documents,
                current_week=current_week,
                playbook=playbook,
                personal_info=personal_info,
                conversation_history=conversation_history,
            )
            
            agent_name = self.base_agent.agent_name
            
            content = self.base_agent.llm.chat_text(
                [
                    {
                        "role": "system",
                        "content": f"You are {agent_name}, an expert training coach. Use your specialized knowledge base and the provided context to provide accurate, evidence-based responses."
                    },
                    {"role": "user", "content": prompt},
                ],
                model_type="complex",
            )
            return content

        except Exception as e:
            self.logger.error(f"Error generating response: {e}")
            return "I apologize, but I encountered an error. Please try again."

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
                    ---
                """
            )

        return "\n".join(context_parts)
