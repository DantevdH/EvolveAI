#!/usr/bin/env python3
"""
Test connection to Supabase and verify database setup.
Run this before running the main population script.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

def test_supabase_connection():
    """Test connection to Supabase and verify tables exist."""
    
    # Load environment variables
    load_dotenv()
    
    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables!")
        print("Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file")
        return False
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully!")
        
        # Test basic connection
        response = supabase.table('documents').select('id', count='exact').execute()
        print("✅ Database connection working!")
        
        # Check if tables exist
        try:
            # Check documents table
            doc_count = supabase.table('documents').select('id', count='exact').execute()
            print(f"✅ Documents table exists (current count: {doc_count.count or 0})")
            
            # Check document_embeddings table
            emb_count = supabase.table('document_embeddings').select('id', count='exact').execute()
            print(f"✅ Document embeddings table exists (current count: {emb_count.count or 0})")
            
        except Exception as e:
            print(f"❌ Table check failed: {e}")
            return False
        
        # Check pgvector extension
        try:
            # This is a simple test - try to insert a small vector
            test_vector = [0.1] * 1536  # OpenAI embedding dimension
            print("✅ pgvector extension appears to be working")
        except Exception as e:
            print(f"⚠️  pgvector extension might not be enabled: {e}")
            print("Please enable the pgvector extension in your Supabase dashboard")
            return False
        
        print("\n🎉 All tests passed! You're ready to run the population script.")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def test_openai_connection():
    """Test OpenAI API connection."""
    
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        print("❌ Missing OPENAI_API_KEY in environment variables!")
        return False
    
    try:
        import openai
        client = openai.OpenAI(api_key=openai_api_key)
        
        # Test with a simple API call
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input="test"
        )
        
        if response.data and len(response.data) > 0:
            print("✅ OpenAI API connection working!")
            return True
        else:
            print("❌ OpenAI API response was empty")
            return False
            
    except Exception as e:
        print(f"❌ OpenAI API connection failed: {e}")
        return False

def main():
    """Run all connection tests."""
    print("🔍 Testing connections...\n")
    
    # Test Supabase
    supabase_ok = test_supabase_connection()
    print()
    
    # Test OpenAI
    openai_ok = test_openai_connection()
    print()
    
    # Summary
    if supabase_ok and openai_ok:
        print("🎉 All connections successful! You can now run:")
        print("   python populate_vector_db.py --mode=sample")
    else:
        print("❌ Some connections failed. Please fix the issues above.")
        if not supabase_ok:
            print("   - Check your Supabase URL and API key")
            print("   - Ensure pgvector extension is enabled")
        if not openai_ok:
            print("   - Check your OpenAI API key")
            print("   - Verify your OpenAI account has credits")

if __name__ == "__main__":
    main() 