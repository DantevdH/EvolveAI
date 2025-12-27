/**
 * LiveTrackingScreen - Full-screen GPS workout tracking
 *
 * A Strava-like workout tracking experience with:
 * - 3-second countdown before start
 * - Real-time metrics display
 * - Pause/Resume/Stop controls
 * - Post-workout summary
 * - Background tracking support
 * - Multi-segment interval workouts with auto-advance
 *
 * Presented as a full-screen modal that can't be dismissed accidentally.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  BackHandler,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { EnduranceSession, getSegmentDisplayName, expandSegmentsForTracking } from '../types/training';
import {
  TrackedWorkoutMetrics,
  FormattedWorkoutMetrics,
  SegmentTrackingMetrics,
} from '../types/liveTracking';
import { useLiveTracking, formatDuration, formatDistance, formatStandardPace, formatSpeed, formatElevation } from '../hooks/useLiveTracking';
import { useUserProfile } from '../hooks/useUserProfile';
import { TrackingMetrics } from '../components/liveTracking/TrackingMetrics';
import { TrackingControls } from '../components/liveTracking/TrackingControls';
import { CountdownOverlay } from '../components/liveTracking/CountdownOverlay';
import { TrackingSummary } from '../components/liveTracking/TrackingSummary';
import { EnduranceSegmentCard } from '../components/training/exerciseRow/EnduranceSegmentCard';
import { colors, spacing, typography, borderRadius } from '../constants/designSystem';
import { createColorWithOpacity } from '../constants/colors';
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
    isCountingDown,
    startCountdown,
    cancelCountdown,
    pause,
    resume,
    stop,
    discard,
    checkReadiness,
    // Segment tracking
    currentSegment,
    currentSegmentIndex,
    totalSegments,
    isMultiSegment,
    skipToNextSegment,
    toggleAutoAdvance,
  } = useLiveTracking();

  // Extract segment tracking state for convenience
  const segmentTracking = trackingState.segmentTracking;
  const isAutoAdvanceEnabled = segmentTracking?.isAutoAdvanceEnabled ?? true;
  const transitionCountdown = segmentTracking?.transitionCountdown ?? 0;
  const allSegments = segmentTracking?.segments ?? [];

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
      if (isCountingDown) {
        cancelCountdown();
      }
    };
  }, [isCountingDown, cancelCountdown]);

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

    // Expand segments with repeat_count > 1 for tracking
    // This converts compact definitions like "4x1km" into individual trackable segments
    const expandedSegments = enduranceSession.segments
      ? expandSegmentsForTracking(enduranceSession.segments)
      : undefined;

    // Use the hook's single source of truth for countdown
    startCountdown(
      enduranceSession.id,
      enduranceSession.sportType,
      expandedSegments
    );
  };

  const handleCancelCountdown = () => {
    cancelCountdown();
    onDismiss();
  };

  const handleBackPress = () => {
    if (isCountingDown) {
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
      trackingState.status === 'auto_paused' ||
      trackingState.status === 'segment_transition'
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
        averagePace: formatStandardPace(completedMetrics.averagePace, useMetric),
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

  // Countdown overlay - use isCountingDown as the authoritative source
  // This is a dedicated boolean flag that avoids race conditions with service state updates
  if (isCountingDown) {
    // Show the current countdown number, or 1 as fallback during transition
    const displaySeconds = countdownSeconds > 0 ? countdownSeconds : 1;
    return (
      <>
        <StatusBar barStyle="light-content" />
        <CountdownOverlay
          seconds={displaySeconds}
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

  // Segment transition countdown overlay
  if (trackingState.status === 'segment_transition' && transitionCountdown > 0) {
    const nextSegmentIndex = currentSegmentIndex + 1;
    const nextSegment = allSegments[nextSegmentIndex];
    const nextSegmentName = nextSegment
      ? getSegmentDisplayName(
          {
            id: nextSegment.segmentId,
            segmentOrder: nextSegment.segmentOrder,
            segmentType: nextSegment.segmentType,
            targetType: nextSegment.targetType,
            targetValue: nextSegment.targetValue ?? undefined,
            targetHeartRateZone: nextSegment.targetHeartRateZone ?? undefined,
          },
          enduranceSession.segments || []
        )
      : 'Next Segment';

    return (
      <View style={[styles.transitionContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.transitionContent}>
          <Text style={styles.transitionLabel}>Next Up</Text>
          <Text style={styles.transitionSegmentName}>{nextSegmentName}</Text>
          <Text style={styles.transitionCountdown}>{transitionCountdown}</Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipToNextSegment}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active tracking screen
  const isPaused =
    trackingState.status === 'paused' || trackingState.status === 'auto_paused';

  // Convert SegmentTrackingMetrics to EnduranceSegment format for display
  const segmentsForDisplay = allSegments.map((seg) => ({
    id: seg.segmentId,
    segmentOrder: seg.segmentOrder,
    segmentType: seg.segmentType,
    targetType: seg.targetType,
    targetValue: seg.targetValue ?? undefined,
    targetHeartRateZone: seg.targetHeartRateZone ?? undefined,
    actualDuration: seg.actualDuration,
    actualDistance: seg.actualDistance,
    actualAvgHeartRate: seg.actualAvgHeartRate ?? undefined,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Segment Progress Header (for multi-segment workouts) */}
      {isMultiSegment && currentSegment && (
        <View style={styles.segmentHeader}>
          <View style={styles.segmentHeaderTop}>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentLabel}>
                Segment {currentSegmentIndex + 1} of {totalSegments}
              </Text>
              <Text style={styles.currentSegmentName}>
                {getSegmentDisplayName(
                  {
                    id: currentSegment.segmentId,
                    segmentOrder: currentSegment.segmentOrder,
                    segmentType: currentSegment.segmentType,
                    targetType: currentSegment.targetType,
                    targetValue: currentSegment.targetValue ?? undefined,
                    targetHeartRateZone: currentSegment.targetHeartRateZone ?? undefined,
                  },
                  enduranceSession.segments || []
                )}
              </Text>
            </View>
            <View style={styles.segmentControls}>
              <TouchableOpacity
                style={[
                  styles.autoAdvanceButton,
                  !isAutoAdvanceEnabled && styles.autoAdvanceButtonDisabled,
                ]}
                onPress={toggleAutoAdvance}
              >
                <Ionicons
                  name={isAutoAdvanceEnabled ? 'play-forward' : 'play-forward-outline'}
                  size={16}
                  color={isAutoAdvanceEnabled ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.autoAdvanceText,
                    !isAutoAdvanceEnabled && styles.autoAdvanceTextDisabled,
                  ]}
                >
                  Auto
                </Text>
              </TouchableOpacity>
              {currentSegmentIndex + 1 < totalSegments && (
                <TouchableOpacity
                  style={styles.skipSegmentButton}
                  onPress={skipToNextSegment}
                >
                  <Ionicons name="play-skip-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Segment Progress Bar */}
          {currentSegment.targetValue && currentSegment.targetType !== 'open' && (
            <View style={styles.segmentProgressContainer}>
              <View style={styles.segmentProgressBar}>
                <View
                  style={[
                    styles.segmentProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        ((currentSegment.targetType === 'time'
                          ? currentSegment.actualDuration
                          : currentSegment.actualDistance) /
                          currentSegment.targetValue) *
                          100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.segmentProgressText}>
                {currentSegment.targetType === 'time'
                  ? `${formatDuration(currentSegment.actualDuration)} / ${formatDuration(currentSegment.targetValue)}`
                  : `${(currentSegment.actualDistance / 1000).toFixed(2)} / ${(currentSegment.targetValue / 1000).toFixed(2)} km`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Metrics Display */}
      <View style={styles.metricsContainer}>
        <TrackingMetrics
          metrics={formattedMetrics}
          sportType={enduranceSession.sportType}
          gpsSignal={trackingState.gpsSignal}
          isPaused={isPaused}
        />
      </View>

      {/* Segment List (collapsed, scrollable) */}
      {isMultiSegment && (
        <View style={styles.segmentListContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentListContent}
          >
            {segmentsForDisplay.map((seg, idx) => (
              <View key={seg.id} style={styles.segmentCardWrapper}>
                <EnduranceSegmentCard
                  segment={seg}
                  allSegments={enduranceSession.segments || []}
                  useMetric={useMetric}
                  isCompleted={idx < currentSegmentIndex}
                  isActive={idx === currentSegmentIndex}
                  showActuals={idx <= currentSegmentIndex}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom }]}>
        <TrackingControls
          status={trackingState.status}
          gpsSignal={trackingState.gpsSignal}
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

  // Segment Header
  segmentHeader: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentInfo: {
    flex: 1,
  },
  segmentLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    marginBottom: 2,
  },
  currentSegmentName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  segmentControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  autoAdvanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
  },
  autoAdvanceButtonDisabled: {
    backgroundColor: createColorWithOpacity(colors.muted, 0.1),
  },
  autoAdvanceText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.primary,
  },
  autoAdvanceTextDisabled: {
    color: colors.muted,
  },
  skipSegmentButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
  },

  // Segment Progress Bar
  segmentProgressContainer: {
    marginTop: spacing.sm,
  },
  segmentProgressBar: {
    height: 6,
    backgroundColor: createColorWithOpacity(colors.muted, 0.2),
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  segmentProgressText: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // Segment List
  segmentListContainer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  segmentListContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  segmentCardWrapper: {
    width: 180,
  },

  // Transition Overlay
  transitionContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionContent: {
    alignItems: 'center',
  },
  transitionLabel: {
    fontSize: typography.fontSizes.lg,
    color: createColorWithOpacity('#FFFFFF', 0.8),
    marginBottom: spacing.sm,
  },
  transitionSegmentName: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  transitionCountdown: {
    fontSize: 120,
    fontWeight: typography.fontWeights.bold as any,
    color: '#FFFFFF',
    lineHeight: 140,
  },
  skipButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: createColorWithOpacity('#FFFFFF', 0.2),
  },
  skipButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: '#FFFFFF',
  },
});
