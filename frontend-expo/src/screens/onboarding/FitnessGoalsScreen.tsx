/**
 * Fitness Goals screen - Fourth step of onboarding
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ImageBackground } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector, OnboardingBackground } from '../../components/onboarding';
import { fitnessGoals } from '../../types/onboarding';
import { validateGoalDescription } from '../../utils/onboardingValidation';
import { useCoaches } from '../../hooks/useCoaches';

export const FitnessGoalsScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
  const [validationError, setValidationError] = useState<string | null>(null);
  const { allCoaches, availableCoaches, isLoading: isLoadingCoaches, filterCoachesByGoal } = useCoaches();
  const previousGoalRef = useRef<string | null>(null);

  // Log available frontend goals for debugging
  useEffect(() => {
    console.log('🎯 Available frontend goals:');
    fitnessGoals.forEach((goal, index) => {
      console.log(`  ${index + 1}. "${goal.value}"`);
    });
  }, []);

  // Auto-select first fitness goal if none is selected
  useEffect(() => {
    if (!state.data.primaryGoal && fitnessGoals.length > 0) {
      updateData({ primaryGoal: fitnessGoals[0].value });
    }
  }, [state.data.primaryGoal, updateData]);

  // Update available coaches when goal changes (only when we have coaches and a valid goal)
  useEffect(() => {
    if (state.data.primaryGoal && allCoaches.length > 0 && !isLoadingCoaches) {
      // Only filter if the goal has actually changed
      if (previousGoalRef.current !== state.data.primaryGoal) {
        filterCoachesByGoal(state.data.primaryGoal);
        updateData({ availableCoaches });
        previousGoalRef.current = state.data.primaryGoal;
        console.log(`✅ Found ${availableCoaches.length} coaches for goal: ${state.data.primaryGoal}`);
      }
    }
  }, [state.data.primaryGoal, allCoaches.length, isLoadingCoaches, availableCoaches]); // Removed updateData from dependencies

  const handleGoalChange = (values: string[]) => {
    if (values.length > 0) {
      const selectedGoal = values[0];
      updateData({ primaryGoal: selectedGoal });
      setValidationError(null);
      
      // Coaches will be updated automatically via useEffect
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
      <OnboardingBackground />
        
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
              
              {/* Loading indicator for coaches */}
              {isLoadingCoaches && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading coaches...</Text>
                </View>
              )}
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
  loadingContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
});
