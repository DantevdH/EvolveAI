/**
 * Fitness Goals screen - Fourth step of onboarding
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ImageBackground } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector } from '../../components/onboarding';
import { fitnessGoals } from '../../types/onboarding';
import { validateGoalDescription } from '../../utils/onboardingValidation';

export const FitnessGoalsScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleGoalChange = (values: string[]) => {
    if (values.length > 0) {
      updateData({ primaryGoal: values[0] });
      setValidationError(null);
    }
  };

  const handleDescriptionChange = (description: string) => {
    updateData({ goalDescription: description });
    
    // Validate description
    const validation = validateGoalDescription(description);
    if (!validation.isValid) {
      setValidationError(validation.error!);
    } else {
      setValidationError(null);
    }
  };

  const options = fitnessGoals.map(goal => ({
    value: goal.value,
    title: goal.title,
    description: goal.description,
    icon: goal.icon
  }));

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
        <OnboardingCard
          title="Fitness Goals"
          subtitle="What do you want to achieve?"
          scrollable={true}
        >
          <View style={styles.content}>
            {/* Goal Selection */}
            <View style={styles.section}>
              <OptionSelector
                options={options}
                selectedValues={state.data.primaryGoal ? [state.data.primaryGoal] : []}
                onSelectionChange={handleGoalChange}
                multiple={false}
                columns={2}
              />
            </View>

            {/* Goal Description */}
            {state.data.primaryGoal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Describe your goal (optional)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    validationError && styles.textInputError
                  ]}
                  value={state.data.goalDescription}
                  onChangeText={handleDescriptionChange}
                  placeholder="e.g., 'Run a 5k without stopping' or 'Lose 20 pounds'"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                
                {validationError && (
                  <Text style={styles.errorText}>{validationError}</Text>
                )}
                
                <Text style={styles.characterCount}>
                  {state.data.goalDescription.length}/500 characters
                </Text>
              </View>
            )}
          </View>

          <OnboardingNavigation />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  textInputError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
    marginTop: 4,
  },
});
