/**
 * TrackingSummary - Post-workout summary screen
 *
 * Shows workout metrics after tracking ends.
 * Allows user to save or discard the workout.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrackedWorkoutMetrics, FormattedWorkoutMetrics } from '../../types/liveTracking';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';
import { SPORT_ICONS } from '../../constants/sportIcons';

interface TrackingSummaryProps {
  metrics: TrackedWorkoutMetrics;
  formattedMetrics: FormattedWorkoutMetrics;
  sportType: string;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}

export const TrackingSummary: React.FC<TrackingSummaryProps> = ({
  metrics,
  formattedMetrics,
  sportType,
  onSave,
  onDiscard,
  isSaving,
}) => {
  const sportIcon = SPORT_ICONS[sportType] || SPORT_ICONS.other;

  const formatSportName = (type: string): string => {
    const names: Record<string, string> = {
      running: 'Run',
      cycling: 'Ride',
      swimming: 'Swim',
      rowing: 'Row',
      hiking: 'Hike',
      walking: 'Walk',
      elliptical: 'Elliptical Session',
      stair_climbing: 'Stair Climb',
      jump_rope: 'Jump Rope Session',
      other: 'Workout',
    };
    return names[type] || 'Workout';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeRange = (start: Date, end: Date): string => {
    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={sportIcon} size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{formatSportName(sportType)}</Text>
          <Text style={styles.date}>{formatDate(metrics.startedAt)}</Text>
          <Text style={styles.timeRange}>
            {formatTimeRange(metrics.startedAt, metrics.completedAt)}
          </Text>
        </View>

        {/* Primary Stats */}
        <View style={styles.primaryStats}>
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>{formattedMetrics.duration}</Text>
            <Text style={styles.primaryStatLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>{formattedMetrics.distance}</Text>
            <Text style={styles.primaryStatLabel}>Distance</Text>
          </View>
        </View>

        {/* Secondary Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="speedometer-outline"
            label="Avg Pace"
            value={formattedMetrics.averagePace}
          />
          <StatCard
            icon="flash-outline"
            label="Avg Speed"
            value={formattedMetrics.averageSpeed}
          />
          <StatCard
            icon="trending-up-outline"
            label="Elevation Gain"
            value={formattedMetrics.elevationGain}
          />
          <StatCard
            icon="trending-down-outline"
            label="Elevation Loss"
            value={formattedMetrics.elevationLoss}
          />
          {metrics.calories && (
            <StatCard
              icon="flame-outline"
              label="Calories"
              value={`${metrics.calories} kcal`}
            />
          )}
        </View>

        {/* Data Source Badge */}
        <View style={styles.sourceBadge}>
          <Ionicons name="location" size={14} color={colors.success} />
          <Text style={styles.sourceText}>Tracked with GPS</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={onDiscard}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={colors.card} />
              <Text style={styles.saveButtonText}>Save Workout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ==================== STAT CARD COMPONENT ====================

interface StatCardProps {
  icon: string;
  label: string;
  value: string | null;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => {
  if (!value) return null;

  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={colors.muted} />
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTransparentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.text,
  },
  timeRange: {
    fontSize: typography.fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  primaryStats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  primaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  primaryStatLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statCardValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  statCardLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sourceText: {
    fontSize: typography.fontSizes.sm,
    color: colors.success,
    fontWeight: typography.fontWeights.medium as any,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  discardButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  discardButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  saveButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.card,
  },
});
