from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from logging_config import get_logger
from core.training.training_api import router as training_router

# Load environment variables
load_dotenv()

# Initialize logging
logger = get_logger(__name__)

app = FastAPI(
    title="EvolveAI Training Plan Generator",
    description="FastAPI backend for generating personalized training plans using enhanced AI training Coach",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
