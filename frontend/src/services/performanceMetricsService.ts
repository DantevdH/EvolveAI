/**
 * Performance Metrics Service
 *
 * Provides sport-specific analytics for the unified insights view.
 * Calculates weekly volume trends, sport-specific metrics, and aggregations.
 */

import { TrainingPlan, DailyTraining, TrainingExercise, EnduranceSession } from '@/src/types/training';

// All sport types supported
export type SportType =
  | 'strength'
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

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
  strength: 'Strength',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  rowing: 'Rowing',
  hiking: 'Hiking',
  walking: 'Walking',
  elliptical: 'Elliptical',
  stair_climbing: 'Stair Climbing',
  jump_rope: 'Jump Rope',
  other: 'Other',
};

// Metrics that are relevant for each sport type
export interface SportMetricsConfig {
  hasVolume: boolean; // Weight × Reps (strength only)
  hasDistance: boolean;
  hasTime: boolean;
  hasPace: boolean;
  hasSpeed: boolean;
  hasElevation: boolean;
  hasCadence: boolean;
  hasHeartRate: boolean;
  primaryMetric: 'volume' | 'distance' | 'time' | 'pace';
  secondaryMetric?: 'time' | 'distance' | 'speed' | 'elevation' | 'heart_rate';
}

export const SPORT_METRICS_CONFIG: Record<SportType, SportMetricsConfig> = {
  strength: {
    hasVolume: true,
    hasDistance: false,
    hasTime: true,
    hasPace: false,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'volume',
    secondaryMetric: 'time',
  },
  running: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: true,
    hasElevation: true,
    hasCadence: true,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  cycling: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: false,
    hasSpeed: true,
    hasElevation: true,
    hasCadence: true,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  swimming: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  rowing: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: true,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  hiking: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: false,
    hasElevation: true,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  walking: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'distance',
    secondaryMetric: 'time',
  },
  elliptical: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: true,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'time',
    secondaryMetric: 'distance',
  },
  stair_climbing: {
    hasVolume: false,
    hasDistance: false,
    hasTime: true,
    hasPace: false,
    hasSpeed: false,
    hasElevation: true,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'time',
    secondaryMetric: 'elevation',
  },
  jump_rope: {
    hasVolume: false,
    hasDistance: false,
    hasTime: true,
    hasPace: false,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'time',
  },
  other: {
    hasVolume: false,
    hasDistance: true,
    hasTime: true,
    hasPace: false,
    hasSpeed: false,
    hasElevation: false,
    hasCadence: false,
    hasHeartRate: true,
    primaryMetric: 'time',
    secondaryMetric: 'distance',
  },
};

// Weekly aggregated data for charts
export interface WeeklyMetrics {
  week: string; // ISO date string (week start, Sunday)
  sportType: SportType;
  // Strength metrics
  volumeKg: number;
  sets: number;
  reps: number;
  // Endurance metrics
  distanceKm: number;
  durationMinutes: number;
  avgPaceSecondsPerKm: number | null;
  avgSpeedKmH: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  caloriesBurned: number | null;
  // Common
  sessionCount: number;
}

// Session data for extraction
interface ExtractedSession {
  date: Date;
  sportType: SportType;
  volumeKg: number;
  sets: number;
  reps: number;
  distanceKm: number;
  durationMinutes: number;
  avgPaceSecondsPerKm: number | null;
  avgSpeedKmH: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  caloriesBurned: number | null;
}

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Normalize sport type string to SportType enum
 */
function normalizeSportType(sportType: string | undefined): SportType {
  if (!sportType) return 'other';
  const normalized = sportType.toLowerCase().replace(/[^a-z_]/g, '');
  if (normalized in SPORT_METRICS_CONFIG) {
    return normalized as SportType;
  }
  return 'other';
}

/**
 * Extract all completed sessions from training plan
 */
export function extractCompletedSessions(trainingPlan: TrainingPlan | null): ExtractedSession[] {
  if (!trainingPlan) return [];

  const sessions: ExtractedSession[] = [];

  trainingPlan.weeklySchedules.forEach(week => {
    week.dailyTrainings.forEach(dailyTraining => {
      if (!dailyTraining.completed || !dailyTraining.completedAt) {
        return;
      }

      const completedDate = new Date(dailyTraining.completedAt);

      dailyTraining.exercises.forEach((exercise: TrainingExercise) => {
        if (!exercise.completed) return;

        // Handle strength exercises
        if (exercise.exercise && exercise.sets && exercise.sets.length > 0) {
          let volumeKg = 0;
          let totalReps = 0;
          let completedSets = 0;

          exercise.sets.forEach(set => {
            if (set.completed) {
              completedSets++;
              totalReps += set.reps || 0;
              volumeKg += (set.weight || 0) * (set.reps || 0);
            }
          });

          if (volumeKg > 0) {
            sessions.push({
              date: completedDate,
              sportType: 'strength',
              volumeKg,
              sets: completedSets,
              reps: totalReps,
              distanceKm: 0,
              durationMinutes: completedSets * 2.5, // Estimate
              avgPaceSecondsPerKm: null,
              avgSpeedKmH: null,
              avgHeartRate: null,
              maxHeartRate: null,
              elevationGainM: null,
              caloriesBurned: null,
            });
          }
        }

        // Handle endurance sessions
        if (exercise.enduranceSession && exercise.enduranceSession.completed) {
          const session = exercise.enduranceSession;
          const sportType = normalizeSportType(session.sportType);

          // Get actual values or fallback to planned values
          const durationMinutes = session.actualDuration
            ? session.actualDuration / 60
            : (session.unit === 'minutes' ? session.trainingVolume : 0);

          const distanceKm = session.actualDistance
            ? session.actualDistance / 1000
            : (session.unit === 'km' ? session.trainingVolume :
               session.unit === 'miles' ? session.trainingVolume * 1.60934 :
               session.unit === 'meters' ? session.trainingVolume / 1000 : 0);

          sessions.push({
            date: completedDate,
            sportType,
            volumeKg: 0,
            sets: 0,
            reps: 0,
            distanceKm,
            durationMinutes,
            avgPaceSecondsPerKm: session.averagePace ?? null,
            avgSpeedKmH: session.averageSpeed ?? null,
            avgHeartRate: session.averageHeartRate ?? null,
            maxHeartRate: session.maxHeartRate ?? null,
            elevationGainM: session.elevationGain ?? null,
            caloriesBurned: session.calories ?? null,
          });
        }
      });
    });
  });

  return sessions;
}

/**
 * Get list of sport types that have been performed
 */
export function getPerformedSportTypes(trainingPlan: TrainingPlan | null): SportType[] {
  const sessions = extractCompletedSessions(trainingPlan);
  const sportTypes = new Set<SportType>();

  sessions.forEach(session => {
    sportTypes.add(session.sportType);
  });

  // Return in a logical order: strength first, then endurance sports alphabetically
  const result: SportType[] = [];
  if (sportTypes.has('strength')) {
    result.push('strength');
  }

  const enduranceSports: SportType[] = [
    'running', 'cycling', 'swimming', 'rowing', 'hiking',
    'walking', 'elliptical', 'stair_climbing', 'jump_rope', 'other'
  ];

  enduranceSports.forEach(sport => {
    if (sportTypes.has(sport)) {
      result.push(sport);
    }
  });

  return result;
}

/**
 * Aggregate sessions into weekly metrics
 */
export function getWeeklyMetrics(
  trainingPlan: TrainingPlan | null,
  sportTypeFilter: SportType | 'all' = 'all',
  weeksToShow: number = 12
): WeeklyMetrics[] {
  const sessions = extractCompletedSessions(trainingPlan);

  // Filter by sport type if specified
  const filteredSessions = sportTypeFilter === 'all'
    ? sessions
    : sessions.filter(s => s.sportType === sportTypeFilter);

  if (filteredSessions.length === 0) {
    return [];
  }

  // Group by week
  const weeklyMap: Map<string, Map<SportType, ExtractedSession[]>> = new Map();

  filteredSessions.forEach(session => {
    const weekStart = getWeekStart(session.date);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, new Map());
    }

    const sportMap = weeklyMap.get(weekKey)!;
    if (!sportMap.has(session.sportType)) {
      sportMap.set(session.sportType, []);
    }

    sportMap.get(session.sportType)!.push(session);
  });

  // Convert to array and aggregate
  const result: WeeklyMetrics[] = [];

  weeklyMap.forEach((sportMap, weekKey) => {
    sportMap.forEach((sessions, sportType) => {
      const aggregated: WeeklyMetrics = {
        week: weekKey,
        sportType,
        volumeKg: 0,
        sets: 0,
        reps: 0,
        distanceKm: 0,
        durationMinutes: 0,
        avgPaceSecondsPerKm: null,
        avgSpeedKmH: null,
        avgHeartRate: null,
        maxHeartRate: null,
        elevationGainM: null,
        caloriesBurned: null,
        sessionCount: sessions.length,
      };

      let paceCount = 0;
      let speedCount = 0;
      let hrCount = 0;
      let totalPace = 0;
      let totalSpeed = 0;
      let totalHR = 0;
      let maxHR = 0;
      let totalElevation = 0;
      let totalCalories = 0;

      sessions.forEach(session => {
        aggregated.volumeKg += session.volumeKg;
        aggregated.sets += session.sets;
        aggregated.reps += session.reps;
        aggregated.distanceKm += session.distanceKm;
        aggregated.durationMinutes += session.durationMinutes;

        if (session.avgPaceSecondsPerKm !== null) {
          totalPace += session.avgPaceSecondsPerKm;
          paceCount++;
        }
        if (session.avgSpeedKmH !== null) {
          totalSpeed += session.avgSpeedKmH;
          speedCount++;
        }
        if (session.avgHeartRate !== null) {
          totalHR += session.avgHeartRate;
          hrCount++;
        }
        if (session.maxHeartRate !== null && session.maxHeartRate > maxHR) {
          maxHR = session.maxHeartRate;
        }
        if (session.elevationGainM !== null) {
          totalElevation += session.elevationGainM;
        }
        if (session.caloriesBurned !== null) {
          totalCalories += session.caloriesBurned;
        }
      });

      if (paceCount > 0) aggregated.avgPaceSecondsPerKm = totalPace / paceCount;
      if (speedCount > 0) aggregated.avgSpeedKmH = totalSpeed / speedCount;
      if (hrCount > 0) aggregated.avgHeartRate = totalHR / hrCount;
      if (maxHR > 0) aggregated.maxHeartRate = maxHR;
      if (totalElevation > 0) aggregated.elevationGainM = totalElevation;
      if (totalCalories > 0) aggregated.caloriesBurned = totalCalories;

      result.push(aggregated);
    });
  });

  // Sort by week (oldest first) and limit to requested weeks
  result.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  // Get the most recent N weeks
  const uniqueWeeks = [...new Set(result.map(r => r.week))].slice(-weeksToShow);

  return result.filter(r => uniqueWeeks.includes(r.week));
}

/**
 * Get combined weekly data for "All" filter view
 * Aggregates all sports into unified volume/time metrics
 */
export function getCombinedWeeklyMetrics(
  trainingPlan: TrainingPlan | null,
  weeksToShow: number = 12
): { week: string; totalVolume: number; totalTime: number; totalDistance: number; sessionCount: number }[] {
  const weeklyMetrics = getWeeklyMetrics(trainingPlan, 'all', weeksToShow);

  // Group by week
  const weeklyMap: Map<string, {
    totalVolume: number;
    totalTime: number;
    totalDistance: number;
    sessionCount: number;
  }> = new Map();

  weeklyMetrics.forEach(metric => {
    if (!weeklyMap.has(metric.week)) {
      weeklyMap.set(metric.week, {
        totalVolume: 0,
        totalTime: 0,
        totalDistance: 0,
        sessionCount: 0,
      });
    }

    const data = weeklyMap.get(metric.week)!;
    data.totalVolume += metric.volumeKg;
    data.totalTime += metric.durationMinutes;
    data.totalDistance += metric.distanceKm;
    data.sessionCount += metric.sessionCount;
  });

  // Convert to array
  const result = Array.from(weeklyMap.entries()).map(([week, data]) => ({
    week,
    ...data,
  }));

  // Sort by week
  result.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  return result;
}

/**
 * Format pace (seconds per km) to readable string
 */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null) return '-';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

/**
 * Format duration (minutes) to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format distance (km) to readable string
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format volume (kg) to readable string
 */
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k kg`;
  }
  return `${Math.round(kg)} kg`;
}

/**
 * Get summary statistics for a sport type
 */
export function getSportSummaryStats(
  trainingPlan: TrainingPlan | null,
  sportType: SportType
): {
  totalSessions: number;
  totalVolume: number;
  totalDistance: number;
  totalTime: number;
  avgHeartRate: number | null;
  weeklyAvgVolume: number;
  weeklyAvgDistance: number;
  weeklyAvgTime: number;
} {
  const metrics = getWeeklyMetrics(trainingPlan, sportType, 52);

  const totalSessions = metrics.reduce((sum, m) => sum + m.sessionCount, 0);
  const totalVolume = metrics.reduce((sum, m) => sum + m.volumeKg, 0);
  const totalDistance = metrics.reduce((sum, m) => sum + m.distanceKm, 0);
  const totalTime = metrics.reduce((sum, m) => sum + m.durationMinutes, 0);

  const hrMetrics = metrics.filter(m => m.avgHeartRate !== null);
  const avgHeartRate = hrMetrics.length > 0
    ? hrMetrics.reduce((sum, m) => sum + (m.avgHeartRate || 0), 0) / hrMetrics.length
    : null;

  const weekCount = new Set(metrics.map(m => m.week)).size || 1;

  return {
    totalSessions,
    totalVolume,
    totalDistance,
    totalTime,
    avgHeartRate,
    weeklyAvgVolume: totalVolume / weekCount,
    weeklyAvgDistance: totalDistance / weekCount,
    weeklyAvgTime: totalTime / weekCount,
  };
}
