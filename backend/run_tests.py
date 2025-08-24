#!/usr/bin/env python3
"""
EvolveAI Test Runner

This script provides easy access to run different types of tests
based on the new organized test structure.
"""

import subprocess
import sys
import os
from typing import List, Optional

def run_command(command: List[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n🚀 {description}")
    print("=" * 60)
    print(f"Running: {' '.join(command)}")
    print("=" * 60)
    
    try:
        result = subprocess.run(command, check=True, capture_output=False)
        print(f"\n✅ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {description} failed with exit code {e.returncode}")
        return False

def main():
    """Main test runner function."""
    print("🧪 EvolveAI Test Runner")
    print("=" * 60)
    print("Choose your testing strategy:")
    print("1. 🧩 Unit Tests Only (Fast, isolated)")
    print("2. 🔗 Integration Tests Only (Component interactions)")
    print("3. 🌐 End-to-End Tests Only (Complete workflows)")
    print("4. 🏗️ Infrastructure Tests Only (Core system tests)")
    print("5. 🛠️ Utils Tests Only (Utility function tests)")
    print("6. 🚀 All Tests (Complete test suite)")
    print("7. 📊 Coverage Report (All tests with coverage)")
    print("8. 🔍 Quick Health Check (Fast unit tests)")
    
    choice = input("\nEnter your choice (1-8): ").strip()
    
    base_command = ["python", "-m", "pytest"]
    
    if choice == "1":
        # Unit tests only
        success = run_command(
            base_command + ["tests/unit/", "-v"],
            "Running Unit Tests (Component-level, isolated)"
        )
        
    elif choice == "2":
        # Integration tests only
        success = run_command(
            base_command + ["tests/integration/", "-v"],
            "Running Integration Tests (Component interactions)"
        )
        
    elif choice == "3":
        # End-to-end tests only
        success = run_command(
            base_command + ["tests/end_to_end/", "-v"],
            "Running End-to-End Tests (Complete workflows)"
        )
        
    elif choice == "4":
        # Infrastructure tests only
        success = run_command(
            base_command + ["tests/infrastructure/", "-v"],
            "Running Infrastructure Tests (Core system tests)"
        )
        
    elif choice == "5":
        # Utils tests only
        success = run_command(
            base_command + ["tests/utils/", "-v"],
            "Running Utils Tests (Utility function tests)"
        )
        
    elif choice == "6":
        # All tests
        success = run_command(
            base_command + ["tests/", "-v"],
            "Running All Tests (Complete test suite)"
        )
        
    elif choice == "7":
        # Coverage report
        success = run_command(
            base_command + ["tests/", "--cov=core", "--cov-report=term-missing"],
            "Running All Tests with Coverage Report"
        )
        
    elif choice == "8":
        # Quick health check (just unit tests)
        success = run_command(
            base_command + ["tests/unit/", "-v", "--tb=short"],
            "Quick Health Check (Unit tests only)"
        )
        
    else:
        print("❌ Invalid choice. Please run the script again.")
        return False
    
    if success:
        print("\n🎉 Test execution completed successfully!")
        print("\n💡 Tips:")
        print("   • Use 'python -m pytest tests/unit/ -v' for fast feedback")
        print("   • Use 'python -m pytest tests/integration/ -v' for integration testing")
        print("   • Use 'python -m pytest tests/end_to_end/ -v' for complete workflows")
        print("   • Use 'python -m pytest tests/infrastructure/ -v' for core system tests")
        print("   • Use 'python -m pytest tests/utils/ -v' for utility function tests")
        print("   • Use 'python -m pytest tests/ --cov=core' for coverage analysis")
        print("   • Check tests/README.md for detailed testing guidelines")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        print("💡 Consider running individual test categories to isolate issues.")
    
    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Test execution interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
