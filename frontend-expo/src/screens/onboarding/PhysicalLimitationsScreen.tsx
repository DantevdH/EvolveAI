/**
 * Physical Limitations screen - Eighth step of onboarding
 */

import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    
    // Validate if "Yes" is selected
    if (state.data.hasLimitations) {
      const description = state.data.limitationsDescription || '';
      
      if (description.trim().length === 0) {
        setValidationErrors({ limitationsDescription: 'Please describe your limitations' });
        return;
      }
      
      if (description.trim().length < 100) {
        setValidationErrors({ 
          limitationsDescription: `Please provide more details about your limitations (at least 100 characters, currently ${description.trim().length} characters)` 
        });
        return;
      }
    }
    
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };
  // Check if Next button should be disabled (based on Swift logic)
  const isNextButtonDisabled = () => {
    // If "Yes" is selected, check if description meets requirements
    if (state.data.hasLimitations) {
      const description = state.data.limitationsDescription || '';
      return description.trim().length === 0 || description.trim().length < 100;
    }
    return false;
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
                testID="limitations-no-button"
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
                testID="limitations-yes-button"
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
                  placeholder="Describe your physical limitations, injuries, or conditions..."
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                  testID="limitations-description-input"
                />
                <View style={styles.countContainer}>
                  <Text style={[
                    styles.characterCount,
                    state.data.limitationsDescription.length >= 100 && styles.characterCountComplete,
                    state.data.limitationsDescription.length >= 80 && state.data.limitationsDescription.length < 100 && styles.characterCountWarning
                  ]}>
                    {state.data.limitationsDescription.length}/500 characters
                  </Text>
                  <Text style={[
                    styles.requirementText,
                    state.data.limitationsDescription.length >= 100 && styles.requirementComplete,
                    state.data.limitationsDescription.length >= 80 && state.data.limitationsDescription.length < 100 && styles.requirementWarning
                  ]}>
                    {state.data.limitationsDescription.length >= 100 ? '✓ Minimum met' : `Need ${100 - state.data.limitationsDescription.length} more characters`}
                  </Text>
                </View>
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
              testID="back-button"
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
              testID="next-button"
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
    marginBottom: 4,
  },
  requiredText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  textAreaError: {
    borderColor: colors.error,
    backgroundColor: colors.primaryTransparentLight,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
  },
  characterCountWarning: {
    color: colors.warning,
  },
  characterCountComplete: {
    color: colors.success,
  },
  requirementText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  requirementWarning: {
    color: colors.warning,
  },
  requirementComplete: {
    color: colors.success,
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
    justifyContent: 'space-between',
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
