/**
 * Deep Linking Utilities
 */

import * as Linking from 'expo-linking';
import { DeepLinkHandlers } from './navigationHelpers';

// URL scheme configuration
export const URL_SCHEME = 'evolveai';
export const DOMAIN = 'evolveai.app';

// Deep link patterns
export const DEEP_LINK_PATTERNS = {
  EMAIL_VERIFICATION: `${URL_SCHEME}://auth/verify-email`,
  PASSWORD_RESET: `${URL_SCHEME}://auth/reset-password`,
  WORKOUT: `${URL_SCHEME}://workout`,
  PROFILE: `${URL_SCHEME}://profile`,
  ONBOARDING: `${URL_SCHEME}://onboarding`,
} as const;

/**
 * Parse deep link URL and extract parameters
 */
export const parseDeepLink = (url: string) => {
  try {
    const parsed = Linking.parse(url);
    return {
      scheme: parsed.scheme,
      hostname: parsed.hostname,
      path: parsed.path,
      queryParams: parsed.queryParams,
      success: true,
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Handle incoming deep link
 */
export const handleDeepLink = (url: string) => {
  const parsed = parseDeepLink(url);
  
  if (!parsed.success) {
    console.error('Failed to parse deep link:', parsed.error);
    return;
  }

  const { scheme, hostname, path, queryParams } = parsed;

  // Verify URL scheme
  if (scheme !== URL_SCHEME) {
    console.warn('Invalid URL scheme:', scheme);
    return;
  }

  // Route based on hostname and path
  switch (hostname) {
    case 'auth':
      handleAuthDeepLink(path, queryParams);
      break;
    case 'workout':
      handleWorkoutDeepLink(path, queryParams);
      break;
    case 'profile':
      handleProfileDeepLink(path, queryParams);
      break;
    case 'onboarding':
      handleOnboardingDeepLink(path, queryParams);
      break;
    default:
      console.warn('Unknown deep link hostname:', hostname);
  }
};

/**
 * Handle authentication deep links
 */
const handleAuthDeepLink = (path: string | null, queryParams: any) => {
  switch (path) {
    case '/verify-email':
      if (queryParams?.token) {
        DeepLinkHandlers.handleEmailVerification(queryParams.token);
      }
      break;
    case '/reset-password':
      if (queryParams?.token) {
        DeepLinkHandlers.handlePasswordReset(queryParams.token);
      }
      break;
    default:
      console.warn('Unknown auth deep link path:', path);
  }
};

/**
 * Handle workout deep links
 */
const handleWorkoutDeepLink = (path: string | null, queryParams: any) => {
  switch (path) {
    case '/':
      if (queryParams?.id) {
        DeepLinkHandlers.handleWorkout(queryParams.id);
      }
      break;
    default:
      console.warn('Unknown workout deep link path:', path);
  }
};

/**
 * Handle profile deep links
 */
const handleProfileDeepLink = (path: string | null, queryParams: any) => {
  // Implement profile deep link handling
  console.log('Profile deep link:', path, queryParams);
};

/**
 * Handle onboarding deep links
 */
const handleOnboardingDeepLink = (path: string | null, queryParams: any) => {
  // Implement onboarding deep link handling
  console.log('Onboarding deep link:', path, queryParams);
};

/**
 * Generate deep link URL
 */
export const generateDeepLink = (
  hostname: string,
  path: string = '/',
  queryParams: Record<string, string> = {}
): string => {
  const baseUrl = `${URL_SCHEME}://${hostname}${path}`;
  
  if (Object.keys(queryParams).length === 0) {
    return baseUrl;
  }
  
  const searchParams = new URLSearchParams(queryParams);
  return `${baseUrl}?${searchParams.toString()}`;
};

/**
 * Generate email verification link
 */
export const generateEmailVerificationLink = (token: string): string => {
  return generateDeepLink('auth', '/verify-email', { token });
};

/**
 * Generate password reset link
 */
export const generatePasswordResetLink = (token: string): string => {
  return generateDeepLink('auth', '/reset-password', { token });
};

/**
 * Generate workout link
 */
export const generateWorkoutLink = (workoutId: string): string => {
  return generateDeepLink('workout', '/', { id: workoutId });
};

/**
 * Initialize deep linking
 */
export const initializeDeepLinking = () => {
  // Handle initial URL if app was opened via deep link
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle subsequent deep links while app is running
  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });

  return () => {
    subscription?.remove();
  };
};
