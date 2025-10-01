/**
 * Unit tests for TrainingService
 */

import { TrainingService } from '../../../services/trainingService';
import { mockTrainingPlanData, mockEmptyTrainingPlan, mockPartialTrainingPlan } from '../../fixtures/mockTrainingData';

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

describe('TrainingService', () => {
  const mockSupabase = require('../../../config/supabase').supabase;
  const userProfileId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrainingStreak', () => {
    it('should calculate streak correctly for completed trainings', async () => {
      // Mock successful response with completed trainings
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrainingPlanData,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getTrainingStreak(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3); // Friday, Wednesday, and Monday trainings completed
    });

    it('should return 0 streak when no training plan exists', async () => {
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

      const result = await TrainingService.getTrainingStreak(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should return 0 streak when no completed trainings', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPartialTrainingPlan,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getTrainingStreak(userProfileId);

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

      const result = await TrainingService.getTrainingStreak(userProfileId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to calculate training streak');
    });
  });

  describe('getWeeklyTrainingCount', () => {
    it('should count non-rest days correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrainingPlanData,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getWeeklyTrainingCount(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3); // Monday, Wednesday, Friday
    });

    it('should return 0 when no training plan exists', async () => {
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

      const result = await TrainingService.getWeeklyTrainingCount(userProfileId);

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
              data: mockTrainingPlanData,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getGoalProgress(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(100); // 3 completed out of 3 total training days
    });

    it('should return 0 when no training plan exists', async () => {
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

      const result = await TrainingService.getGoalProgress(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('getTodaysTraining', () => {
    beforeEach(() => {
      // Mock Date to always return Monday
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01')); // Monday
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return today\'s training correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrainingPlanData,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getTodaysTraining(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Monday Training');
      expect(result.data?.isRestDay).toBe(false);
      expect(result.data?.exercises).toHaveLength(2);
    });

    it('should return null when no training plan exists', async () => {
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

      const result = await TrainingService.getTodaysTraining(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getRecentActivity', () => {
    it('should return completed trainings only', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrainingPlanData,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // Friday, Wednesday, and Monday completed
      expect(result.data?.[0].type).toBe('training');
      expect(result.data?.[0].title).toBe('Friday Training');
      expect(result.data?.[1].title).toBe('Wednesday Training');
      expect(result.data?.[2].title).toBe('Monday Training');
    });

    it('should return empty array when no completed trainings', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPartialTrainingPlan,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should limit to 3 most recent activities', async () => {
      // Create a plan with more than 3 completed trainings
      const planWithManyTrainings = {
        ...mockTrainingPlanData,
        plan_data: {
          weekly_schedules: [
            {
              week_number: 1,
              daily_trainings: [
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
              data: planWithManyTrainings,
              error: null
            })
          })
        })
      });

      const result = await TrainingService.getRecentActivity(userProfileId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });
});
