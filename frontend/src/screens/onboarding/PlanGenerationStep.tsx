import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { PlanGenerationStepProps } from '../../types/onboarding';
import { AnimatedSpinner } from '../../components/generatePlan/AnimatedSpinner';
import { LoadingIndicator } from '../../components/generatePlan/LoadingIndicator';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

export const PlanGenerationStep: React.FC<PlanGenerationStepProps> = ({
  isLoading,
  error,
  onRetry,
  onStartGeneration,
  username = 'there',
}) => {
  // Auto-start moved back to ConversationalOnboarding to avoid timing issues

  console.log('📊 PlanGenerationStep render:', { isLoading, hasError: !!error, error });

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
});
