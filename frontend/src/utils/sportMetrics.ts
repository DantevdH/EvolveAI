/**
 * Sport Metrics Utility
 *
 * Centralized logic for sport-specific metric display configuration.
 * Determines which metrics to show, how to format them, and priority order.
 *
 * Key concepts:
 * - Main metric: The primary displayed metric (pace, speed, or time)
 * - Secondary metrics: Additional metrics shown in a grid below
 * - Live tracking: GPS-only data (no HR, calories)
 * - Summary: May include health app data (HR, calories if available)
 */

// ==================== TYPES ====================

export type SportType =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'rowing'
  | 'hiking'
  | 'walking'
  | 'elliptical'
  | 'stair_climbing'
  | 'jump_rope'
  | 'other';

export type MainMetricType = 'pace' | 'speed' | 'time';

export type MetricKey =
  | 'duration'
  | 'distance'
  | 'pace'
  | 'speed'
  | 'elevation'
  | 'heartRate'
  | 'calories';

export interface SportMetricConfig {
  mainMetric: MainMetricType;
  secondaryMetrics: MetricKey[];
  showCurrentAndAverage: boolean; // true for pace/speed (show both current and avg)
  paceFormat: 'standard' | 'per100m' | 'per500m'; // Special pace formatting
}

export interface MetricDisplayInfo {
  key: MetricKey;
  label: string;
  icon: string; // Ionicons name
}

// ==================== SPORT CONFIGURATIONS ====================

/**
 * Sport-specific metric configurations for LIVE TRACKING (GPS-only)
 * No HR or calories - these require health app integration
 */
const LIVE_TRACKING_CONFIGS: Record<SportType, SportMetricConfig> = {
  running: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration', 'elevation'],
    showCurrentAndAverage: true,
    paceFormat: 'standard',
  },
  cycling: {
    mainMetric: 'speed',
    secondaryMetrics: ['distance', 'duration', 'elevation'],
    showCurrentAndAverage: true,
    paceFormat: 'standard',
  },
  swimming: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration'],
    showCurrentAndAverage: true,
    paceFormat: 'per100m',
  },
  rowing: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration'],
    showCurrentAndAverage: true,
    paceFormat: 'per500m',
  },
  hiking: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration', 'elevation'],
    showCurrentAndAverage: true,
    paceFormat: 'standard',
  },
  walking: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration'],
    showCurrentAndAverage: true,
    paceFormat: 'standard',
  },
  elliptical: {
    mainMetric: 'pace',
    secondaryMetrics: ['distance', 'duration'],
    showCurrentAndAverage: true,
    paceFormat: 'standard',
  },
  stair_climbing: {
    mainMetric: 'time',
    secondaryMetrics: [], // No GPS elevation for indoor machines
    showCurrentAndAverage: false,
    paceFormat: 'standard',
  },
  jump_rope: {
    mainMetric: 'time',
    secondaryMetrics: [],
    showCurrentAndAverage: false,
    paceFormat: 'standard',
  },
  other: {
    mainMetric: 'time',
    secondaryMetrics: ['distance'],
    showCurrentAndAverage: false,
    paceFormat: 'standard',
  },
};

/**
 * Metric display info (labels and icons)
 */
const METRIC_INFO: Record<MetricKey, MetricDisplayInfo> = {
  duration: { key: 'duration', label: 'Duration', icon: 'time-outline' },
  distance: { key: 'distance', label: 'Distance', icon: 'navigate-outline' },
  pace: { key: 'pace', label: 'Pace', icon: 'speedometer-outline' },
  speed: { key: 'speed', label: 'Speed', icon: 'flash-outline' },
  elevation: { key: 'elevation', label: 'Elevation', icon: 'trending-up-outline' },
  heartRate: { key: 'heartRate', label: 'Heart Rate', icon: 'heart-outline' },
  calories: { key: 'calories', label: 'Calories', icon: 'flame-outline' },
};

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Get the main metric type for a sport
 * @returns 'pace' | 'speed' | 'time'
 */
export function getMainMetric(sportType: string): MainMetricType {
  const config = LIVE_TRACKING_CONFIGS[sportType as SportType];
  return config?.mainMetric ?? 'time';
}

/**
 * Get secondary metrics for live tracking (GPS-only, no HR/calories)
 */
export function getSecondaryMetricsForLive(sportType: string): MetricKey[] {
  const config = LIVE_TRACKING_CONFIGS[sportType as SportType];
  return config?.secondaryMetrics ?? ['distance'];
}

/**
 * Get secondary metrics for workout summary
 * Includes HR and calories if they were provided (from health app import)
 */
export function getSecondaryMetricsForSummary(
  sportType: string,
  hasHeartRate: boolean,
  hasCalories: boolean,
  hasElevation: boolean
): MetricKey[] {
  const config = LIVE_TRACKING_CONFIGS[sportType as SportType];
  const baseMetrics: MetricKey[] = [];

  // Always show distance for sports that track it
  if (config?.secondaryMetrics.includes('distance') || sportType === 'other') {
    baseMetrics.push('distance');
  }

  // Always show duration
  baseMetrics.push('duration');

  // Add elevation only if:
  // 1. Sport normally shows elevation AND we have GPS elevation data, OR
  // 2. It's stair_climbing and we have health app elevation data
  if (config?.secondaryMetrics.includes('elevation') && hasElevation) {
    baseMetrics.push('elevation');
  } else if (sportType === 'stair_climbing' && hasElevation) {
    // Stair climbing can show elevation from health app
    baseMetrics.push('elevation');
  }

  // Add health app metrics if available
  if (hasHeartRate) {
    baseMetrics.push('heartRate');
  }
  if (hasCalories) {
    baseMetrics.push('calories');
  }

  return baseMetrics;
}

/**
 * Get complete metric configuration for a sport
 */
export function getSportMetricConfig(sportType: string): SportMetricConfig {
  return (
    LIVE_TRACKING_CONFIGS[sportType as SportType] ?? LIVE_TRACKING_CONFIGS.other
  );
}

/**
 * Get display info for a metric
 */
export function getMetricDisplayInfo(metric: MetricKey): MetricDisplayInfo {
  return METRIC_INFO[metric];
}

/**
 * Check if a sport should show current + average (for pace/speed)
 */
export function shouldShowCurrentAndAverage(sportType: string): boolean {
  const config = LIVE_TRACKING_CONFIGS[sportType as SportType];
  return config?.showCurrentAndAverage ?? false;
}

/**
 * Get the pace format for a sport
 */
export function getPaceFormat(sportType: string): 'standard' | 'per100m' | 'per500m' {
  const config = LIVE_TRACKING_CONFIGS[sportType as SportType];
  return config?.paceFormat ?? 'standard';
}

// ==================== FORMATTING FUNCTIONS ====================

/**
 * Format duration in seconds to "MM:SS" or "H:MM:SS"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format distance in meters to "X.XX km" or "X.XX mi"
 */
export function formatDistance(meters: number, useMetric: boolean): string {
  if (meters < 0) return useMetric ? '0.00 km' : '0.00 mi';

  if (useMetric) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  } else {
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  }
}

/**
 * Format standard pace (min/km or min/mi)
 */
export function formatStandardPace(
  secondsPerKm: number | null,
  useMetric: boolean
): string {
  if (secondsPerKm === null || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return '--:-- ' + (useMetric ? '/km' : '/mi');
  }

  // Convert to seconds per mile if imperial
  const paceSeconds = useMetric ? secondsPerKm : secondsPerKm * 1.60934;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} ${useMetric ? '/km' : '/mi'}`;
}

/**
 * Format swimming pace (min/100m or min/100yd)
 */
export function formatSwimmingPace(
  secondsPerKm: number | null,
  useMetric: boolean
): string {
  if (secondsPerKm === null || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return '--:-- ' + (useMetric ? '/100m' : '/100yd');
  }

  // Convert seconds/km to seconds/100m
  const secondsPer100m = secondsPerKm / 10;

  // Convert to yards if imperial (100yd ≈ 91.44m)
  const paceSeconds = useMetric ? secondsPer100m : secondsPer100m * 0.9144;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} ${useMetric ? '/100m' : '/100yd'}`;
}

/**
 * Format rowing pace (min/500m)
 */
export function formatRowingPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return '--:-- /500m';
  }

  // Convert seconds/km to seconds/500m
  const secondsPer500m = secondsPerKm / 2;
  const minutes = Math.floor(secondsPer500m / 60);
  const seconds = Math.floor(secondsPer500m % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} /500m`;
}

/**
 * Format pace based on sport type
 */
export function formatSportSpecificPace(
  secondsPerKm: number | null,
  sportType: string,
  useMetric: boolean
): string {
  const paceFormat = getPaceFormat(sportType);

  switch (paceFormat) {
    case 'per100m':
      return formatSwimmingPace(secondsPerKm, useMetric);
    case 'per500m':
      return formatRowingPace(secondsPerKm);
    default:
      return formatStandardPace(secondsPerKm, useMetric);
  }
}

/**
 * Format speed in km/h to "X.X km/h" or "X.X mph"
 */
export function formatSpeed(kmh: number | null, useMetric: boolean): string {
  if (kmh === null || kmh < 0) return useMetric ? '0.0 km/h' : '0.0 mph';

  if (useMetric) {
    return `${kmh.toFixed(1)} km/h`;
  } else {
    const mph = kmh / 1.60934;
    return `${mph.toFixed(1)} mph`;
  }
}

/**
 * Format elevation in meters to "+X m" or "+X ft"
 */
export function formatElevation(
  meters: number,
  useMetric: boolean,
  prefix: '+' | '-' = '+'
): string {
  if (useMetric) {
    return `${prefix}${Math.round(meters)} m`;
  } else {
    const feet = meters * 3.28084;
    return `${prefix}${Math.round(feet)} ft`;
  }
}

// ==================== HELPER: GET MAIN METRIC LABEL ====================

/**
 * Get the label for the main metric based on sport type
 */
export function getMainMetricLabel(sportType: string): string {
  const mainMetric = getMainMetric(sportType);

  switch (mainMetric) {
    case 'pace':
      return 'Current Pace';
    case 'speed':
      return 'Current Speed';
    case 'time':
      return 'Duration';
  }
}

/**
 * Get the average label for sports that show current + average
 */
export function getAverageMetricLabel(sportType: string): string {
  const mainMetric = getMainMetric(sportType);

  switch (mainMetric) {
    case 'pace':
      return 'Avg Pace';
    case 'speed':
      return 'Avg Speed';
    default:
      return '';
  }
}

// ==================== SPORT NAME FORMATTING ====================

const SPORT_NAMES: Record<string, string> = {
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  rowing: 'Rowing',
  hiking: 'Hiking',
  walking: 'Walking',
  elliptical: 'Elliptical',
  stair_climbing: 'Stair Climbing',
  jump_rope: 'Jump Rope',
  other: 'Workout',
};

const SPORT_NAMES_SHORT: Record<string, string> = {
  running: 'Run',
  cycling: 'Ride',
  swimming: 'Swim',
  rowing: 'Row',
  hiking: 'Hike',
  walking: 'Walk',
  elliptical: 'Elliptical',
  stair_climbing: 'Stair Climb',
  jump_rope: 'Jump Rope',
  other: 'Workout',
};

export function formatSportName(sportType: string): string {
  return SPORT_NAMES[sportType] ?? 'Workout';
}

export function formatSportNameShort(sportType: string): string {
  return SPORT_NAMES_SHORT[sportType] ?? 'Workout';
}
