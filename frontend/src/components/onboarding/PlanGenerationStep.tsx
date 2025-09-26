import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingCard } from './OnboardingCard';
import { OnboardingNavigation } from './OnboardingNavigation';
import { PlanGenerationStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { AnimatedSpinner, LoadingIndicator, AIChatMessage } from '../generatePlan';

export const PlanGenerationStep: React.FC<PlanGenerationStepProps> = ({
  isLoading,
  error,
  onRetry,
  aiHasQuestions = false,
  onContinueToQuestions,
  analysisPhase = null,
  username = 'there',
}) => {
  const [showButton, setShowButton] = useState(false);

  // Reset button visibility when aiHasQuestions changes
  useEffect(() => {
    if (aiHasQuestions) {
      setShowButton(false);
    }
  }, [aiHasQuestions]);

  if (error) {
    return (
      <OnboardingCard
        title="Plan Generation Failed"
        subtitle="We encountered an error while creating your plan"
        scrollable={true}
      >
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          
          <OnboardingNavigation
            onNext={onRetry}
            nextTitle="Try Again"
            showBack={false}
            variant="single"
          />
        </View>
      </OnboardingCard>
    );
  }

  // Show continue button when AI has questions ready
  if (aiHasQuestions) {
    const getButtonText = () => {
      switch (analysisPhase) {
        case 'initial':
          return "Let's Get Started";
        case 'followup':
          return "Continue";
        case 'generation':
          return "Generate My Plan";
        default:
          return "Continue";
      }
    };

    return (
      <OnboardingCard
        title=""
        subtitle=""
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={styles.chatContainer}>
            <AIChatMessage 
              key={`${analysisPhase}-${username}`}
              username={username}
              analysisPhase={analysisPhase}
              onTypingComplete={() => setShowButton(true)}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            {showButton && (
              <OnboardingNavigation
                onNext={onContinueToQuestions || (() => {})}
                nextTitle={getButtonText()}
                showBack={false}
                variant="single"
              />
            )}
          </View>
        </View>
      </OnboardingCard>
    );
  }

  const getLoadingContent = () => {
    switch (analysisPhase) {
      case 'initial':
        return {
          description: "Our AI coach is reviewing your fitness goals and personal information..."
        };
      case 'followup':
        return {
          description: "Our AI coach is reviewing your previous answers to identify key areas that need further exploration for your personalized plan."
        };
      case 'generation':
        return {
          description: "Our AI coach is combining all your information and preferences to create a completely personalized workout plan just for you."
        };
      default:
        return {
          description: "Please wait while our AI coach processes your information."
        };
    }
  };

  const loadingContent = getLoadingContent();

  return (
    <OnboardingCard
      title=""
      subtitle=""
      scrollable={true}
    >
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedSpinner coachName="AI Coach" />
          <LoadingIndicator 
            isLoading={true} 
            message={loadingContent.description}
          />
        </View>
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    position: 'absolute',
    top: 60, // Fixed vertical position from top
    left: 0,
    right: 0,
    bottom: 120, // Leave space for button at bottom
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});
