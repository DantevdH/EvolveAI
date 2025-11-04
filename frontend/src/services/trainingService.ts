// Training Service - Comprehensive service for all training and training operations
import { supabase } from '../config/supabase';
import { UserProfile, TrainingPlan } from '../types';
import { API_CONFIG } from '../constants/api';
import { mapProfileToBackendRequest } from '../utils/profileDataMapping';
import { ENV } from '../config/env';
import { 
  GenerateTrainingPlanRequest, 
  GenerateTrainingPlanResponse,
  ApiResponse 
} from '../types/api';
import { 
  TrainingPlan as TrainingTrainingPlan, 
  DailyTraining, 
  Exercise, 
  TrainingExercise, 
  TrainingSet,
  TrainingPlanResponse,
  ExerciseResponse,
  UpdateSetResponse,
  CompleteTrainingResponse
} from '../types/training';

export interface TrainingServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TrainingService {
  // ============================================================================
  // WORKOUT PLAN MANAGEMENT
  // ============================================================================

  /**
   * Generate a training plan using the backend API
   * 
   * DEPRECATED: Use onboardingService.generateTrainingPlan() instead.
   * This method is kept for backward compatibility but redirects to the onboarding service.
   */
  static async generateTrainingPlan(
    profileData: any,
    userProfileId: number,
    userId: string
  ): Promise<TrainingServiceResponse<TrainingTrainingPlan>> {
    console.warn('⚠️ TrainingService.generateTrainingPlan() is deprecated. Use onboardingService.generateTrainingPlan() instead.');
    
    // This method should not be used - redirect to onboarding service if needed
    // For now, return an error to force migration
        return {
          success: false,
      error: 'TrainingService.generateTrainingPlan() is deprecated. Please use onboardingService.generateTrainingPlan() instead.',
      };
  }

  /**
   * Get training plan for a user (with proper exercise data mapping)
   */
  static async getTrainingPlan(userProfileId: number): Promise<TrainingServiceResponse<TrainingTrainingPlan>> {
    console.log('🔍 TrainingService: Starting training plan fetch...', {
      userProfileId,
      timestamp: new Date().toISOString()
    });

    try {
      // Use relational query to get training plan with all exercise details
      console.log('📊 TrainingService: Fetching training plan with relational query...');
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();


      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ TrainingService: No training plan found (PGRST116) - this is expected for new users');
          return {
            success: false,
            error: 'No training plan found',
          };
        }
        
        // Only log errors for actual network/database issues, not for "no data found"
        console.error('❌ TrainingService: Relational query failed:', error);
        console.error('❌ TrainingService: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: `Database error: ${error.message}`,
        };
      }

      if (!data) {
        console.log('❌ TrainingService: No data returned from query');
        return { success: false, error: 'No active training plan found' };
      }

      console.log('✅ TrainingService: Successfully fetched training plan data:', {
        id: data.id,
        title: data.title,
        user_profile_id: data.user_profile_id,
        has_weekly_schedules: !!data.weekly_schedules,
        weekly_schedules_count: data.weekly_schedules?.length || 0
      });

      // Debug: Check the nested data structure
      if (data.weekly_schedules && data.weekly_schedules.length > 0) {
        const firstWeek = data.weekly_schedules[0];
        console.log('📅 TrainingService: First week data:', {
          week_id: firstWeek.id,
          week_number: firstWeek.week_number,
          has_daily_trainings: !!firstWeek.daily_training,
          daily_trainings_count: firstWeek.daily_training?.length || 0
        });

        if (firstWeek.daily_training && firstWeek.daily_training.length > 0) {
          const firstDay = firstWeek.daily_training[0];
          console.log('🏃 TrainingService: First day data:', {
            day_id: firstDay.id,
            day_of_week: firstDay.day_of_week,
            is_rest_day: firstDay.is_rest_day,
            has_strength_exercises: !!firstDay.strength_exercise,
            strength_exercises_count: firstDay.strength_exercise?.length || 0,
            has_endurance_sessions: !!firstDay.endurance_session,
            endurance_sessions_count: firstDay.endurance_session?.length || 0
          });

          if (firstDay.strength_exercise && firstDay.strength_exercise.length > 0) {
            const firstExercise = firstDay.strength_exercise[0];
            console.log('💪 TrainingService: First exercise data:', {
              strength_exercise_id: firstExercise.id,
              exercise_id: firstExercise.exercise_id,
              has_exercises_data: !!firstExercise.exercises,
              exercise_name: firstExercise.exercises?.name || 'NO NAME',
              exercise_data: firstExercise.exercises
            });
          }

        }
      }

      // Transform the relational data to match our TrainingTrainingPlan interface
      let trainingPlan: TrainingTrainingPlan = {
        id: data.id.toString(),
        title: data.title,
        description: data.summary,
        totalWeeks: data.weekly_schedules?.length || 1,
        currentWeek: data.current_week || 1,
        aiMessage: data.ai_message,
        weeklySchedules: data.weekly_schedules?.map((schedule: any) => {
          // Sort daily trainings by day order (Monday = 0, Tuesday = 1, etc.) - Monday-first week
          const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const sortedDailyTrainings = schedule.daily_training?.sort((a: any, b: any) => {
            const aIndex = dayOrder.indexOf(a.day_of_week);
            const bIndex = dayOrder.indexOf(b.day_of_week);
            return aIndex - bIndex;
          }) || [];

          return {
            id: schedule.id.toString(),
            weekNumber: schedule.week_number,
            dailyTrainings: sortedDailyTrainings.map((daily: any) => {
                // Combine strength exercises and endurance sessions from relational data
                const strengthExercises = daily.strength_exercise?.map((se: any) => ({
                    id: se.id.toString(),
                    exerciseId: se.exercise_id.toString(),
                    completed: se.completed,
                    order: se.execution_order || se.order || 0, // Legacy field
                    executionOrder: se.execution_order || se.order || 0,
                    exercise: se.exercises ? {
                      id: se.exercises.id.toString(),
                      name: se.exercises.name,
                      force: se.exercises.force,
                      instructions: se.exercises.instructions,
                      equipment: se.exercises.equipment,
                      targetArea: se.exercises.target_area, // camelCase for consistency
                      secondary_muscles: se.exercises.secondary_muscles,
                      mainMuscles: se.exercises.main_muscles, // camelCase for consistency
                      difficulty: se.exercises.difficulty,
                      exercise_tier: se.exercises.exercise_tier,
                      preparation: se.exercises.preparation,
                      execution: se.exercises.execution,
                      tips: se.exercises.tips
                    } : null,
                    // Extract equipment and mainMuscle - prefer from strength_exercise table (AI-generated), fallback to exercises table
                    equipment: se.equipment || se.exercises?.equipment || 'Bodyweight',
                    mainMuscle: se.main_muscle || se.exercises?.main_muscles?.[0] || null,
                    exerciseName: se.exercise_name || se.exercises?.name || 'Unknown Exercise',
                    sets: this.parseSets(se.sets, se.reps, se.weight),
                    weight1RM: se.weight_1rm,
                    // Enriched fields at top-level (for round-trip preservation) - extract from exercises table
                    targetArea: se.exercises?.target_area || null,
                    mainMuscles: se.exercises?.main_muscles || null,
                    force: se.exercises?.force || null
                  })) || [];

                // Map endurance sessions to proper format
                const enduranceSessions = daily.endurance_session?.map((es: any) => {
                  const executionOrder = es.execution_order || (strengthExercises.length + 1); // Fallback if missing
                  return {
                    id: es.id.toString(),
                    exerciseId: `endurance_${es.id}`,
                    completed: es.completed || false,
                    order: executionOrder, // Legacy field
                    executionOrder: executionOrder,
                    enduranceSession: {
                      id: es.id.toString(),
                      name: es.name || `${es.sport_type} - ${es.training_volume} ${es.unit}`,
                      description: es.description || `${es.sport_type} session`,
                      sportType: es.sport_type,
                      trainingVolume: es.training_volume,
                      unit: es.unit,
                      heartRateZone: es.heart_rate_zone,
                      executionOrder: executionOrder,
                      completed: es.completed || false
                    }
                  };
                }) || [];

                // Sort by execution_order to ensure correct display order
                const allExercises = [...strengthExercises, ...enduranceSessions]
                  .sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));

                return {
                  id: daily.id.toString(),
                  dayOfWeek: daily.day_of_week,
                  isRestDay: daily.is_rest_day,
                  exercises: allExercises,
                  completed: allExercises.every((ex: any) => ex.completed) || daily.is_rest_day,
                  // Use updated_at as completedAt since daily_training table doesn't have completed_at column
                  // This represents when the training was last updated/completed
                  completedAt: daily.updated_at ? new Date(daily.updated_at) : undefined,
                  sessionRPE: daily.session_rpe || undefined
                };
            }) || [],
            completed: schedule.daily_training?.every((daily: any) => {
              if (daily.is_rest_day) return true;
              const strengthCompleted = daily.strength_exercise?.every((ex: any) => ex.completed) ?? true;
              const enduranceCompleted = daily.endurance_session?.every((ex: any) => ex.completed) ?? true;
              return strengthCompleted && enduranceCompleted;
            }) || false,
            completedAt: schedule.completed_at ? new Date(schedule.completed_at) : undefined
          };
        }) || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        completed: data.completed || false,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined
      };

      // DEBUG MODE: Auto-fill and duplicate plan for insights preview
      if (ENV.DEBUG?.toLowerCase() === 'true') {
        console.log('🐛 DEBUG MODE: Enriching training plan with sample data...');
        trainingPlan = this.enrichPlanForDebug(trainingPlan);
      }

      return {
        success: true,
        data: trainingPlan,
      };
    } catch (error) {
      console.error('💥 TrainingService: Unexpected error fetching training plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while fetching your training plan',
      };
    }
  }

  /**
   * Delete a training plan
   */
  static async deleteTrainingPlan(trainingPlanId: number): Promise<TrainingServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('training_plans')
        .delete()
        .eq('id', trainingPlanId);

      if (error) {
        console.error('❌ TrainingService: Error deleting training plan:', error);
        return {
          success: false,
          error: `Failed to delete training plan: ${error.message}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('💥 TrainingService: Unexpected error deleting training plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while deleting your training plan',
      };
    }
  }

  // ============================================================================
  // EXERCISE TRACKING & WORKOUT OPERATIONS
  // ============================================================================

  /**
   * Update set details (reps, weight) for a specific exercise
   * Handles adding sets (setIndex = -1) and removing sets (setIndex = -2)
   */
  static async updateSetDetails(
    exerciseId: string, 
    setIndex: number, 
    reps: number, 
    weight: number,
    updatedSets?: TrainingSet[] // Optional: if provided, use this to update arrays
  ): Promise<UpdateSetResponse> {
    try {
      // First, get the current strength exercise data
      const { data: strengthExercise, error: fetchError } = await supabase
        .from('strength_exercise')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (fetchError) {
        console.error('Error fetching strength exercise:', fetchError);
        return { success: false, error: fetchError.message };
      }

      let updatedReps: number[];
      let updatedWeight: number[];
      
      // If updatedSets is provided, use it to build arrays
      if (updatedSets) {
        updatedReps = updatedSets.map(set => set.reps);
        updatedWeight = updatedSets.map(set => set.weight);
      } else {
        // Otherwise, work with the existing arrays
        updatedReps = [...(strengthExercise.reps || [])];
        updatedWeight = [...(strengthExercise.weight || [])];
        
        // Handle special cases: -1 = add set, -2 = remove set
        if (setIndex === -1) {
          // Add a new set: append default values
          const lastReps = updatedReps.length > 0 ? updatedReps[updatedReps.length - 1] : 10;
          const lastWeight = updatedWeight.length > 0 ? updatedWeight[updatedWeight.length - 1] : 0;
          updatedReps.push(lastReps);
          updatedWeight.push(lastWeight);
        } else if (setIndex === -2) {
          // Remove the last set (if there's more than one)
          if (updatedReps.length <= 1) {
            return { success: false, error: 'Cannot remove the last set' };
          }
          updatedReps.pop();
          updatedWeight.pop();
        } else {
          // Normal update: update a specific set
          updatedReps[setIndex] = reps;
          updatedWeight[setIndex] = weight;
        }
      }

      // Update the database
      const { data, error } = await supabase
        .from('strength_exercise')
        .update({
          reps: updatedReps,
          weight: updatedWeight,
          sets: updatedReps.length, // Update sets count
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating set details:', error);
        return { success: false, error: error.message };
      }

      // Create the updated TrainingSet object for the last modified set
      const finalSetIndex = setIndex === -1 ? updatedReps.length - 1 : (setIndex === -2 ? updatedReps.length - 1 : setIndex);
      const updatedSet: TrainingSet = {
        id: `${exerciseId}-${finalSetIndex}`,
        reps: updatedReps[finalSetIndex] || reps,
        weight: updatedWeight[finalSetIndex] || weight,
        completed: true,
        restTime: 60 // Default rest time
      };

      return { success: true, data: updatedSet };
    } catch (error) {
      console.error('Error in updateSetDetails:', error);
      return { success: false, error: 'Failed to update set details' };
    }
  }


  /**
   * Update exercise completion status in database
   */
  static async updateExerciseCompletion(exerciseId: string, completed: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // Try strength_exercise first
      const { data: strengthData, error: strengthError } = await supabase
        .from('strength_exercise')
        .update({
          completed: completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (!strengthError && strengthData) {
        console.log(`✅ Strength exercise ${exerciseId} completion updated to: ${completed}`);
        return { success: true };
      }

      // If not found in strength_exercise, try endurance_session
      const { data: enduranceData, error: enduranceError } = await supabase
        .from('endurance_session')
        .update({
          completed: completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (enduranceError) {
        console.error('Error updating exercise completion:', enduranceError);
        return { success: false, error: enduranceError.message };
      }

      console.log(`✅ Endurance session ${exerciseId} completion updated to: ${completed}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateExerciseCompletion:', error);
      return { success: false, error: 'Failed to update exercise completion' };
    }
  }

  /**
   * Toggle exercise completion status (DEPRECATED - now handled in frontend)
   * This function is kept for backward compatibility but is no longer used
   */
  static async toggleExerciseCompletion(exerciseId: string): Promise<{ success: boolean; error?: string }> {
    console.warn('toggleExerciseCompletion is deprecated - exercise completion is now handled in frontend');
    return { success: true };
  }


  /**
   * Complete a daily training
   */
  static async completeDailyTraining(
    dailyTrainingId: string,
    sessionRPE?: number
  ): Promise<CompleteTrainingResponse> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Add session_rpe if provided
      if (sessionRPE !== undefined && sessionRPE !== null) {
        updateData.session_rpe = sessionRPE;
      }

      const { data, error } = await supabase
        .from('daily_training')
        .update(updateData)
        .eq('id', dailyTrainingId)
        .select()
        .single();

      if (error) {
        console.error('Error completing daily training:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          trainingId: dailyTrainingId
        }
      };
    } catch (error) {
      console.error('Error in completeDailyTraining:', error);
      return { success: false, error: 'Failed to complete daily training' };
    }
  }

  /**
   * Reopen a daily training (mark as incomplete)
   */
  static async reopenDailyTraining(
    dailyTrainingId: string
  ): Promise<CompleteTrainingResponse> {
    try {
      const { data, error } = await supabase
        .from('daily_training')
        .update({
          updated_at: new Date().toISOString(),
          session_rpe: null // Clear session RPE when reopening
        })
        .eq('id', dailyTrainingId)
        .select()
        .single();

      if (error) {
        console.error('Error reopening daily training:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          trainingId: dailyTrainingId
        }
      };
    } catch (error) {
      console.error('Error in reopenDailyTraining:', error);
      return { success: false, error: 'Failed to reopen daily training' };
    }
  }

  /**
   * Get exercise details by ID
   */
  static async getExerciseDetails(exerciseId: string): Promise<ExerciseResponse> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) {
        console.error('Error fetching exercise details:', error);
        return { success: false, error: error.message };
      }

      const exercise: Exercise = {
        id: data.id.toString(),
        name: data.name,
        force: data.force,
        instructions: data.instructions,
        equipment: data.equipment,
        target_area: data.target_area,
        secondary_muscles: data.secondary_muscles,
        main_muscles: data.main_muscles,
        difficulty: data.difficulty,
        exercise_tier: data.tier,
        preparation: data.preparation,
        execution: data.execution,
        tips: data.tips
      };

      return { success: true, data: [exercise] };
    } catch (error) {
      console.error('Error in getExerciseDetails:', error);
      return { success: false, error: 'Failed to fetch exercise details' };
    }
  }

  /**
   * Get training history for a user
   */
  static async getTrainingHistory(userId: string, limit: number = 10): Promise<{ success: boolean; data?: DailyTraining[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('daily_training')
        .select(`
          *,
          strength_exercise (
            *,
            exercises (*)
          ),
          endurance_session (*)
        `)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching training history:', error);
        return { success: false, error: error.message };
      }

      const history: DailyTraining[] = data.map((daily: any) => {
        const strengthExercises = daily.strength_exercise?.map((se: any) => ({
          id: se.id.toString(),
          exerciseId: se.exercise_id.toString(),
          exercise: {
            id: se.exercises.id.toString(),
            name: se.exercises.name,
            force: se.exercises.force,
            instructions: se.exercises.instructions,
            equipment: se.exercises.equipment,
            target_area: se.exercises.target_area,
            secondary_muscles: se.exercises.secondary_muscles,
            main_muscles: se.exercises.main_muscles,
            difficulty: se.exercises.difficulty,
            exercise_tier: se.exercises.exercise_tier,
            preparation: se.exercises.preparation,
            execution: se.exercises.execution,
            tips: se.exercises.tips
          },
          sets: this.parseSets(se.sets, se.reps, se.weight),
          completed: se.completed,
          order: se.order || 0
        })) || [];

        const enduranceSessions = daily.endurance_session?.map((es: any, index: number) => ({
          id: es.id.toString(),
          exerciseId: `endurance_${es.id}`,
          exercise: {
            id: `endurance_${es.id}`,
            name: es.name || `${es.sport_type} - ${es.training_volume} ${es.unit}`,
            force: null,
            instructions: es.description || `${es.sport_type} session`,
            equipment: null,
            target_area: 'Endurance',
            secondary_muscles: [],
            main_muscles: [],
            difficulty: null,
            imageUrl: null,
            videoUrl: null
          },
          sets: [],
          completed: es.completed || false,
          order: strengthExercises.length + index
        })) || [];

        return {
          id: daily.id.toString(),
          dayOfWeek: daily.day_of_week,
          isRestDay: daily.is_rest_day,
          exercises: [...strengthExercises, ...enduranceSessions],
        };
      });

      return { success: true, data: history };
    } catch (error) {
      console.error('Error in getTrainingHistory:', error);
      return { success: false, error: 'Failed to fetch training history' };
    }
  }

  // ============================================================================
  // HOME SCREEN DATA METHODS
  // ============================================================================

  /**
   * Get training streak (consecutive days with completed trainings)
   */
  static async getTrainingStreak(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get training plan with relational data
      const { data: trainingPlan, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !trainingPlan) {
        return { success: true, data: 0 };
      }

      // Calculate streak from relational data across all weeks
      let streak = 0;
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      if (!trainingPlan.weekly_schedules || trainingPlan.weekly_schedules.length === 0) {
        console.log('❌ getTrainingStreak - No weekly schedules found');
        return { success: true, data: 0 };
      }

      // Get all daily trainings from all weeks, sorted by week number and day order
      const allTrainings: any[] = [];
      
      trainingPlan.weekly_schedules
        .sort((a: any, b: any) => b.week_number - a.week_number) // Most recent week first
        .forEach((week: any) => {
          if (week.daily_training) {
            // Sort daily trainings by day order (most recent first within each week)
            const sortedDailyTrainings = week.daily_training.sort((a: any, b: any) => {
              const aIndex = dayOrder.indexOf(a.day_of_week);
              const bIndex = dayOrder.indexOf(b.day_of_week);
              return bIndex - aIndex;
            });
            
            allTrainings.push(...sortedDailyTrainings);
          }
        });

      // Calculate streak by going through all trainings chronologically
      for (const training of allTrainings) {
        if (training.is_rest_day) continue; // Skip rest days
        
        // Check if all exercises in this training are completed
        const strengthCompleted = training.strength_exercise?.every((ex: any) => ex.completed) ?? true;
        const enduranceCompleted = training.endurance_session?.every((ex: any) => ex.completed) ?? true;
        const allExercisesCompleted = strengthCompleted && enduranceCompleted;
        
        if (allExercisesCompleted) {
          streak++;
        } else {
          break; // Streak broken - stop counting
        }
      }

      return { success: true, data: streak };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating streak:', error);
      return { success: false, error: 'Failed to calculate training streak' };
    }
  }

  /**
   * Get weekly training count (total planned trainings in current week)
   */
  static async getWeeklyTrainingCount(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get training plan with relational data
      const { data: trainingPlan, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !trainingPlan) {
        return { success: true, data: 0 };
      }

      // Get current week's schedule
      const targetWeek = trainingPlan.current_week || 1;
      const currentWeek = trainingPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_training) {
        return { success: true, data: 0 };
      }

      // Count all planned trainings in current week (non-rest days)
      const totalTrainings = currentWeek.daily_training.filter((training: any) => !training.is_rest_day).length;
      return { success: true, data: totalTrainings };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating weekly trainings:', error);
      return { success: false, error: 'Failed to calculate weekly training count' };
    }
  }

  /**
   * Get goal progress (percentage of completed trainings)
   */
  static async getGoalProgress(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get training plan with relational data
      const { data: trainingPlan, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !trainingPlan) {
        return { success: true, data: 0 };
      }

      // Get current week's schedule
      const targetWeek = trainingPlan.current_week || 1;
      const currentWeek = trainingPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_training) {
        return { success: true, data: 0 };
      }

      const totalTrainingDays = currentWeek.daily_training.filter((training: any) => !training.is_rest_day).length;
      const completedTrainingDays = currentWeek.daily_training.filter((training: any) => {
        if (training.is_rest_day) return false;
        const strengthCompleted = training.strength_exercise?.every((ex: any) => ex.completed) ?? true;
        const enduranceCompleted = training.endurance_session?.every((ex: any) => ex.completed) ?? true;
        return strengthCompleted && enduranceCompleted;
      }).length;

      const progress = totalTrainingDays > 0 ? Math.round((completedTrainingDays / totalTrainingDays) * 100) : 0;
      return { success: true, data: progress };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating goal progress:', error);
      return { success: false, error: 'Failed to calculate goal progress' };
    }
  }

  /**
   * Get today's training with exercises
   */
  static async getTodaysTraining(userProfileId: number): Promise<TrainingServiceResponse<any>> {
    try {
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const todayName = dayNames[today.getDay()];

      // Get training plan with relational data
      const { data: trainingPlan, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !trainingPlan) {
        console.log('ℹ️ No training plan found');
        return { success: true, data: null };
      }

      // Get current week's schedule - fallback to first week if current_week is undefined
      const targetWeek = trainingPlan.current_week || 1;
      
      const currentWeek = trainingPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_training) {
        console.log('❌ getTodaysTraining - No current week or daily trainings found');
        return { success: true, data: null };
      }

      // Find today's training
      const todaysTraining = currentWeek.daily_training.find((training: any) => 
        training.day_of_week === todayName
      );

      if (!todaysTraining) {
        return { success: true, data: null };
      }

      // Transform the data to match component expectations
      const strengthExercises = todaysTraining.strength_exercise?.map((se: any) => ({
        id: se.id?.toString() || Math.random().toString(),
        name: se.exercises?.name || 'Unknown Exercise',
        completed: se.completed || false,
        sets: se.sets || 1,
        reps: se.reps || [10],
        weight: se.weight || [null],
        weight1rm: se.weight_1rm || [70],
      })) || [];

      const enduranceSessions = todaysTraining.endurance_session?.map((es: any) => ({
        id: es.id?.toString() || Math.random().toString(),
        name: es.name || `${es.sport_type} - ${es.training_volume} ${es.unit}`,
        completed: es.completed || false,
        sets: 1,
        reps: [],
        weight: [],
        weight1rm: [],
      })) || [];

      const transformedTraining = {
        id: todaysTraining.id || todayName,
        name: `${todayName} Training`,
        isRestDay: todaysTraining.is_rest_day,
        exercises: [...strengthExercises, ...enduranceSessions],
      };

      return { success: true, data: transformedTraining };
    } catch (error) {
      console.error('💥 TrainingService: Error fetching today\'s training:', error);
      return { success: false, error: 'Failed to fetch today\'s training' };
    }
  }

  /**
   * Get recent completed trainings (last 3)
   */
  static async getRecentActivity(userProfileId: number): Promise<TrainingServiceResponse<any[]>> {
    try {
      // Get training plan with relational data
      const { data: trainingPlan, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_training (
              *,
              strength_exercise (
                *,
                exercises (*)
              ),
              endurance_session (*)
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !trainingPlan) {
        return { success: true, data: [] };
      }

      // Get current week's schedule
      const targetWeek = trainingPlan.current_week || 1;
      const currentWeek = trainingPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_training) {
        return { success: true, data: [] };
      }

      // Filter and transform completed trainings (only where ALL exercises are completed)
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const recentActivities = currentWeek.daily_training
        .filter((training: any) => {
          // Only get training days, not rest days
          if (training.is_rest_day) return false;
          
          // Check if all exercises in this training are completed
          const strengthCompleted = training.strength_exercise?.every((ex: any) => ex.completed) ?? true;
          const enduranceCompleted = training.endurance_session?.every((ex: any) => ex.completed) ?? true;
          return strengthCompleted && enduranceCompleted;
        })
        .sort((a: any, b: any) => {
          // Sort by day order (most recent first)
          const aIndex = dayOrder.indexOf(a.day_of_week);
          const bIndex = dayOrder.indexOf(b.day_of_week);
          return bIndex - aIndex;
        })
        .slice(0, 3) // Take only last 3 completed trainings
        .map((training: any, index: number) => {
          const exerciseCount = (training.strength_exercise?.length || 0) + (training.endurance_session?.length || 0);
          return {
            id: training.id?.toString() || training.day_of_week,
            type: 'training' as const,
            title: `${training.day_of_week} Training`,
            subtitle: `${exerciseCount} exercises`,
            date: index === 0 ? 'Yesterday' : index === 1 ? '2 days ago' : '3 days ago',
            duration: '45 min',
            calories: 320,
          };
        });

      return { success: true, data: recentActivities };
    } catch (error) {
      console.error('💥 TrainingService: Error fetching recent activity:', error);
      return { success: false, error: 'Failed to fetch recent activity' };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Helper method to parse sets from database arrays
   */
  private static parseSets(setsCount: number, reps: number[], weight: number[]): TrainingSet[] {
    const sets: TrainingSet[] = [];
    for (let i = 0; i < setsCount; i++) {
      sets.push({
        id: `set-${i}`,
        reps: reps[i] || 0,
        weight: weight[i] || 0,
        completed: reps[i] > 0 && weight[i] > 0,
        restTime: 60
      });
    }
    return sets;
  }

  /**
   * DEBUG MODE: Enrich training plan with sample data (auto-fill weights, duplicate to 4 weeks)
   */
  private static enrichPlanForDebug(plan: TrainingTrainingPlan): TrainingTrainingPlan {
    console.log('🐛 DEBUG MODE: Starting plan enrichment...');
    
    // Get the first week as template
    const templateWeek = plan.weeklySchedules[0];
    if (!templateWeek) {
      console.warn('🐛 DEBUG MODE: No weeks found in plan, skipping enrichment');
      return plan;
    }

    // Create 24 weeks total (6 months) for better analysis
    const enrichedWeeks = [templateWeek];
    for (let weekNum = 2; weekNum <= 24; weekNum++) {
      const duplicatedWeek = {
        ...templateWeek,
        id: `${templateWeek.id}_debug_${weekNum}`,
        weekNumber: weekNum,
              completed: weekNum < 24, // Mark weeks 1-23 as completed, week 24 as in progress
              completedAt: weekNum < 24 ? new Date(Date.now() - (24 - weekNum) * 7 * 24 * 60 * 60 * 1000) : undefined,
        dailyTrainings: templateWeek.dailyTrainings.map((day, dayIndex) => {
          // For past weeks, set the daily completedAt to different days within the week
          // This ensures each day gets grouped into the correct week bucket
          const weeksInPastMs = (24 - weekNum) * 7 * 24 * 60 * 60 * 1000;
          // Add dayIndex days to vary the timestamp within the week (0 = Sunday/Monday start, add days)
          const daysOffsetMs = dayIndex * 24 * 60 * 60 * 1000;
          const dailyCompletedAt = weekNum < 24 
            ? new Date(Date.now() - weeksInPastMs - daysOffsetMs)
            : undefined;

          // Generate realistic session-RPE values (1-5 scale, progressive weeks get slightly higher)
          const baseRPE = 2.5 + (weekNum * 0.05) + (dayIndex * 0.05); // Progressive RPE: weeks 1-24 get 2.6-3.7 range on 1-5 scale
          const sessionRPE = !day.isRestDay && weekNum < 24 
            ? Math.round(Math.min(5, Math.max(1, baseRPE + (Math.random() * 0.8 - 0.4)))) // Add slight variance (-0.4 to +0.4), clamp to 1-5
            : undefined;

          return ({
            ...day,
            id: `${day.id}_debug_w${weekNum}_d${dayIndex}`,
            completed: !day.isRestDay && weekNum < 24, // Auto-complete training days in past weeks
            completedAt: !day.isRestDay && weekNum < 24 ? dailyCompletedAt : day.completedAt,
            sessionRPE: sessionRPE,
            exercises: day.exercises.map((exercise, exIndex) => {
            // Auto-fill weights for strength exercises
            if (exercise.exercise && !exercise.exerciseId?.startsWith('endurance_')) {
              // Create variation based on exercise/muscle group to generate different MWS scores
              const muscleGroup = exercise.exercise?.main_muscles?.[0] || exercise.exercise?.target_area || 'Unknown';
              const exerciseName = exercise.exercise?.name || '';
              
              // Create hash-like value from muscle group/exercise for consistent variation
              let hash = 0;
              for (let i = 0; i < muscleGroup.length; i++) {
                hash = ((hash << 5) - hash) + muscleGroup.charCodeAt(i);
                hash = hash & hash; // Convert to 32bit integer
              }
              const patternSeed = Math.abs(hash) % 5; // 0-4 patterns
              
              let baseWeight = 50;
              let shouldIncludeWeek = true; // For frequency patterns
              // Pattern 0: Plateau - same weight across weeks (low MWS, high strength score)
              // Pattern 1: Progressive - increasing weight (good MWS, high strength score)
              // Pattern 2: Declining - decreasing weight (bad MWS, low strength score)
              // Pattern 3: Inconsistent - varied weights, some missing (medium MWS, medium strength score)
              
              if (patternSeed === 0) {
                // Plateau pattern - same weight across all weeks (creates plateau signal)
                baseWeight = 60 + (exIndex * 10);
              } else if (patternSeed === 1) {
                // Progressive pattern - good progression (best performance)
                baseWeight = 45 + (weekNum * 2.5) + (exIndex * 10);
              } else if (patternSeed === 2) {
                // Declining pattern - decreasing weight (worst performance, very low strength)
                baseWeight = 90 - (weekNum * 3.5) + (exIndex * 10);
                baseWeight = Math.max(20, baseWeight); // Decline to very low
              } else if (patternSeed === 3) {
                // Inconsistent pattern - varied progression with fluctuations
                const weekVariance = (weekNum % 3 === 0) ? 15 : ((weekNum % 2 === 0) ? -10 : 5);
                baseWeight = 55 + (weekNum * 1.5) + (exIndex * 10) + weekVariance;
              } else {
                // Low frequency pattern - only trained every 4th week
                shouldIncludeWeek = (weekNum % 4 === 0) || (weekNum <= 4);
                baseWeight = 50 + (Math.floor(weekNum / 4) * 3) + (exIndex * 10);
              }
              
              const filledSets = exercise.sets?.map((set, setIndex) => ({
                ...set,
                weight: baseWeight + (setIndex * 2.5), // Slight progression per set
                completed: shouldIncludeWeek && weekNum < 24, // Only complete if should be included in past weeks
              })) || [];
              
              return {
                ...exercise,
                id: `${exercise.id}_debug_w${weekNum}_ex${exIndex}`,
                completed: shouldIncludeWeek && weekNum < 24 && filledSets.length > 0 && filledSets.every(s => s.weight > 0),
                sets: filledSets,
              };
            }
            // Endurance sessions - mark as completed if in past weeks
            return {
              ...exercise,
              id: `${exercise.id}_debug_w${weekNum}_ex${exIndex}`,
              completed: weekNum < 24,
            };
          }),
          });
        }),
      };
      enrichedWeeks.push(duplicatedWeek);
    }

    // Auto-fill the first week as well (week 1, completed 23 weeks ago)
    const week1WeeksInPastMs = 3 * 7 * 24 * 60 * 60 * 1000; // 23 weeks ago
    enrichedWeeks[0] = {
      ...enrichedWeeks[0],
      dailyTrainings: enrichedWeeks[0].dailyTrainings.map((day, dayIndex) => {
        // Set completedAt for week 1 days (23 weeks ago + day offset)
        const daysOffsetMs = dayIndex * 24 * 60 * 60 * 1000;
        const dailyCompletedAt = !day.isRestDay 
          ? new Date(Date.now() - week1WeeksInPastMs - daysOffsetMs)
          : day.completedAt;

        // Generate realistic session-RPE for week 1 (2-4 range on 1-5 scale)
        const week1RPE = !day.isRestDay 
          ? Math.round(2 + Math.random() * 2) // Random between 2-4
          : undefined;

        return {
          ...day,
          completed: !day.isRestDay && day.exercises.length > 0 && day.exercises.every(ex => ex.completed),
          completedAt: dailyCompletedAt,
          sessionRPE: week1RPE,
          exercises: day.exercises.map((exercise) => {
            if (exercise.exercise && !exercise.exerciseId?.startsWith('endurance_')) {
              // Use same variation pattern for week 1 to maintain consistency
              const muscleGroup = exercise.exercise?.main_muscles?.[0] || exercise.exercise?.target_area || 'Unknown';
              let hash = 0;
              for (let i = 0; i < muscleGroup.length; i++) {
                hash = ((hash << 5) - hash) + muscleGroup.charCodeAt(i);
                hash = hash & hash;
              }
              const patternSeed = Math.abs(hash) % 5; // 0-4 patterns
              
              let baseWeight = 50;
              let shouldIncludeWeek = true;
              
              if (patternSeed === 0) {
                // Plateau
                baseWeight = 60;
              } else if (patternSeed === 1) {
                // Progressive (week 1 start)
                baseWeight = 45;
              } else if (patternSeed === 2) {
                // Severe declining (week 1 was higher)
                baseWeight = 80;
              } else if (patternSeed === 3) {
                // Inconsistent
                baseWeight = 55;
              } else {
                // Low frequency (include week 1)
                shouldIncludeWeek = true;
                baseWeight = 50;
              }
              
              const filledSets = exercise.sets?.map((set, setIndex) => ({
                ...set,
                weight: baseWeight + (setIndex * 2.5),
                completed: shouldIncludeWeek,
              })) || [];
              
              return {
                ...exercise,
                completed: shouldIncludeWeek && filledSets.length > 0 && filledSets.every(s => s.weight > 0),
                sets: filledSets,
              };
            }
            return {
              ...exercise,
              completed: true,
            };
          }),
        };
      }),
      completed: enrichedWeeks[0].dailyTrainings.every(day => day.completed || day.isRestDay),
      completedAt: enrichedWeeks[0].dailyTrainings.find(d => d.completedAt)?.completedAt,
    };

    console.log(`🐛 DEBUG MODE: Enriched plan with ${enrichedWeeks.length} weeks (6 months)`);
    
    return {
      ...plan,
      totalWeeks: 24,
      weeklySchedules: enrichedWeeks,
    };
  }

  /**
   * Calculate 1RM using Epley formula
   */
  static calculateOneRM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    
    // Epley formula: 1RM = weight * (1 + reps/30)
    return Math.round(weight * (1 + reps / 30));
  }

  /**
   * Calculate training progress percentage
   */
  static calculateTrainingProgress(exercises: TrainingExercise[]): number {
    if (exercises.length === 0) return 0;
    
    const completedExercises = exercises.filter(ex => ex.completed).length;
    return Math.round((completedExercises / exercises.length) * 100);
  }

  /**
   * Calculate weekly progress
   */
  static calculateWeeklyProgress(dailyTrainings: DailyTraining[]): number {
    if (dailyTrainings.length === 0) return 0;
    
    const completedTrainings = dailyTrainings.filter(training => training.completed).length;
    return Math.round((completedTrainings / dailyTrainings.length) * 100);
  }

  // ============================================================================
  // DAILY FEEDBACK (ACE PATTERN)
  // ============================================================================

  /**
   * Submit daily training feedback with optional skip
   */
  static async submitDailyFeedback(feedbackData: {
    daily_training_id: number;
    user_id: string;
    plan_id: string;
    week_number: number;
    day_of_week: string;
    training_date: string;
    training_type: string;
    original_training: any;
    actual_training: any;
    session_completed: boolean;
    completion_percentage: number;
    feedback_provided: boolean;
    user_rating?: number;
    user_feedback?: string;
    energy_level?: number;
    difficulty?: number;
    enjoyment?: number;
    soreness_level?: number;
    injury_reported?: boolean;
    injury_description?: string;
    pain_location?: string;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    performance_metrics?: any;
    personal_info: any;
  }): Promise<TrainingServiceResponse<{
    lessons_generated: number;
    lessons_added: number;
    lessons_updated: number;
    modifications_detected: number;
    total_lessons: number;
    training_status_updated: boolean;
  }>> {
    try {
      console.log('📝 Submitting daily training feedback...');

      // Get JWT token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const apiUrl = `${API_CONFIG.BASE_URL}/api/training/daily-training-feedback`;

      const requestBody = {
        ...feedbackData,
        jwt_token: authToken,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Daily feedback API error:', response.status, response.statusText, errorText);
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`,
        };
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Daily feedback submitted successfully');
        console.log(`   • Lessons generated: ${result.data.lessons_generated}`);
        console.log(`   • Lessons added: ${result.data.lessons_added}`);
        console.log(`   • Modifications detected: ${result.data.modifications_detected}`);
        console.log(`   • Total lessons in playbook: ${result.data.total_lessons}`);

        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Daily feedback submission failed:', result.message);
        return {
          success: false,
          error: result.message || 'Failed to submit daily feedback',
        };
      }
    } catch (error) {
      console.error('💥 Daily feedback error:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Compare original vs actual training to detect modifications
   * This is a helper method for the frontend to prepare data for daily feedback
   */
  static detectTrainingModifications(
    originalTraining: DailyTraining,
    actualTraining: DailyTraining
  ): any {
    const modifications = {
      strength_exercises: originalTraining.exercises
        .filter(ex => ex.exercise && ex.sets)
        .map(origEx => {
          const actualEx = actualTraining.exercises.find(ae => ae.exerciseId === origEx.exerciseId);
          
          if (!actualEx) {
            return null; // Exercise was removed
          }

          return {
            exercise_id: parseInt(origEx.exerciseId),
            exercise_name: origEx.exercise?.name,
            sets: actualEx.sets?.length || 0,
            reps: actualEx.sets?.map(s => s.reps) || [],
            weight: actualEx.sets?.map(s => s.weight) || [],
          };
        })
        .filter(Boolean),
      endurance_sessions: originalTraining.exercises
        .filter(ex => ex.enduranceSession)
        .map(origEx => {
          const actualEx = actualTraining.exercises.find(ae => ae.exerciseId === origEx.exerciseId);
          
          if (!actualEx || !actualEx.enduranceSession) {
            return null;
          }

          return {
            id: parseInt(actualEx.enduranceSession.id),
            name: actualEx.enduranceSession.name,
            sport_type: actualEx.enduranceSession.sportType,
            training_volume: actualEx.enduranceSession.trainingVolume,
            unit: actualEx.enduranceSession.unit,
            heart_rate_zone: actualEx.enduranceSession.heartRateZone,
            completed: actualEx.enduranceSession.completed,
          };
        })
        .filter(Boolean),
    };

    return modifications;
  }
}

// Get historical training data for a specific exercise
/**
 * Extract exercise history from local training plan
 */
function extractExerciseHistoryFromLocalPlan(
  exerciseId: number,
  localPlan: TrainingTrainingPlan | null
): Array<{
  date: string;
  volume: number;
  maxWeight: number;
  sets: number;
  reps: number[];
  weights: number[];
  updated_at: string;
}> {
  if (!localPlan) return [];

  const history: Array<{
    date: string;
    volume: number;
    maxWeight: number;
    sets: number;
    reps: number[];
    weights: number[];
    updated_at: string;
  }> = [];

  localPlan.weeklySchedules.forEach(week => {
    week.dailyTrainings.forEach(dailyTraining => {
      // Use daily training completedAt (which maps to updated_at from database) or skip
      const completedDate = dailyTraining.completedAt;
      if (!completedDate) return;

      dailyTraining.exercises.forEach((exercise: any) => {
        // Only include completed strength exercises matching the exercise ID
        const exerciseIdStr = exercise.exerciseId?.toString() || '';
        const exerciseIdNum = parseInt(exerciseIdStr.replace(/\D/g, ''), 10);
        
        if (!exercise.completed || 
            !exercise.exercise || 
            !exercise.sets || 
            exercise.sets.length === 0 ||
            exerciseIdNum !== exerciseId ||
            exercise.enduranceSession) {
          return;
        }

        // Extract weight and reps arrays from sets
        const weights: number[] = [];
        const reps: number[] = [];

        exercise.sets.forEach((set: any) => {
          if (set.completed) {
            weights.push(set.weight || 0);
            reps.push(set.reps || 0);
          }
        });

        // Only include if we have at least one completed set
        if (weights.length === 0 || reps.length === 0) {
          return;
        }

        // Calculate volume and max weight
        let volume = 0;
        let maxWeight = 0;
        for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
          const weight = weights[i] || 0;
          const rep = reps[i] || 0;
          volume += weight * rep;
          maxWeight = Math.max(maxWeight, weight);
        }

        if (volume > 0) {
          history.push({
            date: completedDate.toISOString().split('T')[0],
            volume,
            maxWeight,
            sets: weights.length,
            reps,
            weights,
            updated_at: completedDate.toISOString()
          });
        }
      });
    });
  });

  // Sort by date (most recent first)
  history.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  
  return history;
}

export const getExerciseHistory = async (
  exerciseId: number, 
  userProfileId: number,
  localPlan?: TrainingTrainingPlan | null
): Promise<{
  success: boolean;
  data?: {
    volumeData: Array<{ date: string; volume: number }>;
    recentTrainings: Array<{ 
      date: string; 
      volume: number; 
      maxWeight: number;
      sets: number;
      reps: number[];
      weights: number[];
    }>;
    maxWeight: number;
    maxVolume: number;
  };
  error?: string;
}> => {
  try {
    console.log(`📊 Fetching exercise history for exercise ${exerciseId}, user ${userProfileId}`);
    
    let data: any[] = [];

    if (localPlan) {
      // Use local plan data
      const localHistory = extractExerciseHistoryFromLocalPlan(exerciseId, localPlan);
      // Transform to database-like format
      data = localHistory.map(h => ({
        exercise_id: exerciseId,
        completed: true,
        weight: h.weights,
        reps: h.reps,
        sets: h.sets,
        updated_at: h.updated_at
      }));
    } else {
      // Get all COMPLETED strength exercises for this specific exercise and user from database
      const { data: dbData, error } = await supabase
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
        .eq('exercise_id', exerciseId)
        .eq('completed', true)
        .eq('daily_training.weekly_schedules.training_plans.user_profile_id', userProfileId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching exercise history:', error);
        return { success: false, error: error.message };
      }

      data = dbData || [];
    }

    if (!data || data.length === 0) {
      console.log('No completed training data found for this exercise');
      return { 
        success: true, 
        data: {
          volumeData: [],
          recentTrainings: [],
          maxWeight: 0,
          maxVolume: 0
        }
      };
    }

    console.log(`📊 Found ${data.length} completed training records`);
    console.log(`📊 Sample data:`, data.slice(0, 2).map(d => ({
      exercise_id: d.exercise_id,
      completed: d.completed,
      weight: d.weight,
      reps: d.reps,
      sets: d.sets,
      updated_at: d.updated_at
    })));

    // Process the data
    const volumeData: Array<{ date: string; volume: number }> = [];
    const recentTrainings: Array<{ 
      date: string; 
      volume: number; 
      maxWeight: number;
      sets: number;
      reps: number[];
      weights: number[];
    }> = [];
    let maxWeight = 0;
    let maxVolume = 0;

    data.forEach((trainingExercise) => {
      const date = new Date(trainingExercise.updated_at).toISOString().split('T')[0];
      const weights = Array.isArray(trainingExercise.weight) ? trainingExercise.weight : [];
      const reps = Array.isArray(trainingExercise.reps) ? trainingExercise.reps : [];
      const sets = trainingExercise.sets || 0;
      
      console.log(`📊 Processing training:`, {
        date,
        weights,
        reps,
        sets,
        weightArray: trainingExercise.weight
      });
      
      // Calculate volume (total reps × total weight)
      let volume = 0;
      let trainingMaxWeight = 0;
      
      for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
        const weight = weights[i] || 0;
        const rep = reps[i] || 0;
        volume += weight * rep;
        trainingMaxWeight = Math.max(trainingMaxWeight, weight);
      }
      
      console.log(`📊 Calculated: volume=${volume}, maxWeight=${trainingMaxWeight}`);
      
      maxWeight = Math.max(maxWeight, trainingMaxWeight);
      maxVolume = Math.max(maxVolume, volume);
      
      // Only add to volume data if there's actual volume (not zero)
      if (volume > 0) {
        // Add to volume data (group by date)
        const existingVolumeIndex = volumeData.findIndex(item => item.date === date);
        if (existingVolumeIndex >= 0) {
          volumeData[existingVolumeIndex].volume += volume;
        } else {
          volumeData.push({ date, volume });
        }
      }
      
      // Add to recent trainings (last 3 as requested)
      if (recentTrainings.length < 3) {
        recentTrainings.push({ 
          date, 
          volume, 
          maxWeight: trainingMaxWeight,
          sets,
          reps,
          weights
        });
      }
    });

    // Sort volume data by date
    volumeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`📊 Found ${data.length} training records, ${volumeData.length} unique dates`);
    
    return {
      success: true,
      data: {
        volumeData,
        recentTrainings,
        maxWeight,
        maxVolume
      }
    };

  } catch (error) {
    console.error('Error fetching exercise history:', error);
    return { success: false, error: 'Failed to fetch exercise history' };
  }
};

