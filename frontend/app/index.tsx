import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAppRouting } from '@/src/hooks/useAppRouting';
import { useEffect, useRef } from 'react';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';

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
    const currentState = `${state.isLoading}-${state.workoutPlanLoading}-${!!state.user}-${!!state.userProfile}-${!!state.workoutPlan}-${!!state.error}`;
    
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
    
    console.log(`🎯 Routing decision: ${routingReason} -> ${targetRoute || 'no navigation'}`);

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      // Prevent duplicate navigation if already navigating
      if (isNavigatingRef.current) {
        console.log('🚫 Navigation blocked - already navigating');
        return;
      }
      
      // Additional check: if we're already on the target route, don't navigate
      if (targetRoute === '/generate-plan' && lastNavigationRef.current === '/generate-plan') {
        console.log('🚫 Navigation blocked - already on target route');
        return;
      }
      
      console.log(`🔄 Navigating from ${lastNavigationRef.current} to ${targetRoute}`);
      lastNavigationRef.current = targetRoute;
      isNavigatingRef.current = true;
      
      // Add a delay to prevent rapid navigation calls and allow state to stabilize
      navigationTimeoutRef.current = setTimeout(() => {
        try {
          console.log(`✅ Executing navigation to ${targetRoute}`);
          router.push(targetRoute as any);
        } catch (error) {
          console.error('❌ Navigation error:', error);
          try {
            router.replace(targetRoute as any);
          } catch (replaceError) {
            console.error('❌ Replace navigation also failed:', replaceError);
          }
        } finally {
          // Reset navigation state after a delay to prevent rapid re-navigation
          setTimeout(() => {
            isNavigatingRef.current = false;
            console.log('🔄 Navigation state reset');
          }, 300); // Reduced delay for better responsiveness
        }
      }, 50); // Reduced delay for better responsiveness
    }
  }, [state.isLoading, state.workoutPlanLoading, state.user, state.userProfile, state.workoutPlan, state.error, router]);

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
  }, [state.isLoading, state.workoutPlanLoading, state.user, state.userProfile, state.workoutPlan, state.error]);

  // Show loading screen when auth is loading
  if (routingState.isLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  // Return null while navigation is being handled by useEffect
  return null;
}
