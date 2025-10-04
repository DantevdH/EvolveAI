// Exercise Insights Service - Bridge between analytics engine and UI
// Handles data fetching, processing, and caching for exercise insights

import { supabase } from '../config/supabase';
import { 
  ExerciseAnalyticsEngine, 
  ExerciseInsights, 
  TrainingHistory 
} from './exerciseAnalyticsEngine';

export { ExerciseInsights } from './exerciseAnalyticsEngine';

export interface ExerciseInsightsResponse {
  success: boolean;
  data?: ExerciseInsights;
  error?: string;
}

export interface RawTrainingData {
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

      // Fetch raw training data
      const rawData = await this.fetchTrainingHistory(exerciseId, userProfileId);
      if (!rawData.success || !rawData.data) {
        return { success: false, error: rawData.error || 'Failed to fetch training data' };
      }

      // Process data into structured format
      const processedHistory = ExerciseAnalyticsEngine.processTrainingHistory(rawData.data);

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
   * Fetch training history from Supabase
   */
  private static async fetchTrainingHistory(
    exerciseId: number, 
    userProfileId: number
  ): Promise<{ success: boolean; data?: RawTrainingData[]; error?: string }> {
    try {
      // Get all COMPLETED strength exercises for this specific exercise and user
      // First, get the strength exercises
      const { data: strengthExercises, error: exercisesError } = await supabase
        .from('strength_exercise')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('completed', true)
        .order('updated_at', { ascending: false });

      if (exercisesError) {
        console.error('Error fetching strength exercises:', exercisesError);
        return { success: false, error: exercisesError.message };
      }

      if (!strengthExercises || strengthExercises.length === 0) {
        return { success: true, data: [] };
      }

      // Get the daily training IDs
      const dailyTrainingIds = [...new Set(strengthExercises.map(we => we.daily_training_id))];
      
      // Get daily trainings with their related data
      const { data: dailyTrainings, error: dailyError } = await supabase
        .from('daily_training')
        .select(`
          *,
          weekly_schedules!inner(
            training_plans!inner(
              user_profile_id
            )
          )
        `)
        .in('id', dailyTrainingIds)
        .eq('weekly_schedules.training_plans.user_profile_id', userProfileId);

      if (dailyError) {
        console.error('Error fetching daily trainings:', dailyError);
        return { success: false, error: dailyError.message };
      }

      // Filter strength exercises to only include those from valid daily trainings
      const validDailyTrainingIds = new Set(dailyTrainings?.map(dw => dw.id) || []);
      const data = strengthExercises.filter(we => validDailyTrainingIds.has(we.daily_training_id));

      if (!data || data.length === 0) {
        return { 
          success: true, 
          data: [] 
        };
      }

      // Process the raw data
      const processedData: RawTrainingData[] = data.map((trainingExercise) => {
        const date = new Date(trainingExercise.updated_at).toISOString().split('T')[0];
        const weights = Array.isArray(trainingExercise.weight) ? trainingExercise.weight : [];
        const reps = Array.isArray(trainingExercise.reps) ? trainingExercise.reps : [];
        
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
          sets: trainingExercise.sets || 0,
          reps,
          weights,
          volume,
          maxWeight
        };
      });

      return { success: true, data: processedData };

    } catch (error) {
      console.error('Error processing training history:', error);
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
      const keyInsight = data.keyInsights[0] || 'Start tracking your trainings for insights';
      const trend = data.volumeTrend.trend;
      const nextRecommendation = data.recommendations.nextTraining.reasoning || 'Continue current approach';

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
