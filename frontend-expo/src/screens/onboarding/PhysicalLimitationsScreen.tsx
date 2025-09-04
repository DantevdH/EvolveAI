/**
 * Physical Limitations screen - Eighth step of onboarding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingBackground } from '../../components/onboarding';
import { colors } from '../../constants/designSystem';

export const PhysicalLimitationsScreen: React.FC = () => {
  const { state, updateData, nextStep, previousStep } = useOnboarding();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleLimitationsToggle = (hasLimitations: boolean) => {
    setValidationErrors({});
    updateData({ 
      hasLimitations,
      limitationsDescription: hasLimitations ? state.data.limitationsDescription : ''
    });
  };

  const handleDescriptionChange = (text: string) => {
    setValidationErrors({});
    updateData({ limitationsDescription: text });
  };

  const handleNext = () => {
    // Clear any existing errors
    setValidationErrors({});
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  // Check if Next button should be disabled (based on Swift logic)
  const isNextButtonDisabled = () => {
    // If "Yes" is selected but no description is provided, disable the button
    return state.data.hasLimitations && state.data.limitationsDescription.trim().length === 0;
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />
        
        <OnboardingCard
          title="Physical Limitations"
          subtitle="Do you have any injuries or physical limitations we should be aware of?"
        >
          <View style={styles.content}>
            {/* Yes/No Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !state.data.hasLimitations && styles.toggleButtonSelected
                ]}
                onPress={() => handleLimitationsToggle(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !state.data.hasLimitations && styles.toggleButtonTextSelected
                ]}>
                  No
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  state.data.hasLimitations && styles.toggleButtonSelected
                ]}
                onPress={() => handleLimitationsToggle(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  state.data.hasLimitations && styles.toggleButtonTextSelected
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>

            {validationErrors.hasLimitations && (
              <Text style={styles.errorText}>{validationErrors.hasLimitations}</Text>
            )}

            {/* Description Input (conditional) */}
            {state.data.hasLimitations && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.inputLabel}>Please describe your limitations</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    validationErrors.limitationsDescription && styles.textAreaError
                  ]}
                  value={state.data.limitationsDescription}
                  onChangeText={handleDescriptionChange}
                  placeholder="e.g., 'Bad lower back', 'Recovering from a knee injury'"
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {state.data.limitationsDescription.length}/300
                </Text>
                {validationErrors.limitationsDescription && (
                  <Text style={styles.errorText}>{validationErrors.limitationsDescription}</Text>
                )}
              </View>
            )}
          </View>

          {/* Custom Navigation */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevious}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextButton,
                isNextButtonDisabled() && styles.nextButtonDisabled
              ]}
              onPress={handleNext}
              disabled={isNextButtonDisabled()}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.nextButtonText,
                isNextButtonDisabled() && styles.nextButtonTextDisabled
              ]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </OnboardingCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  toggleButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  toggleButtonTextSelected: {
    color: colors.text,
  },
  descriptionContainer: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textAreaError: {
    borderColor: colors.error,
    backgroundColor: colors.primaryTransparentLight,
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  // Custom Navigation Styles
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  backButton: {
    backgroundColor: colors.buttonSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 12,
  },
  nextButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.borderLight,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButtonTextDisabled: {
    color: colors.muted,
  },
});
