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
    from app.utils.env_loader import load_environment
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
    
    All settings read from environment variables dynamically using properties.
    This ensures settings always reflect current environment values, even in tests
    where env vars are set after module import.
    """

    # Unified LLM Configuration (Primary - supports OpenAI, Gemini, Claude, etc.)
    @property
    def LLM_API_KEY(self) -> str:
        """LLM API key (works for all providers: OpenAI, Gemini, Claude, etc.)"""
        return os.getenv("LLM_API_KEY", "")
    
    @property
    def LLM_MODEL_COMPLEX(self) -> str:
        """Complex model name for advanced tasks"""
        return os.getenv("LLM_MODEL_COMPLEX", "gemini-2.5-flash")
    
    @property
    def LLM_MODEL_LIGHTWEIGHT(self) -> str:
        """Lightweight model name for simple tasks"""
        return os.getenv("LLM_MODEL_LIGHTWEIGHT", "gemini-2.5-flash-lite")
    
    @property
    def TEMPERATURE(self) -> float:
        """Temperature setting for LLM generation"""
        return float(os.getenv("TEMPERATURE", "0.7"))

    # Supabase Configuration
    @property
    def SUPABASE_URL(self) -> str:
        """Supabase project URL"""
        return os.getenv("SUPABASE_URL", "")
    
    @property
    def SUPABASE_ANON_KEY(self) -> str:
        """Supabase anonymous key"""
        return os.getenv("SUPABASE_ANON_KEY", "")
    
    @property
    def SUPABASE_SERVICE_ROLE_KEY(self) -> str:
        """Supabase service role key (for server-side operations)"""
        return os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        """Legacy symmetric JWT secret (HS256) - for backward compatibility"""
        return os.getenv("SUPABASE_JWT_SECRET", "")
    
    @property
    def SUPABASE_JWT_PUBLIC_KEY(self) -> str:
        """Asymmetric JWT public key (ES256 for ECC P-256 or RS256 for RSA) - for new signing keys"""
        return os.getenv("SUPABASE_JWT_PUBLIC_KEY", "")

    # Service Configuration
    @property
    def PREMIUM_TIER_ENABLED(self) -> bool:
        """Whether premium tier features are enabled"""
        return os.getenv("PREMIUM_TIER_ENABLED", "true").lower() == "true"
    
    @property
    def FALLBACK_TO_FREE(self) -> bool:
        """Whether to fallback to free tier when premium fails"""
        return os.getenv("FALLBACK_TO_FREE", "true").lower() == "true"
    
    @property
    def PLAYBOOK_CONTEXT_MATCHING_ENABLED(self) -> bool:
        """Whether playbook context matching is enabled"""
        return os.getenv("PLAYBOOK_CONTEXT_MATCHING_ENABLED", "false").lower() == "true"

    # Development Configuration
    @property
    def DEBUG(self) -> bool:
        """Debug mode flag"""
        return os.getenv("DEBUG", "false").lower() == "true"

    # Server Configuration
    @property
    def HOST(self) -> str:
        """Server host address"""
        return os.getenv("HOST", "0.0.0.0")
    
    @property
    def PORT(self) -> int:
        """Server port number"""
        return int(os.getenv("PORT", "8000"))

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
        llm_api_key = os.getenv("LLM_API_KEY", "")
        required_settings = [
            ("LLM_API_KEY", llm_api_key),
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

    def get_openai_config(self) -> dict:
        """
        Get LLM configuration as a dictionary (DEPRECATED - use get_llm_config instead).
        
        Returns unified LLM config for backward compatibility.
        """
        return {
            "api_key": self.LLM_API_KEY,
            "model": self.LLM_MODEL_COMPLEX,
            "temperature": self.TEMPERATURE,
        }
    
    def get_llm_config(self) -> dict:
        """Get unified LLM configuration as a dictionary."""
        return {
            "api_key": self.LLM_API_KEY,
            "complex_model": self.LLM_MODEL_COMPLEX,
            "lightweight_model": self.LLM_MODEL_LIGHTWEIGHT,
            "temperature": self.TEMPERATURE,
        }

    def get_supabase_config(self) -> dict:
        """Get Supabase configuration as a dictionary."""
        return {"url": self.SUPABASE_URL, "anon_key": self.SUPABASE_ANON_KEY}


# Global settings instance
settings = Settings()
