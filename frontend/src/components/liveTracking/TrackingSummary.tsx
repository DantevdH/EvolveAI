/**
 * TrackingSummary - Post-workout summary screen
 *
 * Sport-specific summary display:
 * - Main metric: Pace/Speed/Time based on sport type
 * - Secondary metrics: Sport-relevant metrics + health data if available
 *
 * Key features:
 * - Shows HR and calories only if available (from health app import)
 * - Shows elevation only for relevant sports (or if imported from health app)
 * - Swimming shows pace as /100m, Rowing as /500m
 * - Cycling shows speed instead of pace
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
import {
  getMainMetric,
  getSecondaryMetricsForSummary,
  formatSportNameShort,
  getMetricDisplayInfo,
  MetricKey,
} from '../../utils/sportMetrics';

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
  const mainMetricType = getMainMetric(sportType);

  // Determine what data is available
  const hasHeartRate = metrics.averageHeartRate !== null && metrics.averageHeartRate > 0;
  const hasCalories = metrics.calories !== null && metrics.calories > 0;
  const hasElevation =
    (metrics.elevationGain !== null && metrics.elevationGain > 0) ||
    (metrics.elevationLoss !== null && Math.abs(metrics.elevationLoss || 0) > 0);

  const secondaryMetrics = getSecondaryMetricsForSummary(
    sportType,
    hasHeartRate,
    hasCalories,
    hasElevation
  );

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

  // Get main metric display based on sport type
  const getMainMetricDisplay = (): { value: string; label: string } => {
    switch (mainMetricType) {
      case 'pace':
        return { value: formattedMetrics.averagePace, label: 'Avg Pace' };
      case 'speed':
        return { value: formattedMetrics.averageSpeed, label: 'Avg Speed' };
      case 'time':
        return { value: formattedMetrics.duration, label: 'Duration' };
    }
  };

  // Get secondary metric value by key
  const getSecondaryMetricValue = (key: MetricKey): string | null => {
    switch (key) {
      case 'duration':
        return formattedMetrics.duration;
      case 'distance':
        return formattedMetrics.distance;
      case 'elevation':
        return formattedMetrics.elevationGain;
      case 'pace':
        return formattedMetrics.averagePace;
      case 'speed':
        return formattedMetrics.averageSpeed;
      case 'heartRate':
        return metrics.averageHeartRate ? `${metrics.averageHeartRate} bpm` : null;
      case 'calories':
        return metrics.calories ? `${metrics.calories} kcal` : null;
      default:
        return null;
    }
  };

  const mainMetricDisplay = getMainMetricDisplay();

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
          <Text style={styles.title}>{formatSportNameShort(sportType)}</Text>
          <Text style={styles.date}>{formatDate(metrics.startedAt)}</Text>
          <Text style={styles.timeRange}>
            {formatTimeRange(metrics.startedAt, metrics.completedAt)}
          </Text>
        </View>

        {/* Primary Stats - Main Metric + Distance (if applicable) */}
        <View style={styles.primaryStats}>
          {/* Main metric (pace/speed/time based on sport) */}
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>{mainMetricDisplay.value}</Text>
            <Text style={styles.primaryStatLabel}>{mainMetricDisplay.label}</Text>
          </View>

          {/* Show distance for sports that track it */}
          {mainMetricType !== 'time' && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.primaryStatItem}>
                <Text style={styles.primaryStatValue}>{formattedMetrics.distance}</Text>
                <Text style={styles.primaryStatLabel}>Distance</Text>
              </View>
            </>
          )}

          {/* For time-only sports, show duration prominently (already shown as main) */}
          {mainMetricType === 'time' && metrics.actualDistance > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.primaryStatItem}>
                <Text style={styles.primaryStatValue}>{formattedMetrics.distance}</Text>
                <Text style={styles.primaryStatLabel}>Distance</Text>
              </View>
            </>
          )}
        </View>

        {/* Secondary Stats Grid */}
        {secondaryMetrics.length > 0 && (
          <View style={styles.statsGrid}>
            {secondaryMetrics.map((metricKey) => {
              // Skip metrics already shown in primary stats
              if (metricKey === 'distance') return null;
              if (metricKey === 'duration' && mainMetricType === 'time') return null;

              const value = getSecondaryMetricValue(metricKey);
              if (!value) return null;

              const info = getMetricDisplayInfo(metricKey);

              return (
                <StatCard
                  key={metricKey}
                  icon={info.icon}
                  label={info.label}
                  value={value}
                />
              );
            })}

            {/* Always show elevation loss if we have elevation gain */}
            {hasElevation && formattedMetrics.elevationLoss && (
              <StatCard
                icon="trending-down-outline"
                label="Elevation Loss"
                value={formattedMetrics.elevationLoss}
              />
            )}
          </View>
        )}

        {/* Data Source Badge */}
        <View style={styles.sourceBadge}>
          <Ionicons name="location" size={14} color={colors.success} />
          <Text style={styles.sourceText}>
            {metrics.dataSource === 'live_tracking'
              ? 'Tracked with GPS'
              : metrics.dataSource === 'healthkit'
                ? 'Imported from Apple Health'
                : metrics.dataSource === 'google_fit'
                  ? 'Imported from Google Fit'
                  : 'Manual entry'}
          </Text>
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
