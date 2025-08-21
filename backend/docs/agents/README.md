# 📚 Specialist Agent Guides

This directory contains comprehensive guides for each specialist agent in the EvolveAI system.

## 🎯 **Available Guides**

### **🏋️‍♂️ Fitness Coach**
- **File**: `fitness_coach_guide.md`
- **Purpose**: Generate personalized workout plans and fitness advice
- **Specialization**: Strength training, muscle building, weight loss routines
- **Document Filtering**: Automatically filters for `topic="fitness"` documents

### **🥗 Nutrition Coach** *(Coming Soon)*
- **File**: `nutrition_coach_guide.md`
- **Purpose**: Create meal plans and provide dietary advice
- **Specialization**: Macro tracking, healthy eating, dietary restrictions
- **Document Filtering**: Automatically filters for `topic="nutrition"` documents

### **🏃‍♂️ Running Coach** *(Coming Soon)*
- **File**: `running_coach_guide.md`
- **Purpose**: Design running plans and endurance training
- **Specialization**: Training plans, pace calculation, race preparation
- **Document Filtering**: Automatically filters for `topic="running"` documents

### **🩺 Physiotherapist** *(Coming Soon)*
- **File**: `physiotherapist_guide.md`
- **Purpose**: Injury prevention and recovery protocols
- **Specialization**: Mobility work, injury assessment, recovery timelines
- **Document Filtering**: Automatically filters for `topic="physiotherapy"` documents

---

## 📖 **How to Use These Guides**

### **1. For Developers**
- **Implementation**: Follow the code examples and integration patterns
- **Testing**: Use the provided test commands to verify functionality
- **Configuration**: Set up environment variables and database tables as specified

### **2. For Users**
- **API Integration**: Understand how to call the specialist agents
- **Response Format**: Know what to expect from each agent
- **Error Handling**: Learn how to troubleshoot common issues

### **3. For System Administrators**
- **Setup**: Database configuration and knowledge base population
- **Performance**: Optimization strategies and monitoring
- **Maintenance**: Troubleshooting and support procedures

---

## 🔧 **Guide Structure**

Each guide follows a consistent structure:

1. **Overview** - High-level description of the agent
2. **Key Features** - Main capabilities and benefits
3. **How It Works** - Technical implementation details
4. **Usage Examples** - Code samples and API calls
5. **Configuration** - Setup and environment requirements
6. **Testing** - How to test the agent functionality
7. **Integration** - How it works with existing systems
8. **Troubleshooting** - Common issues and solutions
9. **Performance** - Optimization strategies
10. **Future Enhancements** - Planned features and improvements

---

## 🚀 **Quick Start**

### **1. Read the Fitness Coach Guide**
```bash
# View the guide
cat backend/agents/specialists/guides/fitness_coach_guide.md
```

### **2. Test the Agent**
```bash
cd backend
pytest agents/tests/test_fitness_coach.py -v
```

### **3. Integrate with Your System**
```python
from agents.specialists.fitness_coach import FitnessCoach

coach = FitnessCoach()
# Follow the usage examples in the guide
```

---

## 📝 **Contributing to Guides**

### **Adding New Guides**
1. **Create the guide file** following the existing structure
2. **Include comprehensive examples** with code samples
3. **Add troubleshooting sections** for common issues
4. **Update this README** to include the new guide

### **Updating Existing Guides**
1. **Maintain the structure** for consistency
2. **Add new features** as they're implemented
3. **Update examples** to reflect current functionality
4. **Test all code samples** to ensure they work

---

## 🔍 **Related Documentation**

- **Base Infrastructure**: `../base/` - Core agent functionality
- **Testing**: `../../tests/` - Test suites for all agents
- **Main System**: `../../../main.py` - FastAPI integration
- **Training Module**: `../../../training/` - Existing workout generation

---

## 📞 **Support**

### **Getting Help**
- **Check the guides first** - Most questions are answered here
- **Run the tests** - Verify your setup is working correctly
- **Check the logs** - Look for error messages and debugging info

### **Reporting Issues**
- **Document the problem** - Include error messages and steps to reproduce
- **Check the troubleshooting section** - Common solutions are documented
- **Test with minimal setup** - Isolate the issue if possible

---

**These guides provide everything you need to understand, implement, and use the specialist agents effectively!** 🎯
