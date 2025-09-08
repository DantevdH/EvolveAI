/**
 * Navigation Provider - Integrates with existing Expo Router structure
 */

import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { initializeDeepLinking } from '../utils/deepLinking';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const { state } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Initialize deep linking
  useEffect(() => {
    const cleanup = initializeDeepLinking();
    return cleanup;
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!state.isInitialized) {
      return; // Don't navigate while auth is initializing
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inMainGroup = segments[0] === '(tabs)';

    if (!state.user) {
      // User is not authenticated
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (!state.userProfile) {
      // User is authenticated but no profile (needs onboarding)
      if (!inOnboardingGroup) {
        router.replace('/onboarding');
      }
    } else if (!state.workoutPlan) {
      // User has profile but no workout plan (needs to generate plan)
      if (!inOnboardingGroup) {
        router.replace('/generate-plan');
      }
    } else {
      // User is fully set up
      if (!inMainGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [state.isInitialized, state.user, state.userProfile, state.workoutPlan, segments, router]);

  return <>{children}</>;
};
