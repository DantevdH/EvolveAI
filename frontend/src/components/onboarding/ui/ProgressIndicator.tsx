/**
 * Progress indicator component for onboarding steps
 */

import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../constants/designSystem';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  showStepNumbers?: boolean;
  showPercentage?: boolean;
  thick?: boolean;
  style?: any;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  showStepNumbers = true,
  showPercentage = false,
  thick = false,
  style
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;
  
  const progressWidth = (currentStep / totalSteps) * 100;

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, thick && styles.progressBarBackgroundThick]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              thick && styles.progressBarFillThick,
              { width: `${progressWidth}%` }
            ]}
          />
        </View>
        
        {/* Step Numbers */}
        {showStepNumbers && (
          <View style={styles.stepNumbersContainer}>
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              return (
                <View
                  key={stepNumber}
                  style={[
                    styles.stepNumber,
                    isCompleted && styles.stepNumberCompleted,
                    isCurrent && styles.stepNumberCurrent
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumberText,
                      isCompleted && styles.stepNumberTextCompleted,
                      isCurrent && styles.stepNumberTextCurrent
                    ]}
                  >
                    {stepNumber}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      
      {/* Progress Text */}
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressText}>
          Question {currentStep} of {totalSteps}
        </Text>
        {showPercentage && (
          <Text style={styles.percentageText}>
            {progressPercentage}% Complete
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarBackgroundThick: {
    height: 8,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressBarFillThick: {
    borderRadius: 4,
  },
  stepNumbersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberCompleted: {
    backgroundColor: colors.primary,
  },
  stepNumberCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.muted,
  },
  stepNumberTextCompleted: {
    color: colors.text,
  },
  stepNumberTextCurrent: {
    color: colors.text,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
