# 🚀 EvolveAI Backend - Refactored Structure

Welcome to the refactored EvolveAI backend! This project has been reorganized for better maintainability, scalability, and developer experience.

## 📁 **New Project Structure**

```
backend/
├── config/                      # Configuration management
│   ├── __init__.py
│   └── settings.py              # Environment variables & settings
├── core/                        # Core business logic
│   ├── workout/                 # Workout generation system
│   │   ├── __init__.py
│   │   ├── schemas.py           # Pydantic models
│   │   ├── prompt_generator.py  # LLM prompts
│   │   └── workout_service.py   # Smart workout service
│   └── agents/                  # AI agent system
│       ├── __init__.py
│       ├── base/                # Base agent infrastructure
│       │   ├── __init__.py
│       │   ├── base_agent.py
│       │   ├── rag_tool.py
│       │   └── agent_coordinator.py
│       └── specialists/         # Specialist agents
│           ├── __init__.py
│           ├── fitness_coach.py
│           └── guides/          # Agent documentation
├── services/                    # External service integrations
│   ├── __init__.py
│   └── openai_service.py        # OpenAI API wrapper
├── utils/                       # Utility functions
│   └── __init__.py
├── scripts/                     # Management scripts
│   ├── setup/                   # Setup & installation
│   ├── populate/                # Data population
│   └── maintenance/             # Maintenance tasks
├── tests/                       # Comprehensive test suite
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── fixtures/                # Test data
├── docs/                        # Documentation
│   ├── README.md                # This file
│   ├── agents/                  # Agent guides
│   └── deployment/              # Deployment guides
├── main.py                      # FastAPI application
└── start_server.py              # Server startup
```

## 🎯 **Key Improvements**

### **1. Clear Separation of Concerns**
- **`core/`** - Business logic and domain models
- **`services/`** - External API integrations
- **`config/`** - Centralized configuration management
- **`tests/`** - Organized testing structure

### **2. Feature-Based Organization**
- **`core/workout/`** - All workout-related functionality
- **`core/agents/`** - Complete AI agent system
- **`services/`** - External service wrappers

### **3. Better Testing Structure**
- **`tests/unit/`** - Fast, isolated unit tests
- **`tests/integration/`** - End-to-end integration tests
- **`tests/fixtures/`** - Reusable test data

### **4. Centralized Configuration**
- **`config/settings.py`** - Single source of truth for all settings
- Environment variable validation
- Easy configuration management

## 🚀 **Getting Started**

### **1. Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### **2. Install Dependencies**
```bash
pip install -r requirements.txt
```

### **3. Run Tests**
```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/unit/          # Unit tests only
pytest tests/integration/   # Integration tests only
```

### **4. Start the Server**
```bash
python main.py
```

## 🔧 **Development Workflow**

### **Adding New Features**
1. **Create feature module** in appropriate `core/` directory
2. **Add tests** in corresponding `tests/` directory
3. **Update documentation** in `docs/` directory
4. **Run tests** to ensure everything works

### **Adding New Services**
1. **Create service file** in `services/` directory
2. **Add configuration** in `config/settings.py`
3. **Create service tests** in `tests/unit/`
4. **Update documentation**

### **Adding New Agents**
1. **Create agent file** in `core/agents/specialists/`
2. **Add agent guide** in `docs/agents/`
3. **Create comprehensive tests**
4. **Update agent coordinator**

## 📚 **Documentation**

### **Core Modules**
- **Workout System**: `docs/README.md` (Training module guide)
- **Agent System**: `docs/agents/README.md`
- **Fitness Coach**: `docs/agents/fitness_coach_guide.md`

### **API Documentation**
- **Endpoints**: See `main.py` for all available endpoints
- **Schemas**: See `core/workout/schemas.py` for data models
- **Testing**: See `tests/` for usage examples

## 🧪 **Testing Strategy**

### **Test Categories**
- **Unit Tests**: Fast, isolated tests for individual functions
- **Integration Tests**: End-to-end tests for complete workflows
- **Fixtures**: Reusable test data and setup

### **Running Tests**
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=core --cov-report=html

# Run specific test file
pytest tests/unit/test_workout_service.py

# Run tests with verbose output
pytest -v
```

## 🔄 **Migration Notes**

### **What Changed**
- **Import paths** updated to reflect new structure
- **Configuration** centralized in `config/settings.py`
- **Services** separated into dedicated modules
- **Tests** reorganized by type and feature

### **Updating Imports**
```python
# Old imports
from training.schemas import WorkoutPlanSchema
from agents.base.base_agent import BaseAgent

# New imports
from core.workout.schemas import WorkoutPlanSchema
from core.agents.base.base_agent import BaseAgent
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Import Errors**
- Check that all `__init__.py` files exist
- Verify import paths match new structure
- Ensure Python path includes `backend/` directory

#### **2. Configuration Issues**
- Verify `.env` file exists and has required variables
- Check `config/settings.py` validation
- Ensure environment variables are properly set

#### **3. Test Failures**
- Run tests from `backend/` directory
- Check that all dependencies are installed
- Verify test data fixtures are available

## 📈 **Performance Benefits**

### **Code Organization**
- **Faster Navigation** - Clear file locations
- **Better IDE Support** - Proper package structure
- **Easier Refactoring** - Isolated modules

### **Testing**
- **Faster Test Execution** - Organized test structure
- **Better Coverage** - Comprehensive test organization
- **Easier Debugging** - Clear test categorization

### **Maintenance**
- **Easier Updates** - Clear module responsibilities
- **Better Documentation** - Organized by feature
- **Simpler Deployment** - Clear configuration management

## 🔮 **Future Enhancements**

### **Planned Improvements**
- **API Versioning** - Versioned endpoints
- **Middleware System** - Request/response processing
- **Plugin Architecture** - Extensible agent system
- **Advanced Monitoring** - Performance metrics and logging

### **Scalability Features**
- **Microservice Ready** - Modular architecture
- **Database Abstraction** - Multiple database support
- **Cache Integration** - Redis/Memcached support
- **Queue System** - Async task processing

---

## 📞 **Support & Contributing**

### **Getting Help**
- **Check documentation** first
- **Run tests** to verify setup
- **Check configuration** in `.env` file

### **Contributing**
- **Follow structure** - Use appropriate directories
- **Add tests** - Include tests for new features
- **Update docs** - Keep documentation current
- **Run tests** - Ensure all tests pass

---

**Welcome to the new, improved EvolveAI backend structure!** 🎯✨

This refactored architecture provides a solid foundation for building and scaling your AI-powered fitness platform.
