/**
 * TrackingMetrics - Real-time workout metrics display
 *
 * Sport-specific metric display:
 * - Main metric: Pace (running, swimming, etc), Speed (cycling), or Time (stair climbing, jump rope)
 * - Secondary metrics: Sport-relevant metrics (distance, time, elevation based on sport)
 *
 * Key features:
 * - Swimming shows pace as /100m, Rowing as /500m
 * - Cycling shows speed instead of pace
 * - Indoor sports (stair climbing, jump rope) show time only
 * - Elevation hidden for sports where it's not relevant
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormattedWorkoutMetrics, GPSSignalQuality } from '../../types/liveTracking';
import { colors, spacing, typography, borderRadius } from '../../constants/designSystem';
import { SPORT_ICONS } from '../../constants/sportIcons';
import {
  getMainMetric,
  getSecondaryMetricsForLive,
  shouldShowCurrentAndAverage,
  getMainMetricLabel,
  getAverageMetricLabel,
  formatSportName,
  getMetricDisplayInfo,
  MetricKey,
} from '../../utils/sportMetrics';

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
  const mainMetricType = getMainMetric(sportType);
  const secondaryMetrics = getSecondaryMetricsForLive(sportType);
  const showCurrentAndAverage = shouldShowCurrentAndAverage(sportType);

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

  // Get the main metric value based on sport type
  const getMainMetricValue = (): string => {
    switch (mainMetricType) {
      case 'pace':
        return metrics.currentPace || '--:--';
      case 'speed':
        return metrics.averageSpeed; // Show current speed (averageSpeed contains the formatted value)
      case 'time':
        return metrics.duration;
    }
  };

  // Get the average/secondary value for current+average display
  const getAverageMetricValue = (): string | null => {
    if (!showCurrentAndAverage) return null;

    switch (mainMetricType) {
      case 'pace':
        return metrics.averagePace;
      case 'speed':
        return metrics.averageSpeed;
      default:
        return null;
    }
  };

  // Get secondary metric value by key
  const getSecondaryMetricValue = (key: MetricKey): string | null => {
    switch (key) {
      case 'duration':
        return metrics.duration;
      case 'distance':
        return metrics.distance;
      case 'elevation':
        return metrics.elevationGain;
      case 'pace':
        return metrics.averagePace;
      case 'speed':
        return metrics.averageSpeed;
      default:
        return null;
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

      {/* Main Metric - Large Display */}
      <View style={styles.mainMetricContainer}>
        <Text style={styles.mainMetricValue}>{getMainMetricValue()}</Text>
        <Text style={styles.mainMetricLabel}>{getMainMetricLabel(sportType)}</Text>

        {/* Average sub-metric for pace/speed sports */}
        {showCurrentAndAverage && getAverageMetricValue() && (
          <View style={styles.averageMetricRow}>
            <Text style={styles.averageMetricValue}>{getAverageMetricValue()}</Text>
            <Text style={styles.averageMetricLabel}>{getAverageMetricLabel(sportType)}</Text>
          </View>
        )}
      </View>

      {/* Secondary Metrics Grid */}
      {secondaryMetrics.length > 0 && (
        <View style={styles.secondaryMetrics}>
          {secondaryMetrics.map((metricKey) => {
            const value = getSecondaryMetricValue(metricKey);
            const info = getMetricDisplayInfo(metricKey);

            if (!value) return null;

            return (
              <View key={metricKey} style={styles.secondaryMetricItem}>
                <Ionicons name={info.icon as any} size={20} color={colors.muted} />
                <Text style={styles.secondaryValue}>{value}</Text>
                <Text style={styles.secondaryLabel}>{info.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

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
    marginBottom: spacing.xl,
  },
  sportName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.primary,
  },
  // Main metric - large centered display
  mainMetricContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  mainMetricValue: {
    fontSize: 64,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  mainMetricLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Average metric row (shown below main for pace/speed)
  averageMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
  },
  averageMetricValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  averageMetricLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
  },
  // Secondary metrics grid
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
