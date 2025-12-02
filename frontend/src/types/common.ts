/**
 * Common type definitions for better type safety
 * These types are used across multiple components to avoid type assertions
 */

/**
 * Type for LinearGradient colors prop
 * Expo LinearGradient requires at least 2 colors
 */
export type GradientColors = [string, string, ...string[]];

/**
 * Filter options for exercise search
 */
export interface ExerciseFilterOptions {
  targetAreas: string[];
  equipment: string[];
  difficulties: string[];
}

/**
 * Type guard to ensure array has at least 2 elements for LinearGradient
 */
export function isGradientColors(colors: string[]): colors is GradientColors {
  return colors.length >= 2;
}

/**
 * Creates a properly typed gradient colors array
 */
export function createGradientColors(...colors: string[]): GradientColors {
  if (colors.length < 2) {
    throw new Error('Gradient must have at least 2 colors');
  }
  return colors as GradientColors;
}

