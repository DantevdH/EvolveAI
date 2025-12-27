/**
 * TrainingService Tracking Update Tests
 *
 * Tests for updating endurance sessions with tracked workout data.
 * Verifies Supabase integration and data transformation.
 */

// Mock Supabase client
const mockSupabaseUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
});

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: mockSupabaseUpdate,
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import { TrainingService } from '../../services/trainingService';
import { supabase } from '../../config/supabase';

describe('TrainingService.updateEnduranceSessionWithTrackedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock chain
    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    (supabase.from as jest.Mock).mockReturnValue({
      update: mockSupabaseUpdate,
    });
  });

  const validTrackedData = {
    actualDuration: 3600, // 1 hour in seconds
    actualDistance: 10000, // 10 km in meters
    averagePace: 360, // 6:00/km in seconds
    averageSpeed: 10, // 10 km/h
    averageHeartRate: 150,
    maxHeartRate: 175,
    minHeartRate: 120,
    elevationGain: 100,
    elevationLoss: 50,
    calories: 600,
    cadence: 170,
    dataSource: 'live_tracking' as const,
    healthWorkoutId: null,
    startedAt: new Date('2024-01-15T08:00:00Z'),
    completedAt: new Date('2024-01-15T09:00:00Z'),
  };

  describe('successful updates', () => {
    it('should update endurance session with all tracked data', async () => {
      const result = await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('endurance_session');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          actual_duration: 3600,
          actual_distance: 10000,
          average_pace: 360,
          average_speed: 10,
          average_heart_rate: 150,
          max_heart_rate: 175,
          min_heart_rate: 120,
          elevation_gain: 100,
          elevation_loss: 50,
          calories: 600,
          cadence: 170,
          data_source: 'live_tracking',
          completed: true,
        })
      );
    });

    it('should include session ID in query', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseUpdate.mockReturnValue({ eq: mockEq });

      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(mockEq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should convert timestamps to ISO strings', async () => {
      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          started_at: '2024-01-15T08:00:00.000Z',
          completed_at: '2024-01-15T09:00:00.000Z',
        })
      );
    });

    it('should set completed to true', async () => {
      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
        })
      );
    });

    it('should include health_workout_id for health imports', async () => {
      const healthImportData = {
        ...validTrackedData,
        dataSource: 'healthkit' as const,
        healthWorkoutId: 'hk-workout-456',
      };

      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        healthImportData
      );

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data_source: 'healthkit',
          health_workout_id: 'hk-workout-456',
        })
      );
    });
  });

  describe('handling null values', () => {
    it('should filter out null values from payload', async () => {
      const dataWithNulls = {
        actualDuration: 1800,
        actualDistance: 5000,
        averagePace: null,
        averageSpeed: null,
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        elevationGain: null,
        elevationLoss: null,
        calories: null,
        cadence: null,
        dataSource: 'live_tracking' as const,
        healthWorkoutId: null,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        dataWithNulls
      );

      const updatePayload = mockSupabaseUpdate.mock.calls[0][0];

      // These should be present
      expect(updatePayload.actual_duration).toBe(1800);
      expect(updatePayload.actual_distance).toBe(5000);
      expect(updatePayload.completed).toBe(true);

      // These should be filtered out
      expect(updatePayload.average_pace).toBeUndefined();
      expect(updatePayload.average_heart_rate).toBeUndefined();
      expect(updatePayload.health_workout_id).toBeUndefined();
    });

    it('should filter out undefined values', async () => {
      const dataWithUndefined = {
        actualDuration: 1800,
        actualDistance: 5000,
        averagePace: undefined,
        averageSpeed: undefined,
        averageHeartRate: undefined,
        maxHeartRate: undefined,
        minHeartRate: undefined,
        elevationGain: undefined,
        elevationLoss: undefined,
        calories: undefined,
        cadence: undefined,
        dataSource: 'live_tracking' as const,
        healthWorkoutId: undefined,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        dataWithUndefined as any
      );

      const updatePayload = mockSupabaseUpdate.mock.calls[0][0];
      expect(updatePayload.average_pace).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should return error on Supabase failure', async () => {
      const mockError = { message: 'Database error' };
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: mockError }),
      });

      const result = await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      mockSupabaseUpdate.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle unknown error types', async () => {
      mockSupabaseUpdate.mockImplementation(() => {
        throw 'String error';
      });

      const result = await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update endurance session');
    });
  });

  describe('data source types', () => {
    it('should handle live_tracking data source', async () => {
      await TrainingService.updateEnduranceSessionWithTrackedData('session-123', {
        ...validTrackedData,
        dataSource: 'live_tracking',
      });

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data_source: 'live_tracking' })
      );
    });

    it('should handle healthkit data source', async () => {
      await TrainingService.updateEnduranceSessionWithTrackedData('session-123', {
        ...validTrackedData,
        dataSource: 'healthkit',
      });

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data_source: 'healthkit' })
      );
    });

    it('should handle google_fit data source', async () => {
      await TrainingService.updateEnduranceSessionWithTrackedData('session-123', {
        ...validTrackedData,
        dataSource: 'google_fit',
      });

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data_source: 'google_fit' })
      );
    });
  });

  describe('updated_at timestamp', () => {
    it('should include updated_at timestamp', async () => {
      const beforeCall = new Date();

      await TrainingService.updateEnduranceSessionWithTrackedData(
        'session-123',
        validTrackedData
      );

      const updatePayload = mockSupabaseUpdate.mock.calls[0][0];
      const updatedAt = new Date(updatePayload.updated_at);

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    });
  });
});
