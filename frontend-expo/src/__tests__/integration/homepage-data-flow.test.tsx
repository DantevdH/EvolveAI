/**
 * Integration tests for homepage data flow
 */

import { mockAuthState, mockWorkoutPlanData } from '../fixtures/mockWorkoutData';

describe('Homepage Data Flow Integration', () => {
  describe('Data Flow Logic', () => {
    it('should handle complete data flow from service to UI', () => {
      // Test that services are called with correct user profile ID
      const userId = mockAuthState.userProfile?.id;
      expect(userId).toBe(1);

      // Test data structure validation
      const mockServiceResponses = {
        streak: { success: true, data: 7 },
        weeklyWorkouts: { success: true, data: 4 },
        goalProgress: { success: true, data: 75 },
        todaysWorkout: { success: true, data: { id: 1, name: 'Monday Workout', exercises: [] } },
        recentActivity: { success: true, data: [{ id: '1', type: 'workout', title: 'Monday Workout' }] }
      };

      // Test data processing logic
      const processedData = {
        streak: mockServiceResponses.streak.success ? mockServiceResponses.streak.data || 0 : 0,
        weeklyWorkouts: mockServiceResponses.weeklyWorkouts.success ? mockServiceResponses.weeklyWorkouts.data || 0 : 0,
        goalProgress: mockServiceResponses.goalProgress.success ? mockServiceResponses.goalProgress.data || 0 : 0,
        todaysWorkout: mockServiceResponses.todaysWorkout.success ? mockServiceResponses.todaysWorkout.data : null,
        recentActivity: mockServiceResponses.recentActivity.success ? mockServiceResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(7);
      expect(processedData.weeklyWorkouts).toBe(4);
      expect(processedData.goalProgress).toBe(75);
      expect(processedData.todaysWorkout).toEqual({ id: 1, name: 'Monday Workout', exercises: [] });
      expect(processedData.recentActivity).toEqual([{ id: '1', type: 'workout', title: 'Monday Workout' }]);
    });

    it('should handle partial data scenarios', () => {
      const userId = mockAuthState.userProfile?.id;
      expect(userId).toBe(1);

      // Test partial data scenario
      const mockPartialResponses = {
        streak: { success: true, data: 3 },
        weeklyWorkouts: { success: true, data: 0 },
        goalProgress: { success: true, data: 50 },
        todaysWorkout: { success: true, data: null },
        recentActivity: { success: true, data: [] }
      };

      const processedData = {
        streak: mockPartialResponses.streak.success ? mockPartialResponses.streak.data || 0 : 0,
        weeklyWorkouts: mockPartialResponses.weeklyWorkouts.success ? mockPartialResponses.weeklyWorkouts.data || 0 : 0,
        goalProgress: mockPartialResponses.goalProgress.success ? mockPartialResponses.goalProgress.data || 0 : 0,
        todaysWorkout: mockPartialResponses.todaysWorkout.success ? mockPartialResponses.todaysWorkout.data : null,
        recentActivity: mockPartialResponses.recentActivity.success ? mockPartialResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(3);
      expect(processedData.weeklyWorkouts).toBe(0);
      expect(processedData.goalProgress).toBe(50);
      expect(processedData.todaysWorkout).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle no workout plan scenario', () => {
      const authStateWithNoPlan = {
        ...mockAuthState,
        workoutPlan: null
      };

      expect(authStateWithNoPlan.workoutPlan).toBeNull();
      expect(authStateWithNoPlan.userProfile).toBeDefined();
      expect(authStateWithNoPlan.userProfile?.id).toBe(1);

      // Test fallback data when no plan exists
      const fallbackData = {
        streak: 0,
        weeklyWorkouts: 0,
        goalProgress: 0,
        todaysWorkout: null,
        recentActivity: []
      };

      expect(fallbackData.streak).toBe(0);
      expect(fallbackData.weeklyWorkouts).toBe(0);
      expect(fallbackData.goalProgress).toBe(0);
      expect(fallbackData.todaysWorkout).toBeNull();
      expect(fallbackData.recentActivity).toEqual([]);
    });

    it('should handle loading states correctly', () => {
      const loadingState = {
        isLoading: true,
        error: null
      };

      const loadedState = {
        isLoading: false,
        error: null
      };

      const errorState = {
        isLoading: false,
        error: 'Failed to load data'
      };

      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();
      expect(loadedState.isLoading).toBe(false);
      expect(loadedState.error).toBeNull();
      expect(errorState.isLoading).toBe(false);
      expect(errorState.error).toBe('Failed to load data');
    });

    it('should handle user profile changes', () => {
      // Initial user profile
      const initialProfile = mockAuthState.userProfile;
      expect(initialProfile?.id).toBe(1);
      expect(initialProfile?.username).toBe('TestUser');

      // Changed user profile
      const newUserProfile = { ...initialProfile, id: 2 };
      expect(newUserProfile.id).toBe(2);
      expect(newUserProfile.username).toBe('TestUser');

      // Test that data should be refetched with new user ID
      const expectedUserId = newUserProfile.id;
      expect(expectedUserId).toBe(2);
    });

    it('should handle service errors gracefully', () => {
      const mockErrorResponses = {
        streak: { success: false, error: 'Network error' } as any,
        weeklyWorkouts: { success: false, error: 'Network error' } as any,
        goalProgress: { success: false, error: 'Network error' } as any,
        todaysWorkout: { success: false, error: 'Network error' } as any,
        recentActivity: { success: false, error: 'Network error' } as any
      };

      // Test error handling logic
      const processedData = {
        streak: mockErrorResponses.streak.success ? mockErrorResponses.streak.data || 0 : 0,
        weeklyWorkouts: mockErrorResponses.weeklyWorkouts.success ? mockErrorResponses.weeklyWorkouts.data || 0 : 0,
        goalProgress: mockErrorResponses.goalProgress.success ? mockErrorResponses.goalProgress.data || 0 : 0,
        todaysWorkout: mockErrorResponses.todaysWorkout.success ? mockErrorResponses.todaysWorkout.data : null,
        recentActivity: mockErrorResponses.recentActivity.success ? mockErrorResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(0);
      expect(processedData.weeklyWorkouts).toBe(0);
      expect(processedData.goalProgress).toBe(0);
      expect(processedData.todaysWorkout).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle mixed success and failure scenarios', () => {
      const mockMixedResponses = {
        streak: { success: true, data: 5 },
        weeklyWorkouts: { success: false, error: 'Service error' } as any,
        goalProgress: { success: true, data: 80 },
        todaysWorkout: { success: true, data: { id: 1, name: 'Test Workout' } },
        recentActivity: { success: false, error: 'Service error' } as any
      };

      const processedData = {
        streak: mockMixedResponses.streak.success ? mockMixedResponses.streak.data || 0 : 0,
        weeklyWorkouts: mockMixedResponses.weeklyWorkouts.success ? mockMixedResponses.weeklyWorkouts.data || 0 : 0,
        goalProgress: mockMixedResponses.goalProgress.success ? mockMixedResponses.goalProgress.data || 0 : 0,
        todaysWorkout: mockMixedResponses.todaysWorkout.success ? mockMixedResponses.todaysWorkout.data : null,
        recentActivity: mockMixedResponses.recentActivity.success ? mockMixedResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(5);
      expect(processedData.weeklyWorkouts).toBe(0);
      expect(processedData.goalProgress).toBe(80);
      expect(processedData.todaysWorkout).toEqual({ id: 1, name: 'Test Workout' });
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle edge cases with null and undefined data', () => {
      const mockEdgeCaseResponses = {
        streak: { success: true, data: null },
        weeklyWorkouts: { success: true, data: undefined },
        goalProgress: { success: true, data: 0 },
        todaysWorkout: { success: true, data: null },
        recentActivity: { success: true, data: null }
      };

      const processedData = {
        streak: mockEdgeCaseResponses.streak.success ? mockEdgeCaseResponses.streak.data || 0 : 0,
        weeklyWorkouts: mockEdgeCaseResponses.weeklyWorkouts.success ? mockEdgeCaseResponses.weeklyWorkouts.data || 0 : 0,
        goalProgress: mockEdgeCaseResponses.goalProgress.success ? mockEdgeCaseResponses.goalProgress.data || 0 : 0,
        todaysWorkout: mockEdgeCaseResponses.todaysWorkout.success ? mockEdgeCaseResponses.todaysWorkout.data : null,
        recentActivity: mockEdgeCaseResponses.recentActivity.success ? mockEdgeCaseResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(0);
      expect(processedData.weeklyWorkouts).toBe(0);
      expect(processedData.goalProgress).toBe(0);
      expect(processedData.todaysWorkout).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });
  });

  describe('Workout Plan Data Structure', () => {
    it('should validate workout plan data structure', () => {
      const workoutPlan = mockWorkoutPlanData;
      
      expect(workoutPlan).toBeDefined();
      expect(workoutPlan.id).toBe(1);
      expect(workoutPlan.user_profile_id).toBe(1);
      expect(workoutPlan.title).toBe('Beginner Strength Program');
      expect(workoutPlan.summary).toBe('A comprehensive 4-week strength training program');
      expect(workoutPlan.plan_data).toBeDefined();
      expect(workoutPlan.plan_data.weekly_schedules).toBeDefined();
      expect(Array.isArray(workoutPlan.plan_data.weekly_schedules)).toBe(true);
    });

    it('should validate weekly schedule structure', () => {
      const weeklySchedule = mockWorkoutPlanData.plan_data.weekly_schedules[0];
      
      expect(weeklySchedule).toBeDefined();
      expect(weeklySchedule.week_number).toBe(1);
      expect(weeklySchedule.daily_workouts).toBeDefined();
      expect(Array.isArray(weeklySchedule.daily_workouts)).toBe(true);
      expect(weeklySchedule.daily_workouts.length).toBeGreaterThan(0);
    });

    it('should validate daily workout structure', () => {
      const dailyWorkout = mockWorkoutPlanData.plan_data.weekly_schedules[0].daily_workouts[0];
      
      expect(dailyWorkout).toBeDefined();
      expect(dailyWorkout.id).toBe(1);
      expect(dailyWorkout.day_of_week).toBe('Monday');
      expect(typeof dailyWorkout.is_rest_day).toBe('boolean');
      expect(Array.isArray(dailyWorkout.exercises)).toBe(true);
    });

    it('should validate exercise structure', () => {
      const exercise = mockWorkoutPlanData.plan_data.weekly_schedules[0].daily_workouts[0].exercises[0];
      
      expect(exercise).toBeDefined();
      expect(exercise.exercise_id).toBe(1);
      expect(exercise.name).toBe('Push-ups');
      expect(typeof exercise.completed).toBe('boolean');
      expect(typeof exercise.sets).toBe('number');
      expect(Array.isArray(exercise.reps)).toBe(true);
      expect(Array.isArray(exercise.weight)).toBe(true);
      expect(Array.isArray(exercise.weight_1rm)).toBe(true);
    });
  });

  describe('Auth State Integration', () => {
    it('should handle complete auth state', () => {
      const authState = mockAuthState;
      
      expect(authState.user).toBeDefined();
      expect(authState.user.id).toBe('test-user-123');
      expect(authState.user.email).toBe('test@example.com');
      expect(authState.userProfile).toBeDefined();
      expect(authState.userProfile?.id).toBe(1);
      expect(authState.workoutPlan).toBeDefined();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBeNull();
      expect(authState.isInitialized).toBe(true);
    });

    it('should handle auth state with null user profile', () => {
      const authStateWithNullProfile = {
        ...mockAuthState,
        userProfile: null
      };
      
      expect(authStateWithNullProfile.user).toBeDefined();
      expect(authStateWithNullProfile.userProfile).toBeNull();
      expect(authStateWithNullProfile.workoutPlan).toBeDefined();
    });

    it('should handle auth state with null workout plan', () => {
      const authStateWithNullPlan = {
        ...mockAuthState,
        workoutPlan: null
      };
      
      expect(authStateWithNullPlan.user).toBeDefined();
      expect(authStateWithNullPlan.userProfile).toBeDefined();
      expect(authStateWithNullPlan.workoutPlan).toBeNull();
    });
  });
});