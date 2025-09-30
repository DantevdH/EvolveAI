import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimatedSpinner } from '../generatePlan/AnimatedSpinner';
import { AIChatMessage } from '../generatePlan/AIChatMessage';
import { LoadingIndicator } from '../generatePlan/LoadingIndicator';
import { OnboardingCard } from '../onboarding/OnboardingCard';
import { OnboardingNavigation } from '../onboarding/OnboardingNavigation';

interface AILoadingScreenProps {
  username?: string;
  analysisPhase?: 'initial' | 'followup' | 'outline' | 'generation' | null;
  customMessage?: string;
  coachName?: string;
  onContinue?: () => void;
  showContinueButton?: boolean;
}

/**
 * Universal AI Loading Screen
 * Shows AI chat message with animated spinner for any AI processing step
 * Matches the exact layout of PlanGenerationStep
 */
export const AILoadingScreen: React.FC<AILoadingScreenProps> = ({
  username = 'there',
  analysisPhase = null,
  customMessage,
  coachName = 'AI Coach',
  onContinue,
  showContinueButton = false,
}) => {
  const [showButton, setShowButton] = useState(false);

  // Show button after typing completes
  const handleTypingComplete = useCallback(() => {
    setShowButton(true);
  }, []);

  const getButtonText = () => {
    switch (analysisPhase) {
      case 'initial':
        return "Let's Get Started";
      case 'followup':
        return "Continue";
      case 'outline':
        return "Review Plan Outline";
      case 'generation':
        return "Generate My Plan";
      default:
        return "Continue";
    }
  };

  const getLoadingDescription = () => {
    switch (analysisPhase) {
      case 'initial':
        return "Our AI coach is reviewing your fitness goals and personal information...";
      case 'followup':
        return "Our AI coach is analyzing your responses to create personalized follow-up questions...";
      case 'outline':
        return "Our AI coach is crafting your personalized training plan outline...";
      case 'generation':
        return "Our AI coach is creating your complete personalized workout plan...";
      default:
        return "Please wait while our AI coach processes your information.";
    }
  };

  // If we want to show the chat message with optional continue button
  if (showContinueButton) {
    return (
      <OnboardingCard
        title=""
        subtitle=""
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={styles.chatContainer}>
            <AIChatMessage 
              username={username}
              analysisPhase={analysisPhase}
              customMessage={customMessage}
              onTypingComplete={handleTypingComplete}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            {showButton && onContinue && (
              <OnboardingNavigation
                onNext={onContinue}
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

  // Default: Show loading spinner
  return (
    <OnboardingCard
      title=""
      subtitle=""
      scrollable={true}
    >
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedSpinner coachName={coachName} />
          <LoadingIndicator 
            isLoading={true} 
            message={getLoadingDescription()}
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
});
