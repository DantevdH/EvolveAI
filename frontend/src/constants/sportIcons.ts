/**
 * Sport Icons Constants
 * Maps sport types to Ionicons icon names
 */

import { SPORT_TYPES } from '../components/training/addExerciseModal/constants';

/**
 * Mapping of sport types to Ionicons icon names
 */
export const SPORT_ICON_MAP: Record<string, string> = {
  running: 'footsteps',
  cycling: 'bicycle',
  swimming: 'water',
  rowing: 'boat',
  hiking: 'trail-sign',
  walking: 'walk',
  elliptical: 'fitness',
  stair_climbing: 'stairs',
  jump_rope: 'flash',
  other: 'ellipse',
} as const;

// Alias for component usage - Ionicon name lookup
export const SPORT_ICONS: Record<string, string> = SPORT_ICON_MAP;

/**
 * Default icon to use when sport type is unknown or invalid
 */
export const DEFAULT_SPORT_ICON = 'ellipse';

/**
 * Get the Ionicons icon name for a given sport type
 * @param sportType - The sport type (e.g., 'running', 'cycling')
 * @returns The icon name for the sport type, or default icon if not found
 */
export const getSportIcon = (sportType: string | null | undefined): string => {
  if (!sportType) {
    return DEFAULT_SPORT_ICON;
  }

  const normalizedSportType = sportType.toLowerCase().trim();
  return SPORT_ICON_MAP[normalizedSportType] || DEFAULT_SPORT_ICON;
};

/**
 * Check if a sport type has a mapped icon
 * @param sportType - The sport type to check
 * @returns True if the sport type has a mapped icon, false otherwise
 */
export const hasSportIcon = (sportType: string | null | undefined): boolean => {
  if (!sportType) {
    return false;
  }

  const normalizedSportType = sportType.toLowerCase().trim();
  return normalizedSportType in SPORT_ICON_MAP;
};

/**
 * Get all sport types that have icons mapped
 * @returns Array of sport types with mapped icons
 */
export const getSportTypesWithIcons = (): string[] => {
  return SPORT_TYPES.filter((sportType) => hasSportIcon(sportType));
};
