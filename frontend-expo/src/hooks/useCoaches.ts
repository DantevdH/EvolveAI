import { useState, useEffect, useCallback } from 'react';
import { CoachService, Coach } from '../services/coachService';

export interface UseCoachesReturn {
  allCoaches: Coach[];
  availableCoaches: Coach[];
  isLoading: boolean;
  error: string | null;
  filterCoachesByGoal: (goal: string) => void;
  clearError: () => void;
}

export const useCoaches = (): UseCoachesReturn => {
  const [allCoaches, setAllCoaches] = useState<Coach[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all coaches on mount
  useEffect(() => {
    fetchAllCoaches();
  }, []);

  const fetchAllCoaches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await CoachService.getAllCoaches();
      
      if (result.success && result.data) {
        setAllCoaches(result.data);
        console.log(`✅ useCoaches: Fetched ${result.data.length} coaches successfully`);
      } else {
        setError(result.error || 'Failed to fetch coaches');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterCoachesByGoal = useCallback((goal: string) => {
    if (!goal || allCoaches.length === 0) {
      setAvailableCoaches([]);
      return;
    }

    const matchingCoaches = CoachService.filterCoachesByGoal(allCoaches, goal);
    setAvailableCoaches(matchingCoaches);
  }, [allCoaches]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    allCoaches,
    availableCoaches,
    isLoading,
    error,
    filterCoachesByGoal,
    clearError,
  };
};
