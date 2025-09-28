from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import sys
from core.fitness.fitness_api import router as fitness_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Test logging
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EvolveAI Workout Plan Generator",
    description="FastAPI backend for generating personalized workout plans using enhanced AI Fitness Coach",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include fitness router
app.include_router(fitness_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "EvolveAI Workout Plan Generator API v2.0", "status": "healthy"}


@app.get("/api/health/")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True) 