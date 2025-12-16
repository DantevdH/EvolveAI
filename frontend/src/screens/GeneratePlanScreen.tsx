/**
 * Generate Plan Screen - Direct Training Plan Generation
 * 
 * This screen is shown when user has completed both question rounds but
 * the plan generation was interrupted (e.g., app was closed during generation).
 * It directly triggers plan generation without showing questions UI.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Alert, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ProgressOverlay } from '../components/onboarding/ui';
import { useProgressOverlay } from '../hooks/useProgressOverlay';
import { trainingService } from '../services/onboardingService';
import { logError, logData, logWarn, logInfo } from '../utils/logger';
import { useApiCallWithBanner } from '../hooks/useApiCallWithBanner';
import { useBackgroundDataPolling } from '../hooks/useBackgroundDataPolling';
import { POLLING_CONFIG } from '../constants';

export const GeneratePlanScreen: React.FC = () => {
  const { state: authState, refreshUserProfile, refreshTrainingPlan, setTrainingPlan, setExercises, setPollingPlan, dispatch } = useAuth();
  const { progressState, runWithProgress } = useProgressOverlay();
  const [error, setError] = useState<string | null>(null);
  const generationTriggeredRef = useRef(false);
  const [shouldStartPolling, setShouldStartPolling] = useState(false);

  // API call with error handling for plan generation
  const { execute: executeGeneratePlan, loading: planGenerationLoading, ErrorBannerComponent: PlanGenerationErrorBanner } = useApiCallWithBanner(
    async (personalInfo: any, initialResponses: Record<string, any>, initialQuestions: any[], userProfileId: number, jwtToken: string) => {
      return await trainingService.generateTrainingPlan(
        personalInfo,
        initialResponses,
        initialQuestions,
        userProfileId,
        jwtToken
      );
    },
    {
      retryCount: 3,
      onSuccess: async (response) => {
        if (response.success && response.data) {
          const { transformTrainingPlan } = await import('../utils/trainingPlanTransformer');
          const transformedPlan = transformTrainingPlan(response.data);

          // Update playbook if provided
          if (response.playbook && authState.userProfile) {
            dispatch({
              type: 'SET_USER_PROFILE',
              payload: {
                ...authState.userProfile,
                playbook: response.playbook,
              },
            });
          }

          // Set training plan and exercises
          setTrainingPlan(transformedPlan);

          if (response.metadata?.exercises) {
            setExercises(response.metadata.exercises);
          }

          logData('Plan generation', 'success');
          
          // Poll for playbook + plan outline to be ready (background jobs)
          // Trigger polling after plan generation completes
          setShouldStartPolling(true);
          
          // Navigation to tabs is handled automatically by the routing system in index.tsx
          // when state.trainingPlan is set above via setTrainingPlan()
        } else {
          throw new Error(response.message || 'Failed to generate training plan');
        }
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate training plan';
        setError(errorMessage);
        logError('Plan generation failed', error);
        generationTriggeredRef.current = false; // Allow retry
      },
    }
  );

  // Memoize callbacks to prevent infinite loops
  const handlePollingUpdate = useCallback(async (data: { updatedPlaybook?: any; updatedPlan?: any }) => {
    if (data.updatedPlaybook || data.updatedPlan) {
      await Promise.all([refreshUserProfile(), refreshTrainingPlan()]);
    }
  }, [refreshUserProfile, refreshTrainingPlan]);

  const handlePollingTimeout = useCallback(async () => {
    logWarn('Polling timeout - refreshing data anyway');
    try {
      await Promise.all([refreshUserProfile(), refreshTrainingPlan()]);
    } catch (refreshError) {
      logError('Error refreshing data after polling timeout', refreshError);
    }
  }, [refreshUserProfile, refreshTrainingPlan]);

  // Use unified polling hook for onboarding scenario (playbook + plan weeks)
  // Use functions to capture initial values when polling starts (not at component mount)
  const { isPolling, startPolling } = useBackgroundDataPolling(
    authState.user?.id,
    authState.userProfile?.id,
    {
      pollPlaybook: true,
      pollPlanWeeks: true,
      initialPlaybookCount: () => {
        // Capture current playbook count when polling starts
        return authState.userProfile?.playbook?.total_lessons || 
               authState.userProfile?.playbook?.lessons?.length || 0;
      },
      timeout: POLLING_CONFIG.TIMEOUT,
      interval: POLLING_CONFIG.INTERVAL,
      onUpdate: handlePollingUpdate,
      onTimeout: handlePollingTimeout,
    }
  );

  // Sync polling state with auth context
  useEffect(() => {
    setPollingPlan(isPolling);
  }, [isPolling, setPollingPlan]);

  // Start polling when flag is set (after plan generation)
  useEffect(() => {
    if (shouldStartPolling) {
      startPolling();
      setShouldStartPolling(false);
    }
  }, [shouldStartPolling, startPolling]);

  const startGeneration = useCallback(async () => {
    // Prevent duplicate requests
    if (generationTriggeredRef.current) {
      logWarn('Plan generation already triggered, skipping duplicate request');
      return;
    }

    try {
      // === VALIDATION ===
      // Validate user profile
      if (!authState.userProfile) {
        throw new Error('User profile not found. Please complete onboarding first.');
      }

      // Validate initial questions
      if (!authState.userProfile.initial_questions) {
        throw new Error('Initial questions missing. Please complete onboarding first.');
      }
      
      if (!Array.isArray(authState.userProfile.initial_questions) || 
          authState.userProfile.initial_questions.length === 0) {
        throw new Error('Initial questions are empty. Please complete onboarding first.');
      }

      // Validate initial responses
      if (!authState.userProfile.initial_responses) {
        throw new Error('Initial responses missing. Please complete onboarding first.');
      }
      
      if (typeof authState.userProfile.initial_responses !== 'object' ||
          Object.keys(authState.userProfile.initial_responses).length === 0) {
        throw new Error('Initial responses are empty. Please complete onboarding first.');
      }

      // Validate user profile ID
      if (!authState.userProfile.id) {
        throw new Error('User profile ID missing. Please complete onboarding first.');
      }

      // Validate JWT token
      const jwtToken = authState.session?.access_token;
      if (!jwtToken) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      // Validate personal info fields
      const requiredFields = ['username', 'age', 'weight', 'height', 'gender', 'goalDescription', 'experienceLevel'];
      const missingFields = requiredFields.filter(field => {
        const value = authState.userProfile![field as keyof typeof authState.userProfile];
        return value === null || value === undefined || value === '';
      });
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required profile information: ${missingFields.join(', ')}. Please complete onboarding first.`);
      }

      logData('Plan generation', 'loading');
      generationTriggeredRef.current = true;
      setError(null);

      // Build personal info from profile
      const measurementSystem: 'imperial' | 'metric' =
        authState.userProfile.weightUnit === 'kg' ? 'metric' : 'imperial';

      const personalInfo = {
        username: authState.userProfile.username,
        age: authState.userProfile.age,
        weight: authState.userProfile.weight,
        height: authState.userProfile.height,
        weight_unit: authState.userProfile.weightUnit,
        height_unit: authState.userProfile.heightUnit,
        measurement_system: measurementSystem,
        gender: authState.userProfile.gender,
        goal_description: authState.userProfile.goalDescription,
        experience_level: authState.userProfile.experienceLevel,
      };

      // Use the new error handling system
      // Success and error handling is now in onSuccess/onError callbacks of useApiCallWithBanner
      await runWithProgress('plan', async () => {
        await executeGeneratePlan(
          personalInfo,
          authState.userProfile!.initial_responses || {},
          authState.userProfile!.initial_questions || [],
          authState.userProfile!.id,
          jwtToken
        );
      });
    } catch (err) {
      // This catch is for validation errors before API call
      logError('Plan generation validation error', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate training plan';
      setError(errorMessage);
      generationTriggeredRef.current = false;
    }
  }, [authState.userProfile, authState.session, dispatch, runWithProgress, setExercises, setTrainingPlan, executeGeneratePlan]);

  useEffect(() => {
    // Avoid triggering generation while a plan is being fetched or already exists
    if (authState.trainingPlanLoading) {
      logInfo('Plan generation skipped - plan loading');
      return;
    }
    
    if (authState.trainingPlan) {
      logInfo('Plan generation skipped - plan exists');
      // Navigation to tabs is handled automatically by the routing system in index.tsx
      // when state.trainingPlan exists
      return;
    }
    
    // Prevent duplicate triggers
    if (generationTriggeredRef.current) {
      return;
    }
    
    const timer = setTimeout(() => {
      startGeneration();
    }, 500);
    return () => clearTimeout(timer);
  }, [authState.trainingPlanLoading, authState.trainingPlan, startGeneration]);

  return (
    <View style={styles.container}>
      <ProgressOverlay
        visible={progressState.visible}
        progress={progressState.progress}
        title="Creating your training plan…"
      />
      <PlanGenerationErrorBanner />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plan generation failed. Please try again.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
});