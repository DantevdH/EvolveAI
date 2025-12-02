// Enhanced Insights Analytics Service
// Provides comprehensive analytics for the insights dashboard

import { supabase } from '@/src/config/supabase';
import { ExerciseAnalyticsEngine } from '@/src/services/exerciseAnalyticsEngine';
import { TrainingPlan, TrainingExercise, DailyTraining } from '@/src/types/training';
import { 
  InsightsSummary, 
  InsightsMetrics, 
  InsightsSummaryResponse, 
  InsightsSummaryData 
} from '@/src/types/insights';

/**
 * Extract completed exercises from local TrainingPlan and convert to database-like format
 */
interface ExtractedExercise {
  exercise_id: number;
  weight: number[];
  reps: number[];
  updated_at: string;
  completed: boolean;
  exercises: { 
    name: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    main_muscles?: string[];
    primary_muscle?: string;
  };
  daily_training: {
    completedAt?: Date;
    sessionRPE?: number;
  };
  weekNumber?: number; // For weekly aggregation
}

function extractCompletedExercisesFromLocalPlan(trainingPlan: TrainingPlan | null): ExtractedExercise[] {
  if (!trainingPlan) return [];

  const extracted: ExtractedExercise[] = [];

      trainingPlan.weeklySchedules.forEach(week => {
        week.dailyTrainings.forEach(dailyTraining => {
          // Only include completed daily trainings
          if (!dailyTraining.completed || !dailyTraining.completedAt) {
            return;
          }

          // Use daily training completedAt (which maps to updated_at from database)
          // Note: daily_training table doesn't have completed_at, so we use updated_at as completedAt
          const completedDate = dailyTraining.completedAt;

          dailyTraining.exercises.forEach((exercise: TrainingExercise) => {
            // Only include completed strength exercises with sets
            if (!exercise.completed || !exercise.exercise || !exercise.sets || exercise.sets.length === 0) {
              return;
            }

            // Skip endurance sessions
            if (exercise.enduranceSession) {
              return;
            }

            // Extract weight and reps arrays from sets
            const weights: number[] = [];
            const reps: number[] = [];

            exercise.sets.forEach(set => {
              if (set.completed) {
                weights.push(set.weight || 0);
                reps.push(set.reps || 0);
              }
            });

            // Only include if we have at least one completed set
            if (weights.length === 0 || reps.length === 0) {
              return;
            }

            // Convert exerciseId to number (it might be string like "123" or number like 123)
            const exerciseId = typeof exercise.exerciseId === 'string' 
              ? parseInt(exercise.exerciseId.replace(/\D/g, ''), 10) 
              : Number(exercise.exerciseId);

            if (isNaN(exerciseId)) {
              console.warn('Skipping exercise with invalid exerciseId:', exercise.exerciseId);
              return;
            }

            // Extract primary muscle (first main muscle or fallback)
            const primaryMuscle = exercise.exercise.main_muscles?.[0] || exercise.exercise.target_area || 'Unknown';

            extracted.push({
              exercise_id: exerciseId,
              weight: weights,
              reps: reps,
              updated_at: completedDate.toISOString(),
              completed: true,
              exercises: {
                name: exercise.exercise.name || 'Unknown Exercise',
                difficulty: exercise.exercise.difficulty,
                main_muscles: exercise.exercise.main_muscles,
                primary_muscle: primaryMuscle
              },
              daily_training: {
                completedAt: dailyTraining.completedAt,
                sessionRPE: dailyTraining.sessionRPE
              },
              weekNumber: week.weekNumber
            });
          });
        });
      });

  return extracted;
}

export interface WeeklyVolumeData {
  week: string;
  volume: number;
  trainings: number;
  exercises: number;
}

export interface PerformanceScoreData {
  date: string;
  score: number;
  volume: number;
  consistency: number;
  improvement: number;
}

export interface TopPerformingExercise {
  id: number;
  name: string;
  currentVolume: number;
  improvementRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastTraining: string;
  totalTrainings: number;
  insights: any; // Full insights from ExerciseAnalyticsEngine
}

export interface WeakPointAnalysis {
  muscleGroup: string;
  affectedExercises: Array<{
    id: number;
    name: string;
  }>;
  issue: 'plateau' | 'declining' | 'inconsistent' | 'low_frequency';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  metrics: {
    current: number;
    previous: number;
    change: number;
  };
}


export interface PlateauDetection {
  exercise: {
    id: number;
    name: string;
  };
  plateauStart: string;
  duration: number; // weeks
  severity: 'mild' | 'moderate' | 'severe';
  lastImprovement: string;
}

export interface ProgressionVelocity {
  exercise: {
    id: number;
    name: string;
  };
  volumeVelocity: number; // lbs/week
  strengthVelocity: number; // lbs/week (1RM)
  trend: 'accelerating' | 'stable' | 'decelerating';
}

export interface ForecastData {
  week: number;
  predictedVolume: number;
  confidence: number;
  exercise?: string;
}

export interface MilestonePrediction {
  exercise: {
    id: number;
    name: string;
  };
  current1RM: number;
  nextMilestone: number;
  predictedDate: string;
  confidence: number;
  weeksToGoal: number;
}

export interface TrainingFrequencyData {
  date: string;
  hasTraining: boolean;
  intensity: number; // 0-1 based on volume
}

export class InsightsAnalyticsService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Get weekly volume trend data for the last 52 weeks (1 year)
   * If localPlan is provided, uses it instead of querying the database
   */
  static async getWeeklyVolumeTrend(
    userProfileId: number, 
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: WeeklyVolumeData[];
    error?: string;
  }> {
    const cacheKey = `weekly-volume-${userProfileId}`;
    const cached = this.cache.get(cacheKey);
    // Skip cache if using local plan (always use fresh local data)
    if (!localPlan && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { success: true, data: cached.data };
    }

    try {
      let strengthExercises: any[] = [];

      if (localPlan) {
        // Use local plan data
        strengthExercises = extractCompletedExercisesFromLocalPlan(localPlan);
      } else {
        // Get strength exercises for the last 52 weeks (1 year) from database
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365); // 1 year

        const { data, error: exercisesError } = await supabase
          .from('strength_exercise')
          .select(`
            *,
            exercises!inner(name),
            daily_training!inner(
              *,
              weekly_schedules!inner(
                training_plans!inner(
                  user_profile_id
                )
              )
            )
          `)
          .eq('completed', true)
          .eq('daily_training.completed', true)
          .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
          .gte('updated_at', oneYearAgo.toISOString())
          .order('updated_at', { ascending: false });

        if (exercisesError) {
          return { success: false, error: exercisesError.message };
        }

        strengthExercises = data || [];
      }

      if (strengthExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Group by week
      const weeklyData: { [key: string]: WeeklyVolumeData } = {};
      
      strengthExercises.forEach(training => {
        const date = new Date(training.updated_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            week: weekKey,
            volume: 0,
            trainings: 0,
            exercises: 0
          };
        }
        
        // Calculate volume
        const weights = Array.isArray(training.weight) ? training.weight : [];
        const reps = Array.isArray(training.reps) ? training.reps : [];
        let volume = 0;
        for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
          volume += (weights[i] || 0) * (reps[i] || 0);
        }
        
        weeklyData[weekKey].volume += volume;
        weeklyData[weekKey].trainings += 1;
        weeklyData[weekKey].exercises += 1;
      });

      // Convert to array and sort by week
      const result = Object.values(weeklyData)
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
        .slice(-12); // Last 12 weeks

      // Only cache database queries, not local plan results
      if (!localPlan) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      return { success: true, data: result };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get performance score trend over time (ETI - Effective Training Index)
   * Implements exact formulas from ANALYSIS_METHODS.md
   * If localPlan is provided, uses it instead of querying the database
   */
  static async getPerformanceScoreTrend(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: PerformanceScoreData[];
    error?: string;
  }> {
    const cacheKey = `performance-score-${userProfileId}`;
    const cached = this.cache.get(cacheKey);
    // Skip cache if using local plan (always use fresh local data)
    if (!localPlan && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { success: true, data: cached.data };
    }

    try {
      // Get all exercises with session-RPE data
      let strengthExercises: ExtractedExercise[] = [];

      if (localPlan) {
        strengthExercises = extractCompletedExercisesFromLocalPlan(localPlan);
      } else {
        // Get from database with session-RPE
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data, error: exercisesError } = await supabase
          .from('strength_exercise')
          .select(`
            *,
            exercises!inner(name, difficulty, main_muscles, target_area),
            daily_training!inner(
              *,
              weekly_schedules!inner(
                training_plans!inner(
                  user_profile_id
                )
              )
            )
          `)
          .eq('completed', true)
          .eq('daily_training.completed', true)
          .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
          .gte('updated_at', oneYearAgo.toISOString())
          .order('updated_at', { ascending: false });

        if (exercisesError) {
          return { success: false, error: exercisesError.message };
        }

        // Transform database format to ExtractedExercise format
        strengthExercises = (data || []).map((se: any) => ({
          exercise_id: se.exercise_id,
          weight: se.weight || [],
          reps: se.reps || [],
          updated_at: se.updated_at,
          completed: se.completed,
          exercises: {
            name: se.exercises?.name || 'Unknown',
            difficulty: se.exercises?.difficulty,
            main_muscles: se.exercises?.main_muscles || [],
            primary_muscle: se.exercises?.main_muscles?.[0] || se.exercises?.target_area || 'Unknown'
          },
          daily_training: {
            completedAt: se.daily_training?.updated_at ? new Date(se.daily_training.updated_at) : undefined,
            sessionRPE: se.daily_training?.session_rpe || undefined
          },
          weekNumber: se.daily_training?.weekly_schedules?.week_number || undefined
        }));
      }

      if (strengthExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Group by week and aggregate data
      interface WeekData {
        week: string;
        V_w: number; // total volume
        D_w: number; // number of training days
        exercises: ExtractedExercise[];
        sessionRPEs: number[]; // session-RPE values
        dailyVolumes: number[]; // volume per day for monotony calculation
        exercise1RMs: Map<number, number>; // max 1RM per exercise for the week
      }

      const weeklyDataMap: { [key: string]: WeekData } = {};
      const dailyLoadsMap: { [key: string]: { [day: string]: number } } = {}; // week -> day -> volume

      strengthExercises.forEach(ex => {
        const date = ex.daily_training.completedAt ? new Date(ex.daily_training.completedAt) : new Date(ex.updated_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        const dayKey = date.toISOString().split('T')[0];

        if (!weeklyDataMap[weekKey]) {
          weeklyDataMap[weekKey] = {
            week: weekKey,
            V_w: 0,
            D_w: 0,
            exercises: [],
            sessionRPEs: [],
            dailyVolumes: [],
            exercise1RMs: new Map()
          };
        }

        // Calculate volume for this exercise
        const weights = Array.isArray(ex.weight) ? ex.weight : [];
        const reps = Array.isArray(ex.reps) ? ex.reps : [];
        let exerciseVolume = 0;
        let maxWeight = 0;
        let maxReps = 0;
        
        for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
          const w = weights[i] || 0;
          const r = reps[i] || 0;
          exerciseVolume += w * r;
          if (w > maxWeight || (w === maxWeight && r > maxReps)) {
            maxWeight = w;
            maxReps = r;
          }
        }

        // Calculate 1RM using Epley formula: 1RM = weight × (1 + reps/30)
        const estimated1RM = maxWeight * (1 + maxReps / 30);
        const currentMax1RM = weeklyDataMap[weekKey].exercise1RMs.get(ex.exercise_id) || 0;
        if (estimated1RM > currentMax1RM) {
          weeklyDataMap[weekKey].exercise1RMs.set(ex.exercise_id, estimated1RM);
        }

        // Add session-RPE if available
        if (ex.daily_training.sessionRPE !== undefined && ex.daily_training.sessionRPE !== null) {
          weeklyDataMap[weekKey].sessionRPEs.push(ex.daily_training.sessionRPE);
        }

        // Track daily volumes for monotony calculation
        if (!dailyLoadsMap[weekKey]) {
          dailyLoadsMap[weekKey] = {};
        }
        dailyLoadsMap[weekKey][dayKey] = (dailyLoadsMap[weekKey][dayKey] || 0) + exerciseVolume;

        weeklyDataMap[weekKey].V_w += exerciseVolume;
        weeklyDataMap[weekKey].exercises.push(ex);
      });

      // Calculate D_w (distinct training days) for each week
      Object.keys(weeklyDataMap).forEach(weekKey => {
        const uniqueDays = new Set<string>();
        weeklyDataMap[weekKey].exercises.forEach(ex => {
          const date = ex.daily_training.completedAt ? new Date(ex.daily_training.completedAt) : new Date(ex.updated_at);
          uniqueDays.add(date.toISOString().split('T')[0]);
        });
        weeklyDataMap[weekKey].D_w = uniqueDays.size;

        // Aggregate daily volumes for monotony
        const dailyVolumes = Object.values(dailyLoadsMap[weekKey] || {});
        weeklyDataMap[weekKey].dailyVolumes = dailyVolumes;
      });

      // Convert to array and sort by week
      const weeks = Object.values(weeklyDataMap)
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
        .slice(-12); // Last 12 weeks

      if (weeks.length === 0) {
        return { success: true, data: [] };
      }

      // Calculate V_norm (4-week rolling mean baseline)
      const calculateVNorm = (weekIndex: number): number => {
        const lookbackWeeks = weeks.slice(Math.max(0, weekIndex - 4), weekIndex);
        if (lookbackWeeks.length === 0) {
          // If no historical data, use current week as baseline
          return weeks[weekIndex]?.V_w || 1;
        }
        const sum = lookbackWeeks.reduce((acc, w) => acc + w.V_w, 0);
        return sum / lookbackWeeks.length || 1; // Avoid division by zero
      };

      // Calculate ETI for each week
      const performanceData: PerformanceScoreData[] = [];
      const ETI_WEIGHTS = { wE: 0.35, wC: 0.25, wP: 0.30, wR: 0.10 };
      const MONOTONY_THRESH = 2.0;

      for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        const previousWeek = i > 0 ? weeks[i - 1] : null;

        // 1. Normalized Effort (E)
        const V_norm = calculateVNorm(i);
        const V_ratio = week.V_w / V_norm;
        const E = Math.min(2, Math.max(0, V_ratio)) / 2;

        // 2. Consistency (C)
        const C = week.D_w / 7;

        // 3. Productivity (P) - based on 1RM changes
        let P = 0.5; // Default neutral productivity
        if (previousWeek) {
          // Calculate average % change in 1RM across top exercises
          const exercisesThisWeek = Array.from(week.exercise1RMs.keys());
          let total1RMChange = 0;
          let count = 0;

          exercisesThisWeek.forEach(exerciseId => {
            const current1RM = week.exercise1RMs.get(exerciseId) || 0;
            const prev1RM = previousWeek.exercise1RMs.get(exerciseId) || current1RM;
            
            if (prev1RM > 0 && current1RM > 0) {
              const changePct = 100 * (current1RM - prev1RM) / prev1RM;
              total1RMChange += Math.max(-10, Math.min(50, changePct)); // Clamp to [-10, +50]
              count++;
            }
          });

          if (count > 0) {
            const avg1RMChange = total1RMChange / count;
            P = Math.min(1, Math.max(0, (avg1RMChange / 10) + 0.5)); // Clamp to [0, 1]
          }
        }

        // 4. Recovery / Fatigue Penalty (R_pen)
        let R_pen = 0;
        
        // Option B: Session-RPE-based (preferred) - Updated for 1-5 scale
        if (week.sessionRPEs.length > 0) {
          const sRPE_mean = week.sessionRPEs.reduce((a, b) => a + b, 0) / week.sessionRPEs.length;
          const sRPE_spike = Math.max(...week.sessionRPEs) - sRPE_mean;
          // Normalize to 0-1 range: (mean/5) * 0.6 + (spike/5) * 0.4 since RPE is now 1-5 scale
          R_pen = Math.min(1, Math.max(0, (sRPE_mean / 5) * 0.6 + (sRPE_spike / 5) * 0.4));
        } 
        // Option A: Volume-based monotony (fallback)
        else if (week.dailyVolumes.length > 1) {
          const meanDailyLoad = week.dailyVolumes.reduce((a, b) => a + b, 0) / week.dailyVolumes.length;
          const sdDailyLoad = Math.sqrt(
            week.dailyVolumes.reduce((sum, v) => sum + Math.pow(v - meanDailyLoad, 2), 0) / week.dailyVolumes.length
          );
          const Monotony_w = sdDailyLoad > 0 ? meanDailyLoad / sdDailyLoad : 0;
          R_pen = Math.min(1, Math.max(0, Monotony_w / MONOTONY_THRESH));
        }

        // Calculate ETI
        const ETI_raw = ETI_WEIGHTS.wE * E + ETI_WEIGHTS.wC * C + ETI_WEIGHTS.wP * P - ETI_WEIGHTS.wR * R_pen;
        const ETI = Math.round(100 * Math.min(1, Math.max(0, ETI_raw)));

        performanceData.push({
          date: week.week,
          score: ETI,
          volume: Math.round(week.V_w),
          consistency: Math.round(C * 100),
          improvement: previousWeek ? Math.round(((week.V_w - previousWeek.V_w) / previousWeek.V_w) * 100) : 0
        });
      }

      // Only cache database queries, not local plan results
      if (!localPlan) {
        this.cache.set(cacheKey, { data: performanceData, timestamp: Date.now() });
      }
      return { success: true, data: performanceData };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get top 3 performing exercises
   * Note: Currently uses database queries, localPlan parameter reserved for future implementation
   */
  static async getTopPerformingExercises(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: TopPerformingExercise[];
    error?: string;
  }> {
    try {
      // Get all exercises with recent trainings
      const { data: exercises, error } = await supabase
        .from('strength_exercise')
        .select(`
          exercise_id,
          exercises!inner(name)
        `)
        .eq('completed', true)
        .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId);

      if (error) {
        return { success: false, error: error.message };
      }

      const uniqueExercises = Array.from(
        new Map(exercises?.map((e: any) => [e.exercise_id, e.exercises])).entries()
      ).map(([id, exercise]: [any, any]) => ({ id: Number(id), name: exercise?.name || 'Unknown' }));

      // Get insights for each exercise and rank by performance
      const exerciseInsights = await Promise.all(
        uniqueExercises.map(async (exercise) => {
          try {
            const insights = await ExerciseAnalyticsEngine.generateInsights(
              await this.getExerciseTrainingHistory(exercise.id, userProfileId)
            );
            
            return {
              id: exercise.id,
              name: exercise.name,
              currentVolume: insights.volumeTrend.volatility,
              improvementRate: insights.strengthProgression.improvementRate,
              trend: insights.volumeTrend.trend,
              lastTraining: insights.strengthProgression.strengthGains[insights.strengthProgression.strengthGains.length - 1]?.date || '',
              totalTrainings: insights.strengthProgression.strengthGains.length,
              insights
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Filter out null results and sort by performance score
      const validInsights = exerciseInsights.filter(Boolean) as TopPerformingExercise[];
      const topExercises = validInsights
        .sort((a, b) => b.insights.overallScore - a.insights.overallScore)
        .slice(0, 3);

      return { success: true, data: topExercises };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get weak points analysis grouped by primary muscle (MWS - Muscle Group Weakness Score)
   * Implements exact formulas from ANALYSIS_METHODS.md
   * If localPlan is provided, uses it instead of querying the database
   */
  static async getWeakPointsAnalysis(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: WeakPointAnalysis[];
    error?: string;
  }> {
    try {
      // Get all exercises with difficulty and primary muscle data
      let allExercises: ExtractedExercise[] = [];

      if (localPlan) {
        allExercises = extractCompletedExercisesFromLocalPlan(localPlan);
      } else {
        const { data: exercises, error } = await supabase
          .from('strength_exercise')
          .select(`
            *,
            exercises!inner(name, difficulty, main_muscles, target_area),
            daily_training!inner(
              *,
              weekly_schedules!inner(
                training_plans!inner(
                  user_profile_id
                )
              )
            )
          `)
          .eq('completed', true)
          .eq('daily_training.completed', true)
          .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
          .order('updated_at', { ascending: false });

        if (error) {
          return { success: false, error: error.message };
        }

        // Transform to ExtractedExercise format
        allExercises = (exercises || []).map((se: any) => {
          const weights = Array.isArray(se.weight) ? se.weight : [];
          const reps = Array.isArray(se.reps) ? se.reps : [];
          const primaryMuscle = se.exercises?.main_muscles?.[0] || se.exercises?.target_area || 'Unknown';
          
          return {
            exercise_id: se.exercise_id,
            weight: weights,
            reps: reps,
            updated_at: se.updated_at,
            completed: se.completed,
            exercises: {
              name: se.exercises?.name || 'Unknown',
              difficulty: se.exercises?.difficulty,
              main_muscles: se.exercises?.main_muscles || [],
              primary_muscle: primaryMuscle
            },
            daily_training: {
              completedAt: se.daily_training?.updated_at ? new Date(se.daily_training.updated_at) : undefined,
              sessionRPE: se.daily_training?.session_rpe || undefined
            },
            weekNumber: se.daily_training?.weekly_schedules?.week_number || undefined
          };
        });
      }

      if (allExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Group exercises by primary muscle
      const muscleGroups = new Map<string, ExtractedExercise[]>();
      allExercises.forEach(ex => {
        const primaryMuscle = ex.exercises.primary_muscle || 'Unknown';
        if (!muscleGroups.has(primaryMuscle)) {
          muscleGroups.set(primaryMuscle, []);
        }
        muscleGroups.get(primaryMuscle)!.push(ex);
      });

      // Helper function: Calculate linear regression slope
      const calculateSlope = (xValues: number[], yValues: number[]): number => {
        if (xValues.length !== yValues.length || xValues.length < 2) return 0;
        const n = xValues.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
        const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
        const denominator = n * sumX2 - sumX * sumX;
        return denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      };

      // Helper function: Calculate coefficient of variation
      const calculateCV = (values: number[]): number => {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        if (mean === 0) return 0;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const sd = Math.sqrt(variance);
        return sd / mean;
      };

      // Helper function: Get exercise difficulty weight
      const getDifficultyWeight = (difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'): number => {
        if (difficulty === 'Advanced') return 1.5;
        if (difficulty === 'Intermediate') return 1.0;
        return 0.7; // Beginner or unknown
      };

      // Analyze each muscle group
      const weakPoints: WeakPointAnalysis[] = [];

      for (const [muscleGroup, exercises] of muscleGroups) {
        // Get unique exercises (by exercise_id)
        const uniqueExercises = Array.from(
          new Map(exercises.map(ex => [ex.exercise_id, ex])).entries()
        ).map(([_, ex]) => ex);

        // Per-exercise signals
        interface ExerciseSignals {
          exerciseId: number;
          exerciseName: string;
          difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
          Plate_i: number;
          Decl_i: number;
          Inc_i: number;
          volumeHistory: number[];
          weeksTrainedInLast4: number;
        }

        const exerciseSignals: ExerciseSignals[] = [];

        // Get date range for last 4-8 weeks
        const now = new Date();
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(now.getDate() - 56); // 8 weeks

        for (const exercise of uniqueExercises) {
          // Get last 6-12 sessions for this exercise
          const exerciseSessions = exercises
            .filter(ex => ex.exercise_id === exercise.exercise_id)
            .sort((a, b) => {
              const dateA = a.daily_training.completedAt ? new Date(a.daily_training.completedAt) : new Date(a.updated_at);
              const dateB = b.daily_training.completedAt ? new Date(b.daily_training.completedAt) : new Date(b.updated_at);
              return dateB.getTime() - dateA.getTime(); // Most recent first
            })
            .slice(0, 12); // Last 12 sessions

          // Require at least 2 sessions for basic analysis
          if (exerciseSessions.length < 2) {
            // Not enough data, skip this exercise
            continue;
          }

          // Calculate volumes for each session
          const volumes: number[] = [];
          exerciseSessions.forEach(session => {
            const weights = Array.isArray(session.weight) ? session.weight : [];
            const reps = Array.isArray(session.reps) ? session.reps : [];
            let volume = 0;
            for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
              volume += (weights[i] || 0) * (reps[i] || 0);
            }
            volumes.push(volume);
          });

          // Reverse to chronological order (oldest to newest)
          volumes.reverse();

          if (volumes.length === 0 || volumes.every(v => v === 0)) {
            continue;
          }

          // Calculate slope and CV (only if we have enough data)
          const xValues = volumes.map((_, i) => i);
          const slope = calculateSlope(xValues, volumes);
          const cv = volumes.length >= 6 ? calculateCV(volumes) : 0.5; // Default CV if not enough data
          const meanVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

          // 1. Plateau Signal (Plate_i)
          // For < 6 sessions, use simplified calculation
          const slopeThresh = 0.1 * meanVolume;
          let Plate_i = 0;
          if (volumes.length >= 6) {
            // Full calculation for 6+ sessions
            if (cv < 0.15 && Math.abs(slope) < slopeThresh) {
              Plate_i = 1;
            } else if (cv < 0.15) {
              Plate_i = 0.8; // High CV threshold met
            } else if (Math.abs(slope) < slopeThresh) {
              Plate_i = 0.5; // Low slope threshold met
            } else {
              // Scale by closeness to thresholds
              const cvScore = Math.max(0, 1 - (cv - 0.15) / 0.05);
              const slopeScore = Math.max(0, 1 - Math.abs(slope) / slopeThresh);
              Plate_i = (cvScore + slopeScore) / 2;
            }
          } else {
            // Simplified for < 6 sessions: use slope only
            if (meanVolume > 0 && Math.abs(slope) < slopeThresh) {
              Plate_i = 0.3; // Low confidence plateau
            } else {
              Plate_i = 0.1; // Likely progressing
            }
          }

          // 2. Decline Signal (Decl_i)
          const slopeScale = meanVolume > 0 ? meanVolume / 10 : 1;
          const Decl_i = slope < 0 ? Math.min(1, Math.max(0, -slope / slopeScale)) : 0;

          // 3. Inconsistency (Inc_i) - based on weeks trained in last 4 weeks
          const fourWeeksAgo = new Date(now);
          fourWeeksAgo.setDate(now.getDate() - 28);
          
          const sessionsInLast4Weeks = exerciseSessions.filter(session => {
            const date = session.daily_training.completedAt ? new Date(session.daily_training.completedAt) : new Date(session.updated_at);
            return date >= fourWeeksAgo;
          });

          // Group by week
          const weeksTrained = new Set<string>();
          sessionsInLast4Weeks.forEach(session => {
            const date = session.daily_training.completedAt ? new Date(session.daily_training.completedAt) : new Date(session.updated_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weeksTrained.add(weekStart.toISOString().split('T')[0]);
          });

          const weeksTrainedCount = weeksTrained.size;
          const Inc_i = 1 - (weeksTrainedCount / 4);

          exerciseSignals.push({
            exerciseId: exercise.exercise_id,
            exerciseName: exercise.exercises.name,
            difficulty: exercise.exercises.difficulty,
            Plate_i,
            Decl_i,
            Inc_i,
            volumeHistory: volumes,
            weeksTrainedInLast4: weeksTrainedCount
          });
        }

        // Include muscle group even if no exercises meet full criteria
        // This ensures we show all muscle groups that have been trained
        if (exerciseSignals.length === 0 && exercises.length > 0) {
          // Create a basic entry for muscle groups with exercises but insufficient data
          const allExercisesForGroup = Array.from(
            new Map(exercises.map(ex => [ex.exercise_id, ex])).entries()
          ).map(([_, ex]) => ex);
          
          // Calculate basic frequency penalty
          const fourWeeksAgo = new Date(now);
          fourWeeksAgo.setDate(now.getDate() - 28);
          const recentExercises = exercises.filter(ex => {
            const date = ex.daily_training.completedAt ? new Date(ex.daily_training.completedAt) : new Date(ex.updated_at);
            return date >= fourWeeksAgo;
          });
          
          const weeksTrained = new Set<string>();
          recentExercises.forEach(ex => {
            const date = ex.daily_training.completedAt ? new Date(ex.daily_training.completedAt) : new Date(ex.updated_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weeksTrained.add(weekStart.toISOString().split('T')[0]);
          });
          
          const freq_g = weeksTrained.size;
          const FreqPenalty_g = Math.min(1, Math.max(0, (2 - freq_g) / 2));
          
          // Calculate basic MWS based on frequency only
          const MWS_raw = 0.10 * FreqPenalty_g; // Only frequency component
          const MWS = Math.round(100 * Math.min(1, Math.max(0, MWS_raw)));
          
          weakPoints.push({
            muscleGroup,
            affectedExercises: allExercisesForGroup.slice(0, 3).map(ex => ({
              id: ex.exercise_id,
              name: ex.exercises?.name || 'Unknown Exercise'
            })),
            issue: 'low_frequency',
            severity: 'low',
            recommendation: 'Complete more training sessions (need at least 6 per exercise) for detailed analysis',
            metrics: {
              current: MWS,
              previous: 0,
              change: MWS
            }
          });
          continue;
        }
        
        if (exerciseSignals.length === 0) {
          continue; // Skip muscle groups with no exercises at all
        }

        // Aggregate to muscle group using difficulty-weighted averages
        let weightedPlateSum = 0;
        let weightedDeclSum = 0;
        let weightedIncSum = 0;
        let totalWeight = 0;

        exerciseSignals.forEach(signal => {
          const weight = getDifficultyWeight(signal.difficulty);
          weightedPlateSum += signal.Plate_i * weight;
          weightedDeclSum += signal.Decl_i * weight;
          weightedIncSum += signal.Inc_i * weight;
          totalWeight += weight;
        });

        const Plate_g = totalWeight > 0 ? weightedPlateSum / totalWeight : 0;
        const Decl_g = totalWeight > 0 ? weightedDeclSum / totalWeight : 0;
        const Inc_g = totalWeight > 0 ? weightedIncSum / totalWeight : 0;

        // Frequency Penalty (FreqPenalty_g)
        const avgWeeksTrained = exerciseSignals.reduce((sum, s) => sum + s.weeksTrainedInLast4, 0) / exerciseSignals.length;
        const freq_g = avgWeeksTrained;
        const FreqPenalty_g = Math.min(1, Math.max(0, (2 - freq_g) / 2));

        // Calculate MWS (Composite Muscle Weakness Score)
        const MWS_raw = 0.45 * Plate_g + 0.30 * Decl_g + 0.15 * Inc_g + 0.10 * FreqPenalty_g;
        const MWS = Math.round(100 * Math.min(1, Math.max(0, MWS_raw)));

        // Include ALL muscle groups, regardless of MWS score
        // Determine severity and issue type
        let issue: 'plateau' | 'declining' | 'inconsistent' | 'low_frequency' = 'plateau';
        let severity: 'low' | 'medium' | 'high' = 'low';

        if (MWS >= 75) {
          severity = 'high';
        } else if (MWS >= 60) {
          severity = 'medium';
        } else if (MWS >= 50) {
          severity = 'low';
        } else {
          severity = 'low'; // For scores < 50, still mark as low severity
        }

        // Determine primary issue (highest contributing component)
        // For strength >= 60 (MWS <= 40), use the highest signal but indicate it's not a problem
        if (MWS <= 40) {
          // For good scores (strength >= 60), determine which signal is lowest (best performance)
          if (Plate_g >= Decl_g && Plate_g >= Inc_g && Plate_g >= FreqPenalty_g) {
            issue = 'plateau'; // Still track which area could improve
          } else if (Decl_g >= Inc_g && Decl_g >= FreqPenalty_g) {
            issue = 'declining';
          } else if (Inc_g >= FreqPenalty_g) {
            issue = 'inconsistent';
          } else {
            issue = 'low_frequency';
          }
        } else {
          // For strength < 60 (MWS > 40), use standard logic to determine actual issue
          if (Plate_g >= Decl_g && Plate_g >= Inc_g && Plate_g >= FreqPenalty_g) {
            issue = 'plateau';
          } else if (Decl_g >= Inc_g && Decl_g >= FreqPenalty_g) {
            issue = 'declining';
          } else if (Inc_g >= FreqPenalty_g) {
            issue = 'inconsistent';
          } else {
            issue = 'low_frequency';
          }
        }

        // Get top 3 contributing exercises (by highest Plate_i or Decl_i)
        const topExercises = exerciseSignals
          .sort((a, b) => Math.max(b.Plate_i, b.Decl_i) - Math.max(a.Plate_i, a.Decl_i))
          .slice(0, 3)
          .map(s => ({ id: s.exerciseId, name: s.exerciseName }));

        // Generate recommendation based on new ranges: strength >= 60 (MWS <= 40) = no issues
        // strength < 60 (MWS > 40) = show issues
        let recommendation = '';
        if (MWS <= 40) {
          // Strength >= 60 (Good or Excellent) - no issues
          recommendation = 'No issues detected. Keep up the consistent training!';
        } else if (issue === 'plateau') {
          // Strength < 60 - show specific recommendations
          recommendation = 'Consider exercise variation and deload weeks for this muscle group';
        } else if (issue === 'declining') {
          recommendation = 'Focus on progressive overload and recovery for this muscle group';
        } else if (issue === 'inconsistent') {
          recommendation = 'Improve training frequency and consistency for this muscle group';
        } else {
          recommendation = 'Increase training frequency for this muscle group';
        }

        weakPoints.push({
          muscleGroup,
          affectedExercises: topExercises,
          issue,
          severity,
          recommendation,
          metrics: {
            current: MWS,
            previous: 0,
            change: MWS
          }
        });
      }

      // Sort by MWS (highest first)
      weakPoints.sort((a, b) => b.metrics.current - a.metrics.current);

      return { success: true, data: weakPoints };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get plateau detection across all exercises
   */
  static async getPlateauDetection(userProfileId: number): Promise<{
    success: boolean;
    data?: PlateauDetection[];
    error?: string;
  }> {
    try {
      const topExercises = await this.getTopPerformingExercises(userProfileId);
      if (!topExercises.success || !topExercises.data) {
        return { success: false, error: topExercises.error };
      }

      const plateaus: PlateauDetection[] = [];

      for (const exercise of topExercises.data) {
        const plateauInfo = exercise.insights.plateauDetection;
        
        if (plateauInfo.isPlateaued) {
          plateaus.push({
            exercise: { id: exercise.id, name: exercise.name },
            plateauStart: plateauInfo.plateauStart || '',
            duration: plateauInfo.plateauDuration || 0,
            severity: plateauInfo.severity,
            lastImprovement: exercise.insights.strengthProgression.strengthGains[
              exercise.insights.strengthProgression.strengthGains.length - 1
            ]?.date || ''
          });
        }
      }

      return { success: true, data: plateaus };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get progression velocity for exercises
   */
  static async getProgressionVelocity(userProfileId: number): Promise<{
    success: boolean;
    data?: ProgressionVelocity[];
    error?: string;
  }> {
    try {
      const topExercises = await this.getTopPerformingExercises(userProfileId);
      if (!topExercises.success || !topExercises.data) {
        return { success: false, error: topExercises.error };
      }

      const velocities: ProgressionVelocity[] = [];

      for (const exercise of topExercises.data) {
        const insights = exercise.insights;
        
        velocities.push({
          exercise: { id: exercise.id, name: exercise.name },
          volumeVelocity: insights.volumeTrend.averageGrowthRate,
          strengthVelocity: insights.strengthProgression.improvementRate,
          trend: insights.volumeTrend.trend === 'increasing' ? 'accelerating' :
                 insights.volumeTrend.trend === 'stable' ? 'stable' : 'decelerating'
        });
      }

      return { success: true, data: velocities };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get 4-week forecast
   */
  static async getFourWeekForecast(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: ForecastData[];
    error?: string;
  }> {
    try {
      const weeklyData = await this.getWeeklyVolumeTrend(userProfileId);
      if (!weeklyData.success || !weeklyData.data || weeklyData.data.length < 2) {
        return { success: false, error: 'Insufficient data for forecasting' };
      }

      const recentWeeks = weeklyData.data.slice(-4); // Last 4 weeks
      const avgVolume = recentWeeks.reduce((sum, week) => sum + week.volume, 0) / recentWeeks.length;
      const growthRate = recentWeeks.length > 1 ? 
        (recentWeeks[recentWeeks.length - 1].volume - recentWeeks[0].volume) / recentWeeks.length : 0;

      const forecast: ForecastData[] = [];
      
      for (let i = 1; i <= 4; i++) {
        const predictedVolume = avgVolume + (growthRate * i);
        const confidence = Math.max(0.3, Math.min(0.9, 1 - (i * 0.1))); // Decreasing confidence over time
        
        forecast.push({
          week: i,
          predictedVolume: Math.round(predictedVolume),
          confidence: Math.round(confidence * 100)
        });
      }

      return { success: true, data: forecast };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get milestone predictions
   */
  static async getMilestonePredictions(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: MilestonePrediction[];
    error?: string;
  }> {
    try {
      const topExercises = await this.getTopPerformingExercises(userProfileId);
      if (!topExercises.success || !topExercises.data) {
        return { success: false, error: topExercises.error };
      }

      const predictions: MilestonePrediction[] = [];

      for (const exercise of topExercises.data) {
        const insights = exercise.insights;
        const current1RM = insights.strengthProgression.current1RM;
        const improvementRate = insights.strengthProgression.improvementRate;
        
        if (improvementRate > 0) {
          // Calculate next milestone (round up to nearest 25 lbs)
          const nextMilestone = Math.ceil(current1RM / 25) * 25;
          const weeksToGoal = Math.ceil((nextMilestone - current1RM) / (current1RM * improvementRate / 100));
          
          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + (weeksToGoal * 7));
          
          predictions.push({
            exercise: { id: exercise.id, name: exercise.name },
            current1RM,
            nextMilestone,
            predictedDate: predictedDate.toISOString().split('T')[0],
            confidence: Math.round(insights.predictions.growthPotential),
            weeksToGoal
          });
        }
      }

      return { success: true, data: predictions.slice(0, 3) }; // Top 3 predictions

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get training frequency data for heatmap
   */
  static async getTrainingFrequencyData(userProfileId: number): Promise<{
    success: boolean;
    data?: TrainingFrequencyData[];
    error?: string;
  }> {
    try {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const { data: strengthExercises, error } = await supabase
        .from('strength_exercise')
        .select(`
          *,
          daily_training!inner(
            *,
            weekly_schedules!inner(
              training_plans!inner(
                user_profile_id
              )
            )
          )
        `)
        .eq('completed', true)
        .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
        .gte('updated_at', twelveWeeksAgo.toISOString());

      if (error) {
        return { success: false, error: error.message };
      }

      // Group by date
      const dailyData: { [key: string]: { volume: number; trainings: number } } = {};
      
      strengthExercises?.forEach(training => {
        const date = new Date(training.updated_at).toISOString().split('T')[0];
        
        if (!dailyData[date]) {
          dailyData[date] = { volume: 0, trainings: 0 };
        }
        
        const weights = Array.isArray(training.weight) ? training.weight : [];
        const reps = Array.isArray(training.reps) ? training.reps : [];
        let volume = 0;
        for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
          volume += (weights[i] || 0) * (reps[i] || 0);
        }
        
        dailyData[date].volume += volume;
        dailyData[date].trainings += 1;
      });

      // Convert to array
      const result = Object.entries(dailyData).map(([date, data]) => ({
        date,
        hasTraining: true,
        intensity: Math.min(1, data.volume / 5000) // Normalize intensity (0-1)
      }));

      return { success: true, data: result };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get recovery trend based on RPE data
   */
  static async getRecoveryTrend(
    userProfileId: number,
    localPlan?: TrainingPlan | null
  ): Promise<{
    success: boolean;
    data?: Array<{
      week: string;
      avgRPE: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
    error?: string;
  }> {
    try {
      let strengthExercises: ExtractedExercise[] = [];

      if (localPlan) {
        strengthExercises = extractCompletedExercisesFromLocalPlan(localPlan);
      } else {
        // Get from database
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data, error } = await supabase
          .from('strength_exercise')
          .select(`
            *,
            daily_training!inner(
              session_rpe,
              updated_at,
              weekly_schedules!inner(
                week_number,
                training_plans!inner(user_profile_id)
              )
            )
          `)
          .eq('completed', true)
          .eq('daily_training.completed', true)
          .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
          .gte('updated_at', oneYearAgo.toISOString())
          .order('updated_at', { ascending: false });

        if (error) {
          return { success: false, error: error.message };
        }

        strengthExercises = (data || []).map((se: any) => ({
          exercise_id: se.exercise_id,
          weight: se.weight || [],
          reps: se.reps || [],
          updated_at: se.updated_at,
          completed: se.completed,
          exercises: {
            name: 'Unknown',
            primary_muscle: 'Unknown'
          },
          daily_training: {
            completedAt: se.daily_training?.updated_at ? new Date(se.daily_training.updated_at) : undefined,
            sessionRPE: se.daily_training?.session_rpe || undefined
          },
          weekNumber: se.daily_training?.weekly_schedules?.week_number || undefined
        }));
      }

      if (strengthExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Group by week and calculate average RPE
      const weeklyRPE: { [key: string]: number[] } = {};

      strengthExercises.forEach(ex => {
        if (!ex.daily_training.sessionRPE) return;
        
        const date = ex.daily_training.completedAt || new Date(ex.updated_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyRPE[weekKey]) {
          weeklyRPE[weekKey] = [];
        }
        weeklyRPE[weekKey].push(ex.daily_training.sessionRPE);
      });

      // Calculate average RPE per week and determine trend
      const result = Object.entries(weeklyRPE)
        .map(([week, rpes]) => {
          const avgRPE = rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length;
          return { week, avgRPE };
        })
        .sort((a, b) => a.week.localeCompare(b.week))
        .map((item, index, array) => {
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          if (index > 0) {
            const prevRPE = array[index - 1].avgRPE;
            if (item.avgRPE < prevRPE - 0.3) {
              trend = 'improving';
            } else if (item.avgRPE > prevRPE + 0.3) {
              trend = 'declining';
            }
          }
          return {
            week: item.week,
            avgRPE: item.avgRPE,
            trend
          };
        });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Helper method to get exercise training history
   */
  private static async getExerciseTrainingHistory(exerciseId: number, userProfileId: number): Promise<any[]> {
    // This would be similar to the existing fetchTrainingHistory method
    // Simplified for now - in practice, you'd want to reuse the existing logic
    return [];
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached insights summary directly from database (no API call, no LLM risk)
   * Simple read operation - returns null if cache doesn't exist
   */
  static async getCachedInsightsSummaryDirect(
    userProfileId: number
  ): Promise<{
    success: boolean;
    data?: InsightsSummaryData;
    error?: string;
  } | null> {
    try {
      const { supabase } = await import('../config/supabase');
      const { logger } = await import('../utils/logger');
      
      logger.info('Reading insights from database', { userProfileId });
      
      // Read directly from insights_summaries table
      // Note: The table only has a 'summary' column (JSONB) that contains both summary and metrics
      const { data, error } = await supabase
        .from('insights_summaries')
        .select('summary')
        .eq('user_profile_id', userProfileId)
        .single();

      if (error) {
        logger.warn('Database query error', { 
          errorCode: error.code, 
          errorMessage: error.message,
          userProfileId 
        });
        
        // No cache found - this is OK, not an error
        if (error.code === 'PGRST116') {
          logger.info('No insights cache found in database');
          return null; // No cache exists
        }
        // Other database error
        return { success: false, error: error.message };
      }

      if (!data || !data.summary) {
        logger.info('No data returned from database');
        return null; // No cache
      }

      // The summary column contains the entire structure: { summary: {...}, metrics: {...} }
      const summaryColumn = data.summary;
      
      // Extract summary and metrics from the nested structure
      const summaryJson = summaryColumn.summary;
      const metricsJson = summaryColumn.metrics;

      logger.info('Raw data from database', {
        hasSummaryColumn: !!summaryColumn,
        hasSummary: !!summaryJson,
        hasMetrics: !!metricsJson,
        summaryType: typeof summaryJson,
        metricsType: typeof metricsJson,
        summaryKeys: summaryJson ? Object.keys(summaryJson) : null,
        metricsKeys: metricsJson ? Object.keys(metricsJson) : null,
        summaryValue: summaryJson ? JSON.stringify(summaryJson).substring(0, 200) : null,
        metricsValue: metricsJson ? JSON.stringify(metricsJson).substring(0, 200) : null
      });

      // Validate both summary and metrics exist
      if (!summaryJson || !metricsJson) {
        logger.warn('Invalid insights cache - missing required fields', {
          hasSummary: !!summaryJson,
          hasMetrics: !!metricsJson,
          summaryColumnKeys: summaryColumn ? Object.keys(summaryColumn) : null,
          userProfileId
        });
        return null; // Invalid cache - missing required fields
      }

      // Additional validation: ensure summary has required fields
      if (!summaryJson.summary || !Array.isArray(summaryJson.findings) || !Array.isArray(summaryJson.recommendations)) {
        logger.warn('Invalid insights summary structure', {
          hasSummaryText: !!summaryJson.summary,
          hasFindings: Array.isArray(summaryJson.findings),
          hasRecommendations: Array.isArray(summaryJson.recommendations),
          summaryStructure: summaryJson
        });
        return null;
      }

      logger.info('Successfully parsed insights from database');
      
      return {
        success: true,
        data: {
          summary: summaryJson as InsightsSummary,
          metrics: metricsJson as InsightsMetrics,
        }
      };
    } catch (error) {
      // Use logger for consistency
      const { logger } = await import('../utils/logger');
      logger.warn('Error reading cached insights from database', error);
      return null;
    }
  }

  /**
   * Get insights summary from backend API
   * Backend handles caching - only calls LLM if data changed
   */
  static async getInsightsSummary(
    userProfileId: number,
    trainingPlan: TrainingPlan | null,
    weakPoints?: WeakPointAnalysis[],
    topExercises?: TopPerformingExercise[]
  ): Promise<{
    success: boolean;
    data?: InsightsSummaryData;
    error?: string;
  }> {
    try {
      const { apiClient } = await import('./apiClient');
      const { supabase } = await import('../config/supabase');
      
      // Get JWT token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No authentication token' };
      }

      // Transform training plan to backend format if provided
      let backendPlan: any = null;
      if (trainingPlan) {
        // Convert camelCase to snake_case for backend
        backendPlan = {
          weekly_schedules: trainingPlan.weeklySchedules.map(week => ({
            week_number: week.weekNumber,
            completed: week.completed,
            daily_trainings: week.dailyTrainings.map(daily => ({
              id: daily.id,
              day_of_week: daily.dayOfWeek,
              is_rest_day: daily.isRestDay,
              completed: daily.completed,
              completed_at: daily.completedAt?.toISOString(),
              session_rpe: daily.sessionRPE,
              strength_exercise: daily.exercises
                .filter(ex => ex.exercise && !ex.enduranceSession)
                .map(ex => ({
                  exercise_id: ex.exerciseId ? Number(ex.exerciseId) : null,
                  exercise_name: ex.exercise?.name,
                  weights: ex.sets?.map(s => s.weight).filter(w => w != null) || [],
                  reps: ex.sets?.map(s => s.reps).filter(r => r != null) || [],
                  sets: ex.sets?.length || 0,
                  completed: ex.completed
                }))
            }))
          }))
        };
      }

      // Transform weak points and top exercises to backend format
      const weakPointsBackend = weakPoints?.map(wp => ({
        muscle_group: wp.muscleGroup,
        issue: wp.issue || 'plateau',
        severity: wp.severity || 'medium'
      })) || [];

      const topExercisesBackend = topExercises?.map(ex => ({
        name: ex.name,
        trend: ex.trend === 'increasing' ? 'improving' : ex.trend === 'decreasing' ? 'declining' : 'stable',
        change: ex.improvementRate ? `+${ex.improvementRate.toFixed(1)}%` : undefined
      })) || [];

      const { logger } = await import('../utils/logger');

      const response = await apiClient.post<InsightsSummaryResponse>('/api/training/insights-summary', {
        user_profile_id: userProfileId,
        jwt_token: session.access_token,
        training_plan: backendPlan,
        weak_points: weakPointsBackend,
        top_exercises: topExercisesBackend
      });

      // Backend returns summary and metrics at top level, not nested under data
      // apiClient.post returns ApiResponse<T> but the actual response structure matches the backend directly
      const responseData = response as unknown as InsightsSummaryResponse;

      if (responseData.success && responseData.summary && responseData.metrics) {
        logger.info('Successfully parsed insights from backend API');
        return {
          success: true,
          data: {
            summary: responseData.summary,
            metrics: responseData.metrics
          }
        };
      } else {
        logger.warn('Backend API response missing required fields', {
          success: responseData.success,
          hasSummary: !!responseData.summary,
          hasMetrics: !!responseData.metrics,
          error: responseData.error
        });
        return {
          success: false,
          error: responseData.error || 'Failed to get insights summary'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
