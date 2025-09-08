/**
 * Unit tests for WorkoutService
 */

import { WorkoutService } from '../../../services/workoutService';
import { mockWorkoutPlanData, mockEmptyWorkoutPlan, mockPartialWorkoutPlan } from '../../fixtures/mockWorkoutData';

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

describe('WorkoutService', () => {
  const mockSupabase = require('../../../config/supabase').supabase;
  const userProfileId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkoutStreak', () => {
    it('should calculate streak correctly for completed workouts', async () => {
      // Mock successful response with completed workouts
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkoutPlanData,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getWorkoutStreak(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3); // Friday, Wednesday, and Monday workouts completed
    });

    it('should return 0 streak when no workout plan exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await WorkoutService.getWorkoutStreak(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should return 0 streak when no completed workouts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPartialWorkoutPlan,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getWorkoutStreak(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const result = await WorkoutService.getWorkoutStreak(userProfileId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to calculate workout streak');
    });
  });

  describe('getWeeklyWorkoutCount', () => {
    it('should count non-rest days correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkoutPlanData,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getWeeklyWorkoutCount(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3); // Monday, Wednesday, Friday
    });

    it('should return 0 when no workout plan exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await WorkoutService.getWeeklyWorkoutCount(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('getGoalProgress', () => {
    it('should calculate progress percentage correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkoutPlanData,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getGoalProgress(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(100); // 3 completed out of 3 total workout days
    });

    it('should return 0 when no workout plan exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await WorkoutService.getGoalProgress(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('getTodaysWorkout', () => {
    beforeEach(() => {
      // Mock Date to always return Monday
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01')); // Monday
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return today\'s workout correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkoutPlanData,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getTodaysWorkout(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Monday Workout');
      expect(result.data?.isRestDay).toBe(false);
      expect(result.data?.exercises).toHaveLength(2);
    });

    it('should return null when no workout plan exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await WorkoutService.getTodaysWorkout(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getRecentActivity', () => {
    it('should return completed workouts only', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockWorkoutPlanData,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // Friday, Wednesday, and Monday completed
      expect(result.data?.[0].type).toBe('workout');
      expect(result.data?.[0].title).toBe('Friday Workout');
      expect(result.data?.[1].title).toBe('Wednesday Workout');
      expect(result.data?.[2].title).toBe('Monday Workout');
    });

    it('should return empty array when no completed workouts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPartialWorkoutPlan,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should limit to 3 most recent activities', async () => {
      // Create a plan with more than 3 completed workouts
      const planWithManyWorkouts = {
        ...mockWorkoutPlanData,
        plan_data: {
          weekly_schedules: [
            {
              week_number: 1,
              daily_workouts: [
                { day_of_week: "Monday", is_rest_day: false, exercises: [{ completed: true }] },
                { day_of_week: "Tuesday", is_rest_day: false, exercises: [{ completed: true }] },
                { day_of_week: "Wednesday", is_rest_day: false, exercises: [{ completed: true }] },
                { day_of_week: "Thursday", is_rest_day: false, exercises: [{ completed: true }] },
                { day_of_week: "Friday", is_rest_day: false, exercises: [{ completed: true }] }
              ]
            }
          ]
        }
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: planWithManyWorkouts,
              error: null
            })
          })
        })
      });

      const result = await WorkoutService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });
});
