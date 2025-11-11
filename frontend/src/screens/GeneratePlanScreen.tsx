/**
 * Generate Plan Screen - Direct Training Plan Generation
 * 
 * This screen is shown when user has completed both question rounds but
 * the plan generation was interrupted (e.g., app was closed during generation).
 * It directly triggers plan generation without showing questions UI.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ProgressOverlay } from '../components/onboarding/ui';
import { useProgressOverlay } from '../hooks/useProgressOverlay';
import { trainingService } from '../services/onboardingService';
import { logError, logData } from '../utils/logger';

export const GeneratePlanScreen: React.FC = () => {
  const router = useRouter();
  const { state: authState, refreshUserProfile, setTrainingPlan, setExercises, dispatch } = useAuth();
  const { progressState, runWithProgress } = useProgressOverlay();
  const [error, setError] = useState<string | null>(null);
  const generationTriggeredRef = useRef(false);

  const startGeneration = useCallback(async () => {
    if (generationTriggeredRef.current) {
      return;
    }

    try {
      // Validate we have all required data
      if (!authState.userProfile) {
        throw new Error('User profile not found');
      }

      if (!authState.userProfile.initial_questions || !authState.userProfile.initial_responses) {
        throw new Error('Initial questions/responses missing');
      }

      if (!authState.userProfile.follow_up_questions || !authState.userProfile.follow_up_responses) {
        throw new Error('Follow-up questions/responses missing');
      }

      const jwtToken = authState.session?.access_token;
      if (!jwtToken) {
        throw new Error('JWT token is missing');
      }

      console.log('📍 GeneratePlanScreen: Starting plan generation...');
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

      const response = await runWithProgress('plan', () =>
        trainingService.generateTrainingPlan(
          personalInfo,
          authState.userProfile!.initial_responses || {},
          authState.userProfile!.follow_up_responses || {},
          authState.userProfile!.initial_questions || [],
          authState.userProfile!.follow_up_questions || [],
          authState.userProfile!.id,
          jwtToken
        )
      );

      logData('Generate Plan', response.success ? 'success' : 'error');

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

        console.log('✅ GeneratePlanScreen: Plan generated successfully');
        
        // Refresh profile to get latest state
        // The centralized routing logic will automatically navigate to /onboarding with resume flag
        await refreshUserProfile();
      } else {
        throw new Error(response.message || 'Failed to generate training plan');
      }
    } catch (err) {
      logError('Plan generation error', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate training plan';
      setError(errorMessage);
      generationTriggeredRef.current = false;

      Alert.alert(
        'Plan Generation Error',
        `Failed to generate training plan: ${errorMessage}\n\nThis step creates your final personalized training plan.`,
        [
          { 
            text: 'Try Again',
            onPress: () => {
              setError(null);
              setTimeout(() => {
                startGeneration();
              }, 100);
            }
          },
          {
            text: 'Start Over',
            onPress: () => router.replace('/onboarding'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [authState.userProfile, authState.session, dispatch, refreshUserProfile, router, runWithProgress, setExercises, setTrainingPlan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startGeneration();
    }, 500);

    return () => clearTimeout(timer);
  }, [startGeneration]);

  return (
    <View style={styles.container}>
      <ProgressOverlay
        visible={progressState.visible || !error}
        progress={progressState.progress}
        title="Generating your training plan…"
      />
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