/**
 * LiveTrackingService - GPS-based workout tracking
 *
 * Handles:
 * - Real-time GPS location tracking
 * - Distance calculation using Haversine formula
 * - Pace and speed computation
 * - Elevation tracking
 * - Auto-pause detection
 * - Background tracking with foreground service
 *
 * All values stored in metric (meters, seconds, km/h) - converted for display elsewhere.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, AppState, AppStateStatus } from 'react-native';
import {
  TrackingState,
  TrackingStatus,
  LocationPoint,
  GPSSignalQuality,
  TrackedWorkoutMetrics,
} from '../types/liveTracking';
import { logger } from '../utils/logger';

// ==================== CONSTANTS ====================

const BACKGROUND_LOCATION_TASK = 'EVOLVE_BACKGROUND_LOCATION';

// GPS settings optimized for workout tracking
const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,       // Minimum distance (meters) between updates
  timeInterval: 1000,        // Minimum time (ms) between updates
  deferredUpdatesInterval: 1000,
  deferredUpdatesDistance: 5,
  foregroundService: {
    notificationTitle: 'EvolveAI Workout',
    notificationBody: 'Tracking your workout...',
    notificationColor: '#7A1E1E',
  },
};

// Auto-pause settings (tuned for real-world use)
const AUTO_PAUSE = {
  speedThreshold: 0.8,       // m/s (~2.9 km/h) - below this speed, consider stopped
  durationThreshold: 5000,   // ms - must be below speed for this long to auto-pause
  resumeSpeedThreshold: 1.2, // m/s (~4.3 km/h) - above this speed, auto-resume
};

// GPS signal quality thresholds (meters)
const GPS_QUALITY = {
  excellent: 5,
  good: 10,
  fair: 20,
  poor: 50,
};

// Minimum distance between points to count (filters GPS noise)
const MIN_DISTANCE_THRESHOLD = 2; // meters

// Pace smoothing window (number of recent segments to average)
const PACE_SMOOTHING_WINDOW = 10; // ~10 seconds of data for smoother pace

// Elevation filter threshold (GPS altitude noise is typically ±5-20m)
const ELEVATION_THRESHOLD = 3; // meters - only count changes >= 3m

// Minimum speed for pace calculation to avoid division issues
const MIN_SPEED_FOR_PACE = 0.1; // m/s

// ==================== HAVERSINE FORMULA ====================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ==================== SERVICE CLASS ====================

type StateSubscriber = (state: TrackingState) => void;

class LiveTrackingServiceImpl {
  private state: TrackingState;
  private subscribers: Set<StateSubscriber> = new Set();
  private locationSubscription: Location.LocationSubscription | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  // Tracking data
  private recentSpeeds: number[] = [];     // For pace smoothing
  private lastMovementTime: number = 0;    // For auto-pause detection
  private previousAltitude: number | null = null;
  private userWeightKg: number = 70;       // Default weight, can be updated

  constructor() {
    this.state = this.getInitialState();
  }

  /**
   * Set user weight for more accurate calorie estimation
   * @param weightKg Weight in kilograms
   */
  setUserWeight(weightKg: number): void {
    if (weightKg > 0 && weightKg < 500) {
      this.userWeightKg = weightKg;
    }
  }

  private getInitialState(): TrackingState {
    return {
      status: 'idle',
      enduranceSessionId: null,
      sportType: null,
      startedAt: null,
      elapsedSeconds: 0,
      pausedAt: null,
      totalPausedSeconds: 0,
      distanceMeters: 0,
      currentPaceSecondsPerKm: null,
      averagePaceSecondsPerKm: null,
      averageSpeedKmh: null,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      currentAltitudeMeters: null,
      gpsSignal: { accuracy: Infinity, quality: 'none' },
      lastLocation: null,
      error: null,
    };
  }

  // ==================== PUBLIC API ====================

  /**
   * Check GPS availability and signal quality
   */
  async checkGPSAvailability(): Promise<GPSSignalQuality> {
    try {
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        return { accuracy: Infinity, quality: 'none' };
      }

      // Get current location to check accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return this.getSignalQuality(location.coords.accuracy ?? Infinity);
    } catch (error) {
      logger.error('GPS availability check failed', error);
      return { accuracy: Infinity, quality: 'none' };
    }
  }

  /**
   * Start GPS tracking for a workout session
   * Idempotent - if called during countdown for same session, allows transition to tracking
   */
  async startTracking(sessionId: string, sportType: string): Promise<void> {
    // Already actively tracking - reject
    if (
      this.state.status === 'tracking' ||
      this.state.status === 'paused' ||
      this.state.status === 'auto_paused'
    ) {
      // If same session, just log and return (idempotent)
      if (this.state.enduranceSessionId === sessionId) {
        logger.info('startTracking called for already active session - ignoring', { sessionId });
        return;
      }
      throw new Error('Tracking already in progress');
    }

    // In stopping/summary/saving states - reject
    if (
      this.state.status === 'stopping' ||
      this.state.status === 'summary' ||
      this.state.status === 'saving'
    ) {
      throw new Error(`Cannot start tracking from state: ${this.state.status}`);
    }

    // Valid transitions: idle -> tracking, countdown -> tracking
    try {
      // Reset state
      this.state = {
        ...this.getInitialState(),
        status: 'tracking',
        enduranceSessionId: sessionId,
        sportType,
        startedAt: new Date(),
      };

      // Reset tracking data
      this.recentSpeeds = [];
      this.lastMovementTime = Date.now();
      this.previousAltitude = null;

      // Start location tracking
      await this.startLocationUpdates();

      // Start elapsed time timer
      this.startTimer();

      // Listen for app state changes (background/foreground)
      this.setupAppStateListener();

      this.notifySubscribers();
      logger.info('Live tracking started', { sessionId, sportType });
    } catch (error) {
      this.state.status = 'idle';
      this.state.error = error instanceof Error ? error.message : 'Failed to start tracking';
      this.notifySubscribers();
      throw error;
    }
  }

  /**
   * Pause tracking (manual pause)
   */
  pauseTracking(): void {
    if (this.state.status !== 'tracking') return;

    this.state = {
      ...this.state,
      status: 'paused',
      pausedAt: new Date(),
    };

    this.stopTimer();
    this.notifySubscribers();
    logger.info('Tracking paused');
  }

  /**
   * Resume tracking from pause
   */
  resumeTracking(): void {
    if (this.state.status !== 'paused' && this.state.status !== 'auto_paused') return;

    // Calculate paused duration
    if (this.state.pausedAt) {
      const pausedDuration = (Date.now() - this.state.pausedAt.getTime()) / 1000;
      this.state.totalPausedSeconds += pausedDuration;
    }

    this.state = {
      ...this.state,
      status: 'tracking',
      pausedAt: null,
    };

    this.startTimer();
    this.lastMovementTime = Date.now();
    this.notifySubscribers();
    logger.info('Tracking resumed');
  }

  /**
   * Stop tracking and return final metrics
   */
  async stopTracking(): Promise<TrackedWorkoutMetrics> {
    if (
      this.state.status !== 'tracking' &&
      this.state.status !== 'paused' &&
      this.state.status !== 'auto_paused'
    ) {
      throw new Error('No active tracking session');
    }

    this.state.status = 'stopping';
    this.notifySubscribers();

    // Clean up
    await this.cleanup();

    const completedAt = new Date();
    // Use startedAt if available, otherwise fall back to calculating from elapsed time
    const startedAt = this.state.startedAt ?? new Date(completedAt.getTime() - (this.state.elapsedSeconds * 1000));

    const metrics: TrackedWorkoutMetrics = {
      actualDuration: this.state.elapsedSeconds,
      actualDistance: this.state.distanceMeters,
      averagePace: this.state.averagePaceSecondsPerKm,
      averageSpeed: this.state.averageSpeedKmh,
      averageHeartRate: null,  // Not tracked in live mode (per decision)
      maxHeartRate: null,
      minHeartRate: null,
      elevationGain: this.state.elevationGainMeters > 0 ? this.state.elevationGainMeters : null,
      elevationLoss: this.state.elevationLossMeters > 0 ? this.state.elevationLossMeters : null,
      calories: this.estimateCalories(),
      cadence: null,  // Would require accelerometer
      dataSource: 'live_tracking',
      healthWorkoutId: null,
      startedAt,
      completedAt,
    };

    this.state = {
      ...this.getInitialState(),
      status: 'summary',
    };
    this.notifySubscribers();

    logger.info('Tracking stopped', {
      duration: metrics.actualDuration,
      distance: metrics.actualDistance,
    });

    return metrics;
  }

  /**
   * Discard tracking without saving
   */
  async discardTracking(): Promise<void> {
    await this.cleanup();
    this.state = this.getInitialState();
    this.notifySubscribers();
    logger.info('Tracking discarded');
  }

  /**
   * Get current tracking state
   */
  getState(): TrackingState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ==================== PRIVATE METHODS ====================

  private notifySubscribers(): void {
    const stateCopy = { ...this.state };
    this.subscribers.forEach((callback) => callback(stateCopy));
  }

  private getSignalQuality(accuracy: number): GPSSignalQuality {
    let quality: GPSSignalQuality['quality'];
    if (accuracy <= GPS_QUALITY.excellent) {
      quality = 'excellent';
    } else if (accuracy <= GPS_QUALITY.good) {
      quality = 'good';
    } else if (accuracy <= GPS_QUALITY.fair) {
      quality = 'fair';
    } else if (accuracy <= GPS_QUALITY.poor) {
      quality = 'poor';
    } else {
      quality = 'none';
    }
    return { accuracy, quality };
  }

  private async startLocationUpdates(): Promise<void> {
    // Request foreground location first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Request background location for continuous tracking
    if (Platform.OS !== 'web') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        logger.warn('Background location not granted - tracking may stop when app is backgrounded');
      }
    }

    // Get initial location to show GPS status immediately
    try {
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      this.state.gpsSignal = this.getSignalQuality(initialLocation.coords.accuracy ?? Infinity);
      this.state.lastLocation = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        altitude: initialLocation.coords.altitude,
        accuracy: initialLocation.coords.accuracy ?? Infinity,
        timestamp: initialLocation.timestamp,
        speed: initialLocation.coords.speed,
      };
      this.state.currentAltitudeMeters = initialLocation.coords.altitude;
      this.previousAltitude = initialLocation.coords.altitude;
      this.notifySubscribers();
      logger.info('Initial GPS fix obtained', {
        accuracy: initialLocation.coords.accuracy,
        quality: this.state.gpsSignal.quality
      });
    } catch (error) {
      logger.warn('Could not get initial location', error);
      // Continue anyway - watchPositionAsync will get updates
    }

    // Start watching location
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: LOCATION_CONFIG.accuracy,
        distanceInterval: LOCATION_CONFIG.distanceInterval,
        timeInterval: LOCATION_CONFIG.timeInterval,
      },
      this.handleLocationUpdate.bind(this)
    );

    // Start background task on supported platforms
    if (Platform.OS !== 'web') {
      await this.startBackgroundTask();
    }
  }

  private async startBackgroundTask(): Promise<void> {
    try {
      const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        // Task will be defined in the app's entry point
        logger.warn('Background location task not defined');
        return;
      }

      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: LOCATION_CONFIG.accuracy,
          distanceInterval: LOCATION_CONFIG.distanceInterval,
          deferredUpdatesInterval: LOCATION_CONFIG.deferredUpdatesInterval,
          deferredUpdatesDistance: LOCATION_CONFIG.deferredUpdatesDistance,
          showsBackgroundLocationIndicator: true,
          foregroundService: LOCATION_CONFIG.foregroundService,
        });
        logger.info('Background location task started');
      }
    } catch (error) {
      logger.error('Failed to start background task', error);
      // Continue without background tracking
    }
  }

  private handleLocationUpdate(location: Location.LocationObject): void {
    if (this.state.status !== 'tracking') return;

    const newPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy ?? Infinity,
      timestamp: location.timestamp,
      speed: location.coords.speed,
    };

    // Update GPS signal quality
    this.state.gpsSignal = this.getSignalQuality(newPoint.accuracy);

    // Skip inaccurate readings
    if (newPoint.accuracy > GPS_QUALITY.poor) {
      this.notifySubscribers();
      return;
    }

    // Calculate distance from last point
    if (this.state.lastLocation) {
      const distance = calculateDistance(
        this.state.lastLocation.latitude,
        this.state.lastLocation.longitude,
        newPoint.latitude,
        newPoint.longitude
      );

      // Filter out GPS noise
      if (distance >= MIN_DISTANCE_THRESHOLD) {
        this.state.distanceMeters += distance;

        // Calculate current speed/pace
        const timeDelta = (newPoint.timestamp - this.state.lastLocation.timestamp) / 1000;
        if (timeDelta > 0) {
          const speedMps = distance / timeDelta;
          this.updatePaceAndSpeed(speedMps);

          // Auto-pause detection
          this.handleAutoPause(speedMps);
        }

        // Track elevation changes
        this.updateElevation(newPoint.altitude);
      }
    } else {
      // First point - initialize altitude tracking
      this.previousAltitude = newPoint.altitude;
    }

    this.state.lastLocation = newPoint;
    this.state.currentAltitudeMeters = newPoint.altitude;
    this.notifySubscribers();
  }

  private updatePaceAndSpeed(speedMps: number): void {
    // Store recent speeds for smoothing
    this.recentSpeeds.push(speedMps);
    if (this.recentSpeeds.length > PACE_SMOOTHING_WINDOW) {
      this.recentSpeeds.shift();
    }

    // Calculate smoothed current speed
    const smoothedSpeed = this.recentSpeeds.reduce((a, b) => a + b, 0) / this.recentSpeeds.length;

    // Convert to pace (seconds per km) - only if moving fast enough to calculate
    if (smoothedSpeed > MIN_SPEED_FOR_PACE) {
      this.state.currentPaceSecondsPerKm = Math.round(1000 / smoothedSpeed);
    }

    // Calculate average speed/pace from total distance and time
    if (this.state.elapsedSeconds > 0 && this.state.distanceMeters > 0) {
      const avgSpeedMps = this.state.distanceMeters / this.state.elapsedSeconds;
      // Only calculate pace if moving fast enough (avoid Infinity/huge numbers)
      if (avgSpeedMps > MIN_SPEED_FOR_PACE) {
        this.state.averageSpeedKmh = (avgSpeedMps * 3600) / 1000;
        this.state.averagePaceSecondsPerKm = Math.round(1000 / avgSpeedMps);
      }
    }
  }

  private updateElevation(altitude: number | null): void {
    if (altitude === null || this.previousAltitude === null) {
      this.previousAltitude = altitude;
      return;
    }

    const elevationChange = altitude - this.previousAltitude;

    // Only count significant changes (filter GPS noise which is typically ±5-20m)
    if (Math.abs(elevationChange) >= ELEVATION_THRESHOLD) {
      if (elevationChange > 0) {
        this.state.elevationGainMeters += elevationChange;
      } else {
        this.state.elevationLossMeters += Math.abs(elevationChange);
      }
      this.previousAltitude = altitude;
    }
  }

  private handleAutoPause(speedMps: number): void {
    const now = Date.now();

    if (speedMps >= AUTO_PAUSE.speedThreshold) {
      this.lastMovementTime = now;

      // Auto-resume if we were auto-paused
      if (this.state.status === 'auto_paused' && speedMps >= AUTO_PAUSE.resumeSpeedThreshold) {
        this.resumeTracking();
      }
    } else if (
      this.state.status === 'tracking' &&
      now - this.lastMovementTime > AUTO_PAUSE.durationThreshold
    ) {
      // Auto-pause
      this.state = {
        ...this.state,
        status: 'auto_paused',
        pausedAt: new Date(),
      };
      this.stopTimer();
      this.notifySubscribers();
      logger.info('Auto-paused due to no movement');
    }
  }

  private startTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      if (this.state.status === 'tracking') {
        this.state.elapsedSeconds += 1;
        this.notifySubscribers();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App came to foreground - ensure timer is running if tracking
      if (this.state.status === 'tracking' && !this.timerInterval) {
        this.startTimer();
      }
    }
    // Background tracking continues via background task
  }

  private estimateCalories(): number | null {
    // Basic calorie estimation based on duration, sport type, and user weight
    // Uses MET (Metabolic Equivalent of Task) formula
    if (this.state.elapsedSeconds < 60) return null;

    const minutes = this.state.elapsedSeconds / 60;

    // MET values by sport type (approximate, based on Compendium of Physical Activities)
    const metValues: Record<string, number> = {
      running: 10,
      cycling: 8,
      swimming: 7,
      rowing: 7,
      hiking: 6,
      walking: 4,
      elliptical: 5,
      stair_climbing: 9,
      jump_rope: 12,
      other: 6,
    };

    const met = metValues[this.state.sportType || 'other'] || 6;

    // Calories = MET × weight(kg) × time(hours)
    // Uses actual user weight if set via setUserWeight()
    const calories = met * this.userWeightKg * (minutes / 60);

    return Math.round(calories);
  }

  private async cleanup(): Promise<void> {
    this.stopTimer();

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Stop background task
    if (Platform.OS !== 'web') {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      } catch (error) {
        logger.error('Failed to stop background task', error);
      }
    }

    this.recentSpeeds = [];
    this.previousAltitude = null;
  }
}

// ==================== SINGLETON EXPORT ====================

export const LiveTrackingService = new LiveTrackingServiceImpl();

// ==================== BACKGROUND TASK DEFINITION ====================

/**
 * Define the background location task
 * This must be called in the app's entry point (e.g., App.tsx or index.ts)
 */
export function defineBackgroundLocationTask(): void {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      logger.error('Background location error', error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        // Process each location update in background mode
        // The service singleton persists across foreground/background transitions
        for (const location of locations) {
          // Only process if we're actively tracking
          const currentState = LiveTrackingService.getState();
          if (currentState.status === 'tracking') {
            // The handleLocationUpdate method is private, so we trigger via the subscription
            // by updating the location directly through the service's location handler
            // Note: The foreground subscription handles this, but in pure background mode
            // we need to manually trigger the update
            (LiveTrackingService as any).handleLocationUpdate(location);
          }
        }
      }
    }
  });
}

// ==================== UTILITY EXPORTS ====================

export { calculateDistance, BACKGROUND_LOCATION_TASK };
