/**
 * Background Tasks Configuration
 *
 * Defines and registers background tasks used by the app.
 * Must be called at app initialization (before any component renders).
 */

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';

// Task identifiers
export const BACKGROUND_LOCATION_TASK = 'EVOLVE_BACKGROUND_LOCATION';

/**
 * Initialize all background tasks
 * Call this in App.tsx or index.ts before any component renders
 */
export function initializeBackgroundTasks(): void {
  if (Platform.OS === 'web') {
    return; // Background tasks not supported on web
  }

  // Define background location task
  if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, handleBackgroundLocation);
    logger.info('Background location task defined');
  }
}

/**
 * Background location task handler
 * Called when new location data is available while app is in background
 */
async function handleBackgroundLocation({
  data,
  error,
}: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>): Promise<void> {
  if (error) {
    logger.error('Background location error', error);
    return;
  }

  if (data?.locations && data.locations.length > 0) {
    // The LiveTrackingService handles location updates via its subscription
    // In background mode, the foreground service keeps the process alive
    // so the subscription continues to work.
    //
    // This handler is primarily for logging/debugging.
    // Real location processing happens in LiveTrackingService.handleLocationUpdate()

    const latestLocation = data.locations[data.locations.length - 1];
    logger.debug('Background location received', {
      lat: latestLocation.coords.latitude.toFixed(4),
      lon: latestLocation.coords.longitude.toFixed(4),
      accuracy: latestLocation.coords.accuracy?.toFixed(1),
    });
  }
}

/**
 * Check if background location task is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Stop background location task if running
 */
export async function stopBackgroundLocation(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const isRunning = await isBackgroundLocationRunning();
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      logger.info('Background location task stopped');
    }
  } catch (error) {
    logger.error('Failed to stop background location task', error);
  }
}
