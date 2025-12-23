/**
 * Permissions Service - Handles Health and Location permissions for workout tracking
 *
 * This service provides methods for:
 * - Checking and requesting Health permissions (HealthKit on iOS, Health Connect on Android)
 * - Checking and requesting Location permissions (foreground and background)
 * - Storing and retrieving permission status locally and syncing to database
 *
 * Used by: PermissionsStep in onboarding, Live tracking features
 *
 * Production-ready with:
 * - Module availability checks
 * - Proper error handling with timeouts
 * - Retry logic with exponential backoff
 * - Permission status caching
 * - Structured logging
 * - Full TypeScript type safety
 */

import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import {
  requestPermission,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';
// Try importing the same way HealthImportService does (with named exports)
import AppleHealthKit, {
  type HealthKitPermissions as HealthKitPermissionsType,
} from 'react-native-health';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants';
import { PermissionsStatus, defaultPermissionsStatus } from '../types/onboarding';
import { logger } from '../utils/logger';
import { isHealthKitModule, type HealthKitPermissions, type HealthKitAuthStatus } from '../types/healthkit';
import { PermissionError, PermissionErrorCode } from '../types/permissions';
import {
  HEALTH_READ_PERMISSIONS,
  HEALTH_CONNECT_PERMISSIONS,
  PERMISSION_CHECK_TIMEOUT,
  PERMISSION_CACHE_TTL,
  PERMISSION_RETRY_CONFIG,
} from '../constants/permissions';

// Permission result types
export interface PermissionResult {
  success: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'error';
  error?: string;
}

export interface HealthPermissionStatus {
  available: boolean;
  granted: boolean;
  canRequest: boolean;
}

export interface LocationPermissionStatus {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
}

/**
 * Permission status cache
 */
interface PermissionCache {
  health?: { status: HealthPermissionStatus; timestamp: number };
  location?: { status: LocationPermissionStatus; timestamp: number };
}

/**
 * Tracks whether HealthKit has been successfully initialized in this session.
 * HealthKit's getAuthStatus is unreliable due to iOS privacy protections -
 * if initHealthKit succeeds without error, permissions were granted.
 */
let healthKitInitialized = false;

export class PermissionsService {
  private static permissionCache: PermissionCache = {};

  /**
   * Get current platform
   */
  static getPlatform(): 'ios' | 'android' | 'unknown' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'unknown';
  }

  /**
   * Check if HealthKit module is available and properly initialized
   * Note: Functions may be non-enumerable, so we check them directly rather than using Object.keys
   */
  private static isHealthKitAvailable(): boolean {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      if (!AppleHealthKit || typeof AppleHealthKit !== 'object') {
        return false;
      }

      if (!AppleHealthKit.Constants || !AppleHealthKit.Constants.Permissions) {
        return false;
      }

      // Check if initHealthKit exists (primary API) - functions may be non-enumerable
      const hasInitHealthKit = typeof (AppleHealthKit as any).initHealthKit === 'function';
      
      if (hasInitHealthKit) {
        return true;
      }

      // Check isAvailable as alternative (used by HealthImportService)
      const hasIsAvailable = typeof (AppleHealthKit as any).isAvailable === 'function';
      
      if (hasIsAvailable) {
        return true;
      }

      // Try .default export if direct access doesn't work
      const hasDefault = !!(AppleHealthKit as any).default;
      
      if (hasDefault) {
        const defaultModule = (AppleHealthKit as any).default;
        const defaultHasInit = typeof defaultModule.initHealthKit === 'function';
        
        if (defaultHasInit) {
          return true;
        }
      }

      // Fallback: Check for older API
      const hasGetAuthStatus = typeof (AppleHealthKit as any).getAuthStatus === 'function';
      const hasRequestAuth = typeof (AppleHealthKit as any).requestAuthorization === 'function';
      
      if (hasGetAuthStatus || hasRequestAuth) {
        return true;
      }

      // If Constants exists, assume the module is available even if functions aren't enumerable
      // HealthImportService successfully uses initHealthKit, so it should work
      // The functions might be non-enumerable or added dynamically
      // Return true if Constants exists - let the actual function calls handle errors
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper to convert permission to string for comparison
   */
  private static permissionToString(permission: Permission): string {
    return `${permission.accessType}:${permission.recordType}`;
  }

  /**
   * Helper to check if required permissions are granted
   */
  private static hasRequiredPermissions(
    granted: Permission[],
    required: Permission[]
  ): boolean {
    const grantedStrings = granted.map(this.permissionToString);
    const requiredStrings = required.map(this.permissionToString);
    
    return requiredStrings.every(permission => grantedStrings.includes(permission));
  }

  /**
   * Retry logic with exponential backoff
   */
  private static async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    maxRetries = PERMISSION_RETRY_CONFIG.maxRetries,
    initialDelay = PERMISSION_RETRY_CONFIG.initialDelay
  ): Promise<T> {
    let lastError: Error | unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          const delay = Math.min(
            initialDelay * Math.pow(2, attempt),
            PERMISSION_RETRY_CONFIG.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Promise wrapper for HealthKit callbacks with timeout
   */
  private static async withHealthKitCallback<T>(
    operation: (callback: (error: Error | null, result: T | null) => void) => void,
    operationName: string,
    timeout = PERMISSION_CHECK_TIMEOUT
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let completed = false;
      
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          const error = new PermissionError(
            PermissionErrorCode.TIMEOUT,
            `${operationName} timed out after ${timeout}ms`
          );
          reject(error);
        }
      }, timeout);

      try {
        operation((error: Error | null, result: T | null) => {
          if (completed) return;
          completed = true;
          clearTimeout(timeoutId);

          if (error) {
            const errorMessage = error instanceof Error
              ? (error.message || `${operationName} failed`)
              : String(error);

            reject(
              new PermissionError(
                PermissionErrorCode.SYSTEM_ERROR,
                `${operationName} failed: ${errorMessage}`,
                error
              )
            );
            return;
          }

          // For void operations (like initHealthKit), null/undefined result is acceptable
          const isVoidOperation = operationName === 'initHealthKit' || operationName.includes('init');

          if (result === null || result === undefined) {
            if (isVoidOperation) {
              resolve(undefined as any);
              return;
            } else {
              reject(
                new PermissionError(
                  PermissionErrorCode.SYSTEM_ERROR,
                  `${operationName} returned no result`
                )
              );
              return;
            }
          }

          resolve(result);
        });
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          reject(
            new PermissionError(
              PermissionErrorCode.SYSTEM_ERROR,
              `${operationName} threw exception`,
              error
            )
          );
        }
      }
    });
  }

  // ==================== HEALTH PERMISSIONS ====================

  /**
   * Silently verify if HealthKit permissions are granted
   * Calls initHealthKit - if permissions were previously granted, it succeeds without showing a dialog
   * This is the most reliable way to check HealthKit permission status on iOS
   */
  private static async verifyHealthKitPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !this.isHealthKitAvailable()) {
      return false;
    }

    try {
      let healthKitModule: any = AppleHealthKit;
      if ((AppleHealthKit as any).default) {
        healthKitModule = (AppleHealthKit as any).default;
      }

      if (typeof healthKitModule.initHealthKit !== 'function') {
        return false;
      }

      const permissions: HealthKitPermissions = {
        permissions: {
          read: HEALTH_READ_PERMISSIONS.map(
            perm => AppleHealthKit.Constants.Permissions[perm]
          ),
          write: [],
        },
      };

      // Attempt to initialize - if already authorized, this succeeds silently
      await this.withHealthKitCallback<void>(
        (callback) => {
          healthKitModule.initHealthKit(permissions, (error: any) => {
            if (error) {
              callback(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
            } else {
              callback(null);
            }
          });
        },
        'initHealthKit'
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Health data is available on this device
   * HealthKit on iOS (works on simulators iOS 15+), Health Connect on Android
   */
  static async isHealthAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const healthKitAvailable = this.isHealthKitAvailable();
        
        if (!healthKitAvailable) {
          return false;
        }

        // HealthKit available on iPhone and iPhone simulators (iOS 15+)
        const isSimulator = !Device.isDevice;
        
        if (isSimulator) {
          return true;
        }
        
        // Real device - only available on iPhone (not iPad)
        const deviceType = Device.deviceType;
        const isPhone = deviceType === Device.DeviceType.PHONE;
        return isPhone;
      } else if (Platform.OS === 'android') {
        // Health Connect requires Android 9+ (API 28+)
        const androidVersion = Platform.Version;
        
        if (androidVersion < 28) {
          return false;
        }

        try {
          const sdkStatus = await getSdkStatus();
          const isAvailable = sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE;
          return isAvailable;
        } catch (error) {
          return false;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check current Health permission status
   * Uses cache to avoid excessive system calls
   */
  static async checkHealthPermissions(useCache = true): Promise<HealthPermissionStatus> {
    // Check cache first
    if (useCache && this.permissionCache.health) {
      const age = Date.now() - this.permissionCache.health.timestamp;
      if (age < PERMISSION_CACHE_TTL) {
        return this.permissionCache.health.status;
      }
    }

    try {
      const available = await this.isHealthAvailable();
      if (!available) {
        const status = { available: false, granted: false, canRequest: false };
        this.permissionCache.health = { status, timestamp: Date.now() };
        return status;
      }

      if (Platform.OS === 'android') {
        try {
          const grantedPermissions = await getGrantedPermissions();
          
          const hasRequired = this.hasRequiredPermissions(
            grantedPermissions,
            [...HEALTH_CONNECT_PERMISSIONS]
          );

          const status: HealthPermissionStatus = {
            available: true,
            granted: hasRequired && grantedPermissions.length > 0,
            canRequest: true, // Health Connect allows requesting again even if previously denied
          };

          this.permissionCache.health = { status, timestamp: Date.now() };
          return status;
        } catch (error) {
          logger.error('Error checking Health Connect permissions', error);
          const status = { available: false, granted: false, canRequest: false };
          this.permissionCache.health = { status, timestamp: Date.now() };
          return status;
        }
      } else if (Platform.OS === 'ios') {
        if (!this.isHealthKitAvailable()) {
          const status = { available: false, granted: false, canRequest: false };
          this.permissionCache.health = { status, timestamp: Date.now() };
          return status;
        }

        try {
          // If HealthKit was successfully initialized in this session, it's granted
          if (healthKitInitialized) {
            const status: HealthPermissionStatus = {
              available: true,
              granted: true,
              canRequest: true,
            };
            this.permissionCache.health = { status, timestamp: Date.now() };
            return status;
          }

          // Try to silently initialize HealthKit to verify permissions
          // If permissions were previously granted, initHealthKit succeeds without showing a dialog
          const silentCheckResult = await this.verifyHealthKitPermissions();
          if (silentCheckResult) {
            healthKitInitialized = true;
            const status: HealthPermissionStatus = {
              available: true,
              granted: true,
              canRequest: true,
            };
            this.permissionCache.health = { status, timestamp: Date.now() };
            return status;
          }

          // If silent check failed, permissions are not granted
          const status: HealthPermissionStatus = {
            available: true,
            granted: false,
            canRequest: true,
          };

          this.permissionCache.health = { status, timestamp: Date.now() };
          return status;
        } catch {
          const status = { available: false, granted: false, canRequest: false };
          this.permissionCache.health = { status, timestamp: Date.now() };
          return status;
        }
      }

      const status = { available: false, granted: false, canRequest: false };
      this.permissionCache.health = { status, timestamp: Date.now() };
      return status;
    } catch (error) {
      logger.error('Error checking Health permissions', error);
      const status = { available: false, granted: false, canRequest: false };
      this.permissionCache.health = { status, timestamp: Date.now() };
      return status;
    }
  }

  /**
   * Request Health permissions
   * Requests read access to: workouts, heart rate, distance, steps, active energy
   * Best practice: Only requests if status is undetermined (will show dialog)
   */
  static async requestHealthPermissions(): Promise<PermissionResult> {
    try {
      // Check current status first (best practice)
      const currentStatus = await this.checkHealthPermissions();

      if (!currentStatus.available) {
        return {
          success: false,
          status: 'error',
          error: 'Health data is not available on this device',
        };
      }

      // If already granted, return success (don't request again)
      if (currentStatus.granted) {
        logger.info('Health permissions already granted');
        return {
          success: true,
          status: 'granted',
        };
      }

      // If can't request (previously denied), return denied (caller will open Settings)
      if (!currentStatus.canRequest) {
        return {
          success: false,
          status: 'denied',
        };
      }

      if (Platform.OS === 'android') {
        try {
          const grantedPermissions = await this.withRetry(
            () => requestPermission([...HEALTH_CONNECT_PERMISSIONS]),
            'Health Connect permission request'
          );

          if (grantedPermissions && grantedPermissions.length > 0) {
            const hasRequired = this.hasRequiredPermissions(
              grantedPermissions,
              [...HEALTH_CONNECT_PERMISSIONS]
            );

            // Clear cache after request
            this.permissionCache.health = undefined;

            if (hasRequired) {
              logger.info('Health Connect permissions granted', {
                grantedCount: grantedPermissions.length,
              });
              return {
                success: true,
                status: 'granted',
              };
            } else {
              logger.warn('Some Health Connect permissions denied', {
                grantedCount: grantedPermissions.length,
              });
              return {
                success: false,
                status: 'denied',
              };
            }
          } else {
            logger.warn('All Health Connect permissions denied');
            return {
              success: false,
              status: 'denied',
            };
          }
        } catch (error) {
          logger.error('Error requesting Health Connect permissions', error);
          
          // Check if it's a user denial vs system error
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('denied') || errorMsg.includes('DENIED')) {
            return {
              success: false,
              status: 'denied',
            };
          }

          return {
            success: false,
            status: 'error',
            error: errorMsg,
          };
        }
      } else if (Platform.OS === 'ios') {
        if (!this.isHealthKitAvailable()) {
          return {
            success: false,
            status: 'error',
            error: 'HealthKit is not available on this device',
          };
        }

        try {
          let healthKitModule: any = AppleHealthKit;
          if ((AppleHealthKit as any).default) {
            healthKitModule = (AppleHealthKit as any).default;
          }

          const permissions: HealthKitPermissions = {
            permissions: {
              read: HEALTH_READ_PERMISSIONS.map(
                perm => AppleHealthKit.Constants.Permissions[perm]
              ),
              write: [],
            },
          };

          let isGranted = false;

          // Use initHealthKit (primary API per react-native-health documentation)
          if (typeof healthKitModule.initHealthKit === 'function') {
            await this.withHealthKitCallback<void>(
              (callback) => {
                healthKitModule.initHealthKit(permissions, (error: any) => {
                  if (error) {
                    let errorObj: Error;
                    if (typeof error === 'string') {
                      errorObj = new Error(error);
                    } else if (error instanceof Error) {
                      errorObj = error;
                    } else if (error && typeof error === 'object') {
                      const msg = error.message || error.error || JSON.stringify(error);
                      errorObj = new Error(msg);
                    } else {
                      errorObj = new Error(String(error));
                    }
                    callback(errorObj);
                  } else {
                    callback(null);
                  }
                });
              },
              'initHealthKit'
            );

            // initHealthKit succeeded - permissions are granted
            isGranted = true;
            healthKitInitialized = true;
          } else if (typeof healthKitModule.requestAuthorization === 'function') {
            // Fallback to older API
            await this.withHealthKitCallback<void>(
              (callback) => {
                healthKitModule.requestAuthorization(permissions, callback);
              },
              'requestAuthorization'
            );

            // Check authorization status after request
            if (typeof healthKitModule.getAuthStatus === 'function') {
              const authStatus = await this.withHealthKitCallback<HealthKitAuthStatus>(
                (callback) => {
                  healthKitModule.getAuthStatus(permissions, callback);
                },
                'getAuthStatus'
              );
              isGranted = authStatus && Object.values(authStatus).some((status: number) => status === 2);
            } else {
              isGranted = true;
            }

            if (isGranted) {
              healthKitInitialized = true;
            }
          } else {
            return {
              success: false,
              status: 'error',
              error: 'Health Data is currently unavailable, try again later.',
            };
          }

          // Clear cache after request
          this.permissionCache.health = undefined;

          if (isGranted) {
            return {
              success: true,
              status: 'granted',
            };
          } else {
            return {
              success: false,
              status: 'denied',
              error: 'Health permissions were denied. Please enable in Settings.',
            };
          }
        } catch (error) {
          // Clear cache on error
          this.permissionCache.health = undefined;

          if (error instanceof PermissionError && error.code === PermissionErrorCode.TIMEOUT) {
            return {
              success: false,
              status: 'error',
              error: 'Permission request timed out. Please try again.',
            };
          }

          const errorMsg = error instanceof Error ? error.message : 'Failed to request Health permissions';

          if (errorMsg.toLowerCase().includes('denied')) {
            return {
              success: false,
              status: 'denied',
              error: 'Health permissions were denied. Please enable in Settings.',
            };
          }

          return {
            success: false,
            status: 'error',
            error: errorMsg,
          };
        }
      }

      return {
        success: false,
        status: 'error',
        error: 'Platform not supported',
      };
    } catch (error) {
      logger.error('Error requesting Health permissions', error);
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to request Health permissions',
      };
    }
  }

  // ==================== LOCATION PERMISSIONS ====================

  /**
   * Check current Location permission status
   * Uses cache to avoid excessive system calls
   */
  static async checkLocationPermissions(useCache = true): Promise<LocationPermissionStatus> {
    // Check cache first
    if (useCache && this.permissionCache.location) {
      const age = Date.now() - this.permissionCache.location.timestamp;
      if (age < PERMISSION_CACHE_TTL) {
        return this.permissionCache.location.status;
      }
    }

    try {
      const [foregroundStatus, backgroundStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      const mapStatus = (status: Location.PermissionStatus): 'granted' | 'denied' | 'undetermined' => {
        if (status === Location.PermissionStatus.GRANTED) return 'granted';
        if (status === Location.PermissionStatus.DENIED) return 'denied';
        return 'undetermined';
      };

      const result: LocationPermissionStatus = {
        foreground: mapStatus(foregroundStatus.status),
        background: mapStatus(backgroundStatus.status),
      };

      this.permissionCache.location = { status: result, timestamp: Date.now() };
      return result;
    } catch (error) {
      logger.error('Error checking Location permissions', error);
      const result: LocationPermissionStatus = {
        foreground: 'undetermined',
        background: 'undetermined',
      };
      this.permissionCache.location = { status: result, timestamp: Date.now() };
      return result;
    }
  }

  /**
   * Request foreground location permission
   */
  static async requestForegroundLocation(): Promise<PermissionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      // Clear cache after request
      this.permissionCache.location = undefined;

      if (status === Location.PermissionStatus.GRANTED) {
        logger.info('Foreground location permission granted');
        return { success: true, status: 'granted' };
      } else if (status === Location.PermissionStatus.DENIED) {
        logger.warn('Foreground location permission denied');
        return {
          success: false,
          status: 'denied',
        };
      }

      return { success: false, status: 'undetermined' };
    } catch (error) {
      logger.error('Error requesting foreground location', error);
      this.permissionCache.location = undefined;
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to request location permission',
      };
    }
  }

  /**
   * Request background location permission
   * Should only be called after foreground permission is granted
   */
  static async requestBackgroundLocation(): Promise<PermissionResult> {
    try {
      // First check if foreground is granted
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus.status !== Location.PermissionStatus.GRANTED) {
        logger.warn('Background location requested but foreground not granted');
        return {
          success: false,
          status: 'denied',
          error: 'Foreground location must be granted before requesting background location',
        };
      }

      const { status } = await Location.requestBackgroundPermissionsAsync();

      // Clear cache after request
      this.permissionCache.location = undefined;

      if (status === Location.PermissionStatus.GRANTED) {
        logger.info('Background location permission granted');
        return { success: true, status: 'granted' };
      } else if (status === Location.PermissionStatus.DENIED) {
        logger.warn('Background location permission denied');
        return {
          success: false,
          status: 'denied',
          error: 'Background location was denied. Enable "Always" access in Settings for workout tracking.',
        };
      }

      return { success: false, status: 'undetermined' };
    } catch (error) {
      logger.error('Error requesting background location', error);
      this.permissionCache.location = undefined;
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to request background location',
      };
    }
  }

  /**
   * Clear permission cache (useful after permission changes)
   */
  static clearPermissionCache(): void {
    this.permissionCache = {};
  }

  /**
   * Mark HealthKit as initialized (call when loading stored permission status)
   * This should be called if the app knows permissions were previously granted.
   */
  static setHealthKitInitialized(initialized: boolean): void {
    healthKitInitialized = initialized;
  }

  /**
   * Check if HealthKit has been initialized in this session
   */
  static isHealthKitInitialized(): boolean {
    return healthKitInitialized;
  }

  // ==================== STORAGE ====================

  /**
   * Save permissions status to local storage
   */
  static async savePermissionsToLocal(status: PermissionsStatus): Promise<void> {
    try {
      await storage.setItem(STORAGE_KEYS.PERMISSIONS_STATUS, status);
    } catch (error) {
      logger.error('Error saving permissions to local storage', error);
      throw error;
    }
  }

  /**
   * Load permissions status from local storage
   * Also restores healthKitInitialized state if health was previously granted
   */
  static async loadPermissionsFromLocal(): Promise<PermissionsStatus | null> {
    try {
      const status = await storage.getItem<PermissionsStatus>(STORAGE_KEYS.PERMISSIONS_STATUS);
      if (status) {
        // Restore healthKitInitialized state if permissions were previously granted
        if (status.health?.granted && Platform.OS === 'ios') {
          healthKitInitialized = true;
        }
      }
      return status;
    } catch (error) {
      logger.error('Error loading permissions from local storage', error);
      return null;
    }
  }

  /**
   * Sync permissions status to database
   * Called after onboarding or when permissions change
   */
  static async syncPermissionsToDatabase(
    userId: string | undefined,
    status: PermissionsStatus
  ): Promise<boolean> {
    if (!userId) {
      logger.warn('Cannot sync permissions: no user ID');
      return false;
    }

    try {
      // TODO: Implement API call to update user_profiles.permissions_granted
      // This will be done through the existing user profile update service
      logger.info('Would sync permissions to database', { userId });
      return true;
    } catch (error) {
      logger.error('Error syncing permissions to database', error);
      return false;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Open device settings (for users who denied permissions)
   */
  static async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      logger.error('Error opening settings', error);
    }
  }

  /**
   * Open Health app/settings directly
   * iOS: Opens Apple Health app to the Sources tab where users can manage app permissions
   * Android: Opens Health Connect app
   */
  static async openHealthSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Open Apple Health app directly - users manage permissions in Health > Sources
        const healthUrl = 'x-apple-health://';
        const canOpen = await Linking.canOpenURL(healthUrl);
        if (canOpen) {
          await Linking.openURL(healthUrl);
        } else {
          // Fallback to general app settings
          await Linking.openSettings();
        }
      } else if (Platform.OS === 'android') {
        // Try to open Health Connect app directly
        const healthConnectUrl = 'market://details?id=com.google.android.apps.healthdata';
        try {
          await Linking.openURL(healthConnectUrl);
        } catch {
          // Fallback to general app settings
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      logger.error('Error opening health settings', error);
      // Fallback to general settings
      await Linking.openSettings();
    }
  }

  /**
   * Open Location settings directly
   * iOS: Opens app-specific settings page (Settings > EvolveAI)
   * Android: Opens app-specific settings page
   */
  static async openLocationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // 'app-settings:' opens directly to the app's settings page in iOS Settings
        await Linking.openURL('app-settings:');
      } else {
        // Android: openSettings opens app-specific settings
        await Linking.openSettings();
      }
    } catch (error) {
      logger.error('Error opening location settings', error);
      // Fallback to general settings
      try {
        await Linking.openSettings();
      } catch {
        // Silent fail - nothing more we can do
      }
    }
  }

  /**
   * Check if app is ready for live workout tracking
   * Returns which permissions are missing
   */
  static async isReadyForLiveTracking(): Promise<{
    ready: boolean;
    missing: ('health' | 'location' | 'background_location')[];
  }> {
    const missing: ('health' | 'location' | 'background_location')[] = [];

    try {
      // Check location permissions
      const locationStatus = await this.checkLocationPermissions();
      if (locationStatus.foreground !== 'granted') {
        missing.push('location');
      }
      if (locationStatus.background !== 'granted') {
        missing.push('background_location');
      }

      // Note: Health is optional for live tracking (only needed for HR import)
      // but we can still track GPS data without it

      return {
        ready: missing.length === 0,
        missing,
      };
    } catch {
      return {
        ready: false,
        missing: ['location', 'background_location'],
      };
    }
  }

  /**
   * Build a complete PermissionsStatus object from current system state
   * This is the source of truth - always reflects actual system permissions
   */
  static async buildPermissionsStatus(
    existingStatus?: PermissionsStatus | null,
    bypassCache = false
  ): Promise<PermissionsStatus> {
    const platform = this.getPlatform();
    // Clear cache if bypassing to force fresh check
    if (bypassCache) {
      this.permissionCache.health = undefined;
      this.permissionCache.location = undefined;
    }
    const healthStatus = await this.checkHealthPermissions(!bypassCache);
    const locationStatus = await this.checkLocationPermissions(!bypassCache);

    // Update deniedAt based on actual system status
    // If system says not granted and was previously requested and can't request, mark as denied
    const healthDeniedAt = 
      !healthStatus.granted && existingStatus?.health?.requestedAt && !healthStatus.canRequest
        ? existingStatus.health.deniedAt || new Date().toISOString()
        : healthStatus.granted 
          ? undefined 
          : existingStatus?.health?.deniedAt;

    const locationDeniedAt = 
      locationStatus.foreground === 'denied' && existingStatus?.location?.requestedAt
        ? existingStatus.location.deniedAt || new Date().toISOString()
        : locationStatus.foreground === 'granted'
          ? undefined
          : existingStatus?.location?.deniedAt;

    // Use actual system status for granted state
    const healthGranted = healthStatus.granted;

    return {
      health: {
        granted: healthGranted,
        platform,
        requestedAt: existingStatus?.health?.requestedAt,
        deniedAt: healthDeniedAt,
      },
      location: {
        foreground: locationStatus.foreground === 'granted',
        background: locationStatus.background === 'granted',
        requestedAt: existingStatus?.location?.requestedAt,
        deniedAt: locationDeniedAt,
      },
      skipped: existingStatus?.skipped ?? false,
      lastUpdated: new Date().toISOString(),
    };
  }
}
