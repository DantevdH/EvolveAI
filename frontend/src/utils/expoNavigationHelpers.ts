/**
 * Expo Router Navigation Helpers
 */

import { router } from 'expo-router';

/**
 * Navigation helpers for Expo Router
 */
export const ExpoNavigation = {
  /**
   * Navigate to login screen
   */
  goToLogin: () => router.replace('/login'),
  
  /**
   * Navigate to signup screen
   */
  goToSignup: () => router.push('/signup'),
  
  /**
   * Navigate to onboarding
   */
  goToOnboarding: () => router.replace('/onboarding'),
  
  /**
   * Navigate to generate plan
   */
  goToGeneratePlan: (profileData?: string) => {
    if (profileData) {
      router.push({
        pathname: '/generate-plan',
        params: { profileData },
      });
    } else {
      router.push('/generate-plan');
    }
  },
  
  /**
   * Navigate to main app (tabs)
   */
  goToMain: () => router.replace('/(tabs)'),
  
  /**
   * Navigate to home tab
   */
  goToHome: () => router.push('/(tabs)'),
  
  /**
   * Navigate to trainings tab (Journey)
   */
  goToTrainings: () => router.push('/(tabs)'),
  
  /**
   * Navigate to profile tab
   */
  goToProfile: () => router.push('/(tabs)/profile'),
  
  /**
   * Navigate to forgot password
   */
  goToForgotPassword: () => router.push('/forgot-password'),
  
  /**
   * Navigate to reset password
   */
  goToResetPassword: (token?: string) => {
    if (token) {
      router.push({
        pathname: '/reset-password',
        params: { token },
      });
    } else {
      router.push('/reset-password');
    }
  },
  
  /**
   * Navigate to email verification
   */
  goToEmailVerification: (email?: string) => {
    if (email) {
      router.push({
        pathname: '/email-verification',
        params: { email },
      });
    } else {
      router.push('/email-verification');
    }
  },
  
  /**
   * Go back to previous screen
   */
  goBack: () => router.back(),
  
  /**
   * Navigate to a specific route
   */
  navigate: (route: string, params?: Record<string, any>) => {
    if (params) {
      router.push({
        pathname: route,
        params,
      });
    } else {
      router.push(route);
    }
  },
  
  /**
   * Replace current route
   */
  replace: (route: string, params?: Record<string, any>) => {
    if (params) {
      router.replace({
        pathname: route,
        params,
      });
    } else {
      router.replace(route);
    }
  },
};
