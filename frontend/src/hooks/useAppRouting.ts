/**
 * Custom hook for centralized app routing logic
 * Extracts complex routing logic from index.tsx for better maintainability
 */

import { useMemo, useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
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
  const pathname = usePathname?.() as string | undefined;

  const result = useMemo(() => {
    // BEST PRACTICE: Only block navigation for critical auth operations (sign in, sign up)
    // Profile loading should NOT block navigation - it loads in background
    // Only block if we're doing a critical auth operation (sign in/up, not profile loading)
    if (state.isLoading) {
      return {
        targetRoute: null,
        isLoading: true,
        hasError: false,
        routingReason: 'Loading'
      };
    }
    
    // Unified post-auth loading gate: wait while either profile or plan is loading
    const isProfileLoading = (state as any).profileLoading === true;
    const isPlanLoading = state.trainingPlanLoading === true;
    if (state.user && (isProfileLoading || isPlanLoading)) {
      return {
        targetRoute: null,
        isLoading: true,
        hasError: false,
        routingReason: 'Profile/Plan Loading'
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

    // Step 3: Unified onboarding start with smart branching
    const profileForStart = state.userProfile;
    const iqStart = profileForStart?.initial_questions as any;
    const initialQuestionsCountForStart = Array.isArray(iqStart)
      ? iqStart.length
      : (iqStart && Array.isArray(iqStart?.questions) ? iqStart.questions.length : 0);
    if (!profileForStart || initialQuestionsCountForStart === 0) {
      return {
        targetRoute: '/onboarding',
        isLoading: false,
        hasError: false,
        routingReason: 'Onboarding Start',
        skipLoaders: false,
      };
    }

    // Step 4: Check onboarding progress - granular routing for resume flow
    // From here, userProfile is guaranteed to exist by the unified onboarding start gate
    const profile = state.userProfile!;
    const iq = (profile.initial_questions as any);
    const initialQuestions = Array.isArray(iq) ? iq : (iq && Array.isArray(iq.questions) ? iq.questions : []);
    const initialResponsesObj = profile.initial_responses || {};
    const hasInitialQuestions = Array.isArray(initialQuestions) && initialQuestions.length > 0;
    const hasInitialResponses = typeof initialResponsesObj === 'object' && Object.keys(initialResponsesObj).length > 0;
    const informationComplete = profile.information_complete === true;
    const hasTrainingPlan = !!state.trainingPlan;
    const isPlanAccepted = !!profile.planAccepted;

    // Route to appropriate onboarding stage
    // 1) If we have questions but no responses yet → resume at initial-questions
    if (hasInitialQuestions && !hasInitialResponses) {
      // Prevent redundant re-navigation if we're already on the target path or in onboarding flow
      if (pathname && (pathname === '/onboarding/initial-questions' || pathname.startsWith('/onboarding'))) {
        return {
          targetRoute: null,
          isLoading: false,
          hasError: false,
          routingReason: 'Initial Questions (already here)',
          skipLoaders: true,
        };
      }
      return {
        targetRoute: '/onboarding/initial-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Initial Questions',
        skipLoaders: true, // Resume state, skip intro
      };
    }

    // 2) If we have questions and responses but information is not complete → resume at initial-questions
    // This handles the case where the user needs to continue the chat to finish onboarding
    if (hasInitialQuestions && hasInitialResponses && !informationComplete) {
      // Prevent redundant re-navigation if we're already on the target path or in onboarding flow
      if (pathname && (pathname === '/onboarding/initial-questions' || pathname.startsWith('/onboarding'))) {
        return {
          targetRoute: null,
          isLoading: false,
          hasError: false,
          routingReason: 'Continue Chat (already here)',
          skipLoaders: true,
        };
      }
      return {
        targetRoute: '/onboarding/initial-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Continue Chat',
        skipLoaders: true, // Resume state, skip intro
      };
    }

    // 3) Only proceed to plan generation if information is complete
    if (!hasTrainingPlan) {
      // If information is complete but no plan exists, route to onboarding questions
      // The chat interface will auto-trigger plan generation
      // This handles the case where user reloads after completing questions but before plan generation
      if (informationComplete && hasInitialQuestions && hasInitialResponses) {
        // Check if already on onboarding questions page
        const isOnOnboardingQuestions = pathname === '/onboarding/initial-questions';
        if (isOnOnboardingQuestions) {
          return {
            targetRoute: null,
            isLoading: false,
            hasError: false,
            routingReason: 'Generating Plan in Chat (already here)',
            skipLoaders: true,
          };
        }
        // Route to onboarding questions where plan generation will auto-trigger
        return {
          targetRoute: '/onboarding/initial-questions',
          isLoading: false,
          hasError: false,
          routingReason: 'Generate Plan in Chat',
          skipLoaders: true,
        };
      }

      // If plan doesn't exist but information isn't complete, stay in onboarding
      if (pathname && (pathname === '/onboarding/initial-questions' || pathname.startsWith('/onboarding'))) {
        return {
          targetRoute: null,
          isLoading: false,
          hasError: false,
          routingReason: 'Complete Information First (already here)',
          skipLoaders: true,
        };
      }
      return {
        targetRoute: '/onboarding/initial-questions',
        isLoading: false,
        hasError: false,
        routingReason: 'Complete Information First',
        skipLoaders: true,
      };
    }

    // Step 5: Check if plan is accepted - if not, show plan preview for feedback
    if (!isPlanAccepted) {
      return {
        targetRoute: '/(tabs)',
        isLoading: false,
        hasError: false,
        routingReason: 'Plan Review',
        skipLoaders: true, // We will open chat automatically on training screen
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
    // Include profileLoading so routing re-evaluates when profile load completes
    (state as any).profileLoading,
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
