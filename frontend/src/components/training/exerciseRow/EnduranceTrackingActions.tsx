/**
 * EnduranceTrackingActions - Action buttons OR metrics display for endurance sessions
 *
 * When completed=false: Shows "Start Tracking" and "Import from Health" buttons
 * When completed=true: Shows sport-specific tracked metrics
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnduranceSession } from '../../../types/training';
import { colors, spacing, typography, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';
import { getSportIcon } from '../../../constants/sportIcons';
import { getZoneBadgeStyle, getZoneLabel } from '../../../utils/heartRateZoneUtils';

interface EnduranceTrackingActionsProps {
  enduranceSession: EnduranceSession;
  onStartTracking: () => void;
  onImportFromHealth: () => void;
  isLocked?: boolean;
  useMetric?: boolean;
}

// Sport-specific metric configurations
type MetricType = 'time' | 'distance' | 'pace' | 'speed' | 'hr' | 'elevation';

const SPORT_METRICS: Record<string, MetricType[]> = {
  running: ['time', 'distance', 'pace', 'hr', 'elevation'],
  cycling: ['time', 'distance', 'speed', 'hr', 'elevation'],
  swimming: ['time', 'distance', 'pace', 'hr'],
  rowing: ['time', 'distance', 'pace', 'hr'],
  hiking: ['time', 'distance', 'pace', 'hr', 'elevation'],
  walking: ['time', 'distance', 'pace', 'hr'],
  elliptical: ['time', 'distance', 'pace', 'hr'],
  stair_climbing: ['time', 'hr', 'elevation'],
  jump_rope: ['time', 'hr'],
  other: ['time', 'distance', 'hr'],
};

export const EnduranceTrackingActions: React.FC<EnduranceTrackingActionsProps> = ({
  enduranceSession,
  onStartTracking,
  onImportFromHealth,
  isLocked = false,
  useMetric = true,
}) => {
  const healthLabel = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  // Debounce state to prevent double-tap issues
  const [isStartingTracking, setIsStartingTracking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Debounced start tracking handler
  const handleStartTracking = useCallback(() => {
    if (isStartingTracking) return;
    setIsStartingTracking(true);
    onStartTracking();
    // Re-enable after 1 second (enough time for modal to open)
    setTimeout(() => setIsStartingTracking(false), 1000);
  }, [onStartTracking, isStartingTracking]);

  // Debounced import handler
  const handleImportFromHealth = useCallback(() => {
    if (isImporting) return;
    setIsImporting(true);
    onImportFromHealth();
    // Re-enable after 1 second
    setTimeout(() => setIsImporting(false), 1000);
  }, [onImportFromHealth, isImporting]);

  // Format duration (seconds to HH:MM:SS or MM:SS)
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance (meters to km/mi)
  const formatDistance = (meters: number): string => {
    if (useMetric) {
      const km = meters / 1000;
      return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
    } else {
      const miles = meters / 1609.34;
      return `${miles.toFixed(2)} mi`;
    }
  };

  // Format pace (seconds per km to min:sec/km or min:sec/mi)
  const formatPace = (secondsPerKm: number, sportType: string): string => {
    if (!secondsPerKm || secondsPerKm <= 0) return '--:--';

    // For swimming, show per 100m; for rowing, show per 500m
    if (sportType.toLowerCase() === 'swimming') {
      const per100m = secondsPerKm / 10; // Convert /km to /100m
      const minutes = Math.floor(per100m / 60);
      const seconds = Math.floor(per100m % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}/100${useMetric ? 'm' : 'yd'}`;
    }

    if (sportType.toLowerCase() === 'rowing') {
      const per500m = secondsPerKm / 2; // Convert /km to /500m
      const minutes = Math.floor(per500m / 60);
      const seconds = Math.floor(per500m % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}/500m`;
    }

    const paceSeconds = useMetric ? secondsPerKm : secondsPerKm * 1.60934;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/${useMetric ? 'km' : 'mi'}`;
  };

  // Format speed (km/h or mph)
  const formatSpeed = (kmh: number): string => {
    if (!kmh || kmh <= 0) return '--';
    if (useMetric) {
      return `${kmh.toFixed(1)} km/h`;
    } else {
      const mph = kmh / 1.60934;
      return `${mph.toFixed(1)} mph`;
    }
  };

  // Format elevation (meters or feet)
  const formatElevation = (meters: number): string => {
    if (!meters) return '--';
    if (useMetric) {
      return `${Math.round(meters)} m`;
    } else {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
  };

  // Get icon for metric type
  const getMetricIcon = (metricType: MetricType): string => {
    switch (metricType) {
      case 'time': return 'time-outline';
      case 'distance': return 'navigate-outline';
      case 'pace': return 'speedometer-outline';
      case 'speed': return 'speedometer-outline';
      case 'hr': return 'heart-outline';
      case 'elevation': return 'trending-up-outline';
      default: return 'analytics-outline';
    }
  };

  // Get metric value
  const getMetricValue = (metricType: MetricType): string | null => {
    const sportType = enduranceSession.sportType?.toLowerCase() || 'other';

    switch (metricType) {
      case 'time':
        return enduranceSession.actualDuration
          ? formatDuration(enduranceSession.actualDuration)
          : null;
      case 'distance':
        return enduranceSession.actualDistance && enduranceSession.actualDistance > 0
          ? formatDistance(enduranceSession.actualDistance)
          : null;
      case 'pace':
        return enduranceSession.averagePace && enduranceSession.averagePace > 0
          ? formatPace(enduranceSession.averagePace, sportType)
          : null;
      case 'speed':
        return enduranceSession.averageSpeed && enduranceSession.averageSpeed > 0
          ? formatSpeed(enduranceSession.averageSpeed)
          : null;
      case 'hr':
        return enduranceSession.averageHeartRate
          ? `${enduranceSession.averageHeartRate} bpm`
          : null;
      case 'elevation':
        return enduranceSession.elevationGain
          ? formatElevation(enduranceSession.elevationGain)
          : null;
      default:
        return null;
    }
  };

  // Get data source info
  const getDataSourceInfo = (): { label: string; icon: string; color: string } => {
    switch (enduranceSession.dataSource) {
      case 'live_tracking':
        return { label: 'GPS Tracked', icon: 'location', color: colors.success };
      case 'healthkit':
        return { label: 'Apple Health', icon: 'fitness', color: colors.info };
      case 'google_fit':
        return { label: 'Google Fit', icon: 'fitness', color: colors.info };
      default:
        return { label: 'Tracked', icon: 'checkmark-circle', color: colors.success };
    }
  };

  // If completed, show sport icon, GPS tracked badge, and metrics display
  if (enduranceSession.completed) {
    const sportType = enduranceSession.sportType?.toLowerCase() || 'other';
    const metricsToShow = SPORT_METRICS[sportType] || SPORT_METRICS.other;
    const dataSourceInfo = getDataSourceInfo();
    const sportIconName = getSportIcon(enduranceSession.sportType);

    // Filter to only metrics with actual values
    const availableMetrics = metricsToShow
      .map(metricType => ({
        type: metricType,
        value: getMetricValue(metricType),
        icon: getMetricIcon(metricType),
      }))
      .filter(metric => metric.value !== null);

    return (
      <View style={styles.metricsContainer}>
        {/* Sport Icon */}
        <View style={styles.sportIconContainer}>
          <View style={styles.sportIconCircle}>
            <Ionicons name={sportIconName as any} size={28} color={colors.primary} />
          </View>
        </View>

        {/* GPS Tracked badge */}
        <View style={styles.dataSourceRow}>
          <View style={[styles.dataSourceBadge, { backgroundColor: createColorWithOpacity(dataSourceInfo.color, 0.1) }]}>
            <Ionicons name={dataSourceInfo.icon as any} size={12} color={dataSourceInfo.color} />
            <Text style={[styles.dataSourceText, { color: dataSourceInfo.color }]}>
              {dataSourceInfo.label}
            </Text>
          </View>
        </View>

        {/* Metrics grid */}
        {availableMetrics.length > 0 && (
          <View style={styles.metricsGrid}>
            {availableMetrics.map((metric) => (
              <View key={metric.type} style={styles.metricItem}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name={metric.icon as any} size={16} color={colors.primary} />
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // If not completed and locked, don't show anything
  if (isLocked) {
    return null;
  }

  // If not completed, show sport logo, volume, zone, and action buttons
  const sportIconName = getSportIcon(enduranceSession.sportType);
  const zone = enduranceSession.heartRateZone || 1;
  const zoneStyle = getZoneBadgeStyle(zone);
  const zoneLabel = getZoneLabel(zone);
  const trainingVolume = enduranceSession.trainingVolume;
  const unit = enduranceSession.unit || '';

  return (
    <View style={styles.container}>
      {/* Sport Icon */}
      <View style={styles.sportIconContainer}>
        <View style={styles.sportIconCircle}>
          <Ionicons name={sportIconName as any} size={28} color={colors.primary} />
        </View>
      </View>

      {/* Volume and Zone Row */}
      <View style={styles.volumeZoneRow}>
        {/* Volume */}
        <View style={styles.volumeContainer}>
          <View style={styles.volumeIconContainer}>
            <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.volumeTextContainer}>
            <Text style={styles.volumeLabel}>VOLUME</Text>
            <Text style={styles.volumeValue}>
              {trainingVolume !== undefined && trainingVolume !== null
                ? `${trainingVolume} ${unit}`
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Zone Badge */}
        <View style={[styles.zoneBadge, { backgroundColor: zoneStyle.backgroundColor }]}>
          <Text style={[styles.zoneLabel, { color: zoneStyle.color }]}>{zoneLabel}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Start Tracking Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isStartingTracking && styles.buttonDisabled]}
          onPress={handleStartTracking}
          activeOpacity={0.8}
          disabled={isStartingTracking}
        >
          <Ionicons name="play" size={18} color={colors.card} />
          <Text style={styles.primaryButtonText}>
            {isStartingTracking ? 'Starting...' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        {/* Import from Health Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, isImporting && styles.secondaryButtonDisabled]}
          onPress={handleImportFromHealth}
          activeOpacity={0.7}
          disabled={isImporting}
        >
          <Ionicons name="download-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>
            {isImporting ? 'Importing...' : `Import from ${healthLabel}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  buttonsContainer: {
    width: '100%',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  // Metrics display styles
  metricsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  sportIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sportIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataSourceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dataSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  dataSourceText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    width: '100%',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 80,
  },
  metricIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Volume and Zone styles for incomplete sessions
  volumeZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  volumeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeTextContainer: {
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
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  zoneBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  zoneLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default EnduranceTrackingActions;
