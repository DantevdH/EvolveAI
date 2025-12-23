/**
 * HealthImportService - Import workouts from HealthKit (iOS) and Health Connect (Android)
 *
 * Handles:
 * - Querying workouts from health platforms
 * - Mapping health workout types to our sport types
 * - Extracting workout metrics (duration, distance, HR, elevation)
 * - Deduplication via health_workout_id
 *
 * All values are normalized to metric units (meters, seconds, km/h).
 */

import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthActivityOptions,
} from 'react-native-health';
import {
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import {
  HealthWorkout,
  TrackedWorkoutMetrics,
  DataSource,
} from '../types/liveTracking';
import { logger } from '../utils/logger';

// ==================== CONSTANTS ====================

// HealthKit workout type mappings to our sport types
const HEALTHKIT_WORKOUT_TYPES: Record<number, string> = {
  37: 'running',        // HKWorkoutActivityTypeRunning
  13: 'cycling',        // HKWorkoutActivityTypeCycling
  46: 'swimming',       // HKWorkoutActivityTypeSwimming
  35: 'rowing',         // HKWorkoutActivityTypeRowing
  24: 'hiking',         // HKWorkoutActivityTypeHiking
  52: 'walking',        // HKWorkoutActivityTypeWalking
  11: 'elliptical',     // HKWorkoutActivityTypeElliptical
  40: 'stair_climbing', // HKWorkoutActivityTypeStairClimbing
  27: 'jump_rope',      // HKWorkoutActivityTypeJumpRope
};

// Health Connect exercise type mappings
const HEALTH_CONNECT_TYPES: Record<string, string> = {
  'RUNNING': 'running',
  'RUNNING_TREADMILL': 'running',
  'BIKING': 'cycling',
  'BIKING_STATIONARY': 'cycling',
  'SWIMMING_POOL': 'swimming',
  'SWIMMING_OPEN_WATER': 'swimming',
  'ROWING': 'rowing',
  'ROWING_MACHINE': 'rowing',
  'HIKING': 'hiking',
  'WALKING': 'walking',
  'ELLIPTICAL': 'elliptical',
  'STAIR_CLIMBING': 'stair_climbing',
  'STAIR_CLIMBING_MACHINE': 'stair_climbing',
  'JUMP_ROPE': 'jump_rope',
};

// ==================== SERVICE CLASS ====================

class HealthImportServiceImpl {
  private isHealthKitInitialized = false;

  // ==================== AVAILABILITY ====================

  /**
   * Check if health import is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await this.checkHealthKitAvailability();
      } else if (Platform.OS === 'android') {
        return await this.checkHealthConnectAvailability();
      }
      return false;
    } catch (error) {
      logger.error('Health availability check failed', error);
      return false;
    }
  }

  private async checkHealthKitAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((error: any, available: boolean) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(available);
      });
    });
  }

  private async checkHealthConnectAvailability(): Promise<boolean> {
    try {
      const status = await getSdkStatus();
      return status === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  // ==================== WORKOUT QUERIES ====================

  /**
   * Get workouts for a specific date
   */
  async getWorkoutsForDate(date: Date): Promise<HealthWorkout[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getWorkoutsInRange(startOfDay, endOfDay);
  }

  /**
   * Get workouts within a date range
   */
  async getWorkoutsInRange(start: Date, end: Date): Promise<HealthWorkout[]> {
    try {
      if (Platform.OS === 'ios') {
        return await this.getHealthKitWorkouts(start, end);
      } else if (Platform.OS === 'android') {
        return await this.getHealthConnectWorkouts(start, end);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get workouts', error);
      throw error;
    }
  }

  private async getHealthKitWorkouts(start: Date, end: Date): Promise<HealthWorkout[]> {
    // Ensure HealthKit is initialized
    if (!this.isHealthKitInitialized) {
      await this.initializeHealthKit();
    }

    return new Promise((resolve, reject) => {
      const options: HealthActivityOptions = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        type: 'Workout',
      };

      AppleHealthKit.getSamples(
        options,
        (error: any, results: HealthValue[]) => {
          if (error) {
            reject(new Error(`HealthKit query failed: ${error}`));
            return;
          }

          const workouts: HealthWorkout[] = results
            .filter((sample: any) => sample.activityId)
            .map((sample: any) => this.mapHealthKitWorkout(sample))
            .filter((w): w is HealthWorkout => w !== null)
            .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

          resolve(workouts);
        }
      );
    });
  }

  private mapHealthKitWorkout(sample: any): HealthWorkout | null {
    const activityType = sample.activityId || sample.activityName;
    const sportType = this.mapHealthKitType(activityType);

    if (!sportType) return null;

    const startDate = new Date(sample.startDate);
    const endDate = new Date(sample.endDate);
    const durationSeconds = (endDate.getTime() - startDate.getTime()) / 1000;

    return {
      id: sample.id || `hk_${startDate.getTime()}`,
      source: 'healthkit',
      sportType,
      startDate,
      endDate,
      duration: Math.round(durationSeconds),
      distance: sample.distance ? sample.distance * 1000 : null, // km to meters
      averageHeartRate: sample.metadata?.HKAverageHeartRate || null,
      maxHeartRate: sample.metadata?.HKMaximumHeartRate || null,
      minHeartRate: null, // Not directly available
      elevationGain: sample.metadata?.HKElevationAscended || null,
      calories: sample.calories || sample.activeEnergyBurned || null,
      sourceName: sample.sourceName || 'Apple Health',
    };
  }

  private async getHealthConnectWorkouts(start: Date, end: Date): Promise<HealthWorkout[]> {
    try {
      const result = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      });

      const workouts: HealthWorkout[] = [];

      for (const record of result.records) {
        const workout = await this.mapHealthConnectWorkout(record);
        if (workout) {
          workouts.push(workout);
        }
      }

      // Sort by start date descending
      return workouts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    } catch (error) {
      logger.error('Health Connect query failed', error);
      throw error;
    }
  }

  private async mapHealthConnectWorkout(record: any): Promise<HealthWorkout | null> {
    const exerciseType = record.exerciseType;
    const sportType = HEALTH_CONNECT_TYPES[exerciseType] || 'other';

    const startDate = new Date(record.startTime);
    const endDate = new Date(record.endTime);
    const durationSeconds = (endDate.getTime() - startDate.getTime()) / 1000;

    // Fetch additional metrics for this session
    let distance: number | null = null;
    let avgHR: number | null = null;
    let maxHR: number | null = null;
    let minHR: number | null = null;
    let elevationGain: number | null = null;
    let calories: number | null = null;

    try {
      // Get distance
      const distanceRecords = await readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime: record.startTime,
          endTime: record.endTime,
        },
      });
      if (distanceRecords.records.length > 0) {
        distance = distanceRecords.records.reduce(
          (sum: number, r: any) => sum + (r.distance?.inMeters || 0),
          0
        );
      }

      // Get heart rate
      const hrRecords = await readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: record.startTime,
          endTime: record.endTime,
        },
      });
      if (hrRecords.records.length > 0) {
        const hrSamples = hrRecords.records.flatMap((r: any) => r.samples || []);
        if (hrSamples.length > 0) {
          const hrValues = hrSamples.map((s: any) => s.beatsPerMinute);
          avgHR = Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length);
          maxHR = Math.max(...hrValues);
          minHR = Math.min(...hrValues);
        }
      }

      // Get elevation
      const elevationRecords = await readRecords('ElevationGained', {
        timeRangeFilter: {
          operator: 'between',
          startTime: record.startTime,
          endTime: record.endTime,
        },
      });
      if (elevationRecords.records.length > 0) {
        elevationGain = elevationRecords.records.reduce(
          (sum: number, r: any) => sum + (r.elevation?.inMeters || 0),
          0
        );
      }

      // Get calories
      const caloriesRecords = await readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: record.startTime,
          endTime: record.endTime,
        },
      });
      if (caloriesRecords.records.length > 0) {
        calories = Math.round(
          caloriesRecords.records.reduce(
            (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
            0
          )
        );
      }
    } catch (error) {
      logger.warn('Failed to fetch additional metrics for workout', error);
    }

    return {
      id: record.metadata?.id || `hc_${startDate.getTime()}`,
      source: 'google_fit',
      sportType,
      startDate,
      endDate,
      duration: Math.round(durationSeconds),
      distance,
      averageHeartRate: avgHR,
      maxHeartRate: maxHR,
      minHeartRate: minHR,
      elevationGain,
      calories,
      sourceName: record.metadata?.dataOrigin || 'Health Connect',
    };
  }

  // ==================== IMPORT ====================

  /**
   * Import a workout by ID and convert to TrackedWorkoutMetrics
   */
  async importWorkout(workoutId: string): Promise<TrackedWorkoutMetrics> {
    // Find the workout in today's workouts
    const today = new Date();
    const workouts = await this.getWorkoutsForDate(today);

    // Also check yesterday if not found (for late-night workouts)
    let workout = workouts.find((w) => w.id === workoutId);
    if (!workout) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayWorkouts = await this.getWorkoutsForDate(yesterday);
      workout = yesterdayWorkouts.find((w) => w.id === workoutId);
    }

    if (!workout) {
      throw new Error('Workout not found');
    }

    return this.workoutToMetrics(workout);
  }

  /**
   * Convert a HealthWorkout to TrackedWorkoutMetrics
   */
  workoutToMetrics(workout: HealthWorkout): TrackedWorkoutMetrics {
    // Calculate average pace if we have distance and duration
    let averagePace: number | null = null;
    let averageSpeed: number | null = null;

    if (workout.distance && workout.distance > 0 && workout.duration > 0) {
      // Pace in seconds per km
      averagePace = Math.round((workout.duration / workout.distance) * 1000);
      // Speed in km/h
      averageSpeed = (workout.distance / 1000) / (workout.duration / 3600);
    }

    const dataSource: DataSource = workout.source === 'healthkit' ? 'healthkit' : 'google_fit';

    return {
      actualDuration: workout.duration,
      actualDistance: workout.distance || 0,
      averagePace,
      averageSpeed,
      averageHeartRate: workout.averageHeartRate,
      maxHeartRate: workout.maxHeartRate,
      minHeartRate: workout.minHeartRate,
      elevationGain: workout.elevationGain,
      elevationLoss: null, // Not typically available from health imports
      calories: workout.calories,
      cadence: null, // Would need specific cadence records
      dataSource,
      healthWorkoutId: workout.id,
      startedAt: workout.startDate,
      completedAt: workout.endDate,
    };
  }

  // ==================== TYPE MAPPING ====================

  /**
   * Map health platform workout type to our sport type
   */
  mapHealthWorkoutType(healthType: string | number): string {
    if (typeof healthType === 'number') {
      return HEALTHKIT_WORKOUT_TYPES[healthType] || 'other';
    }
    return HEALTH_CONNECT_TYPES[healthType] || 'other';
  }

  private mapHealthKitType(activityId: number | string): string | null {
    if (typeof activityId === 'number') {
      return HEALTHKIT_WORKOUT_TYPES[activityId] || 'other';
    }

    // Try to match by name
    const normalizedName = String(activityId).toLowerCase().replace(/[^a-z]/g, '');
    if (normalizedName.includes('run')) return 'running';
    if (normalizedName.includes('cycl') || normalizedName.includes('bik')) return 'cycling';
    if (normalizedName.includes('swim')) return 'swimming';
    if (normalizedName.includes('row')) return 'rowing';
    if (normalizedName.includes('hik')) return 'hiking';
    if (normalizedName.includes('walk')) return 'walking';
    if (normalizedName.includes('ellip')) return 'elliptical';
    if (normalizedName.includes('stair') || normalizedName.includes('climb')) return 'stair_climbing';
    if (normalizedName.includes('jump') || normalizedName.includes('rope')) return 'jump_rope';

    return 'other';
  }

  // ==================== INITIALIZATION ====================

  private async initializeHealthKit(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.DistanceCycling,
          AppleHealthKit.Constants.Permissions.DistanceSwimming,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.FlightsClimbed,
        ],
        write: [],
      },
    };

    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          reject(new Error(`HealthKit init failed: ${error}`));
          return;
        }
        this.isHealthKitInitialized = true;
        resolve();
      });
    });
  }
}

// ==================== SINGLETON EXPORT ====================

export const HealthImportService = new HealthImportServiceImpl();
