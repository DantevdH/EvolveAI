import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAppRouting } from '@/src/hooks/useAppRouting';
import { useEffect, useRef } from 'react';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';
import { logNavigation, logWarn } from '@/src/utils/logger';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const routingState = useAppRouting();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationRef = useRef<string | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const lastStateRef = useRef<string>('');

  // Use useEffect to handle navigation based on routing state
  useEffect(() => {
    // Create a state signature to detect actual changes
    const currentState = `${state.isLoading}-${state.trainingPlanLoading}-${!!state.user}-${!!state.userProfile}-${!!state.trainingPlan}-${!!state.error}`;
    
    // Skip if state hasn't actually changed
    if (currentState === lastStateRef.current) {
      return;
    }
    
    lastStateRef.current = currentState;

    // Clear any existing timeout and reset navigation state
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    
    // Reset navigation state to prevent race conditions
    isNavigatingRef.current = false;

    // Use centralized routing logic
    const { targetRoute, routingReason } = routingState;

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      // Prevent duplicate navigation if already navigating
      if (isNavigatingRef.current) {
        logWarn('Navigation blocked - already in progress');
        return;
      }
      
      // Log the navigation
      const fromRoute = lastNavigationRef.current || 'Root';
      logNavigation(fromRoute, targetRoute, routingReason);
      
      lastNavigationRef.current = targetRoute;
      isNavigatingRef.current = true;
      
      // Add a small delay to prevent rapid navigation calls and allow state to stabilize
      navigationTimeoutRef.current = setTimeout(() => {
        try {
          router.push(targetRoute as any);
        } catch (error) {
          logWarn('Navigation failed, trying replace', error);
          try {
            router.replace(targetRoute as any);
          } catch (replaceError) {
            logWarn('Replace navigation also failed', replaceError);
          }
        } finally {
          // Reset navigation state after a delay to prevent rapid re-navigation
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 300);
        }
      }, 50);
    }
  }, [state.isLoading, state.trainingPlanLoading, state.user, state.userProfile, state.trainingPlan, state.error, router, routingState]);

  // Cleanup timeout on unmount and state changes
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup timeout when state changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [state.isLoading, state.trainingPlanLoading, state.user, state.userProfile, state.trainingPlan, state.error]);

  // Show loading screen when auth is loading
  if (routingState.isLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  // Return null while navigation is being handled by useEffect
  return null;
}
