# 🏋️‍♂️ Fitness Coach Agent Guide

## Overview

The **Fitness Coach Agent** is a specialist AI agent designed to generate personalized workout plans and provide fitness advice. It automatically filters knowledge base documents to only retrieve fitness-related content, ensuring responses are focused and relevant.

## 🎯 **Key Features**

### **Automatic Document Filtering**
- **Topic-based filtering**: Only retrieves documents with `topic="fitness"`
- **Automatic exclusion**: Nutrition, running, physiotherapy documents are filtered out
- **Smart metadata filtering**: Uses user profile data to find relevant fitness content

### **RAG-Enhanced Knowledge**
- **Context retrieval**: Searches your fitness knowledge base for relevant information
- **Enhanced prompts**: Combines your existing prompts with retrieved knowledge
- **Evidence-based responses**: Uses actual fitness documents for recommendations

### **Seamless Integration**
- **Uses existing schemas**: `WorkoutPlanSchema`, `UserProfileSchema`
- **Uses existing prompts**: `WorkoutPromptGenerator`
- **Same output format**: Returns workout plans in your current format

---

## 🔧 **How It Works**

### **1. Request Processing Flow**

```
User Request → Metadata Extraction → Knowledge Search → Prompt Enhancement → OpenAI Generation → Response
```

#### **Step 1: Metadata Extraction**
```python
metadata_filters = self.rag_tool.extract_metadata_filters(user_request)
# Extracts: difficulty_level, body_part, sport_type, equipment_needed, etc.
```

#### **Step 2: Knowledge Search**
```python
relevant_docs = self.search_knowledge_base(
    query=user_request,
    max_results=5,
    metadata_filters=metadata_filters,
    topic="fitness"  # Automatic filtering
)
```

#### **Step 3: Prompt Enhancement**
```python
base_prompt = self.prompt_generator.create_initial_plan_prompt(user_profile)
enhanced_prompt = self._enhance_prompt_with_knowledge(base_prompt, relevant_docs)
```

#### **Step 4: OpenAI Generation**
```python
completion = openai_client.chat.completions.parse(
    model="gpt-4",
    messages=[{"role": "system", "content": enhanced_prompt}],
    response_format=WorkoutPlanSchema
)
```

### **2. Document Filtering Strategy**

#### **Topic Filtering (Automatic)**
- **Fitness Coach**: `topic="fitness"` ✅
- **Nutrition Coach**: `topic="nutrition"` ❌ (filtered out)
- **Running Coach**: `topic="running"` ❌ (filtered out)
- **Physiotherapist**: `topic="physiotherapy"` ❌ (filtered out)

#### **Metadata Filtering (Smart)**
```python
filters = {
    "difficulty_level": "beginner",
    "body_part": "chest",
    "goal": "strength",
    "training_frequency": "3_days",
    "equipment_needed": ["dumbbells", "barbell"]
}
```

---

## 🚀 **Usage Examples**

### **1. Basic Workout Plan Generation**

```python
from agents.specialists.fitness_coach import FitnessCoach
from training.schemas import UserProfileSchema

# Initialize the coach
coach = FitnessCoach()

# Create user profile (same as your current system)
user_profile = UserProfileSchema(
    primary_goal="strength",
    experience_level="beginner",
    days_per_week=3,
    equipment=["dumbbells", "barbell"],
    # ... other profile fields
)

# Generate workout plan
workout_plan = coach.generate_workout_plan(user_profile, openai_client)

# Returns: WorkoutPlanSchema (same format as your current system)
```

### **2. Exercise Recommendations**

```python
# Get exercises for specific muscle group
exercises = coach.recommend_exercises(
    muscle_group="chest",
    difficulty="beginner",
    equipment=["dumbbells"]
)

# Returns: List of exercises with descriptions and sources
```

### **3. General Fitness Questions**

```python
# Ask general fitness questions
response = coach.process_request(
    "How do I improve my bench press form?"
)

# Automatically searches fitness knowledge base
# Returns: Enhanced response with relevant context
```

---

## 📁 **File Structure**

```
backend/agents/specialists/
├── __init__.py
├── fitness_coach.py          # Main agent implementation
└── guides/
    ├── __init__.py
    └── fitness_coach_guide.md  # This guide
```

---

## 🔍 **Knowledge Base Integration**

### **Required Database Tables**

#### **Documents Table**
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL,
    topic TEXT NOT NULL,           -- Must be "fitness" for this agent
    metadata JSONB DEFAULT '{}',   -- difficulty_level, body_part, etc.
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### **Document Embeddings Table**
```sql
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),        -- OpenAI embedding dimension
    chunk_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP
);
```

### **Sample Fitness Documents**

#### **Document 1: Beginner Strength Training**
```json
{
    "title": "Beginner Strength Training Guide",
    "content": "Complete guide to strength training for beginners...",
    "topic": "fitness",
    "metadata": {
        "difficulty_level": "beginner",
        "goal": "strength",
        "body_part": "full_body",
        "equipment_needed": ["dumbbells", "barbell"]
    }
}
```

#### **Document 2: Chest Workout Routines**
```json
{
    "title": "Effective Chest Workout Routines",
    "content": "Comprehensive chest workout routines for all levels...",
    "topic": "fitness",
    "metadata": {
        "difficulty_level": "intermediate",
        "body_part": "chest",
        "goal": "muscle_building",
        "equipment_needed": ["barbell", "bench"]
    }
}
```

---

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Required for OpenAI integration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# Required for knowledge base
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### **Agent Configuration**
```python
class FitnessCoach(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="Fitness Coach",
            agent_description="Expert in strength training, muscle building, weight loss routines, and workout planning",
            topic="fitness"  # This determines document filtering
        )
```

---

## 🧪 **Testing**

### **Run Fitness Coach Tests**
```bash
cd backend
pytest agents/tests/test_fitness_coach.py -v
```

### **Test Specific Functionality**
```bash
# Test workout plan generation
pytest agents/tests/test_fitness_coach.py::TestFitnessCoach::test_workout_plan_generation -v

# Test exercise recommendations
pytest agents/tests/test_fitness_coach.py::TestFitnessCoach::test_exercise_recommendations -v

# Test topic filtering
pytest agents/tests/test_fitness_coach.py::TestFitnessCoach::test_fitness_coach_topic_filtering -v
```

---

## 🔄 **Integration with Existing System**

### **Current System (Free Tier)**
```python
# Your existing endpoint
@app.post("/api/workoutplan/generate/")
async def generate_workout_plan(request: GenerateWorkoutRequest):
    # Uses simple LLM without knowledge base
    return simple_llm_generate(request)
```

### **Enhanced System (Premium Tier)**
```python
# New premium endpoint
@app.post("/api/workoutplan/generate/premium")
async def generate_workout_plan_premium(request: GenerateWorkoutRequest):
    # Uses Fitness Coach with RAG enhancement
    coach = FitnessCoach()
    user_profile = convert_to_user_profile(request)
    return coach.generate_workout_plan(user_profile, openai_client)
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. No Documents Found**
- **Check**: Document topic is set to "fitness"
- **Check**: Documents have proper metadata
- **Check**: Vector embeddings are generated

#### **2. Import Errors**
- **Check**: All required packages are installed
- **Check**: Python path includes backend directory
- **Check**: `__init__.py` files exist

#### **3. OpenAI API Errors**
- **Check**: `OPENAI_API_KEY` is set correctly
- **Check**: API key has sufficient credits
- **Check**: Model access permissions

### **Debug Mode**
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check what documents are being retrieved
relevant_docs = coach.search_knowledge_base("test query")
print(f"Retrieved {len(relevant_docs)} documents")
```

---

## 📈 **Performance Optimization**

### **Search Optimization**
- **Max results**: Limit to 3-5 documents for faster responses
- **Metadata filtering**: Use specific filters to reduce search space
- **Vector similarity**: Adjust `match_threshold` for relevance vs. speed

### **Caching Strategies**
- **Response caching**: Cache common workout plan requests
- **Document caching**: Cache frequently accessed fitness documents
- **Embedding caching**: Cache generated embeddings

---

## 🔮 **Future Enhancements**

### **Planned Features**
- **Progressive overload tracking**: Monitor user progress over time
- **Injury prevention**: Integrate with physiotherapy knowledge
- **Nutrition integration**: Coordinate with nutrition coach for complete plans
- **Video demonstrations**: Link exercises to demonstration videos

### **Advanced RAG Features**
- **Multi-modal search**: Search across text, images, and videos
- **Temporal relevance**: Prioritize recent fitness research
- **Personalization**: Learn from user preferences and history

---

## 📞 **Support**

### **Getting Help**
- **Documentation**: Check this guide first
- **Tests**: Run tests to verify functionality
- **Logs**: Check console output for error messages
- **Database**: Verify knowledge base setup

### **Contributing**
- **Code**: Follow existing patterns and conventions
- **Tests**: Add tests for new functionality
- **Documentation**: Update this guide for changes
- **Knowledge Base**: Add relevant fitness documents

---

## 📋 **Quick Reference**

### **Key Methods**
```python
coach = FitnessCoach()

# Generate workout plan
workout_plan = coach.generate_workout_plan(user_profile, openai_client)

# Get exercise recommendations
exercises = coach.recommend_exercises(muscle_group, difficulty, equipment)

# Process general requests
response = coach.process_request(user_question)
```

### **Key Properties**
```python
coach.topic                    # "fitness" (for document filtering)
coach.agent_name              # "Fitness Coach"
coach.rag_tool               # RAG tool instance
coach.prompt_generator       # WorkoutPromptGenerator instance
```

### **Key Capabilities**
- ✅ Workout plan generation
- ✅ Exercise selection
- ✅ Progression tracking
- ✅ Strength training
- ✅ Muscle building
- ✅ Weight loss routines
- ✅ Form guidance
- ✅ Equipment recommendations

---

**The Fitness Coach Agent provides the same user experience as your current system but with enhanced knowledge from your fitness database!** 🎯
