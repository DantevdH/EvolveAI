/**
 * Physical Limitations screen - Eighth step of onboarding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, TextInput } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding';
import { validateHasLimitations, validateLimitationsDescription } from '../../utils/onboardingValidation';
import { colors } from '../../constants/colors';

export const PhysicalLimitationsScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
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
    // Validate limitations
    const hasLimitationsValidation = validateHasLimitations(state.data.hasLimitations);
    if (!hasLimitationsValidation.isValid) {
      setValidationErrors({ hasLimitations: hasLimitationsValidation.error! });
      return;
    }

    if (state.data.hasLimitations) {
      const descriptionValidation = validateLimitationsDescription(state.data.limitationsDescription);
      if (!descriptionValidation.isValid) {
        setValidationErrors({ limitationsDescription: descriptionValidation.error! });
        return;
      }
    }

    // Clear any existing errors
    setValidationErrors({});
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
});
