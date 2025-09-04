import { useState, useCallback } from 'react';
import { WorkoutService } from '../services/workoutService';
import { WorkoutPlan } from '../types';
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
      const result = await WorkoutService.generateWorkoutPlan(profileData, userProfileId, userId);
      
      if (result.success && result.data) {
        // Store the workout plan in the auth context
        setWorkoutPlan(result.data);
        return true;
      } else {
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
