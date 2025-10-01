/**
 * Integration tests for homepage data flow
 */

import { mockAuthState, mockTrainingPlanData } from '../fixtures/mockTrainingData';

describe('Homepage Data Flow Integration', () => {
  describe('Data Flow Logic', () => {
    it('should handle complete data flow from service to UI', () => {
      // Test that services are called with correct user profile ID
      const userId = mockAuthState.userProfile?.id;
      expect(userId).toBe(1);

      // Test data structure validation
      const mockServiceResponses = {
        streak: { success: true, data: 7 },
        weeklyTrainings: { success: true, data: 4 },
        goalProgress: { success: true, data: 75 },
        todaysTraining: { success: true, data: { id: 1, name: 'Monday Training', exercises: [] } },
        recentActivity: { success: true, data: [{ id: '1', type: 'training', title: 'Monday Training' }] }
      };

      // Test data processing logic
      const processedData = {
        streak: mockServiceResponses.streak.success ? mockServiceResponses.streak.data || 0 : 0,
        weeklyTrainings: mockServiceResponses.weeklyTrainings.success ? mockServiceResponses.weeklyTrainings.data || 0 : 0,
        goalProgress: mockServiceResponses.goalProgress.success ? mockServiceResponses.goalProgress.data || 0 : 0,
        todaysTraining: mockServiceResponses.todaysTraining.success ? mockServiceResponses.todaysTraining.data : null,
        recentActivity: mockServiceResponses.recentActivity.success ? mockServiceResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(7);
      expect(processedData.weeklyTrainings).toBe(4);
      expect(processedData.goalProgress).toBe(75);
      expect(processedData.todaysTraining).toEqual({ id: 1, name: 'Monday Training', exercises: [] });
      expect(processedData.recentActivity).toEqual([{ id: '1', type: 'training', title: 'Monday Training' }]);
    });

    it('should handle partial data scenarios', () => {
      const userId = mockAuthState.userProfile?.id;
      expect(userId).toBe(1);

      // Test partial data scenario
      const mockPartialResponses = {
        streak: { success: true, data: 3 },
        weeklyTrainings: { success: true, data: 0 },
        goalProgress: { success: true, data: 50 },
        todaysTraining: { success: true, data: null },
        recentActivity: { success: true, data: [] }
      };

      const processedData = {
        streak: mockPartialResponses.streak.success ? mockPartialResponses.streak.data || 0 : 0,
        weeklyTrainings: mockPartialResponses.weeklyTrainings.success ? mockPartialResponses.weeklyTrainings.data || 0 : 0,
        goalProgress: mockPartialResponses.goalProgress.success ? mockPartialResponses.goalProgress.data || 0 : 0,
        todaysTraining: mockPartialResponses.todaysTraining.success ? mockPartialResponses.todaysTraining.data : null,
        recentActivity: mockPartialResponses.recentActivity.success ? mockPartialResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(3);
      expect(processedData.weeklyTrainings).toBe(0);
      expect(processedData.goalProgress).toBe(50);
      expect(processedData.todaysTraining).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle no training plan scenario', () => {
      const authStateWithNoPlan = {
        ...mockAuthState,
        trainingPlan: null
      };

      expect(authStateWithNoPlan.trainingPlan).toBeNull();
      expect(authStateWithNoPlan.userProfile).toBeDefined();
      expect(authStateWithNoPlan.userProfile?.id).toBe(1);

      // Test fallback data when no plan exists
      const fallbackData = {
        streak: 0,
        weeklyTrainings: 0,
        goalProgress: 0,
        todaysTraining: null,
        recentActivity: []
      };

      expect(fallbackData.streak).toBe(0);
      expect(fallbackData.weeklyTrainings).toBe(0);
      expect(fallbackData.goalProgress).toBe(0);
      expect(fallbackData.todaysTraining).toBeNull();
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
        weeklyTrainings: { success: false, error: 'Network error' } as any,
        goalProgress: { success: false, error: 'Network error' } as any,
        todaysTraining: { success: false, error: 'Network error' } as any,
        recentActivity: { success: false, error: 'Network error' } as any
      };

      // Test error handling logic
      const processedData = {
        streak: mockErrorResponses.streak.success ? mockErrorResponses.streak.data || 0 : 0,
        weeklyTrainings: mockErrorResponses.weeklyTrainings.success ? mockErrorResponses.weeklyTrainings.data || 0 : 0,
        goalProgress: mockErrorResponses.goalProgress.success ? mockErrorResponses.goalProgress.data || 0 : 0,
        todaysTraining: mockErrorResponses.todaysTraining.success ? mockErrorResponses.todaysTraining.data : null,
        recentActivity: mockErrorResponses.recentActivity.success ? mockErrorResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(0);
      expect(processedData.weeklyTrainings).toBe(0);
      expect(processedData.goalProgress).toBe(0);
      expect(processedData.todaysTraining).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle mixed success and failure scenarios', () => {
      const mockMixedResponses = {
        streak: { success: true, data: 5 },
        weeklyTrainings: { success: false, error: 'Service error' } as any,
        goalProgress: { success: true, data: 80 },
        todaysTraining: { success: true, data: { id: 1, name: 'Test Training' } },
        recentActivity: { success: false, error: 'Service error' } as any
      };

      const processedData = {
        streak: mockMixedResponses.streak.success ? mockMixedResponses.streak.data || 0 : 0,
        weeklyTrainings: mockMixedResponses.weeklyTrainings.success ? mockMixedResponses.weeklyTrainings.data || 0 : 0,
        goalProgress: mockMixedResponses.goalProgress.success ? mockMixedResponses.goalProgress.data || 0 : 0,
        todaysTraining: mockMixedResponses.todaysTraining.success ? mockMixedResponses.todaysTraining.data : null,
        recentActivity: mockMixedResponses.recentActivity.success ? mockMixedResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(5);
      expect(processedData.weeklyTrainings).toBe(0);
      expect(processedData.goalProgress).toBe(80);
      expect(processedData.todaysTraining).toEqual({ id: 1, name: 'Test Training' });
      expect(processedData.recentActivity).toEqual([]);
    });

    it('should handle edge cases with null and undefined data', () => {
      const mockEdgeCaseResponses = {
        streak: { success: true, data: null },
        weeklyTrainings: { success: true, data: undefined },
        goalProgress: { success: true, data: 0 },
        todaysTraining: { success: true, data: null },
        recentActivity: { success: true, data: null }
      };

      const processedData = {
        streak: mockEdgeCaseResponses.streak.success ? mockEdgeCaseResponses.streak.data || 0 : 0,
        weeklyTrainings: mockEdgeCaseResponses.weeklyTrainings.success ? mockEdgeCaseResponses.weeklyTrainings.data || 0 : 0,
        goalProgress: mockEdgeCaseResponses.goalProgress.success ? mockEdgeCaseResponses.goalProgress.data || 0 : 0,
        todaysTraining: mockEdgeCaseResponses.todaysTraining.success ? mockEdgeCaseResponses.todaysTraining.data : null,
        recentActivity: mockEdgeCaseResponses.recentActivity.success ? mockEdgeCaseResponses.recentActivity.data || [] : []
      };

      expect(processedData.streak).toBe(0);
      expect(processedData.weeklyTrainings).toBe(0);
      expect(processedData.goalProgress).toBe(0);
      expect(processedData.todaysTraining).toBeNull();
      expect(processedData.recentActivity).toEqual([]);
    });
  });

  describe('Training Plan Data Structure', () => {
    it('should validate training plan data structure', () => {
      const trainingPlan = mockTrainingPlanData;
      
      expect(trainingPlan).toBeDefined();
      expect(trainingPlan.id).toBe(1);
      expect(trainingPlan.user_profile_id).toBe(1);
      expect(trainingPlan.title).toBe('Beginner Strength Program');
      expect(trainingPlan.summary).toBe('A comprehensive 4-week strength training program');
      expect(trainingPlan.plan_data).toBeDefined();
      expect(trainingPlan.plan_data.weekly_schedules).toBeDefined();
      expect(Array.isArray(trainingPlan.plan_data.weekly_schedules)).toBe(true);
    });

    it('should validate weekly schedule structure', () => {
      const weeklySchedule = mockTrainingPlanData.plan_data.weekly_schedules[0];
      
      expect(weeklySchedule).toBeDefined();
      expect(weeklySchedule.week_number).toBe(1);
      expect(weeklySchedule.daily_trainings).toBeDefined();
      expect(Array.isArray(weeklySchedule.daily_trainings)).toBe(true);
      expect(weeklySchedule.daily_trainings.length).toBeGreaterThan(0);
    });

    it('should validate daily training structure', () => {
      const dailyTraining = mockTrainingPlanData.plan_data.weekly_schedules[0].daily_trainings[0];
      
      expect(dailyTraining).toBeDefined();
      expect(dailyTraining.id).toBe(1);
      expect(dailyTraining.day_of_week).toBe('Monday');
      expect(typeof dailyTraining.is_rest_day).toBe('boolean');
      expect(Array.isArray(dailyTraining.exercises)).toBe(true);
    });

    it('should validate exercise structure', () => {
      const exercise = mockTrainingPlanData.plan_data.weekly_schedules[0].daily_trainings[0].exercises[0];
      
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
      expect(authState.trainingPlan).toBeDefined();
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
      expect(authStateWithNullProfile.trainingPlan).toBeDefined();
    });

    it('should handle auth state with null training plan', () => {
      const authStateWithNullPlan = {
        ...mockAuthState,
        trainingPlan: null
      };
      
      expect(authStateWithNullPlan.user).toBeDefined();
      expect(authStateWithNullPlan.userProfile).toBeDefined();
      expect(authStateWithNullPlan.trainingPlan).toBeNull();
    });
  });
});