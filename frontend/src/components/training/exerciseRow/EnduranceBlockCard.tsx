/**
 * EnduranceBlockCard - Display component for segment blocks
 *
 * Shows block with its segments and repeat count.
 * Blocks group segments that are repeated together.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SegmentBlock, formatSegmentTarget } from '../../../types/training';
import { colors, spacing, typography, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';
import { getZoneBadgeStyle } from '../../../utils/heartRateZoneUtils';
import {
  getSegmentTypeIcon,
  getSegmentTypeColor,
  isValidBlock,
  isValidSegment,
  SegmentIconName,
} from '../../../utils/segmentUtils';

// ==================== CONSTANTS ====================

/**
 * Width of the order indicator circle
 * Used for calculating segment list alignment
 */
const ORDER_INDICATOR_SIZE = 20;

// ==================== TYPES ====================

interface EnduranceBlockCardProps {
  block: SegmentBlock;
  allBlocks: SegmentBlock[];
  useMetric?: boolean;
  isCompleted?: boolean;
  isActive?: boolean;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get display name for a block
 * Uses block.name if available, otherwise auto-generates based on content
 */
const getBlockDisplayName = (block: SegmentBlock, allBlocks: SegmentBlock[]): string => {
  if (block.name) return block.name;

  const segmentTypes = block.segments.map((s) => s.segmentType);
  const hasWarmup = segmentTypes.includes('warmup');
  const hasCooldown = segmentTypes.includes('cooldown');
  const hasWork = segmentTypes.includes('work');

  if (hasWarmup && !hasWork && !hasCooldown) return 'Warm Up';
  if (hasCooldown && !hasWork && !hasWarmup) return 'Cool Down';
  if (block.repeatCount > 1) return `Main Set ×${block.repeatCount}`;
  if (hasWork) return 'Main Set';

  return `Block ${block.blockOrder}`;
};

// ==================== COMPONENT ====================

const EnduranceBlockCardComponent: React.FC<EnduranceBlockCardProps> = ({
  block,
  allBlocks,
  useMetric = true,
  isCompleted = false,
  isActive = false,
}) => {
  // Validate block data to prevent crashes
  if (!isValidBlock(block)) {
    return null;
  }

  const displayName = getBlockDisplayName(block, allBlocks);
  const repeatCount = block.repeatCount ?? 1;
  const segments = block.segments || [];

  // For single-segment blocks, show segment details inline
  const isSingleSegment = segments.length === 1;
  const singleSegment = isSingleSegment ? segments[0] : null;

  return (
    <View
      style={[
        styles.container,
        isActive && styles.containerActive,
        isCompleted && styles.containerCompleted,
      ]}
    >
      {/* Block header with order indicator */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.orderIndicator,
            isCompleted && styles.orderIndicatorCompleted,
            isActive && styles.orderIndicatorActive,
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={12} color={colors.card} />
          ) : (
            <Text style={styles.orderText}>{block.blockOrder}</Text>
          )}
        </View>

        <View style={styles.blockInfo}>
          <Text
            style={[
              styles.blockName,
              isCompleted && styles.blockNameCompleted,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          {/* Show segment summary for multi-segment blocks */}
          {!isSingleSegment && (
            <Text style={styles.segmentSummary}>
              {segments.length} segments
            </Text>
          )}

          {/* Show target for single-segment blocks */}
          {isSingleSegment && singleSegment && (
            <Text style={styles.targetText}>
              {formatSegmentTarget(singleSegment, useMetric)}
            </Text>
          )}
        </View>

        {/* Repeat badge */}
        {repeatCount > 1 && (
          <View style={styles.repeatBadge}>
            <Ionicons name="repeat" size={10} color={colors.primary} />
            <Text style={styles.repeatText}>×{repeatCount}</Text>
          </View>
        )}

        {/* Zone badge for single-segment blocks */}
        {isSingleSegment && singleSegment?.targetHeartRateZone && (
          <View
            style={[
              styles.zoneBadge,
              { backgroundColor: getZoneBadgeStyle(singleSegment.targetHeartRateZone).backgroundColor },
            ]}
          >
            <Text
              style={[
                styles.zoneText,
                { color: getZoneBadgeStyle(singleSegment.targetHeartRateZone).color },
              ]}
            >
              Z{singleSegment.targetHeartRateZone}
            </Text>
          </View>
        )}
      </View>

      {/* Show segment list for multi-segment blocks */}
      {!isSingleSegment && (
        <View style={styles.segmentList}>
          {segments.map((segment, index) => {
            // Validate segment and skip invalid ones
            if (!isValidSegment(segment)) {
              return null;
            }

            // Use composite key to handle expanded segments
            const key = segment.id || `segment-${block.id}-${index}`;
            const iconName: SegmentIconName = getSegmentTypeIcon(segment.segmentType);
            const iconColor = getSegmentTypeColor(segment.segmentType);

            return (
              <View key={key} style={styles.segmentRow}>
                <Ionicons
                  name={iconName}
                  size={12}
                  color={iconColor}
                  style={styles.segmentIcon}
                />
                <Text style={styles.segmentName} numberOfLines={1}>
                  {segment.name || segment.segmentType.charAt(0).toUpperCase() + segment.segmentType.slice(1)}
                </Text>
                <Text style={styles.segmentTarget}>
                  {formatSegmentTarget(segment, useMetric)}
                </Text>
                {segment.targetHeartRateZone && (
                  <View
                    style={[
                      styles.miniZoneBadge,
                      { backgroundColor: getZoneBadgeStyle(segment.targetHeartRateZone).backgroundColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniZoneText,
                        { color: getZoneBadgeStyle(segment.targetHeartRateZone).color },
                      ]}
                    >
                      Z{segment.targetHeartRateZone}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    backgroundColor: createColorWithOpacity(colors.background, 0.5),
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIndicator: {
    width: ORDER_INDICATOR_SIZE,
    height: ORDER_INDICATOR_SIZE,
    borderRadius: ORDER_INDICATOR_SIZE / 2,
    backgroundColor: createColorWithOpacity(colors.muted, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  orderIndicatorCompleted: {
    backgroundColor: colors.success,
  },
  orderIndicatorActive: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.2),
    borderWidth: 2,
    borderColor: colors.primary,
  },
  orderText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.muted,
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.text,
  },
  blockNameCompleted: {
    color: colors.muted,
  },
  segmentSummary: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
  },
  targetText: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
  },
  repeatText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.primary,
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
  segmentList: {
    marginTop: spacing.xs,
    // Align with block name: indicator width + margin
    marginLeft: ORDER_INDICATOR_SIZE + spacing.sm,
    gap: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentIcon: {
    marginRight: 4,
  },
  segmentName: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
  },
  segmentTarget: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.xs,
  },
  miniZoneBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 4,
  },
  miniZoneText: {
    fontSize: 8,
    fontWeight: typography.fontWeights.bold as any,
  },
});

// ==================== EXPORTS ====================

/**
 * Memoized EnduranceBlockCard component
 * Prevents unnecessary re-renders when parent updates
 */
export const EnduranceBlockCard = memo(EnduranceBlockCardComponent);

export default EnduranceBlockCard;
