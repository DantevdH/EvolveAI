"""
Centralized logging configuration for EvolveAI backend.

This module provides consistent logging setup across all backend modules.
"""

import logging
import os
import sys
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to WARNING and ERROR log levels."""
    
    # ANSI color codes
    YELLOW = '\033[93m'  # Warning color
    RED = '\033[91m'     # Error color
    RESET = '\033[0m'    # Reset color
    
    def format(self, record):
        # Add color based on log level
        if record.levelno == logging.WARNING:
            record.levelname = f"{self.YELLOW}{record.levelname}{self.RESET}"
        elif record.levelno >= logging.ERROR:
            record.levelname = f"{self.RED}{record.levelname}{self.RESET}"
        
        return super().format(record)


def setup_logging() -> None:
    """
    Set up logging configuration for the application.

    Configures logging based on environment variables:
    - LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - LOG_FILE: Optional log file path
    """
    # Get log level from environment variable
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    # Convert string to logging constant
    numeric_level = getattr(logging, log_level, logging.INFO)

    # Configure logging format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Create colored formatter
    colored_formatter = ColoredFormatter(log_format)
    
    # Create console handler with colored formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(colored_formatter)

    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=[console_handler],
    )

    # Add file handler if LOG_FILE is specified (no colors in file)
    log_file = os.getenv("LOG_FILE")
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(logging.Formatter(log_format))
        logging.getLogger().addHandler(file_handler)

    # Set specific logger levels for noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("supabase").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.

    Args:
        name: The name of the module (usually __name__)

    Returns:
        A configured logger instance
    """
    return logging.getLogger(name)


# Initialize logging when module is imported
setup_logging()
