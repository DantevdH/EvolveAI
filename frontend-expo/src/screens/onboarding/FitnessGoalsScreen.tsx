/**
 * Fitness Goals screen - Fourth step of onboarding
 */

import React, { useState, useEffect, useRef } from 'react';
import { ImageBackground, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector, OnboardingBackground } from '../../components/onboarding';
import { fitnessGoals } from '../../types/onboarding';
import { validateGoalDescription } from '../../utils/onboardingValidation';
import { useCoaches } from '../../context/CoachContext';

export const FitnessGoalsScreen: React.FC = () => {
  const { state, updateData, nextStep } = useOnboarding();
  const [validationError, setValidationError] = useState<string | null>(null);
  const { state: coachState, filterCoachesByGoal } = useCoaches();
  const previousGoalRef = useRef<string | null>(null);
  const [hasShownDescriptionPrompt, setHasShownDescriptionPrompt] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);


  // Auto-select first fitness goal if none is selected
  useEffect(() => {
    if (!state.data.primaryGoal && fitnessGoals.length > 0) {
      updateData({ primaryGoal: fitnessGoals[0].value });
    }
  }, [state.data.primaryGoal, updateData]);

  // Update available coaches when goal changes (static data - no loading needed)
  useEffect(() => {
    if (state.data.primaryGoal && coachState.allCoaches.length > 0) {
      // Only filter if the goal has actually changed
      if (previousGoalRef.current !== state.data.primaryGoal) {
        const matchingCoaches = filterCoachesByGoal(state.data.primaryGoal);
        const selectedCoachId = matchingCoaches.length > 0 ? matchingCoaches[0].id : undefined;
        
        updateData({ 
          availableCoaches: matchingCoaches,
          selectedCoachId: selectedCoachId
        });
        previousGoalRef.current = state.data.primaryGoal;
      }
    }
  }, [state.data.primaryGoal, coachState.allCoaches.length, filterCoachesByGoal, updateData]);

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

  const handleNext = () => {
    // Check if goal description is empty and we haven't shown the prompt yet
    if (!state.data.goalDescription?.trim() && !hasShownDescriptionPrompt) {
      setHasShownDescriptionPrompt(true);
      setShowDescriptionModal(true);
    } else {
      // If description exists or prompt was already shown, proceed normally
      nextStep();
    }
  };

  const handleSkipDescription = () => {
    setShowDescriptionModal(false);
    nextStep();
  };

  const handleAddDescription = () => {
    setShowDescriptionModal(false);
    // User can now fill in the description and proceed when ready
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
                  testID="goal-description-input"
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

          <OnboardingNavigation onNext={handleNext} />
        </OnboardingCard>

        {/* Custom Description Modal */}
        <Modal
          visible={showDescriptionModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowDescriptionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowDescriptionModal(false)}
            />
            <View style={styles.modalContainer}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Missing Goal Description</Text>
                <Text style={styles.modalSubtitle}>
                  You haven't described your specific fitness goals yet. Adding details will help our AI create a more personalized training plan for you.
                </Text>
                
                <Text style={styles.modalText}>
                  Would you like to add details about your fitness goals now?
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleSkipDescription}
                    activeOpacity={0.8}
                    testID="modal-skip-button"
                  >
                    <Text style={styles.modalButtonText}>Skip</Text>
                  </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={handleAddDescription}
                      activeOpacity={0.8}
                      testID="modal-add-info-button"
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                        Add Info
                      </Text>
                    </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
  // Modal styles - following React Native best practices
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    zIndex: 1001,
  },
  modalCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 100,
  },
  modalButtonPrimary: {
    backgroundColor: '#932322',
    borderColor: '#932322',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
  },
});
