"""
Configuration settings for EvolveAI.

This module centralizes all configuration settings including environment variables,
API keys, and system configuration.
"""

import os
import logging
from typing import Optional
from pathlib import Path

# Lazy logger initialization to avoid import order issues
_logger = None

def _get_logger():
    """Get logger instance, initializing it lazily to avoid import order issues."""
    global _logger
    if _logger is None:
        try:
            from logging_config import get_logger
            _logger = get_logger(__name__)
        except (ImportError, AttributeError):
            # Fallback to standard logging if logging_config not available
            _logger = logging.getLogger(__name__)
            if not _logger.handlers:
                handler = logging.StreamHandler()
                handler.setFormatter(logging.Formatter("%(levelname)s - %(message)s"))
                _logger.addHandler(handler)
                _logger.setLevel(logging.WARNING)
    return _logger

# Load environment variables using centralized utility
# This ensures test environment is respected and prevents duplicate loading
try:
    from core.utils.env_loader import load_environment
    load_environment()  # Will automatically skip in test environment
except ImportError:
    # Fallback for cases where core.utils might not be available during import
    # This should rarely happen, but provides graceful degradation
    from dotenv import load_dotenv
    _is_test_env = (
        os.getenv("ENVIRONMENT", "").lower() == "test" or
        os.getenv("PYTEST_CURRENT_TEST") is not None or
        "pytest" in os.getenv("_", "").lower() or
        "PYTEST" in os.environ
    )
    if not _is_test_env:
        root_dir = Path(__file__).parent.parent
        env_path = root_dir / ".env"
        load_dotenv(dotenv_path=env_path, override=False)


class Settings:
    """
    Application settings.
    
    NOTE: Class attributes are evaluated at import time and may be stale.
    For validation, use validate() which reads from os.getenv() directly.
    For runtime access, properties would be better, but for backward compatibility
    we keep class attributes. They will be refreshed on module reload.
    """

    # OpenAI Configuration
    # NOTE: These are evaluated at class definition time (import time)
    # For fresh values, use os.getenv() directly or call validate()
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
        
        CRITICAL: This reads from os.getenv() DIRECTLY, not from class attributes.
        Class attributes are evaluated at import time and may be stale.
        Reading from os.getenv() ensures we get current environment values.
        
        In test environment, this will return True if test values are present
        (even if they're dummy values). This allows tests to run without real credentials.
        """
        # Check if we're in a test environment
        is_test_env = (
            os.getenv("ENVIRONMENT", "").lower() == "test" or
            os.getenv("PYTEST_CURRENT_TEST") is not None or
            "pytest" in os.getenv("_", "").lower() or
            "PYTEST" in os.environ
        )
        
        # CRITICAL: Read from os.getenv() directly, not from class attributes
        # Class attributes are evaluated at import time and may be stale
        # This ensures we get the current environment values (including test values)
        required_settings = [
            ("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", "")),
            ("SUPABASE_URL", os.getenv("SUPABASE_URL", "")),
            ("SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY", "")),
        ]

        missing_settings = [name for name, value in required_settings if not value]

        if missing_settings:
            # In test environment, be more lenient - just warn
            if is_test_env:
                _get_logger().warning(
                    f"Test environment: Some environment variables are missing: {', '.join(missing_settings)}. "
                    "Tests may use mock values. This is expected in CI/CD."
                )
                # Return True in test env to allow tests to proceed
                # Tests should mock services that require these values
                return True
            else:
                logger = _get_logger()
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
