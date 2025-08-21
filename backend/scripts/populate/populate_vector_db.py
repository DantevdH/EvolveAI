#!/usr/bin/env python3
"""
Vector Database Population Script for EvolveAI

This script populates the Supabase vector database with:
1. Sample fitness/nutrition data for testing
2. Can be reused to process actual PDFs later

Usage:
    python populate_vector_db.py --mode=sample    # Populate with sample data
    python populate_vector_db.py --mode=pdf --pdf-path=/path/to/pdf  # Process specific PDF
    python populate_vector_db.py --mode=pdfs --pdf-dir=/path/to/pdfs  # Process directory of PDFs
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

# Load environment variables
load_dotenv()

class VectorDBPopulator:
    def __init__(self):
        """Initialize the vector database populator."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not all([self.supabase_url, self.supabase_key, self.openai_api_key]):
            raise ValueError("Missing required environment variables. Check your .env file.")
        
        # Initialize clients
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
        
        print("✅ Connected to Supabase and OpenAI")

    def create_sample_documents(self) -> List[Dict[str, Any]]:
        """Create sample fitness and nutrition documents for testing."""
        
        sample_docs = [
            {
                "title": "Beginner Strength Training Guide",
                "content": """
                Strength training is a form of exercise that uses resistance to build muscle, 
                increase strength, and improve overall fitness. For beginners, it's important 
                to start with proper form and gradually increase intensity.
                
                Key Principles:
                1. Start with bodyweight exercises
                2. Focus on compound movements
                3. Maintain proper form
                4. Progressive overload
                5. Rest and recovery
                
                Basic Exercises for Beginners:
                - Push-ups: 3 sets of 5-10 reps
                - Bodyweight squats: 3 sets of 10-15 reps
                - Planks: 3 sets of 20-30 seconds
                - Lunges: 3 sets of 8-12 reps per leg
                
                Training Frequency: 2-3 times per week
                Rest Days: Allow 48 hours between sessions
                """,
                "content_type": "guide",
                "topic": "fitness",
                "metadata": {
                    "difficulty_level": "beginner",
                    "body_part": "full_body",
                    "sport_type": "strength_training",
                    "equipment_needed": ["bodyweight"],
                    "training_frequency": "2-3_times_per_week",
                    "session_duration": "30-45_minutes"
                }
            },
            {
                "title": "Intermediate Hypertrophy Program",
                "content": """
                Hypertrophy training focuses on muscle growth through moderate weights 
                and higher rep ranges. This program is designed for intermediate lifters 
                who have mastered basic movements.
                
                Program Structure:
                - 4-day split routine
                - Push/Pull/Legs/Upper pattern
                - 8-12 rep range for most exercises
                - 60-90 seconds rest between sets
                
                Day 1 - Push (Chest, Shoulders, Triceps):
                - Bench Press: 4 sets x 8-12 reps
                - Incline Dumbbell Press: 3 sets x 10-12 reps
                - Overhead Press: 3 sets x 8-10 reps
                - Lateral Raises: 3 sets x 12-15 reps
                - Tricep Dips: 3 sets x 10-12 reps
                
                Day 2 - Pull (Back, Biceps):
                - Deadlifts: 4 sets x 6-8 reps
                - Barbell Rows: 3 sets x 8-10 reps
                - Pull-ups: 3 sets x 8-10 reps
                - Bicep Curls: 3 sets x 10-12 reps
                
                Progressive Overload: Increase weight by 2.5-5 lbs when you can complete all sets
                """,
                "content_type": "program",
                "topic": "fitness",
                "metadata": {
                    "difficulty_level": "intermediate",
                    "body_part": "full_body",
                    "sport_type": "bodybuilding",
                    "equipment_needed": ["barbell", "dumbbells", "pull_up_bar"],
                    "training_frequency": "4_times_per_week",
                    "session_duration": "60-75_minutes",
                    "goal": "muscle_growth"
                }
            },
            {
                "title": "Nutrition Fundamentals for Muscle Building",
                "content": """
                Proper nutrition is essential for muscle building and recovery. 
                Understanding macronutrients and timing can significantly impact your results.
                
                Macronutrient Breakdown:
                - Protein: 1.6-2.2g per kg body weight
                - Carbohydrates: 4-7g per kg body weight
                - Fats: 0.8-1.2g per kg body weight
                
                Protein Sources:
                - Lean meats (chicken, turkey, lean beef)
                - Fish (salmon, tuna, cod)
                - Eggs and dairy
                - Plant-based (tofu, tempeh, legumes)
                
                Carbohydrate Sources:
                - Whole grains (brown rice, quinoa, oats)
                - Fruits and vegetables
                - Sweet potatoes and potatoes
                - Pasta and bread (whole grain)
                
                Meal Timing:
                - Pre-workout: 2-3 hours before, balanced meal
                - Post-workout: Within 30 minutes, protein + carbs
                - Daily: 4-6 meals, consistent protein distribution
                
                Hydration: Aim for 3-4 liters of water daily, more during training
                """,
                "content_type": "guide",
                "topic": "nutrition",
                "metadata": {
                    "difficulty_level": "beginner",
                    "goal": "muscle_building",
                    "diet_type": "balanced",
                    "meal_frequency": "4-6_times_per_day",
                    "focus": "macronutrients"
                }
            },
            {
                "title": "Running Training for Beginners",
                "content": """
                Running is an excellent cardiovascular exercise that can be started 
                at any fitness level. This guide will help beginners start safely 
                and build endurance gradually.
                
                Getting Started:
                - Start with walking and jogging intervals
                - Begin with 20-30 minute sessions
                - Run 3-4 times per week
                - Listen to your body and rest when needed
                
                Week 1-2: Walk-Run Intervals
                - 5 minutes warm-up walk
                - 1 minute run, 2 minutes walk (repeat 8 times)
                - 5 minutes cool-down walk
                
                Week 3-4: Increase Running Time
                - 5 minutes warm-up walk
                - 2 minutes run, 1 minute walk (repeat 8 times)
                - 5 minutes cool-down walk
                
                Week 5-6: Build Endurance
                - 5 minutes warm-up walk
                - 5 minutes run, 1 minute walk (repeat 4 times)
                - 5 minutes cool-down walk
                
                Safety Tips:
                - Invest in proper running shoes
                - Start on flat, even surfaces
                - Stay hydrated
                - Don't increase distance by more than 10% per week
                """,
                "content_type": "guide",
                "topic": "running",
                "metadata": {
                    "difficulty_level": "beginner",
                    "sport_type": "endurance",
                    "training_frequency": "3-4_times_per_week",
                    "session_duration": "20-30_minutes",
                    "goal": "build_endurance"
                }
            },
            {
                "title": "Injury Prevention and Recovery",
                "content": """
                Preventing injuries is crucial for long-term fitness success. 
                Understanding proper warm-up, form, and recovery can help you 
                stay injury-free and make consistent progress.
                
                Warm-up Protocol (10-15 minutes):
                - Light cardio (5 minutes)
                - Dynamic stretching
                - Movement preparation exercises
                - Progressive loading
                
                Common Injury Prevention:
                - Always warm up before training
                - Focus on proper form over weight
                - Don't skip rest days
                - Listen to pain signals
                - Gradual progression
                
                Recovery Strategies:
                - Sleep: 7-9 hours per night
                - Nutrition: Adequate protein and calories
                - Stretching: Post-workout and rest days
                - Foam rolling: 10-15 minutes daily
                - Active recovery: Light walking, swimming
                
                Warning Signs:
                - Sharp pain during exercise
                - Pain that persists after 48 hours
                - Swelling or inflammation
                - Loss of range of motion
                
                When to Seek Help:
                - Persistent pain
                - Severe swelling
                - Inability to bear weight
                - Pain that interferes with daily activities
                """,
                "content_type": "guide",
                "topic": "physiotherapy",
                "metadata": {
                    "difficulty_level": "all_levels",
                    "focus": "injury_prevention",
                    "applicable_to": "all_sports",
                    "session_duration": "10-15_minutes",
                    "frequency": "daily"
                }
            }
        ]
        
        return sample_docs

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks for better vector search."""
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
        """Generate OpenAI embeddings for text chunks."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",  # Best performance and quality
                input=texts
            )
            return [embedding.embedding for embedding in response.data]
        except Exception as e:
            print(f"❌ Error generating embeddings: {e}")
            return []

    def process_pdf(self, pdf_path: str) -> Optional[Dict[str, Any]]:
        """Process a PDF file and extract text content."""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
                
                # Generate a title from filename
                title = Path(pdf_path).stem.replace('_', ' ').title()
                
                # Create document object
                document = {
                    "title": title,
                    "content": text_content.strip(),
                    "content_type": "pdf",
                    "topic": self._detect_topic(text_content),
                    "metadata": {
                        "source_file": pdf_path,
                        "file_size": os.path.getsize(pdf_path),
                        "page_count": len(pdf_reader.pages),
                        "extraction_date": str(pdf_reader.metadata.get('/CreationDate', ''))
                    }
                }
                
                return document
                
        except Exception as e:
            print(f"❌ Error processing PDF {pdf_path}: {e}")
            return None

    def _detect_topic(self, text: str) -> str:
        """Simple topic detection based on keywords."""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['workout', 'exercise', 'training', 'fitness']):
            return 'fitness'
        elif any(word in text_lower for word in ['nutrition', 'diet', 'food', 'meal']):
            return 'nutrition'
        elif any(word in text_lower for word in ['running', 'cardio', 'endurance']):
            return 'running'
        elif any(word in text_lower for word in ['injury', 'recovery', 'physio', 'therapy']):
            return 'physiotherapy'
        else:
            return 'general'

    def populate_database(self, documents: List[Dict[str, Any]]) -> bool:
        """Populate the database with documents and their embeddings."""
        try:
            for doc in documents:
                print(f"📝 Processing: {doc['title']}")
                
                # Insert document
                doc_response = self.supabase.table('documents').insert(doc).execute()
                doc_id = doc_response.data[0]['id']
                
                # Chunk the content
                chunks = self.chunk_text(doc['content'])
                print(f"   📄 Created {len(chunks)} chunks")
                
                # Generate embeddings for chunks
                embeddings = self.generate_embeddings(chunks)
                
                if not embeddings:
                    print(f"   ⚠️  Skipping document due to embedding generation failure")
                    continue
                
                # Prepare chunk data
                chunk_data = []
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    chunk_data.append({
                        "document_id": doc_id,
                        "chunk_index": i,
                        "chunk_text": chunk,
                        "embedding": embedding,  # text-embedding-ada-002 has 1536 dimensions
                        "chunk_metadata": {
                            "chunk_type": "content",
                            "word_count": len(chunk.split())
                        }
                    })
                
                # Insert chunks with embeddings
                self.supabase.table('document_embeddings').insert(chunk_data).execute()
                print(f"   ✅ Stored {len(chunks)} chunks with embeddings")
            
            return True
            
        except Exception as e:
            print(f"❌ Error populating database: {e}")
            return False

    def run_sample_population(self):
        """Populate database with sample data."""
        print("🚀 Starting sample data population...")
        
        sample_docs = self.create_sample_documents()
        print(f"📚 Created {len(sample_docs)} sample documents")
        
        success = self.populate_database(sample_docs)
        
        if success:
            print("✅ Sample data population completed successfully!")
            self._print_summary()
        else:
            print("❌ Sample data population failed!")

    def run_pdf_processing(self, pdf_path: str):
        """Process a single PDF file."""
        print(f"📄 Processing PDF: {pdf_path}")
        
        document = self.process_pdf(pdf_path)
        if document:
            success = self.populate_database([document])
            if success:
                print(f"✅ PDF processing completed: {document['title']}")
            else:
                print("❌ PDF processing failed!")
        else:
            print("❌ Could not process PDF!")

    def run_pdf_directory_processing(self, pdf_dir: str):
        """Process all PDFs in a directory."""
        pdf_dir_path = Path(pdf_dir)
        pdf_files = list(pdf_dir_path.glob("*.pdf"))
        
        if not pdf_files:
            print(f"❌ No PDF files found in {pdf_dir}")
            return
        
        print(f"📁 Found {len(pdf_files)} PDF files in {pdf_dir}")
        
        for pdf_file in pdf_files:
            self.run_pdf_processing(str(pdf_file))
        
        print("✅ PDF directory processing completed!")

    def _print_summary(self):
        """Print a summary of the database contents."""
        try:
            # Count documents
            doc_count = self.supabase.table('documents').select('id', count='exact').execute()
            doc_total = doc_count.count if doc_count.count is not None else 0
            
            # Count embeddings
            emb_count = self.supabase.table('document_embeddings').select('id', count='exact').execute()
            emb_total = emb_count.count if emb_count.count is not None else 0
            
            print(f"\n📊 Database Summary:")
            print(f"   Documents: {doc_total}")
            print(f"   Embeddings: {emb_total}")
            
            # Show topics distribution
            topics = self.supabase.table('documents').select('topic').execute()
            topic_counts = {}
            for doc in topics.data:
                topic = doc['topic']
                topic_counts[topic] = topic_counts.get(topic, 0) + 1
            
            print(f"   Topics: {topic_counts}")
            
        except Exception as e:
            print(f"⚠️  Could not generate summary: {e}")

def main():
    """Main function to run the script."""
    parser = argparse.ArgumentParser(description="Populate Supabase vector database")
    parser.add_argument("--mode", choices=["sample", "pdf", "pdfs"], default="sample",
                       help="Mode: sample (sample data), pdf (single PDF), pdfs (directory)")
    parser.add_argument("--pdf-path", help="Path to single PDF file")
    parser.add_argument("--pdf-dir", help="Path to directory containing PDFs")
    
    args = parser.parse_args()
    
    try:
        populator = VectorDBPopulator()
        
        if args.mode == "sample":
            populator.run_sample_population()
        elif args.mode == "pdf":
            if not args.pdf_path:
                print("❌ PDF path required for pdf mode")
                return
            populator.run_pdf_processing(args.pdf_path)
        elif args.mode == "pdfs":
            if not args.pdf_dir:
                print("❌ PDF directory required for pdfs mode")
                return
            populator.run_pdf_directory_processing(args.pdf_dir)
            
    except Exception as e:
        print(f"❌ Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 