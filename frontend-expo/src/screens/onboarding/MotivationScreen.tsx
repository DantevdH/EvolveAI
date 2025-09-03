/**
 * Motivation screen - Ninth step of onboarding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector } from '../../components/onboarding';
import { validateMotivationLevel } from '../../utils/onboardingValidation';
import { getMotivationLevels } from '../../utils/onboardingUtils';
import { colors } from '../../constants/colors';

export const MotivationScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
  const [validationError, setValidationError] = useState<string | null>(null);

  const motivationOptions = getMotivationLevels();

  const handleMotivationChange = (values: string[]) => {
    setValidationError(null);
    if (values.length > 0) {
      updateData({ motivationLevel: values[0] as any });
    }
  };

  const handleNext = () => {
    // Validate motivation level
    const validation = validateMotivationLevel(state.data.motivationLevel);
    if (!validation.isValid) {
      setValidationError(validation.error!);
      return;
    }

    // Clear any existing errors
    setValidationError(null);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
        <OnboardingCard
          title="What Motivates You?"
          subtitle="Understanding your motivation helps us create a plan that keeps you engaged"
        >
          <View style={styles.content}>
            <OptionSelector
              options={motivationOptions}
              selectedValues={state.data.motivationLevel ? [state.data.motivationLevel] : []}
              onSelectionChange={handleMotivationChange}
              layout="list"
              allowMultiple={false}
            />

            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}
          </View>

          <OnboardingNavigation onNext={handleNext} />
        </OnboardingCard>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
});
