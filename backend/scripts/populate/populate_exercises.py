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
from settings import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
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
        self._ensure_exercises_table_exists()
        logger.info("✅ Connected to Supabase")

    def _validate_environment(self):
        """Validate that all required environment variables are set."""
        # Use settings (which reads from environment dynamically)
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
        """Initialize Supabase client."""
        # Use settings (which reads from environment dynamically)
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_ANON_KEY

        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    def _ensure_exercises_table_exists(self):
        """Create the exercises table if it doesn't exist."""
        try:
            # Check if table exists by trying to select from it
            self.supabase.table("exercises").select("id").limit(1).execute()
            logger.info("✅ Exercises table already exists")
            # Check if we need to add missing columns
            self._ensure_all_columns_exist()
        except Exception as e:
            if "does not exist" in str(e) or "PGRST205" in str(e):
                logger.info("🔧 Creating exercises table...")
                self._create_exercises_table()
            else:
                logger.warning(f"⚠️  Could not check table existence: {e}")

    def _ensure_all_columns_exist(self):
        """Ensure all required columns exist in the exercises table."""
        try:
            # Try to select from the new columns to see if they exist
            test_columns = ["preparation", "execution", "tips"]
            missing_columns = []

            for col in test_columns:
                try:
                    self.supabase.table("exercises").select(col).limit(1).execute()
                except Exception as e:
                    if "PGRST204" in str(e) and "column" in str(e):
                        missing_columns.append(col)

            if missing_columns:
                logger.info(f"🔧 Adding missing columns: {missing_columns}")
                self._add_missing_columns(missing_columns)
            else:
                logger.info("✅ All required columns exist")

        except Exception as e:
            logger.warning(f"⚠️  Could not check column existence: {e}")

    def _add_missing_columns(self, missing_columns):
        """Add missing columns to the exercises table."""
        try:
            for col in missing_columns:
                if col == "preparation":
                    sql = "ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS preparation text;"
                elif col == "execution":
                    sql = "ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS execution text;"
                elif col == "tips":
                    sql = "ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS tips text;"
                else:
                    continue

                try:
                    self.supabase.rpc("exec_sql", {"sql": sql}).execute()
                    logger.info(f"✅ Added column: {col}")
                except Exception as e:
                    logger.warning(f"⚠️  Could not add column {col}: {e}")

        except Exception as e:
            logger.error(f"❌ Error adding missing columns: {e}")

    def _create_exercises_table(self):
        """Create the exercises table with proper schema."""
        try:
            logger.info("🔧 Creating exercises table...")

            # SQL to create the exercises table
            create_table_sql = """
            CREATE TABLE public.exercises (
                id serial PRIMARY KEY,
                name text NOT NULL,
                equipment text NOT NULL,
                target_area text NOT NULL,
                force text NOT NULL,
                difficulty text NOT NULL,
                tier text NOT NULL,
                popularity_score integer NOT NULL,
                main_muscles text[] NOT NULL,
                secondary_muscles text[] NOT NULL,
                preparation text,
                execution text,
                tips text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now()
            );
            """

            # Execute the table creation
            response = self.supabase.rpc(
                "exec_sql", {"sql": create_table_sql}
            ).execute()
            logger.info("✅ Exercises table created successfully")

            # Enable RLS
            rls_sql = "ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;"
            try:
                self.supabase.rpc("exec_sql", {"sql": rls_sql}).execute()
                logger.info("✅ RLS enabled on exercises table")
            except Exception as e:
                logger.warning(f"⚠️  Could not enable RLS: {e}")

            # Create a permissive policy for now (you may want to restrict this)
            policy_sql = """
            CREATE POLICY "Allow all operations" ON public.exercises
            FOR ALL USING (true);
            """
            try:
                self.supabase.rpc("exec_sql", {"sql": policy_sql}).execute()
                logger.info("✅ RLS policy created")
            except Exception as e:
                logger.warning(f"⚠️  Could not create RLS policy: {e}")

            # Create indexes for better performance
            indexes_sql = [
                "CREATE INDEX idx_exercises_target_area ON public.exercises(target_area);",
                "CREATE INDEX idx_exercises_difficulty ON public.exercises(difficulty);",
                "CREATE INDEX idx_exercises_equipment ON public.exercises(equipment);",
                "CREATE INDEX idx_exercises_tier ON public.exercises(tier);",
            ]

            for index_sql in indexes_sql:
                try:
                    self.supabase.rpc("exec_sql", {"sql": index_sql}).execute()
                except Exception as e:
                    logger.warning(f"⚠️  Could not create index: {e}")

            logger.info("✅ Indexes created")

        except Exception as e:
            logger.error(f"❌ Error creating table: {e}")
            # Fallback: try using direct SQL execution
            try:
                logger.info("🔄 Trying alternative table creation method...")
                # This is a fallback - some Supabase instances might not support exec_sql
                logger.warning(
                    "⚠️  Table creation failed. Please create the table manually using the SQL in create_exercises_table.sql"
                )
            except Exception as fallback_error:
                logger.error(f"❌ Fallback also failed: {fallback_error}")

    def load_excel_data(self, file_path: str) -> Optional[pd.DataFrame]:
        """Load exercise data from Excel file."""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return None

            # Determine file type and load accordingly
            if file_path.suffix.lower() == ".xlsx":
                df = pd.read_excel(file_path)
            elif file_path.suffix.lower() == ".csv":
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

        # Check required columns for the new format
        required_columns = [
            "name",
            "equipment",
            "tier",
            "difficulty",
            "popularity_score",
            "target_area",
            "primary_muscles",
            "secondary_muscles",
            "force",
            "preparation",
            "execution",
            "tips",
        ]
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            raise ValueError(f"Missing required columns: {missing_columns}")

        # Clean and standardize data
        df_clean = df.copy()

        # Clean name
        df_clean["name"] = df_clean["name"].astype(str).str.strip()

        # Clean equipment
        df_clean["equipment"] = df_clean["equipment"].astype(str).str.strip()

        # Clean target_area
        df_clean["target_area"] = df_clean["target_area"].astype(str).str.strip()

        # Clean primary_muscles (convert to list)
        df_clean["primary_muscles"] = df_clean["primary_muscles"].apply(
            self._parse_muscle_list
        )

        # Clean secondary_muscles (convert to list)
        df_clean["secondary_muscles"] = df_clean["secondary_muscles"].apply(
            self._parse_muscle_list
        )

        # Clean force
        df_clean["force"] = df_clean["force"].astype(str).str.strip()

        # Clean preparation
        df_clean["preparation"] = df_clean["preparation"].astype(str).str.strip()

        # Clean execution
        df_clean["execution"] = df_clean["execution"].astype(str).str.strip()

        # Clean tips
        df_clean["tips"] = df_clean["tips"].fillna("").astype(str).str.strip()

        # Clean difficulty
        df_clean["difficulty"] = df_clean["difficulty"].apply(
            self._standardize_difficulty
        )

        # Clean tier
        df_clean["tier"] = df_clean["tier"].apply(self._clean_tier)

        # Clean popularity score
        df_clean["popularity_score"] = df_clean["popularity_score"].apply(
            self._parse_popularity_score
        )

        # Remove rows with missing critical data
        initial_count = len(df_clean)
        df_clean = df_clean.dropna(subset=["name", "target_area"])
        final_count = len(df_clean)

        if initial_count != final_count:
            logger.warning(
                f"Removed {initial_count - final_count} rows with missing critical data"
            )

        # Check for duplicates based on composite key (name + equipment + target_area)
        logger.info("🔍 Checking for duplicate exercise combinations...")
        duplicates = df_clean[
            df_clean.duplicated(subset=["name", "equipment", "target_area"], keep=False)
        ]
        if not duplicates.empty:
            logger.warning(
                f"Found {len(duplicates)} rows with duplicate exercise combinations"
            )
            logger.info(
                "Keeping first occurrence of each duplicate, removing others..."
            )

            # Remove duplicates, keeping the first occurrence
            df_clean = df_clean.drop_duplicates(
                subset=["name", "equipment", "target_area"], keep="first"
            )
            logger.info(
                f"After removing duplicates: {len(df_clean)} exercises remaining"
            )

        logger.info(
            f"✅ Data validation complete. {len(df_clean)} valid exercises remaining"
        )
        return df_clean

    def _parse_muscle_list(self, muscles_str: str) -> List[str]:
        """Parse muscle string into a list."""
        if pd.isna(muscles_str) or muscles_str == "":
            return []

        muscles_str = str(muscles_str).strip()

        # Check if it's a JSON array string (starts with [ and ends with ])
        if muscles_str.startswith("[") and muscles_str.endswith("]"):
            try:
                import json

                muscles = json.loads(muscles_str)
                if isinstance(muscles, list):
                    return [muscle.strip() for muscle in muscles if muscle.strip()]
            except (json.JSONDecodeError, TypeError):
                pass

        # Fallback: Split by comma and clean each muscle name
        muscles = [muscle.strip().strip("\"'") for muscle in muscles_str.split(",")]
        # Remove empty strings
        muscles = [muscle for muscle in muscles if muscle]
        return muscles

    def _standardize_difficulty(self, difficulty: str) -> str:
        """Standardize difficulty levels."""
        if pd.isna(difficulty):
            return "Intermediate"

        difficulty_str = str(difficulty).strip().lower()

        if difficulty_str in ["beginner", "1", "easy", "basic"]:
            return "Beginner"
        elif difficulty_str in ["advanced", "5", "hard", "expert"]:
            return "Advanced"
        else:
            return "Intermediate"

    def _clean_tier(self, tier: str) -> str:
        """Clean and standardize tier values."""
        if pd.isna(tier) or tier == "":
            return "variety"

        # Convert to string and strip whitespace
        tier_str = str(tier).strip()

        # Remove leading and trailing brackets
        tier_str = tier_str.strip("[]")

        # Convert to lowercase
        tier_str = tier_str.lower().strip()

        # If empty after cleaning, return default
        if not tier_str:
            return "variety"

        return tier_str

    def _parse_popularity_score(self, score: Any) -> int:
        """Parse and validate popularity score."""
        if pd.isna(score) or score == "":
            return 5  # Default to 5 on a 1-10 scale

        try:
            # Convert to int
            score_int = int(float(score))

            # Clamp between 1 and 10
            if score_int < 1:
                return 1
            elif score_int > 10:
                return 10
            else:
                return score_int

        except (ValueError, TypeError):
            logger.warning(f"Invalid popularity score '{score}', using default 5")
            return 5

    def transform_to_database_format(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Transform DataFrame to database insert format."""
        exercises = []

        for _, row in df.iterrows():
            # Clean and prepare individual fields
            preparation = (
                str(row["preparation"]).strip()
                if pd.notna(row["preparation"])
                and str(row["preparation"]).strip() != "nan"
                else ""
            )
            execution = (
                str(row["execution"]).strip()
                if pd.notna(row["execution"]) and str(row["execution"]).strip() != "nan"
                else ""
            )
            tips = (
                str(row["tips"]).strip()
                if pd.notna(row["tips"]) and str(row["tips"]).strip() != "nan"
                else ""
            )

            # Create exercise with all fields
            exercise = {
                "name": row["name"],
                "equipment": row["equipment"],
                "target_area": row["target_area"],
                "force": row["force"],
                "difficulty": row["difficulty"],
                "tier": row["tier"],
                "popularity_score": row["popularity_score"],
                "main_muscles": row[
                    "primary_muscles"
                ],  # primary_muscles maps to main_muscles array
                "secondary_muscles": row["secondary_muscles"],
                "preparation": preparation,
                "execution": execution,
                "tips": tips,
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
            batch = exercises[i : i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(exercises) + batch_size - 1) // batch_size

            try:
                logger.info(
                    f"�� Processing batch {batch_num}/{total_batches} ({len(batch)} exercises)"
                )

                # Insert batch
                response = self.supabase.table("exercises").insert(batch).execute()

                if response.data:
                    success_count += len(batch)
                    logger.info(f"   ✅ Successfully inserted {len(batch)} exercises")
                else:
                    logger.error(f"   ❌ Batch {batch_num} insertion failed")

            except Exception as e:
                logger.error(f"   ❌ Error processing batch {batch_num}: {e}")
                logger.warning(f"   ⚠️  Skipping batch {batch_num} due to error: {e}")
                continue

        logger.info(
            f"📊 Database population complete: {success_count}/{total_count} exercises successful"
        )
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
            response = (
                self.supabase.table("exercises").select("id", count="exact").execute()
            )
            total_exercises = response.count if response.count is not None else 0

            # Get difficulty distribution
            difficulty_response = (
                self.supabase.table("exercises").select("difficulty").execute()
            )
            difficulty_counts = {}
            for exercise in difficulty_response.data:
                difficulty = exercise["difficulty"]
                difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1

            # Get target area distribution
            muscle_response = (
                self.supabase.table("exercises").select("target_area").execute()
            )
            muscle_counts = {}
            for exercise in muscle_response.data:
                muscle = exercise["target_area"]
                muscle_counts[muscle] = muscle_counts.get(muscle, 0) + 1

            return {
                "total_exercises": total_exercises,
                "difficulty_distribution": difficulty_counts,
                "target_area_distribution": muscle_counts,
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
  python populate_exercises.py --file-path=./data/excel/gym_exercises.xlsx
  python populate_exercises.py --file-path=./data/excel/gym_exercise_dataset_cleaned.xlsx
        """,
    )

    parser.add_argument(
        "--file-path", required=True, help="Path to Excel file containing exercise data"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
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
