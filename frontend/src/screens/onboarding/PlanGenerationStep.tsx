import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { PlanGenerationStepProps } from '../../types/onboarding';
import { AnimatedSpinner } from '../../components/generatePlan/AnimatedSpinner';
import { LoadingIndicator } from '../../components/generatePlan/LoadingIndicator';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { colors } from '../../constants/colors';

export const PlanGenerationStep: React.FC<PlanGenerationStepProps> = ({
  isLoading,
  error,
  onRetry,
  onStartGeneration,
  username = 'there',
  isCompleted = false,
  completionMessage,
  onContinue,
  onViewPlan,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showButtons, setShowButtons] = useState(false);

  // Auto-start moved back to ConversationalOnboarding to avoid timing issues

  console.log('📊 PlanGenerationStep render:', { isLoading, hasError: !!error, error, isCompleted });

  // Handle completion message typing effect
  useEffect(() => {
    if (isCompleted && completionMessage) {
      let currentIndex = 0;
      const typeText = () => {
        if (currentIndex < completionMessage.length) {
          setDisplayedText(completionMessage.slice(0, currentIndex + 1));
          currentIndex++;
          setTimeout(typeText, 30);
        } else {
          // Show buttons after typing is complete
          setTimeout(() => {
            setShowButtons(true);
          }, 500);
        }
      };

      // Start typing after a short delay
      setTimeout(typeText, 300);
    }
  }, [isCompleted, completionMessage]);


  if (error) {
    return (
      <OnboardingCard
        title="Plan Generation Failed"
        subtitle="We encountered an error while creating your plan"
        scrollable={true}
      >
        <View style={styles.container}>
          <ErrorDisplay
            error={error}
            onRetry={onStartGeneration || onRetry}
            variant="server"
            showRetry={true}
          />
        </View>
      </OnboardingCard>
    );
  }

  // Show completion message when plan is generated
  if (isCompleted && completionMessage) {
    return (
      <OnboardingCard scrollable={true}>
        <View style={styles.completionContainer}>
          {/* AI Avatar */}
          <View style={styles.avatar}>
            <Ionicons name="bulb" size={32} color="white" />
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              {displayedText}
              {displayedText.length < completionMessage.length && (
                <Text style={styles.cursor}>|</Text>
              )}
            </Text>
          </View>

          {/* Action Buttons */}
          {showButtons && (
            <View style={styles.buttonContainer}>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={onViewPlan}>
                  <Ionicons name="eye" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>View Plan</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton} onPress={onContinue}>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </OnboardingCard>
    );
  }

  // Always show loading spinner while generating
  return (
    <OnboardingCard scrollable={true}>
      <View style={styles.loadingContainer}>
        <AnimatedSpinner coachName="AI Coach" />
        <LoadingIndicator 
          isLoading={true} 
          message="Creating your personalized training plan..." 
        />
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
