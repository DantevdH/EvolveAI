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
import subprocess
import socket
from pathlib import Path
from typing import Optional, Dict
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


def is_production_environment() -> bool:
    """
    Check if we're running in a production environment.
    
    In production, we should NOT load .env files and should rely
    entirely on system environment variables (set by deployment platform).
    
    Returns:
        True if in production environment, False otherwise
    """
    env = os.getenv("ENVIRONMENT", "").lower()
    # Check for common production indicators
    return (
        env == "production"
        or os.getenv("RENDER") is not None  # Render.com sets this
        or os.getenv("RAILWAY_ENVIRONMENT") is not None  # Railway sets this
        or os.getenv("VERCEL") is not None  # Vercel sets this
        or os.getenv("HEROKU") is not None  # Heroku sets this
        or os.getenv("DYNO") is not None  # Heroku dyno indicator
    )


def is_local_supabase_running() -> bool:
    """
    Check if local Supabase is running on port 54321.
    
    Returns:
        True if local Supabase API port is accessible, False otherwise
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)  # 1 second timeout
        result = sock.connect_ex(('127.0.0.1', 54321))
        sock.close()
        return result == 0
    except Exception:
        return False


def extract_local_supabase_credentials() -> Dict[str, str]:
    """
    Parse `supabase status` output and extract credentials.
    
    Returns:
        Dictionary with keys: url, anon_key, service_role_key, jwt_secret
        Returns empty dict if extraction fails
    """
    credentials = {}
    try:
        # Run supabase status command
        result = subprocess.run(
            ['supabase', 'status'],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=Path(__file__).parent.parent.parent.parent  # Project root
        )
        
        if result.returncode != 0:
            return credentials
        
        # Parse output for credentials
        output = result.stdout
        
        # Extract API URL (Project URL)
        for line in output.split('\n'):
            if 'API URL' in line or 'Project URL' in line:
                # Format: "API URL: http://127.0.0.1:54321"
                parts = line.split(':')
                if len(parts) >= 3:
                    credentials['url'] = ':'.join(parts[2:]).strip()
            
            # Extract anon key (Publishable anon key)
            if 'anon key' in line.lower() or 'publishable' in line.lower():
                parts = line.split()
                for i, part in enumerate(parts):
                    if part.lower() in ['key', 'anon'] and i + 1 < len(parts):
                        credentials['anon_key'] = parts[i + 1].strip()
                        break
                # Alternative format: "anon key: eyJ..."
                if 'anon_key' not in credentials:
                    parts = line.split(':')
                    if len(parts) >= 2:
                        credentials['anon_key'] = parts[-1].strip()
            
            # Extract service_role key
            if 'service_role key' in line.lower() or 'service_role' in line.lower():
                parts = line.split()
                for i, part in enumerate(parts):
                    if 'service' in part.lower() and i + 2 < len(parts):
                        credentials['service_role_key'] = parts[i + 2].strip()
                        break
                # Alternative format: "service_role key: eyJ..."
                if 'service_role_key' not in credentials:
                    parts = line.split(':')
                    if len(parts) >= 2:
                        credentials['service_role_key'] = parts[-1].strip()
            
            # Extract JWT secret
            if 'jwt secret' in line.lower():
                parts = line.split(':')
                if len(parts) >= 2:
                    credentials['jwt_secret'] = parts[-1].strip()
        
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, Exception) as e:
        # Silently fail - this is expected if supabase CLI is not available
        # or if we're not in the right directory
        pass
    
    return credentials


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
    
    # CRITICAL: Check production environment - never load .env files in production
    if is_production_environment():
        # In production, rely entirely on system environment variables
        # (set by deployment platform like Render, Railway, etc.)
        # Do not load .env files - they shouldn't exist in production anyway
        return
    
    # Prevent duplicate loading (unless override is explicitly requested)
    if _env_loaded and not override:
        return
    
    # Determine .env file path - simple: just use .env for local development
    if env_file is None:
        # Default: look for .env in project root (parent of backend directory)
        # Path(__file__) = backend/app/utils/env_loader.py
        # parent.parent.parent = backend/
        # parent.parent.parent.parent = project root
        project_root = Path(__file__).parent.parent.parent.parent
        env_file = project_root / ".env"
    elif isinstance(env_file, str):
        env_file = Path(env_file)
    
    # Auto-detect local Supabase and extract credentials if running locally
    # This allows .env to contain only production values
    if is_local_supabase_running():
        credentials = extract_local_supabase_credentials()
        if credentials:
            # Set credentials as environment variables (these override .env values)
            if 'url' in credentials:
                os.environ.setdefault('SUPABASE_URL', credentials['url'])
            if 'anon_key' in credentials:
                os.environ.setdefault('SUPABASE_ANON_KEY', credentials['anon_key'])
            if 'service_role_key' in credentials:
                os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', credentials['service_role_key'])
            if 'jwt_secret' in credentials:
                os.environ.setdefault('SUPABASE_JWT_SECRET', credentials['jwt_secret'])
    
    # Load .env file if it exists (only in local development - production returns early)
    # Note: Local Supabase credentials (if detected) take precedence due to setdefault above
    if env_file and env_file.exists():
        load_dotenv(dotenv_path=env_file, override=override)
        _env_loaded = True
    elif not _env_loaded:
        # Only warn on first attempt if file doesn't exist
        # This prevents spam in tests or when .env is intentionally missing
        import warnings
        warnings.warn(
            f"No .env file found at {env_file}. "
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

