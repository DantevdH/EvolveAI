/**
 * LiveTrackingScreen - Full-screen GPS workout tracking
 *
 * A Strava-like workout tracking experience with:
 * - 3-second countdown before start
 * - Real-time metrics display
 * - Pause/Resume/Stop controls
 * - Post-workout summary
 * - Background tracking support
 *
 * Presented as a full-screen modal that can't be dismissed accidentally.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { EnduranceSession } from '../types/training';
import {
  TrackedWorkoutMetrics,
  FormattedWorkoutMetrics,
} from '../types/liveTracking';
import { useLiveTracking, formatDuration, formatDistance, formatPace, formatSpeed, formatElevation } from '../hooks/useLiveTracking';
import { useUserProfile } from '../hooks/useUserProfile';
import { TrackingMetrics } from '../components/liveTracking/TrackingMetrics';
import { TrackingControls } from '../components/liveTracking/TrackingControls';
import { CountdownOverlay } from '../components/liveTracking/CountdownOverlay';
import { TrackingSummary } from '../components/liveTracking/TrackingSummary';
import { colors } from '../constants/designSystem';
import { logger } from '../utils/logger';

interface LiveTrackingScreenProps {
  enduranceSession: EnduranceSession;
  onComplete: (metrics: TrackedWorkoutMetrics) => void;
  onDismiss: () => void;
}

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  enduranceSession,
  onComplete,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useUserProfile();
  const useMetric = userProfile?.useMetric ?? true;

  const {
    trackingState,
    formattedMetrics,
    countdownSeconds,
    startCountdown,
    cancelCountdown,
    pause,
    resume,
    stop,
    discard,
    checkReadiness,
  } = useLiveTracking();

  // Local state
  const [completedMetrics, setCompletedMetrics] = useState<TrackedWorkoutMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStartedCountdown, setHasStartedCountdown] = useState(false);

  // ==================== LIFECYCLE ====================

  // Keep screen awake during tracking
  useEffect(() => {
    activateKeepAwakeAsync('live-tracking');

    return () => {
      deactivateKeepAwake('live-tracking');
    };
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [trackingState.status]);

  // Cleanup on unmount - cancel countdown if in progress
  useEffect(() => {
    return () => {
      // If screen unmounts during countdown, cancel it to prevent orphaned timers
      if (countdownSeconds > 0) {
        cancelCountdown();
      }
    };
  }, [countdownSeconds, cancelCountdown]);

  // Auto-start countdown when screen mounts
  useEffect(() => {
    startWorkoutWithChecks();
  }, []);

  // ==================== HANDLERS ====================

  const startWorkoutWithChecks = async () => {
    try {
      const readiness = await checkReadiness();

      if (!readiness.ready) {
        // Show warning but allow user to proceed
        const issues = readiness.issues.join('\n');
        Alert.alert(
          'Before You Start',
          `${issues}\n\nDo you want to continue anyway?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: onDismiss,
            },
            {
              text: 'Start Anyway',
              onPress: () => beginCountdown(),
            },
          ]
        );
      } else {
        beginCountdown();
      }
    } catch (error) {
      logger.error('Readiness check failed', error);
      beginCountdown(); // Proceed anyway
    }
  };

  const beginCountdown = () => {
    // Prevent double-start
    if (hasStartedCountdown) return;
    setHasStartedCountdown(true);

    // Use the hook's single source of truth for countdown
    startCountdown(enduranceSession.id, enduranceSession.sportType);
  };

  const handleCancelCountdown = () => {
    cancelCountdown();
    onDismiss();
  };

  const handleBackPress = () => {
    if (countdownSeconds > 0) {
      handleCancelCountdown();
      return;
    }

    if (trackingState.status === 'summary') {
      // On summary screen, confirm discard
      Alert.alert(
        'Discard Workout?',
        'Are you sure you want to discard this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: handleDiscard,
          },
        ]
      );
      return;
    }

    if (
      trackingState.status === 'tracking' ||
      trackingState.status === 'paused' ||
      trackingState.status === 'auto_paused'
    ) {
      // Confirm before discarding active tracking
      Alert.alert(
        'Stop Workout?',
        'Do you want to stop and save your workout, or discard it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: handleDiscard,
          },
          {
            text: 'Save',
            onPress: handleStop,
          },
        ]
      );
    }
  };

  const handlePause = () => {
    pause();
  };

  const handleResume = () => {
    resume();
  };

  const handleStop = async () => {
    try {
      const metrics = await stop();
      setCompletedMetrics(metrics);
    } catch (error) {
      logger.error('Failed to stop tracking', error);
      Alert.alert('Error', 'Failed to stop tracking. Please try again.');
    }
  };

  const handleDiscard = async () => {
    try {
      await discard();
      onDismiss();
    } catch (error) {
      logger.error('Failed to discard tracking', error);
      onDismiss();
    }
  };

  const handleSave = async () => {
    if (!completedMetrics) return;

    setIsSaving(true);
    try {
      await onComplete(completedMetrics);
    } catch (error) {
      logger.error('Failed to save workout', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDiscardFromSummary = () => {
    Alert.alert(
      'Discard Workout?',
      'Are you sure you want to discard this workout? All data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: handleDiscard,
        },
      ]
    );
  };

  // ==================== RENDER ====================

  // Format metrics for summary if we have completed metrics
  const summaryFormattedMetrics: FormattedWorkoutMetrics | null = completedMetrics
    ? {
        duration: formatDuration(completedMetrics.actualDuration),
        distance: formatDistance(completedMetrics.actualDistance, useMetric),
        averagePace: formatPace(completedMetrics.averagePace, useMetric),
        currentPace: null,
        averageSpeed: formatSpeed(completedMetrics.averageSpeed, useMetric),
        elevationGain: formatElevation(completedMetrics.elevationGain || 0, useMetric, '+'),
        elevationLoss: formatElevation(completedMetrics.elevationLoss || 0, useMetric, '-'),
        heartRate: completedMetrics.averageHeartRate
          ? `${completedMetrics.averageHeartRate} bpm`
          : null,
        calories: completedMetrics.calories ? `${completedMetrics.calories} kcal` : null,
        cadence: null,
      }
    : null;

  // Countdown overlay
  if (countdownSeconds > 0) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <CountdownOverlay
          seconds={countdownSeconds}
          sportType={enduranceSession.sportType}
          onCancel={handleCancelCountdown}
        />
      </>
    );
  }

  // Summary screen
  if (trackingState.status === 'summary' && completedMetrics && summaryFormattedMetrics) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <TrackingSummary
          metrics={completedMetrics}
          formattedMetrics={summaryFormattedMetrics}
          sportType={enduranceSession.sportType}
          onSave={handleSave}
          onDiscard={handleDiscardFromSummary}
          isSaving={isSaving}
        />
      </View>
    );
  }

  // Active tracking screen
  const isPaused =
    trackingState.status === 'paused' || trackingState.status === 'auto_paused';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Metrics Display */}
      <View style={styles.metricsContainer}>
        <TrackingMetrics
          metrics={formattedMetrics}
          sportType={enduranceSession.sportType}
          gpsSignal={trackingState.gpsSignal}
          isPaused={isPaused}
        />
      </View>

      {/* Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom }]}>
        <TrackingControls
          status={trackingState.status}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onDiscard={handleDiscard}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  metricsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  controlsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: 16,
  },
});
