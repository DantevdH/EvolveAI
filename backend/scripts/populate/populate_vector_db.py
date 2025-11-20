#!/usr/bin/env python3
"""
Vector Database Population Script for EvolveAI - PDFs Only

This script populates the Supabase vector database by processing PDF files.
Optimized for PDF processing with enhanced text extraction and metadata handling.
"""

import os
import sys
import argparse
import re
import time
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import openai
import PyPDF2
from supabase import create_client, Client
from dotenv import load_dotenv
from settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class PDFVectorDBPopulator:
    """Handles population of the vector database with PDF documents."""

    def __init__(self):
        """Initialize the PDF vector database populator."""
        self._validate_environment()
        self._initialize_clients()
        provider = "Gemini" if self.use_gemini else "OpenAI"
        logger.info(f"✅ Connected to Supabase and {provider}")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        # Use settings (which reads from environment dynamically)
        llm_api_key = settings.LLM_API_KEY
        if not llm_api_key:
            raise ValueError(
                "Missing required environment variable: LLM_API_KEY"
            )
        
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_ANON_KEY

        missing_vars = []
        if not supabase_url:
            missing_vars.append("SUPABASE_URL")
        if not supabase_key:
            missing_vars.append("SUPABASE_ANON_KEY")

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

    def _initialize_clients(self):
        """Initialize Supabase and embedding clients (OpenAI or Gemini)."""
        # Use settings (which reads from environment dynamically)
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_ANON_KEY
        
        # Determine provider from Settings (unified LLM configuration)
        model_name = settings.LLM_MODEL_COMPLEX
        self.use_gemini = model_name.lower().startswith("gemini")
        
        # Get embedding model from env var (default based on provider)
        # Note: EMBEDDING_MODEL is not in Settings, so keep os.getenv() for this
        if self.use_gemini:
            self.embedding_model = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
            # Ensure model name has "models/" prefix if not present
            if not self.embedding_model.startswith("models/"):
                self.embedding_model = f"models/{self.embedding_model}"
        else:
            self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        
        # Get API key - use settings
        api_key = settings.LLM_API_KEY
        if not api_key:
            raise ValueError("Missing required environment variable: LLM_API_KEY")

        # Initialize clients
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        if self.use_gemini:
            from google import genai  # type: ignore
            self.gemini_client = genai.Client(api_key=api_key)
            self.openai_client = None
            logger.info(f"✅ Using Gemini embeddings ({self.embedding_model} with 1536 dimensions)")
        else:
            self.openai_client = openai.OpenAI(api_key=api_key)
            self.gemini_client = None
            logger.info(f"✅ Using OpenAI embeddings ({self.embedding_model})")

    def chunk_text(
        self, text: str, chunk_size: int = 1200, overlap: int = 200, 
        preserve_sentences: bool = True, preserve_paragraphs: bool = True
    ) -> List[str]:
        """
        Split text into semantic chunks with sentence/paragraph awareness.
        
        This strategy is optimized for fitness documentation where:
        - Similar concepts (strength training) appear in different contexts (football, hockey, general)
        - Context preservation is critical to avoid mixing sport-specific advice
        - Larger chunks help maintain full concepts and outcomes
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters (default: 1200)
            overlap: Overlap size in characters (default: 200)
            preserve_sentences: If True, don't split mid-sentence
            preserve_paragraphs: If True, prefer paragraph boundaries
            
        Returns:
            List of text chunks
        """
        if not text.strip():
            return []

        # Step 1: Split into paragraphs first (preserves larger context)
        if preserve_paragraphs:
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        else:
            paragraphs = [text]
        
        chunks = []
        current_chunk = []
        current_size = 0
        
        for para in paragraphs:
            # If preserving sentences, split paragraph into sentences
            if preserve_sentences:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                sentences = [s.strip() for s in sentences if s.strip()]
            else:
                sentences = [para]
            
            for sentence in sentences:
                sentence_len = len(sentence)
                
                # If adding this sentence would exceed chunk size, finalize current chunk
                if current_size + sentence_len > chunk_size and current_chunk:
                    # Join current chunk and add it
                    chunk_text = ' '.join(current_chunk).strip()
                    if chunk_text:
                        chunks.append(chunk_text)
                    
                    # Start new chunk with overlap: take last sentences from previous chunk
                    overlap_text = ' '.join(current_chunk[-3:]) if len(current_chunk) >= 3 else current_chunk[-1] if current_chunk else ""
                    overlap_len = len(overlap_text)
                    
                    # Start new chunk with overlap (last few sentences)
                    if overlap_len <= overlap:
                        current_chunk = [overlap_text, sentence] if overlap_text else [sentence]
                        current_size = overlap_len + sentence_len
                    else:
                        # Overlap too large, just start fresh
                        current_chunk = [sentence]
                        current_size = sentence_len
                else:
                    # Add sentence to current chunk
                    current_chunk.append(sentence)
                    current_size += sentence_len + 1  # +1 for space
            
            # After processing paragraph, add paragraph break if chunk is getting large
            if current_size > chunk_size * 0.8 and current_chunk:  # 80% of target size
                chunk_text = ' '.join(current_chunk).strip()
                if chunk_text:
                    chunks.append(chunk_text)
                current_chunk = []
                current_size = 0
        
        # Add remaining chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)
        
        # If no chunks created (unlikely), fall back to simple chunking
        if not chunks:
            return self._simple_chunk_text(text, chunk_size, overlap)
        
        return chunks
    
    def _simple_chunk_text(
        self, text: str, chunk_size: int = 1000, overlap: int = 200
    ) -> List[str]:
        """Fallback simple character-based chunking."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap
            if start >= len(text):
                break
        return chunks

    def _generate_single_embedding(self, text: str, index: int) -> tuple[int, List[float]]:
        """Generate a single embedding with retry logic."""
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                if self.use_gemini:
                    from google.genai import types
                    
                    # Try with EmbedContentConfig first (most reliable)
                    try:
                        config = types.EmbedContentConfig(output_dimensionality=1536)
                        response = self.gemini_client.models.embed_content(
                            model=self.embedding_model,
                            contents=[{"role": "user", "parts": [{"text": text}]}],
                            config=config
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
                    
                    # Validate dimensions
                    if embedding and len(embedding) != 1536:
                        if attempt < max_retries - 1:
                            logger.warning(f"Chunk {index}: got {len(embedding)} dimensions, retrying...")
                            time.sleep(retry_delay)
                            continue
                        else:
                            logger.error(f"Chunk {index}: wrong dimensions ({len(embedding)}), skipping")
                            return (index, [])
                    
                    return (index, embedding if embedding else [])
                else:
                    # OpenAI embedding API
                    response = self.openai_client.embeddings.create(
                        model=self.embedding_model, input=text
                    )
                    return (index, response.data[0].embedding)
                    
            except Exception as e:
                if "rate_limit" in str(e).lower() or "too_many_requests" in str(e).lower():
                    wait_time = retry_delay * (2 ** attempt)
                    if attempt < max_retries - 1:
                        time.sleep(wait_time)
                        continue
                elif attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                else:
                    logger.warning(f"Failed to generate embedding for chunk {index} after {max_retries} attempts: {e}")
                    return (index, [])
        
        return (index, [])

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks with parallel processing for speed."""
        if not texts:
            return []

        logger.info(f"Generating embeddings for {len(texts)} chunks (using parallel processing)")
        
        # Use parallel processing for Gemini (OpenAI already batches efficiently)
        if self.use_gemini:
            # Process in parallel with thread pool (max 20 concurrent requests)
            max_workers = min(20, len(texts))
            all_embeddings = [None] * len(texts)
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all embedding tasks
                future_to_index = {
                    executor.submit(self._generate_single_embedding, text, i): i
                    for i, text in enumerate(texts)
                }
                
                # Collect results as they complete
                completed = 0
                for future in as_completed(future_to_index):
                    try:
                        index, embedding = future.result()
                        all_embeddings[index] = embedding
                        completed += 1
                        if completed % 50 == 0:
                            logger.info(f"   Progress: {completed}/{len(texts)} embeddings generated")
                    except Exception as e:
                        index = future_to_index[future]
                        logger.error(f"Error generating embedding for chunk {index}: {e}")
                        all_embeddings[index] = []
            
            logger.info(f"✅ Successfully generated {len([e for e in all_embeddings if e])} embeddings")
            return all_embeddings
        else:
            # OpenAI: use batch API (already efficient)
            batch_size = 50  # Increased batch size for OpenAI
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                try:
                    response = self.openai_client.embeddings.create(
                        model=self.embedding_model, input=batch
                    )
                    batch_embeddings = [
                        embedding.embedding for embedding in response.data
                    ]
                    all_embeddings.extend(batch_embeddings)
                    
                    if (i // batch_size + 1) % 10 == 0:
                        logger.info(f"   Progress: {i + len(batch)}/{len(texts)} embeddings generated")
                    
                    # Minimal delay for OpenAI
                    if i + batch_size < len(texts):
                        time.sleep(0.1)
                        
                except Exception as e:
                    logger.error(f"Error generating embeddings batch {i//batch_size + 1}: {e}")
                    # Add empty embeddings for failed batch
                    all_embeddings.extend([[]] * len(batch))
            
            return all_embeddings

    def process_pdf(self, pdf_path: str) -> Optional[Dict[str, Any]]:
        """Process a PDF file and extract text content with enhanced extraction."""
        try:
            pdf_path = Path(pdf_path)
            if not pdf_path.exists():
                logger.error(f"PDF file not found: {pdf_path}")
                return None

            # Try multiple PDF extraction methods
            text_content = self._extract_pdf_text_enhanced(pdf_path)

            if not text_content.strip():
                logger.warning(f"PDF contains no extractable text: {pdf_path}")
                return None

            # Clean and normalize text
            cleaned_text = self._clean_text_content(text_content)

            # Generate a title from filename
            title = pdf_path.stem.replace("_", " ").title()

            # Create document object with enhanced metadata
            document = {
                "title": title,
                "content": cleaned_text,
                "content_type": "pdf",
                "topic": self._detect_topic(cleaned_text),
                "keywords": self._extract_keywords(cleaned_text),
            }

            logger.info(f"Processed PDF: {title} ({len(cleaned_text)} characters)")
            return document

        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            return None

    def _extract_pdf_text_enhanced(self, pdf_path: Path) -> str:
        """Try multiple methods to extract PDF text."""
        # Method 1: PyPDF2
        try:
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
            if text_content.strip():
                return text_content
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {e}")

        # Method 2: Try pdfplumber if available
        try:
            import pdfplumber

            with pdfplumber.open(pdf_path) as pdf:
                text_content = ""
                for page in pdf.pages:
                    text_content += page.extract_text() + "\n"
            if text_content.strip():
                return text_content
        except ImportError:
            logger.info("pdfplumber not available, skipping")
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")

        # Method 3: Try pymupdf if available
        try:
            import fitz  # pymupdf

            doc = fitz.open(pdf_path)
            text_content = ""
            for page in doc:
                text_content += page.get_text() + "\n"
            doc.close()
            if text_content.strip():
                return text_content
        except ImportError:
            logger.info("pymupdf not available, skipping")
        except Exception as e:
            logger.warning(f"pymupdf extraction failed: {e}")

        return ""

    def _clean_text_content(self, text: str) -> str:
        """Clean and normalize extracted text."""
        # Remove excessive whitespace
        text = re.sub(r"\n\s*\n", "\n\n", text)
        text = re.sub(r" +", " ", text)
        # Remove common PDF artifacts
        text = re.sub(r"[^\w\s\.\,\;\:\!\?\-\(\)]", " ", text)
        # Normalize line breaks
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        return text.strip()

    def _extract_keywords(self, text: str, max_keywords: int = 15) -> List[str]:
        """Extract keywords using TF-IDF analysis."""
        if not text or not text.strip():
            return []

        try:
            from sklearn.feature_extraction.text import TfidfVectorizer

            # Clean and preprocess text
            cleaned_text = re.sub(r"[^\w\s]", " ", text.lower())
            words = cleaned_text.split()

            # Filter out very short words and common stop words
            stop_words = {
                "the",
                "and",
                "or",
                "but",
                "in",
                "on",
                "at",
                "to",
                "for",
                "of",
                "with",
                "by",
                "is",
                "are",
                "was",
                "were",
                "be",
                "been",
                "being",
                "have",
                "has",
                "had",
                "do",
                "does",
                "did",
                "will",
                "would",
                "could",
                "should",
                "may",
                "might",
                "can",
                "this",
                "that",
                "these",
                "those",
                "a",
                "an",
                "as",
                "from",
            }

            # Filter words
            filtered_words = [
                word
                for word in words
                if len(word) >= 3 and word not in stop_words and not word.isdigit()
            ]

            if len(filtered_words) < 5:
                return []

            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=100,
                min_df=1,
                max_df=1.0,
                ngram_range=(1, 2),
                stop_words="english",
            )

            # Fit and transform the text
            tfidf_matrix = vectorizer.fit_transform([cleaned_text])
            feature_names = vectorizer.get_feature_names_out()

            # Get TF-IDF scores
            tfidf_scores = tfidf_matrix.toarray()[0]

            # Create (score, feature) pairs and sort by score
            feature_scores = list(zip(tfidf_scores, feature_names))
            feature_scores.sort(reverse=True)

            # Extract top keywords
            keywords = []
            for score, feature in feature_scores:
                if score > 0 and len(keywords) < max_keywords:
                    clean_feature = " ".join(feature.split())
                    if clean_feature not in keywords:
                        keywords.append(clean_feature)

            return keywords

        except ImportError:
            logger.error("scikit-learn is required for keyword extraction")
            raise
        except Exception as e:
            logger.error(f"TF-IDF analysis failed: {e}")
            raise

    def _detect_topic(self, text: str) -> str:
        """Detect topic based on content keywords."""
        if not text or not text.strip():
            return "general"

        text_lower = text.lower()

        # Enhanced topic keywords with weighted scoring
        topic_keywords = {
            "training": [
                "training",
                "exercise",
                "strength",
                "muscle",
                "cardio",
                "gym",
                "lifting",
                "squat",
                "bench",
                "deadlift",
                "push-up",
                "pull-up",
                "reps",
                "sets",
                "routine",
                "program",
                "plan",
                "bodybuilding",
                "powerlifting",
            ],
            "nutrition": [
                "nutrition",
                "diet",
                "food",
                "meal",
                "protein",
                "carbohydrate",
                "vitamin",
                "calories",
                "macros",
                "supplements",
                "vitamins",
                "minerals",
                "eating",
            ],
            "running": [
                "running",
                "cardio",
                "endurance",
                "marathon",
                "sprint",
                "jogging",
                "race",
                "pace",
                "distance",
                "speed",
                "stamina",
                "aerobic",
                "track",
            ],
            "physiotherapy": [
                "injury",
                "recovery",
                "physio",
                "therapy",
                "rehabilitation",
                "pain",
                "mobility",
                "flexibility",
                "stretching",
                "massage",
                "treatment",
            ],
        }

        # Calculate topic scores
        topic_scores = {}
        for topic, keywords in topic_keywords.items():
            score = 0
            for keyword in keywords:
                count = text_lower.count(keyword)
                if count > 0:
                    score += count * 2
                    if len(keyword) > 6:
                        score += 1

            topic_scores[topic] = score

        # Find the best topic
        if topic_scores:
            best_topic = max(topic_scores, key=topic_scores.get)
            best_score = topic_scores[best_topic]

            if best_score >= 2:
                return best_topic

        return "general"

    def populate_database(self, documents: List[Dict[str, Any]]) -> bool:
        """Populate the database with documents and their embeddings."""
        if not documents:
            logger.warning("No documents to process")
            return False

        success_count = 0
        total_count = len(documents)

        for doc in documents:
            try:
                logger.info(f"�� Processing: {doc['title']}")

                # Insert document
                doc_response = self.supabase.table("documents").insert(doc).execute()
                doc_id = doc_response.data[0]["id"]

                # Chunk the content
                chunks = self.chunk_text(doc["content"])
                if not chunks:
                    logger.warning(f"No chunks created for: {doc['title']}")
                    continue

                logger.info(f"   Created {len(chunks)} chunks")

                # Generate embeddings for chunks
                embeddings = self.generate_embeddings(chunks)

                if not embeddings:
                    logger.error(
                        f"   ⚠️  Skipping document due to embedding generation failure"
                    )
                    continue

                # Prepare chunk data and validate embeddings
                chunk_data = []
                skipped_count = 0
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    # Validate embedding dimensions before adding
                    if not embedding or len(embedding) == 0:
                        logger.warning(f"   ⚠️  Skipping chunk {i}: empty embedding")
                        skipped_count += 1
                        continue
                    
                    if len(embedding) != 1536:
                        logger.error(
                            f"   ❌ Skipping chunk {i}: wrong dimensions ({len(embedding)} instead of 1536)"
                        )
                        skipped_count += 1
                        continue
                    
                    chunk_data.append(
                        {
                            "document_id": doc_id,
                            "chunk_index": i,
                            "chunk_text": chunk,
                            "embedding": embedding,
                        }
                    )
                
                if skipped_count > 0:
                    logger.warning(f"   ⚠️  Skipped {skipped_count} chunks due to invalid embeddings")
                
                if not chunk_data:
                    logger.error(f"   ❌ No valid chunks to insert for document {doc['title']}")
                    continue

                # Insert chunks with embeddings in batches to avoid SSL timeouts
                db_batch_size = 100  # Insert 100 chunks at a time
                total_inserted = 0
                for i in range(0, len(chunk_data), db_batch_size):
                    batch = chunk_data[i:i + db_batch_size]
                    try:
                        self.supabase.table("document_embeddings").insert(batch).execute()
                        total_inserted += len(batch)
                        if (i // db_batch_size + 1) % 10 == 0:
                            logger.info(f"   ✅ Inserted {total_inserted}/{len(chunk_data)} chunks")
                    except Exception as batch_error:
                        logger.error(f"   ⚠️  Error inserting batch {i//db_batch_size + 1}: {batch_error}")
                        # Retry once with delay
                        time.sleep(0.5)
                        try:
                            self.supabase.table("document_embeddings").insert(batch).execute()
                            total_inserted += len(batch)
                            logger.info(f"   ✅ Retry successful for batch {i//db_batch_size + 1}")
                        except Exception as retry_error:
                            logger.error(f"   ❌ Retry failed, skipping batch {i//db_batch_size + 1}: {retry_error}")
                            continue
                
                logger.info(f"   ✅ Stored {total_inserted}/{len(chunks)} chunks with embeddings")
                success_count += 1

            except Exception as e:
                logger.error(f"❌ Error processing document {doc['title']}: {e}")
                continue

        logger.info(
            f"📊 Processing complete: {success_count}/{total_count} documents successful"
        )
        return success_count > 0

    def process_pdf_directory(self, pdf_dir: str) -> bool:
        """Process all PDF files in a directory."""
        pdf_path = Path(pdf_dir)
        if not pdf_path.exists() or not pdf_path.is_dir():
            logger.error(f"PDF directory not found: {pdf_dir}")
            return False

        # Find all PDF files
        pdf_files = list(pdf_path.glob("*.pdf"))

        if not pdf_files:
            logger.warning(f"No PDF files found in {pdf_dir}")
            return False

        logger.info(f"📁 Found {len(pdf_files)} PDF files to process in {pdf_dir}")

        # Process files
        documents = []
        for pdf_file in pdf_files:
            doc = self.process_pdf(str(pdf_file))
            if doc:
                documents.append(doc)

        # Populate database
        if documents:
            return self.populate_database(documents)
        else:
            logger.warning("No documents were successfully processed")
            return False

    def process_single_pdf(self, pdf_path: str) -> bool:
        """Process a single PDF file."""
        pdf_path = Path(pdf_path)

        if not pdf_path.exists():
            logger.error(f"PDF file not found: {pdf_path}")
            return False

        if pdf_path.suffix.lower() != ".pdf":
            logger.error(f"File is not a PDF: {pdf_path}")
            return False

        document = self.process_pdf(str(pdf_path))

        if document:
            return self.populate_database([document])
        else:
            return False


def main():
    """Main function to run the PDF population script."""
    parser = argparse.ArgumentParser(
        description="Populate Supabase vector database with PDF documents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python populate_vector_db.py --mode=directory --pdf-dir=./data/pdf
  python populate_vector_db.py --mode=file --pdf-path=./data/document.pdf
        """,
    )

    parser.add_argument(
        "--mode",
        choices=["directory", "file"],
        default="directory",
        help="Processing mode",
    )
    parser.add_argument("--pdf-dir", help="Directory containing PDF files to process")
    parser.add_argument("--pdf-path", help="Path to single PDF file to process")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        populator = PDFVectorDBPopulator()

        success = False

        if args.mode == "directory":
            if not args.pdf_dir:
                logger.error("PDF directory required for directory mode")
                sys.exit(1)
            success = populator.process_pdf_directory(args.pdf_dir)

        elif args.mode == "file":
            if not args.pdf_path:
                logger.error("PDF path required for file mode")
                sys.exit(1)
            success = populator.process_single_pdf(args.pdf_path)

        if success:
            logger.info("✅ PDF processing completed successfully!")
        else:
            logger.error("❌ PDF processing failed!")
            sys.exit(1)

    except Exception as e:
        logger.error(f"❌ Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
