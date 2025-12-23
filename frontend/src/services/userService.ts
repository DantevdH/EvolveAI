import { supabase } from '@/src/config/supabase';
import { UserProfile } from '@/src/types';
import { AIQuestion } from '@/src/types/onboarding';
import { DEFAULT_VALUES } from '../constants/api';
import { mapOnboardingToDatabase } from '../utils/profileDataMapping';
import { logger } from '../utils/logger';

export interface UserServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Extracts AI message from database format
 */
const extractAIMessage = (questionsData: any): string | null => {
  if (!questionsData) {
    return null;
  }
  
  // Handle new format: object with AImessage or ai_message
  if (typeof questionsData === 'object' && !Array.isArray(questionsData)) {
    const aiMessage = questionsData.AImessage || questionsData.ai_message || null;
    return aiMessage;
  }
  
  return null;
};

/**
 * Converts dictionary objects to AIQuestion objects
 */
const convertToAIQuestions = (questionsData: any): AIQuestion[] | null => {
  // Handle both old format (array) and new format (object with questions array)
  let questions: any[] | null = null;
  
  if (Array.isArray(questionsData)) {
    // Old format: direct array
    questions = questionsData;
  } else if (questionsData && questionsData.questions && Array.isArray(questionsData.questions)) {
    // New format: object with questions array
    questions = questionsData.questions;
  } else {
    return null;
  }
  
  if (!questions) {
    return null;
  }
  
  // Map questions and include order field
  const mappedQuestions = questions.map(question => ({
    id: question.id || '',
    text: question.text || '',
    response_type: question.response_type || 'free_text',
    options: question.options || null,
    multiselect: question.multiselect ?? null, // Include multiselect for multiple_choice/dropdown
    category: question.category || '',
    required: question.required || false,
    help_text: question.help_text || '',
    placeholder: question.placeholder || null,
    min_value: question.min_value || null,
    max_value: question.max_value || null,
    min_length: question.min_length || null,
    max_length: question.max_length || null,
    step: question.step || 1,
    unit: question.unit || null,
    min_description: question.min_description || null,
    max_description: question.max_description || null,
    order: question.order || null, // Include order field for sorting
  }));
  
  // Sort questions by order field (1-based, lower numbers appear first)
  // Questions without order field will be placed at the end
  return mappedQuestions.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });
};



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
        logger.data('Create user profile', 'error', { error: error.message });
        return {
          success: false,
          error: `Failed to create user profile: ${error.message}`,
        };
      }

      if (data && data.length > 0) {
        logger.data('Create user profile', 'success', { profileId: data[0].id });
        return {
          success: true,
          data: { id: data[0].id },
        };
      } else {
        logger.data('Create user profile', 'error', { reason: 'No data returned' });
        return {
          success: false,
          error: 'No data returned from profile creation',
        };
      }
    } catch (error) {
      logger.error('Error creating user profile', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update user profile at different onboarding stages
   */
  static async updateUserProfileStage(
    userId: string,
    stage: 'personal_info' | 'initial_questions',
    data: any
  ): Promise<UserServiceResponse<UserProfile>> {
    try {
      let updateData: any = {};

      if (stage === 'personal_info') {
        updateData = {
          username: data.username,
          age: data.age,
          weight: data.weight,
          height: data.height,
          weight_unit: data.weight_unit,
          height_unit: data.height_unit,
          measurement_system: data.measurement_system,
          gender: data.gender,
          goal_description: data.goal_description,
        };
        // Include permissions_granted if provided
        if (data.permissions_granted !== undefined) {
          updateData.permissions_granted = data.permissions_granted;
        }
      } else if (stage === 'initial_questions') {
        updateData = {
          initial_questions: data.initial_questions,
        };
      }

      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      if (error) {
        logger.data(`Update user profile (${stage})`, 'error', { error: error.message });
        return {
          success: false,
          error: `Failed to update user profile for ${stage} stage: ${error.message}`,
        };
      }

      if (updatedProfile && updatedProfile.length > 0) {
        logger.data(`Update user profile (${stage})`, 'success', { profileId: updatedProfile[0].id });
        return {
          success: true,
          data: updatedProfile[0],
        };
      } else {
        logger.data(`Update user profile (${stage})`, 'error', { reason: 'No data returned' });
        return {
          success: false,
          error: `No data returned from profile update for ${stage} stage`,
        };
      }
    } catch (error) {
      logger.error(`Error updating user profile for ${stage} stage`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  static async getUserProfile(userId: string): Promise<UserServiceResponse<UserProfile>> {
    try {
      if (!supabase || !supabase.auth) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { data: user_profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        // If it's an "Invalid API key" error, it might be due to RLS policies
        // In this case, treat it as "no profile found" since the user is authenticated
        if (error.message?.includes('Invalid API key') || error.message?.includes('permission denied')) {
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
        
        // Load playbook from lessons table
        let playbook = null;
        try {
          const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .eq('user_profile_id', rawProfile.id)
            .order('created_at', { ascending: true });

          if (lessonsError) {
            console.warn('Failed to load lessons:', lessonsError);
          } else if (lessons && lessons.length > 0) {
            // Convert database lessons to PlaybookLesson format
            const playbookLessons = lessons.map((lesson: any) => ({
              id: lesson.lesson_id,
              text: lesson.text,
              tags: lesson.tags || [],
              helpful_count: lesson.helpful_count || 0,
              harmful_count: lesson.harmful_count || 0,
              times_applied: lesson.times_applied || 0,
              confidence: lesson.confidence || 0.5,
              positive: lesson.positive !== undefined ? lesson.positive : true,
              created_at: lesson.created_at,
              last_used_at: lesson.last_used_at,
              source_plan_id: lesson.source_plan_id,
              requires_context: lesson.requires_context || false,
              context: lesson.context,
            }));

            // Get last_updated from most recent lesson's updated_at
            const sortedLessons = [...lessons].sort((a: any, b: any) => {
              const aTime = a.updated_at || a.created_at || '';
              const bTime = b.updated_at || b.created_at || '';
              return bTime.localeCompare(aTime);
            });
            const last_updated = sortedLessons[0]?.updated_at || sortedLessons[0]?.created_at || new Date().toISOString();

            playbook = {
              user_id: String(rawProfile.id),
              lessons: playbookLessons,
              total_lessons: playbookLessons.length,
              last_updated: last_updated,
            };
          }
        } catch (error) {
          console.warn('Error loading playbook from lessons table:', error);
          // Continue without playbook if loading fails
        }
        
        // Map database fields (snake_case) to frontend interface (camelCase)
        const mappedProfile: UserProfile = {
          id: rawProfile.id,
          userId: rawProfile.user_id,
          username: rawProfile.username || '',
          coachId: rawProfile.coach_id,
          experienceLevel: rawProfile.experience_level || '',
          goalDescription: rawProfile.goal_description || '',
          age: rawProfile.age || 25,
          weight: rawProfile.weight || 70,
          weightUnit: rawProfile.weight_unit || 'kg',
          height: rawProfile.height || 170,
          heightUnit: rawProfile.height_unit || 'cm',
          gender: rawProfile.gender || '',
          // Raw questions and responses (for consistency)
          initial_questions: convertToAIQuestions(rawProfile.initial_questions),
          initial_responses: rawProfile.initial_responses || null,
          // Onboarding completion flag
          information_complete: rawProfile.information_complete === true,
          
          // AI messages from database
          initial_ai_message: extractAIMessage(rawProfile.initial_questions),
          outline_ai_message: rawProfile.plan_outline?.ai_message || null,
          // Plan outline and feedback (separated)
          plan_outline: rawProfile.plan_outline || null,
          plan_outline_feedback: rawProfile.plan_outline_feedback || null,
          // User playbook
          playbook: playbook,
          planAccepted: rawProfile.plan_accepted || false,
          // Permissions status
          permissions_granted: rawProfile.permissions_granted || null,
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
      if (updates.goalDescription !== undefined) updateData.goal_description = updates.goalDescription;
      if (updates.coachId !== undefined) updateData.coach_id = updates.coachId;
      if (updates.experienceLevel !== undefined) updateData.experience_level = updates.experienceLevel;
      if (updates.age !== undefined) updateData.age = updates.age;
      if (updates.weight !== undefined) updateData.weight = updates.weight;
      if (updates.weightUnit !== undefined) updateData.weight_unit = updates.weightUnit;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.heightUnit !== undefined) updateData.height_unit = updates.heightUnit;
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.information_complete !== undefined) updateData.information_complete = updates.information_complete;
      if (updates.planAccepted !== undefined) updateData.plan_accepted = updates.planAccepted;
      if (updates.permissions_granted !== undefined) updateData.permissions_granted = updates.permissions_granted;

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
        goalDescription: data.goal_description || '',
        coachId: data.coach_id,
        experienceLevel: data.experience_level || '',
        age: data.age || 25,
        weight: data.weight || 70,
        weightUnit: data.weight_unit || 'kg',
        height: data.height || 170,
        heightUnit: data.height_unit || 'cm',
        gender: data.gender || '',
        planAccepted: data.plan_accepted || false,
        permissions_granted: data.permissions_granted || null,
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