#!/usr/bin/env python3
"""
Simple test script to verify the populate script functionality.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import the script
sys.path.append(str(Path(__file__).parent.parent.parent))

def test_script_import():
    """Test that the script can be imported."""
    try:
        from scripts.populate.populate_vector_db import VectorDBPopulator
        print("✅ Successfully imported VectorDBPopulator")
        return True
    except ImportError as e:
        print(f"❌ Failed to import VectorDBPopulator: {e}")
        return False

def test_class_instantiation():
    """Test that the class can be instantiated (without running full initialization)."""
    try:
        from scripts.populate.populate_vector_db import VectorDBPopulator
        
        # Mock environment variables for testing
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_ANON_KEY"] = "test_key"
        os.environ["OPENAI_API_KEY"] = "test_key"
        
        # This should work now
        populator = VectorDBPopulator()
        print("✅ Successfully instantiated VectorDBPopulator")
        return True
        
    except Exception as e:
        print(f"❌ Failed to instantiate VectorDBPopulator: {e}")
        return False

def test_methods_exist():
    """Test that expected methods exist."""
    try:
        from scripts.populate.populate_vector_db import VectorDBPopulator
        
        expected_methods = [
            'process_pdf',
            'process_structured_file',
            'process_data_directory',
            'process_single_file',
            'chunk_text',
            'generate_embeddings',
            'populate_database'
        ]
        
        # Mock environment variables
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_ANON_KEY"] = "test_key"
        os.environ["OPENAI_API_KEY"] = "test_key"
        
        populator = VectorDBPopulator()
        
        for method in expected_methods:
            if hasattr(populator, method):
                print(f"✅ Method exists: {method}")
            else:
                print(f"❌ Missing method: {method}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing methods: {e}")
        return False

def test_deprecated_methods_removed():
    """Test that deprecated sample data methods are removed."""
    try:
        from scripts.populate.populate_vector_db import VectorDBPopulator
        
        deprecated_methods = [
            'create_sample_documents',
            'run_sample_population'
        ]
        
        # Mock environment variables
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_ANON_KEY"] = "test_key"
        os.environ["OPENAI_API_KEY"] = "test_key"
        
        populator = VectorDBPopulator()
        
        for method in deprecated_methods:
            if hasattr(populator, method):
                print(f"❌ Deprecated method still exists: {method}")
                return False
            else:
                print(f"✅ Deprecated method removed: {method}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing deprecated methods: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing populate script functionality...\n")
    
    tests = [
        ("Import Test", test_script_import),
        ("Class Instantiation", test_class_instantiation),
        ("Methods Exist", test_methods_exist),
        ("Deprecated Methods Removed", test_deprecated_methods_removed)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Running {test_name}...")
        if test_func():
            passed += 1
            print(f"✅ {test_name} PASSED\n")
        else:
            print(f"❌ {test_name} FAILED\n")
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The populate script is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
