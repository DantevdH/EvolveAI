/**
 * HealthImportModal - Import workouts from HealthKit/Google Fit
 *
 * Shows a list of workouts from the user's health app for the selected date.
 * User can select a workout to import its metrics into the endurance session.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EnduranceSession } from '../../types/training';
import { HealthWorkout, TrackedWorkoutMetrics } from '../../types/liveTracking';
import {
  useHealthImport,
  formatWorkoutDuration,
  formatWorkoutTime,
  getSportTypeDisplayName,
} from '../../hooks/useHealthImport';
import { useUserProfile } from '../../hooks/useUserProfile';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';
import { SPORT_ICONS } from '../../constants/sportIcons';

interface HealthImportModalProps {
  visible: boolean;
  enduranceSession: EnduranceSession;
  onImport: (metrics: TrackedWorkoutMetrics) => void;
  onClose: () => void;
}

export const HealthImportModal: React.FC<HealthImportModalProps> = ({
  visible,
  enduranceSession,
  onImport,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useUserProfile();
  const useMetric = userProfile?.useMetric ?? true;

  const {
    importState,
    loadWorkouts,
    selectWorkout,
    importSelected,
    isAvailable,
  } = useHealthImport();

  // Load workouts when modal opens
  useEffect(() => {
    if (visible) {
      loadWorkouts(new Date());
    }
  }, [visible, loadWorkouts]);

  const handleImport = useCallback(async () => {
    const metrics = await importSelected();
    if (metrics) {
      onImport(metrics);
    }
  }, [importSelected, onImport]);

  const formatDistance = (meters: number | null): string => {
    if (!meters) return '--';
    if (useMetric) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${(meters / 1609.34).toFixed(2)} mi`;
  };

  const renderWorkoutItem = ({ item }: { item: HealthWorkout }) => {
    const isSelected = importState.selectedWorkoutId === item.id;
    const sportIcon = SPORT_ICONS[item.sportType] || SPORT_ICONS.other;
    const isMatchingSport = item.sportType === enduranceSession.sportType;

    return (
      <TouchableOpacity
        style={[
          styles.workoutCard,
          isSelected && styles.workoutCardSelected,
          isMatchingSport && styles.workoutCardMatching,
        ]}
        onPress={() => selectWorkout(item.id)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.workoutIcon,
            isSelected && styles.workoutIconSelected,
          ]}
        >
          <Ionicons
            name={sportIcon}
            size={24}
            color={isSelected ? colors.card : colors.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.workoutContent}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutType}>
              {getSportTypeDisplayName(item.sportType)}
            </Text>
            <Text style={styles.workoutTime}>{formatWorkoutTime(item.startDate)}</Text>
          </View>

          <View style={styles.workoutStats}>
            <View style={styles.workoutStat}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={styles.workoutStatText}>
                {formatWorkoutDuration(item.duration)}
              </Text>
            </View>

            {item.distance && (
              <View style={styles.workoutStat}>
                <Ionicons name="navigate-outline" size={14} color={colors.muted} />
                <Text style={styles.workoutStatText}>
                  {formatDistance(item.distance)}
                </Text>
              </View>
            )}

            {item.averageHeartRate && (
              <View style={styles.workoutStat}>
                <Ionicons name="heart-outline" size={14} color={colors.muted} />
                <Text style={styles.workoutStatText}>
                  {item.averageHeartRate} bpm
                </Text>
              </View>
            )}
          </View>

          {/* Source */}
          <Text style={styles.workoutSource}>{item.sourceName}</Text>
        </View>

        {/* Selection indicator */}
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (importState.isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyStateText}>Loading workouts...</Text>
        </View>
      );
    }

    if (importState.error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.emptyStateTitle}>Error Loading Workouts</Text>
          <Text style={styles.emptyStateText}>{importState.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadWorkouts(new Date())}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isAvailable) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyStateTitle}>
            {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} Not Available
          </Text>
          <Text style={styles.emptyStateText}>
            Please enable{' '}
            {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} access in
            Settings to import workouts.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyStateTitle}>No Workouts Found</Text>
        <Text style={styles.emptyStateText}>
          No workouts found in{' '}
          {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} for today.
          Complete a workout on your watch first.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Import Workout</Text>
            <Text style={styles.headerSubtitle}>
              Select a workout from{' '}
              {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <Ionicons
            name={SPORT_ICONS[enduranceSession.sportType] || SPORT_ICONS.other}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.sessionInfoText}>
            Looking for: {getSportTypeDisplayName(enduranceSession.sportType)}
          </Text>
        </View>

        {/* Workout List */}
        <FlatList
          data={importState.workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Import Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.importButton,
              !importState.selectedWorkoutId && styles.importButtonDisabled,
            ]}
            onPress={handleImport}
            disabled={!importState.selectedWorkoutId || importState.isLoading}
            activeOpacity={0.8}
          >
            {importState.isLoading ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color={colors.card} />
                <Text style={styles.importButtonText}>Import Selected</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryTransparentLight,
  },
  sessionInfoText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  workoutCardSelected: {
    borderColor: colors.primary,
  },
  workoutCardMatching: {
    backgroundColor: colors.primaryTransparentLight,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTransparentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  workoutIconSelected: {
    backgroundColor: colors.primary,
  },
  workoutContent: {
    flex: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  workoutType: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  workoutTime: {
    fontSize: typography.fontSizes.sm,
    color: colors.muted,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  workoutStatText: {
    fontSize: typography.fontSizes.sm,
    color: colors.muted,
  },
  workoutSource: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
  },
  selectionIndicator: {
    marginLeft: spacing.md,
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSizes.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.card,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  importButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  importButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.card,
  },
});
