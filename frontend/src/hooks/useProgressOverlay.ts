import { useState, useEffect, useRef, useCallback } from 'react';
import { ONBOARDING_PROGRESS_CONFIG, OnboardingPhase, PhaseProgressConfig } from '../constants/onboardingProgress';

type IntervalHandle = ReturnType<typeof setInterval>;

type ProgressState = {
  visible: boolean;
  progress: number;
};

const INITIAL_STATE: ProgressState = {
  visible: false,
  progress: 0,
};

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useProgressOverlay() {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);
  const intervalRef = useRef<IntervalHandle | null>(null);
  const isMountedRef = useRef(true);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const runWithProgress = useCallback(async <T,>(phase: OnboardingPhase, task: () => Promise<T>): Promise<T> => {
    const config: PhaseProgressConfig | undefined = ONBOARDING_PROGRESS_CONFIG[phase];
    if (!config) {
      return task();
    }

    clearIntervalRef();

    const totalDuration = (config as any).durationMs ?? 0;

    if (isMountedRef.current) {
      setState({
        visible: true,
        progress: 0,
      });
    }

    startTimeRef.current = Date.now();

    const updateStateForElapsed = (elapsed: number) => {
      if (!isMountedRef.current) {
        return;
      }

      const computed = totalDuration > 0
        ? Math.min(99, Math.max(0, Math.floor((elapsed / totalDuration) * 99)))
        : 99;

      setState({
        visible: true,
        progress: computed,
      });
    };

    if (totalDuration > 0) {
      updateStateForElapsed(0);
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        updateStateForElapsed(elapsed);
      }, 80);
    } else {
      setState({
        visible: true,
        progress: 99,
      });
    }

    let result: T;
    try {
      result = await task();
    } catch (error) {
      clearIntervalRef();
      if (isMountedRef.current) {
        setState(INITIAL_STATE);
      }
      throw error;
    }

    clearIntervalRef();

    // Early exit if unmounted to avoid unnecessary state updates
    if (!isMountedRef.current) {
      return result;
    }

    setState({
      visible: true,
      progress: 100,
    });

    await wait(config.completionDelayMs ?? 350);

    if (isMountedRef.current) {
      setState(INITIAL_STATE);
    }

    return result;
  }, [clearIntervalRef]);

  return {
    progressState: state,
    runWithProgress,
  };
}

export type { OnboardingPhase, PhaseProgressConfig } from '../constants/onboardingProgress';
