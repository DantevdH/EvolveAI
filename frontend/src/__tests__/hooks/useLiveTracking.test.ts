/**
 * useLiveTracking Hook Tests
 *
 * Tests for the React hook that manages live GPS workout tracking.
 * Tests countdown logic, state management, and formatted metrics.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock dependencies - use complete mock to avoid Flow syntax parsing errors
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

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn().mockResolvedValue(0.85),
}));

jest.mock('../../services/LiveTrackingService', () => {
  // Define types inside the mock factory
  type MockTrackingStatus = 'idle' | 'countdown' | 'tracking' | 'paused' | 'auto_paused' | 'stopping' | 'summary' | 'saving';
  type MockGPSQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

  interface MockState {
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

  let mockState: MockState = {
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

  const subscribers = new Set<(state: any) => void>();

  const notifySubscribers = () => {
    subscribers.forEach(cb => cb({ ...mockState }));
  };

  return {
    LiveTrackingService: {
      getState: jest.fn(() => ({ ...mockState })),
      subscribe: jest.fn((callback: (state: any) => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      }),
      startTracking: jest.fn().mockImplementation(async (sessionId: string, sportType: string) => {
        mockState = {
          ...mockState,
          status: 'tracking',
          enduranceSessionId: sessionId,
          sportType,
          startedAt: new Date(),
        };
        notifySubscribers();
      }),
      pauseTracking: jest.fn().mockImplementation(() => {
        mockState = { ...mockState, status: 'paused', pausedAt: new Date() };
        notifySubscribers();
      }),
      resumeTracking: jest.fn().mockImplementation(() => {
        mockState = { ...mockState, status: 'tracking', pausedAt: null };
        notifySubscribers();
      }),
      stopTracking: jest.fn().mockImplementation(async () => {
        mockState = { ...mockState, status: 'summary' };
        notifySubscribers();
        return {
          actualDuration: 1800,
          actualDistance: 5000,
          averagePace: 360,
          averageSpeed: 10,
          averageHeartRate: null,
          maxHeartRate: null,
          minHeartRate: null,
          elevationGain: 50,
          elevationLoss: 30,
          calories: 300,
          cadence: null,
          dataSource: 'live_tracking',
          healthWorkoutId: null,
          startedAt: new Date(),
          completedAt: new Date(),
        };
      }),
      discardTracking: jest.fn().mockImplementation(async () => {
        mockState = {
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
        notifySubscribers();
      }),
      checkGPSAvailability: jest.fn().mockResolvedValue({
        accuracy: 5,
        quality: 'excellent',
      }),
      setUserWeight: jest.fn(),
      // Helper to reset mock state for tests
      __resetMockState: () => {
        mockState = {
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
        subscribers.clear();
      },
      __setMockState: (newState: Partial<MockState>) => {
        mockState = { ...mockState, ...newState };
        notifySubscribers();
      },
    },
  };
});

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

describe('useLiveTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (LiveTrackingService as any).__resetMockState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return idle tracking state', () => {
      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.trackingState.status).toBe('idle');
      expect(result.current.isCountingDown).toBe(false);
      expect(result.current.countdownSeconds).toBe(0);
    });

    it('should subscribe to LiveTrackingService', () => {
      renderHook(() => useLiveTracking());

      expect(LiveTrackingService.subscribe).toHaveBeenCalled();
    });

    it('should set user weight from profile', () => {
      renderHook(() => useLiveTracking());

      expect(LiveTrackingService.setUserWeight).toHaveBeenCalledWith(75);
    });
  });

  describe('formattedMetrics', () => {
    it('should format duration correctly', () => {
      (LiveTrackingService as any).__setMockState({
        elapsedSeconds: 3661, // 1:01:01
        sportType: 'running',
      });

      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.formattedMetrics.duration).toBe('1:01:01');
    });

    it('should format distance in metric', () => {
      (LiveTrackingService as any).__setMockState({
        distanceMeters: 5500,
        sportType: 'running',
      });

      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.formattedMetrics.distance).toBe('5.50 km');
    });

    it('should format pace for running', () => {
      (LiveTrackingService as any).__setMockState({
        averagePaceSecondsPerKm: 360, // 6:00/km
        sportType: 'running',
      });

      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.formattedMetrics.averagePace).toBe('6:00 /km');
    });

    it('should format speed for cycling', () => {
      (LiveTrackingService as any).__setMockState({
        averageSpeedKmh: 25.5,
        sportType: 'cycling',
      });

      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.formattedMetrics.averageSpeed).toBe('25.5 km/h');
    });

    it('should handle null values gracefully', () => {
      const { result } = renderHook(() => useLiveTracking());

      expect(result.current.formattedMetrics.heartRate).toBeNull();
      expect(result.current.formattedMetrics.calories).toBeNull();
    });
  });

  describe('countdown', () => {
    it('should start countdown with correct seconds', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      expect(result.current.isCountingDown).toBe(true);
      expect(result.current.countdownSeconds).toBe(3);
    });

    it('should decrement countdown every second', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      expect(result.current.countdownSeconds).toBe(3);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.countdownSeconds).toBe(2);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.countdownSeconds).toBe(1);
    });

    it('should start tracking after countdown completes', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      // Advance through entire countdown
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Wait for the setTimeout(0) to execute
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(LiveTrackingService.startTracking).toHaveBeenCalledWith('session-123', 'running');
    });

    it('should cancel countdown when requested', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      expect(result.current.isCountingDown).toBe(true);

      act(() => {
        result.current.cancelCountdown();
      });

      expect(result.current.isCountingDown).toBe(false);
      expect(result.current.countdownSeconds).toBe(0);
    });

    it('should prevent double countdown start', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      const initialSeconds = result.current.countdownSeconds;

      act(() => {
        result.current.startCountdown('session-456', 'cycling');
      });

      // Should still be on first countdown
      expect(result.current.countdownSeconds).toBe(initialSeconds);
    });
  });

  describe('tracking controls', () => {
    it('should pause tracking', async () => {
      (LiveTrackingService as any).__setMockState({ status: 'tracking' });
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.pause();
      });

      expect(LiveTrackingService.pauseTracking).toHaveBeenCalled();
    });

    it('should resume tracking', async () => {
      (LiveTrackingService as any).__setMockState({ status: 'paused' });
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.resume();
      });

      expect(LiveTrackingService.resumeTracking).toHaveBeenCalled();
    });

    it('should stop tracking and return metrics', async () => {
      (LiveTrackingService as any).__setMockState({ status: 'tracking' });
      const { result } = renderHook(() => useLiveTracking());

      let metrics;
      await act(async () => {
        metrics = await result.current.stop();
      });

      expect(LiveTrackingService.stopTracking).toHaveBeenCalled();
      expect(metrics).toBeDefined();
      expect(metrics!.dataSource).toBe('live_tracking');
    });

    it('should discard tracking', async () => {
      (LiveTrackingService as any).__setMockState({ status: 'tracking' });
      const { result } = renderHook(() => useLiveTracking());

      await act(async () => {
        await result.current.discard();
      });

      expect(LiveTrackingService.discardTracking).toHaveBeenCalled();
    });
  });

  describe('checkReadiness', () => {
    it('should return ready state when GPS is good', async () => {
      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness!.ready).toBe(true);
      expect(readiness!.gpsSignal.quality).toBe('excellent');
      expect(readiness!.issues).toHaveLength(0);
    });

    it('should report GPS issues when quality is none', async () => {
      (LiveTrackingService.checkGPSAvailability as jest.Mock).mockResolvedValueOnce({
        accuracy: Infinity,
        quality: 'none',
      });

      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness!.issues).toContain('GPS signal not available');
    });

    it('should report low battery warning', async () => {
      const Battery = require('expo-battery');
      Battery.getBatteryLevelAsync.mockResolvedValueOnce(0.15); // 15%

      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness!.issues).toContain('Battery level is below 20%');
    });
  });

  describe('resetToIdle', () => {
    it('should reset all state to idle', async () => {
      const { result } = renderHook(() => useLiveTracking());

      // Start countdown
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      expect(result.current.isCountingDown).toBe(true);

      // Reset
      await act(async () => {
        await result.current.resetToIdle();
      });

      expect(result.current.isCountingDown).toBe(false);
      expect(result.current.countdownSeconds).toBe(0);
      expect(LiveTrackingService.discardTracking).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show alert when tracking fails to start', async () => {
      (LiveTrackingService.startTracking as jest.Mock).mockRejectedValueOnce(
        new Error('Location permission not granted')
      );

      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      // Complete countdown - advance timers through countdown
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Advance timers to trigger setTimeout(0) that calls startTracking
      await act(async () => {
        jest.advanceTimersByTime(0);
        // Flush pending promises
        await Promise.resolve();
        await Promise.resolve();
      });

      // Error handler runs in setTimeout(0), advance timers again
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Tracking Error',
        expect.stringContaining('location permissions'),
        expect.any(Array)
      );
    });
  });

  describe('effective state', () => {
    it('should override status to countdown when counting down', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      // Even though service state is 'idle', effective state should be 'countdown'
      // isCountingDown flag should override the status
      expect(result.current.isCountingDown).toBe(true);
      expect(result.current.trackingState.status).toBe('countdown');
    });
  });
});
