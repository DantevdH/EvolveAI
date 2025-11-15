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
  const { state: authState, refreshUserProfile, refreshTrainingPlan, setTrainingPlan, setExercises, setPollingPlan, dispatch } = useAuth();
  const { progressState, runWithProgress } = useProgressOverlay();
  const [error, setError] = useState<string | null>(null);
  const generationTriggeredRef = useRef(false);

  const pollForBackgroundData = useCallback(async () => {
    const userId = authState.user?.id;
    const userProfileId = authState.userProfile?.id;
    
    if (!userId || !userProfileId) {
      console.warn('⚠️ Cannot poll: missing user ID or profile ID');
      return;
    }

    // Set polling flag to true
    setPollingPlan(true);
    console.log('📍 Polling for playbook + future week outlines...');
    
    const { UserService } = await import('../services/userService');
    const { TrainingService } = await import('../services/trainingService');
    
    for (let attempt = 0; attempt < 12; attempt++) { // 60s max at 5s intervals
      const [profileData, planData] = await Promise.all([
        UserService.getUserProfile(userId),
        TrainingService.getTrainingPlan(userProfileId),
      ]);
      
      const hasPlaybook = (profileData.data?.playbook?.lessons?.length || 0) > 0;
      const weekCount = planData.data?.weeklySchedules?.length || 0;
      
      if (hasPlaybook && weekCount > 1) {
        console.log(`✅ Background data ready: playbook + ${weekCount} weeks`);
        await Promise.all([refreshUserProfile(), refreshTrainingPlan()]);
        setPollingPlan(false); // Clear polling flag
        return;
      }
      
      console.log(`📍 Poll ${attempt + 1}/12: playbook=${hasPlaybook}, weeks=${weekCount}`);
      
      if (attempt < 11) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.warn('⚠️ Polling timeout after 60s');
    await Promise.all([refreshUserProfile(), refreshTrainingPlan()]);
    setPollingPlan(false); // Clear polling flag even on timeout
  }, [authState.user?.id, authState.userProfile?.id, refreshUserProfile, refreshTrainingPlan, setPollingPlan]);

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
          authState.userProfile!.initial_questions || [],
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
        
        // Poll for playbook + plan outline to be ready (background jobs)
        await pollForBackgroundData();
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
        visible={progressState.visible}
        progress={progressState.progress}
        title="Gathering the upcoming weeks…"
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