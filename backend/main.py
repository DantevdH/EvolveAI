from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
import sys
from logging_config import get_logger
from core.training.training_api import router as training_router
from core.utils.env_loader import is_test_environment
from settings import settings

# Load environment variables using centralized utility
# This ensures test environment is respected and prevents duplicate loading
try:
    from core.utils.env_loader import load_environment
    load_environment()  # Will automatically skip in test environment
except ImportError:
    # Fallback if core.utils not available (shouldn't happen in normal operation)
    from dotenv import load_dotenv
    _is_test_env = (
        os.getenv("ENVIRONMENT", "").lower() == "test" or
        os.getenv("PYTEST_CURRENT_TEST") is not None or
        "pytest" in os.getenv("_", "").lower() or
        "PYTEST" in os.environ
    )
    if not _is_test_env:
        load_dotenv(override=False)

# Initialize logging
logger = get_logger(__name__)

# Validate environment variables at startup
# Skip validation in test environment to allow tests to run without real credentials
is_test_env = is_test_environment()

# In test environment, skip validation entirely
if is_test_env:
    logger.debug("🧪 Test environment detected - skipping environment variable validation")
elif not settings.validate():
    logger.error("❌ Critical environment variables are missing. Server will not start.")
    raise ValueError("Missing required environment variables. Check logs for details.")

app = FastAPI(
    title="EvolveAI Training Plan Generator",
    description="FastAPI backend for generating personalized training plans using enhanced AI training Coach",
    version="2.0.0",
)

# Exception handler for Pydantic validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for Pydantic validation errors to log full details."""
    logger.error(f"❌ RequestValidationError on {request.method} {request.url}")
    logger.error(f"    Errors: {exc.errors()}")
    # Log body for debugging but truncate to prevent sensitive data exposure
    body_preview = str(exc.body)[:200] if exc.body else None
    if body_preview:
        logger.error(f"    Body preview: {body_preview}...")
    
    # Find the specific field that's missing
    for error in exc.errors():
        logger.error(f"    Missing field: {error.get('loc')}, Type: {error.get('type')}, Message: {error.get('msg')}")
    
    # Don't return full request body in error response - security risk
    # Sanitize error details to remove 'input' field which may contain sensitive data
    sanitized_errors = []
    for error in exc.errors():
        sanitized_error = {k: v for k, v in error.items() if k != 'input'}
        sanitized_errors.append(sanitized_error)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": sanitized_errors},
    )

# CORS middleware - restrict origins for production
# Get allowed origins from environment variable (comma-separated)
# Default to localhost for development
allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

# In production, ensure CORS is properly restricted
if os.getenv("ENVIRONMENT", "development") == "production" and "*" in allowed_origins:
    logger.warning("⚠️  CORS allow_origins contains '*' in production - this is a security risk!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Request timeout middleware
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio

REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "300"))  # Default: 5 minutes

class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await asyncio.wait_for(call_next(request), timeout=REQUEST_TIMEOUT)
            return response
        except asyncio.TimeoutError:
            logger.error(f"Request timeout after {REQUEST_TIMEOUT} seconds: {request.method} {request.url}")
            return JSONResponse(
                status_code=504,
                content={"detail": f"Request timeout after {REQUEST_TIMEOUT} seconds"}
            )

app.add_middleware(TimeoutMiddleware)

# Include training router
app.include_router(training_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "EvolveAI Training Plan Generator API v2.0", "status": "healthy"}


@app.get("/api/health/")
async def health_check():
    """Detailed health check endpoint."""
    return {"status": "healthy", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    from pathlib import Path
    import sys

    # Get the backend directory (where main.py is located)
    backend_dir = Path(__file__).parent.absolute()

    # Verify watchfiles is available
    try:
        import watchfiles
        print(f"✓ watchfiles {watchfiles.__version__} detected - using watchfiles for auto-reload")
    except ImportError:
        print("⚠ warning: watchfiles not available, falling back to stat-based reload")
        sys.exit(1)

    # Configure uvicorn with watchfiles to watch all backend files except .venv
    config = uvicorn.Config(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir)],  # Watch the entire backend directory
        reload_excludes=[
            "**/.venv/**",  # Exclude .venv directory and all contents
            "**/__pycache__/**",  # Exclude __pycache__ directories
            "**/*.pyc",  # Exclude compiled Python files
        ],
    )
    
    print(f"✓ Watching directory: {backend_dir}")
    print("✓ Auto-reload enabled with watchfiles")
    print("✓ Excluding: .venv, __pycache__, *.pyc")
    print()
    
    uvicorn.Server(config).run()
