# 🏋️‍♂️ ExerciseSelector Documentation

## Overview
The `ExerciseSelector` class intelligently selects exercises from a database to create balanced, varied workouts based on user criteria. It uses smart database queries and variety selection algorithms to ensure users get diverse, effective exercise routines.

## 🎯 **How It Works**

### **1. Input Parameters**
- `muscle_groups`: Target muscle groups (e.g., ["Chest", "Back"])
- `difficulty`: Experience level ("Beginner", "Intermediate", "Advanced")
- `equipment`: Available equipment ("Full Gym", "Home Gym", "Dumbbells Only", "Bodyweight Only")
- `max_exercises`: Maximum number of exercises to return

### **2. Selection Strategy**
```
For each muscle group:
  - Query database with filters (difficulty + equipment)
  - Get exercises_per_muscle = max(2, max_exercises / muscle_groups_count)
  - Apply variety selection (equipment + movement patterns)

If not enough exercises:
  - Get additional from primary muscle group

Remove duplicates and return final selection
```

### **3. Variety Selection**
- **Equipment Balance**: Allows up to `max_per_equipment` exercises per equipment type
- **Movement Patterns**: Ensures mix of compound and isolation exercises
- **Smart Overlap**: Prevents one equipment type from dominating while allowing realistic repetition

## 🗄️ **Equipment Mapping**

| User Selection | Database Filter |
|----------------|-----------------|
| Full Gym | No equipment filtering |
| Home Gym | Barbell, Dumbbell, Body Weight, Weighted, Assisted, Self-assisted |
| Dumbbells Only | Dumbbell, Body Weight |
| Bodyweight Only | Body Weight |

## 📊 **Example Workflow**

**Input**: 8 exercises for chest + shoulders, intermediate, home gym

**Output**:
- 4 chest exercises (mix of barbell, dumbbell, bodyweight)
- 4 shoulder exercises (mix of press, raises, bodyweight)
- Variety in movement patterns (compound vs isolation)
- Equipment overlap allowed (up to 2 per type)

## 🔧 **Key Methods**

### **`get_exercise_candidates()` - Main Entry Point**
- Takes your requirements (muscles, difficulty, equipment)
- Orchestrates the entire selection process
- Returns a balanced list of exercises

### **`_get_muscle_group_exercises()` - Muscle-Specific Queries**
- Queries database for each muscle group separately
- Applies equipment and difficulty filters
- Gets more exercises than needed for variety selection

### **`_select_varied_exercises()` - Variety Engine**
- Groups exercises by equipment type and movement pattern
- Ensures representation from each category
- Creates balanced, interesting workouts

### **`_remove_duplicates()` - Cleanup**
- Removes exercises that are too similar
- Based on name, muscle group, and equipment

## 🚀 **Usage Examples**

### **Basic Exercise Selection**
```python
from core.workout.exercise_selector import ExerciseSelector

selector = ExerciseSelector()

# Get 10 exercises for chest and back
exercises = selector.get_exercise_candidates(
    muscle_groups=["Chest", "Back"],
    difficulty="Intermediate",
    equipment=["Home Gym"],
    max_exercises=10
)

print(f"Found {len(exercises)} exercises")
```

### **Specific Muscle Group**
```python
# Get exercises for a single muscle group
chest_exercises = selector.get_muscle_group_exercises(
    muscle="Chest",
    difficulty="Beginner",
    equipment=["Dumbbells Only"],
    count=5
)
```

### **Exercise by ID**
```python
# Get full exercise details
exercise = selector.get_exercise_by_id("exercise_uuid_here")
if exercise:
    print(f"Exercise: {exercise['name']}")
    print(f"Equipment: {exercise['equipment']}")
    print(f"Difficulty: {exercise['difficulty']}")
```

## 🎯 **Variety Selection Algorithm**

### **Equipment Distribution**
```python
# Calculate target distribution (allow some overlap)
max_per_equipment = max(2, target_count // len(equipment_groups))

# First pass: get exercises ensuring no equipment dominates too much
for equipment_type, eq_exercises in equipment_groups.items():
    # Allow up to max_per_equipment from each equipment type
    for exercise in eq_exercises:
        if (len(selected) < target_count and 
            equipment_counts[equipment_type] < max_per_equipment):
            selected.append(exercise)
            equipment_counts[equipment_type] += 1
```

### **Movement Pattern Variety**
```python
# Second pass: try to get variety in force types
for force_type, force_exercises in force_groups.items():
    if len(selected) < target_count and force_type not in force_used:
        # Find an exercise with this force type that we haven't selected yet
        for exercise in force_exercises:
            if exercise not in selected:
                selected.append(exercise)
                force_used.add(force_type)
                break
```

## 📈 **Performance Benefits**

### **Database Efficiency**
- **Filtering at Database Level**: Uses Supabase's built-in filtering (`eq`, `in_`)
- **Reduced Network Traffic**: Only transfers relevant exercises
- **Lower Memory Usage**: Doesn't load unnecessary data
- **Scalable**: Performance doesn't degrade as database grows

### **Smart Querying**
- **Muscle Group Distribution**: Queries each muscle group separately
- **Equipment Filtering**: Applies equipment constraints in database
- **Result Limiting**: Gets enough for variety but not too many

## 🧪 **Testing**

### **Run Tests**
```bash
cd backend
pytest tests/unit/test_exercise_selector.py -v
```

### **Test Specific Functionality**
```bash
# Test exercise selection
pytest tests/unit/test_exercise_selector.py::TestExerciseSelector::test_get_exercise_candidates -v

# Test variety selection
pytest tests/unit/test_exercise_selector.py::TestExerciseSelector::test_select_varied_exercises -v

# Test equipment filtering
pytest tests/unit/test_exercise_selector.py::TestExerciseSelector::test_equipment_filtering -v
```

## 🔍 **Database Schema Requirements**

### **Exercises Table**
```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    difficulty TEXT NOT NULL,           -- "Beginner", "Intermediate", "Advanced"
    equipment TEXT NOT NULL,            -- "Barbell", "Dumbbell", "Body Weight", etc.
    main_muscle TEXT NOT NULL,          -- "Chest", "Back", "Legs", etc.
    secondary_muscles TEXT[],           -- Array of secondary muscle groups
    force TEXT,                         -- "Compound", "Isolation", etc.
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Required Fields for Selection**
- `difficulty`: Must match user's experience level
- `equipment`: Must be available to user
- `main_muscle`: Must be in target muscle groups
- `force`: Used for movement pattern variety

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. No Exercises Found**
- **Check**: Database has exercises with matching criteria
- **Check**: Equipment mapping is correct
- **Check**: Muscle group names match database values

#### **2. Import Errors**
- **Check**: All required packages are installed
- **Check**: Python path includes backend directory
- **Check**: `__init__.py` files exist

#### **3. Database Connection Issues**
- **Check**: Supabase credentials in environment variables
- **Check**: Database tables exist and have data
- **Check**: Network connectivity to Supabase

### **Debug Mode**
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check what exercises are being found
exercises = selector.get_exercise_candidates(
    muscle_groups=["Chest"],
    difficulty="Intermediate",
    equipment=["Home Gym"],
    max_exercises=5
)
print(f"Found {len(exercises)} exercises")
```

## 🔮 **Future Enhancements**

### **Planned Features**
- **Exercise Difficulty Scaling**: Adjust difficulty based on user progress
- **Equipment Substitution**: Suggest alternatives when equipment unavailable
- **Exercise Combinations**: Create supersets and circuits automatically
- **Progressive Overload**: Track exercise progression over time

### **Advanced Selection**
- **User Preferences**: Learn from user's exercise history
- **Injury Considerations**: Filter out exercises that might aggravate injuries
- **Time Constraints**: Optimize for workout duration
- **Energy Systems**: Balance aerobic and anaerobic exercises

## 📞 **Support**

### **Getting Help**
1. **Check this documentation** for common solutions
2. **Run tests** to verify functionality
3. **Check database** for exercise data
4. **Review error logs** for specific issues

### **Contributing**
- **Add new equipment types** to the mapping
- **Improve variety selection** algorithms
- **Add new exercise categories** for better organization
- **Optimize database queries** for better performance

---

## 📋 **Quick Reference**

### **Essential Commands**
```python
# Basic exercise selection
exercises = selector.get_exercise_candidates(
    muscle_groups=["Chest", "Back"],
    difficulty="Intermediate",
    equipment=["Home Gym"],
    max_exercises=10
)

# Get exercise by ID
exercise = selector.get_exercise_by_id("uuid_here")

# Get exercises for specific muscle
muscle_exercises = selector.get_muscle_group_exercises(
    muscle="Chest",
    difficulty="Beginner",
    equipment=["Dumbbells Only"],
    count=5
)
```

### **Equipment Types**
- **Full Gym**: All equipment types available
- **Home Gym**: Barbell, dumbbells, bodyweight, assisted exercises
- **Dumbbells Only**: Dumbbells and bodyweight exercises
- **Bodyweight Only**: Bodyweight exercises only

### **Key Benefits**
- ✅ **Efficient**: Database-level filtering, not Python processing
- ✅ **Balanced**: Guaranteed variety across muscle groups and equipment
- ✅ **Realistic**: Allows equipment overlap for natural workout flow
- ✅ **Smart**: Considers equipment limitations and movement patterns
- ✅ **Scalable**: Performance doesn't degrade with database size

---

**The ExerciseSelector creates balanced, varied workouts that are both effective and interesting!** 🎯✨

Users get diverse exercises that work their target muscles while using the equipment they actually have access to.
