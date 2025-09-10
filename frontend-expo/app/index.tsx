import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationRef = useRef<string | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const lastStateRef = useRef<string>('');


  // Use useEffect to handle navigation based on auth state
  useEffect(() => {
    // Create a state signature to detect actual changes
    const currentState = `${state.isLoading}-${state.workoutPlanLoading}-${!!state.user}-${!!state.userProfile}-${!!state.workoutPlan}-${!!state.error}`;
    
    // Skip if state hasn't actually changed
    if (currentState === lastStateRef.current) {
      return;
    }
    
    lastStateRef.current = currentState;

    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // CRITICAL: If we're loading, don't navigate at all - stay on current page
    if (state.isLoading || state.workoutPlanLoading) {
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
      console.log('🔐 No user → Login');
      targetRoute = '/login';
    }
    // Step 2: Check email verification (only for OAuth users, not email signup)
    else if (state.user && !state.user.email_confirmed_at && state.user.app_metadata?.provider !== 'email') {
      console.log('📧 Email verification required');
      targetRoute = '/email-verification';
    }
    // Step 3: Check user profile
    else if (!state.userProfile) {
      console.log('👤 No profile → Onboarding');
      targetRoute = '/onboarding';
    }
    // Step 4: Check workout plan
    else if (!state.workoutPlan) {
      // Skip navigation if coming from onboarding (it handles its own navigation)
      if (state.isComingFromOnboarding) {
        return;
      }
      
      console.log('💪 No workout plan → Generate plan');
      targetRoute = '/generate-plan';
    }
    // Step 5: Everything exists
    else {
      console.log('✅ All set → Main app');
      targetRoute = '/(tabs)';
    }

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      // Prevent duplicate navigation if already navigating
      if (isNavigatingRef.current) {
        return;
      }
      
      // Additional check: if we're already on the target route, don't navigate
      if (targetRoute === '/generate-plan' && lastNavigationRef.current === '/generate-plan') {
        return;
      }
      
      console.log(`🔄 Navigating to ${targetRoute}`);
      lastNavigationRef.current = targetRoute;
      isNavigatingRef.current = true;
      
      // Clear any existing timeout to prevent duplicate navigation
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Add a delay to prevent rapid navigation calls and allow state to stabilize
      navigationTimeoutRef.current = setTimeout(() => {
        try {
          router.push(targetRoute as any);
        } catch (error) {
          console.error('❌ Navigation error:', error);
          router.replace(targetRoute as any);
        } finally {
          // Reset navigation state after a longer delay to prevent rapid re-navigation
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 1000);
        }
      }, 300); // Increased delay to 300ms for better stability
    }
  }, [state.isLoading, state.workoutPlanLoading, state.user, state.userProfile, state.workoutPlan, state.error, state.isComingFromOnboarding, router]);

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
