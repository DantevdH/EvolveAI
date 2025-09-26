/**
 * Navigation Helper Utilities
 */

import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

// Navigation reference type
export type NavigationRef = NavigationContainerRef<RootStackParamList>;

// Navigation reference (will be set by AppNavigator)
let navigationRef: NavigationRef | null = null;

/**
 * Set the navigation reference
 */
export const setNavigationRef = (ref: NavigationRef | null) => {
  navigationRef = ref;
};

/**
 * Navigate to a specific screen
 */
export const navigate = (name: keyof RootStackParamList, params?: any) => {
  if (navigationRef?.isReady()) {
    navigationRef.navigate(name, params);
  }
};

/**
 * Reset navigation stack to a specific screen
 */
export const resetToScreen = (name: keyof RootStackParamList, params?: any) => {
  if (navigationRef?.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params }],
      })
    );
  }
};

/**
 * Go back to previous screen
 */
export const goBack = () => {
  if (navigationRef?.canGoBack()) {
    navigationRef.goBack();
  }
};

/**
 * Check if navigation is ready
 */
export const isNavigationReady = (): boolean => {
  return navigationRef?.isReady() ?? false;
};

/**
 * Get current route name
 */
export const getCurrentRouteName = (): string | undefined => {
  return navigationRef?.getCurrentRoute()?.name;
};

/**
 * Navigation state helpers
 */
export const NavigationState = {
  /**
   * Navigate to auth flow
   */
  goToAuth: () => resetToScreen('Auth'),
  
  /**
   * Navigate to onboarding flow
   */
  goToOnboarding: () => resetToScreen('Onboarding'),
  
  /**
   * Navigate to main app
   */
  goToMain: () => resetToScreen('Main'),
  
  /**
   * Navigate to loading screen
   */
  goToLoading: () => resetToScreen('Loading'),
};

/**
 * Deep linking helpers
 */
export const DeepLinkHandlers = {
  /**
   * Handle email verification deep link
   */
  handleEmailVerification: (token: string) => {
    // Navigate to email verification screen with token
    navigate('Auth', { 
      screen: 'EmailVerification', 
      params: { token } 
    });
  },
  
  /**
   * Handle password reset deep link
   */
  handlePasswordReset: (token: string) => {
    // Navigate to password reset screen with token
    navigate('Auth', { 
      screen: 'ResetPassword', 
      params: { token } 
    });
  },
  
  /**
   * Handle workout deep link
   */
  handleWorkout: (workoutId: string) => {
    // Navigate to specific workout
    navigate('Main', { 
      screen: 'WorkoutTab', 
      params: { 
        screen: 'WorkoutDetail', 
        params: { workoutId } 
      } 
    });
  },
};

/**
 * Navigation analytics helpers
 */
export const NavigationAnalytics = {
  /**
   * Track screen view
   */
  trackScreenView: (screenName: string, params?: any) => {
    // Implement analytics tracking here
    console.log(`Screen View: ${screenName}`, params);
  },
  
  /**
   * Track navigation action
   */
  trackNavigationAction: (action: string, from: string, to: string) => {
    // Implement analytics tracking here
    console.log(`Navigation: ${action} from ${from} to ${to}`);
  },
};
