import { supabase } from '@/src/config/supabase';
import { UserProfile } from '@/src/types';
import { AIQuestion } from '@/src/types/onboarding';
import { DEFAULT_VALUES } from '../constants/api';
import { mapOnboardingToDatabase } from '../utils/profileDataMapping';

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
    console.log('📍 extractAIMessage: questionsData is null/undefined');
    return null;
  }
  
  // Handle new format: object with AImessage or ai_message
  if (typeof questionsData === 'object' && !Array.isArray(questionsData)) {
    const aiMessage = questionsData.AImessage || questionsData.ai_message || null;
    console.log(`📍 extractAIMessage: Found AI message: ${aiMessage?.substring(0, 50) || 'NONE'}`);
    return aiMessage;
  }
  
  console.log('📍 extractAIMessage: questionsData is not an object or is an array');
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
  
  return questions.map(question => ({
    id: question.id || '',
    text: question.text || '',
    response_type: question.response_type || 'free_text',
    options: question.options || null,
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
  }));
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
        console.error('❌ FRONTEND: Failed to create user profile:', error.message);
        return {
          success: false,
          error: `Failed to create user profile: ${error.message}`,
        };
      }

      if (data && data.length > 0) {
        console.log(`✅ FRONTEND: User profile created successfully (ID: ${data[0].id})`);
        return {
          success: true,
          data: { id: data[0].id },
        };
      } else {
        console.error('❌ FRONTEND: No data returned from profile creation');
        return {
          success: false,
          error: 'No data returned from profile creation',
        };
      }
    } catch (error) {
      console.error('❌ FRONTEND: Error creating user profile:', error);
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
    stage: 'personal_info' | 'initial_questions' | 'follow_up_questions',
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
      } else if (stage === 'initial_questions') {
        updateData = {
          initial_questions: data.initial_questions,
        };
      } else if (stage === 'follow_up_questions') {
        updateData = {
          follow_up_questions: data.follow_up_questions,
        };
      }

      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error(`❌ FRONTEND: Failed to update user profile for ${stage} stage:`, error.message);
        return {
          success: false,
          error: `Failed to update user profile for ${stage} stage: ${error.message}`,
        };
      }

      if (updatedProfile && updatedProfile.length > 0) {
        console.log(`✅ FRONTEND: User profile updated successfully for ${stage} stage (ID: ${updatedProfile[0].id})`);
        return {
          success: true,
          data: updatedProfile[0],
        };
      } else {
        console.error(`❌ FRONTEND: No data returned from profile update for ${stage} stage`);
        return {
          success: false,
          error: `No data returned from profile update for ${stage} stage`,
        };
      }
    } catch (error) {
      console.error(`❌ FRONTEND: Error updating user profile for ${stage} stage:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  static async getUserProfile(userId: string): Promise<UserServiceResponse<UserProfile>> {
    try {
      console.log('🔍 userService: Fetching user profile for user_id:', userId);
      
      // Use the existing Supabase client with proper query
      const { data: user_profiles, error, status } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);



      if (error) {
        console.error('❌ userService: Error fetching profile:', error);
        
        // If it's an "Invalid API key" error, it might be due to RLS policies
        // In this case, treat it as "no profile found" since the user is authenticated
        if (error.message.includes('Invalid API key') || error.message.includes('permission denied')) {
          console.warn('⚠️ userService: Permission error - returning undefined (may indicate RLS issue)');
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
        console.log('✅ userService: Found profile, ID:', user_profiles[0].id);
        const rawProfile = user_profiles[0];
        
        // Parse playbook if it exists
        let playbook = null;
        if (rawProfile.user_playbook) {
          try {
            const playbookData = typeof rawProfile.user_playbook === 'string' 
              ? JSON.parse(rawProfile.user_playbook) 
              : rawProfile.user_playbook;
            playbook = {
              user_id: playbookData.user_id || String(rawProfile.id),
              lessons: playbookData.lessons || [],
              total_lessons: playbookData.total_lessons || (playbookData.lessons?.length || 0),
              last_updated: playbookData.last_updated || playbookData.lastUpdated || new Date().toISOString(),
            };
          } catch (error) {
            console.warn('⚠️ userService: Failed to parse playbook:', error);
          }
        }
        
        // Map database fields (snake_case) to frontend interface (camelCase)
        const mappedProfile: UserProfile = {
          id: rawProfile.id,
          userId: rawProfile.user_id,
          username: rawProfile.username || '',
          coachId: rawProfile.coach_id,
          experienceLevel: rawProfile.experience_level || '',
          age: rawProfile.age || 25,
          weight: rawProfile.weight || 70,
          weightUnit: rawProfile.weight_unit || 'kg',
          height: rawProfile.height || 170,
          heightUnit: rawProfile.height_unit || 'cm',
          gender: rawProfile.gender || '',
          finalChatNotes: rawProfile.final_chat_notes || '',
          // Raw questions and responses (for consistency)
          initial_questions: convertToAIQuestions(rawProfile.initial_questions),
          follow_up_questions: convertToAIQuestions(rawProfile.follow_up_questions),
          initial_responses: rawProfile.initial_responses || null,
          follow_up_responses: rawProfile.follow_up_responses || null,
          
          // AI messages from database
          initial_ai_message: (() => {
            console.log('📍 userService: rawProfile.initial_questions:', typeof rawProfile.initial_questions, JSON.stringify(rawProfile.initial_questions)?.substring(0, 200));
            return extractAIMessage(rawProfile.initial_questions);
          })(),
          follow_up_ai_message: extractAIMessage(rawProfile.follow_up_questions),
          outline_ai_message: rawProfile.plan_outline?.ai_message || null,
          // Plan outline and feedback (separated)
          plan_outline: rawProfile.plan_outline || null,
          plan_outline_feedback: rawProfile.plan_outline_feedback || null,
          // User playbook
          playbook: playbook,
          planAccepted: rawProfile.plan_accepted || false,
          createdAt: rawProfile.created_at ? new Date(rawProfile.created_at) : undefined,
          updatedAt: rawProfile.updated_at ? new Date(rawProfile.updated_at) : undefined,
        };
        
        return {
          success: true,
          data: mappedProfile,
        };
      } else {
        console.warn('⚠️ userService: No profiles found for user_id:', userId);
        console.warn('⚠️ userService: This means the profile was never created or user_id mismatch');
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
      if (updates.hasLimitations !== undefined) updateData.has_limitations = updates.hasLimitations;
      if (updates.limitationsDescription !== undefined) updateData.limitations_description = updates.limitationsDescription;
      if (updates.finalChatNotes !== undefined) updateData.final_chat_notes = updates.finalChatNotes;
      if (updates.planAccepted !== undefined) updateData.plan_accepted = updates.planAccepted;

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
        planAccepted: data.plan_accepted || false,
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