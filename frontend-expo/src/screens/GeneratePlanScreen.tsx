/**
 * Generate Plan Screen - Shows loading animation while AI generates workout plan
 */


import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '../context/OnboardingContext';
import { useAuth } from '../context/AuthContext';
import { OnboardingBackground } from '../components/onboarding';
import { AnimatedSpinner, LoadingIndicator } from '../components/generatePlan';
import { useGeneratePlanFlow } from '../hooks/useGeneratePlanFlow';
import { showWorkoutPlanError } from '../utils/errorHandler';

export const GeneratePlanScreen: React.FC = () => {
  const { state: onboardingState } = useOnboarding();
  const { state: authState, setComingFromOnboarding } = useAuth();
  const { profileData: passedProfileData } = useLocalSearchParams<{ profileData?: string }>();
  const { isLoading, error, handleGeneratePlan, clearError } = useGeneratePlanFlow();
  const hasStartedGeneration = React.useRef(false);
  const mountTimestamp = React.useRef<string | null>(null);
  const renderCount = React.useRef(0);

  // Log component mount/unmount
  React.useEffect(() => {
    const timestamp = new Date().toISOString();
    mountTimestamp.current = timestamp;
    console.log('🏗️ GeneratePlanScreen mounted');

    return () => {
      console.log('🏗️ GeneratePlanScreen unmounted');
    };
  }, []);

  // Auto-start generation when screen loads (only once)
  React.useEffect(() => {
    if (!hasStartedGeneration.current) {
      console.log('💪 Starting workout plan generation');
      hasStartedGeneration.current = true;
      handleGeneratePlan();
    }
  }, []); // Empty dependency array - only run once when screen loads

  // Handle errors with standardized error handling
  React.useEffect(() => {
    if (error) {
      console.log('❌ Generation error detected');
      showWorkoutPlanError(error, () => {
        clearError();
        handleGeneratePlan();
      });
    }
  }, [error, clearError, handleGeneratePlan]);

  // Reset onboarding flag when generation completes successfully
  React.useEffect(() => {
    if (authState.isComingFromOnboarding && !isLoading && !error && authState.workoutPlan) {
      console.log('✅ Generation completed, resetting onboarding flag');
      setComingFromOnboarding(false);
    }
  }, [authState.isComingFromOnboarding, isLoading, error, authState.workoutPlan, setComingFromOnboarding]);

  // Get the actual coach name from the selected coach
  const selectedCoachId = onboardingState.data?.selectedCoachId;
  const availableCoaches = onboardingState.data?.availableCoaches || [];
  const selectedCoach = availableCoaches.find(coach => coach.id === selectedCoachId);
  const coachName = selectedCoach?.name || 'AI Coach';

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      
      <View style={styles.content}>
        <AnimatedSpinner coachName={coachName} />
        <LoadingIndicator isLoading={isLoading} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
});