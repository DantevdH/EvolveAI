# 🧪 EvolveAI Testing Architecture

This document outlines the testing strategy and structure for the EvolveAI backend system.

## 🏗️ Test Structure Overview

```
tests/
├── unit/                    # Component-level tests (isolated)
│   ├── workout/            # Workout component unit tests
│   ├── agents/             # Agent component unit tests
│   └── services/           # Service component unit tests
├── integration/             # Component interaction tests
│   └── workout/            # Workout system integration
├── end_to_end/             # Complete workflow tests
│   └── test_fitness_agent_backend.py  # Strategic E2E tests
├── infrastructure/          # Core system infrastructure tests
│   ├── test_base_infrastructure.py    # Base system tests
│   └── test_connections.py            # Connection/database tests
├── utils/                   # Utility function tests
│   ├── test_keywords.py               # Keyword extraction tests
│   └── test_populate.py               # Data population tests
├── fixtures/                # Shared test data and fixtures
├── conftest.py             # Global pytest configuration
└── README.md               # This file
```

## 🎯 Testing Strategy

### **Unit Tests** (`tests/unit/`)
Unit tests test individual components in isolation with heavy mocking for dependencies. They provide fast execution (< 1 second per test) and target 90%+ coverage for critical components. Components tested include ExerciseSelector, ExerciseValidator, FitnessCoach, WorkoutService, and PromptGenerator.

### **Integration Tests** (`tests/integration/`)
Integration tests verify component interactions with minimal mocking and real component instances. They cover data flow between components, error propagation, and system-level behavior with medium execution time (1-5 seconds per test) and 80%+ coverage target.

### **End-to-End Tests** (`tests/end_to_end/`)
End-to-end tests validate complete user workflows from request to response with minimal mocking and real external services. They test system performance under load, error recovery scenarios, and target 70%+ coverage for critical user journeys.

### **Infrastructure Tests** (`tests/infrastructure/`)
Infrastructure tests validate core system functionality, database connections, and core utilities with moderate mocking for external dependencies. They target 80%+ coverage for critical infrastructure including base system setup, connection management, and system initialization.

### **Utils Tests** (`tests/utils/`)
Utils tests focus on utility functions and helper tools with light mocking and emphasis on function logic. They target 90%+ coverage for utility functions including keyword extraction, data population, helper functions, and data transformation utilities.

## 🚀 Running Tests

### **Quick Commands**
```bash
# All tests
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=core --cov-report=term-missing

# Interactive runner
python run_tests.py
```

### **Test Categories**
```bash
# Unit tests
python -m pytest tests/unit/ -v

# Integration tests
python -m pytest tests/integration/ -v

# End-to-end tests
python -m pytest tests/end_to_end/ -v

# Infrastructure tests
python -m pytest tests/infrastructure/ -v

# Utils tests
python -m pytest tests/utils/ -v
```

### **Specific Components**
```bash
# Workout components
python -m pytest tests/unit/workout/ -v

# Agent components
python -m pytest tests/unit/agents/ -v

# Service components
python -m pytest tests/unit/services/ -v
```

## 📊 Current Coverage Status

| Component | Unit Tests | Integration Tests | Total Coverage |
|-----------|------------|-------------------|----------------|
| **ExerciseSelector** | ✅ 94% | ✅ Integration | **94%** |
| **ExerciseValidator** | ✅ 77% | ✅ Integration | **77%** |
| **FitnessCoach** | ✅ 87% | ✅ Integration | **87%** |
| **PromptGenerator** | ✅ 100% | ✅ Integration | **100%** |
| **WorkoutService** | ✅ 100% | ❌ None | **100%** |
| **RAGTool** | ✅ 100% | ❌ None | **100%** |

## 🔧 Test Development Guidelines

### **Unit Test Best Practices**
1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (database, APIs)
3. **Fast**: Tests should run in < 1 second
4. **Focused**: Test one specific behavior per test
5. **Naming**: Clear, descriptive test names

### **Integration Test Best Practices**
1. **Real Components**: Use real component instances
2. **Minimal Mocking**: Only mock external services
3. **Data Flow**: Test data transformation between components
4. **Error Scenarios**: Test error propagation
5. **Performance**: Monitor test execution time

### **End-to-End Test Best Practices**
1. **User Journey**: Test complete user workflows
2. **Real Data**: Use realistic test data
3. **External Services**: Test with real external services
4. **Performance**: Test system behavior under load
5. **Recovery**: Test error recovery scenarios

## 📝 Adding New Tests

### **New Unit Test**
```bash
# Create test file
touch tests/unit/workout/test_new_component.py

# Follow naming convention: test_<component_name>.py
# Test file should be in appropriate unit subdirectory
```

### **New Integration Test**
```bash
# Create test file
touch tests/integration/workout/test_new_workflow.py

# Follow naming convention: test_<workflow_name>.py
```

### **New Test Category**
```bash
# Create directory and __init__.py
mkdir -p tests/new_category/
touch tests/new_category/__init__.py

# Add to run_tests.py and update README.md
```

## 🎯 Testing Goals

Our testing strategy aims for comprehensive coverage across all system layers. Unit tests provide fast feedback during development, integration tests ensure components work together, and end-to-end tests validate complete user experiences. Infrastructure and utils tests ensure system reliability and utility function correctness. The goal is 90%+ coverage for critical components and 80%+ overall system coverage.

## 🚨 Troubleshooting

### **Common Issues**
- **Import errors**: Ensure `conftest.py` is properly configured
- **Database connection failures**: Check environment variables and SSL settings
- **Slow tests**: Use `-v` flag to identify slow-running tests
- **Coverage gaps**: Run `--cov=core --cov-report=term-missing` to see uncovered lines

### **Getting Help**
- Check test output for specific error messages
- Run individual test categories to isolate issues
- Use `python run_tests.py` for interactive testing
- Review this README for testing guidelines and examples
