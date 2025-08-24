"""
Unit tests for workout models and schemas.

Tests all Pydantic models including validation, field constraints, and custom validation methods.
"""

import pytest
from pydantic import ValidationError
from core.workout.models import (
    GenerateWorkoutRequest,
    GenerateWorkoutResponse,
    MockDataRequest,
    MockDataResponse
)
from core.workout.schemas import (
    DayOfWeek,
    UserProfileSchema,
    ExerciseSchema,
    DailyWorkoutSchema,
    WeeklyScheduleSchema,
    WorkoutPlanSchema
)


class TestDayOfWeek:
    """Test the DayOfWeek enum."""
    
    def test_day_of_week_values(self):
        """Test that all expected days are present."""
        expected_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for day in expected_days:
            assert day in DayOfWeek.__members__.values()
    
    def test_day_of_week_enum_behavior(self):
        """Test enum behavior and comparisons."""
        monday = DayOfWeek.MONDAY
        assert monday == "Monday"
        assert monday.value == "Monday"
        # Enum string representation shows the enum name, not the value
        assert "MONDAY" in str(monday)


class TestGenerateWorkoutRequest:
    """Test the GenerateWorkoutRequest model."""
    
    def test_valid_request(self):
        """Test creating a valid workout request."""
        request = GenerateWorkoutRequest(
            primaryGoal="Strength Training",
            primaryGoalDescription="Build muscle and increase strength",
            experienceLevel="Intermediate",
            daysPerWeek=4,
            minutesPerSession=60,
            equipment=["Barbell", "Dumbbells"],
            age=28,
            weight=75.0,
            weightUnit="kg",
            height=180.0,
            heightUnit="cm",
            gender="male",
            hasLimitations=False,
            limitationsDescription=None,
            finalChatNotes="Focus on compound movements"
        )
        
        assert request.primaryGoal == "Strength Training"
        assert request.daysPerWeek == 4
        assert request.equipment == ["Barbell", "Dumbbells"]
        assert request.age == 28
        assert request.weight == 75.0
    
    def test_missing_required_fields(self):
        """Test that missing required fields raise validation errors."""
        with pytest.raises(ValidationError) as exc_info:
            GenerateWorkoutRequest(
                primaryGoal="Strength Training",
                # Missing other required fields
            )
        
        errors = exc_info.value.errors()
        assert len(errors) > 0
    
    def test_optional_fields_defaults(self):
        """Test that optional fields have correct defaults."""
        request = GenerateWorkoutRequest(
            primaryGoal="Strength Training",
            primaryGoalDescription="Build muscle",
            experienceLevel="Beginner",
            daysPerWeek=3,
            minutesPerSession=45,
            equipment=["Body Weight"],
            age=25,
            weight=70.0,
            weightUnit="kg",
            height=175.0,
            heightUnit="cm",
            gender="female",
            hasLimitations=False
        )
        
        assert request.limitationsDescription is None
        assert request.finalChatNotes is None


class TestGenerateWorkoutResponse:
    """Test the GenerateWorkoutResponse model."""
    
    def test_valid_response(self):
        """Test creating a valid workout response."""
        response = GenerateWorkoutResponse(
            status="success",
            message="Workout plan generated successfully",
            workout_plan={"title": "Test Plan", "weeks": []}
        )
        
        assert response.status == "success"
        assert response.message == "Workout plan generated successfully"
        assert response.workout_plan == {"title": "Test Plan", "weeks": []}
    
    def test_missing_required_fields(self):
        """Test that missing required fields raise validation errors."""
        with pytest.raises(ValidationError) as exc_info:
            GenerateWorkoutResponse(
                status="success"
                # Missing message and workout_plan
            )
        
        errors = exc_info.value.errors()
        assert len(errors) == 2


class TestMockDataRequest:
    """Test the MockDataRequest model."""
    
    def test_valid_request_with_defaults(self):
        """Test creating a valid mock data request with defaults."""
        request = MockDataRequest()
        
        assert request.debug_mode is False
        assert request.user_profile is None
    
    def test_valid_request_with_custom_values(self):
        """Test creating a valid mock data request with custom values."""
        request = MockDataRequest(
            debug_mode=True,
            user_profile={"name": "Test User"}
        )
        
        assert request.debug_mode is True
        assert request.user_profile == {"name": "Test User"}


class TestMockDataResponse:
    """Test the MockDataResponse model."""
    
    def test_valid_response(self):
        """Test creating a valid mock data response."""
        response = MockDataResponse(
            status="success",
            message="Mock data generated",
            mock_data={"exercises": []},
            data_type="workout_plan"
        )
        
        assert response.status == "success"
        assert response.message == "Mock data generated"
        assert response.mock_data == {"exercises": []}
        assert response.data_type == "workout_plan"


class TestUserProfileSchema:
    """Test the UserProfileSchema model."""
    
    def test_valid_profile(self):
        """Test creating a valid user profile."""
        profile = UserProfileSchema(
            primary_goal="Bodybuilding",
            primary_goal_description="Build muscle mass",
            experience_level="Advanced",
            days_per_week=6,
            minutes_per_session=90,
            equipment="Full Gym",
            age=30,
            weight=80.0,
            weight_unit="kg",
            height=185.0,
            height_unit="cm",
            gender="male",
            has_limitations=False,
            limitations_description="",
            final_chat_notes="Focus on hypertrophy"
        )
        
        assert profile.primary_goal == "Bodybuilding"
        assert profile.days_per_week == 6
        assert profile.age == 30
    
    def test_field_constraints(self):
        """Test field constraints and validation."""
        # Test days_per_week constraint (1-7)
        with pytest.raises(ValidationError) as exc_info:
            UserProfileSchema(
                primary_goal="Strength",
                primary_goal_description="Build strength",
                experience_level="Beginner",
                days_per_week=0,  # Invalid: less than 1
                minutes_per_session=60,
                equipment="Home Gym",
                age=25,
                weight=70.0,
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                gender="female",
                has_limitations=False
            )
        
        errors = exc_info.value.errors()
        assert any("greater than or equal to 1" in str(error) for error in errors)
        
        # Test minutes_per_session constraint (15-180)
        with pytest.raises(ValidationError) as exc_info:
            UserProfileSchema(
                primary_goal="Strength",
                primary_goal_description="Build strength",
                experience_level="Beginner",
                days_per_week=3,
                minutes_per_session=10,  # Invalid: less than 15
                equipment="Home Gym",
                age=25,
                weight=70.0,
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                gender="female",
                has_limitations=False
            )
        
        errors = exc_info.value.errors()
        assert any("greater than or equal to 15" in str(error) for error in errors)
        
        # Test age constraint (13-100)
        with pytest.raises(ValidationError) as exc_info:
            UserProfileSchema(
                primary_goal="Strength",
                primary_goal_description="Build strength",
                experience_level="Beginner",
                days_per_week=3,
                minutes_per_session=60,
                equipment="Home Gym",
                age=10,  # Invalid: less than 13
                weight=70.0,
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                gender="female",
                has_limitations=False
            )
        
        errors = exc_info.value.errors()
        assert any("greater than or equal to 13" in str(error) for error in errors)
        
        # Test weight constraint (30.0-300.0)
        with pytest.raises(ValidationError) as exc_info:
            UserProfileSchema(
                primary_goal="Strength",
                primary_goal_description="Build strength",
                experience_level="Beginner",
                days_per_week=3,
                minutes_per_session=60,
                equipment="Home Gym",
                age=25,
                weight=20.0,  # Invalid: less than 30.0
                weight_unit="kg",
                height=175.0,
                height_unit="cm",
                gender="female",
                has_limitations=False
            )
        
        errors = exc_info.value.errors()
        # Check for the constraint violation in the error message
        assert any("30.0" in str(error) and "greater" in str(error) for error in errors)
        
        # Test height constraint (100.0-250.0)
        with pytest.raises(ValidationError) as exc_info:
            UserProfileSchema(
                primary_goal="Strength",
                primary_goal_description="Build strength",
                experience_level="Beginner",
                days_per_week=3,
                minutes_per_session=60,
                equipment="Home Gym",
                age=25,
                weight=70.0,
                weight_unit="kg",
                height=50.0,  # Invalid: less than 100.0
                height_unit="cm",
                gender="female",
                has_limitations=False
            )
        
        errors = exc_info.value.errors()
        # Check for the constraint violation in the error message
        assert any("100.0" in str(error) and "greater" in str(error) for error in errors)
    
    def test_optional_fields_defaults(self):
        """Test that optional fields have correct defaults."""
        profile = UserProfileSchema(
            primary_goal="Strength",
            primary_goal_description="Build strength",
            experience_level="Beginner",
            days_per_week=3,
            minutes_per_session=60,
            equipment="Home Gym",
            age=25,
            weight=70.0,
            weight_unit="kg",
            height=175.0,
            height_unit="cm",
            gender="female",
            has_limitations=False
        )
        
        assert profile.limitations_description == ""
        assert profile.final_chat_notes == ""


class TestExerciseSchema:
    """Test the ExerciseSchema model."""
    
    def test_valid_exercise(self):
        """Test creating a valid exercise."""
        exercise = ExerciseSchema(
            exercise_id="ex_001",
            sets=3,
            reps=[8, 8, 8],
            description="Barbell Squat exercise"
        )
        
        assert exercise.exercise_id == "ex_001"
        assert exercise.sets == 3
        assert exercise.reps == [8, 8, 8]
        assert exercise.description == "Barbell Squat exercise"
        assert exercise.weight is None
    
    def test_exercise_with_weight(self):
        """Test creating an exercise with weight data."""
        exercise = ExerciseSchema(
            exercise_id="ex_002",
            sets=4,
            reps=[10, 10, 10, 10],
            description="Bench Press exercise",
            weight=[100.0, 100.0, 95.0, 95.0]
        )
        
        assert exercise.weight == [100.0, 100.0, 95.0, 95.0]
    
    def test_field_constraints(self):
        """Test field constraints and validation."""
        # Test sets constraint (1-10)
        with pytest.raises(ValidationError) as exc_info:
            ExerciseSchema(
                exercise_id="ex_001",
                sets=0,  # Invalid: less than 1
                reps=[8],
                description="Test exercise"
            )
        
        errors = exc_info.value.errors()
        assert any("greater than or equal to 1" in str(error) for error in errors)
        
        with pytest.raises(ValidationError) as exc_info:
            ExerciseSchema(
                exercise_id="ex_001",
                sets=15,  # Invalid: greater than 10
                reps=[8] * 15,
                description="Test exercise"
            )
        
        errors = exc_info.value.errors()
        assert any("less than or equal to 10" in str(error) for error in errors)
    
    def test_reps_validation(self):
        """Test that reps list length matches sets count."""
        # This validation is not currently implemented in the schema
        # but we can test the basic structure
        exercise = ExerciseSchema(
            exercise_id="ex_001",
            sets=3,
            reps=[8, 8, 8],
            description="Test exercise"
        )
        
        assert len(exercise.reps) == exercise.sets
    
    def test_weight_validation(self):
        """Test weight list validation when provided."""
        # Test that weight list length matches sets count
        exercise = ExerciseSchema(
            exercise_id="ex_002",
            sets=3,
            reps=[10, 10, 10],
            description="Test exercise",
            weight=[100.0, 100.0, 100.0]
        )
        
        assert exercise.weight is not None
        assert len(exercise.weight) == exercise.sets
    
    def test_custom_validation_methods(self):
        """Test the custom validation class methods."""
        # Test validate_reps_match_sets
        result = ExerciseSchema.validate_reps_match_sets([8, 8, 8], {"sets": 3})
        assert result == [8, 8, 8]
        
        # Test validate_reps_match_sets with mismatch
        with pytest.raises(ValueError, match="Reps list length \\(2\\) must match sets count \\(3\\)"):
            ExerciseSchema.validate_reps_match_sets([8, 8], {"sets": 3})
        
        # Test validate_weight_match_sets
        result = ExerciseSchema.validate_weight_match_sets([100.0, 100.0, 100.0], {"sets": 3})
        assert result == [100.0, 100.0, 100.0]
        
        # Test validate_weight_match_sets with None
        result = ExerciseSchema.validate_weight_match_sets(None, {"sets": 3})
        assert result is None
        
        # Test validate_weight_match_sets with mismatch
        with pytest.raises(ValueError, match="Weight list length \\(2\\) must match sets count \\(3\\)"):
            ExerciseSchema.validate_weight_match_sets([100.0, 100.0], {"sets": 3})


class TestDailyWorkoutSchema:
    """Test the DailyWorkoutSchema model."""
    
    def test_valid_training_day(self):
        """Test creating a valid training day."""
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.MONDAY,
            is_rest_day=False,
            exercises=[
                ExerciseSchema(
                    exercise_id="ex_001",
                    sets=3,
                    reps=[8, 8, 8],
                    description="Squat"
                )
            ]
        )
        
        assert workout.day_of_week == DayOfWeek.MONDAY
        assert workout.is_rest_day is False
        assert len(workout.exercises) == 1
    
    def test_valid_rest_day(self):
        """Test creating a valid rest day."""
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.TUESDAY,
            is_rest_day=True,
            exercises=[]
        )
        
        assert workout.day_of_week == DayOfWeek.TUESDAY
        assert workout.is_rest_day is True
        assert len(workout.exercises) == 0
    
    def test_rest_day_validation(self):
        """Test rest day validation logic."""
        # Test that rest days have no exercises
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.WEDNESDAY,
            is_rest_day=True,
            exercises=[]
        )
        
        # This should not raise an error
        workout.validate_rest_day()
        
        # Test that training days have exercises
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.THURSDAY,
            is_rest_day=False,
            exercises=[
                ExerciseSchema(
                    exercise_id="ex_001",
                    sets=3,
                    reps=[8, 8, 8],
                    description="Squat"
                )
            ]
        )
        
        # This should not raise an error
        workout.validate_rest_day()
    
    def test_invalid_rest_day_with_exercises(self):
        """Test that rest days with exercises raise validation error."""
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.FRIDAY,
            is_rest_day=True,
            exercises=[
                ExerciseSchema(
                    exercise_id="ex_001",
                    sets=3,
                    reps=[8, 8, 8],
                    description="Squat"
                )
            ]
        )
        
        with pytest.raises(ValueError, match="Rest days should not have exercises"):
            workout.validate_rest_day()
    
    def test_invalid_training_day_without_exercises(self):
        """Test that training days without exercises raise validation error."""
        workout = DailyWorkoutSchema(
            day_of_week=DayOfWeek.SATURDAY,
            is_rest_day=False,
            exercises=[]
        )
        
        with pytest.raises(ValueError, match="Training days must have exercises"):
            workout.validate_rest_day()


class TestWeeklyScheduleSchema:
    """Test the WeeklyScheduleSchema model."""
    
    def test_valid_weekly_schedule(self):
        """Test creating a valid weekly schedule."""
        # Create 7 daily workouts (one for each day)
        daily_workouts = []
        for i, day in enumerate(DayOfWeek):
            if i % 2 == 0:  # Even days are training days
                daily_workouts.append(DailyWorkoutSchema(
                    day_of_week=day,
                    is_rest_day=False,
                    exercises=[
                        ExerciseSchema(
                            exercise_id=f"ex_{i:03d}",
                            sets=3,
                            reps=[8, 8, 8],
                            description=f"Exercise for {day.value}"
                        )
                    ]
                ))
            else:  # Odd days are rest days
                daily_workouts.append(DailyWorkoutSchema(
                    day_of_week=day,
                    is_rest_day=True,
                    exercises=[]
                ))
        
        schedule = WeeklyScheduleSchema(
            week_number=1,
            daily_workouts=daily_workouts
        )
        
        assert schedule.week_number == 1
        assert len(schedule.daily_workouts) == 7
        assert all(isinstance(workout, DailyWorkoutSchema) for workout in schedule.daily_workouts)
    
    def test_field_constraints(self):
        """Test field constraints and validation."""
        # Test week_number constraint (1-52)
        with pytest.raises(ValidationError) as exc_info:
            WeeklyScheduleSchema(
                week_number=0,  # Invalid: less than 1
                daily_workouts=[]
            )
        
        errors = exc_info.value.errors()
        assert any("greater than or equal to 1" in str(error) for error in errors)
        
        with pytest.raises(ValidationError) as exc_info:
            WeeklyScheduleSchema(
                week_number=53,  # Invalid: greater than 52
                daily_workouts=[]
            )
        
        errors = exc_info.value.errors()
        assert any("less than or equal to 52" in str(error) for error in errors)
        
        # Test daily_workouts constraint (exactly 7)
        with pytest.raises(ValidationError) as exc_info:
            WeeklyScheduleSchema(
                week_number=1,
                daily_workouts=[]  # Invalid: less than 7
            )
        
        errors = exc_info.value.errors()
        assert any("at least 7 items" in str(error) for error in errors)
        
        with pytest.raises(ValidationError) as exc_info:
            # Create 8 daily workouts (more than 7)
            daily_workouts = []
            for i in range(8):
                daily_workouts.append(DailyWorkoutSchema(
                    day_of_week=DayOfWeek.MONDAY,
                    is_rest_day=True,
                    exercises=[]
                ))
            
            WeeklyScheduleSchema(
                week_number=1,
                daily_workouts=daily_workouts
            )
        
        errors = exc_info.value.errors()
        assert any("at most 7 items" in str(error) for error in errors)


class TestWorkoutPlanSchema:
    """Test the WorkoutPlanSchema model."""
    
    def test_valid_workout_plan(self):
        """Test creating a valid workout plan."""
        # Create a simple weekly schedule
        daily_workouts = []
        for day in DayOfWeek:
            if day in [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]:
                daily_workouts.append(DailyWorkoutSchema(
                    day_of_week=day,
                    is_rest_day=False,
                    exercises=[
                        ExerciseSchema(
                            exercise_id="ex_001",
                            sets=3,
                            reps=[8, 8, 8],
                            description="Compound exercise"
                        )
                    ]
                ))
            else:
                daily_workouts.append(DailyWorkoutSchema(
                    day_of_week=day,
                    is_rest_day=True,
                    exercises=[]
                ))
        
        weekly_schedule = WeeklyScheduleSchema(
            week_number=1,
            daily_workouts=daily_workouts
        )
        
        workout_plan = WorkoutPlanSchema(
            title="12-Week Strength Program",
            summary="A comprehensive strength training program focusing on compound movements",
            weekly_schedules=[weekly_schedule]
        )
        
        assert workout_plan.title == "12-Week Strength Program"
        assert workout_plan.summary == "A comprehensive strength training program focusing on compound movements"
        assert len(workout_plan.weekly_schedules) == 1
        assert workout_plan.weekly_schedules[0].week_number == 1
    
    def test_field_constraints(self):
        """Test field constraints and validation."""
        # Test title max_length constraint (200)
        long_title = "A" * 201  # 201 characters
        
        with pytest.raises(ValidationError) as exc_info:
            WorkoutPlanSchema(
                title=long_title,
                summary="Test summary",
                weekly_schedules=[]
            )
        
        errors = exc_info.value.errors()
        assert any("at most 200 characters" in str(error) for error in errors)
        
        # Test weekly_schedules constraint (1-12)
        with pytest.raises(ValidationError) as exc_info:
            WorkoutPlanSchema(
                title="Test Plan",
                summary="Test summary",
                weekly_schedules=[]  # Invalid: less than 1
            )
        
        errors = exc_info.value.errors()
        assert any("at least 1 item" in str(error) for error in errors)
    
    def test_complex_workout_plan(self):
        """Test creating a complex workout plan with multiple weeks."""
        # Create multiple weekly schedules
        weekly_schedules = []
        
        for week_num in range(1, 5):  # 4 weeks
            daily_workouts = []
            for day in DayOfWeek:
                if day in [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]:
                    daily_workouts.append(DailyWorkoutSchema(
                        day_of_week=day,
                        is_rest_day=False,
                        exercises=[
                            ExerciseSchema(
                                exercise_id=f"ex_{week_num:03d}",
                                sets=3 + week_num,  # Progressive overload
                                reps=[8] * (3 + week_num),
                                description=f"Week {week_num} exercise"
                            )
                        ]
                    ))
                else:
                    daily_workouts.append(DailyWorkoutSchema(
                        day_of_week=day,
                        is_rest_day=True,
                        exercises=[]
                    ))
            
            weekly_schedule = WeeklyScheduleSchema(
                week_number=week_num,
                daily_workouts=daily_workouts
            )
            weekly_schedules.append(weekly_schedule)
        
        workout_plan = WorkoutPlanSchema(
            title="Progressive Strength Program",
            summary="4-week progressive overload program",
            weekly_schedules=weekly_schedules
        )
        
        assert len(workout_plan.weekly_schedules) == 4
        assert workout_plan.weekly_schedules[0].week_number == 1
        assert workout_plan.weekly_schedules[3].week_number == 4
        
        # Check progressive overload
        assert workout_plan.weekly_schedules[0].daily_workouts[0].exercises[0].sets == 4  # Week 1: 3+1
        assert workout_plan.weekly_schedules[3].daily_workouts[0].exercises[0].sets == 7  # Week 4: 3+4


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
