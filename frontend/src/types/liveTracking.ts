/**
 * Live Tracking Types
 *
 * Type definitions for live GPS workout tracking and health app imports.
 * All distance/pace values are stored in metric internally and converted for display.
 */

import { EnduranceSession } from './training';

// ==================== TRACKING STATE ====================

export type TrackingStatus =
  | 'idle'           // Not tracking
  | 'countdown'      // 3-second countdown before start
  | 'tracking'       // Actively tracking
  | 'paused'         // Manually paused
  | 'auto_paused'    // Auto-paused due to no movement
  | 'stopping'       // Processing stop request
  | 'summary'        // Showing post-workout summary
  | 'saving';        // Saving to database

export type DataSource = 'manual' | 'live_tracking' | 'healthkit' | 'google_fit';

export interface GPSSignalQuality {
  accuracy: number;      // Meters
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
}

export interface TrackingState {
  status: TrackingStatus;

  // Session info
  enduranceSessionId: string | null;
  sportType: string | null;

  // Timing
  startedAt: Date | null;
  elapsedSeconds: number;        // Total elapsed time (excluding pauses)
  pausedAt: Date | null;
  totalPausedSeconds: number;    // Total time spent paused

  // Distance (always in meters internally)
  distanceMeters: number;

  // Pace/Speed (metric internally)
  currentPaceSecondsPerKm: number | null;  // Current pace
  averagePaceSecondsPerKm: number | null;  // Average pace
  averageSpeedKmh: number | null;          // Average speed

  // Elevation (meters)
  elevationGainMeters: number;
  elevationLossMeters: number;
  currentAltitudeMeters: number | null;

  // GPS
  gpsSignal: GPSSignalQuality;
  lastLocation: LocationPoint | null;

  // Errors
  error: string | null;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
  speed: number | null;  // m/s
}

// ==================== WORKOUT METRICS ====================

/**
 * Tracked workout metrics - stored in database
 * All values in metric units (meters, seconds, km/h)
 */
export interface TrackedWorkoutMetrics {
  actualDuration: number;           // Seconds
  actualDistance: number;           // Meters
  averagePace: number | null;       // Seconds per km
  averageSpeed: number | null;      // km/h
  averageHeartRate: number | null;  // bpm
  maxHeartRate: number | null;      // bpm
  minHeartRate: number | null;      // bpm
  elevationGain: number | null;     // Meters
  elevationLoss: number | null;     // Meters
  calories: number | null;
  cadence: number | null;           // steps/min or rpm
  dataSource: DataSource;
  healthWorkoutId: string | null;   // For health import deduplication
  startedAt: Date;
  completedAt: Date;
}

/**
 * Display-formatted metrics based on user's unit preference
 */
export interface FormattedWorkoutMetrics {
  duration: string;           // "32:45" or "1:02:30"
  distance: string;           // "5.2 km" or "3.2 mi"
  averagePace: string;        // "6:18 /km" or "10:08 /mi"
  currentPace: string | null; // "5:45 /km" or "9:15 /mi"
  averageSpeed: string;       // "9.5 km/h" or "5.9 mph"
  elevationGain: string;      // "+124 m" or "+407 ft"
  elevationLoss: string;      // "-98 m" or "-322 ft"
  heartRate: string | null;   // "142 bpm"
  calories: string | null;    // "324 kcal"
  cadence: string | null;     // "172 spm" or "85 rpm"
}

// ==================== HEALTH IMPORT ====================

export interface HealthWorkout {
  id: string;                      // HealthKit/Google Fit workout ID
  source: 'healthkit' | 'google_fit';
  sportType: string;               // Mapped to our sport types
  startDate: Date;
  endDate: Date;
  duration: number;                // Seconds
  distance: number | null;         // Meters
  averageHeartRate: number | null; // bpm
  maxHeartRate: number | null;     // bpm
  minHeartRate: number | null;     // bpm
  elevationGain: number | null;    // Meters
  calories: number | null;
  sourceName: string;              // "Apple Watch", "Strava", etc.
}

export interface HealthImportState {
  isLoading: boolean;
  workouts: HealthWorkout[];
  selectedWorkoutId: string | null;
  error: string | null;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// ==================== SERVICE INTERFACES ====================

export interface LiveTrackingServiceInterface {
  // Lifecycle
  startTracking(sessionId: string, sportType: string): Promise<void>;
  pauseTracking(): void;
  resumeTracking(): void;
  stopTracking(): Promise<TrackedWorkoutMetrics>;
  discardTracking(): void;

  // State
  getState(): TrackingState;
  subscribe(callback: (state: TrackingState) => void): () => void;

  // GPS
  checkGPSAvailability(): Promise<GPSSignalQuality>;
}

export interface HealthImportServiceInterface {
  // Availability
  isAvailable(): Promise<boolean>;

  // Import
  getWorkoutsForDate(date: Date): Promise<HealthWorkout[]>;
  getWorkoutsInRange(start: Date, end: Date): Promise<HealthWorkout[]>;
  importWorkout(workoutId: string): Promise<TrackedWorkoutMetrics>;

  // Mapping
  mapHealthWorkoutType(healthType: string): string;
}

// ==================== HOOK RETURN TYPES ====================

export interface UseLiveTrackingReturn {
  // State
  trackingState: TrackingState;
  formattedMetrics: FormattedWorkoutMetrics;
  countdownSeconds: number;

  // Actions
  startCountdown: (sessionId: string, sportType: string) => void;
  cancelCountdown: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<TrackedWorkoutMetrics>;
  discard: () => void;
  resetToIdle: () => Promise<void>;

  // Pre-checks
  checkReadiness: () => Promise<{
    ready: boolean;
    gpsSignal: GPSSignalQuality;
    batteryLevel: number | null;
    issues: string[];
  }>;
}

export interface UseHealthImportReturn {
  // State
  importState: HealthImportState;

  // Actions
  loadWorkouts: (date: Date) => Promise<void>;
  selectWorkout: (workoutId: string) => void;
  importSelected: () => Promise<TrackedWorkoutMetrics | null>;
  clearSelection: () => void;

  // Availability
  isAvailable: boolean;
}

// ==================== COMPONENT PROPS ====================

export interface LiveTrackingScreenProps {
  enduranceSession: EnduranceSession;
  onComplete: (metrics: TrackedWorkoutMetrics) => void;
  onDiscard: () => void;
}

export interface TrackingMetricsProps {
  metrics: FormattedWorkoutMetrics;
  sportType: string;
  isTracking: boolean;
}

export interface TrackingControlsProps {
  status: TrackingStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export interface CountdownOverlayProps {
  seconds: number;
  onCancel: () => void;
}

export interface TrackingSummaryProps {
  metrics: TrackedWorkoutMetrics;
  formattedMetrics: FormattedWorkoutMetrics;
  sportType: string;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}

export interface HealthImportModalProps {
  visible: boolean;
  enduranceSession: EnduranceSession;
  onImport: (metrics: TrackedWorkoutMetrics) => void;
  onClose: () => void;
}

export interface HealthWorkoutCardProps {
  workout: HealthWorkout;
  isSelected: boolean;
  onSelect: () => void;
  useMetric: boolean;
}

// ==================== UTILITY TYPES ====================

/**
 * Conversion utilities config
 */
export interface UnitConversionConfig {
  useMetric: boolean;
  distanceUnit: 'km' | 'mi';
  paceUnit: '/km' | '/mi';
  speedUnit: 'km/h' | 'mph';
  elevationUnit: 'm' | 'ft';
}

/**
 * Extended EnduranceSession with tracking data
 */
export interface EnduranceSessionWithTracking extends EnduranceSession {
  actualDuration?: number;
  actualDistance?: number;
  averagePace?: number;
  averageSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  elevationGain?: number;
  elevationLoss?: number;
  calories?: number;
  cadence?: number;
  dataSource?: DataSource;
  healthWorkoutId?: string;
  startedAt?: Date;
  completedAt?: Date;
}
