// Enhanced Insights Analytics Service
// Provides comprehensive analytics for the insights dashboard

import { supabase } from '@/src/config/supabase';
import { ExerciseAnalyticsEngine } from '@/src/services/exerciseAnalyticsEngine';

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
   */
  static async getWeeklyVolumeTrend(userProfileId: number): Promise<{
    success: boolean;
    data?: WeeklyVolumeData[];
    error?: string;
  }> {
    const cacheKey = `weekly-volume-${userProfileId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { success: true, data: cached.data };
    }

    try {
      // Get strength exercises for the last 52 weeks (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365); // 1 year

      const { data: strengthExercises, error: exercisesError } = await supabase
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
        .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
        .gte('updated_at', oneYearAgo.toISOString())
        .order('updated_at', { ascending: false });

      if (exercisesError) {
        return { success: false, error: exercisesError.message };
      }

      if (!strengthExercises || strengthExercises.length === 0) {
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

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return { success: true, data: result };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get performance score trend over time
   */
  static async getPerformanceScoreTrend(userProfileId: number): Promise<{
    success: boolean;
    data?: PerformanceScoreData[];
    error?: string;
  }> {
    const cacheKey = `performance-score-${userProfileId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { success: true, data: cached.data };
    }

    try {
      // Get weekly data first
      const weeklyData = await this.getWeeklyVolumeTrend(userProfileId);
      if (!weeklyData.success || !weeklyData.data) {
        return { success: false, error: weeklyData.error };
      }

      // Calculate performance scores
      const performanceData: PerformanceScoreData[] = [];
      
      for (let i = 0; i < weeklyData.data.length; i++) {
        const week = weeklyData.data[i];
        const previousWeek = i > 0 ? weeklyData.data[i - 1] : null;
        
        // Calculate consistency score (based on training frequency)
        const consistency = Math.min(100, (week.trainings / 7) * 100);
        
        // Calculate improvement rate
        const improvement = previousWeek ? 
          ((week.volume - previousWeek.volume) / previousWeek.volume) * 100 : 0;
        
        // Calculate overall performance score
        const score = Math.max(0, Math.min(100,
          (week.volume / 1000) * 20 + // Volume component (0-20 points)
          consistency * 0.3 + // Consistency component (0-30 points)
          Math.max(0, improvement) * 2 + // Improvement component (0-20 points)
          30 // Base score
        ));
        
        performanceData.push({
          date: week.week,
          score: Math.round(score),
          volume: week.volume,
          consistency: Math.round(consistency),
          improvement: Math.round(improvement)
        });
      }

      this.cache.set(cacheKey, { data: performanceData, timestamp: Date.now() });
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
   */
  static async getTopPerformingExercises(userProfileId: number): Promise<{
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
        new Map(exercises?.map(e => [e.exercise_id, e.exercises])).entries()
      ).map(([id, exercise]) => ({ id: Number(id), name: exercise?.name || 'Unknown' }));

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
   * Get weak points analysis grouped by primary muscle
   */
  static async getWeakPointsAnalysis(userProfileId: number): Promise<{
    success: boolean;
    data?: WeakPointAnalysis[];
    error?: string;
  }> {
    try {
      // Get exercises with their primary muscles
      const { data: exercises, error } = await supabase
        .from('strength_exercise')
        .select(`
          exercise_id,
          exercises!inner(name, primary_muscle)
        `)
        .eq('completed', true)
        .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Group exercises by primary muscle
      const muscleGroups = new Map<string, Array<{ id: number; name: string; primary_muscle: string }>>();
      
      exercises?.forEach(exercise => {
        const primaryMuscle = exercise.exercises?.primary_muscle || 'Unknown';
        if (!muscleGroups.has(primaryMuscle)) {
          muscleGroups.set(primaryMuscle, []);
        }
        muscleGroups.get(primaryMuscle)!.push({
          id: exercise.exercise_id,
          name: exercise.exercises?.name || 'Unknown',
          primary_muscle: primaryMuscle
        });
      });

      const weakPoints: WeakPointAnalysis[] = [];

      // Analyze each muscle group
      for (const [muscleGroup, exercises] of muscleGroups) {
        let totalVolume = 0;
        let totalTrainings = 0;
        let plateauCount = 0;
        let decliningCount = 0;
        let lowConsistencyCount = 0;
        const affectedExercises: Array<{ id: number; name: string }> = [];

        // Analyze each exercise in the muscle group
        for (const exercise of exercises) {
          try {
            const insights = await ExerciseAnalyticsEngine.generateInsights(
              await this.getExerciseTrainingHistory(exercise.id, userProfileId)
            );

            totalVolume += insights.volumeTrend.volatility;
            totalTrainings += insights.strengthProgression.strengthGains.length;

            // Check for issues
            if (insights.plateauDetection.isPlateaued) {
              plateauCount++;
              affectedExercises.push({ id: exercise.id, name: exercise.name });
            }
            
            if (insights.volumeTrend.trend === 'decreasing') {
              decliningCount++;
              if (!affectedExercises.find(e => e.id === exercise.id)) {
                affectedExercises.push({ id: exercise.id, name: exercise.name });
              }
            }
            
            if (insights.consistency.consistencyScore < 70) {
              lowConsistencyCount++;
              if (!affectedExercises.find(e => e.id === exercise.id)) {
                affectedExercises.push({ id: exercise.id, name: exercise.name });
              }
            }
          } catch (error) {
            console.warn(`Failed to analyze exercise ${exercise.id}:`, error);
          }
        }

        // Determine if muscle group has issues
        const totalExercises = exercises.length;
        const plateauPercentage = (plateauCount / totalExercises) * 100;
        const decliningPercentage = (decliningCount / totalExercises) * 100;
        const consistencyPercentage = (lowConsistencyCount / totalExercises) * 100;

        // Add weak points based on muscle group analysis
        if (plateauPercentage >= 50) {
          weakPoints.push({
            muscleGroup,
            affectedExercises,
            issue: 'plateau',
            severity: plateauPercentage >= 75 ? 'high' : plateauPercentage >= 60 ? 'medium' : 'low',
            recommendation: 'Consider exercise variation and deload weeks for this muscle group',
            metrics: {
              current: plateauPercentage,
              previous: 0,
              change: plateauPercentage
            }
          });
        }

        if (decliningPercentage >= 50) {
          weakPoints.push({
            muscleGroup,
            affectedExercises,
            issue: 'declining',
            severity: decliningPercentage >= 75 ? 'high' : decliningPercentage >= 60 ? 'medium' : 'low',
            recommendation: 'Focus on progressive overload and recovery for this muscle group',
            metrics: {
              current: decliningPercentage,
              previous: 0,
              change: decliningPercentage
            }
          });
        }

        if (consistencyPercentage >= 50) {
          weakPoints.push({
            muscleGroup,
            affectedExercises,
            issue: 'inconsistent',
            severity: consistencyPercentage >= 75 ? 'high' : consistencyPercentage >= 60 ? 'medium' : 'low',
            recommendation: 'Improve training frequency and consistency for this muscle group',
            metrics: {
              current: consistencyPercentage,
              previous: 0,
              change: consistencyPercentage
            }
          });
        }

        // Check for low frequency (less than once per week average)
        const weeksWithTrainings = Math.max(1, Math.ceil(totalTrainings / 4)); // Rough estimate
        if (weeksWithTrainings < 2) {
          weakPoints.push({
            muscleGroup,
            affectedExercises: exercises.map(e => ({ id: e.id, name: e.name })),
            issue: 'low_frequency',
            severity: weeksWithTrainings < 1 ? 'high' : 'medium',
            recommendation: 'Increase training frequency for this muscle group',
            metrics: {
              current: weeksWithTrainings,
              previous: 0,
              change: 0
            }
          });
        }
      }

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
  static async getFourWeekForecast(userProfileId: number): Promise<{
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
  static async getMilestonePredictions(userProfileId: number): Promise<{
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
}
