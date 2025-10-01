import { useState, useCallback } from 'react';
import { TrainingService } from '../services/trainingService';
import { TrainingPlan } from '../types/training';
import { useAuth } from '../context/AuthContext';

export interface UseTrainingPlanReturn {
  generateTrainingPlan: (profileData: any, userProfileId: number, userId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useTrainingPlan = (): UseTrainingPlanReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTrainingPlan } = useAuth();

  const generateTrainingPlan = useCallback(async (
    profileData: any,
    userProfileId: number,
    userId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await TrainingService.generateTrainingPlan(profileData, userProfileId, userId);
      
      if (result.success && result.data) {
        // Store the training plan in the auth context
        console.log('💪 Setting training plan');
        setTrainingPlan(result.data);
        return true;
      } else {
        // Check if this is a duplicate error - if so, don't treat it as an error
        const isDuplicateError = result.error?.includes('already exists') || result.error?.includes('duplicate');
        
        if (isDuplicateError) {
          console.log('ℹ️ Duplicate training plan detected');
          // Don't set error for duplicate - just return false
          return false;
        }
        
        setError(result.error || 'Failed to generate training plan');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setTrainingPlan]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateTrainingPlan,
    isLoading,
    error,
    clearError,
  };
};
