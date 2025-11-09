export type OnboardingPhase = 'startup' | 'initial' | 'followup' | 'plan';

export interface PhaseProgressConfig {
  segments: number[];
  completionDelayMs?: number;
}

export const ONBOARDING_PROGRESS_CONFIG: Record<OnboardingPhase, PhaseProgressConfig> = {
  startup: {
    segments: [1000],
  },
  initial: {
    segments: [2000, 2000, 1500],
  },
  followup: {
    segments: [1500, 1500, 1500],
  },
  plan: {
    segments: [2000, 10000, 12000],
  },
};
