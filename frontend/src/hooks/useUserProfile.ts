/**
 * useUserProfile Hook
 *
 * Simple hook to access user profile from auth context.
 * Provides easy access to profile data and unit preferences.
 */

import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

interface UseUserProfileResult {
  userProfile: UserProfile | null;
  isLoading: boolean;
  /**
   * Whether the user prefers metric units (km, kg)
   * Defaults to true if not set
   */
  useMetric: boolean;
}

/**
 * Hook to access user profile data
 */
export function useUserProfile(): UseUserProfileResult {
  const { state } = useAuth();

  // Determine if user prefers metric based on weight unit setting
  // Default to metric (true) if not explicitly set to imperial (lbs)
  const useMetric = state.userProfile?.weightUnit !== 'lbs';

  return {
    userProfile: state.userProfile,
    isLoading: state.isLoading,
    useMetric,
  };
}
