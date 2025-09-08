// Training Service - Comprehensive service for all training and workout operations
import { supabase } from '../config/supabase';
import { UserProfile, WorkoutPlan } from '../types';
import { API_CONFIG, ERROR_MESSAGES, DEFAULT_VALUES } from '../constants/api';
import { mapProfileToBackendRequest } from '../utils/profileDataMapping';
import { 
  GenerateWorkoutPlanRequest, 
  GenerateWorkoutPlanResponse,
  ApiResponse 
} from '../types/api';
import { 
  WorkoutPlan as TrainingWorkoutPlan, 
  DailyWorkout, 
  Exercise, 
  WorkoutExercise, 
  WorkoutSet,
  WorkoutPlanResponse,
  ExerciseResponse,
  UpdateSetResponse,
  CompleteWorkoutResponse
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
   * Generate a workout plan using the backend API
   */
  static async generateWorkoutPlan(
    profileData: any,
    userProfileId: number,
    userId: string
  ): Promise<TrainingServiceResponse<TrainingWorkoutPlan>> {
    try {
      const requestBody: GenerateWorkoutPlanRequest = mapProfileToBackendRequest(profileData, userId, userProfileId);

      // Get JWT token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_WORKOUT_PLAN}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TrainingService: API error:', response.status, response.statusText);
        console.error('❌ TrainingService: Error response:', errorText);
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`,
        };
      }

      const result: GenerateWorkoutPlanResponse = await response.json();

      if (result.status === 'success' && result.workout_plan) {
        // Create a workout plan object for the frontend
        const workoutPlan: TrainingWorkoutPlan = {
          id: Date.now().toString(),
          title: result.workout_plan.title || DEFAULT_VALUES.WORKOUT_PLAN.TITLE,
          description: result.workout_plan.summary || DEFAULT_VALUES.WORKOUT_PLAN.SUMMARY,
          totalWeeks: 1, // Default to 1 week for now
          currentWeek: 1,
          weeklySchedules: [], // Will be populated when the plan is saved to database
          createdAt: new Date(),
          updatedAt: new Date(),
          completed: false,
        };

        return {
          success: true,
          data: workoutPlan,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to generate workout plan',
        };
      }
    } catch (error) {
      console.error('💥 TrainingService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get workout plan for a user (with proper exercise data mapping)
   */
  static async getWorkoutPlan(userProfileId: number): Promise<TrainingServiceResponse<TrainingWorkoutPlan>> {
    try {
      // First, try to fetch using relational structure
      const { data, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();


      if (error) {
        console.error('❌ TrainingService: Relational query failed:', error);
        console.error('❌ TrainingService: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Fallback: Try the JSON approach (like the old WorkoutService)
        console.log('🔄 TrainingService: Falling back to JSON query...');
        const { data: jsonData, error: jsonError } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('user_profile_id', userProfileId)
          .single();

        if (jsonError) {
          console.error('❌ TrainingService: JSON query also failed:', jsonError);
          if (jsonError.code === 'PGRST116') {
            return {
              success: false,
              error: 'No workout plan found',
            };
          }
          return {
            success: false,
            error: `Failed to fetch workout plan: ${jsonError.message}`,
          };
        }

        if (!jsonData) {
          console.log('❌ TrainingService: No data returned from JSON query');
          return { success: false, error: 'No active workout plan found' };
        }

        console.log('✅ TrainingService: Successfully fetched workout plan data (JSON):', {
          id: jsonData.id,
          title: jsonData.title,
          user_profile_id: jsonData.user_profile_id,
          has_plan_data: !!jsonData.plan_data
        });

        // Transform JSON data to TrainingWorkoutPlan format
        const workoutPlan: TrainingWorkoutPlan = {
          id: jsonData.id.toString(),
          title: jsonData.title,
          description: jsonData.summary,
          totalWeeks: jsonData.total_weeks || 1,
          currentWeek: jsonData.current_week || 1,
          weeklySchedules: [], // Will be populated from plan_data if needed
          createdAt: new Date(jsonData.created_at),
          updatedAt: new Date(jsonData.updated_at),
          completed: jsonData.completed || false,
          completedAt: jsonData.completed_at ? new Date(jsonData.completed_at) : undefined
        };

        return {
          success: true,
          data: workoutPlan,
        };
      }

      if (!data) {
        console.log('❌ TrainingService: No data returned from query');
        return { success: false, error: 'No active workout plan found' };
      }

      console.log('✅ TrainingService: Successfully fetched workout plan data:', {
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
          has_daily_workouts: !!firstWeek.daily_workouts,
          daily_workouts_count: firstWeek.daily_workouts?.length || 0
        });

        if (firstWeek.daily_workouts && firstWeek.daily_workouts.length > 0) {
          const firstDay = firstWeek.daily_workouts[0];
          console.log('🏃 TrainingService: First day data:', {
            day_id: firstDay.id,
            day_of_week: firstDay.day_of_week,
            is_rest_day: firstDay.is_rest_day,
            has_workout_exercises: !!firstDay.workout_exercises,
            workout_exercises_count: firstDay.workout_exercises?.length || 0
          });

          if (firstDay.workout_exercises && firstDay.workout_exercises.length > 0) {
            const firstExercise = firstDay.workout_exercises[0];
            console.log('💪 TrainingService: First exercise data:', {
              workout_exercise_id: firstExercise.id,
              exercise_id: firstExercise.exercise_id,
              has_exercises_data: !!firstExercise.exercises,
              exercise_name: firstExercise.exercises?.name || 'NO NAME',
              exercise_data: firstExercise.exercises
            });
          }
        }
      }

      // Transform the data to match our TrainingWorkoutPlan interface
      
      const workoutPlan: TrainingWorkoutPlan = {
        id: data.id.toString(),
        title: data.title,
        description: data.summary,
        totalWeeks: data.weekly_schedules?.length || 1,
        currentWeek: data.current_week,
        weeklySchedules: data.weekly_schedules?.map((schedule: any) => {
          // Sort daily workouts by day order (Monday = 0, Tuesday = 1, etc.) - Monday-first week
          const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const sortedDailyWorkouts = schedule.daily_workouts?.sort((a: any, b: any) => {
            const aIndex = dayOrder.indexOf(a.day_of_week);
            const bIndex = dayOrder.indexOf(b.day_of_week);
            return aIndex - bIndex;
          }) || [];

          return {
            id: schedule.id.toString(),
            weekNumber: schedule.week_number,
            dailyWorkouts: sortedDailyWorkouts.map((daily: any) => ({
                id: daily.id.toString(),
                dayOfWeek: daily.day_of_week,
                isRestDay: daily.is_rest_day,
                exercises: daily.workout_exercises?.map((we: any) => {
                const mappedExercise = {
                  id: we.id.toString(),
                  exerciseId: we.exercise_id.toString(),
                  exercise: we.exercises ? {
                    id: we.exercises.id.toString(),
                    name: we.exercises.name,
                    force: we.exercises.force,
                    instructions: we.exercises.instructions,
                    equipment: we.exercises.equipment,
                    target_area: we.exercises.target_area,
                    secondary_muscles: we.exercises.secondary_muscles,
                    main_muscles: we.exercises.main_muscles,
                    difficulty: we.exercises.difficulty,
                    imageUrl: we.exercises.image_url,
                    videoUrl: we.exercises.video_url
                  } : null,
                  sets: this.parseSets(we.sets, we.reps, we.weight),
                  completed: we.completed,
                  order: we.order || 0
                };
                
                return mappedExercise;
              }) || [],
              completed: daily.workout_exercises?.every((ex: any) => ex.completed) || false
            })) || [],
            completed: schedule.daily_workouts?.every((daily: any) => 
              daily.workout_exercises?.every((ex: any) => ex.completed)
            ) || false,
            completedAt: schedule.completed_at ? new Date(schedule.completed_at) : undefined
          };
        }) || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        completed: data.completed || false,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined
      };

      return {
        success: true,
        data: workoutPlan,
      };
    } catch (error) {
      console.error('💥 TrainingService: Unexpected error fetching workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while fetching your workout plan',
      };
    }
  }

  /**
   * Delete a workout plan
   */
  static async deleteWorkoutPlan(workoutPlanId: number): Promise<TrainingServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', workoutPlanId);

      if (error) {
        console.error('❌ TrainingService: Error deleting workout plan:', error);
        return {
          success: false,
          error: `Failed to delete workout plan: ${error.message}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('💥 TrainingService: Unexpected error deleting workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while deleting your workout plan',
      };
    }
  }

  // ============================================================================
  // EXERCISE TRACKING & WORKOUT OPERATIONS
  // ============================================================================

  /**
   * Update set details (reps, weight) for a specific exercise
   */
  static async updateSetDetails(
    exerciseId: string, 
    setIndex: number, 
    reps: number, 
    weight: number
  ): Promise<UpdateSetResponse> {
    try {
      // First, get the current workout exercise data
      const { data: workoutExercise, error: fetchError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (fetchError) {
        console.error('Error fetching workout exercise:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // Update the reps and weight arrays
      const updatedReps = [...workoutExercise.reps];
      const updatedWeight = [...workoutExercise.weight];
      
      updatedReps[setIndex] = reps;
      updatedWeight[setIndex] = weight;

      // Update the database
      const { data, error } = await supabase
        .from('workout_exercises')
        .update({
          reps: updatedReps,
          weight: updatedWeight,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating set details:', error);
        return { success: false, error: error.message };
      }

      // Create the updated WorkoutSet object
      const updatedSet: WorkoutSet = {
        id: `${exerciseId}-${setIndex}`,
        reps: reps,
        weight: weight,
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
      const { data, error } = await supabase
        .from('workout_exercises')
        .update({
          completed: completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercise completion:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Exercise ${exerciseId} completion updated to: ${completed}`);
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
   * Complete a daily workout
   */
  static async completeDailyWorkout(
    dailyWorkoutId: string
  ): Promise<CompleteWorkoutResponse> {
    try {
      const { data, error } = await supabase
        .from('daily_workouts')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', dailyWorkoutId)
        .select()
        .single();

      if (error) {
        console.error('Error completing daily workout:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          workoutId: dailyWorkoutId
        }
      };
    } catch (error) {
      console.error('Error in completeDailyWorkout:', error);
      return { success: false, error: 'Failed to complete daily workout' };
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
        imageUrl: data.image_url,
        videoUrl: data.video_url
      };

      return { success: true, data: [exercise] };
    } catch (error) {
      console.error('Error in getExerciseDetails:', error);
      return { success: false, error: 'Failed to fetch exercise details' };
    }
  }

  /**
   * Get workout history for a user
   */
  static async getWorkoutHistory(userId: string, limit: number = 10): Promise<{ success: boolean; data?: DailyWorkout[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('daily_workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercises (*)
          )
        `)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching workout history:', error);
        return { success: false, error: error.message };
      }

      const history: DailyWorkout[] = data.map((daily: any) => ({
        id: daily.id.toString(),
        dayOfWeek: daily.day_of_week,
        isRestDay: daily.is_rest_day,
        exercises: daily.workout_exercises.map((we: any) => ({
          id: we.id.toString(),
          exerciseId: we.exercise_id.toString(),
          exercise: {
            id: we.exercises.id.toString(),
            name: we.exercises.name,
            force: we.exercises.force,
            instructions: we.exercises.instructions,
            equipment: we.exercises.equipment,
            target_area: we.exercises.target_area,
            secondary_muscles: we.exercises.secondary_muscles,
            main_muscles: we.exercises.main_muscles,
            difficulty: we.exercises.difficulty,
            imageUrl: we.exercises.image_url,
            videoUrl: we.exercises.video_url
          },
          sets: this.parseSets(we.sets, we.reps, we.weight),
          completed: we.completed,
          order: we.order || 0
        })),

      }));

      return { success: true, data: history };
    } catch (error) {
      console.error('Error in getWorkoutHistory:', error);
      return { success: false, error: 'Failed to fetch workout history' };
    }
  }

  // ============================================================================
  // HOME SCREEN DATA METHODS
  // ============================================================================

  /**
   * Get workout streak (consecutive days with completed workouts)
   */
  static async getWorkoutStreak(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get workout plan with relational data
      const { data: workoutPlan, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !workoutPlan) {
        return { success: true, data: 0 };
      }

      // Calculate streak from relational data across all weeks
      let streak = 0;
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      if (!workoutPlan.weekly_schedules || workoutPlan.weekly_schedules.length === 0) {
        console.log('❌ getWorkoutStreak - No weekly schedules found');
        return { success: true, data: 0 };
      }

      // Get all daily workouts from all weeks, sorted by week number and day order
      const allWorkouts: any[] = [];
      
      workoutPlan.weekly_schedules
        .sort((a: any, b: any) => b.week_number - a.week_number) // Most recent week first
        .forEach((week: any) => {
          if (week.daily_workouts) {
            // Sort daily workouts by day order (most recent first within each week)
            const sortedDailyWorkouts = week.daily_workouts.sort((a: any, b: any) => {
              const aIndex = dayOrder.indexOf(a.day_of_week);
              const bIndex = dayOrder.indexOf(b.day_of_week);
              return bIndex - aIndex;
            });
            
            allWorkouts.push(...sortedDailyWorkouts);
          }
        });

      // Calculate streak by going through all workouts chronologically
      for (const workout of allWorkouts) {
        if (workout.is_rest_day) continue; // Skip rest days
        
        // Check if all exercises in this workout are completed
        const allExercisesCompleted = workout.workout_exercises?.every((ex: any) => ex.completed);
        
        if (allExercisesCompleted) {
          streak++;
        } else {
          break; // Streak broken - stop counting
        }
      }

      return { success: true, data: streak };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating streak:', error);
      return { success: false, error: 'Failed to calculate workout streak' };
    }
  }

  /**
   * Get weekly workout count (total planned workouts in current week)
   */
  static async getWeeklyWorkoutCount(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get workout plan with relational data
      const { data: workoutPlan, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !workoutPlan) {
        return { success: true, data: 0 };
      }

      // Get current week's schedule
      const targetWeek = workoutPlan.current_week || 1;
      const currentWeek = workoutPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_workouts) {
        return { success: true, data: 0 };
      }

      // Count all planned workouts in current week (non-rest days)
      const totalWorkouts = currentWeek.daily_workouts.filter((workout: any) => !workout.is_rest_day).length;
      return { success: true, data: totalWorkouts };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating weekly workouts:', error);
      return { success: false, error: 'Failed to calculate weekly workout count' };
    }
  }

  /**
   * Get goal progress (percentage of completed workouts)
   */
  static async getGoalProgress(userProfileId: number): Promise<TrainingServiceResponse<number>> {
    try {
      // Get workout plan with relational data
      const { data: workoutPlan, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !workoutPlan) {
        return { success: true, data: 0 };
      }

      // Get current week's schedule
      const targetWeek = workoutPlan.current_week || 1;
      const currentWeek = workoutPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_workouts) {
        return { success: true, data: 0 };
      }

      const totalWorkoutDays = currentWeek.daily_workouts.filter((workout: any) => !workout.is_rest_day).length;
      const completedWorkoutDays = currentWeek.daily_workouts.filter((workout: any) => {
        if (workout.is_rest_day) return false;
        return workout.workout_exercises?.every((ex: any) => ex.completed);
      }).length;

      const progress = totalWorkoutDays > 0 ? Math.round((completedWorkoutDays / totalWorkoutDays) * 100) : 0;
      return { success: true, data: progress };
    } catch (error) {
      console.error('💥 TrainingService: Error calculating goal progress:', error);
      return { success: false, error: 'Failed to calculate goal progress' };
    }
  }

  /**
   * Get today's workout with exercises
   */
  static async getTodaysWorkout(userProfileId: number): Promise<TrainingServiceResponse<any>> {
    try {
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const todayName = dayNames[today.getDay()];

      // Get workout plan with relational data
      const { data: workoutPlan, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !workoutPlan) {
        console.log('❌ getTodaysWorkout - No workout plan found:', error);
        return { success: true, data: null };
      }

      // Get current week's schedule - fallback to first week if current_week is undefined
      const targetWeek = workoutPlan.current_week || 1;
      
      const currentWeek = workoutPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_workouts) {
        console.log('❌ getTodaysWorkout - No current week or daily workouts found');
        return { success: true, data: null };
      }

      // Find today's workout
      const todaysWorkout = currentWeek.daily_workouts.find((workout: any) => 
        workout.day_of_week === todayName
      );

      if (!todaysWorkout) {
        return { success: true, data: null };
      }

      // Transform the data to match component expectations
      const transformedWorkout = {
        id: todaysWorkout.id || todayName,
        name: `${todayName} Workout`,
        isRestDay: todaysWorkout.is_rest_day,
        exercises: todaysWorkout.workout_exercises?.map((workoutExercise: any) => ({
          id: workoutExercise.id?.toString() || Math.random().toString(),
          name: workoutExercise.exercises?.name || 'Unknown Exercise',
          completed: workoutExercise.completed || false,
          sets: workoutExercise.sets || 1,
          reps: workoutExercise.reps || [10],
          weight: workoutExercise.weight || [null],
          weight1rm: workoutExercise.weight_1rm || [70],
        })) || [],
      };

      return { success: true, data: transformedWorkout };
    } catch (error) {
      console.error('💥 TrainingService: Error fetching today\'s workout:', error);
      return { success: false, error: 'Failed to fetch today\'s workout' };
    }
  }

  /**
   * Get recent completed workouts (last 3)
   */
  static async getRecentActivity(userProfileId: number): Promise<TrainingServiceResponse<any[]>> {
    try {
      // Get workout plan with relational data
      const { data: workoutPlan, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          weekly_schedules (
            *,
            daily_workouts (
              *,
              workout_exercises (
                *,
                exercises (*)
              )
            )
          )
        `)
        .eq('user_profile_id', userProfileId)
        .single();

      if (error || !workoutPlan) {
        return { success: true, data: [] };
      }

      // Get current week's schedule
      const targetWeek = workoutPlan.current_week || 1;
      const currentWeek = workoutPlan.weekly_schedules?.find((week: any) => 
        week.week_number === targetWeek
      );
      
      if (!currentWeek?.daily_workouts) {
        return { success: true, data: [] };
      }

      // Filter and transform completed workouts (only where ALL exercises are completed)
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const recentActivities = currentWeek.daily_workouts
        .filter((workout: any) => {
          // Only get workout days, not rest days
          if (workout.is_rest_day) return false;
          
          // Check if all exercises in this workout are completed
          return workout.workout_exercises?.every((ex: any) => ex.completed);
        })
        .sort((a: any, b: any) => {
          // Sort by day order (most recent first)
          const aIndex = dayOrder.indexOf(a.day_of_week);
          const bIndex = dayOrder.indexOf(b.day_of_week);
          return bIndex - aIndex;
        })
        .slice(0, 3) // Take only last 3 completed workouts
        .map((workout: any, index: number) => ({
          id: workout.id?.toString() || workout.day_of_week,
          type: 'workout' as const,
          title: `${workout.day_of_week} Workout`,
          subtitle: `${workout.workout_exercises?.length || 0} exercises • 45 minutes • 320 calories`, // Dummy data as requested
          date: index === 0 ? 'Yesterday' : index === 1 ? '2 days ago' : '3 days ago',
          duration: '45 min',
          calories: 320,
        }));

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
  private static parseSets(setsCount: number, reps: number[], weight: number[]): WorkoutSet[] {
    const sets: WorkoutSet[] = [];
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
   * Calculate 1RM using Epley formula
   */
  static calculateOneRM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    
    // Epley formula: 1RM = weight * (1 + reps/30)
    return Math.round(weight * (1 + reps / 30));
  }

  /**
   * Calculate workout progress percentage
   */
  static calculateWorkoutProgress(exercises: WorkoutExercise[]): number {
    if (exercises.length === 0) return 0;
    
    const completedExercises = exercises.filter(ex => ex.completed).length;
    return Math.round((completedExercises / exercises.length) * 100);
  }

  /**
   * Calculate weekly progress
   */
  static calculateWeeklyProgress(dailyWorkouts: DailyWorkout[]): number {
    if (dailyWorkouts.length === 0) return 0;
    
    const completedWorkouts = dailyWorkouts.filter(workout => workout.completed).length;
    return Math.round((completedWorkouts / dailyWorkouts.length) * 100);
  }
}
