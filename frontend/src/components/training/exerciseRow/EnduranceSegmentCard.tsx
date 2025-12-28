/**
 * EnduranceSegmentCard - Display component for individual endurance segments
 *
 * Shows segment type, target (time/distance), and heart rate zone
 * with visual indicators for completed vs pending segments.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnduranceSegment, getSegmentDisplayName, formatSegmentTarget } from '../../../types/training';
import { colors, spacing, typography, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';
import { getZoneBadgeStyle } from '../../../utils/heartRateZoneUtils';
import {
  getSegmentTypeIcon,
  getSegmentTypeColor,
  formatDuration,
  isValidSegment,
  SegmentIconName,
} from '../../../utils/segmentUtils';

// ==================== CONSTANTS ====================

/**
 * Width of the status indicator circle
 */
const STATUS_INDICATOR_SIZE = 20;

/**
 * Size of the active status dot inside the indicator
 */
const STATUS_ACTIVE_DOT_SIZE = 6;

// ==================== TYPES ====================

interface EnduranceSegmentCardProps {
  segment: EnduranceSegment;
  allSegments: EnduranceSegment[];
  useMetric?: boolean;
  isCompleted?: boolean;
  isActive?: boolean; // For live tracking: currently tracking this segment
  showActuals?: boolean; // Show actual values if available
}

// ==================== COMPONENT ====================

const EnduranceSegmentCardComponent: React.FC<EnduranceSegmentCardProps> = ({
  segment,
  allSegments,
  useMetric = true,
  isCompleted = false,
  isActive = false,
  showActuals = false,
}) => {
  // Validate segment data to prevent crashes
  if (!isValidSegment(segment)) {
    return null;
  }

  const displayName = getSegmentDisplayName(segment, allSegments);
  const targetDisplay = formatSegmentTarget(segment, useMetric);
  const segmentTypeColor = getSegmentTypeColor(segment.segmentType);
  const segmentTypeIcon: SegmentIconName = getSegmentTypeIcon(segment.segmentType);
  const zone = segment.targetHeartRateZone;
  const zoneStyle = zone ? getZoneBadgeStyle(zone) : null;

  // Determine if we have actual values to show
  const hasActuals = showActuals && (segment.actualDuration || segment.actualDistance);
  const actualDisplay = hasActuals
    ? segment.actualDuration
      ? formatDuration(segment.actualDuration)
      : segment.actualDistance
        ? `${(segment.actualDistance / 1000).toFixed(2)} km`
        : null
    : null;

  return (
    <View
      style={[
        styles.container,
        isActive && styles.containerActive,
        isCompleted && styles.containerCompleted,
      ]}
    >
      {/* Status indicator */}
      <View
        style={[
          styles.statusIndicator,
          isCompleted && styles.statusCompleted,
          isActive && styles.statusActive,
        ]}
      >
        {isCompleted ? (
          <Ionicons name="checkmark" size={12} color={colors.card} />
        ) : isActive ? (
          <View style={styles.statusActiveDot} />
        ) : (
          <Text style={styles.statusNumber}>{segment.segmentOrder}</Text>
        )}
      </View>

      {/* Segment info */}
      <View style={styles.infoContainer}>
        {/* Name and type icon */}
        <View style={styles.nameRow}>
          <Ionicons
            name={segmentTypeIcon}
            size={14}
            color={segmentTypeColor}
            style={styles.typeIcon}
          />
          <Text
            style={[
              styles.segmentName,
              isCompleted && styles.segmentNameCompleted,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
        </View>

        {/* Target */}
        <Text style={styles.targetText}>
          {hasActuals && actualDisplay ? actualDisplay : targetDisplay}
          {hasActuals && actualDisplay && segment.targetValue && (
            <Text style={styles.targetCompare}>
              {' '}/ {targetDisplay}
            </Text>
          )}
        </Text>
      </View>

      {/* Zone badge (if present) */}
      {zone && zoneStyle && (
        <View style={[styles.zoneBadge, { backgroundColor: zoneStyle.backgroundColor }]}>
          <Text style={[styles.zoneText, { color: zoneStyle.color }]}>
            Z{zone}
          </Text>
        </View>
      )}

      {/* Completed checkmark for tracking */}
      {isCompleted && hasActuals && segment.actualAvgHeartRate && (
        <View style={styles.actualHrBadge}>
          <Ionicons name="heart" size={10} color={colors.danger} />
          <Text style={styles.actualHrText}>{segment.actualAvgHeartRate}</Text>
        </View>
      )}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: createColorWithOpacity(colors.background, 0.5),
    marginBottom: spacing.xs,
  },
  containerActive: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.primary, 0.3),
  },
  containerCompleted: {
    opacity: 0.7,
  },
  statusIndicator: {
    width: STATUS_INDICATOR_SIZE,
    height: STATUS_INDICATOR_SIZE,
    borderRadius: STATUS_INDICATOR_SIZE / 2,
    backgroundColor: createColorWithOpacity(colors.muted, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusCompleted: {
    backgroundColor: colors.success,
  },
  statusActive: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.2),
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statusActiveDot: {
    width: STATUS_ACTIVE_DOT_SIZE,
    height: STATUS_ACTIVE_DOT_SIZE,
    borderRadius: STATUS_ACTIVE_DOT_SIZE / 2,
    backgroundColor: colors.primary,
  },
  statusNumber: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.muted,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeIcon: {
    marginRight: 4,
  },
  segmentName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.text,
    flex: 1,
  },
  segmentNameCompleted: {
    color: colors.muted,
  },
  targetText: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  targetCompare: {
    fontSize: typography.fontSizes.xs,
    color: createColorWithOpacity(colors.muted, 0.6),
  },
  zoneBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.sm,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold as any,
  },
  actualHrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: createColorWithOpacity(colors.danger, 0.1),
  },
  actualHrText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.danger,
  },
});

// ==================== EXPORTS ====================

/**
 * Memoized EnduranceSegmentCard component
 * Prevents unnecessary re-renders when parent updates
 */
export const EnduranceSegmentCard = memo(EnduranceSegmentCardComponent);

export default EnduranceSegmentCard;
