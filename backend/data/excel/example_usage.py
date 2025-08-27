"""
Example usage of the ExerciseFeaturesFiller class.

This script demonstrates how to use the ExerciseFeaturesFiller
to automatically fill missing exercise features in an Excel file.
"""

from provide_features import ExerciseFeaturesFiller
import os


def example_usage():
    """Example of how to use the ExerciseFeaturesFiller class."""
    
    # Path to your Excel file
    excel_file_path = "path/to/your/exercise_features.xlsx"
    
    # Check if file exists
    if not os.path.exists(excel_file_path):
        print(f"❌ File not found: {excel_file_path}")
        print("Please update the excel_file_path variable with the correct path.")
        return
    
    # Initialize the filler
    filler = ExerciseFeaturesFiller(excel_file_path)
    
    # Run the automatic filling process
    success = filler.run()
    
    if success:
        print("🎉 Successfully filled missing exercise features!")
        print(f"📁 Check the updated file in the same directory as {excel_file_path}")
    else:
        print("❌ Failed to fill exercise features. Check the error messages above.")


def example_with_custom_output():
    """Example with custom output path."""
    
    excel_file_path = "path/to/your/exercise_features.xlsx"
    custom_output = "path/to/output/filled_exercises.xlsx"
    
    if not os.path.exists(excel_file_path):
        print(f"❌ File not found: {excel_file_path}")
        return
    
    filler = ExerciseFeaturesFiller(excel_file_path)
    success = filler.run(output_path=custom_output)
    
    if success:
        print(f"🎉 Successfully filled missing exercise features!")
        print(f"📁 Updated file saved to: {custom_output}")


if __name__ == "__main__":
    print("🚀 Exercise Features Filler - Example Usage")
    print("=" * 50)
    
    # Run the basic example
    example_usage()
    
    print("\n" + "=" * 50)
    print("💡 To use with a custom output path, call:")
    print("example_with_custom_output()")
