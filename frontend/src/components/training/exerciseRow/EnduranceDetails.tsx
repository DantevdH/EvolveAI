/**
 * Endurance Details Component
 *
 * Displays endurance session details with rich card layout, sport icons, and color-coded zones.
 * Shows both planned and tracked workout data when available.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { typography, spacing, borderRadius } from '../../../constants/designSystem';
import { getSportIcon } from '../../../constants/sportIcons';
import { getZoneBadgeStyle, getZoneLabel } from '../../../utils/heartRateZoneUtils';
import { EnduranceSession } from '../../../types/training';

interface EnduranceDetailsProps {
  enduranceSession?: EnduranceSession;
  useMetric?: boolean;
}

const EnduranceDetails: React.FC<EnduranceDetailsProps> = ({
  enduranceSession,
  useMetric = true,
}) => {
  const sportType = enduranceSession?.sportType || '';
  const iconName = getSportIcon(sportType);
  const zone = enduranceSession?.heartRateZone || 1;
  const zoneStyle = getZoneBadgeStyle(zone);
  const zoneLabel = getZoneLabel(zone);

  // Check if session is completed (when completed, details are shown in EnduranceTrackingActions)
  const isCompleted = enduranceSession?.completed || false;

  // Don't show this component anymore - all info is now in EnduranceTrackingActions
  return null;

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (useMetric) {
      const km = meters / 1000;
      return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
    } else {
      const miles = meters / 1609.34;
      return `${miles.toFixed(2)} mi`;
    }
  };

  // Format pace
  const formatPace = (secondsPerKm: number): string => {
    if (!secondsPerKm || secondsPerKm <= 0) return '--:--';

    const paceSeconds = useMetric ? secondsPerKm : secondsPerKm * 1.60934;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')} ${useMetric ? '/km' : '/mi'}`;
  };

  // Get data source badge info
  const getDataSourceInfo = (source: string | undefined): { label: string; icon: string; color: string } => {
    switch (source) {
      case 'live_tracking':
        return { label: 'GPS', icon: 'location', color: colors.success };
      case 'healthkit':
        return { label: 'Health', icon: 'fitness', color: colors.info };
      case 'google_fit':
        return { label: 'Fit', icon: 'fitness', color: colors.info };
      default:
        return { label: 'Planned', icon: 'calendar-outline', color: colors.muted };
    }
  };

  const dataSourceInfo = getDataSourceInfo(enduranceSession?.dataSource);

  // Render planned volume (when no tracked data)
  const renderPlannedVolume = () => {
    const trainingVolume = enduranceSession?.trainingVolume;
    const unit = enduranceSession?.unit || '';

    return (
      <View style={styles.volumeContainer}>
        <Text style={styles.volumeLabel}>VOLUME</Text>
        <Text style={styles.volumeValue}>
          {trainingVolume !== undefined && trainingVolume !== null
            ? `${trainingVolume} ${unit}`
            : 'N/A'}
        </Text>
      </View>
    );
  };

  // Render tracked metrics (when we have tracked data)
  const renderTrackedMetrics = () => {
    const { actualDuration, actualDistance, averagePace, averageHeartRate } = enduranceSession || {};

    return (
      <View style={styles.trackedContainer}>
        {/* Primary metrics row */}
        <View style={styles.trackedRow}>
          {/* Duration */}
          {actualDuration !== undefined && (
            <View style={styles.trackedMetric}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={styles.trackedValue}>{formatDuration(actualDuration)}</Text>
            </View>
          )}

          {/* Distance */}
          {actualDistance !== undefined && actualDistance > 0 && (
            <View style={styles.trackedMetric}>
              <Ionicons name="navigate-outline" size={14} color={colors.muted} />
              <Text style={styles.trackedValue}>{formatDistance(actualDistance)}</Text>
            </View>
          )}

          {/* Pace */}
          {averagePace !== undefined && averagePace > 0 && (
            <View style={styles.trackedMetric}>
              <Ionicons name="speedometer-outline" size={14} color={colors.muted} />
              <Text style={styles.trackedValue}>{formatPace(averagePace)}</Text>
            </View>
          )}

          {/* Heart Rate */}
          {averageHeartRate !== undefined && (
            <View style={styles.trackedMetric}>
              <Ionicons name="heart-outline" size={14} color={colors.muted} />
              <Text style={styles.trackedValue}>{averageHeartRate} bpm</Text>
            </View>
          )}
        </View>

        {/* Data source badge */}
        <View style={styles.dataSourceBadge}>
          <Ionicons name={dataSourceInfo.icon as any} size={12} color={dataSourceInfo.color} />
          <Text style={[styles.dataSourceText, { color: dataSourceInfo.color }]}>
            {dataSourceInfo.label}
          </Text>
        </View>
      </View>
    );
  };

};

const styles = StyleSheet.create({
  enduranceContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  enduranceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailsContainer: {
    flex: 1,
    minWidth: 0,
  },
  volumeContainer: {
    gap: 2,
  },
  volumeLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.text,
  },
  zoneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    flexShrink: 0,
  },
  zoneLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Tracked data styles
  trackedContainer: {
    gap: spacing.xs,
  },
  trackedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  trackedMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trackedValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dataSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dataSourceText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default EnduranceDetails;
