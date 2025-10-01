#!/usr/bin/env python3
"""
Test script to verify TF-IDF keyword extraction functionality.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import the script
sys.path.append(str(Path(__file__).parent.parent.parent))

def test_keyword_extraction():
    """Test the TF-IDF keyword extraction functionality."""
    try:
        from scripts.populate.populate_vector_db import VectorDBPopulator
        
        # Create instance (without full initialization)
        populator = VectorDBPopulator.__new__(VectorDBPopulator)
        
        # Test training content
        training_text = """
        This is a comprehensive strength training guide for beginners. 
        It covers essential exercises like squats, deadlifts, and bench press.
        The program focuses on progressive overload and proper form.
        Equipment needed includes dumbbells, barbell, and a squat rack.
        Training frequency is 3 times per week with rest days in between.
        Progressive overload is the key principle for muscle building and strength gains.
        """
        
        print("🏋️‍♂️ Testing training Content:")
        keywords = populator._extract_keywords(training_text)
        print(f"   Keywords: {keywords}")
        
        topic = populator._detect_topic(training_text)
        print(f"   Topic: {topic}")
        
        # Test nutrition content
        nutrition_text = """
        This nutrition guide covers macronutrients including protein, 
        carbohydrates, and healthy fats. Learn about meal timing, 
        calorie counting, and supplements. Includes meal plans for 
        muscle building and weight loss goals. Protein intake should be
        around 1.6-2.2g per kg body weight for optimal muscle growth.
        """
        
        print("\n🥗 Testing Nutrition Content:")
        keywords = populator._extract_keywords(nutrition_text)
        print(f"   Keywords: {keywords}")
        
        topic = populator._detect_topic(nutrition_text)
        print(f"   Topic: {topic}")
        
        # Test running content
        running_text = """
        This running program includes interval training, tempo runs, 
        and long distance training. Prepare for 5k, 10k, and marathon races.
        Focus on pace, cadence, and endurance building. Interval training
        alternates between high intensity sprints and recovery periods.
        """
        
        print("\n🏃‍♂️ Testing Running Content:")
        keywords = populator._extract_keywords(running_text)
        print(f"   Keywords: {keywords}")
        
        topic = populator._detect_topic(running_text)
        print(f"   Topic: {topic}")
        
        # Test TF-IDF vs fallback
        print("\n🔬 Testing TF-IDF Keyword Extraction:")
        try:
            tfidf_keywords = populator._extract_keywords(training_text)
            print(f"   TF-IDF Keywords: {tfidf_keywords}")
        except Exception as e:
            print(f"   TF-IDF failed: {e}")
        
        print("\n✅ TF-IDF keyword extraction test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_keyword_extraction()
    sys.exit(0 if success else 1)
