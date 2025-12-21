import { useState, useEffect, useRef, useCallback } from 'react';
import { UserService } from '../services/userService';
import { TrainingService } from '../services/trainingService';
import { logData, logError, logWarn, logInfo } from '../utils/logger';
import { POLLING_CONFIG } from '../constants';

export interface BackgroundDataPollingOptions {
  pollPlaybook: boolean;
  pollPlanWeeks: boolean;
  initialPlaybookCount?: number | (() => number);
  initialLastUpdated?: string | (() => string | undefined);
  timeout?: number;
  interval?: number;
  onUpdate?: (data: {
    updatedPlaybook?: any;
    updatedPlan?: any;
  }) => void;
  onTimeout?: () => void;
}

export interface BackgroundDataPollingResult {
  isPolling: boolean;
  updatedPlaybook: any | null;
  updatedPlan: any | null;
  error: Error | null;
  stopPolling: () => void;
  startPolling: () => void;
}

/**
 * Unified polling hook for background data (playbook and/or plan weeks).
 * 
 * Supports both:
 * - Onboarding scenario: Polls for playbook AND plan weeks (weeks > 1)
 * - Chat scenario: Polls only for playbook changes (lesson count increase)
 */
export const useBackgroundDataPolling = (
  userId: string | undefined,
  userProfileId: number | undefined,
  options: BackgroundDataPollingOptions
): BackgroundDataPollingResult => {
  const {
    pollPlaybook,
    pollPlanWeeks,
    initialPlaybookCount: initialPlaybookCountOption = 0,
    initialLastUpdated: initialLastUpdatedOption,
    timeout = POLLING_CONFIG.TIMEOUT,
    interval = POLLING_CONFIG.INTERVAL, 
    onUpdate,
    onTimeout,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [updatedPlaybook, setUpdatedPlaybook] = useState<any | null>(null);
  const [updatedPlan, setUpdatedPlan] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const pollingRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Use refs to store initial values so they can be updated dynamically
  const initialPlaybookCountRef = useRef<number>(
    typeof initialPlaybookCountOption === 'function' 
      ? initialPlaybookCountOption() 
      : initialPlaybookCountOption
  );
  const initialLastUpdatedRef = useRef<string | undefined>(
    typeof initialLastUpdatedOption === 'function'
      ? initialLastUpdatedOption()
      : initialLastUpdatedOption
  );

  const stopPolling = useCallback(() => {
    // Prevent any new polling attempts
    pollingRef.current = false;
    setIsPolling(false);
    
    // Clear timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Clear interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset start time
    startTimeRef.current = null;
    
    logInfo('Polling stopped and cleaned up');
  }, []);

  const startPolling = useCallback(async () => {
    if (!userId || !userProfileId) {
      logWarn('Cannot poll for background data: missing user ID or profile ID');
      return;
    }

    if (pollingRef.current) {
      logWarn('Polling already in progress, skipping duplicate start');
      return;
    }

    // Update initial values from functions if provided (captures current state when polling starts)
    if (typeof initialPlaybookCountOption === 'function') {
      initialPlaybookCountRef.current = initialPlaybookCountOption();
    }
    if (typeof initialLastUpdatedOption === 'function') {
      initialLastUpdatedRef.current = initialLastUpdatedOption();
    }

    pollingRef.current = true;
    setIsPolling(true);
    setError(null);
    startTimeRef.current = Date.now();
    
    logInfo('Polling for background data', {
      pollPlaybook,
      pollPlanWeeks,
      timeout,
      interval,
      initialPlaybookCount: initialPlaybookCountRef.current,
      initialLastUpdated: initialLastUpdatedRef.current,
    });

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        logWarn(`Polling timeout after ${timeout}ms - stopping`);
        stopPolling();
        onTimeout?.();
      }
    }, timeout) as any;

    let attempt = 0;
    const MAX_ATTEMPTS = Math.ceil(timeout / interval);

    const poll = async () => {
      if (!pollingRef.current) {
        return;
      }

      attempt++;
      
      try {
        const promises: Promise<any>[] = [];
        
        if (pollPlaybook) {
          promises.push(UserService.getUserProfile(userId));
        }
        
        if (pollPlanWeeks) {
          promises.push(TrainingService.getTrainingPlan(userProfileId));
        }

        const results = await Promise.all(promises);
        
        let profileData: any = null;
        let planData: any = null;
        let resultIndex = 0;

        if (pollPlaybook) {
          profileData = results[resultIndex++];
        }
        if (pollPlanWeeks) {
          planData = results[resultIndex++];
        }

        // Check conditions
        let playbookReady = false;
        let planReady = false;

        if (pollPlaybook) {
          const currentPlaybookCount = profileData.data?.playbook?.total_lessons || 
                                      profileData.data?.playbook?.lessons?.length || 0;
          const currentLastUpdated = profileData.data?.playbook?.last_updated;
          const initialCount = initialPlaybookCountRef.current;
          const initialUpdated = initialLastUpdatedRef.current;
          
          // Check if playbook has changed (multiple detection methods for robustness)
          if (currentPlaybookCount > initialCount) {
            // Lesson count increased - playbook was updated
            playbookReady = true;
            logInfo('Playbook updated', `count: ${initialCount} → ${currentPlaybookCount}`);
          } else if (initialUpdated && currentLastUpdated && currentLastUpdated > initialUpdated) {
            // Timestamp changed - playbook was updated
            playbookReady = true;
            logInfo('Playbook updated', `timestamp: ${initialUpdated} → ${currentLastUpdated}`);
          } else if (!pollPlanWeeks && currentPlaybookCount > 0 && initialCount === 0) {
            // Edge case: For chat scenario, if we started with 0 and now have lessons, that's an update
            playbookReady = true;
            logInfo('Playbook created', `count: 0 → ${currentPlaybookCount}`);
          } else if (currentPlaybookCount !== initialCount) {
            // Edge case: Count changed in unexpected way (e.g., decreased due to removals)
            // Still consider it ready if count changed
            playbookReady = true;
            logInfo('Playbook changed', `count: ${initialCount} → ${currentPlaybookCount}`);
          }
        } else {
          playbookReady = true; // Not polling playbook, consider it ready
        }

        if (pollPlanWeeks) {
          const weekCount = planData.data?.weeklySchedules?.length || 0;
          planReady = weekCount > 1; // Onboarding: need more than 1 week
        } else {
          planReady = true; // Not polling plan, consider it ready
        }

        // Check if all conditions are met
        if (playbookReady && planReady) {
          logData('Background data ready', 'success', {
            playbook: playbookReady,
            plan: planReady,
            attempt,
          });

          const updateData: any = {};
          if (pollPlaybook && profileData) {
            updateData.updatedPlaybook = profileData.data?.playbook;
            setUpdatedPlaybook(profileData.data?.playbook);
          }
          if (pollPlanWeeks && planData) {
            updateData.updatedPlan = planData.data;
            setUpdatedPlan(planData.data);
          }

          stopPolling();
          onUpdate?.(updateData);
          return;
        }

        // Continue polling
        logInfo(`Polling background data - attempt ${attempt}/${MAX_ATTEMPTS}`, {
          playbook: playbookReady,
          plan: planReady,
        });

        if (attempt < MAX_ATTEMPTS && pollingRef.current) {
          intervalRef.current = setTimeout(poll, interval) as any;
        } else {
          // Max attempts reached
          logWarn(`Polling reached max attempts (${MAX_ATTEMPTS}) - stopping`);
          stopPolling();
          onTimeout?.();
        }
      } catch (pollError) {
        logError('Polling error', pollError);
        setError(pollError instanceof Error ? pollError : new Error(String(pollError)));
        
        // Continue polling on error
        if (attempt < MAX_ATTEMPTS && pollingRef.current) {
          intervalRef.current = setTimeout(poll, interval) as any;
        } else {
          stopPolling();
          onTimeout?.();
        }
      }
    };

    // Start polling
    poll();
  }, [
    userId,
    userProfileId,
    pollPlaybook,
    pollPlanWeeks,
    initialPlaybookCountOption,
    initialLastUpdatedOption,
    timeout,
    interval,
    onUpdate,
    onTimeout,
    stopPolling,
  ]);

  // Cleanup on unmount or when dependencies change
  useEffect(() => {
    return () => {
      // Explicit cleanup: stop polling and clear all timers
      pollingRef.current = false;
      setIsPolling(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      startTimeRef.current = null;
      logInfo('Polling hook unmounted - all timers cleared');
    };
  }, [stopPolling]);

  return {
    isPolling,
    updatedPlaybook,
    updatedPlan,
    error,
    stopPolling,
    startPolling,
  };
};
