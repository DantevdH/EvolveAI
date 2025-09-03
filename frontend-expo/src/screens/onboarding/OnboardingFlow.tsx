/**
 * Main onboarding flow component that handles step navigation
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { GeneratePlanScreen } from '../GeneratePlanScreen';
import {
  WelcomeScreen,
  PersonalInfoScreen,
  ExperienceLevelScreen,
  FitnessGoalsScreen,
  EquipmentAccessScreen,
  TimeAvailabilityScreen,
  PhysicalLimitationsScreen,
  MotivationScreen,
  OnboardingCompleteScreen,
} from './index';

export const OnboardingFlow: React.FC = () => {
  const { state } = useOnboarding();

  // Show GeneratePlanScreen if we're generating a plan
  if (state.isGeneratingPlan) {
    return <GeneratePlanScreen />;
  }

  const renderCurrentStep = () => {
    switch (state.progress.currentStep) {
      case 0:
        return <WelcomeScreen />;
      case 1:
        return <PersonalInfoScreen />;
      case 2:
        return <ExperienceLevelScreen />;
      case 3:
        return <FitnessGoalsScreen />;
      case 4:
        return <EquipmentAccessScreen />;
      case 5:
        return <TimeAvailabilityScreen />;
      case 6:
        return <PhysicalLimitationsScreen />;
      case 7:
        return <MotivationScreen />;
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
