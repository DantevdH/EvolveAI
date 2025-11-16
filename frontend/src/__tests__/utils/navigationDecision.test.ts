import { decideNavigation } from '../../utils/navigationDecision';
import type { AppRoutingState } from '../../hooks/useAppRouting';

type RoutingSlice = Pick<AppRoutingState, 'targetRoute' | 'routingReason' | 'skipLoaders'>;

const makeRoutingState = (overrides: Partial<RoutingSlice> = {}): RoutingSlice => ({
  targetRoute: null,
  routingReason: 'Test',
  skipLoaders: false,
  ...overrides,
});

describe('decideNavigation', () => {
  test('returns no navigation when there is no targetRoute', () => {
    const decision = decideNavigation(null, makeRoutingState({ targetRoute: null }));
    expect(decision.shouldNavigate).toBe(false);
    expect(decision.nextRoute).toBeNull();
  });

  test('avoids redundant navigation to the same route', () => {
    const decision = decideNavigation('/onboarding', makeRoutingState({ targetRoute: '/onboarding' }));
    expect(decision.shouldNavigate).toBe(false);
    expect(decision.nextRoute).toBe('/onboarding');
  });

  test('navigates with resume params for onboarding when skipLoaders is true', () => {
    const decision = decideNavigation(
      null,
      makeRoutingState({ targetRoute: '/onboarding', skipLoaders: true }),
    );

    expect(decision.shouldNavigate).toBe(true);
    expect(decision.nextRoute).toBe('/onboarding');
    expect(decision.params).toEqual({
      pathname: '/onboarding',
      params: { resume: 'true' },
    });
  });

  test('navigates normally for non-onboarding routes even when skipLoaders is true', () => {
    const decision = decideNavigation(
      null,
      makeRoutingState({ targetRoute: '/generate-plan', skipLoaders: true }),
    );

    expect(decision.shouldNavigate).toBe(true);
    expect(decision.nextRoute).toBe('/generate-plan');
    expect(decision.params).toBeUndefined();
  });

  test('navigates normally when skipLoaders is false', () => {
    const decision = decideNavigation(
      null,
      makeRoutingState({ targetRoute: '/(tabs)', skipLoaders: false }),
    );

    expect(decision.shouldNavigate).toBe(true);
    expect(decision.nextRoute).toBe('/(tabs)');
    expect(decision.params).toBeUndefined();
  });
});


