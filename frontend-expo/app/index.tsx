import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationRef = useRef<string | null>(null);


  // Use useEffect to handle navigation based on auth state
  useEffect(() => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // CRITICAL: If we're loading, don't navigate at all - stay on current page
    if (state.isLoading) {

      return;
    }

    // If there's an error, don't navigate - let the user see the error
    if (state.error) {

      return;
    }

    // Determine target route based on Swift AppViewModel logic
    let targetRoute: string | null = null;
    
    // Step 1: Check authentication
    if (!state.user) {
      targetRoute = '/login';

    }
    // Step 2: Check email verification (only for OAuth users, not email signup)
    else if (state.user && !state.user.email_confirmed_at && state.user.app_metadata?.provider !== 'email') {
      targetRoute = '/email-verification';

    }
    // Step 3: Check user profile
    else if (!state.userProfile) {
      targetRoute = '/onboarding';

    }
    // Step 4: Check workout plan
    else if (!state.workoutPlan) {
      targetRoute = '/generate-plan'; // Redirect to GeneratePlanScreen for plan generation
    }
    // Step 5: Everything exists
    else {
      targetRoute = '/(tabs)';
    }

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {

      lastNavigationRef.current = targetRoute;
      
      // Add a small delay to prevent rapid navigation calls
      navigationTimeoutRef.current = setTimeout(() => {

        try {
          router.push(targetRoute as any);
        } catch (error) {
          console.error('Index.tsx - Navigation error:', error);

          router.replace(targetRoute as any);
        }
      }, 100);
    }
  }, [state.isLoading, state.user, state.userProfile, state.workoutPlan, state.error, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Don't show loading here - let individual screens handle their own loading states

  // Return null while navigation is being handled by useEffect
  return null;
}
