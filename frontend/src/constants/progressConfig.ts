export type ProgressPhase = 'startup' | 'initial' | 'plan' | 'chat';

export interface PhaseProgressConfig {
  durationMs: number;
  completionDelayMs?: number;
  /**
   * Optional staged labels for longer-running phases.
   * Key is the minimum elapsed time (ms) at which this label becomes active.
   * Example:
   * {
   *   0: 'Thinking…',
   *   3000: 'Analyzing your feedback…',
   *   8000: 'Updating your plan…',
   * }
   */
  stagedLabels?: Record<number, string>;
}

export const PROGRESS_CONFIG: Record<Exclude<ProgressPhase, 'chat'>, PhaseProgressConfig> & {
  chat: PhaseProgressConfig;
} = {
  startup: {
    durationMs: 1000,
  },
  initial: {
    durationMs: 5000,
  },
  // follow-up phase removed
  plan: {
    durationMs: 35000,
  },
  chat: {
    durationMs: 30000,
    stagedLabels: {
      0: 'Thinking…',
      2000: 'Analyzing your feedback…',
      5000: 'Discussing with your coach…',
      8000: 'Checking this week’s schedule…',
      11000: 'Reviewing your goals and constraints…',
      14000: 'Exploring better training options for you…',
      17000: 'Adjusting exercises and sessions…',
      20000: 'Balancing intensity and recovery…',
      23000: 'Generating your updated plan…',
      26000: 'Making sure everything fits your preferences…',
      29000: 'Applying final touches to your plan…',
      32000: 'Almost done! Getting your plan ready…',
    },
  },
};

