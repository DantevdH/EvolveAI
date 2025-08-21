# 🔄 Migration Guide - EvolveAI Backend Refactoring

This guide helps you migrate from the old folder structure to the new, improved organization.

## 📁 **What Changed**

### **Old Structure (Before)**
```
backend/
├── agents/                      # AI agents
├── training/                    # Workout generation
├── scripts/                     # Management scripts
└── main.py                      # FastAPI app
```

### **New Structure (After)**
```
backend/
├── config/                      # Configuration management
├── core/                        # Core business logic
│   ├── workout/                 # Workout generation
│   └── agents/                  # AI agent system
├── services/                    # External integrations
├── utils/                       # Utility functions
├── scripts/                     # Organized scripts
├── tests/                       # Comprehensive testing
├── docs/                        # Documentation
└── main.py                      # FastAPI app
```

## 🔄 **Import Path Changes**

### **Core Workout Module**
```python
# OLD
from training.schemas import WorkoutPlanSchema
from training.prompt_generator import WorkoutPromptGenerator
from training.workout_service import create_smart_workout_service

# NEW
from core.workout.schemas import WorkoutPlanSchema
from core.workout.prompt_generator import WorkoutPromptGenerator
from core.workout.workout_service import create_smart_workout_service
```

### **AI Agents**
```python
# OLD
from agents.base.base_agent import BaseAgent
from agents.specialists.fitness_coach import FitnessCoach

# NEW
from core.agents.base.base_agent import BaseAgent
from core.agents.specialists.fitness_coach import FitnessCoach
```

### **Configuration**
```python
# OLD
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# NEW
from config.settings import settings
api_key = settings.OPENAI_API_KEY
```

## 🚀 **Migration Steps**

### **Step 1: Update Your Code**
1. **Find all import statements** that reference old paths
2. **Replace with new paths** using the mapping above
3. **Update any hardcoded paths** in your code

### **Step 2: Update Configuration**
1. **Copy environment template**: `cp env.template .env`
2. **Fill in your values** for API keys and URLs
3. **Use centralized settings**: `from config.settings import settings`

### **Step 3: Test Your Changes**
1. **Run tests**: `pytest`
2. **Start server**: `python main.py`
3. **Verify endpoints** work correctly

## 🔧 **Common Migration Issues**

### **Issue 1: Import Errors**
```python
# Error: ModuleNotFoundError: No module named 'training'
# Solution: Update import path
from core.workout.schemas import WorkoutPlanSchema
```

### **Issue 2: Configuration Not Found**
```python
# Error: Environment variable not found
# Solution: Use centralized settings
from config.settings import settings
api_key = settings.OPENAI_API_KEY
```

### **Issue 3: Test Failures**
```python
# Error: Tests can't find modules
# Solution: Run tests from backend/ directory
cd backend
pytest
```

## 📚 **Updated Documentation**

### **Main Documentation**
- **Project Overview**: `docs/README.md`
- **API Reference**: See `main.py` for endpoints
- **Agent Guides**: `docs/agents/`

### **Training Module**
- **Workout Service**: `docs/README.md` (moved from training/)
- **Schemas**: `core/workout/schemas.py`
- **Service**: `core/workout/workout_service.py`

## 🧪 **Testing After Migration**

### **Run All Tests**
```bash
cd backend
pytest
```

### **Run Specific Test Categories**
```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Specific test file
pytest tests/unit/test_fitness_coach.py
```

### **Test API Endpoints**
```bash
# Start server
python main.py

# Test endpoints
curl http://localhost:8000/api/health/
```

## ✅ **Migration Checklist**

- [ ] **Updated all import statements** to use new paths
- [ ] **Copied environment template** and filled in values
- [ ] **Updated configuration** to use centralized settings
- [ ] **Ran tests** to verify functionality
- [ ] **Started server** to test API endpoints
- [ ] **Updated any custom scripts** to use new structure

## 🆘 **Need Help?**

### **Check These First**
1. **Import paths** match the new structure
2. **Environment variables** are properly set
3. **Tests run** from the correct directory
4. **Documentation** is up to date

### **Common Solutions**
- **Import errors**: Use relative imports within packages
- **Configuration issues**: Use `config.settings`
- **Test failures**: Run from `backend/` directory
- **Path issues**: Use relative paths within packages

---

## 🎯 **Benefits of New Structure**

### **Developer Experience**
- **Faster navigation** - Clear file locations
- **Better IDE support** - Proper package structure
- **Easier refactoring** - Isolated modules

### **Maintainability**
- **Clear responsibilities** - Each folder has a purpose
- **Better organization** - Related code is grouped
- **Easier updates** - Modular structure

### **Scalability**
- **Easy to extend** - Add new features in appropriate folders
- **Better testing** - Organized test structure
- **Clearer documentation** - Follows code organization

---

**Happy migrating! The new structure will make your development experience much better.** 🚀✨
