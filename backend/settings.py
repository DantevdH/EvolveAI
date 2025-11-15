"""
Configuration settings for EvolveAI.

This module centralizes all configuration settings including environment variables,
API keys, and system configuration.
"""

import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in the root directory

# Get the path to the root .env file (one level up from backend/)
root_dir = Path(__file__).parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings."""

    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")  # JWT secret for token verification

    # Service Configuration
    PREMIUM_TIER_ENABLED: bool = (
        os.getenv("PREMIUM_TIER_ENABLED", "true").lower() == "true"
    )
    FALLBACK_TO_FREE: bool = os.getenv("FALLBACK_TO_FREE", "true").lower() == "true"
    PLAYBOOK_CONTEXT_MATCHING_ENABLED: bool = (
        os.getenv("PLAYBOOK_CONTEXT_MATCHING_ENABLED", "false").lower() == "true"
    )

    # Development Configuration
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    @classmethod
    def validate(cls) -> bool:
        """Validate that required settings are configured."""
        required_settings = [
            cls.OPENAI_API_KEY,
            cls.SUPABASE_URL,
            cls.SUPABASE_ANON_KEY,
        ]

        missing_settings = [setting for setting in required_settings if not setting]

        if missing_settings:
            print("❌ Missing required environment variables:")
            for setting in missing_settings:
                print(f"   - {setting}")
            return False

        return True

    @classmethod
    def get_openai_config(cls) -> dict:
        """Get OpenAI configuration as a dictionary."""
        return {
            "api_key": cls.OPENAI_API_KEY,
            "model": cls.OPENAI_MODEL,
            "temperature": cls.OPENAI_TEMPERATURE,
        }

    @classmethod
    def get_supabase_config(cls) -> dict:
        """Get Supabase configuration as a dictionary."""
        return {"url": cls.SUPABASE_URL, "anon_key": cls.SUPABASE_ANON_KEY}


# Global settings instance
settings = Settings()
