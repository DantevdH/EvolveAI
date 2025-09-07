/**
 * Main onboarding flow component that handles step navigation
 */

import { StyleSheet, Text, View } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { GeneratePlanScreen } from '../GeneratePlanScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { PersonalInfoScreen } from './PersonalInfoScreen';
import { ExperienceLevelScreen } from './ExperienceLevelScreen';
import { FitnessGoalsScreen } from './FitnessGoalsScreen';
import { EquipmentAccessScreen } from './EquipmentAccessScreen';
import { TimeAvailabilityScreen } from './TimeAvailabilityScreen';
import { PhysicalLimitationsScreen } from './PhysicalLimitationsScreen';
import { OnboardingCompleteScreen } from './OnboardingCompleteScreen';

export const OnboardingFlow: React.FC = () => {
  const { state } = useOnboarding();
  const { state: authState } = useAuth();

  // Show GeneratePlanScreen if we're generating a plan
  if (state.isGeneratingPlan) {
    return <GeneratePlanScreen />;
  }

  // If user already has a profile but no workout plan, this should not happen
  // because index.tsx should redirect directly to /generate-plan
  // This is a fallback in case the navigation logic fails
  if (authState.userProfile && !authState.workoutPlan && !state.isGeneratingPlan) {
    console.error('OnboardingFlow: User has profile but no workout plan - this should not happen!');
    console.error('OnboardingFlow: The user should have been redirected to /generate-plan by index.tsx');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Navigation Error: Please restart the app</Text>
      </View>
    );
  }

  const renderCurrentStep = () => {
    switch (state.progress.currentStep) {
      case 1:
        return <WelcomeScreen />;
      case 2:
        return <PersonalInfoScreen />;
      case 3:
        return <ExperienceLevelScreen />;
      case 4:
        return <FitnessGoalsScreen />;
      case 5:
        return <EquipmentAccessScreen />;
      case 6:
        return <TimeAvailabilityScreen />;
      case 7:
        return <PhysicalLimitationsScreen />;
      case 8:
        return <OnboardingCompleteScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
