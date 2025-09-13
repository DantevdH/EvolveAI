// Exercise Insights Service - Bridge between analytics engine and UI
// Handles data fetching, processing, and caching for exercise insights

import { supabase } from '../config/supabase';
import { 
  ExerciseAnalyticsEngine, 
  ExerciseInsights, 
  WorkoutHistory 
} from './exerciseAnalyticsEngine';

export { ExerciseInsights } from './exerciseAnalyticsEngine';

export interface ExerciseInsightsResponse {
  success: boolean;
  data?: ExerciseInsights;
  error?: string;
}

export interface RawWorkoutData {
  date: string;
  volume: number;
  maxWeight: number;
  sets: number;
  reps: number[];
  weights: number[];
}

export class ExerciseInsightsService {
  private static cache = new Map<string, { data: ExerciseInsights; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive exercise insights for a specific exercise and user
   */
  static async getExerciseInsights(
    exerciseId: number, 
    userProfileId: number
  ): Promise<ExerciseInsightsResponse> {
    try {
      // Check cache first
      const cacheKey = `${exerciseId}-${userProfileId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, data: cached.data };
      }

      // Fetch raw workout data
      const rawData = await this.fetchWorkoutHistory(exerciseId, userProfileId);
      if (!rawData.success || !rawData.data) {
        return { success: false, error: rawData.error || 'Failed to fetch workout data' };
      }

      // Process data into structured format
      const processedHistory = ExerciseAnalyticsEngine.processWorkoutHistory(rawData.data);

      // Generate comprehensive insights
      const insights = ExerciseAnalyticsEngine.generateInsights(processedHistory);

      // Cache the results
      this.cache.set(cacheKey, { data: insights, timestamp: Date.now() });

      return { success: true, data: insights };

    } catch (error) {
      console.error('Error generating exercise insights:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Fetch workout history from Supabase
   */
  private static async fetchWorkoutHistory(
    exerciseId: number, 
    userProfileId: number
  ): Promise<{ success: boolean; data?: RawWorkoutData[]; error?: string }> {
    try {
      // Get all COMPLETED workout exercises for this specific exercise and user
      // First, get the workout exercises
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('completed', true)
        .order('updated_at', { ascending: false });

      if (exercisesError) {
        console.error('Error fetching workout exercises:', exercisesError);
        return { success: false, error: exercisesError.message };
      }

      if (!workoutExercises || workoutExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Get the daily workout IDs
      const dailyWorkoutIds = [...new Set(workoutExercises.map(we => we.daily_workout_id))];
      
      // Get daily workouts with their related data
      const { data: dailyWorkouts, error: dailyError } = await supabase
        .from('daily_workouts')
        .select(`
          *,
          weekly_schedules!inner(
            workout_plans!inner(
              user_profile_id
            )
          )
        `)
        .in('id', dailyWorkoutIds)
        .eq('weekly_schedules.workout_plans.user_profile_id', userProfileId);

      if (dailyError) {
        console.error('Error fetching daily workouts:', dailyError);
        return { success: false, error: dailyError.message };
      }

      // Filter workout exercises to only include those from valid daily workouts
      const validDailyWorkoutIds = new Set(dailyWorkouts?.map(dw => dw.id) || []);
      const data = workoutExercises.filter(we => validDailyWorkoutIds.has(we.daily_workout_id));

      if (!data || data.length === 0) {
        return { 
          success: true, 
          data: [] 
        };
      }

      // Process the raw data
      const processedData: RawWorkoutData[] = data.map((workoutExercise) => {
        const date = new Date(workoutExercise.updated_at).toISOString().split('T')[0];
        const weights = Array.isArray(workoutExercise.weight) ? workoutExercise.weight : [];
        const reps = Array.isArray(workoutExercise.reps) ? workoutExercise.reps : [];
        
        // Calculate volume (total reps × total weight)
        let volume = 0;
        let maxWeight = 0;
        
        for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
          const weight = weights[i] || 0;
          const rep = reps[i] || 0;
          volume += weight * rep;
          maxWeight = Math.max(maxWeight, weight);
        }
        
        return {
          date,
          sets: workoutExercise.sets || 0,
          reps,
          weights,
          volume,
          maxWeight
        };
      });

      return { success: true, data: processedData };

    } catch (error) {
      console.error('Error processing workout history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get quick insights summary (lighter version for performance)
   */
  static async getQuickInsights(
    exerciseId: number, 
    userProfileId: number
  ): Promise<{
    success: boolean;
    data?: {
      overallScore: number;
      keyInsight: string;
      trend: string;
      nextRecommendation: string;
    };
    error?: string;
  }> {
    try {
      const insights = await this.getExerciseInsights(exerciseId, userProfileId);
      
      if (!insights.success || !insights.data) {
        return { success: false, error: insights.error };
      }

      const data = insights.data;
      
      // Generate quick summary
      const keyInsight = data.keyInsights[0] || 'Start tracking your workouts for insights';
      const trend = data.volumeTrend.trend;
      const nextRecommendation = data.recommendations.nextWorkout.reasoning || 'Continue current approach';

      return {
        success: true,
        data: {
          overallScore: data.overallScore,
          keyInsight,
          trend,
          nextRecommendation
        }
      };

    } catch (error) {
      console.error('Error generating quick insights:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get comparative analytics (exercise vs. similar exercises)
   */
  static async getComparativeInsights(
    exerciseId: number,
    userProfileId: number
  ): Promise<{
    success: boolean;
    data?: {
      vsSimilarExercises: {
        exercise: string;
        performance: number;
        recommendation: string;
      }[];
      equipmentEffectiveness: {
        equipment: string;
        averageVolume: number;
        recommendation: string;
      }[];
    };
    error?: string;
  }> {
    try {
      // Get exercise details
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (exerciseError || !exercise) {
        return { success: false, error: 'Exercise not found' };
      }

      // Get similar exercises (same target area)
      const { data: similarExercises, error: similarError } = await supabase
        .from('exercises')
        .select('*')
        .eq('target_area', exercise.target_area)
        .neq('id', exerciseId)
        .limit(3);

      if (similarError) {
        return { success: false, error: 'Failed to fetch similar exercises' };
      }

      // Get current exercise performance
      const currentInsights = await this.getExerciseInsights(exerciseId, userProfileId);
      if (!currentInsights.success || !currentInsights.data) {
        return { success: false, error: 'Failed to get current exercise insights' };
      }

      const currentPerformance = currentInsights.data.overallScore;

      // Compare with similar exercises
      const vsSimilarExercises = await Promise.all(
        similarExercises.map(async (similarExercise) => {
          const similarInsights = await this.getExerciseInsights(similarExercise.id, userProfileId);
          const performance = similarInsights.success && similarInsights.data ? 
            similarInsights.data.overallScore : 0;
          
          let recommendation = '';
          if (performance > currentPerformance * 1.2) {
            recommendation = 'Consider switching to this exercise for better results';
          } else if (performance < currentPerformance * 0.8) {
            recommendation = 'Current exercise is performing better';
          } else {
            recommendation = 'Both exercises perform similarly';
          }

          return {
            exercise: similarExercise.name,
            performance,
            recommendation
          };
        })
      );

      // Equipment effectiveness analysis
      const equipmentEffectiveness = await this.analyzeEquipmentEffectiveness(exercise, userProfileId);

      return {
        success: true,
        data: {
          vsSimilarExercises,
          equipmentEffectiveness
        }
      };

    } catch (error) {
      console.error('Error generating comparative insights:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Analyze equipment effectiveness for an exercise
   */
  private static async analyzeEquipmentEffectiveness(
    exercise: any,
    userProfileId: number
  ): Promise<Array<{ equipment: string; averageVolume: number; recommendation: string }>> {
    try {
      // Get all exercises with same name but different equipment
      const { data: variations, error } = await supabase
        .from('exercises')
        .select('*')
        .ilike('name', `%${exercise.name.split('(')[0].trim()}%`)
        .neq('id', exercise.id);

      if (error || !variations) {
        return [];
      }

      const equipmentAnalysis = await Promise.all(
        variations.map(async (variation) => {
          const insights = await this.getExerciseInsights(variation.id, userProfileId);
          const averageVolume = insights.success && insights.data ? 
            insights.data.volumeTrend.volatility : 0; // Using volatility as proxy for average volume
          
          let recommendation = '';
          if (averageVolume > 100) {
            recommendation = 'High performance with this equipment';
          } else if (averageVolume > 50) {
            recommendation = 'Moderate performance';
          } else {
            recommendation = 'Consider trying different equipment';
          }

          return {
            equipment: variation.equipment || 'Unknown',
            averageVolume,
            recommendation
          };
        })
      );

      return equipmentAnalysis;

    } catch (error) {
      console.error('Error analyzing equipment effectiveness:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific exercise/user combination
   */
  static clearCache(exerciseId?: number, userProfileId?: number): void {
    if (exerciseId && userProfileId) {
      const cacheKey = `${exerciseId}-${userProfileId}`;
      this.cache.delete(cacheKey);
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
