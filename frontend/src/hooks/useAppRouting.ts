/**
 * Custom hook for centralized app routing logic
 * Extracts complex routing logic from index.tsx for better maintainability
 */

import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AppRoutingState {
  targetRoute: string | null;
  isLoading: boolean;
  hasError: boolean;
  routingReason: string;
}

export const useAppRouting = (): AppRoutingState => {
  const { state } = useAuth();

  return useMemo(() => {
    // If we're loading, don't navigate at all - stay on current page
    if (state.isLoading || state.workoutPlanLoading) {
      return {
        targetRoute: null,
        isLoading: true,
        hasError: false,
        routingReason: 'Loading in progress'
      };
    }

    // If there's an error, don't navigate - let the user see the error
    if (state.error) {
      return {
        targetRoute: null,
        isLoading: false,
        hasError: true,
        routingReason: 'Error state - user should see error'
      };
    }

    // Step 1: Check authentication
    if (!state.user) {
      return {
        targetRoute: '/login',
        isLoading: false,
        hasError: false,
        routingReason: 'No user - redirect to login'
      };
    }

    // Step 2: Check email verification (only for OAuth users, not email signup)
    if (state.user && !state.user.email_confirmed_at && state.user.app_metadata?.provider !== 'email') {
      return {
        targetRoute: '/email-verification',
        isLoading: false,
        hasError: false,
        routingReason: 'OAuth user needs email verification'
      };
    }

    // Step 3: Check user profile existence
    if (!state.userProfile) {
      return {
        targetRoute: '/onboarding',
        isLoading: false,
        hasError: false,
        routingReason: 'No user profile - start onboarding from beginning'
      };
    }

    // Step 4: Check onboarding progress - granular routing for resume flow
    const hasInitialQuestions = !!state.userProfile.initial_questions;
    const hasInitialResponses = !!state.userProfile.initial_responses;
    const hasFollowUpQuestions = !!state.userProfile.follow_up_questions;
    const hasFollowUpResponses = !!state.userProfile.follow_up_responses;
    const hasPlanOutline = !!state.userProfile.plan_outline;
    const hasWorkoutPlan = !!state.workoutPlan;

    console.log('🔍 Checking onboarding progress:', {
      hasInitialQuestions,
      hasInitialResponses,
      hasFollowUpQuestions,
      hasFollowUpResponses,
      hasPlanOutline,
      hasWorkoutPlan,
    });

    // Granular routing based on what's missing
    if (!hasInitialQuestions || !hasInitialResponses) {
      return {
        targetRoute: '/onboarding/initial-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Missing initial questions or responses → /onboarding/initial-questions'
      };
    }

    if (!hasFollowUpQuestions || !hasFollowUpResponses) {
      return {
        targetRoute: '/onboarding/follow-up-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Missing follow-up questions or responses → /onboarding/follow-up-questions'
      };
    }

    if (!hasPlanOutline) {
      return {
        targetRoute: '/onboarding/plan-outline',
        isLoading: false,
        hasError: false,
        routingReason: 'Missing plan outline → /onboarding/plan-outline'
      };
    }

    if (!hasWorkoutPlan) {
      return {
        targetRoute: '/generate-plan',
        isLoading: false,
        hasError: false,
        routingReason: 'Missing workout plan → /generate-plan'
      };
    }

    // Step 5: Everything exists - go to main app
    return {
      targetRoute: '/(tabs)',
      isLoading: false,
      hasError: false,
      routingReason: 'Onboarding complete - go to main app'
    };
  }, [
    state.isLoading,
    state.workoutPlanLoading,
    state.user,
    state.userProfile,
    state.workoutPlan,
    state.error
  ]);
};
