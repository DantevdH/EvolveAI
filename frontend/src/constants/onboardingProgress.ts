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
    // previous segments: [2000, 2000, 1500] -> sum = 5500
    durationMs: 8000,
  },
  // follow-up phase removed
  plan: {
    // previous segments: [2000, 10000, 12000] -> sum = 24000
    durationMs: 24000,
  },
};
