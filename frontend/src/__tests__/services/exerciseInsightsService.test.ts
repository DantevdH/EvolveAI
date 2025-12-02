/**
 * Unit Tests for Exercise Insights Service
 * Tests the exercise analytics engine and insights generation
 */

import { ExerciseInsightsService } from '../../services/exerciseInsightsService';
import { ExerciseAnalyticsEngine } from '../../services/exerciseAnalyticsEngine';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('ExerciseInsightsService', () => {
  describe('getExerciseInsights', () => {
    it('should return error when exerciseId is invalid', async () => {
      const result = await ExerciseInsightsService.getExerciseInsights(NaN, 1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when userProfileId is invalid', async () => {
      const result = await ExerciseInsightsService.getExerciseInsights(1, NaN);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing training data gracefully', async () => {
      // Mock empty data response
      const result = await ExerciseInsightsService.getExerciseInsights(1, 1);
      // Should handle gracefully even if no data
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});

describe('ExerciseAnalyticsEngine', () => {
  describe('processTrainingHistory', () => {
    it('should handle empty training history', () => {
      const result = ExerciseAnalyticsEngine.processTrainingHistory([]);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should process valid training history', () => {
      const mockHistory = [
        {
          date: '2025-01-15',
          volume: 2400,
          maxWeight: 80,
          sets: 3,
          reps: [10, 10, 10],
          weights: [80, 80, 80],
          updated_at: '2025-01-15T10:00:00Z'
        }
      ];

      const result = ExerciseAnalyticsEngine.processTrainingHistory(mockHistory);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid data gracefully', () => {
      const invalidHistory = [
        {
          date: null,
          volume: null,
          maxWeight: null,
          sets: null,
          reps: null,
          weights: null,
          updated_at: null
        }
      ];

      // Function may throw on invalid data - this is expected behavior
      // The service layer should validate data before calling this function
      expect(() => {
        ExerciseAnalyticsEngine.processTrainingHistory(invalidHistory as any);
      }).toThrow();
    });
  });

  describe('generateInsights', () => {
    it('should generate insights from processed history', () => {
      const mockProcessedHistory = [
        {
          date: '2025-01-15',
          volume: 2400,
          maxWeight: 80,
          sets: 3,
          reps: [10, 10, 10],
          weights: [80, 80, 80],
          intensity: 0.7,
          estimated1RM: 100
        }
      ];

      const result = ExerciseAnalyticsEngine.generateInsights(mockProcessedHistory);
      expect(result).toBeDefined();
      // Check that result has expected structure
      expect(result).toHaveProperty('keyInsights');
      expect(result).toHaveProperty('volumeTrend');
      expect(result).toHaveProperty('strengthProgression');
    });

    it('should handle empty processed history', () => {
      const result = ExerciseAnalyticsEngine.generateInsights([]);
      expect(result).toBeDefined();
      expect(result.keyInsights).toBeDefined();
      expect(Array.isArray(result.keyInsights)).toBe(true);
    });
  });
});

