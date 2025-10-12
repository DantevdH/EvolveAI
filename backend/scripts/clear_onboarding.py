#!/usr/bin/env python3
"""
Script to clear user onboarding data from the database.
This allows users to start fresh with updated schema requirements.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client
from dotenv import load_dotenv


def clear_onboarding_data():
    """Clear onboarding data for the most recent user."""
    try:
        # Load environment variables from backend directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_path = os.path.join(backend_dir, ".env")
        load_dotenv(env_path)

        # Initialize Supabase client directly
        print("🔄 Initializing connection to database...")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            print("❌ Missing SUPABASE_URL or SUPABASE_KEY in environment variables")
            return False

        supabase = create_client(supabase_url, supabase_key)

        # Get the most recent user profile
        print("🔍 Finding user profile...")
        result = (
            supabase.table("user_profiles")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not result.data or len(result.data) == 0:
            print("❌ No user profiles found in database")
            return False

        user_profile = result.data[0]
        user_id = user_profile["id"]
        username = user_profile.get("username", "Unknown")

        print(f"\n📋 User Profile Found:")
        print(f"   Username: {username}")
        print(f"   User ID: {user_id}")
        print(f'   Email: {user_profile.get("email", "N/A")}')

        # Clear onboarding-related fields
        print(f"\n🧹 Clearing onboarding data...")
        update_data = {
            "initial_questions": None,
            "follow_up_questions": None,
            "initial_responses": None,
            "follow_up_responses": None,
            "plan_outline": None,
            "plan_outline_feedback": None,
        }

        update_result = (
            supabase.table("user_profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        if update_result.data:
            print(f"\n✅ Successfully cleared onboarding data for user: {username}")
            print(f"   ✓ Cleared: initial_questions")
            print(f"   ✓ Cleared: follow_up_questions")
            print(f"   ✓ Cleared: initial_responses")
            print(f"   ✓ Cleared: follow_up_responses")
            print(f"   ✓ Cleared: plan_outline")
            print(f"   ✓ Cleared: plan_outline_feedback")
            print(f"\n✨ User can now start fresh with the new schema!")
            print(
                f"\n📱 Please restart your app to begin the onboarding process again."
            )
            return True
        else:
            print(f"❌ Failed to update user profile")
            return False

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  CLEAR ONBOARDING DATA")
    print("=" * 60)
    print()

    success = clear_onboarding_data()

    print()
    print("=" * 60)

    sys.exit(0 if success else 1)
