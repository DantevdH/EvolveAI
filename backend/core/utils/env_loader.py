"""
Centralized environment variable loading utility.

This module provides a single source of truth for loading environment variables.
It ensures .env files are only loaded once and respects test environment detection.

BEST PRACTICES:
1. Always use this module instead of calling load_dotenv() directly
2. This prevents duplicate .env loading and ensures test environment is respected
3. Test environment detection happens BEFORE any .env loading
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Track if .env has been loaded to prevent duplicate loading
_env_loaded = False


def is_test_environment() -> bool:
    """
    Check if we're running in a test environment.
    
    This should be checked BEFORE loading any .env files to prevent
    test environment variables from being overwritten.
    
    Returns:
        True if in test environment, False otherwise
    """
    return (
        os.getenv("ENVIRONMENT", "").lower() == "test"
        or os.getenv("PYTEST_CURRENT_TEST") is not None
        or "pytest" in os.getenv("_", "").lower()
        or "PYTEST" in os.environ
        or os.getenv("PYTEST_VERSION") is not None
    )


def load_environment(env_file: Optional[Path] = None, override: bool = False) -> None:
    """
    Load environment variables from .env file.
    
    This function:
    1. Checks if we're in a test environment FIRST
    2. Only loads .env if NOT in test environment
    3. Prevents duplicate loading (idempotent)
    4. Respects existing environment variables by default (override=False)
    
    Args:
        env_file: Optional path to .env file. If None, searches for .env in project root.
        override: If True, .env values override existing env vars. Default: False (existing vars take precedence).
    
    Best Practice:
        - In production/development: Call this once at application startup
        - In tests: Don't call this - let conftest.py or pytest.ini set env vars
        - Use override=False to allow test env vars to take precedence
    """
    global _env_loaded
    
    # CRITICAL: Check test environment BEFORE loading .env
    if is_test_environment():
        # In test environment, don't load .env file
        # Tests should set env vars via conftest.py, pytest.ini, or pytest-env
        return
    
    # Prevent duplicate loading (unless override is explicitly requested)
    if _env_loaded and not override:
        return
    
    # Determine .env file path
    if env_file is None:
        # Default: look for .env in project root (parent of backend directory)
        backend_dir = Path(__file__).parent.parent.parent
        env_file = backend_dir / ".env"
    elif isinstance(env_file, str):
        env_file = Path(env_file)
    
    # Load .env file if it exists
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=override)
        _env_loaded = True
    elif not _env_loaded:
        # Only warn on first attempt if file doesn't exist
        # This prevents spam in tests or when .env is intentionally missing
        import warnings
        warnings.warn(
            f".env file not found at {env_file}. "
            "Using environment variables from system/environment only.",
            UserWarning
        )


def reset_env_loader() -> None:
    """
    Reset the environment loader state (for testing only).
    
    This allows tests to reset the _env_loaded flag if needed.
    Should only be used in test fixtures.
    """
    global _env_loaded
    _env_loaded = False

