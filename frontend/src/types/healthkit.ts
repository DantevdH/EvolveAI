/**
 * HealthKit Type Definitions
 * 
 * Type definitions for react-native-health (Apple HealthKit) module
 */

export interface HealthKitPermissions {
  permissions: {
    read: string[];
    write?: string[];
  };
}

export interface HealthKitAuthStatus {
  [key: string]: number; // 0 = not determined, 1 = denied, 2 = authorized
}

export interface HealthKitConstants {
  Permissions: {
    Workout: string;
    HeartRate: string;
    DistanceWalkingRunning: string;
    StepCount: string;
    ActiveEnergyBurned: string;
    [key: string]: string;
  };
}

export interface HealthKitModule {
  Constants: HealthKitConstants;
  getAuthStatus: (
    permissions: HealthKitPermissions,
    callback: (error: Error | null, result: HealthKitAuthStatus | null) => void
  ) => void;
  requestAuthorization: (
    permissions: HealthKitPermissions,
    callback: (error: Error | null) => void
  ) => void;
}

// Type guard to check if module is properly initialized
export function isHealthKitModule(module: any): module is HealthKitModule {
  return (
    module != null &&
    typeof module === 'object' &&
    typeof module.getAuthStatus === 'function' &&
    typeof module.requestAuthorization === 'function' &&
    module.Constants != null &&
    typeof module.Constants.Permissions === 'object'
  );
}





