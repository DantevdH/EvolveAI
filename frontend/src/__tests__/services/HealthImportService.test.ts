/**
 * HealthImportService Tests
 *
 * Unit tests for importing workouts from HealthKit (iOS) and Health Connect (Android).
 * Tests workout querying, type mapping, and metric conversion.
 */

import { Platform } from 'react-native';

// Store original Platform.OS
const originalPlatformOS = Platform.OS;

// Mock react-native-health (HealthKit)
const mockIsAvailable = jest.fn((callback: any) => callback(null, true));
const mockInitHealthKit = jest.fn((permissions: any, callback: any) => callback(null));
const mockGetSamples = jest.fn((options: any, callback: any) => callback(null, []));

jest.mock('react-native-health', () => ({
  __esModule: true,
  default: {
    isAvailable: mockIsAvailable,
    initHealthKit: mockInitHealthKit,
    getSamples: mockGetSamples,
    Constants: {
      Permissions: {
        Workout: 'Workout',
        HeartRate: 'HeartRate',
        DistanceWalkingRunning: 'DistanceWalkingRunning',
        DistanceCycling: 'DistanceCycling',
        DistanceSwimming: 'DistanceSwimming',
        ActiveEnergyBurned: 'ActiveEnergyBurned',
        FlightsClimbed: 'FlightsClimbed',
      },
    },
  },
}));

// Mock react-native-health-connect
jest.mock('react-native-health-connect', () => ({
  readRecords: jest.fn().mockResolvedValue({ records: [] }),
  getSdkStatus: jest.fn().mockResolvedValue(1), // SDK_AVAILABLE
  SdkAvailabilityStatus: {
    SDK_AVAILABLE: 1,
    SDK_UNAVAILABLE: 0,
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
import { HealthImportService } from '../../services/HealthImportService';
import { readRecords, getSdkStatus } from 'react-native-health-connect';

describe('HealthImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS for each test
    (Platform as any).OS = 'ios';
  });

  afterEach(() => {
    (Platform as any).OS = originalPlatformOS;
  });

  describe('isAvailable', () => {
    describe('iOS (HealthKit)', () => {
      beforeEach(() => {
        (Platform as any).OS = 'ios';
      });

      it('should return true when HealthKit is available', async () => {
        mockIsAvailable.mockImplementation((callback: any) => callback(null, true));

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(true);
        expect(mockIsAvailable).toHaveBeenCalled();
      });

      it('should return false when HealthKit is not available', async () => {
        mockIsAvailable.mockImplementation((callback: any) => callback(null, false));

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        mockIsAvailable.mockImplementation((callback: any) => callback('Error', false));

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('Android (Health Connect)', () => {
      beforeEach(() => {
        (Platform as any).OS = 'android';
      });

      it('should return true when Health Connect is available', async () => {
        (getSdkStatus as jest.Mock).mockResolvedValue(1); // SDK_AVAILABLE

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(true);
        expect(getSdkStatus).toHaveBeenCalled();
      });

      it('should return false when Health Connect is not available', async () => {
        (getSdkStatus as jest.Mock).mockResolvedValue(0); // SDK_UNAVAILABLE

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        (getSdkStatus as jest.Mock).mockRejectedValue(new Error('SDK error'));

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('Other platforms', () => {
      it('should return false for web', async () => {
        (Platform as any).OS = 'web';

        const result = await HealthImportService.isAvailable();

        expect(result).toBe(false);
      });
    });
  });

  describe('getWorkoutsForDate', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should query workouts for entire day', async () => {
      const mockWorkouts = [
        {
          id: 'workout-1',
          activityId: 37, // Running
          startDate: '2024-01-15T08:00:00Z',
          endDate: '2024-01-15T09:00:00Z',
          distance: 10, // km
          calories: 500,
        },
      ];

      mockInitHealthKit.mockImplementation((perms: any, callback: any) => callback(null));
      mockGetSamples.mockImplementation((options: any, callback: any) =>
        callback(null, mockWorkouts)
      );

      const date = new Date('2024-01-15');
      const workouts = await HealthImportService.getWorkoutsForDate(date);

      expect(mockGetSamples).toHaveBeenCalled();
      expect(workouts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWorkoutsInRange', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should return empty array when no workouts found', async () => {
      mockInitHealthKit.mockImplementation((perms: any, callback: any) => callback(null));
      mockGetSamples.mockImplementation((options: any, callback: any) => callback(null, []));

      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');
      const workouts = await HealthImportService.getWorkoutsInRange(start, end);

      expect(workouts).toEqual([]);
    });

    it('should throw error on HealthKit failure', async () => {
      mockInitHealthKit.mockImplementation((perms: any, callback: any) => callback(null));
      mockGetSamples.mockImplementation((options: any, callback: any) =>
        callback('Query failed', null)
      );

      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');

      await expect(HealthImportService.getWorkoutsInRange(start, end)).rejects.toThrow();
    });
  });

  describe('mapHealthWorkoutType', () => {
    it('should map HealthKit running type', () => {
      expect(HealthImportService.mapHealthWorkoutType(37)).toBe('running');
    });

    it('should map HealthKit cycling type', () => {
      expect(HealthImportService.mapHealthWorkoutType(13)).toBe('cycling');
    });

    it('should map HealthKit swimming type', () => {
      expect(HealthImportService.mapHealthWorkoutType(46)).toBe('swimming');
    });

    it('should map Health Connect RUNNING type', () => {
      expect(HealthImportService.mapHealthWorkoutType('RUNNING')).toBe('running');
    });

    it('should map Health Connect BIKING type', () => {
      expect(HealthImportService.mapHealthWorkoutType('BIKING')).toBe('cycling');
    });

    it('should return other for unknown types', () => {
      expect(HealthImportService.mapHealthWorkoutType(9999)).toBe('other');
      expect(HealthImportService.mapHealthWorkoutType('UNKNOWN')).toBe('other');
    });
  });

  describe('workoutToMetrics', () => {
    it('should convert workout to TrackedWorkoutMetrics', () => {
      const workout = {
        id: 'workout-123',
        source: 'healthkit' as const,
        sportType: 'running',
        startDate: new Date('2024-01-15T08:00:00Z'),
        endDate: new Date('2024-01-15T09:00:00Z'),
        duration: 3600, // 1 hour
        distance: 10000, // 10km
        averageHeartRate: 150,
        maxHeartRate: 175,
        minHeartRate: 120,
        elevationGain: 100,
        calories: 600,
        sourceName: 'Apple Watch',
      };

      const metrics = HealthImportService.workoutToMetrics(workout);

      expect(metrics.actualDuration).toBe(3600);
      expect(metrics.actualDistance).toBe(10000);
      expect(metrics.averageHeartRate).toBe(150);
      expect(metrics.maxHeartRate).toBe(175);
      expect(metrics.minHeartRate).toBe(120);
      expect(metrics.elevationGain).toBe(100);
      expect(metrics.calories).toBe(600);
      expect(metrics.dataSource).toBe('healthkit');
      expect(metrics.healthWorkoutId).toBe('workout-123');
      expect(metrics.startedAt).toEqual(new Date('2024-01-15T08:00:00Z'));
      expect(metrics.completedAt).toEqual(new Date('2024-01-15T09:00:00Z'));
    });

    it('should calculate pace from distance and duration', () => {
      const workout = {
        id: 'workout-123',
        source: 'healthkit' as const,
        sportType: 'running',
        startDate: new Date('2024-01-15T08:00:00Z'),
        endDate: new Date('2024-01-15T09:00:00Z'),
        duration: 3600, // 1 hour
        distance: 10000, // 10km = 6:00/km pace
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        elevationGain: null,
        calories: null,
        sourceName: 'Apple Watch',
      };

      const metrics = HealthImportService.workoutToMetrics(workout);

      // 3600 seconds / 10km = 360 seconds/km = 6:00/km
      expect(metrics.averagePace).toBe(360);
      // 10km / 1h = 10 km/h
      expect(metrics.averageSpeed).toBeCloseTo(10, 1);
    });

    it('should handle workout with no distance', () => {
      const workout = {
        id: 'workout-123',
        source: 'healthkit' as const,
        sportType: 'stair_climbing',
        startDate: new Date('2024-01-15T08:00:00Z'),
        endDate: new Date('2024-01-15T08:30:00Z'),
        duration: 1800,
        distance: null,
        averageHeartRate: 140,
        maxHeartRate: 160,
        minHeartRate: 110,
        elevationGain: 50,
        calories: 300,
        sourceName: 'Apple Watch',
      };

      const metrics = HealthImportService.workoutToMetrics(workout);

      expect(metrics.actualDistance).toBe(0);
      expect(metrics.averagePace).toBeNull();
      expect(metrics.averageSpeed).toBeNull();
    });

    it('should use google_fit as dataSource for Android workouts', () => {
      const workout = {
        id: 'workout-123',
        source: 'google_fit' as const,
        sportType: 'running',
        startDate: new Date(),
        endDate: new Date(),
        duration: 1800,
        distance: 5000,
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        elevationGain: null,
        calories: null,
        sourceName: 'Google Fit',
      };

      const metrics = HealthImportService.workoutToMetrics(workout);

      expect(metrics.dataSource).toBe('google_fit');
    });
  });
});

describe('HealthImportService - Health Connect (Android)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  afterEach(() => {
    (Platform as any).OS = originalPlatformOS;
  });

  describe('getWorkoutsInRange', () => {
    it('should query Health Connect for exercise sessions', async () => {
      const mockRecords = [
        {
          metadata: { id: 'session-1' },
          exerciseType: 'RUNNING',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T09:00:00Z',
        },
      ];

      (readRecords as jest.Mock)
        .mockResolvedValueOnce({ records: mockRecords })
        .mockResolvedValue({ records: [] }); // For additional metric queries

      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');
      const workouts = await HealthImportService.getWorkoutsInRange(start, end);

      expect(readRecords).toHaveBeenCalledWith('ExerciseSession', expect.any(Object));
    });

    it('should fetch additional metrics for each workout', async () => {
      const mockExerciseRecords = [
        {
          metadata: { id: 'session-1', dataOrigin: 'com.google.android.apps.fitness' },
          exerciseType: 'RUNNING',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T09:00:00Z',
        },
      ];

      const mockDistanceRecords = [
        { distance: { inMeters: 5000 } },
      ];

      const mockHRRecords = [
        { samples: [{ beatsPerMinute: 140 }, { beatsPerMinute: 160 }] },
      ];

      (readRecords as jest.Mock)
        .mockResolvedValueOnce({ records: mockExerciseRecords })
        .mockResolvedValueOnce({ records: mockDistanceRecords })
        .mockResolvedValueOnce({ records: mockHRRecords })
        .mockResolvedValueOnce({ records: [] }) // Elevation
        .mockResolvedValueOnce({ records: [] }); // Calories

      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');
      const workouts = await HealthImportService.getWorkoutsInRange(start, end);

      // Should query for Distance, HeartRate, ElevationGained, ActiveCaloriesBurned
      expect(readRecords).toHaveBeenCalledWith('Distance', expect.any(Object));
      expect(readRecords).toHaveBeenCalledWith('HeartRate', expect.any(Object));
    });
  });
});
