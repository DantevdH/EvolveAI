"""
Exercise Features Auto-Filler Script

This script reads an Excel file containing exercise features and uses OpenAI
to automatically fill missing "Tier" and "Popularity Score" values.
"""

import pandas as pd
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import time

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.append(str(backend_dir))

import openai
from config.settings import settings


class ExerciseFeaturesFiller:
    """Class to handle automatic filling of exercise features using OpenAI."""
    
    def __init__(self, excel_file_path: str):
        """
        Initialize the ExerciseFeaturesFiller.
        
        Args:
            excel_file_path: Path to the Excel file containing exercise features
        """
        self.excel_file_path = excel_file_path
        # Initialize OpenAI client directly using settings
        self._openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self._openai_model = settings.OPENAI_MODEL
        self._openai_temperature = settings.OPENAI_TEMPERATURE
        self.df = None
        self.backup_file = None
        
    def load_excel_file(self) -> bool:
        """
        Load the Excel file into a pandas DataFrame.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            print(f"📖 Loading Excel file: {self.excel_file_path}")
            self.df = pd.read_excel(self.excel_file_path)
            print(f"✅ Successfully loaded {len(self.df)} rows")
            print(f"📊 Columns: {list(self.df.columns)}")
            return True
        except Exception as e:
            print(f"❌ Failed to load Excel file: {e}")
            return False
    
    def create_backup(self) -> bool:
        """
        Create a backup of the original Excel file.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            file_path = Path(self.excel_file_path)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            backup_name = f"{file_path.stem}_backup_{timestamp}{file_path.suffix}"
            backup_path = file_path.parent / backup_name
            
            # Copy the file
            import shutil
            shutil.copy2(self.excel_file_path, backup_path)
            self.backup_file = str(backup_path)
            print(f"💾 Backup created: {backup_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to create backup: {e}")
            return False
    
    def identify_missing_features(self) -> Tuple[List[int], List[int]]:
        """
        Identify rows with missing Tier or Popularity Score values.
        
        Returns:
            Tuple of (rows_with_missing_tier, rows_with_missing_popularity)
        """
        missing_tier = []
        missing_popularity = []
        
        for idx, row in self.df.iterrows():
            # Check for missing Tier (should be 1, 2, 3 or "Foundational", "Standard", "Variety")
            tier_value = row.get('Tier', pd.NA)
            valid_tiers = [1, 2, 3, 'Foundational', 'Standard', 'Variety', 'foundational', 'standard', 'variety']
            if pd.isna(tier_value) or tier_value not in valid_tiers:
                missing_tier.append(idx)
            
            # Check for missing Popularity Score (should be 0.0 to 1.0 with one decimal)
            popularity_value = row.get('Popularity Score', pd.NA)
            if pd.isna(popularity_value) or not (0.0 <= popularity_value <= 1.0):
                missing_popularity.append(idx)
        
        print(f"🔍 Found {len(missing_tier)} rows with missing Tier")
        print(f"🔍 Found {len(missing_popularity)} rows with missing Popularity Score")
        
        return missing_tier, missing_popularity
    
    def generate_tier_prompt(self, exercise_data: Dict) -> str:
        """
        Generate a prompt for determining exercise tier.
        
        Args:
            exercise_data: Dictionary containing exercise information
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""
You are a training expert analyzing exercise categorization. Based on the following exercise information, determine the appropriate tier (1, 2, or 3).

TIER SYSTEM:
- Tier 1: Foundational - Basic, fundamental movements that form the foundation of training
- Tier 2: Standard - Common exercises that are widely used in training programs
- Tier 3: Variety - Specialized or advanced variations that add variety to trainings

EXERCISE INFORMATION:
{json.dumps(exercise_data, indent=2)}

Respond with ONLY the tier (Foundational, Standard, Variety)
Format: "[TIER NAME]"
"""
        return prompt.strip()
    
    def generate_popularity_prompt(self, exercise_data: Dict) -> str:
        """
        Generate a prompt for determining popularity score.
        
        Args:
            exercise_data: Dictionary containing exercise information
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""
You are a training expert analyzing exercise popularity and common usage. Based on the following exercise information, determine the popularity score (0.0 to 1.0).

POPULARITY SCALE:
- 0.0-0.3: Rarely used, specialized, niche exercises
- 0.4-0.6: Moderately popular, used in some programs
- 0.7-0.8: Popular, commonly included in trainings
- 0.9-1.0: Very popular, widely used, staple exercises

EXERCISE INFORMATION:
{json.dumps(exercise_data, indent=2)}

Respond with ONLY the popularity score (0.0 to 1.0 with one decimal place).
Format: "[SCORE]"
"""
        return prompt.strip()
    
    def extract_exercise_data(self, row_idx: int) -> Dict:
        """
        Extract relevant exercise data from a DataFrame row.
        
        Args:
            row_idx: Index of the row to extract data from
            
        Returns:
            Dictionary containing exercise information
        """
        row = self.df.iloc[row_idx]
        exercise_data = {}
        
        # Extract all available columns (excluding Tier and Popularity Score)
        for col in self.df.columns:
            if col not in ['Tier', 'Popularity Score']:
                value = row[col]
                if pd.notna(value):
                    exercise_data[col] = str(value)
        
        return exercise_data
    
    def parse_ai_response(self, response: str, response_type: str) -> Tuple[Optional[any], str]:
        """
        Parse the AI response to extract the value.
        
        Args:
            response: Raw AI response
            response_type: Either 'tier' or 'popularity'
            
        Returns:
            Tuple of (value, status_message)
        """
        try:
            response = response.strip()
            
            if response_type == 'tier':
                # Parse tier names to numbers for internal processing
                tier_mapping = {
                    'foundational': 1,
                    'standard': 2,
                    'variety': 3
                }
                
                # Convert to lowercase for case-insensitive matching
                response_lower = response.lower()
                
                for tier_name, tier_number in tier_mapping.items():
                    if tier_name in response_lower:
                        # Return the tier name (not the number) for display
                        return response, f"AI assigned tier: {response}"
                
                # Fallback: look for numbers 1-3
                import re
                numbers = re.findall(r'\b[1-3]\b', response)
                if numbers:
                    # Convert number back to tier name for display
                    reverse_mapping = {1: 'Foundational', 2: 'Standard', 3: 'Variety'}
                    tier_name = reverse_mapping.get(int(numbers[0]), f"Tier {numbers[0]}")
                    return tier_name, f"AI assigned tier (parsed): {tier_name}"
                
                return None, f"Failed to parse tier from response: {response}"
                
            elif response_type == 'popularity':
                # Look for decimal numbers 0.0 to 1.0
                import re
                numbers = re.findall(r'\b0\.[0-9]|1\.0\b', response)
                if numbers:
                    return float(numbers[0]), f"AI assigned popularity: {response}"
                
                return None, f"Failed to parse popularity score from response: {response}"
            
            return None, f"Unknown response type: {response_type}"
            
        except Exception as e:
            return None, f"Error parsing {response_type}: {str(e)}"

    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """
        Generate a chat completion using OpenAI directly.

        Args:
            messages: List of message dictionaries
            **kwargs: Additional OpenAI parameters

        Returns:
            Generated response text
        """
        response = self._openai_client.chat.completions.create(
            model=self._openai_model,
            messages=messages,
            temperature=self._openai_temperature,
            **kwargs
        )
        return response.choices[0].message.content
    
    def fill_missing_tiers(self, missing_tier_rows: List[int]) -> Dict[int, Tuple[str, str]]:
        """
        Fill missing tier values using OpenAI.
        
        Args:
            missing_tier_rows: List of row indices with missing tier values
            
        Returns:
            Dictionary mapping row indices to (tier, justification) tuples
        """
        results = {}
        
        for row_idx in missing_tier_rows:
            try:
                print(f"🤖 Processing Tier for row {row_idx + 1}...")
                
                exercise_data = self.extract_exercise_data(row_idx)
                prompt = self.generate_tier_prompt(exercise_data)
                
                # Get AI response
                response = self.chat_completion([
                    {"role": "user", "content": prompt}
                ])
                
                tier, status_message = self.parse_ai_response(response, 'tier')
                
                if tier is not None:
                    results[row_idx] = (tier, status_message)
                    print(f"✅ Tier {tier} assigned: {status_message}")
                else:
                    print(f"❌ Failed to get tier: {status_message}")
                
                # Add delay to avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Error processing row {row_idx}: {e}")
                results[row_idx] = (None, f"Error: {str(e)}")
        
        return results
    
    def fill_missing_popularity_scores(self, missing_popularity_rows: List[int]) -> Dict[int, Tuple[any, str]]:
        """
        Fill missing popularity score values using OpenAI.
        
        Args:
            missing_popularity_rows: List of row indices with missing popularity scores
            
        Returns:
            Dictionary mapping row indices to (score, justification) tuples
        """
        results = {}
        
        for row_idx in missing_popularity_rows:
            try:
                print(f"🤖 Processing Popularity Score for row {row_idx + 1}...")
                
                exercise_data = self.extract_exercise_data(row_idx)
                prompt = self.generate_popularity_prompt(exercise_data)
                
                # Get AI response
                response = self.chat_completion([
                    {"role": "user", "content": prompt}
                ])
                
                score, status_message = self.parse_ai_response(response, 'popularity')
                
                if score is not None:
                    results[row_idx] = (score, status_message)
                    print(f"✅ Popularity Score {score} assigned: {status_message}")
                else:
                    print(f"❌ Failed to get popularity score: {status_message}")
                
                # Add delay to avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Error processing row {row_idx}: {e}")
                results[row_idx] = (None, f"Error: {str(e)}")
        
        return results
    
    def update_dataframe(self, tier_results: Dict[int, Tuple[str, str]], 
                        popularity_results: Dict[int, Tuple[any, str]]) -> None:
        """
        Update the DataFrame with the AI-generated values.
        
        Args:
            tier_results: Dictionary of tier results
            popularity_results: Dictionary of popularity results
        """
        print("\n📝 Updating DataFrame with AI-generated values...")
        
        # Update Tier values
        for row_idx, (tier, status_message) in tier_results.items():
            if tier is not None:
                self.df.at[row_idx, 'Tier'] = tier
                print(f"✅ Updated row {row_idx + 1} Tier to {tier}")
        
        # Update Popularity Score values
        for row_idx, (score, status_message) in popularity_results.items():
            if score is not None:
                self.df.at[row_idx, 'Popularity Score'] = score
                print(f"✅ Updated row {row_idx + 1} Popularity Score to {score}")
    
    def save_updated_file(self, output_path: Optional[str] = None) -> bool:
        """
        Save the updated DataFrame to a new Excel file.
        
        Args:
            output_path: Optional custom output path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if output_path is None:
                file_path = Path(self.excel_file_path)
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                output_path = file_path.parent / f"{file_path.stem}_updated_{timestamp}{file_path.suffix}"
            
            # Save to Excel
            self.df.to_excel(output_path, index=False)
            print(f"💾 Updated file saved: {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save updated file: {e}")
            return False
    
    def run(self, output_path: Optional[str] = None) -> bool:
        """
        Run the complete feature filling process.
        
        Args:
            output_path: Optional custom output path for the updated file
            
        Returns:
            True if successful, False otherwise
        """
        print("🚀 Starting Exercise Features Auto-Filler...")
        
        # Load Excel file
        if not self.load_excel_file():
            return False
        
        # Create backup
        if not self.create_backup():
            print("⚠️  Warning: Could not create backup, proceeding anyway...")
        
        # Identify missing features
        missing_tier, missing_popularity = self.identify_missing_features()
        
        if not missing_tier and not missing_popularity:
            print("✅ No missing features found! File is already complete.")
            return True
        
        # Fill missing tiers
        tier_results = {}
        if missing_tier:
            print(f"\n🎯 Filling {len(missing_tier)} missing Tier values...")
            tier_results = self.fill_missing_tiers(missing_tier)
        
        # Fill missing popularity scores
        popularity_results = {}
        if missing_popularity:
            print(f"\n🎯 Filling {len(missing_popularity)} missing Popularity Score values...")
            popularity_results = self.fill_missing_popularity_scores(missing_popularity)
        
        # Update DataFrame
        self.update_dataframe(tier_results, popularity_results)
        
        # Save updated file
        if not self.save_updated_file(output_path):
            return False
        
        print("\n🎉 Exercise Features Auto-Filler completed successfully!")
        return True


def main():
    """Main function to run the script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Auto-fill exercise features using OpenAI")
    parser.add_argument("--excel_file", required=True, help="Path to the Excel file with exercise features")
    parser.add_argument("--output", help="Output path for the updated file (optional)")
    
    args = parser.parse_args()
    
    # Check if file exists
    if not os.path.exists(args.excel_file):
        print(f"❌ File not found: {args.excel_file}")
        return 1
    
    # Initialize and run the filler
    filler = ExerciseFeaturesFiller(args.excel_file)
    success = filler.run(args.output)
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
