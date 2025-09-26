import { supabase } from '@/src/config/supabase';
import { UserProfile } from '@/src/types';
import { DEFAULT_VALUES } from '../constants/api';
import { mapOnboardingToDatabase } from '../utils/profileDataMapping';

export interface UserServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}



export class UserService {
  /**
   * Create a new user profile
   */
  static async createUserProfile(
    userId: string,
    profileData: any
  ): Promise<UserServiceResponse<{ id: number }>> {
    try {

      const profileDataToInsert = mapOnboardingToDatabase(userId, profileData);

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileDataToInsert])
        .select();

      if (error) {
        return {
          success: false,
          error: `Failed to create user profile: ${error.message}`,
        };
      }

      if (data && data.length > 0) {
        return {
          success: true,
          data: { id: data[0].id },
        };
      } else {
        return {
          success: false,
          error: 'No data returned from profile creation',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  static async getUserProfile(userId: string): Promise<UserServiceResponse<UserProfile>> {
    try {
      // Use the existing Supabase client with proper query
      const { data: user_profiles, error, status } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        // If it's an "Invalid API key" error, it might be due to RLS policies
        // In this case, treat it as "no profile found" since the user is authenticated
        if (error.message.includes('Invalid API key') || error.message.includes('permission denied')) {
          return {
            success: true,
            data: undefined,
          };
        }
        
        return {
          success: false,
          error: error.message,
        };
      }

      // Check if we got any profiles
      if (user_profiles && user_profiles.length > 0) {
        const rawProfile = user_profiles[0];
        
        // Map database fields (snake_case) to frontend interface (camelCase)
        const mappedProfile: UserProfile = {
          id: rawProfile.id,
          userId: rawProfile.user_id,
          username: rawProfile.username || '',
          primaryGoal: rawProfile.primary_goal || '',
          primaryGoalDescription: rawProfile.primary_goal_description || '',
          coachId: rawProfile.coach_id,
          experienceLevel: rawProfile.experience_level || '',
          daysPerWeek: rawProfile.days_per_week || 3,
          minutesPerSession: rawProfile.minutes_per_session || 45,
          equipment: rawProfile.equipment || '',
          age: rawProfile.age || 25,
          weight: rawProfile.weight || 70,
          weightUnit: rawProfile.weight_unit || 'kg',
          height: rawProfile.height || 170,
          heightUnit: rawProfile.height_unit || 'cm',
          gender: rawProfile.gender || '',
          hasLimitations: rawProfile.has_limitations || false,
          limitationsDescription: rawProfile.limitations_description || '',
          finalChatNotes: rawProfile.final_chat_notes || '',
          createdAt: rawProfile.created_at ? new Date(rawProfile.created_at) : undefined,
          updatedAt: rawProfile.updated_at ? new Date(rawProfile.updated_at) : undefined,
        };
        
        return {
          success: true,
          data: mappedProfile,
        };
      } else {
        return {
          success: true,
          data: undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }


  static async updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserServiceResponse<UserProfile>> {
    try {
      const updateData: any = {};
      
      // Map camelCase to snake_case for database
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.primaryGoal !== undefined) updateData.primary_goal = updates.primaryGoal;
      if (updates.primaryGoalDescription !== undefined) updateData.primary_goal_description = updates.primaryGoalDescription;
      if (updates.coachId !== undefined) updateData.coach_id = updates.coachId;
      if (updates.experienceLevel !== undefined) updateData.experience_level = updates.experienceLevel;
      if (updates.daysPerWeek !== undefined) updateData.days_per_week = updates.daysPerWeek;
      if (updates.minutesPerSession !== undefined) updateData.minutes_per_session = updates.minutesPerSession;
      if (updates.equipment !== undefined) updateData.equipment = updates.equipment;
      if (updates.age !== undefined) updateData.age = updates.age;
      if (updates.weight !== undefined) updateData.weight = updates.weight;
      if (updates.weightUnit !== undefined) updateData.weight_unit = updates.weightUnit;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.heightUnit !== undefined) updateData.height_unit = updates.heightUnit;
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.hasLimitations !== undefined) updateData.has_limitations = updates.hasLimitations;
      if (updates.limitationsDescription !== undefined) updateData.limitations_description = updates.limitationsDescription;
      if (updates.finalChatNotes !== undefined) updateData.final_chat_notes = updates.finalChatNotes;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Map the response back to camelCase
      const mappedProfile: UserProfile = {
        id: data.id,
        userId: data.user_id,
        username: data.username || '',
        primaryGoal: data.primary_goal || '',
        primaryGoalDescription: data.primary_goal_description || '',
        coachId: data.coach_id,
        experienceLevel: data.experience_level || '',
        daysPerWeek: data.days_per_week || 3,
        minutesPerSession: data.minutes_per_session || 45,
        equipment: data.equipment || '',
        age: data.age || 25,
        weight: data.weight || 70,
        weightUnit: data.weight_unit || 'kg',
        height: data.height || 170,
        heightUnit: data.height_unit || 'cm',
        gender: data.gender || '',
        hasLimitations: data.has_limitations || false,
        limitationsDescription: data.limitations_description || '',
        finalChatNotes: data.final_chat_notes || '',
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      };

      return {
        success: true,
        data: mappedProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }
}