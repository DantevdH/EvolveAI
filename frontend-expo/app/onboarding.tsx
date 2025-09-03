import React from 'react';
import { OnboardingProvider } from '@/src/context/OnboardingContext';
import { OnboardingFlow } from '@/src/screens/onboarding/OnboardingFlow';

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
