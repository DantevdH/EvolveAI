/**
 * Generate Plan Screen - Shows loading animation while AI generates workout plan
 */

import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '../context/OnboardingContext';
import { OnboardingBackground } from '../components/onboarding';
import { AnimatedSpinner, LoadingIndicator } from '../components/generatePlan';
import { useGeneratePlanFlow } from '../hooks/useGeneratePlanFlow';
import { showWorkoutPlanError } from '../utils/errorHandler';

export const GeneratePlanScreen: React.FC = () => {
  const { state: onboardingState } = useOnboarding();
  const { profileData: passedProfileData } = useLocalSearchParams<{ profileData?: string }>();
  const { isLoading, error, handleGeneratePlan, clearError } = useGeneratePlanFlow();

  // Handle errors with standardized error handling
  React.useEffect(() => {
    if (error) {
      showWorkoutPlanError(error, () => {
        clearError();
        handleGeneratePlan();
      });
    }
  }, [error, clearError, handleGeneratePlan]);

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