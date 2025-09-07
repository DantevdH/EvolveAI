import { useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { UserService } from '@/src/services/userService';
import { UserProfile } from '@/src/types';

export const useUser = () => {
  const { state, updateUserProfile, refreshUserProfile } = useAuth();

  /**
   * Get current user profile
   */
  const getUserProfile = useCallback((): UserProfile | null => {
    return state.userProfile;
  }, [state.userProfile]);



  /**
   * Check if user profile exists
   */
  const hasUserProfile = useCallback(async (): Promise<boolean> => {
    if (!state.user) return false;
    
    try {
      const response = await UserService.hasUserProfile(state.user.id);
      return response.success ? response.data || false : false;
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  }, [state.user]);

  /**
   * Get user profile by ID
   */
  const getUserProfileById = useCallback(async (profileId: number): Promise<UserProfile | null> => {
    try {
      const response = await UserService.getUserProfileById(profileId);
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Error getting user profile by ID:', error);
      return null;
    }
  }, []);

  /**
   * Update specific user profile fields
   */
  const updateProfileField = useCallback(async <K extends keyof UserProfile>(
    field: K,
    value: UserProfile[K]
  ): Promise<boolean> => {
    try {
      return await updateUserProfile({ [field]: value });
    } catch (error) {
      console.error('Error updating profile field:', error);
      return false;
    }
  }, [updateUserProfile]);

  /**
   * Update user's primary goal
   */
  const updatePrimaryGoal = useCallback(async (goal: string, description: string): Promise<boolean> => {
    return await updateUserProfile({
      primaryGoal: goal,
      primaryGoalDescription: description,
    });
  }, [updateUserProfile]);

  /**
   * Update user's experience level
   */
  const updateExperienceLevel = useCallback(async (level: string): Promise<boolean> => {
    return await updateUserProfile({
      experienceLevel: level,
    });
  }, [updateUserProfile]);

  /**
   * Update user's workout preferences
   */
  const updateWorkoutPreferences = useCallback(async (
    daysPerWeek: number,
    minutesPerSession: number,
    equipment: string
  ): Promise<boolean> => {
    return await updateUserProfile({
      daysPerWeek,
      minutesPerSession,
      equipment,
    });
  }, [updateUserProfile]);

  /**
   * Update user's physical information
   */
  const updatePhysicalInfo = useCallback(async (
    age: number,
    weight: number,
    weightUnit: string,
    height: number,
    heightUnit: string,
    gender: string
  ): Promise<boolean> => {
    return await updateUserProfile({
      age,
      weight,
      weightUnit,
      height,
      heightUnit,
      gender,
    });
  }, [updateUserProfile]);

  /**
   * Update user's limitations
   */
  const updateLimitations = useCallback(async (
    hasLimitations: boolean,
    limitationsDescription: string
  ): Promise<boolean> => {
    return await updateUserProfile({
      hasLimitations,
      limitationsDescription,
    });
  }, [updateUserProfile]);

  /**
   * Update user's final chat notes
   */
  const updateFinalChatNotes = useCallback(async (notes: string): Promise<boolean> => {
    return await updateUserProfile({
      finalChatNotes: notes,
    });
  }, [updateUserProfile]);

  /**
   * Get user's primary goal
   */
  const getPrimaryGoal = useCallback((): string => {
    return state.userProfile?.primaryGoal || '';
  }, [state.userProfile]);

  /**
   * Get user's experience level
   */
  const getExperienceLevel = useCallback((): string => {
    return state.userProfile?.experienceLevel || '';
  }, [state.userProfile]);

  /**
   * Get user's workout frequency
   */
  const getWorkoutFrequency = useCallback((): { daysPerWeek: number; minutesPerSession: number } => {
    return {
      daysPerWeek: state.userProfile?.daysPerWeek || 3,
      minutesPerSession: state.userProfile?.minutesPerSession || 60,
    };
  }, [state.userProfile]);

  /**
   * Get user's equipment
   */
  const getEquipment = useCallback((): string => {
    return state.userProfile?.equipment || '';
  }, [state.userProfile]);

  /**
   * Get user's physical info
   */
  const getPhysicalInfo = useCallback((): {
    age: number;
    weight: number;
    weightUnit: string;
    height: number;
    heightUnit: string;
    gender: string;
  } => {
    return {
      age: state.userProfile?.age || 30,
      weight: state.userProfile?.weight || 70,
      weightUnit: state.userProfile?.weightUnit || 'kg',
      height: state.userProfile?.height || 170,
      heightUnit: state.userProfile?.heightUnit || 'cm',
      gender: state.userProfile?.gender || '',
    };
  }, [state.userProfile]);

  /**
   * Get user's limitations
   */
  const getLimitations = useCallback((): {
    hasLimitations: boolean;
    limitationsDescription: string;
  } => {
    return {
      hasLimitations: state.userProfile?.hasLimitations || false,
      limitationsDescription: state.userProfile?.limitationsDescription || '',
    };
  }, [state.userProfile]);

  /**
   * Check if user is ready for plan generation
   */
  const isReadyForPlanGeneration = useCallback((): boolean => {
    if (!state.userProfile) return false;
    
    const profile = state.userProfile;
    return !!(
      profile.username &&
      profile.primaryGoal &&
      profile.experienceLevel &&
      profile.daysPerWeek &&
      profile.minutesPerSession &&
      profile.equipment &&
      profile.age &&
      profile.weight &&
      profile.height &&
      profile.gender
    );
  }, [state.userProfile]);

  /**
   * Get onboarding completion percentage
   */
  const getOnboardingProgress = useCallback((): number => {
    if (!state.userProfile) return 0;
    
    const profile = state.userProfile;
    const requiredFields = [
      'username',
      'primaryGoal',
      'experienceLevel',
      'daysPerWeek',
      'minutesPerSession',
      'equipment',
      'age',
      'weight',
      'height',
      'gender',
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = profile[field as keyof UserProfile];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }, [state.userProfile]);

  return {
    // State
    userProfile: state.userProfile,
    isOnboardingComplete: state.isOnboardingComplete,
    isLoading: state.isLoading,
    error: state.error,
    
    // Profile methods
    getUserProfile,
    hasUserProfile,
    getUserProfileById,
    refreshUserProfile,
    
    // Update methods
    updateProfileField,
    updatePrimaryGoal,
    updateExperienceLevel,
    updateWorkoutPreferences,
    updatePhysicalInfo,
    updateLimitations,
    updateFinalChatNotes,
    
    // Getter methods
    getPrimaryGoal,
    getExperienceLevel,
    getWorkoutFrequency,
    getEquipment,
    getPhysicalInfo,
    getLimitations,
    
    // Utility methods
    isReadyForPlanGeneration,
    getOnboardingProgress,
  };
};
