import { renderHook } from '@testing-library/react-native';
import { useAppRouting } from '../../../src/hooks/useAppRouting';

// Mock expo-router pathname
jest.mock('expo-router', () => ({
  usePathname: jest.fn(() => '/'),
}));

// Mock useAuth to control state in each test
jest.mock('../../../src/context/AuthContext', () => {
  const mockStateRef: { current: any } = { current: {} };
  return {
    useAuth: () => ({ state: mockStateRef.current }),
    __setMockAuthState: (s: any) => { mockStateRef.current = s; },
  };
});

// Mock logger to avoid noise
jest.mock('../../../src/utils/logger', () => ({
  logDebug: jest.fn(),
}));

// Helper to set mock auth state
const setAuthState = (state: any) => {
  const { __setMockAuthState } = require('../../../src/context/AuthContext');
  __setMockAuthState(state);
};

const baseState = {
  user: null,
  session: null,
  userProfile: null,
  trainingPlan: null,
  isLoading: false,
  trainingPlanLoading: false,
  profileLoading: false,
  error: null,
};

describe('useAppRouting', () => {
  test('shows loading when global auth isLoading', () => {
    setAuthState({ ...baseState, isLoading: true });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.targetRoute).toBeNull();
  });

  test('post-auth unified gate: waits on profileLoading', () => {
    setAuthState({ ...baseState, user: { id: 'u1' }, profileLoading: true });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.targetRoute).toBeNull();
  });

  test('post-auth unified gate: waits on trainingPlanLoading', () => {
    setAuthState({ ...baseState, user: { id: 'u1' }, trainingPlanLoading: true });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.targetRoute).toBeNull();
  });

  test('unauthenticated routes to /login', () => {
    setAuthState({ ...baseState });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.targetRoute).toBe('/login');
  });

  test('OAuth unverified routes to /email-verification', () => {
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: null, app_metadata: { provider: 'google' } },
    });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.targetRoute).toBe('/email-verification');
  });

  test('no profile or no initial questions -> /onboarding', () => {
    // No profile
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
    });
    let hook = renderHook(() => useAppRouting());
    expect(hook.result.current.targetRoute).toBe('/onboarding');
    // Profile with zero questions
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
      userProfile: { initial_questions: [] }
    });
    hook = renderHook(() => useAppRouting());
    expect(hook.result.current.targetRoute).toBe('/onboarding');
  });

  test('has questions but no responses -> /onboarding/initial-questions', () => {
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
      userProfile: { initial_questions: [{ id: 'q1' }], initial_responses: {} },
    });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.targetRoute).toBe('/onboarding/initial-questions');
  });

  test('questions + responses and no plan -> /generate-plan', () => {
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
      userProfile: {
        initial_questions: [{ id: 'q1' }],
        initial_responses: { q1: 'a1' },
      },
      trainingPlan: null,
    });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.targetRoute).toBe('/generate-plan');
  });

  test('has plan and not accepted -> /(tabs) Plan Review', () => {
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
      userProfile: { planAccepted: false, initial_questions: [{ id: 'q1' }], initial_responses: { q1: 'a1' } },
      trainingPlan: { id: 1 },
    });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.targetRoute).toBe('/(tabs)');
    expect(result.current.routingReason).toMatch(/Plan Review/);
  });

  test('has plan and accepted -> /(tabs)', () => {
    setAuthState({
      ...baseState,
      user: { id: 'u1', email_confirmed_at: '2025-01-01', app_metadata: { provider: 'email' } },
      userProfile: { planAccepted: true, initial_questions: [{ id: 'q1' }], initial_responses: { q1: 'a1' } },
      trainingPlan: { id: 1 },
    });
    const { result } = renderHook(() => useAppRouting());
    expect(result.current.targetRoute).toBe('/(tabs)');
  });
});


