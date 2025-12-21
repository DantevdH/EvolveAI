"""
Centralized model configuration for EvolveAI.

This is the SOURCE OF TRUTH for all model configurations.
All other files should reference these constants rather than hardcoding values.
"""

# =============================================================================
# LLM Model Configuration
# =============================================================================

DEFAULT_LLM_MODEL_COMPLEX = "gemini-2.5-flash"
DEFAULT_LLM_MODEL_LIGHTWEIGHT = "gemini-2.5-flash-lite"

# =============================================================================
# Embedding Model Configuration
# =============================================================================

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"

# =============================================================================
# Temperature Configuration
# =============================================================================

DEFAULT_TEMPERATURE = 0.7
