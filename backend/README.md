# EvolveAI FastAPI Backend

A lightweight FastAPI backend for generating personalized workout plans using OpenAI.

## Features

- 🚀 **Fast & Lightweight**: Built with FastAPI for high performance
- 🤖 **AI-Powered**: Uses OpenAI to generate personalized workout plans
- 📊 **Structured Output**: Returns validated workout plans using Pydantic schemas
- 🔒 **No Database**: Focused solely on workout plan generation
- 🧪 **Reusable**: Uses existing training scripts and schemas

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# FastAPI Server Configuration
HOST=0.0.0.0
PORT=8000
RELOAD=true

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# CORS Configuration (for production)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Start the Server

```bash
# Option 1: Using the startup script
python start_server.py

# Option 2: Direct uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Generate Workout Plan

**POST** `/api/workoutplan/generate/`

Generates a personalized workout plan based on user profile data.

**Request Body:**
```json
{
  "primaryGoal": "lose_weight",
  "primaryGoalDescription": "I want to lose 20 pounds",
  "experienceLevel": "beginner",
  "daysPerWeek": 3,
  "minutesPerSession": 45,
  "equipment": "dumbbells, resistance bands",
  "age": 30,
  "weight": 70.0,
  "weightUnit": "kg",
  "height": 170.0,
  "heightUnit": "cm",
  "gender": "male",
  "hasLimitations": false,
  "limitationsDescription": "",
  "finalChatNotes": "Prefers compound movements"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Workout plan generated successfully",
  "workout_plan": {
    "title": "12-Week Fat Loss Transformation",
    "summary": "A progressive strength training program designed for fat loss",
    "weekly_schedules": [...]
  }
}
```

### Health Check

**GET** `/api/health/`

Returns server health status and configuration.

**Response:**
```json
{
  "status": "healthy",
  "openai_configured": true,
  "model": "gpt-4"
}
```

## Integration with iOS App

The iOS app calls the FastAPI backend through the `WorkoutManager.createAndProvidePlan()` method:

1. **User completes onboarding** → Profile data sent to FastAPI
2. **FastAPI generates plan** → Uses OpenAI with existing prompt generator
3. **Plan returned to iOS** → Saved to Supabase database
4. **User can view plan** → Retrieved from Supabase

## Development

### Project Structure

```
backend/
├── main.py                 # FastAPI application
├── start_server.py         # Server startup script
├── requirements.txt        # Python dependencies
├── training/
│   ├── schemas.py         # Pydantic schemas (reused from Django)
│   └── services/
│       └── prompt_generator.py  # OpenAI prompt generation (reused)
└── README.md
```

### Adding New Features

1. **New Endpoints**: Add to `main.py`
2. **New Schemas**: Add to `training/schemas.py`
3. **New Services**: Add to `training/services/`

### Testing

```bash
# Start the server
python start_server.py

# Test with curl
curl -X POST "http://localhost:8000/api/workoutplan/generate/" \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

## Production Deployment

1. **Set environment variables** for production
2. **Configure CORS** with your domain
3. **Use a production ASGI server** like Gunicorn
4. **Set up reverse proxy** (nginx/Apache)
5. **Enable HTTPS**

```bash
# Production startup
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Benefits of FastAPI Migration

- ✅ **Faster**: No Django ORM overhead
- ✅ **Lighter**: Minimal dependencies
- ✅ **Async**: Better performance for AI calls
- ✅ **Type Safety**: Pydantic validation
- ✅ **Auto Docs**: Interactive API documentation
- ✅ **Reusable**: Existing training scripts work unchanged 