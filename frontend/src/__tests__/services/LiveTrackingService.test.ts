/**
 * LiveTrackingService Tests
 *
 * Unit tests for the GPS workout tracking service.
 * Tests core functionality: distance calculation, pace/speed updates,
 * elevation tracking, auto-pause, and state management.
 */

import { Platform } from 'react-native';

// Mock expo-location before importing the service
jest.mock('expo-location', () => ({
  Accuracy: {
    BestForNavigation: 6,
    High: 5,
  },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 52.3676,
      longitude: 4.9041,
      altitude: 0,
      accuracy: 5,
      speed: 3,
    },
    timestamp: Date.now(),
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn().mockReturnValue(true),
  defineTask: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import {
  LiveTrackingService,
  calculateDistance,
  defineBackgroundLocationTask,
} from '../../services/LiveTrackingService';
import * as Location from 'expo-location';

describe('LiveTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service to idle state
    LiveTrackingService.discardTracking();
  });

  describe('calculateDistance (Haversine formula)', () => {
    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(52.3676, 4.9041, 52.3676, 4.9041);
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for known coordinates', () => {
      // Amsterdam to Rotterdam (~57km)
      const distance = calculateDistance(52.3676, 4.9041, 51.9244, 4.4777);
      expect(distance).toBeGreaterThan(55000);
      expect(distance).toBeLessThan(60000);
    });

    it('should calculate short distance accurately', () => {
      // ~100 meters apart
      const distance = calculateDistance(52.3676, 4.9041, 52.3685, 4.9041);
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });

    it('should handle negative coordinates', () => {
      // Southern hemisphere
      const distance = calculateDistance(-33.8688, 151.2093, -33.8698, 151.2093);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });

    it('should be symmetric', () => {
      const d1 = calculateDistance(52.3676, 4.9041, 51.9244, 4.4777);
      const d2 = calculateDistance(51.9244, 4.4777, 52.3676, 4.9041);
      expect(d1).toBeCloseTo(d2, 5);
    });
  });

  describe('getState', () => {
    it('should return initial idle state', () => {
      const state = LiveTrackingService.getState();
      expect(state.status).toBe('idle');
      expect(state.distanceMeters).toBe(0);
      expect(state.elapsedSeconds).toBe(0);
      expect(state.enduranceSessionId).toBeNull();
    });
  });

  describe('setUserWeight', () => {
    it('should accept valid weight', () => {
      LiveTrackingService.setUserWeight(75);
      // Weight is private, but affects calorie calculation
      // We'll verify through integration
    });

    it('should reject invalid weight (0)', () => {
      LiveTrackingService.setUserWeight(0);
      // Should not throw, just ignore
    });

    it('should reject invalid weight (negative)', () => {
      LiveTrackingService.setUserWeight(-10);
      // Should not throw, just ignore
    });

    it('should reject invalid weight (> 500)', () => {
      LiveTrackingService.setUserWeight(600);
      // Should not throw, just ignore
    });
  });

  describe('startTracking', () => {
    it('should start tracking successfully', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      const state = LiveTrackingService.getState();
      expect(state.status).toBe('tracking');
      expect(state.enduranceSessionId).toBe('session-123');
      expect(state.sportType).toBe('running');
      expect(state.startedAt).toBeInstanceOf(Date);
    });

    it('should throw error if already tracking', async () => {
      await LiveTrackingService.startTracking('session-1', 'running');

      await expect(
        LiveTrackingService.startTracking('session-2', 'cycling')
      ).rejects.toThrow('Tracking already in progress');
    });

    it('should allow re-start for same session (idempotent)', async () => {
      await LiveTrackingService.startTracking('session-1', 'running');

      // Same session - should not throw
      await expect(
        LiveTrackingService.startTracking('session-1', 'running')
      ).resolves.not.toThrow();
    });

    it('should request location permissions', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should throw error if permission denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await expect(
        LiveTrackingService.startTracking('session-123', 'running')
      ).rejects.toThrow('Location permission not granted');
    });
  });

  describe('pauseTracking', () => {
    it('should pause active tracking', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      LiveTrackingService.pauseTracking();

      const state = LiveTrackingService.getState();
      expect(state.status).toBe('paused');
      expect(state.pausedAt).toBeInstanceOf(Date);
    });

    it('should do nothing if not tracking', () => {
      LiveTrackingService.pauseTracking();
      const state = LiveTrackingService.getState();
      expect(state.status).toBe('idle');
    });
  });

  describe('resumeTracking', () => {
    it('should resume paused tracking', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      LiveTrackingService.pauseTracking();
      LiveTrackingService.resumeTracking();

      const state = LiveTrackingService.getState();
      expect(state.status).toBe('tracking');
      expect(state.pausedAt).toBeNull();
    });

    it('should accumulate paused time', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      LiveTrackingService.pauseTracking();

      // Simulate time passing
      const pauseStart = Date.now();
      jest.advanceTimersByTime(5000); // 5 seconds

      LiveTrackingService.resumeTracking();

      const state = LiveTrackingService.getState();
      expect(state.totalPausedSeconds).toBeGreaterThan(0);
    });

    it('should do nothing if not paused', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      LiveTrackingService.resumeTracking();
      const state = LiveTrackingService.getState();
      expect(state.status).toBe('tracking');
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking and return metrics', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      const metrics = await LiveTrackingService.stopTracking();

      expect(metrics).toBeDefined();
      expect(metrics.dataSource).toBe('live_tracking');
      expect(metrics.startedAt).toBeInstanceOf(Date);
      expect(metrics.completedAt).toBeInstanceOf(Date);
      expect(metrics.actualDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.actualDistance).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if not tracking', async () => {
      await expect(LiveTrackingService.stopTracking()).rejects.toThrow(
        'No active tracking session'
      );
    });

    it('should set status to summary after stopping', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      await LiveTrackingService.stopTracking();

      const state = LiveTrackingService.getState();
      expect(state.status).toBe('summary');
    });

    it('should include elevation if tracked', async () => {
      await LiveTrackingService.startTracking('session-123', 'hiking');

      // Simulate elevation changes via handleLocationUpdate
      const service = LiveTrackingService as any;
      service.state.elevationGainMeters = 150;
      service.state.elevationLossMeters = 50;

      const metrics = await LiveTrackingService.stopTracking();

      expect(metrics.elevationGain).toBe(150);
      expect(metrics.elevationLoss).toBe(50);
    });

    it('should return null for elevation if none tracked', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      const metrics = await LiveTrackingService.stopTracking();

      expect(metrics.elevationGain).toBeNull();
      expect(metrics.elevationLoss).toBeNull();
    });
  });

  describe('discardTracking', () => {
    it('should reset to idle state', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');
      await LiveTrackingService.discardTracking();

      const state = LiveTrackingService.getState();
      expect(state.status).toBe('idle');
      expect(state.distanceMeters).toBe(0);
      expect(state.enduranceSessionId).toBeNull();
    });
  });

  describe('checkGPSAvailability', () => {
    it('should return quality for available GPS', async () => {
      const result = await LiveTrackingService.checkGPSAvailability();

      expect(result.quality).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor', 'none']).toContain(result.quality);
      expect(result.accuracy).toBeDefined();
    });

    it('should return none if services disabled', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValueOnce(false);

      const result = await LiveTrackingService.checkGPSAvailability();

      expect(result.quality).toBe('none');
      expect(result.accuracy).toBe(Infinity);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers on state change', async () => {
      const subscriber = jest.fn();
      const unsubscribe = LiveTrackingService.subscribe(subscriber);

      await LiveTrackingService.startTracking('session-123', 'running');

      expect(subscriber).toHaveBeenCalled();
      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
        status: 'tracking',
      }));

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const subscriber = jest.fn();
      const unsubscribe = LiveTrackingService.subscribe(subscriber);

      await LiveTrackingService.startTracking('session-123', 'running');
      const callCount = subscriber.mock.calls.length;

      unsubscribe();
      LiveTrackingService.pauseTracking();

      // Should not have additional calls after unsubscribe
      expect(subscriber.mock.calls.length).toBe(callCount);
    });
  });

  describe('calorie estimation', () => {
    it('should estimate calories based on sport type', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      // Simulate 30 minutes of running
      const service = LiveTrackingService as any;
      service.state.elapsedSeconds = 1800; // 30 minutes

      const metrics = await LiveTrackingService.stopTracking();

      expect(metrics.calories).toBeGreaterThan(0);
    });

    it('should return null for short workouts', async () => {
      await LiveTrackingService.startTracking('session-123', 'running');

      // Only 30 seconds
      const service = LiveTrackingService as any;
      service.state.elapsedSeconds = 30;

      const metrics = await LiveTrackingService.stopTracking();

      expect(metrics.calories).toBeNull();
    });

    it('should use user weight when set', async () => {
      LiveTrackingService.setUserWeight(80);
      await LiveTrackingService.startTracking('session-123', 'running');

      const service = LiveTrackingService as any;
      service.state.elapsedSeconds = 3600; // 1 hour

      const metrics = await LiveTrackingService.stopTracking();

      // 80kg * 10 MET * 1 hour = 800 calories for running
      expect(metrics.calories).toBeCloseTo(800, -1);
    });
  });

  describe('GPS signal quality thresholds', () => {
    it('should classify excellent accuracy (<= 5m)', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { accuracy: 3 },
        timestamp: Date.now(),
      });

      const result = await LiveTrackingService.checkGPSAvailability();
      expect(result.quality).toBe('excellent');
    });

    it('should classify good accuracy (5-10m)', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { accuracy: 8 },
        timestamp: Date.now(),
      });

      const result = await LiveTrackingService.checkGPSAvailability();
      expect(result.quality).toBe('good');
    });

    it('should classify fair accuracy (10-20m)', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { accuracy: 15 },
        timestamp: Date.now(),
      });

      const result = await LiveTrackingService.checkGPSAvailability();
      expect(result.quality).toBe('fair');
    });

    it('should classify poor accuracy (20-50m)', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { accuracy: 35 },
        timestamp: Date.now(),
      });

      const result = await LiveTrackingService.checkGPSAvailability();
      expect(result.quality).toBe('poor');
    });

    it('should classify none for accuracy > 50m', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { accuracy: 100 },
        timestamp: Date.now(),
      });

      const result = await LiveTrackingService.checkGPSAvailability();
      expect(result.quality).toBe('none');
    });
  });
});

describe('defineBackgroundLocationTask', () => {
  it('should define the background task', () => {
    const TaskManager = require('expo-task-manager');

    defineBackgroundLocationTask();

    expect(TaskManager.defineTask).toHaveBeenCalledWith(
      'EVOLVE_BACKGROUND_LOCATION',
      expect.any(Function)
    );
  });
});
