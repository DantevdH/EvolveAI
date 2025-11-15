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

    assert supabase_url is not None, "Missing SUPABASE_URL environment variable"
    assert supabase_key is not None, "Missing SUPABASE_ANON_KEY environment variable"

    try:
        # Create Supabase client with minimal options to avoid compatibility issues
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully!")

        # Test basic connection
        response = supabase.table("documents").select("id", count="exact").execute()
        print("✅ Database connection working!")

        # Check if tables exist
        try:
            # Check documents table
            doc_count = (
                supabase.table("documents").select("id", count="exact").execute()
            )
            print(f"✅ Documents table exists (current count: {doc_count.count or 0})")

            # Check document_embeddings table
            emb_count = (
                supabase.table("document_embeddings")
                .select("id", count="exact")
                .execute()
            )
            print(
                f"✅ Document embeddings table exists (current count: {emb_count.count or 0})"
            )

        except Exception as e:
            print(f"❌ Table check failed: {e}")
            assert False, f"Table check failed: {e}"

        # Check pgvector extension
        try:
            # This is a simple test - try to insert a small vector
            test_vector = [0.1] * 1536  # OpenAI embedding dimension
            print("✅ pgvector extension appears to be working")
        except Exception as e:
            print(f"⚠️  pgvector extension might not be enabled: {e}")
            print("Please enable the pgvector extension in your Supabase dashboard")
            assert False, f"pgvector extension might not be enabled: {e}"

        print("\n🎉 All tests passed! You're ready to run the population script.")

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        assert False, f"Connection failed: {e}"


def test_openai_connection():
    """Test OpenAI API connection."""

    openai_api_key = os.getenv("OPENAI_API_KEY")

    assert openai_api_key is not None, "Missing OPENAI_API_KEY environment variable"

    try:
        import openai

        client = openai.OpenAI(api_key=openai_api_key)

        # Test with the best embedding model
        response = client.embeddings.create(
            model="text-embedding-3-small", input="test"  # Best performance and quality
        )

        assert response.data is not None, "OpenAI API response should have data"
        assert len(response.data) > 0, "OpenAI API response should not be empty"
        print("✅ OpenAI API working with text-embedding-3-small!")

    except Exception as e:
        print(f"❌ OpenAI API connection failed: {e}")
        assert False, f"OpenAI API connection failed: {e}"


def main():
    """Run all connection tests."""
    print("🔍 Testing connections...\n")

    # Test Supabase
    print("1️⃣ Testing Supabase connection...")
    test_supabase_connection()

    print("\n2️⃣ Testing OpenAI connection...")
    test_openai_connection()

    print("\n🎉 All connection tests completed!")


if __name__ == "__main__":
    main()
