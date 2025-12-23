/**
 * TrackingControls - Workout control buttons
 *
 * Provides large, accessible buttons for:
 * - Pause/Resume tracking
 * - Stop tracking (with confirmation)
 * - Discard workout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrackingStatus } from '../../types/liveTracking';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';

interface TrackingControlsProps {
  status: TrackingStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export const TrackingControls: React.FC<TrackingControlsProps> = ({
  status,
  onPause,
  onResume,
  onStop,
  onDiscard,
}) => {
  const [isStopPressed, setIsStopPressed] = useState(false);

  const isPaused = status === 'paused' || status === 'auto_paused';
  const isTracking = status === 'tracking';
  const isStopping = status === 'stopping';

  const handleStopPress = () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: onStop,
        },
      ],
      { cancelable: true }
    );
  };

  const handleDiscardPress = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout? All data will be lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: onDiscard,
        },
      ],
      { cancelable: true }
    );
  };

  if (isStopping) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Processing workout...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Controls Row */}
      <View style={styles.mainControls}>
        {/* Discard Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleDiscardPress}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>

        {/* Pause/Resume Button (Primary) */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isPaused && styles.resumeButton,
          ]}
          onPress={isPaused ? onResume : onPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={40}
            color={colors.card}
          />
        </TouchableOpacity>

        {/* Stop Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleStopPress}
          onPressIn={() => setIsStopPressed(true)}
          onPressOut={() => setIsStopPressed(false)}
          activeOpacity={0.7}
        >
          <Ionicons name="stop" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Control Labels */}
      <View style={styles.labelRow}>
        <Text style={styles.buttonLabel}>Discard</Text>
        <Text style={styles.buttonLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
        <Text style={styles.buttonLabel}>Finish</Text>
      </View>

      {/* Auto-pause indicator */}
      {status === 'auto_paused' && (
        <View style={styles.autoPauseNotice}>
          <Ionicons name="pause-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.autoPauseText}>
            Auto-paused - Start moving to resume
          </Text>
        </View>
      )}
    </View>
  );
};

const BUTTON_SIZE = 80;
const SECONDARY_BUTTON_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  primaryButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  resumeButton: {
    backgroundColor: colors.success,
  },
  secondaryButton: {
    width: SECONDARY_BUTTON_SIZE,
    height: SECONDARY_BUTTON_SIZE,
    borderRadius: SECONDARY_BUTTON_SIZE / 2,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xxxl + spacing.xl,
  },
  buttonLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    textAlign: 'center',
    minWidth: SECONDARY_BUTTON_SIZE,
  },
  autoPauseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
  },
  autoPauseText: {
    fontSize: typography.fontSizes.sm,
    color: colors.warning,
    fontWeight: typography.fontWeights.medium as any,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    color: colors.muted,
    marginTop: spacing.md,
  },
});
