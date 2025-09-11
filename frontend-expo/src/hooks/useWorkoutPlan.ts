import { useState, useCallback } from 'react';
import { TrainingService } from '../services/trainingService';
import { WorkoutPlan } from '../types/training';
import { useAuth } from '../context/AuthContext';

export interface UseWorkoutPlanReturn {
  generateWorkoutPlan: (profileData: any, userProfileId: number, userId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useWorkoutPlan = (): UseWorkoutPlanReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setWorkoutPlan } = useAuth();

  const generateWorkoutPlan = useCallback(async (
    profileData: any,
    userProfileId: number,
    userId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await TrainingService.generateWorkoutPlan(profileData, userProfileId, userId);
      
      if (result.success && result.data) {
        // Store the workout plan in the auth context
        console.log('💪 Setting workout plan');
        setWorkoutPlan(result.data);
        return true;
      } else {
        // Check if this is a duplicate error - if so, don't treat it as an error
        const isDuplicateError = result.error?.includes('already exists') || result.error?.includes('duplicate');
        
        if (isDuplicateError) {
          console.log('ℹ️ Duplicate workout plan detected');
          // Don't set error for duplicate - just return false
          return false;
        }
        
        setError(result.error || 'Failed to generate workout plan');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkoutPlan]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateWorkoutPlan,
    isLoading,
    error,
    clearError,
  };
};
