# 🎭 Mock System - Debug Mode for EvolveAI

This document explains how the mock system works in EvolveAI for development and testing.

## 🎯 **Overview**

The mock system provides realistic workout plans and user profiles when `DEBUG=true` in your environment. This allows you to:

- **Develop without API costs** - No OpenAI calls when debugging
- **Test consistently** - Same data every time
- **Work offline** - No external dependencies
- **Validate schemas** - Ensure data structures are correct

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Set this to true to use mock data
DEBUG=true

# Legacy setting (still supported)
DEVELOPMENT_MODE=true
```

### **How It Works**
1. **`DEBUG=false`** → Uses real OpenAI API (production mode)
2. **`DEBUG=true`** → Returns mock workout plans (development mode)

## 📁 **File Structure**

```
backend/
├── utils/
│   └── mock_data.py           # Mock data utilities
├── core/workout/
│   └── models.py              # API request/response models
└── main.py                    # Uses mock system when DEBUG=true
```

## 🔧 **Usage**

### **1. Enable Debug Mode**
```bash
# In your .env file
DEBUG=true
```

### **2. Make API Request**
```bash
curl -X POST "http://localhost:8000/api/workoutplan/generate/" \
  -H "Content-Type: application/json" \
  -d '{"primaryGoal": "strength", ...}'
```

### **3. Get Mock Response**
```json
{
  "status": "success",
  "message": "Mock workout plan generated successfully",
  "workout_plan": {
    "name": "Strength Builder Pro",
    "description": "A comprehensive 3-day strength training program...",
    "total_weeks": 4,
    "weekly_schedules": [...]
  }
}
```

## 📊 **Mock Data Available**

### **User Profile**
- **Experience Level**: Intermediate
- **Training Days**: 3 days per week
- **Equipment**: Full Gym
- **Goals**: Strength building
- **Age/Gender**: 32-year-old male

### **Workout Plan**
- **Name**: Strength Builder Pro
- **Duration**: 4 weeks
- **Structure**: 3 training days, 4 rest days
- **Exercises**: 5 compound movements
- **Progression**: Progressive overload focus

### **Exercise Library**
1. **Barbell Squat** - Lower body compound
2. **Bench Press** - Upper body compound
3. **Deadlift** - Posterior chain compound
4. **Bent Over Row** - Back compound
5. **Overhead Press** - Shoulder compound

## 🧪 **Testing**

### **Run Mock Tests**
```bash
cd backend
pytest tests/unit/test_mock_data.py -v
```

### **Test Mock Data Generation**
```python
from utils.mock_data import create_mock_workout_plan, create_mock_user_profile

# Create mock user profile
user_profile = create_mock_user_profile()
print(f"User goal: {user_profile.primary_goal}")

# Create mock workout plan
workout_plan = create_mock_workout_plan()
print(f"Workout name: {workout_plan.name}")
```

## 🔄 **Integration with Main System**

### **Automatic Detection**
The system automatically detects debug mode and routes requests:

```python
# In main.py
if settings.DEBUG:
    # Return mock data
    mock_workout_plan = create_mock_workout_plan(request)
    return GenerateWorkoutResponse(...)
else:
    # Use real AI system
    result = smart_workout_service.generate_workout_plan(...)
```

### **Seamless Switching**
- **No code changes** needed to switch between modes
- **Same API endpoints** work in both modes
- **Same response format** in both modes

## 🎨 **Customizing Mock Data**

### **Modify User Profile**
```python
# In utils/mock_data.py
MOCK_USER_PROFILE_DATA = {
    "primary_goal": "Your Custom Goal",
    "experience_level": "Beginner",
    # ... other fields
}
```

### **Add New Exercises**
```python
# In utils/mock_data.py
MOCK_EXERCISES = {
    "your_exercise": {
        "name": "Your Exercise Name",
        "description": "Your exercise description",
        "video_url": None
    },
    # ... existing exercises
}
```

### **Modify Workout Structure**
```python
# In create_mock_workout_plan function
daily_workouts = [
    # Customize workout days, exercises, sets, reps
]
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Mock Data Not Working**
- Check `DEBUG=true` in `.env` file
- Restart server after changing environment variables
- Verify import paths are correct

#### **2. Import Errors**
```python
# Make sure you're importing from the right place
from utils.mock_data import create_mock_workout_plan
```

#### **3. Schema Validation Errors**
- Run tests to verify mock data structure
- Check that mock data matches Pydantic schemas
- Update mock data if schemas change

### **Debug Mode Verification**
```bash
# Check if debug mode is working
curl http://localhost:8000/api/health/

# Should show debug status in response
```

## 📈 **Performance Benefits**

### **Development**
- **Faster Response** - No API calls
- **No Rate Limits** - Unlimited testing
- **Consistent Data** - Same results every time

### **Testing**
- **Reliable Tests** - No external dependencies
- **Fast Execution** - No network delays
- **Predictable Results** - Easy to assert

## 🔮 **Future Enhancements**

### **Planned Features**
- **Multiple Mock Profiles** - Different user types
- **Customizable Workouts** - Various training styles
- **Mock Error Scenarios** - Network failures, API errors
- **Mock Performance Data** - Progress tracking

### **Advanced Mocking**
- **Dynamic Responses** - Based on request parameters
- **Mock Timeouts** - Simulate slow responses
- **Mock Failures** - Test error handling

---

## 📞 **Support**

### **Getting Help**
- **Check this document** first
- **Run tests** to verify functionality
- **Check environment variables** in `.env`
- **Verify import paths** in your code

### **Contributing**
- **Add new mock data** in `utils/mock_data.py`
- **Update tests** when adding new features
- **Keep documentation** current with changes

---

**The mock system makes development and testing much easier!** 🎭✨

Set `DEBUG=true` and start building without worrying about API costs or external dependencies.
