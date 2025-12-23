/**
 * useHealthImport Hook
 *
 * React hook for importing workouts from HealthKit/Google Fit.
 * Provides:
 * - Workout list loading
 * - Workout selection
 * - Import functionality
 * - Availability checking
 */

import { useState, useEffect, useCallback } from 'react';
import {
  HealthWorkout,
  HealthImportState,
  TrackedWorkoutMetrics,
  UseHealthImportReturn,
} from '../types/liveTracking';
import { HealthImportService } from '../services/HealthImportService';
import { logger } from '../utils/logger';

// ==================== HOOK ====================

export function useHealthImport(): UseHealthImportReturn {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [importState, setImportState] = useState<HealthImportState>({
    isLoading: false,
    workouts: [],
    selectedWorkoutId: null,
    error: null,
    dateRange: {
      start: new Date(),
      end: new Date(),
    },
  });

  // Check availability on mount
  useEffect(() => {
    HealthImportService.isAvailable().then(setIsAvailable).catch(() => setIsAvailable(false));
  }, []);

  // ==================== ACTIONS ====================

  /**
   * Load workouts for a specific date
   */
  const loadWorkouts = useCallback(async (date: Date) => {
    setImportState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      workouts: [],
      selectedWorkoutId: null,
    }));

    try {
      // Get workouts for the entire day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const workouts = await HealthImportService.getWorkoutsInRange(startOfDay, endOfDay);

      setImportState((prev) => ({
        ...prev,
        isLoading: false,
        workouts,
        dateRange: {
          start: startOfDay,
          end: endOfDay,
        },
      }));
    } catch (error) {
      logger.error('Failed to load workouts', error);
      setImportState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load workouts',
      }));
    }
  }, []);

  /**
   * Select a workout for import
   */
  const selectWorkout = useCallback((workoutId: string) => {
    setImportState((prev) => ({
      ...prev,
      selectedWorkoutId: prev.selectedWorkoutId === workoutId ? null : workoutId,
    }));
  }, []);

  /**
   * Import the selected workout
   */
  const importSelected = useCallback(async (): Promise<TrackedWorkoutMetrics | null> => {
    const { selectedWorkoutId, workouts } = importState;

    if (!selectedWorkoutId) {
      return null;
    }

    const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);
    if (!selectedWorkout) {
      return null;
    }

    try {
      setImportState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const metrics = HealthImportService.workoutToMetrics(selectedWorkout);

      setImportState((prev) => ({
        ...prev,
        isLoading: false,
      }));

      return metrics;
    } catch (error) {
      logger.error('Failed to import workout', error);
      setImportState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to import workout',
      }));
      return null;
    }
  }, [importState]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setImportState((prev) => ({
      ...prev,
      selectedWorkoutId: null,
    }));
  }, []);

  // ==================== RETURN ====================

  return {
    importState,
    loadWorkouts,
    selectWorkout,
    importSelected,
    clearSelection,
    isAvailable,
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format workout duration for display
 */
export function formatWorkoutDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format workout time for display (e.g., "2:30 PM")
 */
export function formatWorkoutTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get sport type display name
 */
export function getSportTypeDisplayName(sportType: string): string {
  const names: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    rowing: 'Rowing',
    hiking: 'Hiking',
    walking: 'Walking',
    elliptical: 'Elliptical',
    stair_climbing: 'Stair Climbing',
    jump_rope: 'Jump Rope',
    other: 'Other',
  };
  return names[sportType] || sportType;
}
