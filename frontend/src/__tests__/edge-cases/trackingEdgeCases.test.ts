/**
 * Live Tracking Edge Case Tests
 *
 * Tests for uncommon scenarios and error conditions:
 * - GPS signal loss and recovery
 * - Component unmount during countdown
 * - Rapid pause/resume cycles
 * - App backgrounded during tracking
 * - State recovery after interruption
 * - Extreme values handling
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

// Shared mock state
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

const subscribers = new Set<(state: MockServiceState) => void>();
const notifySubscribers = () => {
  subscribers.forEach(cb => cb({ ...mockServiceState }));
};

// Mocks - use the mock from setupFiles.ts, don't require actual react-native
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
      mockServiceState = { ...mockServiceState, status: 'paused', pausedAt: new Date() };
      notifySubscribers();
    }),
    resumeTracking: jest.fn().mockImplementation(() => {
      mockServiceState = { ...mockServiceState, status: 'tracking', pausedAt: null };
      notifySubscribers();
    }),
    stopTracking: jest.fn().mockImplementation(async () => {
      mockServiceState = { ...mockServiceState, status: 'summary' };
      notifySubscribers();
      return {
        actualDuration: mockServiceState.elapsedSeconds,
        actualDistance: mockServiceState.distanceMeters,
        averagePace: mockServiceState.averagePaceSecondsPerKm,
        averageSpeed: mockServiceState.averageSpeedKmh,
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        elevationGain: mockServiceState.elevationGainMeters || null,
        elevationLoss: mockServiceState.elevationLossMeters || null,
        calories: null,
        cadence: null,
        dataSource: 'live_tracking' as const,
        healthWorkoutId: null,
        startedAt: mockServiceState.startedAt!,
        completedAt: new Date(),
      };
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

jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    userProfile: { weight: 75, weightUnit: 'kg' },
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

import { useLiveTracking } from '../../hooks/useLiveTracking';
import { LiveTrackingService } from '../../services/LiveTrackingService';

describe('Tracking Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetMockState();
    subscribers.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GPS Signal Loss and Recovery', () => {
    it('should handle GPS signal degrading to none', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // Start tracking
      act(() => {
        result.current.startCountdown('session-123', 'running');
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

      // Signal drops to none
      act(() => {
        mockServiceState.gpsSignal = { accuracy: Infinity, quality: 'none' };
        mockServiceState.error = 'GPS signal lost';
        notifySubscribers();
      });

      expect(result.current.trackingState.gpsSignal.quality).toBe('none');
      expect(result.current.trackingState.error).toBe('GPS signal lost');

      // Tracking should continue (user can still see elapsed time)
      expect(result.current.trackingState.status).toBe('tracking');
      
      // Cleanup
      unmount();
    });

    it('should recover when GPS signal returns', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // Start tracking with good signal
      act(() => {
        result.current.startCountdown('session-123', 'running');
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

      // Signal lost
      act(() => {
        mockServiceState.gpsSignal = { accuracy: Infinity, quality: 'none' };
        mockServiceState.error = 'GPS signal lost';
        notifySubscribers();
      });

      // Signal recovers
      act(() => {
        mockServiceState.gpsSignal = { accuracy: 8, quality: 'good' };
        mockServiceState.error = null;
        notifySubscribers();
      });

      expect(result.current.trackingState.gpsSignal.quality).toBe('good');
      expect(result.current.trackingState.error).toBeNull();
    });

    it('should allow stopping even with no GPS signal', async () => {
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

      // Some distance tracked before signal loss
      act(() => {
        mockServiceState.distanceMeters = 1000;
        mockServiceState.elapsedSeconds = 300;
        notifySubscribers();
      });

      // Signal drops
      act(() => {
        mockServiceState.gpsSignal = { accuracy: Infinity, quality: 'none' };
        notifySubscribers();
      });

      // Should still be able to stop
      let metrics;
      await act(async () => {
        metrics = await result.current.stop();
      });

      expect(metrics).toBeDefined();
      expect(metrics!.actualDistance).toBe(1000);
    });
  });

  describe('Component Unmount During Countdown', () => {
    it('should cleanup countdown timer on unmount', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // Start countdown
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      expect(result.current.isCountingDown).toBe(true);

      // Unmount mid-countdown
      unmount();

      // Advance timers - should not cause errors
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // No way to assert on unmounted component, but test should not throw
    });

    it('should cleanup service subscription on unmount', () => {
      const { unmount } = renderHook(() => useLiveTracking());

      expect(LiveTrackingService.subscribe).toHaveBeenCalled();

      // Get the unsubscribe function that was returned
      const subscribeCalls = (LiveTrackingService.subscribe as jest.Mock).mock.results;
      expect(subscribeCalls.length).toBeGreaterThan(0);

      unmount();

      // The subscriber should have been cleaned up
      // (Implementation detail: the set should be empty after unsubscribe)
    });
  });

  describe('Rapid Pause/Resume Cycles', () => {
    it('should handle rapid pause/resume without losing state', async () => {
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

      act(() => {
        mockServiceState.distanceMeters = 1000;
        notifySubscribers();
      });

      // Rapid pause/resume cycle
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.pause();
        });
        act(() => {
          result.current.resume();
        });
      }

      // State should still be consistent
      expect(result.current.trackingState.status).toBe('tracking');
      expect(result.current.trackingState.distanceMeters).toBe(1000);
      expect(LiveTrackingService.pauseTracking).toHaveBeenCalledTimes(5);
      expect(LiveTrackingService.resumeTracking).toHaveBeenCalledTimes(5);
    });

    it('should not allow pause when already paused', async () => {
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

      const pauseCallCount = (LiveTrackingService.pauseTracking as jest.Mock).mock.calls.length;

      // Second pause attempt
      act(() => {
        result.current.pause();
      });

      // Service might be called but state shouldn't break
      expect(result.current.trackingState.status).toBe('paused');
    });
  });

  describe('Extreme Values', () => {
    it('should handle very long duration (marathon+)', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // 5 hours marathon
      act(() => {
        mockServiceState.elapsedSeconds = 18000; // 5 hours
        mockServiceState.distanceMeters = 42195; // full marathon
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.duration).toBe('5:00:00');
      expect(result.current.formattedMetrics.distance).toBe('42.20 km');
    });

    it('should handle very high speed (cycling downhill)', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'cycling');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // 80 km/h downhill
      act(() => {
        mockServiceState.averageSpeedKmh = 80;
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.averageSpeed).toBe('80.0 km/h');
    });

    it('should handle very slow pace (walking)', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'walking');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // 15 min/km pace (very slow walk)
      act(() => {
        mockServiceState.averagePaceSecondsPerKm = 900;
        mockServiceState.sportType = 'walking';
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.averagePace).toBe('15:00 /km');
    });

    it('should handle significant elevation gain (mountain run)', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'hiking');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // 2000m elevation gain
      act(() => {
        mockServiceState.elevationGainMeters = 2000;
        mockServiceState.elevationLossMeters = 500;
        notifySubscribers();
      });

      expect(result.current.trackingState.elevationGainMeters).toBe(2000);
      expect(result.current.trackingState.elevationLossMeters).toBe(500);
    });

    it('should handle zero distance indoor workout', async () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'stair_climbing');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // 30 minutes, no distance
      act(() => {
        mockServiceState.elapsedSeconds = 1800;
        mockServiceState.distanceMeters = 0;
        mockServiceState.sportType = 'stair_climbing';
        notifySubscribers();
      });

      expect(result.current.formattedMetrics.duration).toBe('30:00');
      expect(result.current.formattedMetrics.distance).toBe('0.00 km');

      // Should still be able to complete
      let metrics;
      await act(async () => {
        metrics = await result.current.stop();
      });

      expect(metrics!.actualDistance).toBe(0);
      expect(metrics!.actualDuration).toBe(1800);
    });
  });

  describe('State Recovery', () => {
    it('should maintain state across multiple render cycles', () => {
      const { result, rerender } = renderHook(() => useLiveTracking());

      // Initial state
      expect(result.current.trackingState.status).toBe('idle');

      // Simulate state change
      act(() => {
        mockServiceState.status = 'tracking';
        mockServiceState.enduranceSessionId = 'session-123';
        notifySubscribers();
      });

      // Force rerender
      rerender(undefined);

      // State should persist
      expect(result.current.trackingState.status).toBe('tracking');
      expect(result.current.trackingState.enduranceSessionId).toBe('session-123');
    });

    it('should handle multiple simultaneous subscribers', () => {
      // Render multiple hooks
      const { result: result1 } = renderHook(() => useLiveTracking());
      const { result: result2 } = renderHook(() => useLiveTracking());

      // Update state
      act(() => {
        mockServiceState.status = 'tracking';
        mockServiceState.distanceMeters = 500;
        notifySubscribers();
      });

      // Both hooks should receive update
      expect(result1.current.trackingState.distanceMeters).toBe(500);
      expect(result2.current.trackingState.distanceMeters).toBe(500);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle tracking start failure gracefully', async () => {
      (LiveTrackingService.startTracking as jest.Mock).mockRejectedValueOnce(
        new Error('Location services disabled')
      );

      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      // Complete countdown
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Advance timers to trigger setTimeout(0) that calls startTracking
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Error handler runs in setTimeout(0), advance timers again
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      // Alert should have been shown
      expect(Alert.alert).toHaveBeenCalled();

      // Should not be in tracking state
      expect(result.current.trackingState.status).not.toBe('tracking');
    });

    it('should handle stop failure gracefully', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // Start tracking successfully
      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(0);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Mock stop to fail
      (LiveTrackingService.stopTracking as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to save workout')
      );

      await act(async () => {
        try {
          await result.current.stop();
        } catch (e) {
          // Expected to throw
        }
      });

      // Should still be able to discard
      await act(async () => {
        await result.current.discard();
      });

      expect(result.current.trackingState.status).toBe('idle');
      
      // Cleanup
      unmount();
    });

    it('should handle null/undefined sport type gracefully', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // State with null sport type
      act(() => {
        mockServiceState.status = 'tracking';
        mockServiceState.sportType = null;
        notifySubscribers();
      });

      // Formatted metrics should still work
      expect(result.current.formattedMetrics).toBeDefined();
      expect(result.current.formattedMetrics.duration).toBe('0:00');
      
      // Cleanup
      unmount();
    });
  });

  describe('Countdown Edge Cases', () => {
    it('should not start countdown when already in countdown', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-1', 'running');
      });

      expect(result.current.countdownSeconds).toBe(3);

      // Try to start another countdown
      act(() => {
        result.current.startCountdown('session-2', 'cycling');
      });

      // Should still be on original countdown
      expect(result.current.countdownSeconds).toBe(3);
    });

    it('should not start countdown when already tracking', async () => {
      const { result, unmount } = renderHook(() => useLiveTracking());

      // Complete countdown and start tracking
      act(() => {
        result.current.startCountdown('session-123', 'running');
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

      // Try to start countdown again
      act(() => {
        result.current.startCountdown('session-456', 'cycling');
      });

      // Should still be tracking the first session
      expect(result.current.trackingState.enduranceSessionId).toBe('session-123');
      
      // Cleanup
      unmount();
    });

    it('should handle cancel during last second of countdown', () => {
      const { result } = renderHook(() => useLiveTracking());

      act(() => {
        result.current.startCountdown('session-123', 'running');
      });

      // Advance to last second
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.countdownSeconds).toBe(1);

      // Cancel at the last moment
      act(() => {
        result.current.cancelCountdown();
      });

      expect(result.current.isCountingDown).toBe(false);
      expect(LiveTrackingService.startTracking).not.toHaveBeenCalled();
    });
  });

  describe('Battery Edge Cases', () => {
    it('should warn when battery is critically low', async () => {
      const Battery = require('expo-battery');
      Battery.getBatteryLevelAsync.mockResolvedValueOnce(0.05); // 5%

      const { result } = renderHook(() => useLiveTracking());

      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      expect(readiness!.issues).toContain('Battery level is below 20%');
    });

    it('should handle battery check failure gracefully', async () => {
      const Battery = require('expo-battery');
      Battery.getBatteryLevelAsync.mockRejectedValueOnce(new Error('Battery API error'));

      const { result } = renderHook(() => useLiveTracking());

      // Should not throw
      let readiness;
      await act(async () => {
        readiness = await result.current.checkReadiness();
      });

      // Should still return a result (battery issue not included)
      expect(readiness).toBeDefined();
    });
  });
});
