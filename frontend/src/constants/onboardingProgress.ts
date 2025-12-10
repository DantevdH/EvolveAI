export type OnboardingPhase = 'startup' | 'initial' | 'plan';

export interface PhaseProgressConfig {
  durationMs: number;
  completionDelayMs?: number;
}

export const ONBOARDING_PROGRESS_CONFIG: Record<OnboardingPhase, PhaseProgressConfig> = {
  startup: {
    durationMs: 1000,
  },
  initial: {
    durationMs: 5000,
  },
  // follow-up phase removed
  plan: {
    durationMs: 60000,
  },
};
