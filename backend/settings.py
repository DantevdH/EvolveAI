"""
Configuration settings for EvolveAI.

This module centralizes all configuration settings including environment variables,
API keys, and system configuration.
"""

import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
from logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)

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
        """
        Validate that required settings are configured.
        
        In test environment, this will return True if test values are present
        (even if they're dummy values). This allows tests to run without real credentials.
        """
        # Check if we're in a test environment
        is_test_env = (
            os.getenv("ENVIRONMENT", "").lower() == "test" or
            os.getenv("PYTEST_CURRENT_TEST") is not None or
            "pytest" in os.getenv("_", "").lower()
        )
        
        required_settings = [
            ("OPENAI_API_KEY", cls.OPENAI_API_KEY),
            ("SUPABASE_URL", cls.SUPABASE_URL),
            ("SUPABASE_ANON_KEY", cls.SUPABASE_ANON_KEY),
        ]

        missing_settings = [name for name, value in required_settings if not value]

        if missing_settings:
            # In test environment, be more lenient - just warn
            if is_test_env:
                logger.warning(
                    f"Test environment: Some environment variables are missing: {', '.join(missing_settings)}. "
                    "Tests may use mock values. This is expected in CI/CD."
                )
                # Return True in test env to allow tests to proceed
                # Tests should mock services that require these values
                return True
            else:
                logger.error("Missing required environment variables:")
                for setting in missing_settings:
                    logger.error(f"   - {setting}")
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
