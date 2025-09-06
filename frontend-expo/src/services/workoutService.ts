import { supabase } from '../config/supabase';
import { UserProfile, WorkoutPlan } from '../types';
import { API_CONFIG, ERROR_MESSAGES, DEFAULT_VALUES } from '../constants/api';
import { mapProfileToBackendRequest } from '../utils/profileDataMapping';
import { 
  GenerateWorkoutPlanRequest, 
  GenerateWorkoutPlanResponse,
  ApiResponse 
} from '../types/api';

export interface WorkoutServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class WorkoutService {
  /**
   * Generate a workout plan using the backend API
   */
  static async generateWorkoutPlan(
    profileData: any,
    userProfileId: number,
    userId: string
  ): Promise<WorkoutServiceResponse<WorkoutPlan>> {
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
        console.error('❌ WorkoutService: API error:', response.status, response.statusText);
        console.error('❌ WorkoutService: Error response:', errorText);
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`,
        };
      }

      const result: GenerateWorkoutPlanResponse = await response.json();

      if (result.status === 'success' && result.workout_plan) {
        // Create a workout plan object for the frontend
        const workoutPlan: WorkoutPlan = {
          id: Date.now(),
          userProfileId: userProfileId,
          title: result.workout_plan.title || DEFAULT_VALUES.WORKOUT_PLAN.TITLE,
          summary: result.workout_plan.summary || DEFAULT_VALUES.WORKOUT_PLAN.SUMMARY,
          createdAt: new Date(),
          updatedAt: new Date(),
          planData: result.workout_plan,
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
      console.error('💥 WorkoutService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get workout plan for a user
   */
  static async getWorkoutPlan(userProfileId: number): Promise<WorkoutServiceResponse<WorkoutPlan>> {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_profile_id', userProfileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'No workout plan found',
          };
        }
        console.error('❌ WorkoutService: Error fetching workout plan:', error);
        return {
          success: false,
          error: `Failed to fetch workout plan: ${error.message}`,
        };
      }

      const workoutPlan: WorkoutPlan = {
        id: data.id,
        userProfileId: data.user_profile_id,
        title: data.title,
        summary: data.summary,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return {
        success: true,
        data: workoutPlan,
      };
    } catch (error) {
      console.error('💥 WorkoutService: Unexpected error fetching workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while fetching your workout plan',
      };
    }
  }

  /**
   * Delete a workout plan
   */
  static async deleteWorkoutPlan(workoutPlanId: number): Promise<WorkoutServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', workoutPlanId);

      if (error) {
        console.error('❌ WorkoutService: Error deleting workout plan:', error);
        return {
          success: false,
          error: `Failed to delete workout plan: ${error.message}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('💥 WorkoutService: Unexpected error deleting workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while deleting your workout plan',
      };
    }
  }
}