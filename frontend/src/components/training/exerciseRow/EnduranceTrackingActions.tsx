/**
 * EnduranceTrackingActions - Action buttons OR metrics display for endurance sessions
 *
 * When completed=false: Shows "Start Tracking" and "Import from Health" buttons
 * When completed=true: Shows sport-specific tracked metrics
 * Supports multi-segment sessions (intervals) with segment list display
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnduranceSession, formatSegmentTarget, calculateSessionTotals, getExpandedSegmentCount, hasRepeatingBlocks, getMaxRepeatCount } from '../../../types/training';
import { colors, spacing, typography, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';
import { getSportIcon } from '../../../constants/sportIcons';
import { getZoneBadgeStyle, getZoneLabel } from '../../../utils/heartRateZoneUtils';
import { EnduranceBlockCard } from './EnduranceBlockCard';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatSpeed,
  formatElevation,
  isValidBlock,
} from '../../../utils/segmentUtils';

// ==================== CONSTANTS ====================

/**
 * Debounce delay in milliseconds to prevent double-tap issues
 */
const DEBOUNCE_DELAY_MS = 1000;

// ==================== TYPES ====================

interface EnduranceTrackingActionsProps {
  enduranceSession: EnduranceSession;
  onStartTracking?: () => void;
  onImportFromHealth?: () => void;
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

// Metric icon mapping
type MetricIconName = 'time-outline' | 'navigate-outline' | 'speedometer-outline' | 'heart-outline' | 'trending-up-outline' | 'analytics-outline';

const METRIC_ICONS: Record<MetricType, MetricIconName> = {
  time: 'time-outline',
  distance: 'navigate-outline',
  pace: 'speedometer-outline',
  speed: 'speedometer-outline',
  hr: 'heart-outline',
  elevation: 'trending-up-outline',
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get data source display info
 */
const getDataSourceInfo = (dataSource?: string): { label: string; icon: string; color: string } => {
  switch (dataSource) {
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

/**
 * Format total duration for display (e.g., "5 min" or "1h 30m")
 */
const formatTotalDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

// ==================== COMPONENT ====================

const EnduranceTrackingActionsComponent: React.FC<EnduranceTrackingActionsProps> = ({
  enduranceSession,
  onStartTracking,
  onImportFromHealth,
  isLocked = false,
  useMetric = true,
}) => {
  const healthLabel = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  // Use refs for debounce state to avoid stale closure issues
  const isStartingTrackingRef = useRef(false);
  const isImportingRef = useRef(false);
  const startTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount to prevent memory leaks and state updates on unmounted component
  useEffect(() => {
    return () => {
      if (startTrackingTimeoutRef.current) {
        clearTimeout(startTrackingTimeoutRef.current);
      }
      if (importTimeoutRef.current) {
        clearTimeout(importTimeoutRef.current);
      }
    };
  }, []);

  // Debounced start tracking handler with cleanup
  const handleStartTracking = useCallback(() => {
    if (isStartingTrackingRef.current || !onStartTracking) return;

    isStartingTrackingRef.current = true;
    onStartTracking();

    // Clear any existing timeout
    if (startTrackingTimeoutRef.current) {
      clearTimeout(startTrackingTimeoutRef.current);
    }

    // Re-enable after delay
    startTrackingTimeoutRef.current = setTimeout(() => {
      isStartingTrackingRef.current = false;
      startTrackingTimeoutRef.current = null;
    }, DEBOUNCE_DELAY_MS);
  }, [onStartTracking]);

  // Debounced import handler with cleanup
  const handleImportFromHealth = useCallback(() => {
    if (isImportingRef.current || !onImportFromHealth) return;

    isImportingRef.current = true;
    onImportFromHealth();

    // Clear any existing timeout
    if (importTimeoutRef.current) {
      clearTimeout(importTimeoutRef.current);
    }

    // Re-enable after delay
    importTimeoutRef.current = setTimeout(() => {
      isImportingRef.current = false;
      importTimeoutRef.current = null;
    }, DEBOUNCE_DELAY_MS);
  }, [onImportFromHealth]);

  // Get metric value for display
  const getMetricValue = useCallback((metricType: MetricType): string | null => {
    const sportType = enduranceSession.sportType?.toLowerCase() || 'other';

    switch (metricType) {
      case 'time':
        return enduranceSession.actualDuration
          ? formatDuration(enduranceSession.actualDuration)
          : null;
      case 'distance':
        return enduranceSession.actualDistance && enduranceSession.actualDistance > 0
          ? formatDistance(enduranceSession.actualDistance, useMetric)
          : null;
      case 'pace':
        return enduranceSession.averagePace && enduranceSession.averagePace > 0
          ? formatPace(enduranceSession.averagePace, sportType, useMetric)
          : null;
      case 'speed':
        return enduranceSession.averageSpeed && enduranceSession.averageSpeed > 0
          ? formatSpeed(enduranceSession.averageSpeed, useMetric)
          : null;
      case 'hr':
        return enduranceSession.averageHeartRate
          ? `${enduranceSession.averageHeartRate} bpm`
          : null;
      case 'elevation':
        return enduranceSession.elevationGain
          ? formatElevation(enduranceSession.elevationGain, useMetric)
          : null;
      default:
        return null;
    }
  }, [enduranceSession, useMetric]);

  // If completed, show sport icon, GPS tracked badge, and metrics display
  if (enduranceSession.completed) {
    const sportType = enduranceSession.sportType?.toLowerCase() || 'other';
    const metricsToShow = SPORT_METRICS[sportType] || SPORT_METRICS.other;
    const dataSourceInfo = getDataSourceInfo(enduranceSession.dataSource);
    const sportIconName = getSportIcon(enduranceSession.sportType);

    // Filter to only metrics with actual values
    const availableMetrics = metricsToShow
      .map(metricType => ({
        type: metricType,
        value: getMetricValue(metricType),
        icon: METRIC_ICONS[metricType] || 'analytics-outline',
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
                  <Ionicons name={metric.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Helper function to render read-only planned session info (blocks display)
  const renderPlannedInfo = (showButtons: boolean) => {
    const sportIconName = getSportIcon(enduranceSession.sportType);
    const blocks = enduranceSession.blocks || [];
    const expandedSegmentCount = getExpandedSegmentCount(blocks);
    const { totalDuration, totalDistance } = calculateSessionTotals(blocks);
    const hasRepeats = hasRepeatingBlocks(blocks);
    const maxRepeat = getMaxRepeatCount(blocks);

    // For single segment (1 block with 1 segment), get zone from segment
    const isSingleSegment = blocks.length === 1 && blocks[0].segments.length === 1 && blocks[0].repeatCount === 1;
    const singleSegment = isSingleSegment ? blocks[0].segments[0] : null;
    const singleSegmentZone = singleSegment?.targetHeartRateZone;
    const zoneStyle = singleSegmentZone ? getZoneBadgeStyle(singleSegmentZone) : null;
    const zoneLabel = singleSegmentZone ? getZoneLabel(singleSegmentZone) : null;

    return (
      <View style={styles.container}>
        {/* Sport Icon */}
        <View style={styles.sportIconContainer}>
          <View style={styles.sportIconCircle}>
            <Ionicons name={sportIconName as any} size={28} color={colors.primary} />
          </View>
        </View>

        {/* For single segment: show target and zone inline */}
        {isSingleSegment && singleSegment && (
          <View style={styles.volumeZoneRow}>
            {/* Target */}
            <View style={styles.volumeContainer}>
              <View style={styles.volumeIconContainer}>
                <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.volumeTextContainer}>
                <Text style={styles.volumeLabel}>TARGET</Text>
                <Text style={styles.volumeValue}>
                  {formatSegmentTarget(singleSegment, useMetric)}
                </Text>
              </View>
            </View>

            {/* Zone Badge */}
            {zoneStyle && zoneLabel && (
              <View style={[styles.zoneBadge, { backgroundColor: zoneStyle.backgroundColor }]}>
                <Text style={[styles.zoneLabel, { color: zoneStyle.color }]}>{zoneLabel}</Text>
              </View>
            )}
          </View>
        )}

        {/* For multi-segment: show block count, total, and block list */}
        {!isSingleSegment && (
          <View style={styles.multiSegmentContainer}>
            {/* Summary row */}
            <View style={styles.segmentSummaryRow}>
              <Text style={styles.segmentCount}>
                {expandedSegmentCount} segments
                {hasRepeats && <Text style={styles.repeatIndicator}> (×{maxRepeat})</Text>}
              </Text>
              {totalDuration > 0 && (
                <Text style={styles.totalDuration}>~{formatTotalDuration(totalDuration)}</Text>
              )}
              {totalDistance > 0 && (
                <Text style={styles.totalDistance}>
                  {useMetric
                    ? `${(totalDistance / 1000).toFixed(1)} km`
                    : `${(totalDistance / 1609.34).toFixed(1)} mi`}
                </Text>
              )}
            </View>

            {/* Block list - show compact view */}
            <View style={styles.segmentListContainer}>
              {blocks.map((block, index) => {
                // Validate block before rendering
                if (!isValidBlock(block)) {
                  return null;
                }

                const key = block.id || `block-${index}`;
                return (
                  <EnduranceBlockCard
                    key={key}
                    block={block}
                    allBlocks={blocks}
                    useMetric={useMetric}
                    isCompleted={false}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons (only if showButtons is true) */}
        {showButtons && (
          <View style={styles.buttonsContainer}>
            {/* Start Tracking Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartTracking}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color={colors.card} />
              <Text style={styles.primaryButtonText}>Start Tracking</Text>
            </TouchableOpacity>

            {/* Import from Health Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleImportFromHealth}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>
                Import from {healthLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // If not completed and (locked OR missing callbacks), show read-only planned session info
  if (!enduranceSession.completed && (isLocked || !onStartTracking || !onImportFromHealth)) {
    return renderPlannedInfo(false);
  }

  // If not completed and has callbacks, show with action buttons
  return renderPlannedInfo(true);
};

// ==================== STYLES ====================

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
  // Multi-segment styles
  multiSegmentContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  segmentSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  segmentCount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text,
  },
  repeatIndicator: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.primary,
  },
  totalDuration: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  totalDistance: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  segmentListContainer: {
    width: '100%',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});

// ==================== EXPORTS ====================

/**
 * Memoized EnduranceTrackingActions component
 * Prevents unnecessary re-renders when parent updates
 */
export const EnduranceTrackingActions = memo(EnduranceTrackingActionsComponent);

export default EnduranceTrackingActions;
