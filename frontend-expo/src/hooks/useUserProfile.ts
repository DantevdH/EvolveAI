import { useState, useCallback } from 'react';
import { UserService } from '../services/userService';
import { UserProfile } from '../types';

export interface UseUserProfileReturn {
  createUserProfile: (profileData: any) => Promise<{ success: boolean; profileId?: number }>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUserProfile = useCallback(async (
    profileData: any
  ): Promise<{ success: boolean; profileId?: number }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await UserService.createUserProfile(userId, profileData);
      
      if (result.success && result.data) {
        return {
          success: true,
          profileId: result.data.id,
        };
      } else {
        setError(result.error || 'Failed to create user profile');
        return {
          success: false,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return {
        success: false,
      };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createUserProfile,
    isLoading,
    error,
    clearError,
  };
};
