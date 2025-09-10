import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useWorkoutPlan } from './useWorkoutPlan';
import { mapProfileToBackendRequest } from '../utils/profileDataMapping';

export interface UseGeneratePlanFlowReturn {
  isLoading: boolean;
  error: string | null;
  handleGeneratePlan: () => Promise<void>;
  clearError: () => void;
}

export const useGeneratePlanFlow = (): UseGeneratePlanFlowReturn => {
  const { state, setWorkoutPlan } = useAuth();
  const { profileData: passedProfileData } = useLocalSearchParams<{ profileData?: string }>();
  const { generateWorkoutPlan, isLoading, error, clearError } = useWorkoutPlan();
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Navigation removed - handled by main navigation in app/index.tsx
  // This prevents the hook from interfering with the main navigation system

  const getProfileData = useCallback((): { success: boolean; profileData?: any; profileId?: number } => {
    // Scenario 1: Profile data passed from onboarding (new user)
    if (passedProfileData) {
      try {
        const profileData = JSON.parse(passedProfileData);
        return { 
          success: true, 
          profileData,
          profileId: profileData.id 
        };
      } catch (error) {
        return { success: false };
      }
    }
    
    // Scenario 2: Profile data from auth context (existing user)
    if (state.userProfile) {
      return { 
        success: true, 
        profileData: state.userProfile,
        profileId: state.userProfile.id 
      };
    }
    
    return { success: false };
  }, [passedProfileData, state.userProfile]);

  const handleGeneratePlan = useCallback(async (): Promise<void> => {
    const timestamp = new Date().toISOString();
    console.log('🚀 Starting workout plan generation');

    if (isLoading) {
      console.log('⏸️ Generation already in progress');
      return;
    }

    setIsGenerating(true);
    console.log('🔄 Calling API...');
    
    try {
      const profileResult = getProfileData();
      
      if (!profileResult.success) {
        console.error('❌ Profile data not found');
        throw new Error('Profile data not found');
      }

      if (!profileResult.profileId) {
        console.error('❌ Profile ID is missing');
        throw new Error('Profile ID is missing');
      }

      const apiStartTime = new Date().toISOString();
      console.log('🚀 Calling generateWorkoutPlan API');
      
      const success = await generateWorkoutPlan(
        profileResult.profileData,
        profileResult.profileId,
        state.user?.id || ''
      );
      
      const apiEndTime = new Date().toISOString();
      console.log('🚀 API call completed');
      
      if (!success) {
        console.error('❌ Generation failed');
        throw new Error(error || 'Failed to generate workout plan');
      }

      console.log('✅ Workout plan generated');
    } catch (error) {
      console.error('💥 Generation error:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [isLoading, getProfileData, generateWorkoutPlan, state.user?.id, error]);

  // Auto-generation removed - now handled by GeneratePlanScreen component

  return {
    isLoading: isLoading || isGenerating,
    error,
    handleGeneratePlan,
    clearError,
  };
};
