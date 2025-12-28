/**
 * Segment Utilities
 *
 * Shared utilities for endurance segment display including:
 * - Segment type icons and colors
 * - Duration and distance formatting
 * - Segment display helpers
 *
 * Centralizes logic to avoid duplication across components.
 */

import { SegmentType } from '../types/training';
import { colors } from '../constants/designSystem';

// ==================== ICON TYPES ====================

/**
 * Valid Ionicons names for segment types
 * Defines the exact icon names to avoid 'as any' type assertions
 */
export type SegmentIconName =
  | 'flame-outline'
  | 'snow-outline'
  | 'battery-charging-outline'
  | 'pause-outline'
  | 'flash-outline';

// ==================== SEGMENT TYPE HELPERS ====================

/**
 * Get the appropriate icon for a segment type
 * @param segmentType - The type of segment (warmup, work, recovery, rest, cooldown)
 * @returns The Ionicons icon name for this segment type
 */
export const getSegmentTypeIcon = (segmentType: SegmentType | string): SegmentIconName => {
  switch (segmentType) {
    case 'warmup':
      return 'flame-outline';
    case 'cooldown':
      return 'snow-outline';
    case 'recovery':
      return 'battery-charging-outline';
    case 'rest':
      return 'pause-outline';
    case 'work':
    default:
      return 'flash-outline';
  }
};

/**
 * Get the color for a segment type
 * @param segmentType - The type of segment
 * @returns The color hex string for this segment type
 */
export const getSegmentTypeColor = (segmentType: SegmentType | string): string => {
  switch (segmentType) {
    case 'warmup':
      return colors.warning; // Orange
    case 'cooldown':
      return colors.info; // Blue
    case 'recovery':
      return colors.success; // Green
    case 'rest':
      return colors.muted; // Gray
    case 'work':
    default:
      return colors.primary; // Primary
  }
};

// ==================== FORMATTING HELPERS ====================

/**
 * Format duration in seconds to a display string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:30" or "1:02:30"
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format duration in seconds to a friendly display string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "5 min" or "1h 30m"
 */
export const formatDurationFriendly = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

/**
 * Format distance in meters to a display string
 * @param meters - Distance in meters
 * @param useMetric - Whether to use metric units (km) or imperial (mi)
 * @returns Formatted string like "5.2 km" or "3.2 mi"
 */
export const formatDistance = (meters: number, useMetric: boolean = true): string => {
  if (useMetric) {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
  } else {
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  }
};

/**
 * Format pace (seconds per km) to a display string
 * @param secondsPerKm - Pace in seconds per kilometer
 * @param sportType - The sport type (affects display format for swimming/rowing)
 * @param useMetric - Whether to use metric units
 * @returns Formatted string like "6:18/km" or "1:45/100m"
 */
export const formatPace = (
  secondsPerKm: number,
  sportType: string = 'running',
  useMetric: boolean = true
): string => {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';

  const sportLower = sportType.toLowerCase();

  // For swimming, show per 100m
  if (sportLower === 'swimming') {
    const per100m = secondsPerKm / 10; // Convert /km to /100m
    const minutes = Math.floor(per100m / 60);
    const seconds = Math.floor(per100m % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/100${useMetric ? 'm' : 'yd'}`;
  }

  // For rowing, show per 500m
  if (sportLower === 'rowing') {
    const per500m = secondsPerKm / 2; // Convert /km to /500m
    const minutes = Math.floor(per500m / 60);
    const seconds = Math.floor(per500m % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/500m`;
  }

  // Standard pace format
  const paceSeconds = useMetric ? secondsPerKm : secondsPerKm * 1.60934;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${useMetric ? 'km' : 'mi'}`;
};

/**
 * Format speed in km/h to a display string
 * @param kmh - Speed in kilometers per hour
 * @param useMetric - Whether to use metric units
 * @returns Formatted string like "25.5 km/h" or "15.8 mph"
 */
export const formatSpeed = (kmh: number, useMetric: boolean = true): string => {
  if (!kmh || kmh <= 0) return '--';

  if (useMetric) {
    return `${kmh.toFixed(1)} km/h`;
  } else {
    const mph = kmh / 1.60934;
    return `${mph.toFixed(1)} mph`;
  }
};

/**
 * Format elevation in meters to a display string
 * @param meters - Elevation in meters
 * @param useMetric - Whether to use metric units
 * @returns Formatted string like "124 m" or "407 ft"
 */
export const formatElevation = (meters: number, useMetric: boolean = true): string => {
  if (!meters) return '--';

  if (useMetric) {
    return `${Math.round(meters)} m`;
  } else {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
};

// ==================== SEGMENT VALIDATION ====================

/**
 * Check if a segment block has valid data for rendering
 * @param block - The segment block to validate
 * @returns Whether the block is valid for rendering
 */
export const isValidBlock = (block: unknown): boolean => {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  return (
    typeof b.blockOrder === 'number' &&
    Array.isArray(b.segments) &&
    b.segments.length > 0
  );
};

/**
 * Check if a segment has valid data for rendering
 * @param segment - The segment to validate
 * @returns Whether the segment is valid for rendering
 */
export const isValidSegment = (segment: unknown): boolean => {
  if (!segment || typeof segment !== 'object') return false;
  const s = segment as Record<string, unknown>;
  return (
    typeof s.segmentOrder === 'number' &&
    typeof s.segmentType === 'string' &&
    typeof s.targetType === 'string'
  );
};
