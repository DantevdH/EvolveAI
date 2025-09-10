/**
 * Main onboarding flow component that handles step navigation
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
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

  // GeneratePlanScreen is now handled by main navigation (/generate-plan route)
  // Removed conditional rendering to prevent duplicate components

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
