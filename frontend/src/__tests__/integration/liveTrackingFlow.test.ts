/**
 * Live Tracking Flow Integration Tests
 *
 * End-to-end tests for the complete tracking lifecycle:
 * start → track → pause → resume → stop → save
 *
 * Tests component interactions and data flow between services.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Define the mock state type to allow all possible values
type MockTrackingStatus = 'idle' | 'countdown' | 'tracking' | 'paused' | 'auto_paused' | 'stopping' | 'summary' | 'saving';
type MockGPSQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

interface MockServiceState {
  status: MockTrackingStatus;
  enduranceSessionId: string | null;
  sportType: string | null;
  startedAt: Date | null;
  elapsedSeconds: number;
  pausedAt: Date | null;
  totalPausedSeconds: number;
  distanceMeters: number;
  currentPaceSecondsPerKm: number | null;
  averagePaceSecondsPerKm: number | null;
  averageSpeedKmh: number | null;
  elevationGainMeters: number;
  elevationLossMeters: number;
  currentAltitudeMeters: number | null;
  gpsSignal: { accuracy: number; quality: MockGPSQuality };
  lastLocation: null;
  error: string | null;
}

// Store mock state that can be shared across service mocks
let mockServiceState: MockServiceState = {
  status: 'idle',
  enduranceSessionId: null,
  sportType: null,
  startedAt: null,
  elapsedSeconds: 0,
  pausedAt: null,
  totalPausedSeconds: 0,
  distanceMeters: 0,
  currentPaceSecondsPerKm: null,
  averagePaceSecondsPerKm: null,
  averageSpeedKmh: null,
  elevationGainMeters: 0,
  elevationLossMeters: 0,
  currentAltitudeMeters: null,
  gpsSignal: { accuracy: 5, quality: 'excellent' },
  lastLocation: null,
  error: null,
};

const resetMockState = () => {
  mockServiceState = {
    status: 'idle',
    enduranceSessionId: null,
    sportType: null,
    startedAt: null,
    elapsedSeconds: 0,
    pausedAt: null,
    totalPausedSeconds: 0,
    distanceMeters: 0,
    currentPaceSecondsPerKm: null,
    averagePaceSecondsPerKm: null,
    averageSpeedKmh: null,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    currentAltitudeMeters: null,
    gpsSignal: { accuracy: 5, quality: 'excellent' },
    lastLocation: null,
    error: null,
  };
};

// Subscriber management
const subscribers = new Set<(state: MockServiceState) => void>();
const notifySubscribers = () => {
  subscribers.forEach(cb => cb({ ...mockServiceState }));
};

// Mock React Native - use complete mock to avoid Flow syntax parsing errors
jest.mock('react-native', () => {
  const mockAppState = {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };
  
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Alert: {
      alert: jest.fn(),
    },
    AppState: mockAppState,
  };
});

// Mock expo-battery
jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn().mockResolvedValue(0.85),
}));

// Mock LiveTrackingService with realistic behavior
jest.mock('../../services/LiveTrackingService', () => ({
  LiveTrackingService: {
    getState: jest.fn(() => ({ ...mockServiceState })),
    subscribe: jest.fn((callback: (state: any) => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }),
    startTracking: jest.fn().mockImplementation(async (sessionId: string, sportType: string) => {
      mockServiceState = {
        ...mockServiceState,
        status: 'tracking',
        enduranceSessionId: sessionId,
        sportType,
        startedAt: new Date(),
      };
      notifySubscribers();
    }),
    pauseTracking: jest.fn().mockImplementation(() => {
      mockServiceState = {
        ...mockServiceState,
        status: 'paused',
        pausedAt: new Date(),
      };
      notifySubscribers();
    }),
    resumeTracking: jest.fn().mockImplementation(() => {
      const pauseDuration = mockServiceState.pausedAt
        ? (Date.now() - mockServiceState.pausedAt.getTime()) / 1000
        : 0;
      mockServiceState = {
        ...mockServiceState,
        status: 'tracking',
        pausedAt: null,
        totalPausedSeconds: mockServiceState.totalPausedSeconds + pauseDuration,
      };
      notifySubscribers();
    }),
    stopTracking: jest.fn().mockImplementation(async () => {
      const completedAt = new Date();
      const metrics = {
        actualDuration: mockServiceState.elapsedSeconds,
        actualDistance: mockServiceState.distanceMeters,
        averagePace: mockServiceState.averagePaceSecondsPerKm,
        averageSpeed: mockServiceState.averageSpeedKmh,
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        elevationGain: mockServiceState.elevationGainMeters > 0 ? mockServiceState.elevationGainMeters : null,
        elevationLoss: mockServiceState.elevationLossMeters > 0 ? mockServiceState.elevationLossMeters : null,
        calories: mockServiceState.elapsedSeconds > 60 ? Math.round(mockServiceState.elapsedSeconds / 60 * 10) : null,
        cadence: null,
        dataSource: 'live_tracking' as const,
        healthWorkoutId: null,
        startedAt: mockServiceState.startedAt!,
        completedAt,
      };
      mockServiceState = {
        ...mockServiceState,
        status: 'summary',
      };
      notifySubscribers();
      return metrics;
    }),
    discardTracking: jest.fn().mockImplementation(async () => {
      resetMockState();
      notifySubscribers();
    }),
    checkGPSAvailability: jest.fn().mockResolvedValue({
      accuracy: 5,
      quality: 'excellent',
    }),
    setUserWeight: jest.fn(),
  },
}));

// Mock TrainingService
const mockUpdateEnduranceSession = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/trainingService', () => ({
  TrainingService: {
    updateEnduranceSessionWithTrackedData: mockUpdateEnduranceSession,
  },
}));

// Mock user profile hook
jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    userProfile: {
      weight: 75,
      weightUnit: 'kg',
    },
    useMetric: true, // useMetric is a separate property, not on userProfile
    isLoading: false,
  })),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import { useLiveTracking } from '../../hooks/useLiveTracking';
import { LiveTrackingService } from '../../services/LiveTrackingService';
import { TrainingService } from '../../services/trainingService';

describe('Live Tracking Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetMockState();
    subscribers.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Tracking Lifecycle', () => {
    it('should complete full flow: countdown → start → track → pause → resume → stop → save', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // 1. Initial state
      expect(result.current.trackingState.status).toBe('idle');

      // 2. Start countdown
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });
      expect(result.current.isCountingDown).toBe(true);
      expect(result.current.countdownSeconds).toBe(3);

      // 3. Wait for countdown to complete
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Advance timers to trigger setTimeout(0) that calls startTracking
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(LiveTrackingService.startTracking).toHaveBeenCalledWith('session-123', 'running');
      expect(result.current.trackingState.status).toBe('tracking');

      // 4. Simulate location updates
      act(() => {
        mockServiceState.distanceMeters = 1000;
        mockServiceState.elapsedSeconds = 300; // 5 minutes
        mockServiceState.averagePaceSecondsPerKm = 300; // 5:00/km
        notifySubscribers();
      });

      expect(result.current.trackingState.distanceMeters).toBe(1000);
      expect(result.current.formattedMetrics.distance).toBe('1.00 km');

      // 5. Pause tracking
      act(() => {
        result.current.pause();
      });
      expect(LiveTrackingService.pauseTracking).toHaveBeenCalled();
      expect(result.current.trackingState.status).toBe('paused');

      // 6. Resume tracking
      act(() => {
        result.current.resume();
      });
      expect(LiveTrackingService.resumeTracking).toHaveBeenCalled();
      expect(result.current.trackingState.status).toBe('tracking');

      // 7. More tracking
      act(() => {
        mockServiceState.distanceMeters = 5000;
        mockServiceState.elapsedSeconds = 1800; // 30 minutes
        mockServiceState.averagePaceSecondsPerKm = 360; // 6:00/km
        mockServiceState.elevationGainMeters = 50;
        notifySubscribers();
      });

      // 8. Stop tracking
      let metrics;
      await act(async () => {
        metrics = await result.current.stop();
      });

      expect(LiveTrackingService.stopTracking).toHaveBeenCalled();
      expect(result.current.trackingState.status).toBe('summary');
      expect(metrics).toBeDefined();
      expect(metrics!.dataSource).toBe('live_tracking');
      expect(metrics!.actualDistance).toBe(5000);

      // 9. Save to database
      await act(async () => {
        await TrainingService.updateEnduranceSessionWithTrackedData('session-123', metrics!);
      });

      expect(mockUpdateEnduranceSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          dataSource: 'live_tracking',
        })
      );
    });

    it('should handle discard flow: countdown → start → discard', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start and track
      act(() => {
        result.current.startCountdown('session-123', 'cycling');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Advance timers to trigger setTimeout(0) that calls startTracking
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.trackingState.status).toBe('tracking');

      // Discard
      await act(async () => {
        await result.current.discard();
      });

      expect(LiveTrackingService.discardTracking).toHaveBeenCalled();
      expect(result.current.trackingState.status).toBe('idle');
    });

    it('should cancel countdown before tracking starts', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start countdown
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });
      expect(result.current.isCountingDown).toBe(true);

      // Partial countdown
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.countdownSeconds).toBe(2);

      // Cancel before completion
      act(() => {
        result.current.cancelCountdown();
      });

      expect(result.current.isCountingDown).toBe(false);
      expect(result.current.countdownSeconds).toBe(0);
      expect(LiveTrackingService.startTracking).not.toHaveBeenCalled();
    });
  });

  describe('Metric Updates During Tracking', () => {
    it('should update formatted metrics as raw values change', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start tracking
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // Initial metrics
      expect(result.current.formattedMetrics.duration).toBe('0:00');
      expect(result.current.formattedMetrics.distance).toBe('0.00 km');

      // Simulate progress
      act(() => {
        mockServiceState.elapsedSeconds = 600; // 10 minutes
        mockServiceState.distanceMeters = 2000;
        mockServiceState.currentPaceSecondsPerKm = 300;
        mockServiceState.averagePaceSecondsPerKm = 300;
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.duration).toBe('10:00');
      expect(result.current.formattedMetrics.distance).toBe('2.00 km');
      expect(result.current.formattedMetrics.averagePace).toBe('5:00 /km');

      // More progress
      act(() => {
        mockServiceState.elapsedSeconds = 3661; // 1:01:01
        mockServiceState.distanceMeters = 10500;
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.duration).toBe('1:01:01');
      expect(result.current.formattedMetrics.distance).toBe('10.50 km');
    });

    it('should format speed for cycling instead of pace', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'cycling');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      act(() => {
        mockServiceState.averageSpeedKmh = 28.5;
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.averageSpeed).toBe('28.5 km/h');
    });
  });

  describe('GPS Signal Quality During Tracking', () => {
    it('should update GPS signal quality as accuracy changes', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start tracking with excellent signal
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(result.current.trackingState.gpsSignal.quality).toBe('excellent');

      // Signal degrades
      act(() => {
        mockServiceState.gpsSignal = { accuracy: 25, quality: 'poor' };
        notifySubscribers();
      });

      expect(result.current.trackingState.gpsSignal.quality).toBe('poor');
      expect(result.current.trackingState.gpsSignal.accuracy).toBe(25);

      // Signal improves
      act(() => {
        mockServiceState.gpsSignal = { accuracy: 8, quality: 'good' };
        notifySubscribers();
      });

      expect(result.current.trackingState.gpsSignal.quality).toBe('good');
    });
  });

  describe('Pause/Resume Behavior', () => {
    it('should track total paused time across multiple pauses', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start tracking
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // First pause
      act(() => {
        result.current.pause();
      });

      // Simulate 10 seconds passing
      act(() => {
        mockServiceState.pausedAt = new Date(Date.now() - 10000);
        notifySubscribers();
      });

      // Resume
      act(() => {
        result.current.resume();
      });

      // Second pause
      act(() => {
        result.current.pause();
      });

      // Simulate another 5 seconds
      act(() => {
        mockServiceState.pausedAt = new Date(Date.now() - 5000);
        notifySubscribers();
      });

      // Resume again
      act(() => {
        result.current.resume();
      });

      // Total paused should accumulate
      expect(result.current.trackingState.totalPausedSeconds).toBeGreaterThan(0);
    });

    it('should not track distance while paused', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start and track some distance
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      act(() => {
        mockServiceState.distanceMeters = 1000;
        notifySubscribers();
      });

      const distanceBeforePause = result.current.trackingState.distanceMeters;

      // Pause
      act(() => {
        result.current.pause();
      });

      expect(result.current.trackingState.status).toBe('paused');

      // In a real scenario, location updates would be ignored while paused
      // The distance should remain the same
      expect(result.current.trackingState.distanceMeters).toBe(distanceBeforePause);
    });
  });

  describe('Readiness Check Before Tracking', () => {
    it('should pass readiness check with good conditions', async () => {
      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness).toBeDefined();
      expect(readiness!.ready).toBe(true);
      expect(readiness!.gpsSignal.quality).toBe('excellent');
      expect(readiness!.issues).toHaveLength(0);
    });

    it('should report issues when GPS is unavailable', async () => {
      (LiveTrackingService.checkGPSAvailability as jest.Mock).mockResolvedValueOnce({
        accuracy: Infinity,
        quality: 'none',
      });

      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness!.ready).toBe(false);
      expect(readiness!.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should reset state completely on discard after error', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start tracking
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // Simulate some tracking
      act(() => {
        mockServiceState.distanceMeters = 2000;
        mockServiceState.elapsedSeconds = 600;
        mockServiceState.error = 'GPS signal lost';
        notifySubscribers();
      });

      // Discard
      await act(async () => {
        await result.current.discard();
      });

      expect(result.current.trackingState.status).toBe('idle');
      expect(result.current.trackingState.distanceMeters).toBe(0);
      expect(result.current.trackingState.elapsedSeconds).toBe(0);
      expect(result.current.trackingState.error).toBeNull();
    });

    it('should allow new session after discarding', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // First session
      act(() => {
        result.current.startCountdown('session-1', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.discard();
      });

      // Second session should work
      act(() => {
        result.current.startCountdown('session-2', 'cycling');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(result.current.trackingState.status).toBe('tracking');
      expect(result.current.trackingState.enduranceSessionId).toBe('session-2');
      expect(result.current.trackingState.sportType).toBe('cycling');
    });
  });
});
