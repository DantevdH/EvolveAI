#!/usr/bin/env python3
"""
Vector Database Population Script for EvolveAI - PDFs Only

This script populates the Supabase vector database by processing PDF files.
Optimized for PDF processing with enhanced text extraction and metadata handling.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
import openai
from supabase import create_client, Client
from dotenv import load_dotenv
import PyPDF2
import hashlib
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
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
        logger.info("✅ Connected to Supabase and OpenAI")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        required_vars = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY")
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def _initialize_clients(self):
        """Initialize Supabase and OpenAI clients."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        # Initialize clients
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.openai_client = openai.OpenAI(api_key=self.openai_api_key)

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks for better vector search."""
        if not text.strip():
            return []
            
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

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate OpenAI embeddings for text chunks with retry logic and batch processing."""
        if not texts:
            return []
        
        # Process in smaller batches to avoid rate limits
        batch_size = 10
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            max_retries = 3
            retry_delay = 1
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Generating embeddings for batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size} ({len(batch)} chunks)")
                    
                    response = self.openai_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=batch
                    )
                    
                    batch_embeddings = [embedding.embedding for embedding in response.data]
                    all_embeddings.extend(batch_embeddings)
                    
                    logger.info(f"✅ Successfully generated {len(batch_embeddings)} embeddings")
                    
                    # Small delay between batches to avoid rate limits
                    if i + batch_size < len(texts):
                        time.sleep(0.5)
                    
                    break  # Success, exit retry loop
                    
                except Exception as e:
                    if "rate_limit" in str(e).lower() or "too_many_requests" in str(e).lower():
                        wait_time = retry_delay * (2 ** attempt)
                        logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                        time.sleep(wait_time)
                    elif attempt < max_retries - 1:
                        logger.warning(f"Embedding generation failed (attempt {attempt + 1}/{max_retries}): {e}")
                        time.sleep(retry_delay)
                    else:
                        logger.error(f"Failed to generate embeddings after {max_retries} attempts: {e}")
                        return []
        
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
            title = pdf_path.stem.replace('_', ' ').title()
            
            # Create document object with enhanced metadata
            document = {
                "title": title,
                "content": cleaned_text,
                "content_type": "pdf",
                "topic": self._detect_topic(cleaned_text),
                "keywords": self._extract_keywords(cleaned_text),
                "file_size": pdf_path.stat().st_size,
                "extraction_method": "enhanced",
                "metadata": {
                    "difficulty_level": self._detect_difficulty(cleaned_text),
                    "body_parts": self._extract_body_parts(cleaned_text),
                    "equipment_needed": self._extract_equipment(cleaned_text),
                    "training_type": self._extract_training_type(cleaned_text),
                    "target_goals": self._extract_goals(cleaned_text),
                    "experience_required": self._extract_experience(cleaned_text)
                }
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
            with open(pdf_path, 'rb') as file:
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
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Remove common PDF artifacts
        text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)]', ' ', text)
        
        # Normalize line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        return text.strip()

    def _extract_keywords(self, text: str, max_keywords: int = 15) -> List[str]:
        """Extract keywords using TF-IDF analysis."""
        if not text or not text.strip():
            return []
        
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            import re
            
            # Clean and preprocess text
            cleaned_text = re.sub(r'[^\w\s]', ' ', text.lower())
            words = cleaned_text.split()
            
            # Filter out very short words and common stop words
            stop_words = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
                'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
                'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
                'might', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'as', 'from'
            }
            
            # Filter words
            filtered_words = [word for word in words if len(word) >= 3 and word not in stop_words and not word.isdigit()]
            
            if len(filtered_words) < 5:
                return []
            
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=100,
                min_df=1,
                max_df=1.0,
                ngram_range=(1, 2),
                stop_words='english'
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
                    clean_feature = ' '.join(feature.split())
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
            return 'general'
        
        text_lower = text.lower()
        
        # Enhanced topic keywords with weighted scoring
        topic_keywords = {
            'fitness': [
                'workout', 'exercise', 'training', 'fitness', 'strength', 'muscle', 'cardio',
                'gym', 'lifting', 'squat', 'bench', 'deadlift', 'push-up', 'pull-up',
                'reps', 'sets', 'routine', 'program', 'plan', 'bodybuilding', 'powerlifting'
            ],
            'nutrition': [
                'nutrition', 'diet', 'food', 'meal', 'protein', 'carbohydrate', 'vitamin',
                'calories', 'macros', 'supplements', 'vitamins', 'minerals', 'eating'
            ],
            'running': [
                'running', 'cardio', 'endurance', 'marathon', 'sprint', 'jogging',
                'race', 'pace', 'distance', 'speed', 'stamina', 'aerobic', 'track'
            ],
            'physiotherapy': [
                'injury', 'recovery', 'physio', 'therapy', 'rehabilitation', 'pain',
                'mobility', 'flexibility', 'stretching', 'massage', 'treatment'
            ]
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
        
        return 'general'

    def _detect_difficulty(self, text: str) -> str:
        """Detect difficulty level from content."""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['beginner', 'basic', 'starting', 'first time']):
            return 'beginner'
        elif any(word in text_lower for word in ['advanced', 'expert', 'professional', 'elite']):
            return 'advanced'
        else:
            return 'intermediate'

    def _extract_body_parts(self, text: str) -> List[str]:
        """Extract body parts mentioned in text."""
        body_parts = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full body']
        text_lower = text.lower()
        
        found_parts = []
        for part in body_parts:
            if part in text_lower:
                found_parts.append(part)
        
        return found_parts

    def _extract_equipment(self, text: str) -> List[str]:
        """Extract equipment mentioned in text."""
        equipment_types = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'cable', 'kettlebell']
        text_lower = text.lower()
        
        found_equipment = []
        for equip in equipment_types:
            if equip in text_lower:
                found_equipment.append(equip)
        
        return found_equipment

    def _extract_training_type(self, text: str) -> List[str]:
        """Extract training type from text."""
        training_types = ['strength', 'cardio', 'flexibility', 'endurance', 'power', 'hypertrophy']
        text_lower = text.lower()
        
        found_types = []
        for train_type in training_types:
            if train_type in text_lower:
                found_types.append(train_type)
        
        return found_types

    def _extract_goals(self, text: str) -> List[str]:
        """Extract training goals from text."""
        goals = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'performance']
        text_lower = text.lower()
        
        found_goals = []
        for goal in goals:
            if goal.replace('_', ' ') in text_lower:
                found_goals.append(goal)
        
        return found_goals

    def _extract_experience(self, text: str) -> str:
        """Extract required experience level."""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['beginner', 'new', 'starting']):
            return 'beginner'
        elif any(word in text_lower for word in ['advanced', 'expert', 'professional']):
            return 'advanced'
        else:
            return 'intermediate'

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
                doc_response = self.supabase.table('documents').insert(doc).execute()
                doc_id = doc_response.data[0]['id']
                
                # Chunk the content
                chunks = self.chunk_text(doc['content'])
                if not chunks:
                    logger.warning(f"No chunks created for: {doc['title']}")
                    continue
                    
                logger.info(f"   📄 Created {len(chunks)} chunks")
                
                # Generate embeddings for chunks
                embeddings = self.generate_embeddings(chunks)
                
                if not embeddings:
                    logger.error(f"   ⚠️  Skipping document due to embedding generation failure")
                    continue
                
                # Prepare chunk data
                chunk_data = []
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    chunk_data.append({
                        "document_id": doc_id,
                        "chunk_index": i,
                        "chunk_text": chunk,
                        "embedding": embedding
                    })
                
                # Insert chunks with embeddings
                self.supabase.table('document_embeddings').insert(chunk_data).execute()
                logger.info(f"   ✅ Stored {len(chunks)} chunks with embeddings")
                success_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error processing document {doc['title']}: {e}")
                continue
        
        logger.info(f"📊 Processing complete: {success_count}/{total_count} documents successful")
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
        
        if pdf_path.suffix.lower() != '.pdf':
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
        """
    )
    
    parser.add_argument(
        "--mode", 
        choices=["directory", "file"], 
        default="directory",
        help="Processing mode"
    )
    parser.add_argument(
        "--pdf-dir", 
        help="Directory containing PDF files to process"
    )
    parser.add_argument(
        "--pdf-path", 
        help="Path to single PDF file to process"
    )
    parser.add_argument(
        "--verbose", "-v", 
        action="store_true",
        help="Enable verbose logging"
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