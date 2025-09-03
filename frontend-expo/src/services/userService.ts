import { supabase } from '@/src/config/supabase';
import { UserProfile } from '@/src/types';

export interface UserServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class UserService {
  /**
   * Get user profile by user ID
   */
  static async getUserProfile(userId: string): Promise<UserServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Create user profile
   */
  static async createUserProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: profile.userId || '',
          username: profile.username,
          primary_goal: profile.primaryGoal,
          primary_goal_description: profile.primaryGoalDescription,
          coach_id: profile.coachId,
          experience_level: profile.experienceLevel,
          days_per_week: profile.daysPerWeek,
          minutes_per_session: profile.minutesPerSession,
          equipment: profile.equipment,
          age: profile.age,
          weight: profile.weight,
          weight_unit: profile.weightUnit,
          height: profile.height,
          height_unit: profile.heightUnit,
          gender: profile.gender,
          has_limitations: profile.hasLimitations,
          limitations_description: profile.limitationsDescription,
          final_chat_notes: profile.finalChatNotes,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      console.error('Create user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update user profile
   */
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

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Delete user profile
   */
  static async deleteUserProfile(userId: string): Promise<UserServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Delete user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Check if user profile exists
   */
  static async hasUserProfile(userId: string): Promise<UserServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no profile found, that's not an error - just return false
        if (error.code === 'PGRST116') {
          return {
            success: true,
            data: false,
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: !!data,
      };
    } catch (error) {
      console.error('Check user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get user profile by profile ID
   */
  static async getUserProfileById(profileId: number): Promise<UserServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      console.error('Get user profile by ID error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get all user profiles (admin function)
   */
  static async getAllUserProfiles(): Promise<UserServiceResponse<UserProfile[]>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile[],
      };
    } catch (error) {
      console.error('Get all user profiles error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }
}
