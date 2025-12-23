/**
 * EnduranceTrackingActions - Action buttons for endurance sessions
 *
 * Shows "Start Tracking" and "Import from Health" buttons for untracked sessions.
 * Hidden when session is already tracked or completed with data.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnduranceSession } from '../../../types/training';
import { colors, spacing, typography, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';

interface EnduranceTrackingActionsProps {
  enduranceSession: EnduranceSession;
  onStartTracking: () => void;
  onImportFromHealth: () => void;
  isLocked?: boolean;
}

export const EnduranceTrackingActions: React.FC<EnduranceTrackingActionsProps> = ({
  enduranceSession,
  onStartTracking,
  onImportFromHealth,
  isLocked = false,
}) => {
  // Don't show actions if session already has tracked data
  const hasTrackedData = !!(
    enduranceSession.actualDuration ||
    enduranceSession.actualDistance ||
    enduranceSession.dataSource
  );

  // Don't show if locked
  if (isLocked || hasTrackedData) {
    return null;
  }

  const healthLabel = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <View style={styles.container}>
      {/* Start Tracking Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onStartTracking}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={18} color={colors.card} />
        <Text style={styles.primaryButtonText}>Start Tracking</Text>
      </TouchableOpacity>

      {/* Import from Health Button */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onImportFromHealth}
        activeOpacity={0.7}
      >
        <Ionicons name="download-outline" size={16} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Import from {healthLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primaryButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.card,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.primary,
  },
});

export default EnduranceTrackingActions;
