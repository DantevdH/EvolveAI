/**
 * Navigation component for onboarding screens
 */

import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';;
import { useOnboarding, useOnboardingProgress } from '../../context/OnboardingContext';
import { colors } from '../../constants/designSystem';

interface OnboardingNavigationProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  nextText?: string;
  previousText?: string;
  completeText?: string;
  showProgress?: boolean;
  style?: any;
}

export const OnboardingNavigation: React.FC<OnboardingNavigationProps> = memo(({
  onNext,
  onPrevious,
  onComplete,
  nextText = 'Next',
  previousText = 'Back',
  completeText = 'Complete',
  showProgress = true,
  style
}) => {
  const { state, nextStep, previousStep, completeOnboarding } = useOnboarding();
  const { 
    currentStep, 
    totalSteps, 
    isFirstStep, 
    isLastStep, 
    canProceed, 
    canGoBack 
  } = useOnboardingProgress();

  const handleNext = async () => {
    if (onNext) {
      onNext();
    } else if (isLastStep) {
      if (onComplete) {
        onComplete();
      } else {
        await completeOnboarding();
      }
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      previousStep();
    }
  };

  const getButtonText = () => {
    if (isLastStep) {
      return completeText;
    }
    return nextText;
  };

  const isButtonDisabled = state.isLoading || (!canProceed && !isLastStep);

  return (
    <View style={[styles.container, style]}>
      {/* Progress Indicator */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep} of {totalSteps}
          </Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {/* Back Button */}
        {!isFirstStep && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.backButton,
              !canGoBack && styles.buttonDisabled
            ]}
            onPress={handlePrevious}
            disabled={!canGoBack || state.isLoading}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.buttonText,
              styles.backButtonText,
              !canGoBack && styles.buttonTextDisabled
            ]}>
              {previousText}
            </Text>
          </TouchableOpacity>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Next/Complete Button */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.nextButton,
            isButtonDisabled && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={isButtonDisabled}
          activeOpacity={0.8}
        >
          {state.isLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={[
              styles.buttonText,
              styles.nextButtonText,
              isButtonDisabled && styles.buttonTextDisabled
            ]}>
              {getButtonText()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}
    </View>
  );
});

// Compact version for smaller screens
interface CompactOnboardingNavigationProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  nextText?: string;
  previousText?: string;
  completeText?: string;
  style?: any;
}

export const CompactOnboardingNavigation: React.FC<CompactOnboardingNavigationProps> = memo(({
  onNext,
  onPrevious,
  onComplete,
  nextText = 'Next',
  previousText = 'Back',
  completeText = 'Complete',
  style
}) => {
  const { state, nextStep, previousStep, completeOnboarding } = useOnboarding();
  const { 
    currentStep, 
    totalSteps, 
    isFirstStep, 
    isLastStep, 
    canProceed, 
    canGoBack 
  } = useOnboardingProgress();

  const handleNext = async () => {
    if (onNext) {
      onNext();
    } else if (isLastStep) {
      if (onComplete) {
        onComplete();
      } else {
        await completeOnboarding();
      }
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      previousStep();
    }
  };

  const getButtonText = () => {
    if (isLastStep) {
      return completeText;
    }
    return nextText;
  };

  const isButtonDisabled = state.isLoading || (!canProceed && !isLastStep);

  return (
    <View style={[styles.compactContainer, style]}>
      <View style={styles.compactButtonContainer}>
        {/* Back Button */}
        {!isFirstStep && (
          <TouchableOpacity
            style={[
              styles.compactButton,
              styles.compactBackButton,
              !canGoBack && styles.buttonDisabled
            ]}
            onPress={handlePrevious}
            disabled={!canGoBack || state.isLoading}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.compactButtonText,
              styles.compactBackButtonText,
              !canGoBack && styles.buttonTextDisabled
            ]}>
              {previousText}
            </Text>
          </TouchableOpacity>
        )}

        {/* Next/Complete Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            styles.compactNextButton,
            isButtonDisabled && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={isButtonDisabled}
          activeOpacity={0.8}
        >
          {state.isLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={[
              styles.compactButtonText,
              styles.compactNextButtonText,
              isButtonDisabled && styles.buttonTextDisabled
            ]}>
              {getButtonText()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: colors.buttonSecondary,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.borderLight,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: colors.text,
  },
  nextButtonText: {
    color: colors.text,
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
  spacer: {
    flex: 1,
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primaryTransparentLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  // Compact styles
  compactContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  compactButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBackButton: {
    backgroundColor: colors.buttonSecondary,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  compactNextButton: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactBackButtonText: {
    color: colors.text,
  },
  compactNextButtonText: {
    color: colors.text,
  },
});
