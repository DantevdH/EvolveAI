/**
 * Recovery Calculation Service
 *
 * Science-based recovery tracking using ACWR (Acute:Chronic Workload Ratio)
 * All calculations performed client-side for performance.
 *
 * References:
 * - Foster et al. 2001; Impellizzeri et al. 2004 (sRPE × duration)
 * - Bourdon et al. 2017 (ACWR thresholds)
 * - Schoenfeld 2010; Haun et al. 2018 (Muscle-specific fatigue via volume)
 * - Bannister 1991 (athlete normalization via rolling baseline)
 */

import { TrainingPlan, DailyTraining, TrainingExercise } from '@/src/types/training';

// Target area values from exercises table
export type TargetArea =
  | 'Calves'
  | 'Upper Arms'
  | 'Back'
  | 'Shoulder'
  | 'Hips'
  | 'Chest'
  | 'Thighs'
  | 'Abs'
  | 'Forearms'
  | 'Neck';

// Map endurance sport types to target areas
export const ENDURANCE_TO_TARGET_AREA: Record<string, TargetArea | null> = {
  running: 'Thighs',
  cycling: 'Thighs',
  swimming: 'Upper Arms',
  rowing: 'Back',
  hiking: 'Thighs',
  walking: 'Thighs',
  elliptical: 'Thighs',
  stair_climbing: 'Thighs',
  jump_rope: 'Calves',
  other: null, // Not included in recovery tracking
};

// Recovery status based on ACWR
export type RecoveryStatus = 'recovered' | 'recovering' | 'needs_rest' | 'not_trained_yet';

export interface MuscleRecoveryStatus {
  targetArea: TargetArea;
  status: RecoveryStatus;
  acwr: number | null;
  acuteLoad: number;
  chronicLoad: number;
  lastTrainedAt: Date | null;
  recommendation: string;
}

export interface SessionLoadResult {
  internalLoad: number | null; // sRPE × duration
  external: {
    enduranceMinutes: number;
    enduranceDistanceKm: number | null;
    strengthVolumeKg: number;
    muscleVolumesKg: Record<TargetArea, number>;
  };
  normalizedStrengthLoad: number | null;
  normalizedLoadPerMuscle: Record<TargetArea, number | null>;
  uxStressScore: number | null;
}

export interface DailyVolumeData {
  date: string; // ISO date string YYYY-MM-DD
  targetArea: TargetArea;
  volumeKg: number;
  sessionRPE: number | null;
  durationMinutes: number | null;
}

/**
 * Extract completed training data from a training plan
 */
export function extractCompletedTrainingData(trainingPlan: TrainingPlan | null): DailyVolumeData[] {
  if (!trainingPlan) return [];

  const data: DailyVolumeData[] = [];

  trainingPlan.weeklySchedules.forEach(week => {
    week.dailyTrainings.forEach(dailyTraining => {
      if (!dailyTraining.completed || !dailyTraining.completedAt) {
        return;
      }

      const completedDate = new Date(dailyTraining.completedAt);
      const dateKey = completedDate.toISOString().split('T')[0];
      const sessionRPE = dailyTraining.sessionRPE ?? null;

      // Process strength exercises
      dailyTraining.exercises.forEach((exercise: TrainingExercise) => {
        if (!exercise.completed) return;

        // Handle strength exercises
        if (exercise.exercise && exercise.sets && exercise.sets.length > 0) {
          const targetArea = exercise.exercise.target_area as TargetArea | undefined;
          if (!targetArea) return;

          // Calculate volume: sum of (weight × reps) for all completed sets
          let volumeKg = 0;
          exercise.sets.forEach(set => {
            if (set.completed && set.weight && set.reps) {
              volumeKg += set.weight * set.reps;
            }
          });

          if (volumeKg > 0) {
            // Estimate duration: 2.5 min per set
            const durationMinutes = exercise.sets.filter(s => s.completed).length * 2.5;

            data.push({
              date: dateKey,
              targetArea,
              volumeKg,
              sessionRPE,
              durationMinutes,
            });
          }
        }

        // Handle endurance sessions
        if (exercise.enduranceSession && exercise.enduranceSession.completed) {
          const sportType = exercise.enduranceSession.sportType?.toLowerCase() || 'other';
          const targetArea = ENDURANCE_TO_TARGET_AREA[sportType];

          if (targetArea) {
            // For endurance, we use a standardized volume based on duration
            // 1 minute of cardio ≈ 10 "volume units" for comparison
            const durationMinutes = exercise.enduranceSession.actualDuration
              ? exercise.enduranceSession.actualDuration / 60
              : exercise.enduranceSession.trainingVolume;

            const equivalentVolume = durationMinutes * 10;

            data.push({
              date: dateKey,
              targetArea,
              volumeKg: equivalentVolume,
              sessionRPE,
              durationMinutes,
            });
          }
        }
      });
    });
  });

  return data;
}

/**
 * Calculate ACWR for a specific muscle group
 *
 * ACWR = Acute Load (7 days) / Chronic Load (28 days average)
 *
 * Thresholds (Bourdon et al. 2017):
 * - > 1.5: needs_rest (injury risk)
 * - > 1.2: recovering (elevated)
 * - 0.8 - 1.2: recovered (optimal)
 * - < 0.8: recovered (detraining risk)
 * - null: not_trained_yet
 */
export function calculateACWR(
  volumeData: DailyVolumeData[],
  targetArea: TargetArea,
  referenceDate: Date = new Date()
): { acwr: number | null; acuteLoad: number; chronicLoad: number; lastTrainedAt: Date | null } {
  const refDateStr = referenceDate.toISOString().split('T')[0];

  // Filter data for this target area
  const areaData = volumeData.filter(d => d.targetArea === targetArea);

  if (areaData.length === 0) {
    return { acwr: null, acuteLoad: 0, chronicLoad: 0, lastTrainedAt: null };
  }

  // Calculate date boundaries
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const twentyEightDaysAgo = new Date(referenceDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const twentyEightDaysAgoStr = twentyEightDaysAgo.toISOString().split('T')[0];

  // Calculate acute load (last 7 days)
  const acuteData = areaData.filter(d => d.date >= sevenDaysAgoStr && d.date <= refDateStr);
  const acuteLoad = acuteData.reduce((sum, d) => sum + d.volumeKg, 0);

  // Calculate chronic load (last 28 days, daily average)
  const chronicData = areaData.filter(d => d.date >= twentyEightDaysAgoStr && d.date <= refDateStr);

  if (chronicData.length === 0) {
    return { acwr: null, acuteLoad, chronicLoad: 0, lastTrainedAt: null };
  }

  // Count unique training days for proper averaging
  const uniqueDays = new Set(chronicData.map(d => d.date)).size;
  const daysAvailable = Math.min(uniqueDays, 28);

  const chronicLoadTotal = chronicData.reduce((sum, d) => sum + d.volumeKg, 0);
  const chronicLoad = daysAvailable > 0 ? chronicLoadTotal / daysAvailable : 0;

  // Find last trained date
  const sortedDates = areaData.map(d => d.date).sort().reverse();
  const lastTrainedAt = sortedDates.length > 0 ? new Date(sortedDates[0]) : null;

  // Calculate ACWR
  if (chronicLoad === 0) {
    return { acwr: null, acuteLoad, chronicLoad, lastTrainedAt };
  }

  const acwr = acuteLoad / chronicLoad;

  return { acwr, acuteLoad, chronicLoad, lastTrainedAt };
}

/**
 * Determine recovery status from ACWR value
 */
export function getRecoveryStatus(acwr: number | null): RecoveryStatus {
  if (acwr === null) {
    return 'not_trained_yet';
  }
  if (acwr > 1.5) {
    return 'needs_rest';
  }
  if (acwr > 1.2) {
    return 'recovering';
  }
  // ACWR between 0.8 and 1.2, or below 0.8 (detraining) - both considered "recovered"
  return 'recovered';
}

/**
 * Get recommendation based on recovery status
 */
export function getRecoveryRecommendation(status: RecoveryStatus, targetArea: TargetArea): string {
  switch (status) {
    case 'needs_rest':
      return `Your ${targetArea.toLowerCase()} need rest. Consider reducing training intensity for this muscle group.`;
    case 'recovering':
      return `Your ${targetArea.toLowerCase()} are still recovering. Light training is okay, but avoid high intensity.`;
    case 'recovered':
      return `Your ${targetArea.toLowerCase()} are ready for training. You can train at full intensity.`;
    case 'not_trained_yet':
      return `No recent training data for ${targetArea.toLowerCase()}. Start training to build a baseline.`;
    default:
      return '';
  }
}

/**
 * All possible target areas for recovery tracking
 */
export const ALL_TARGET_AREAS: TargetArea[] = [
  'Calves',
  'Upper Arms',
  'Back',
  'Shoulder',
  'Hips',
  'Chest',
  'Thighs',
  'Abs',
  'Forearms',
  'Neck',
];

/**
 * Calculate recovery status for all muscle groups (including untrained ones)
 */
export function calculateAllMuscleRecoveryStatus(
  trainingPlan: TrainingPlan | null,
  referenceDate: Date = new Date()
): MuscleRecoveryStatus[] {
  const volumeData = extractCompletedTrainingData(trainingPlan);

  // Get unique target areas that have been trained
  const trainedAreas = new Set<TargetArea>();
  volumeData.forEach(d => trainedAreas.add(d.targetArea));

  // Calculate recovery for ALL target areas (including untrained ones)
  const results: MuscleRecoveryStatus[] = [];

  ALL_TARGET_AREAS.forEach(targetArea => {
    if (trainedAreas.has(targetArea)) {
      // Calculate recovery for trained areas
      const { acwr, acuteLoad, chronicLoad, lastTrainedAt } = calculateACWR(
        volumeData,
        targetArea,
        referenceDate
      );

      const status = getRecoveryStatus(acwr);
      const recommendation = getRecoveryRecommendation(status, targetArea);

      results.push({
        targetArea,
        status,
        acwr,
        acuteLoad,
        chronicLoad,
        lastTrainedAt,
        recommendation,
      });
    } else {
      // Create "not_trained_yet" entry for untrained areas
      results.push({
        targetArea,
        status: 'not_trained_yet',
        acwr: null,
        acuteLoad: 0,
        chronicLoad: 0,
        lastTrainedAt: null,
        recommendation: getRecoveryRecommendation('not_trained_yet', targetArea),
      });
    }
  });

  // Sort by status priority: needs_rest > recovering > recovered > not_trained_yet
  const statusOrder: Record<RecoveryStatus, number> = {
    needs_rest: 0,
    recovering: 1,
    recovered: 2,
    not_trained_yet: 3,
  };

  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return results;
}

/**
 * Calculate session load for a single daily training
 * Used for UX stress score calculation (optional, can be hidden from UI)
 */
export function calculateSessionLoad(
  dailyTraining: DailyTraining,
  baselineVolumes: Record<TargetArea, number>
): SessionLoadResult {
  const muscleVolumesKg: Record<TargetArea, number> = {} as Record<TargetArea, number>;
  let totalStrengthVolume = 0;
  let enduranceMinutes = 0;
  let enduranceDistanceKm: number | null = null;
  let totalSets = 0;

  dailyTraining.exercises.forEach((exercise: TrainingExercise) => {
    if (!exercise.completed) return;

    // Strength exercises
    if (exercise.exercise && exercise.sets) {
      const targetArea = exercise.exercise.target_area as TargetArea | undefined;
      if (targetArea) {
        let exerciseVolume = 0;
        exercise.sets.forEach(set => {
          if (set.completed && set.weight && set.reps) {
            exerciseVolume += set.weight * set.reps;
            totalSets++;
          }
        });
        muscleVolumesKg[targetArea] = (muscleVolumesKg[targetArea] || 0) + exerciseVolume;
        totalStrengthVolume += exerciseVolume;
      }
    }

    // Endurance sessions
    if (exercise.enduranceSession?.completed) {
      const duration = exercise.enduranceSession.actualDuration
        ? exercise.enduranceSession.actualDuration / 60
        : exercise.enduranceSession.trainingVolume;
      enduranceMinutes += duration;

      if (exercise.enduranceSession.actualDistance) {
        enduranceDistanceKm = (enduranceDistanceKm || 0) + exercise.enduranceSession.actualDistance / 1000;
      }
    }
  });

  // Resolve session duration
  let resolvedDuration: number | null = null;
  if (dailyTraining.duration) {
    resolvedDuration = dailyTraining.duration;
  } else if (totalSets > 0) {
    resolvedDuration = totalSets * 2.5; // 2.5 min per set estimate
  }
  resolvedDuration = resolvedDuration ? resolvedDuration + enduranceMinutes : null;

  // Calculate internal load (sRPE × duration) - skip if sessionRPE is missing
  const sessionRPE = dailyTraining.sessionRPE;
  const internalLoad = (sessionRPE && resolvedDuration) ? sessionRPE * resolvedDuration : null;

  // Calculate normalized strength load (total vs baseline)
  const totalBaseline = Object.values(baselineVolumes).reduce((sum, v) => sum + v, 0);
  const normalizedStrengthLoad = totalBaseline > 0 ? totalStrengthVolume / totalBaseline : null;

  // Calculate normalized load per muscle
  const normalizedLoadPerMuscle: Record<TargetArea, number | null> = {} as Record<TargetArea, number | null>;
  Object.keys(muscleVolumesKg).forEach(key => {
    const area = key as TargetArea;
    const baseline = baselineVolumes[area] || 0;
    normalizedLoadPerMuscle[area] = baseline > 0 ? muscleVolumesKg[area] / baseline : null;
  });

  // Calculate UX stress score (internal-dominant)
  // uxStressScore = internalLoad × (1 + 0.25 × min(normalizedStrengthLoad, 2))
  let uxStressScore: number | null = null;
  if (internalLoad !== null) {
    const strengthModifier = normalizedStrengthLoad !== null
      ? Math.min(normalizedStrengthLoad, 2)
      : 0;
    uxStressScore = internalLoad * (1 + 0.25 * strengthModifier);
  }

  return {
    internalLoad,
    external: {
      enduranceMinutes,
      enduranceDistanceKm,
      strengthVolumeKg: totalStrengthVolume,
      muscleVolumesKg,
    },
    normalizedStrengthLoad,
    normalizedLoadPerMuscle,
    uxStressScore,
  };
}

/**
 * Calculate baseline volumes for normalization
 * Uses available data up to 28 days
 */
export function calculateBaselineVolumes(
  trainingPlan: TrainingPlan | null,
  referenceDate: Date = new Date()
): Record<TargetArea, number> {
  const volumeData = extractCompletedTrainingData(trainingPlan);

  const twentyEightDaysAgo = new Date(referenceDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const twentyEightDaysAgoStr = twentyEightDaysAgo.toISOString().split('T')[0];
  const refDateStr = referenceDate.toISOString().split('T')[0];

  // Filter to last 28 days
  const recentData = volumeData.filter(d => d.date >= twentyEightDaysAgoStr && d.date <= refDateStr);

  // Group by target area and calculate daily average
  const areaVolumes: Record<TargetArea, number[]> = {} as Record<TargetArea, number[]>;

  recentData.forEach(d => {
    if (!areaVolumes[d.targetArea]) {
      areaVolumes[d.targetArea] = [];
    }
    areaVolumes[d.targetArea].push(d.volumeKg);
  });

  // Calculate average per area
  const baselines: Record<TargetArea, number> = {} as Record<TargetArea, number>;
  Object.keys(areaVolumes).forEach(key => {
    const area = key as TargetArea;
    const volumes = areaVolumes[area];
    const uniqueDays = new Set(recentData.filter(d => d.targetArea === area).map(d => d.date)).size;
    const daysAvailable = Math.min(uniqueDays, 28);
    baselines[area] = daysAvailable > 0
      ? volumes.reduce((sum, v) => sum + v, 0) / daysAvailable
      : 0;
  });

  return baselines;
}

/**
 * Get color for recovery status (for UI)
 */
export function getRecoveryStatusColor(status: RecoveryStatus): string {
  switch (status) {
    case 'needs_rest':
      return '#F44336'; // Red
    case 'recovering':
      return '#FF9800'; // Orange/Warning
    case 'recovered':
      return '#4CAF50'; // Green/Success
    case 'not_trained_yet':
      return '#6B6B6B'; // Gray/Muted
    default:
      return '#6B6B6B';
  }
}

/**
 * Format ACWR value for display
 */
export function formatACWR(acwr: number | null): string {
  if (acwr === null) {
    return '-';
  }
  return acwr.toFixed(2);
}
