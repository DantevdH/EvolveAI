import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const router = useRouter();
  const { profileData: passedProfileData } = useLocalSearchParams<{ profileData?: string }>();
  const { generateWorkoutPlan, isLoading, error, clearError } = useWorkoutPlan();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const hasStartedGeneration = useRef(false);

  // Auto-start generation when screen loads (only once)
  useEffect(() => {
    if (state.user && !state.workoutPlan && !hasStartedGeneration.current) {
      handleGeneratePlan();
    }
  }, [state.user, state.workoutPlan]);

  // Navigate to main app when workout plan is generated
  useEffect(() => {
    if (state.workoutPlan) {
      router.replace('/(tabs)');
    }
  }, [state.workoutPlan, router]);

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
    if (isLoading || hasStartedGeneration.current) {
      return;
    }

    hasStartedGeneration.current = true;
    setIsGenerating(true);
    
    try {
      const profileResult = getProfileData();
      
      if (!profileResult.success) {
        hasStartedGeneration.current = false;
        throw new Error('Profile data not found');
      }

      if (!profileResult.profileId) {
        hasStartedGeneration.current = false;
        throw new Error('Profile ID is missing');
      }

      const success = await generateWorkoutPlan(
        profileResult.profileData,
        profileResult.profileId,
        state.user?.id || ''
      );
      
      if (!success) {
        throw new Error(error || 'Failed to generate workout plan');
      }
    } catch (error) {
      hasStartedGeneration.current = false;
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [isLoading, getProfileData, generateWorkoutPlan, state.user?.id, error]);

  return {
    isLoading: isLoading || isGenerating,
    error,
    handleGeneratePlan,
    clearError,
  };
};
