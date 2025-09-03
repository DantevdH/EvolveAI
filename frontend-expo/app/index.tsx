import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef<string | null>(null);

  console.log('Index.tsx - Auth state:', {
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isOnboardingComplete: state.isOnboardingComplete,
    hasUser: !!state.user,
    hasUserProfile: !!state.userProfile,
    hasWorkoutPlan: !!state.workoutPlan,
    userEmail: state.user?.email,
    errorMessage: state.errorMessage,
    hasAttemptedLogin: state.hasAttemptedLogin,
    session: state.session ? 'Has session' : 'No session',
    user: state.user ? 'Has user' : 'No user',
    timestamp: new Date().toISOString()
  });

  // Use useEffect to handle navigation based on auth state
  useEffect(() => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // CRITICAL: If we're loading, don't navigate at all - stay on current page
    if (state.isLoading) {
      console.log('Index.tsx - Loading state active, not navigating - staying on current page');
      return;
    }

    if (!state.isInitialized) {
      console.log('Index.tsx - Not initialized, not navigating');
      return;
    }

    // If there's an error message, don't navigate - let the user see the error
    if (state.errorMessage) {
      console.log('Index.tsx - Error present, not navigating:', state.errorMessage);
      return;
    }

    // If user has attempted login and failed, don't navigate - let them stay on login screen
    if (state.hasAttemptedLogin && !state.isAuthenticated && !state.user) {
      console.log('Index.tsx - Login attempted but failed, not navigating');
      return;
    }

    // Determine target route
    let targetRoute: string | null = null;
    
    // If user is not authenticated, redirect to login
    if (!state.isAuthenticated || !state.user) {
      targetRoute = '/login';
      console.log('Index.tsx - Not authenticated, will redirect to login');
    }
    // If user is authenticated but hasn't completed onboarding, redirect to onboarding
    else if (state.isAuthenticated && !state.isOnboardingComplete) {
      targetRoute = '/onboarding';
      console.log('Index.tsx - Authenticated but no profile, will redirect to onboarding');
    }
    // If user is authenticated and has completed onboarding, redirect to main app
    // (workout plan generation is now handled within the onboarding flow)
    else if (state.isAuthenticated && state.isOnboardingComplete) {
      targetRoute = '/(tabs)';
      console.log('Index.tsx - Fully authenticated, will redirect to main app');
    }

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      console.log('Index.tsx - Scheduling navigation to:', targetRoute);
      lastNavigationRef.current = targetRoute;
      
      // Add a small delay to prevent rapid navigation calls
      navigationTimeoutRef.current = setTimeout(() => {
        console.log('Index.tsx - Executing navigation to:', targetRoute);
        router.replace(targetRoute as any);
      }, 100);
    }
  }, [state.isInitialized, state.isLoading, state.isAuthenticated, state.user, state.isOnboardingComplete, state.errorMessage, state.hasAttemptedLogin, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Show loading while auth is initializing
  if (!state.isInitialized || state.isLoading) {
    console.log('Index.tsx - Still loading, returning null');
    return null; // The loading screen is handled in _layout.tsx
  }

  // Return null while navigation is being handled by useEffect
  return null;
}
