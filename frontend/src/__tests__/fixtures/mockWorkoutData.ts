/**
 * Mock training data for testing
 */

export const mockTrainingPlanData = {
  id: 1,
  user_profile_id: 1,
  title: "Beginner Strength Program",
  summary: "A comprehensive strength training program",
  plan_data: {
    weekly_schedules: [
      {
        week_number: 1,
        daily_trainings: [
          {
            id: 1,
            day_of_week: "Monday",
            is_rest_day: false,
            exercises: [
              {
                exercise_id: 1,
                name: "Push-ups",
                completed: false,
                sets: 3,
                reps: [10, 10, 10],
                weight: [null, null, null],
                weight_1rm: [80, 75, 70]
              },
              {
                exercise_id: 2,
                name: "Squats",
                completed: false,
                sets: 3,
                reps: [12, 12, 12],
                weight: [null, null, null],
                weight_1rm: [70, 65, 60]
              }
            ]
          },
          {
            id: 2,
            day_of_week: "Tuesday",
            is_rest_day: true,
            exercises: []
          },
          {
            id: 3,
            day_of_week: "Wednesday",
            is_rest_day: false,
            exercises: [
              {
                exercise_id: 3,
                name: "Pull-ups",
                completed: false,
                sets: 3,
                reps: [8, 8, 8],
                weight: [null, null, null],
                weight_1rm: [85, 80, 75]
              }
            ]
          },
          {
            id: 4,
            day_of_week: "Thursday",
            is_rest_day: true,
            exercises: []
          },
          {
            id: 5,
            day_of_week: "Friday",
            is_rest_day: false,
            exercises: [
              {
                exercise_id: 4,
                name: "Deadlifts",
                completed: false,
                sets: 3,
                reps: [5, 5, 5],
                weight: [null, null, null],
                weight_1rm: [90, 85, 80]
              }
            ]
          },
          {
            id: 6,
            day_of_week: "Saturday",
            is_rest_day: true,
            exercises: []
          },
          {
            id: 7,
            day_of_week: "Sunday",
            is_rest_day: true,
            exercises: []
          }
        ]
      }
    ]
  }
};

export const mockEmptyTrainingPlan = {
  id: 1,
  user_profile_id: 1,
  title: "Empty Plan",
  summary: "No data plan",
  plan_data: {
    weekly_schedules: []
  }
};

export const mockPartialTrainingPlan = {
  id: 1,
  user_profile_id: 1,
  title: "Partial Plan",
  summary: "Incomplete plan",
  plan_data: {
    weekly_schedules: [
      {
        week_number: 1,
        daily_trainings: [
          {
            id: 1,
            day_of_week: "Monday",
            is_rest_day: false,
            exercises: [
              {
                exercise_id: 1,
                name: "Push-ups",
                completed: false,
                sets: 3,
                reps: [10, 10, 10],
                weight: [null, null, null],
                weight_1rm: [80, 75, 70]
              }
            ]
          }
        ]
      }
    ]
  }
};

export const mockUserProfile = {
  id: 1,
  userId: "test-user-123",
  username: "TestUser",
  primaryGoal: "Build Muscle",
  primaryGoalDescription: "Increase muscle mass and strength",
  experienceLevel: "Beginner",
  daysPerWeek: 3,
  minutesPerSession: 45,
  equipment: "Bodyweight",
  age: 25,
  weight: 70,
  weightUnit: "kg",
  height: 175,
  heightUnit: "cm",
  gender: "Male",
  hasLimitations: false,
  limitationsDescription: "",
  finalChatNotes: "",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z")
};

export const mockAuthState = {
  user: {
    id: "test-user-123",
    email: "test@example.com"
  },
  userProfile: mockUserProfile,
  trainingPlan: {
    id: 1,
    userProfileId: 1,
    title: "Beginner Strength Program",
    summary: "A comprehensive strength training program",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    planData: mockTrainingPlanData.plan_data
  },
  isLoading: false,
  error: null,
  isInitialized: true
};
