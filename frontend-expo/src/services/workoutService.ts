import { supabase } from '../config/supabase';
import { UserProfile, WorkoutPlan } from '../types';

// Backend API configuration
const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface WorkoutServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}



export class WorkoutService {
  /**
   * Generate a workout plan for a user based on their profile
   */
  static async generateWorkoutPlan(userProfile: UserProfile): Promise<WorkoutServiceResponse<WorkoutPlan>> {
    try {
      console.log('WorkoutService: Generating workout plan for user:', userProfile.userId);

      // Call the backend API to generate the workout plan
      const backendResponse = await this.callBackendAPI(userProfile);
      
      if (!backendResponse.success || !backendResponse.data) {
        return {
          success: false,
          error: backendResponse.error || 'Failed to generate workout plan from backend',
        };
      }

      // Create the workout plan record in Supabase
      const { data: workoutPlanData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_profile_id: userProfile.id!,
          title: backendResponse.data.title,
          summary: backendResponse.data.summary,
        })
        .select()
        .single();

      if (planError) {
        console.error('WorkoutService: Error creating workout plan in database:', planError);
        return {
          success: false,
          error: `Failed to save workout plan: ${planError.message}`,
        };
      }

      console.log('WorkoutService: Created workout plan in database:', workoutPlanData);

      // Store the detailed workout plan data (you might want to create additional tables for this)
      // For now, we'll just return the basic workout plan record
      return {
        success: true,
        data: {
          id: workoutPlanData.id,
          userProfileId: workoutPlanData.user_profile_id,
          title: workoutPlanData.title,
          summary: workoutPlanData.summary,
          createdAt: new Date(workoutPlanData.created_at),
          updatedAt: new Date(workoutPlanData.updated_at),
        },
      };
    } catch (error) {
      console.error('WorkoutService: Unexpected error generating workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while generating your workout plan',
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
          // No workout plan found
          return {
            success: false,
            error: 'No workout plan found',
          };
        }
        console.error('WorkoutService: Error fetching workout plan:', error);
        return {
          success: false,
          error: `Failed to fetch workout plan: ${error.message}`,
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          userProfileId: data.user_profile_id,
          title: data.title,
          summary: data.summary,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        },
      };
    } catch (error) {
      console.error('WorkoutService: Unexpected error fetching workout plan:', error);
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
        console.error('WorkoutService: Error deleting workout plan:', error);
        return {
          success: false,
          error: `Failed to delete workout plan: ${error.message}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('WorkoutService: Unexpected error deleting workout plan:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while deleting your workout plan',
      };
    }
  }

  /**
   * Call the backend API to generate a workout plan
   */
  private static async callBackendAPI(userProfile: UserProfile): Promise<WorkoutServiceResponse<{ title: string; summary: string; workout_plan: any }>> {
    try {
      console.log('WorkoutService: Calling backend API for workout plan generation');
      
      const requestBody = {
        primaryGoal: userProfile.primaryGoal,
        primaryGoalDescription: userProfile.primaryGoalDescription,
        experienceLevel: userProfile.experienceLevel,
        daysPerWeek: userProfile.daysPerWeek,
        minutesPerSession: userProfile.minutesPerSession,
        equipment: userProfile.equipment,
        age: userProfile.age,
        weight: userProfile.weight,
        weightUnit: userProfile.weightUnit,
        height: userProfile.height,
        heightUnit: userProfile.heightUnit,
        gender: userProfile.gender,
        hasLimitations: userProfile.hasLimitations,
        limitationsDescription: userProfile.limitationsDescription,
        finalChatNotes: userProfile.finalChatNotes,
      };

      const response = await fetch(`${BACKEND_API_URL}/api/workoutplan/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        console.error('WorkoutService: Backend API error:', errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();
      console.log('WorkoutService: Backend API response received');

      return {
        success: true,
        data: {
          title: data.workout_plan.title || this.generatePlanTitle(userProfile),
          summary: data.workout_plan.summary || this.generatePlanSummary(userProfile),
          workout_plan: data.workout_plan,
        },
      };
    } catch (error) {
      console.error('WorkoutService: Error calling backend API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to workout generation service',
      };
    }
  }

  /**
   * Generate a personalized plan title based on user profile
   */
  private static generatePlanTitle(userProfile: UserProfile): string {
    const goal = userProfile.primaryGoal.toLowerCase();
    const level = userProfile.experienceLevel.toLowerCase();
    
    if (goal.includes('strength')) {
      return `${userProfile.experienceLevel} Strength Training Program`;
    } else if (goal.includes('weight')) {
      return `${userProfile.experienceLevel} Weight Loss Program`;
    } else if (goal.includes('muscle')) {
      return `${userProfile.experienceLevel} Muscle Building Program`;
    } else if (goal.includes('endurance')) {
      return `${userProfile.experienceLevel} Endurance Training Program`;
    } else {
      return `${userProfile.experienceLevel} Fitness Program`;
    }
  }

  /**
   * Generate a personalized plan summary based on user profile
   */
  private static generatePlanSummary(userProfile: UserProfile): string {
    return `A ${userProfile.experienceLevel.toLowerCase()} ${userProfile.daysPerWeek}-day program designed to help you ${userProfile.primaryGoal.toLowerCase()}. Each workout is approximately ${userProfile.minutesPerSession} minutes and uses ${userProfile.equipment.toLowerCase()} equipment.`;
  }


}
