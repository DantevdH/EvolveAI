#!/usr/bin/env python3
"""
Exercise Database Population Script for EvolveAI

This script populates the exercises table with data from Excel files.
Handles the specific exercise data structure with proper data types and validation.
"""

import os
import sys
import pandas as pd
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class ExercisePopulator:
    """Handles population of the exercises table with Excel data."""
    
    def __init__(self):
        """Initialize the exercise populator."""
        self._validate_environment()
        self._initialize_clients()
        logger.info("✅ Connected to Supabase")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        required_vars = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY")
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def _initialize_clients(self):
        """Initialize Supabase client."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    def load_excel_data(self, file_path: str) -> Optional[pd.DataFrame]:
        """Load exercise data from Excel file."""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return None
            
            # Determine file type and load accordingly
            if file_path.suffix.lower() == '.xlsx':
                df = pd.read_excel(file_path)
            elif file_path.suffix.lower() == '.csv':
                df = pd.read_csv(file_path)
            else:
                logger.error(f"Unsupported file type: {file_path.suffix}")
                return None
            
            logger.info(f"✅ Loaded {len(df)} exercises from {file_path.name}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading file {file_path}: {e}")
            return None

    def validate_exercise_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and clean exercise data."""
        logger.info("🔍 Validating exercise data...")
        
        # Check required columns
        required_columns = ["Exercise Name", "Force", "Instructions", "Equipment", "Main Muscle", "Target_Muscles", "Secondary Muscles", "Difficulty", "Tier", "Popularity Score"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Clean and standardize data
        df_clean = df.copy()
        
        # Clean Exercise Name
        df_clean["Exercise Name"] = df_clean["Exercise Name"].astype(str).str.strip()
        
        # Clean Force
        df_clean["Force"] = df_clean["Force"].astype(str).str.strip()
        
        # Clean Instructions
        df_clean["Instructions"] = df_clean["Instructions"].astype(str).str.strip()
        
        # Clean Equipment
        df_clean["Equipment"] = df_clean["Equipment"].astype(str).str.strip()
        
        # Clean Main Muscle (this will become target_area)
        df_clean["Main Muscle"] = df_clean["Main Muscle"].astype(str).str.strip()
        
        # Clean Target_Muscles (convert to list for main_muscles)
        df_clean["Target_Muscles"] = df_clean["Target_Muscles"].apply(self._parse_muscle_list)
        
        # Clean Secondary Muscles (convert to list)
        df_clean["Secondary Muscles"] = df_clean["Secondary Muscles"].apply(self._parse_muscle_list)
        
        # Clean Difficulty
        df_clean["Difficulty"] = df_clean["Difficulty"].apply(self._standardize_difficulty)
        
        # Clean Tier
        df_clean["Tier"] = df_clean["Tier"].apply(self._clean_tier)
        
        # Clean Popularity Score
        df_clean["Popularity Score"] = df_clean["Popularity Score"].apply(self._parse_popularity_score)
        
        # Remove rows with missing critical data
        initial_count = len(df_clean)
        df_clean = df_clean.dropna(subset=["Exercise Name", "Main Muscle"])
        final_count = len(df_clean)
        
        if initial_count != final_count:
            logger.warning(f"Removed {initial_count - final_count} rows with missing critical data")
        
        # Check for duplicates based on composite key (name + equipment + target_area)
        logger.info("🔍 Checking for duplicate exercise combinations...")
        duplicates = df_clean[df_clean.duplicated(subset=["Exercise Name", "Equipment", "Main Muscle"], keep=False)]
        if not duplicates.empty:
            logger.warning(f"Found {len(duplicates)} rows with duplicate exercise combinations")
            logger.info("Keeping first occurrence of each duplicate, removing others...")
            
            # Remove duplicates, keeping the first occurrence
            df_clean = df_clean.drop_duplicates(subset=["Exercise Name", "Equipment", "Main Muscle"], keep='first')
            logger.info(f"After removing duplicates: {len(df_clean)} exercises remaining")
        
        logger.info(f"✅ Data validation complete. {len(df_clean)} valid exercises remaining")
        return df_clean

    def _parse_muscle_list(self, muscles_str: str) -> List[str]:
        """Parse muscle string into a list."""
        if pd.isna(muscles_str) or muscles_str == '':
            return []
        
        # Split by comma and clean each muscle name
        muscles = [muscle.strip() for muscle in str(muscles_str).split(',')]
        # Remove empty strings
        muscles = [muscle for muscle in muscles if muscle]
        return muscles

    def _standardize_difficulty(self, difficulty: str) -> str:
        """Standardize difficulty levels."""
        if pd.isna(difficulty):
            return "Intermediate"
        
        difficulty_str = str(difficulty).strip().lower()
        
        if difficulty_str in ['beginner', '1', 'easy', 'basic']:
            return "Beginner"
        elif difficulty_str in ['advanced', '5', 'hard', 'expert']:
            return "Advanced"
        else:
            return "Intermediate"

    def _clean_tier(self, tier: str) -> str:
        """Clean and standardize tier values."""
        if pd.isna(tier) or tier == '':
            return "variety"
        
        # Convert to string and strip whitespace
        tier_str = str(tier).strip()
        
        # Remove leading and trailing brackets
        tier_str = tier_str.strip('[]')
        
        # Convert to lowercase
        tier_str = tier_str.lower().strip()
        
        # If empty after cleaning, return default
        if not tier_str:
            return "variety"
        
        return tier_str

    def _parse_popularity_score(self, score: Any) -> float:
        """Parse and validate popularity score."""
        if pd.isna(score) or score == '':
            return 0.5
        
        try:
            # Convert to float
            score_float = float(score)
            
            # Clamp between 0 and 1
            if score_float < 0:
                return 0.0
            elif score_float > 1:
                return 1.0
            else:
                return score_float
                
        except (ValueError, TypeError):
            logger.warning(f"Invalid popularity score '{score}', using default 0.5")
            return 0.5

    def transform_to_database_format(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Transform DataFrame to database insert format."""
        exercises = []
        
        for _, row in df.iterrows():
            exercise = {
                "name": row["Exercise Name"],
                "force": row["Force"],
                "instructions": row["Instructions"],
                "equipment": row["Equipment"],
                "target_area": row["Main Muscle"],  # Main Muscle maps to target_area
                "main_muscles": row["Target_Muscles"],  # Target_Muscles maps to main_muscles array
                "secondary_muscles": row["Secondary Muscles"],
                "difficulty": row["Difficulty"],
                "exercise_tier": row["Tier"],
                "popularity_score": row["Popularity Score"]
            }
            exercises.append(exercise)
        
        return exercises

    def populate_database(self, exercises: List[Dict[str, Any]]) -> bool:
        """Populate the exercises table with exercise data."""
        if not exercises:
            logger.warning("No exercises to process")
            return False
        
        success_count = 0
        total_count = len(exercises)
        
        # Process in batches to avoid overwhelming the database
        batch_size = 50
        
        for i in range(0, len(exercises), batch_size):
            batch = exercises[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(exercises) + batch_size - 1) // batch_size
            
            try:
                logger.info(f"�� Processing batch {batch_num}/{total_batches} ({len(batch)} exercises)")
                
                # Insert batch
                response = self.supabase.table('exercises').insert(batch).execute()
                
                if response.data:
                    success_count += len(batch)
                    logger.info(f"   ✅ Successfully inserted {len(batch)} exercises")
                else:
                    logger.error(f"   ❌ Batch {batch_num} insertion failed")
                
            except Exception as e:
                logger.error(f"   ❌ Error processing batch {batch_num}: {e}")
                logger.warning(f"   ⚠️  Skipping batch {batch_num} due to error: {e}")
                continue
        
        logger.info(f"📊 Database population complete: {success_count}/{total_count} exercises successful")
        return success_count > 0

    def process_excel_file(self, file_path: str) -> bool:
        """Process a single Excel file and populate the database."""
        try:
            # Load data
            df = self.load_excel_data(file_path)
            if df is None:
                return False
            
            # Validate data
            df_clean = self.validate_exercise_data(df)
            
            # Transform to database format
            exercises = self.transform_to_database_format(df_clean)
            
            # Populate database
            return self.populate_database(exercises)
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return False

    def get_database_summary(self) -> Dict[str, Any]:
        """Get a summary of the exercises table."""
        try:
            # Count exercises
            response = self.supabase.table('exercises').select('id', count='exact').execute()
            total_exercises = response.count if response.count is not None else 0
            
            # Get difficulty distribution
            difficulty_response = self.supabase.table('exercises').select('difficulty').execute()
            difficulty_counts = {}
            for exercise in difficulty_response.data:
                difficulty = exercise['difficulty']
                difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1
            
            # Get target area distribution
            muscle_response = self.supabase.table('exercises').select('target_area').execute()
            muscle_counts = {}
            for exercise in muscle_response.data:
                muscle = exercise['target_area']
                muscle_counts[muscle] = muscle_counts.get(muscle, 0) + 1
            
            return {
                "total_exercises": total_exercises,
                "difficulty_distribution": difficulty_counts,
                "target_area_distribution": muscle_counts
            }
            
        except Exception as e:
            logger.error(f"Could not generate summary: {e}")
            return {}

def main():
    """Main function to run the exercise population script."""
    parser = argparse.ArgumentParser(
        description="Populate Supabase exercises table with Excel data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python populate_exercises.py --file-path=./data/excel/gym_exercises_filtered.xlsx
  python populate_exercises.py --file-path=./data/excel/combined_exercises.xlsx
        """
    )
    
    parser.add_argument(
        "--file-path", 
        required=True,
        help="Path to Excel file containing exercise data"
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
        populator = ExercisePopulator()
        
        success = populator.process_excel_file(args.file_path)
        
        if success:
            logger.info("✅ Exercise population completed successfully!")
            summary = populator.get_database_summary()
            if summary:
                logger.info(f"📊 Database Summary: {summary}")
        else:
            logger.error("❌ Exercise population failed!")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()