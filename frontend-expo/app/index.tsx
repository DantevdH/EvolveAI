import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationRef = useRef<string | null>(null);

  console.log('Index.tsx - Auth state:', {
    isLoading: state.isLoading,
    hasUser: !!state.user,
    hasUserProfile: !!state.userProfile,
    hasWorkoutPlan: !!state.workoutPlan,
    userEmail: state.user?.email,
    error: state.error,
    user: state.user ? 'Has user' : 'No user',
    profile: state.userProfile ? 'Has profile' : 'No profile',
    workoutPlan: state.workoutPlan ? 'Has workout plan' : 'No workout plan',
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

    // If there's an error, don't navigate - let the user see the error
    if (state.error) {
      console.log('Index.tsx - Error present, not navigating:', state.error);
      return;
    }

    // Determine target route based on Swift AppViewModel logic
    let targetRoute: string | null = null;
    
    // Step 1: Check authentication
    if (!state.user) {
      targetRoute = '/login';
      console.log('Index.tsx - Not authenticated → /login');
    }
    // Step 2: Check email verification (only for OAuth users, not email signup)
    else if (state.user && !state.user.email_confirmed_at && state.user.app_metadata?.provider !== 'email') {
      targetRoute = '/email-verification';
      console.log('Index.tsx - OAuth user needs email verification → /email-verification');
    }
    // Step 3: Check user profile
    else if (!state.userProfile) {
      targetRoute = '/onboarding';
      console.log('Index.tsx - Authenticated but no profile → /onboarding');
    }
    // Step 4: Check workout plan
    else if (!state.workoutPlan) {
      targetRoute = '/generate-plan'; // Redirect to GeneratePlanScreen for plan generation
      console.log('Index.tsx - Has profile but no workout plan → /generate-plan (to generate plan)');
    }
    // Step 5: Everything exists
    else {
      targetRoute = '/(tabs)';
      console.log('Index.tsx - Has everything → /(tabs)');
    }

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      console.log('Index.tsx - Scheduling navigation to:', targetRoute);
      lastNavigationRef.current = targetRoute;
      
      // Add a small delay to prevent rapid navigation calls
      navigationTimeoutRef.current = setTimeout(() => {
        console.log('Index.tsx - Executing navigation to:', targetRoute);
        try {
          router.push(targetRoute as any);
        } catch (error) {
          console.error('Index.tsx - Navigation error:', error);
          console.log('Index.tsx - Falling back to replace');
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
