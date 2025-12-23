/**
 * TrackingMetrics - Real-time workout metrics display
 *
 * Shows primary and secondary metrics during live tracking:
 * - Primary: Duration, Distance (large, centered)
 * - Secondary: Pace, Speed, Elevation (smaller, below)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormattedWorkoutMetrics, GPSSignalQuality } from '../../types/liveTracking';
import { colors, spacing, typography, borderRadius } from '../../constants/designSystem';
import { SPORT_ICONS } from '../../constants/sportIcons';

interface TrackingMetricsProps {
  metrics: FormattedWorkoutMetrics;
  sportType: string;
  gpsSignal: GPSSignalQuality;
  isPaused: boolean;
}

export const TrackingMetrics: React.FC<TrackingMetricsProps> = ({
  metrics,
  sportType,
  gpsSignal,
  isPaused,
}) => {
  const sportIcon = SPORT_ICONS[sportType] || SPORT_ICONS.other;

  const getGpsColor = () => {
    switch (gpsSignal.quality) {
      case 'excellent':
      case 'good':
        return colors.success;
      case 'fair':
        return colors.warning;
      case 'poor':
      case 'none':
        return colors.error;
    }
  };

  return (
    <View style={styles.container}>
      {/* GPS Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.gpsIndicator}>
          <Ionicons name="locate" size={16} color={getGpsColor()} />
          <Text style={[styles.gpsText, { color: getGpsColor() }]}>
            GPS {gpsSignal.quality === 'none' ? 'Unavailable' : gpsSignal.quality}
          </Text>
        </View>
        {isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </View>

      {/* Sport Type Header */}
      <View style={styles.sportHeader}>
        <Ionicons name={sportIcon} size={24} color={colors.primary} />
        <Text style={styles.sportName}>{formatSportName(sportType)}</Text>
      </View>

      {/* Primary Metrics */}
      <View style={styles.primaryMetrics}>
        {/* Duration */}
        <View style={styles.primaryMetricItem}>
          <Text style={styles.primaryValue}>{metrics.duration}</Text>
          <Text style={styles.primaryLabel}>Duration</Text>
        </View>

        {/* Divider */}
        <View style={styles.metricDivider} />

        {/* Distance */}
        <View style={styles.primaryMetricItem}>
          <Text style={styles.primaryValue}>{metrics.distance}</Text>
          <Text style={styles.primaryLabel}>Distance</Text>
        </View>
      </View>

      {/* Secondary Metrics */}
      <View style={styles.secondaryMetrics}>
        {/* Current Pace */}
        <View style={styles.secondaryMetricItem}>
          <Ionicons name="speedometer-outline" size={20} color={colors.muted} />
          <Text style={styles.secondaryValue}>{metrics.currentPace || '--:--'}</Text>
          <Text style={styles.secondaryLabel}>Current Pace</Text>
        </View>

        {/* Average Pace */}
        <View style={styles.secondaryMetricItem}>
          <Ionicons name="analytics-outline" size={20} color={colors.muted} />
          <Text style={styles.secondaryValue}>{metrics.averagePace}</Text>
          <Text style={styles.secondaryLabel}>Avg Pace</Text>
        </View>

        {/* Elevation */}
        <View style={styles.secondaryMetricItem}>
          <Ionicons name="trending-up-outline" size={20} color={colors.muted} />
          <Text style={styles.secondaryValue}>{metrics.elevationGain}</Text>
          <Text style={styles.secondaryLabel}>Elevation</Text>
        </View>
      </View>
    </View>
  );
};

function formatSportName(sportType: string): string {
  const names: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    rowing: 'Rowing',
    hiking: 'Hiking',
    walking: 'Walking',
    elliptical: 'Elliptical',
    stair_climbing: 'Stair Climbing',
    jump_rope: 'Jump Rope',
    other: 'Workout',
  };
  return names[sportType] || 'Workout';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gpsText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    textTransform: 'capitalize',
  },
  pausedBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  pausedText: {
    color: colors.card,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold as any,
  },
  sportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sportName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.primary,
  },
  primaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  primaryMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  primaryValue: {
    fontSize: 48,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  primaryLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  secondaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  secondaryMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  secondaryValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  secondaryLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
