/**
 * Heart Rate Zone Utilities
 * Maps heart rate zones (1-5) to colors matching the star rating scheme
 * Zone 1 (very easy) → muted/low intensity
 * Zone 5 (very hard) → primary/high intensity
 */

import { colors, createColorWithOpacity } from '../constants/colors';

/**
 * Valid heart rate zones
 */
export const MIN_ZONE = 1;
export const MAX_ZONE = 5;

/**
 * Get the background color for a heart rate zone badge
 * Zones are mapped to colors matching star rating scheme:
 * - Zone 1: muted (very easy)
 * - Zone 2-4: intermediate colors
 * - Zone 5: primary (very hard)
 * 
 * @param zone - Heart rate zone (1-5)
 * @returns Background color for the zone badge
 */
export const getZoneBackgroundColor = (zone: number): string => {
  // Clamp zone to valid range
  const clampedZone = Math.max(MIN_ZONE, Math.min(MAX_ZONE, Math.round(zone)));

  switch (clampedZone) {
    case 1:
      // Zone 1: muted color with low opacity (very easy)
      return createColorWithOpacity(colors.muted, 0.15);
    case 2:
      // Zone 2: muted color with medium opacity
      return createColorWithOpacity(colors.muted, 0.25);
    case 3:
      // Zone 3: intermediate between muted and primary
      return createColorWithOpacity(colors.primary, 0.2);
    case 4:
      // Zone 4: primary color with medium opacity
      return createColorWithOpacity(colors.primary, 0.3);
    case 5:
      // Zone 5: primary color with higher opacity (very hard)
      return createColorWithOpacity(colors.primary, 0.4);
    default:
      // Fallback for invalid zones
      return createColorWithOpacity(colors.muted, 0.15);
  }
};

/**
 * Get the text color for a heart rate zone badge
 * Ensures good contrast against the background color
 * 
 * @param zone - Heart rate zone (1-5)
 * @returns Text color for the zone badge
 */
export const getZoneTextColor = (zone: number): string => {
  // Clamp zone to valid range
  const clampedZone = Math.max(MIN_ZONE, Math.min(MAX_ZONE, Math.round(zone)));

  // For zones 1-2, use muted text color
  // For zones 3-5, use primary text color for better contrast
  if (clampedZone <= 2) {
    return colors.muted;
  } else {
    return colors.primary;
  }
};

/**
 * Get the complete style object for a heart rate zone badge
 * Includes background color, text color, and other badge styling
 * 
 * @param zone - Heart rate zone (1-5)
 * @returns Style object for the zone badge
 */
export const getZoneBadgeStyle = (zone: number): {
  backgroundColor: string;
  color: string;
} => {
  return {
    backgroundColor: getZoneBackgroundColor(zone),
    color: getZoneTextColor(zone),
  };
};

/**
 * Validate if a zone is within the valid range
 * 
 * @param zone - Heart rate zone to validate
 * @returns True if zone is valid (1-5), false otherwise
 */
export const isValidZone = (zone: number): boolean => {
  return Number.isInteger(zone) && zone >= MIN_ZONE && zone <= MAX_ZONE;
};

/**
 * Get zone label text
 * 
 * @param zone - Heart rate zone (1-5)
 * @returns Zone label (e.g., "Zone 1", "Zone 5")
 */
export const getZoneLabel = (zone: number): string => {
  const clampedZone = Math.max(MIN_ZONE, Math.min(MAX_ZONE, Math.round(zone)));
  return `Zone ${clampedZone}`;
};
