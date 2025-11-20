#!/usr/bin/env python3
"""
Startup script for the EvolveAI FastAPI backend server.
"""

import uvicorn
import os
from dotenv import load_dotenv
from settings import settings

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Configuration
    host = settings.HOST
    port = settings.PORT
    reload = os.getenv("RELOAD", "true").lower() == "true"

    print(f"Starting EvolveAI FastAPI server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Reload: {reload}")
    print(f"LLM Complex Model: {settings.LLM_MODEL_COMPLEX}")
    print(f"LLM Lightweight Model: {settings.LLM_MODEL_LIGHTWEIGHT}")

    # Start the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
        access_log=True,
    )
