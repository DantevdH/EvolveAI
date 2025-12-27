// Training Service - Comprehensive service for all training and training operations
import { supabase } from '../config/supabase';
import { UserProfile, TrainingPlan } from '../types';
import { API_CONFIG } from '../constants/api';
import { mapProfileToBackendRequest } from '../utils/profileDataMapping';
import { ENV } from '../config/env';
import { apiClient } from './apiClient';
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
import { parseLocalDate } from '../utils/trainingDateUtils';

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
      // Explicitly include main_muscles (jsonb) field to ensure it's loaded
      // Include endurance_segment for interval workouts
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
                exercises (
                  *,
                  main_muscles
                )
              ),
              endurance_session (
                *,
                endurance_segment (*)
              )
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
            focusTheme: schedule.focus_theme && schedule.focus_theme.trim() !== '' ? schedule.focus_theme : undefined,
            primaryGoal: schedule.primary_goal && schedule.primary_goal.trim() !== '' ? schedule.primary_goal : undefined,
            progressionLever: schedule.progression_lever && schedule.progression_lever.trim() !== '' ? schedule.progression_lever : undefined,
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
                      target_area: se.exercises.target_area,
                      secondary_muscles: se.exercises.secondary_muscles,
                      main_muscles: se.exercises.main_muscles || [], // Ensure it's an array, not undefined
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
                    // Enriched fields at top-level (for round-trip preservation) - extract from exercises table
                    targetArea: se.exercises?.target_area || null,
                    mainMuscles: se.exercises?.main_muscles || null,
                    force: se.exercises?.force || null
                  })) || [];

                // Map endurance sessions to proper format with segments
                const enduranceSessions = daily.endurance_session?.map((es: any) => {
                  const executionOrder = es.execution_order || (strengthExercises.length + 1); // Fallback if missing

                  // Map segments from database
                  const segments = (es.endurance_segment || [])
                    .sort((a: any, b: any) => (a.segment_order || 0) - (b.segment_order || 0))
                    .map((seg: any) => ({
                      id: seg.id.toString(),
                      segmentOrder: seg.segment_order,
                      segmentType: seg.segment_type || 'work',
                      name: seg.name,
                      description: seg.description,
                      targetType: seg.target_type || 'time',
                      targetValue: seg.target_value,
                      targetHeartRateZone: seg.target_heart_rate_zone,
                      targetPace: seg.target_pace,
                      repeatCount: seg.repeat_count || 1,
                      actualDuration: seg.actual_duration,
                      actualDistance: seg.actual_distance,
                      actualAvgPace: seg.actual_avg_pace,
                      actualAvgHeartRate: seg.actual_avg_heart_rate,
                      actualMaxHeartRate: seg.actual_max_heart_rate,
                      startedAt: seg.started_at ? new Date(seg.started_at) : undefined,
                      completedAt: seg.completed_at ? new Date(seg.completed_at) : undefined,
                    }));

                  // Calculate total target duration and distance from segments (accounting for repeat_count)
                  let totalTargetDuration = 0;
                  let totalTargetDistance = 0;
                  for (const seg of segments) {
                    const repeatCount = seg.repeatCount || 1;
                    if (seg.targetType === 'time' && seg.targetValue) {
                      totalTargetDuration += seg.targetValue * repeatCount;
                    } else if (seg.targetType === 'distance' && seg.targetValue) {
                      totalTargetDistance += seg.targetValue * repeatCount;
                    }
                  }

                  // Generate name from segments if not provided
                  const generatedName = es.name || this.generateEnduranceSessionName(es.sport_type, segments);

                  return {
                    id: es.id.toString(),
                    exerciseId: `endurance_${es.id}`,
                    completed: es.completed || false,
                    order: executionOrder, // Legacy field
                    executionOrder: executionOrder,
                    enduranceSession: {
                      id: es.id.toString(),
                      name: generatedName,
                      description: es.description || `${es.sport_type} session`,
                      sportType: es.sport_type,
                      executionOrder: executionOrder,
                      completed: es.completed || false,
                      segments: segments,
                      totalTargetDuration: totalTargetDuration,
                      totalTargetDistance: totalTargetDistance,
                      // Session-level actuals
                      actualDuration: es.actual_duration,
                      actualDistance: es.actual_distance,
                      averagePace: es.average_pace,
                      averageSpeed: es.average_speed,
                      averageHeartRate: es.average_heart_rate,
                      maxHeartRate: es.max_heart_rate,
                      minHeartRate: es.min_heart_rate,
                      elevationGain: es.elevation_gain,
                      elevationLoss: es.elevation_loss,
                      calories: es.calories,
                      cadence: es.cadence,
                      dataSource: es.data_source,
                      healthWorkoutId: es.health_workout_id,
                      startedAt: es.started_at ? new Date(es.started_at) : undefined,
                      completedAt: es.completed_at ? new Date(es.completed_at) : undefined,
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
                  scheduledDate: parseLocalDate(daily.scheduled_date),
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
  /**
   * Save a temporary exercise to the database
   * This is called when a newly added exercise is marked as complete
   */
  static async saveTemporaryExercise(
    exercise: TrainingExercise,
    dailyTrainingId: string
  ): Promise<{ success: boolean; newId?: number; error?: string }> {
    try {
      if (exercise.enduranceSession) {
        // Endurance session - insert session first, then segments
        const { data: sessionData, error: sessionError } = await supabase
          .from('endurance_session')
          .insert({
            daily_training_id: dailyTrainingId,
            sport_type: exercise.enduranceSession.sportType,
            execution_order: exercise.executionOrder,
            completed: exercise.completed || false,
            name: exercise.enduranceSession.name || null,
            description: exercise.enduranceSession.description || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error saving temporary endurance session:', sessionError);
          return { success: false, error: sessionError.message };
        }

        // Insert segments for this session
        const segments = exercise.enduranceSession.segments || [];
        if (segments.length > 0) {
          const segmentsToInsert = segments.map((seg) => ({
            endurance_session_id: sessionData.id,
            segment_order: seg.segmentOrder,
            segment_type: seg.segmentType || 'work',
            name: seg.name || null,
            description: seg.description || null,
            target_type: seg.targetType || 'time',
            target_value: seg.targetValue || null,
            target_heart_rate_zone: seg.targetHeartRateZone || null,
            target_pace: seg.targetPace || null,
            repeat_count: seg.repeatCount || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const { error: segmentsError } = await supabase
            .from('endurance_segment')
            .insert(segmentsToInsert);

          if (segmentsError) {
            console.error('Error saving endurance segments:', segmentsError);
            // Session was created, but segments failed - return success with warning
            console.warn('Session created but segments failed to save');
          }
        }

        return { success: true, newId: sessionData.id };
      } else if (exercise.exercise) {
        // Strength exercise
        const sets = exercise.sets || [];
        const reps = sets.length > 0 
          ? sets.map(s => s.reps) 
          : (exercise.weight?.length ? exercise.weight.map(() => 12) : [12, 12, 12]);
        const weight = sets.length > 0
          ? sets.map(s => s.weight)
          : (exercise.weight || [0, 0, 0]);
        const setsCount = sets.length || reps.length || 3;

        const { data, error } = await supabase
          .from('strength_exercise')
          .insert({
            daily_training_id: dailyTrainingId,
            exercise_id: parseInt(exercise.exerciseId),
            sets: setsCount,
            reps: reps,
            weight: weight,
            execution_order: exercise.executionOrder,
            completed: exercise.completed || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving temporary strength exercise:', error);
          return { success: false, error: error.message };
        }

        return { success: true, newId: data.id };
      }

      return { success: false, error: 'Invalid exercise type' };
    } catch (error) {
      console.error('Error in saveTemporaryExercise:', error);
      return { success: false, error: 'Failed to save temporary exercise' };
    }
  }

  static async updateExerciseCompletion(
    exerciseId: string, 
    completed: boolean,
    exercise?: TrainingExercise,
    dailyTrainingId?: string
  ): Promise<{ success: boolean; newId?: number; error?: string }> {
    try {
      // Check if this is a temporary ID (newly added exercise that hasn't been saved to DB yet)
      // Temporary IDs:
      // - Strength exercises: start with "temp_" (e.g., "temp_1234567890_abc123")
      // - Endurance sessions: start with "endurance_temp_" (e.g., "endurance_temp_1234567890_abc123")
      // Note: Real endurance session IDs from DB are just numbers, but exerciseId stores them as "endurance_{id}"
      const isTempStrength = exerciseId.startsWith('temp_');
      const isTempEndurance = exerciseId.startsWith('endurance_temp_');
      
      if (isTempStrength || isTempEndurance) {
        // This is a temporary ID - we need to save it to DB first
        if (!exercise || !dailyTrainingId) {
          console.log(`ℹ️ Temporary exercise ID ${exerciseId} - will be saved when full workout is completed`);
          return { success: true };
        }

        // Save the temporary exercise to database
        const saveResult = await this.saveTemporaryExercise(exercise, dailyTrainingId);
        if (!saveResult.success) {
          return { success: false, error: saveResult.error };
        }

        // Return the new database ID so the frontend can update the local state
        console.log(`✅ Saved temporary exercise to DB with new ID: ${saveResult.newId}`);
        return { success: true, newId: saveResult.newId };
      }

      // Determine exercise type from the exercise object (most reliable)
      // Endurance sessions have enduranceSession property, strength exercises have exercise property
      const isEnduranceSession = exercise?.enduranceSession !== undefined;
      
      if (isEnduranceSession) {
        // This is an endurance session - extract numeric ID
        // exercise.id can be "123" (from DB) or "endurance_123" (after saving temporary)
        let numericId = exerciseId;
        if (exerciseId.startsWith('endurance_')) {
          numericId = exerciseId.replace('endurance_', '');
        }
        
        const { data: enduranceData, error: enduranceError } = await supabase
          .from('endurance_session')
          .update({
            completed: completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', numericId)
          .select()
          .single();

        if (enduranceError) {
          console.error('Error updating endurance session completion:', enduranceError);
          return { success: false, error: enduranceError.message };
        }

        console.log(`✅ Endurance session ${numericId} completion updated to: ${completed}`);
        return { success: true };
      }

      // Also check if exerciseId has endurance_ prefix (fallback for edge cases)
      if (exerciseId.startsWith('endurance_') && !exerciseId.startsWith('endurance_temp_')) {
        const numericId = exerciseId.replace('endurance_', '');
        const { data: enduranceData, error: enduranceError } = await supabase
          .from('endurance_session')
          .update({
            completed: completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', numericId)
          .select()
          .single();

        if (!enduranceError && enduranceData) {
          console.log(`✅ Endurance session ${numericId} completion updated to: ${completed}`);
          return { success: true };
        }
      }

      // This is a strength exercise - use the numeric ID directly
      // exercise.id is the strength_exercise table ID
      const { data: strengthData, error: strengthError } = await supabase
        .from('strength_exercise')
        .update({
          completed: completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (strengthError) {
        console.error('Error updating strength exercise completion:', strengthError);
        return { success: false, error: strengthError.message };
      }

      console.log(`✅ Strength exercise ${exerciseId} completion updated to: ${completed}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateExerciseCompletion:', error);
      return { success: false, error: 'Failed to update exercise completion' };
    }
  }

  /**
   * Bulk reset exercise completion status for reopening training
   * Updates all exercises for a daily training to incomplete in a single call
   */
  static async bulkResetExerciseCompletion(
    exercises: TrainingExercise[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Separate strength exercises and endurance sessions
      const strengthExerciseIds: number[] = [];
      const enduranceSessionIds: number[] = [];

      exercises.forEach(exercise => {
        // Skip temporary exercises that haven't been saved to DB
        if (exercise.id.startsWith('temp_') || exercise.id.startsWith('endurance_temp_')) {
          return;
        }

        if (exercise.enduranceSession !== undefined) {
          // Endurance session - extract numeric ID
          // exercise.id can be "123" (from DB) or "endurance_123" (after saving temporary)
          let idString = exercise.id;
          if (exercise.id.startsWith('endurance_')) {
            idString = exercise.id.replace('endurance_', '');
          }
          const id = parseInt(idString, 10);
          if (!isNaN(id)) {
            enduranceSessionIds.push(id);
          }
        } else {
          // Strength exercise - use numeric ID directly
          const id = parseInt(exercise.id, 10);
          if (!isNaN(id)) {
            strengthExerciseIds.push(id);
          }
        }
      });

      // Bulk update strength exercises
      if (strengthExerciseIds.length > 0) {
        const { error: strengthError } = await supabase
          .from('strength_exercise')
          .update({
            completed: false,
            updated_at: new Date().toISOString()
          })
          .in('id', strengthExerciseIds);

        if (strengthError) {
          console.error('Error bulk updating strength exercises:', strengthError);
          return { success: false, error: strengthError.message };
        }
      }

      // Bulk update endurance sessions
      if (enduranceSessionIds.length > 0) {
        const { error: enduranceError } = await supabase
          .from('endurance_session')
          .update({
            completed: false,
            updated_at: new Date().toISOString()
          })
          .in('id', enduranceSessionIds);

        if (enduranceError) {
          console.error('Error bulk updating endurance sessions:', enduranceError);
          return { success: false, error: enduranceError.message };
        }
      }

      const totalUpdated = strengthExerciseIds.length + enduranceSessionIds.length;
      console.log(`✅ Bulk reset ${totalUpdated} exercises to incomplete (${strengthExerciseIds.length} strength, ${enduranceSessionIds.length} endurance)`);
      return { success: true };
    } catch (error) {
      console.error('Error in bulkResetExerciseCompletion:', error);
      return { success: false, error: 'Failed to bulk reset exercise completion' };
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
    sessionRPE?: number,
    exercises?: TrainingExercise[] // New parameter for exercises/sessions
  ): Promise<CompleteTrainingResponse> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Add session_rpe if provided
      if (sessionRPE !== undefined && sessionRPE !== null) {
        updateData.session_rpe = sessionRPE;
      }

      // Update daily_training record with session_rpe
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

      // If exercises provided, save them (this persists all added/removed exercises)
      let exerciseIdMap: Map<string, string> | undefined;
      if (exercises && exercises.length > 0) {
        const saveResult = await this.saveDailyTrainingExercises(dailyTrainingId, exercises);
        if (!saveResult.success) {
          console.error('Error saving exercises:', saveResult.error);
          return { success: false, error: saveResult.error || 'Failed to save exercises' };
        }
        exerciseIdMap = saveResult.exerciseIdMap;
      }

      return { 
        success: true, 
        data: {
          trainingId: dailyTrainingId,
          exerciseIdMap
        }
      };
    } catch (error) {
      console.error('Error in completeDailyTraining:', error);
      return { success: false, error: 'Failed to complete daily training' };
    }
  }

  /**
   * Save exercises and endurance sessions for a specific daily training
   * Called when training is completed to persist all changes (added/removed exercises)
   * NOTE: This method is ONLY called when ALL exercises in the day are completed
   * Therefore, all exercises/sessions are saved with completed: true
   * 
   * @param dailyTrainingId - The daily training ID
   * @param exercises - Array of TrainingExercise objects (including added/removed)
   * @returns Success status
   */
  static async saveDailyTrainingExercises(
    dailyTrainingId: string,
    exercises: TrainingExercise[]
  ): Promise<{ success: boolean; error?: string; exerciseIdMap?: Map<string, string> }> {
    try {
      // 1. Delete all existing exercises/sessions for this daily training
      // Delete strength exercises
      const { error: strengthError } = await supabase
        .from('strength_exercise')
        .delete()
        .eq('daily_training_id', dailyTrainingId);

      if (strengthError) {
        console.error('Error deleting strength exercises:', strengthError);
        return { success: false, error: strengthError.message };
      }

      // Delete endurance sessions
      const { error: enduranceError } = await supabase
        .from('endurance_session')
        .delete()
        .eq('daily_training_id', dailyTrainingId);

      if (enduranceError) {
        console.error('Error deleting endurance sessions:', enduranceError);
        return { success: false, error: enduranceError.message };
      }

      // 2. Separate exercises into strength exercises and endurance sessions (with segments)
      const strengthExercises: any[] = [];
      const enduranceSessionsData: { session: any; segments: any[] }[] = [];

      for (const exercise of exercises) {
        if (exercise.enduranceSession) {
          // Endurance session - prepare session and segments separately
          const sessionData = {
            daily_training_id: dailyTrainingId,
            sport_type: exercise.enduranceSession.sportType,
            execution_order: exercise.executionOrder,
            completed: true, // ALL exercises are completed when this method is called
            name: exercise.enduranceSession.name || null,
            description: exercise.enduranceSession.description || null,
            // Include session-level actuals if present
            actual_duration: exercise.enduranceSession.actualDuration || null,
            actual_distance: exercise.enduranceSession.actualDistance || null,
            average_pace: exercise.enduranceSession.averagePace || null,
            average_speed: exercise.enduranceSession.averageSpeed || null,
            average_heart_rate: exercise.enduranceSession.averageHeartRate || null,
            max_heart_rate: exercise.enduranceSession.maxHeartRate || null,
            min_heart_rate: exercise.enduranceSession.minHeartRate || null,
            elevation_gain: exercise.enduranceSession.elevationGain || null,
            elevation_loss: exercise.enduranceSession.elevationLoss || null,
            calories: exercise.enduranceSession.calories || null,
            cadence: exercise.enduranceSession.cadence || null,
            data_source: exercise.enduranceSession.dataSource || null,
            health_workout_id: exercise.enduranceSession.healthWorkoutId || null,
            started_at: exercise.enduranceSession.startedAt?.toISOString() || null,
            completed_at: exercise.enduranceSession.completedAt?.toISOString() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Prepare segments
          const segments = (exercise.enduranceSession.segments || []).map((seg: any) => ({
            segment_order: seg.segmentOrder,
            segment_type: seg.segmentType || 'work',
            name: seg.name || null,
            description: seg.description || null,
            target_type: seg.targetType || 'time',
            target_value: seg.targetValue || null,
            target_heart_rate_zone: seg.targetHeartRateZone || null,
            target_pace: seg.targetPace || null,
            repeat_count: seg.repeatCount || 1,
            actual_duration: seg.actualDuration || null,
            actual_distance: seg.actualDistance || null,
            actual_avg_pace: seg.actualAvgPace || null,
            actual_avg_heart_rate: seg.actualAvgHeartRate || null,
            actual_max_heart_rate: seg.actualMaxHeartRate || null,
            started_at: seg.startedAt?.toISOString() || null,
            completed_at: seg.completedAt?.toISOString() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          enduranceSessionsData.push({ session: sessionData, segments });
        } else if (exercise.exercise) {
          // Strength exercise
          // Extract reps and weight from TrainingSet[] or use weight array
          const sets = exercise.sets || [];
          const reps = sets.length > 0 
            ? sets.map(s => s.reps) 
            : (exercise.weight?.length ? exercise.weight.map(() => 12) : [12, 12, 12]);
          const weight = sets.length > 0
            ? sets.map(s => s.weight)
            : (exercise.weight || [0, 0, 0]);
          const setsCount = sets.length || reps.length || 3;

          strengthExercises.push({
            daily_training_id: dailyTrainingId,
            exercise_id: parseInt(exercise.exerciseId),
            sets: setsCount,
            reps: reps,
            weight: weight,
            execution_order: exercise.executionOrder,
            completed: true, // ALL exercises are completed when this method is called
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      // 3. Insert new strength exercises and get back their IDs
      let insertedStrengthExercises: any[] = [];
      if (strengthExercises.length > 0) {
        const { data: strengthData, error: insertStrengthError } = await supabase
          .from('strength_exercise')
          .insert(strengthExercises)
          .select();

        if (insertStrengthError) {
          console.error('Error inserting strength exercises:', insertStrengthError);
          return { success: false, error: insertStrengthError.message };
        }

        insertedStrengthExercises = strengthData || [];
      }

      // 4. Insert new endurance sessions with their segments
      let insertedEnduranceSessions: any[] = [];
      if (enduranceSessionsData.length > 0) {
        // Insert sessions one by one to get IDs for segment linking
        for (const { session, segments } of enduranceSessionsData) {
          const { data: sessionData, error: insertSessionError } = await supabase
            .from('endurance_session')
            .insert(session)
            .select()
            .single();

          if (insertSessionError) {
            console.error('Error inserting endurance session:', insertSessionError);
            return { success: false, error: insertSessionError.message };
          }

          const insertedSession = sessionData;
          insertedEnduranceSessions.push(insertedSession);

          // Insert segments for this session
          if (segments.length > 0) {
            const segmentsWithSessionId = segments.map((seg: any) => ({
              ...seg,
              endurance_session_id: insertedSession.id,
            }));

            const { error: insertSegmentsError } = await supabase
              .from('endurance_segment')
              .insert(segmentsWithSessionId);

            if (insertSegmentsError) {
              console.error('Error inserting endurance segments:', insertSegmentsError);
              return { success: false, error: insertSegmentsError.message };
            }
          }
        }
      }

      // 5. Map new IDs back to exercises (preserve order)
      const exerciseIdMap = new Map<string, string>();
      let strengthIndex = 0;
      let enduranceIndex = 0;

      exercises.forEach(exercise => {
        if (exercise.enduranceSession) {
          if (enduranceIndex < insertedEnduranceSessions.length) {
            const newId = insertedEnduranceSessions[enduranceIndex].id;
            exerciseIdMap.set(exercise.id, `endurance_${newId}`);
            enduranceIndex++;
          }
        } else if (exercise.exercise) {
          if (strengthIndex < insertedStrengthExercises.length) {
            const newId = insertedStrengthExercises[strengthIndex].id;
            exerciseIdMap.set(exercise.id, newId.toString());
            strengthIndex++;
          }
        }
      });

      console.log(`✅ Saved ${strengthExercises.length} strength exercises and ${enduranceSessionsData.length} endurance sessions for daily training ${dailyTrainingId}`);
      return { success: true, exerciseIdMap };
    } catch (error) {
      console.error('Error in saveDailyTrainingExercises:', error);
      return { success: false, error: 'Failed to save exercises and sessions' };
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
      })) || [];

      const enduranceSessions = todaysTraining.endurance_session?.map((es: any) => ({
        id: es.id?.toString() || Math.random().toString(),
        name: es.name || `${es.sport_type} - ${es.training_volume} ${es.unit}`,
        completed: es.completed || false,
        sets: 1,
        reps: [],
        weight: [],
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
   * Generate a descriptive name for an endurance session based on its segments
   */
  private static generateEnduranceSessionName(sportType: string, segments: any[]): string {
    if (!segments || segments.length === 0) {
      return `${this.formatSportType(sportType)} Session`;
    }

    // Single segment: simple format
    if (segments.length === 1) {
      const seg = segments[0];
      if (seg.targetType === 'time' && seg.targetValue) {
        const minutes = Math.round(seg.targetValue / 60);
        return `${minutes} min ${this.formatSportType(sportType)}`;
      } else if (seg.targetType === 'distance' && seg.targetValue) {
        const km = seg.targetValue / 1000;
        return km >= 1
          ? `${km.toFixed(1)} km ${this.formatSportType(sportType)}`
          : `${Math.round(seg.targetValue)} m ${this.formatSportType(sportType)}`;
      }
      return `${this.formatSportType(sportType)} Session`;
    }

    // Multiple segments: count work intervals
    const workSegments = segments.filter(s => s.segmentType === 'work');
    if (workSegments.length > 0) {
      const firstWork = workSegments[0];
      if (firstWork.targetType === 'distance' && firstWork.targetValue) {
        const km = firstWork.targetValue / 1000;
        const distStr = km >= 1 ? `${km.toFixed(1)}km` : `${Math.round(firstWork.targetValue)}m`;
        return `${workSegments.length}x${distStr} Intervals`;
      } else if (firstWork.targetType === 'time' && firstWork.targetValue) {
        const minutes = Math.round(firstWork.targetValue / 60);
        const seconds = Math.round(firstWork.targetValue % 60);
        const timeStr = seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes} min`;
        return `${workSegments.length}x${timeStr} Intervals`;
      }
    }

    return `${segments.length} Segment ${this.formatSportType(sportType)}`;
  }

  /**
   * Format sport type for display (capitalize, replace underscores)
   */
  private static formatSportType(sportType: string): string {
    if (!sportType) return 'Endurance';
    return sportType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

      const requestBody = {
        ...feedbackData,
        jwt_token: authToken,
      };

      // Use apiClient which handles token refresh automatically
      const result = await apiClient.post<{
        lessons_generated: number;
        lessons_added: number;
        lessons_updated: number;
        modifications_detected: number;
        total_lessons: number;
        training_status_updated: boolean;
      }>('/api/training/daily-training-feedback', requestBody);

      if (result.success && result.data) {
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

  // ============================================================================
  // LIVE TRACKING - ENDURANCE SESSION UPDATES
  // ============================================================================

  /**
   * Update an endurance session with tracked workout data
   * Called after live GPS tracking or health app import completes
   */
  static async updateEnduranceSessionWithTrackedData(
    enduranceSessionId: string,
    trackedData: {
      actualDuration: number;        // seconds
      actualDistance: number;        // meters
      averagePace?: number | null;   // seconds per km
      averageSpeed?: number | null;  // km/h
      averageHeartRate?: number | null;
      maxHeartRate?: number | null;
      minHeartRate?: number | null;
      elevationGain?: number | null; // meters
      elevationLoss?: number | null; // meters
      calories?: number | null;
      cadence?: number | null;
      dataSource: 'live_tracking' | 'healthkit' | 'google_fit';
      healthWorkoutId?: string | null;
      startedAt: Date;
      completedAt: Date;
    }
  ): Promise<TrainingServiceResponse<void>> {
    try {
      console.log('📊 Updating endurance session with tracked data:', {
        enduranceSessionId,
        dataSource: trackedData.dataSource,
        duration: trackedData.actualDuration,
        distance: trackedData.actualDistance,
      });

      const updatePayload: Record<string, any> = {
        actual_duration: trackedData.actualDuration,
        actual_distance: trackedData.actualDistance,
        average_pace: trackedData.averagePace,
        average_speed: trackedData.averageSpeed,
        average_heart_rate: trackedData.averageHeartRate,
        max_heart_rate: trackedData.maxHeartRate,
        min_heart_rate: trackedData.minHeartRate,
        elevation_gain: trackedData.elevationGain,
        elevation_loss: trackedData.elevationLoss,
        calories: trackedData.calories,
        cadence: trackedData.cadence,
        data_source: trackedData.dataSource,
        health_workout_id: trackedData.healthWorkoutId,
        started_at: trackedData.startedAt.toISOString(),
        completed_at: trackedData.completedAt.toISOString(),
        completed: true,
        updated_at: new Date().toISOString(),
      };

      // Remove null/undefined values to avoid overwriting with nulls
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === null || updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      const { error } = await supabase
        .from('endurance_session')
        .update(updatePayload)
        .eq('id', enduranceSessionId);

      if (error) {
        console.error('Error updating endurance session:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Endurance session updated with tracked data');
      return { success: true };
    } catch (error) {
      console.error('Error in updateEnduranceSessionWithTrackedData:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update endurance session',
      };
    }
  }

  /**
   * Check if a health workout has already been imported (for deduplication)
   */
  static async isHealthWorkoutImported(healthWorkoutId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('endurance_session')
        .select('id')
        .eq('health_workout_id', healthWorkoutId)
        .limit(1);

      if (error) {
        console.error('Error checking health workout import status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in isHealthWorkoutImported:', error);
      return false;
    }
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

// Export singleton instance for use with instance methods
// This wraps the static TrainingService class to provide an instance-like API
export const trainingService = {
  updateEnduranceSessionWithTrackedData: TrainingService.updateEnduranceSessionWithTrackedData.bind(TrainingService),
  isHealthWorkoutImported: TrainingService.isHealthWorkoutImported.bind(TrainingService),
  getTrainingPlan: TrainingService.getTrainingPlan.bind(TrainingService),
  deleteTrainingPlan: TrainingService.deleteTrainingPlan.bind(TrainingService),
  updateSetDetails: TrainingService.updateSetDetails.bind(TrainingService),
  saveTemporaryExercise: TrainingService.saveTemporaryExercise.bind(TrainingService),
  updateExerciseCompletion: TrainingService.updateExerciseCompletion.bind(TrainingService),
  bulkResetExerciseCompletion: TrainingService.bulkResetExerciseCompletion.bind(TrainingService),
  completeDailyTraining: TrainingService.completeDailyTraining.bind(TrainingService),
  saveDailyTrainingExercises: TrainingService.saveDailyTrainingExercises.bind(TrainingService),
  reopenDailyTraining: TrainingService.reopenDailyTraining.bind(TrainingService),
  getExerciseDetails: TrainingService.getExerciseDetails.bind(TrainingService),
  getTrainingHistory: TrainingService.getTrainingHistory.bind(TrainingService),
  getTrainingStreak: TrainingService.getTrainingStreak.bind(TrainingService),
  getWeeklyTrainingCount: TrainingService.getWeeklyTrainingCount.bind(TrainingService),
  getGoalProgress: TrainingService.getGoalProgress.bind(TrainingService),
  getTodaysTraining: TrainingService.getTodaysTraining.bind(TrainingService),
  getRecentActivity: TrainingService.getRecentActivity.bind(TrainingService),
  submitDailyFeedback: TrainingService.submitDailyFeedback.bind(TrainingService),
  detectTrainingModifications: TrainingService.detectTrainingModifications.bind(TrainingService),
  calculateOneRM: TrainingService.calculateOneRM.bind(TrainingService),
  calculateTrainingProgress: TrainingService.calculateTrainingProgress.bind(TrainingService),
  calculateWeeklyProgress: TrainingService.calculateWeeklyProgress.bind(TrainingService),
};

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

