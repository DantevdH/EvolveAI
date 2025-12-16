"""
Pre-download ML models for production deployment.

This script downloads the Jina reranker model during the build/deployment
phase to avoid cold-start delays and ensure models are available offline.

Usage:
    python scripts/download_models.py

Environment Variables:
    HF_HOME: Hugging Face cache directory (optional, defaults to ~/.cache/huggingface)
    TRANSFORMERS_CACHE: Alternative cache location (optional)
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from logging_config import get_logger

logger = get_logger(__name__)


def download_reranker_model():
    """Download the Jina reranker v1-tiny-en model."""
    try:
        from sentence_transformers import CrossEncoder

        logger.info("Downloading Jina reranker v1-tiny-en model...")
        logger.info(f"Cache directory: {os.getenv('HF_HOME', '~/.cache/huggingface')}")

        # Download and cache the model
        model = CrossEncoder(
            'jinaai/jina-reranker-v1-tiny-en',
            trust_remote_code=False
        )

        logger.info("✓ Jina reranker v1-tiny-en model downloaded successfully")
        logger.info(f"  Model type: {type(model)}")
        logger.info(f"  Model size: ~33M parameters (very lightweight)")

        # Test the model works
        test_query = "What is strength training?"
        test_doc = "Strength training builds muscle and increases power."
        score = model.predict([(test_query, test_doc)])
        logger.info(f"✓ Model test successful (score: {score})")

        return True

    except ImportError as e:
        logger.error(f"✗ sentence-transformers not installed: {e}")
        logger.error("  Install with: pip install sentence-transformers==3.3.1")
        return False

    except Exception as e:
        logger.error(f"✗ Failed to download model: {e}")
        return False


def download_all_models():
    """Download all required models for production."""
    logger.info("=" * 60)
    logger.info("Pre-downloading models for production deployment")
    logger.info("=" * 60)

    success = True

    # Download re-ranker model
    if not download_reranker_model():
        success = False

    logger.info("=" * 60)
    if success:
        logger.info("✓ All models downloaded successfully")
        logger.info("=" * 60)
        return 0
    else:
        logger.error("✗ Some models failed to download")
        logger.info("=" * 60)
        return 1


if __name__ == "__main__":
    exit_code = download_all_models()
    sys.exit(exit_code)
