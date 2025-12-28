/**
 * Permission Constants
 * 
 * Centralized constants for health and location permissions
 */

import type { Permission } from 'react-native-health-connect';

/**
 * Health read permissions required for workout tracking
 */
export const HEALTH_READ_PERMISSIONS = [
  'Workout',
  'HeartRate',
  'DistanceWalkingRunning',
  'StepCount',
  'ActiveEnergyBurned',
] as const;

export type HealthReadPermission = typeof HEALTH_READ_PERMISSIONS[number];

/**
 * Health Connect permissions for Android
 */
export const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];

/**
 * Permission check timeout (10 seconds)
 */
export const PERMISSION_CHECK_TIMEOUT = 10000;

/**
 * Permission status cache TTL (5 seconds)
 */
export const PERMISSION_CACHE_TTL = 5000;

/**
 * Retry configuration for permission requests
 */
export const PERMISSION_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
} as const;






