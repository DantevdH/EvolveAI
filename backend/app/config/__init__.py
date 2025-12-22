"""
Configuration module for EvolveAI.

Centralizes model configuration and other application constants.
"""

from app.config.model_config import (
    DEFAULT_LLM_MODEL_COMPLEX,
    DEFAULT_LLM_MODEL_LIGHTWEIGHT,
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_TEMPERATURE,
)

__all__ = [
    "DEFAULT_LLM_MODEL_COMPLEX",
    "DEFAULT_LLM_MODEL_LIGHTWEIGHT",
    "DEFAULT_EMBEDDING_MODEL",
    "DEFAULT_TEMPERATURE",
]

