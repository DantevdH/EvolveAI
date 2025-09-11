/**
 * Custom render function with providers for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '../../context/AuthContext';
import { OnboardingProvider } from '../../context/OnboardingContext';
import { CoachProvider } from '../../context/CoachContext';
import { AppProvider } from '../../context/AppContext';

// Custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <CoachProvider>
        <AppProvider>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </AppProvider>
      </CoachProvider>
    </AuthProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };

// Helper function to render with specific providers
export const renderWithAuth = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return render(ui, { wrapper: AuthWrapper, ...options });
};

export const renderWithOnboarding = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const OnboardingWrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider>{children}</OnboardingProvider>
  );
  return render(ui, { wrapper: OnboardingWrapper, ...options });
};
