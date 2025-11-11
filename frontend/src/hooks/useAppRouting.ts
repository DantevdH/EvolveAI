/**
 * Custom hook for centralized app routing logic
 * Extracts complex routing logic from index.tsx for better maintainability
 */

import { useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { logDebug } from '../utils/logger';

export interface AppRoutingState {
  targetRoute: string | null;
  isLoading: boolean;
  hasError: boolean;
  routingReason: string;
  skipLoaders?: boolean; // Flag to skip intro loaders when resuming
}

export const useAppRouting = (): AppRoutingState => {
  const { state } = useAuth();
  const lastResultRef = useRef<string>('');

  const result = useMemo(() => {
    // If we're loading, don't navigate at all - stay on current page
    if (state.isLoading || state.trainingPlanLoading) {
      return {
        targetRoute: null,
        isLoading: true,
        hasError: false,
        routingReason: 'Loading'
      };
    }

    // If there's an error, don't navigate - let the user see the error
    if (state.error) {
      return {
        targetRoute: null,
        isLoading: false,
        hasError: true,
        routingReason: 'Error'
      };
    }

    // Step 1: Check authentication
    if (!state.user) {
      return {
        targetRoute: '/login',
        isLoading: false,
        hasError: false,
        routingReason: 'Login'
      };
    }

    // Step 2: Check email verification (only for OAuth users, not email signup)
    if (state.user && !state.user.email_confirmed_at && state.user.app_metadata?.provider !== 'email') {
      return {
        targetRoute: '/email-verification',
        isLoading: false,
        hasError: false,
        routingReason: 'Email Verification'
      };
    }

    // Step 3: Check user profile existence
    if (!state.userProfile) {
      return {
        targetRoute: '/onboarding',
        isLoading: false,
        hasError: false,
        routingReason: 'Onboarding Start',
        skipLoaders: false, // Fresh start, show intro loader
      };
    }

    // Step 4: Check onboarding progress - granular routing for resume flow
    const hasInitialQuestions = !!state.userProfile.initial_questions;
    const hasInitialResponses = !!state.userProfile.initial_responses;
    const hasFollowUpQuestions = !!state.userProfile.follow_up_questions;
    const hasFollowUpResponses = !!state.userProfile.follow_up_responses;
    const hasTrainingPlan = !!state.trainingPlan;
    const isPlanAccepted = !!state.userProfile.planAccepted;

    // Route to appropriate onboarding stage
    if (!hasInitialQuestions || !hasInitialResponses) {
      return {
        targetRoute: '/onboarding/initial-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Initial Questions',
        skipLoaders: true, // Resume state, skip intro
      };
    }

    if (!hasFollowUpQuestions || !hasFollowUpResponses) {
      return {
        targetRoute: '/onboarding/follow-up-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Follow-up Questions',
        skipLoaders: true, // Resume state, skip intro
      };
    }

    if (!hasTrainingPlan) {
      return {
        targetRoute: '/generate-plan',
        isLoading: false,
        hasError: false,
        routingReason: 'Generate Plan',
        skipLoaders: true, // Direct action, no intro needed
      };
    }

    // Step 5: Check if plan is accepted - if not, show plan preview for feedback
    if (!isPlanAccepted) {
      return {
        targetRoute: '/onboarding',
        isLoading: false,
        hasError: false,
        routingReason: 'Plan Preview - Awaiting Acceptance',
        skipLoaders: true, // Resume for plan preview, skip intro
      };
    }

    // Step 6: Everything exists and plan is accepted - go to main app
    return {
      targetRoute: '/(tabs)',
      isLoading: false,
      hasError: false,
      routingReason: 'Main App'
    };
  }, [
    state.isLoading,
    state.trainingPlanLoading,
    state.user,
    state.userProfile,
    state.trainingPlan,
    state.error
  ]);

  // Only log when result actually changes (debug level only)
  useEffect(() => {
    const resultKey = `${result.targetRoute}-${result.routingReason}`;
    if (resultKey !== lastResultRef.current) {
      lastResultRef.current = resultKey;
      logDebug(`Routing: ${result.routingReason} → ${result.targetRoute || 'none'}`);
    }
  }, [result]);

  return result;
};
