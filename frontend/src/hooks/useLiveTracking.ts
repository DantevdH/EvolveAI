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

// ==================== CONSTANTS ====================

const COUNTDOWN_SECONDS = 3;

// ==================== UNIT CONVERSION ====================

/**
 * Format duration in seconds to "MM:SS" or "H:MM:SS"
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace in seconds per km to "M:SS /km" or "/mi"
 */
function formatPace(secondsPerKm: number | null, useMetric: boolean): string {
  if (secondsPerKm === null || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return '--:-- ' + (useMetric ? '/km' : '/mi');
  }

  // Convert to seconds per mile if imperial
  const paceSeconds = useMetric ? secondsPerKm : secondsPerKm * 1.60934;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} ${useMetric ? '/km' : '/mi'}`;
}

/**
 * Format distance in meters to "X.XX km" or "X.XX mi"
 */
function formatDistance(meters: number, useMetric: boolean): string {
  if (meters < 0) return useMetric ? '0.00 km' : '0.00 mi';

  if (useMetric) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  } else {
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  }
}

/**
 * Format speed in km/h to "X.X km/h" or "X.X mph"
 */
function formatSpeed(kmh: number | null, useMetric: boolean): string {
  if (kmh === null || kmh < 0) return useMetric ? '0.0 km/h' : '0.0 mph';

  if (useMetric) {
    return `${kmh.toFixed(1)} km/h`;
  } else {
    const mph = kmh / 1.60934;
    return `${mph.toFixed(1)} mph`;
  }
}

/**
 * Format elevation in meters to "+X m" or "+X ft"
 */
function formatElevation(meters: number, useMetric: boolean, prefix: '+' | '-' = '+'): string {
  if (useMetric) {
    return `${prefix}${Math.round(meters)} m`;
  } else {
    const feet = meters * 3.28084;
    return `${prefix}${Math.round(feet)} ft`;
  }
}

// ==================== HOOK ====================

export function useLiveTracking(): UseLiveTrackingReturn {
  // Get user's metric preference
  const { userProfile } = useUserProfile();
  const useMetric = userProfile?.useMetric ?? true;

  // Tracking state from service
  const [trackingState, setTrackingState] = useState<TrackingState>(
    LiveTrackingService.getState()
  );

  // Countdown state
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStartRef = useRef<{ sessionId: string; sportType: string } | null>(null);

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

  // Format metrics based on current state and unit preference
  const formattedMetrics: FormattedWorkoutMetrics = useMemo(() => {
    return {
      duration: formatDuration(trackingState.elapsedSeconds),
      distance: formatDistance(trackingState.distanceMeters, useMetric),
      averagePace: formatPace(trackingState.averagePaceSecondsPerKm, useMetric),
      currentPace: formatPace(trackingState.currentPaceSecondsPerKm, useMetric),
      averageSpeed: formatSpeed(trackingState.averageSpeedKmh, useMetric),
      elevationGain: formatElevation(trackingState.elevationGainMeters, useMetric, '+'),
      elevationLoss: formatElevation(trackingState.elevationLossMeters, useMetric, '-'),
      heartRate: null, // Not tracked in live mode (per decision)
      calories: null,  // Will be calculated at end
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
    pendingStartRef.current = null;

    // Reset local state
    setTrackingState((s) => ({
      ...s,
      status: 'idle',
      enduranceSessionId: null,
      sportType: null,
      error: null,
    }));

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
    if (countdownIntervalRef.current) {
      logger.warn('Countdown already in progress');
      return;
    }

    // Store pending start info
    pendingStartRef.current = { sessionId, sportType };

    // Update state to countdown
    setTrackingState((prev) => ({
      ...prev,
      status: 'countdown',
      enduranceSessionId: sessionId,
      sportType,
      error: null,
    }));

    setCountdownSeconds(COUNTDOWN_SECONDS);

    // Start countdown - SINGLE source of truth
    // Flow: Show 3 for 1s → Show 2 for 1s → Show 1 for 1s → Start tracking
    countdownIntervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        const nextValue = prev - 1;

        if (nextValue <= 0) {
          // Countdown complete - clear interval
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Start actual tracking OUTSIDE of state updater to avoid async issues
          // Use setTimeout(0) to escape the state updater context
          setTimeout(() => {
            if (pendingStartRef.current) {
              const { sessionId: id, sportType: type } = pendingStartRef.current;
              pendingStartRef.current = null;

              LiveTrackingService.startTracking(id, type).catch(async (error) => {
                logger.error('Failed to start tracking', error);

                // Reset BOTH local state AND service state on error
                setTrackingState((s) => ({
                  ...s,
                  status: 'idle',
                  error: error.message,
                }));

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
        return nextValue;
      });
    }, 1000);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    pendingStartRef.current = null;
    setCountdownSeconds(0);
    setTrackingState((prev) => ({
      ...prev,
      status: 'idle',
      enduranceSessionId: null,
      sportType: null,
    }));
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

  // Override status if in countdown
  const effectiveState: TrackingState = {
    ...trackingState,
    status: countdownSeconds > 0 ? 'countdown' : trackingState.status,
  };

  return {
    trackingState: effectiveState,
    formattedMetrics,
    countdownSeconds,
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

export { formatDuration, formatPace, formatDistance, formatSpeed, formatElevation };
