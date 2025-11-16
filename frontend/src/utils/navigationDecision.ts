import type { AppRoutingState } from '../hooks/useAppRouting';

export interface NavigationDecision {
  shouldNavigate: boolean;
  nextRoute: string | null;
  params?: any;
}

/**
 * Pure helper to decide if navigation should occur from the root index screen.
 *
 * This isolates decision logic from React Native / Expo specifics so it can be
 * tested easily without touching the runtime environment.
 */
export const decideNavigation = (
  lastRoute: string | null,
  routingState: Pick<AppRoutingState, 'targetRoute' | 'routingReason' | 'skipLoaders'>
): NavigationDecision => {
  const { targetRoute, skipLoaders } = routingState;

  // No target → no navigation
  if (!targetRoute) {
    return {
      shouldNavigate: false,
      nextRoute: null,
    };
  }

  // Avoid redundant navigation to the same route
  if (lastRoute === targetRoute) {
    return {
      shouldNavigate: false,
      nextRoute: lastRoute,
    };
  }

  // Special case: onboarding resume with skipLoaders flag
  if (skipLoaders && targetRoute === '/onboarding') {
    return {
      shouldNavigate: true,
      nextRoute: targetRoute,
      params: { pathname: targetRoute, params: { resume: 'true' } },
    };
  }

  // Default: navigate to targetRoute as a simple string path
  return {
    shouldNavigate: true,
    nextRoute: targetRoute,
  };
};


