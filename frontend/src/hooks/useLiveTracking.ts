/**
 * useLiveTracking Hook
 *
 * React hook for live GPS workout tracking.
 * Provides:
 * - Real-time tracking state
 * - Formatted metrics based on user's unit preference
 * - Countdown handling
 * - Pre-start readiness checks
 *
 * Uses LiveTrackingService under the hood.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert } from 'react-native';
import * as Battery from 'expo-battery';
import {
  TrackingState,
  TrackingStatus,
  FormattedWorkoutMetrics,
  TrackedWorkoutMetrics,
  GPSSignalQuality,
  UseLiveTrackingReturn,
} from '../types/liveTracking';
import { LiveTrackingService } from '../services/LiveTrackingService';
import { useUserProfile } from './useUserProfile';
import { logger } from '../utils/logger';
import {
  formatDuration,
  formatDistance,
  formatSpeed,
  formatElevation,
  formatSportSpecificPace,
  formatStandardPace,
} from '../utils/sportMetrics';

// ==================== CONSTANTS ====================

const COUNTDOWN_SECONDS = 3;

// ==================== HOOK ====================

export function useLiveTracking(): UseLiveTrackingReturn {
  // Get user's metric preference and profile
  const { userProfile, useMetric } = useUserProfile();

  // Tracking state from service
  const [trackingState, setTrackingState] = useState<TrackingState>(
    LiveTrackingService.getState()
  );

  // Countdown state - completely independent from service state
  // Using a ref to track if we're in countdown mode to avoid race conditions with service updates
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStartRef = useRef<{ sessionId: string; sportType: string } | null>(null);

  // Set user weight for calorie estimation
  useEffect(() => {
    if (userProfile?.weight) {
      // Convert to kg if weight is in lbs
      const weightKg = userProfile.weightUnit === 'lbs'
        ? userProfile.weight / 2.205
        : userProfile.weight;
      LiveTrackingService.setUserWeight(weightKg);
    }
  }, [userProfile?.weight, userProfile?.weightUnit]);

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = LiveTrackingService.subscribe((state) => {
      setTrackingState(state);
    });

    return () => {
      unsubscribe();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Format metrics based on current state, unit preference, and sport type
  const formattedMetrics: FormattedWorkoutMetrics = useMemo(() => {
    const sportType = trackingState.sportType || 'other';

    return {
      duration: formatDuration(trackingState.elapsedSeconds),
      distance: formatDistance(trackingState.distanceMeters, useMetric),
      // Use sport-specific pace formatting (swimming: /100m, rowing: /500m)
      averagePace: formatSportSpecificPace(
        trackingState.averagePaceSecondsPerKm,
        sportType,
        useMetric
      ),
      currentPace: formatSportSpecificPace(
        trackingState.currentPaceSecondsPerKm,
        sportType,
        useMetric
      ),
      averageSpeed: formatSpeed(trackingState.averageSpeedKmh, useMetric),
      elevationGain: formatElevation(trackingState.elevationGainMeters, useMetric, '+'),
      elevationLoss: formatElevation(trackingState.elevationLossMeters, useMetric, '-'),
      heartRate: null, // Not tracked in live mode (requires health app)
      calories: null, // Not tracked in live mode (requires health app)
      cadence: null,
    };
  }, [trackingState, useMetric]);

  // ==================== RESET HELPER ====================

  const resetToIdle = useCallback(async () => {
    // Clear countdown timer
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownSeconds(0);
    setIsCountingDown(false);
    pendingStartRef.current = null;

    // Force service cleanup to ensure consistent state
    try {
      await LiveTrackingService.discardTracking();
    } catch (err) {
      logger.warn('Failed to discard tracking during reset', err);
    }
  }, []);

  // ==================== COUNTDOWN ====================

  const startCountdown = useCallback((sessionId: string, sportType: string) => {
    // Guard: If already counting down or tracking, don't start again
    const currentServiceState = LiveTrackingService.getState();

    if (
      currentServiceState.status === 'tracking' ||
      currentServiceState.status === 'paused' ||
      currentServiceState.status === 'auto_paused'
    ) {
      logger.warn('Cannot start countdown - tracking already in progress', {
        status: currentServiceState.status,
      });
      return;
    }

    // Guard: If countdown already in progress, don't start again
    if (countdownIntervalRef.current || isCountingDown) {
      logger.warn('Countdown already in progress - ignoring duplicate call');
      return;
    }

    // Store pending start info
    pendingStartRef.current = { sessionId, sportType };

    // Mark countdown as active BEFORE setting the seconds
    // This ensures the UI knows we're counting down even before React batches the state update
    setIsCountingDown(true);
    setCountdownSeconds(COUNTDOWN_SECONDS);

    // Start countdown - SINGLE source of truth
    // Flow: Show 3 for 1s → Show 2 for 1s → Show 1 for 1s → then start tracking
    countdownIntervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        // When prev is 1, we decrement to 0 and START tracking
        // This means 1 was shown for a full second before this tick
        if (prev <= 1) {
          // Countdown complete - clear interval
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Mark countdown as complete
          setIsCountingDown(false);

          // Start actual tracking OUTSIDE of state updater to avoid async issues
          // Use setTimeout(0) to escape the state updater context
          setTimeout(() => {
            if (pendingStartRef.current) {
              const { sessionId: id, sportType: type } = pendingStartRef.current;
              pendingStartRef.current = null;

              LiveTrackingService.startTracking(id, type).catch(async (error) => {
                logger.error('Failed to start tracking', error);

                // Reset state on error
                setIsCountingDown(false);

                // Show user-friendly error alert
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                let userMessage = 'Unable to start tracking. ';

                if (errorMessage.toLowerCase().includes('permission')) {
                  userMessage += 'Please enable location permissions in Settings.';
                } else if (errorMessage.toLowerCase().includes('location')) {
                  userMessage += 'Please ensure location services are enabled.';
                } else {
                  userMessage += 'Please try again.';
                }

                Alert.alert('Tracking Error', userMessage, [{ text: 'OK' }]);

                // Force service cleanup to ensure it's in idle state for retry
                try {
                  await LiveTrackingService.discardTracking();
                } catch (discardError) {
                  logger.warn('Failed to discard after start error', discardError);
                }
              });
            }
          }, 0);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isCountingDown]);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    pendingStartRef.current = null;
    setCountdownSeconds(0);
    setIsCountingDown(false);
  }, []);

  // ==================== TRACKING CONTROLS ====================

  const pause = useCallback(() => {
    LiveTrackingService.pauseTracking();
  }, []);

  const resume = useCallback(() => {
    LiveTrackingService.resumeTracking();
  }, []);

  const stop = useCallback(async (): Promise<TrackedWorkoutMetrics> => {
    return LiveTrackingService.stopTracking();
  }, []);

  const discard = useCallback(async () => {
    await LiveTrackingService.discardTracking();
  }, []);

  // ==================== READINESS CHECK ====================

  const checkReadiness = useCallback(async () => {
    const issues: string[] = [];

    // Check GPS signal
    const gpsSignal = await LiveTrackingService.checkGPSAvailability();
    if (gpsSignal.quality === 'none') {
      issues.push('GPS signal not available');
    } else if (gpsSignal.quality === 'poor') {
      issues.push('GPS signal is weak');
    }

    // Check battery level
    let batteryLevel: number | null = null;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
      if (batteryLevel !== null && batteryLevel < 0.2) {
        issues.push('Battery level is below 20%');
      }
    } catch {
      // Battery API not available on some platforms
    }

    return {
      ready: issues.length === 0 || !issues.some((i) => i.includes('not available')),
      gpsSignal,
      batteryLevel: batteryLevel !== null ? Math.round(batteryLevel * 100) : null,
      issues,
    };
  }, []);

  // ==================== RETURN ====================

  // Override status if in countdown - use isCountingDown as the authoritative source
  // This avoids race conditions where trackingState might be overwritten by service updates
  const effectiveState: TrackingState = {
    ...trackingState,
    status: isCountingDown ? 'countdown' : trackingState.status,
  };

  return {
    trackingState: effectiveState,
    formattedMetrics,
    countdownSeconds,
    isCountingDown,
    startCountdown,
    cancelCountdown,
    pause,
    resume,
    stop,
    discard,
    checkReadiness,
    resetToIdle,
  };
}

// ==================== UTILITY EXPORTS ====================
// Re-export formatting functions from sportMetrics utility

export {
  formatDuration,
  formatDistance,
  formatSpeed,
  formatElevation,
  formatStandardPace,
  formatSportSpecificPace,
} from '../utils/sportMetrics';
