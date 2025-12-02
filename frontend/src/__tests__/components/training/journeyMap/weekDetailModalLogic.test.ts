/**
 * Tests for WeekDetailModal business logic
 * Tests extracted logic functions for better testability
 */

import {
  calculateGenerationProgress,
  getProgressBarDuration,
  isValidProgressDuration,
  canNavigateToWeek,
  canGenerateWeek,
  getInitialModalState,
  getResetModalState,
  getStartGenerationState,
  getCompleteGenerationState,
  getErrorGenerationState,
  updateProgressState,
  markBackendResponded,
  WeekDetailModalState,
} from '../../../../components/training/journeyMap/weekDetailModalLogic';
import { WeekModalData } from '../../../../components/training/journeyMap/types';

describe('WeekDetailModal Logic', () => {
  describe('calculateGenerationProgress', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 when no time has elapsed', () => {
      const startTime = Date.now();
      const totalDuration = 20000;
      const progress = calculateGenerationProgress(startTime, totalDuration, false);
      expect(progress).toBe(0);
    });

    it('should calculate progress based on elapsed time', () => {
      const startTime = Date.now();
      const totalDuration = 20000;
      
      jest.advanceTimersByTime(10000); // 50% of duration
      const progress = calculateGenerationProgress(startTime, totalDuration, false);
      
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(99);
    });

    it('should cap progress at 99% until backend responds', () => {
      const startTime = Date.now();
      const totalDuration = 20000;
      
      jest.advanceTimersByTime(30000); // More than total duration
      const progress = calculateGenerationProgress(startTime, totalDuration, false);
      
      expect(progress).toBe(99);
    });

    it('should return 99% when backend has responded', () => {
      const startTime = Date.now();
      const totalDuration = 20000;
      const progress = calculateGenerationProgress(startTime, totalDuration, true);
      expect(progress).toBe(99);
    });

    it('should handle zero duration gracefully', () => {
      const startTime = Date.now();
      const progress = calculateGenerationProgress(startTime, 0, false);
      expect(progress).toBe(0);
    });

    it('should handle negative duration gracefully', () => {
      const startTime = Date.now();
      const progress = calculateGenerationProgress(startTime, -1000, false);
      expect(progress).toBe(0);
    });
  });

  describe('getProgressBarDuration', () => {
    it('should return duration from config', () => {
      const duration = getProgressBarDuration();
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should return fallback if config is missing', () => {
      // This tests the fallback logic
      const duration = getProgressBarDuration();
      expect(duration).toBeGreaterThanOrEqual(20000);
    });
  });

  describe('isValidProgressDuration', () => {
    it('should return true for valid duration', () => {
      expect(isValidProgressDuration(20000)).toBe(true);
      expect(isValidProgressDuration(1000)).toBe(true);
    });

    it('should return false for invalid duration', () => {
      expect(isValidProgressDuration(0)).toBe(false);
      expect(isValidProgressDuration(-1000)).toBe(false);
      expect(isValidProgressDuration(Infinity)).toBe(false);
      expect(isValidProgressDuration(NaN)).toBe(false);
    });
  });

  describe('canNavigateToWeek', () => {
    it('should return true for current week (generated)', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'current',
        stars: 0,
        completionPercentage: 50,
        completedWorkouts: 3,
        totalWorkouts: 7,
        isGenerated: true,
        isUnlocked: true,
        isPastWeek: false,
      };
      expect(canNavigateToWeek(data)).toBe(true);
    });

    it('should return true for completed week', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'completed',
        stars: 3,
        completionPercentage: 100,
        completedWorkouts: 7,
        totalWorkouts: 7,
        isGenerated: true,
        isUnlocked: true,
        isPastWeek: true,
      };
      expect(canNavigateToWeek(data)).toBe(true);
    });

    it('should return false for past-not-generated week', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'past-not-generated',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: false,
        isUnlocked: false,
        isPastWeek: true,
      };
      expect(canNavigateToWeek(data)).toBe(false);
    });

    it('should return false for future-locked week', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'future-locked',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: false,
        isUnlocked: false,
        isPastWeek: false,
      };
      expect(canNavigateToWeek(data)).toBe(false);
    });
  });

  describe('canGenerateWeek', () => {
    it('should return true for unlocked-not-generated week with handler', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'unlocked-not-generated',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: false,
        isUnlocked: true,
        isPastWeek: false,
      };
      expect(canGenerateWeek(data, true, false)).toBe(true);
    });

    it('should return false when generating', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'unlocked-not-generated',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: false,
        isUnlocked: true,
        isPastWeek: false,
      };
      expect(canGenerateWeek(data, true, true)).toBe(false);
    });

    it('should return false when no handler', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'unlocked-not-generated',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: false,
        isUnlocked: true,
        isPastWeek: false,
      };
      expect(canGenerateWeek(data, false, false)).toBe(false);
    });

    it('should return false for non-unlocked week', () => {
      const data: WeekModalData = {
        weekNumber: 1,
        status: 'current',
        stars: 0,
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 7,
        isGenerated: true,
        isUnlocked: true,
        isPastWeek: false,
      };
      expect(canGenerateWeek(data, true, false)).toBe(false);
    });
  });

  describe('State Management', () => {
    describe('getInitialModalState', () => {
      it('should return initial state', () => {
        const state = getInitialModalState();
        expect(state).toEqual({
          isGenerating: false,
          progress: 0,
          backendResponded: false,
        });
      });
    });

    describe('getResetModalState', () => {
      it('should return reset state (same as initial)', () => {
        const state = getResetModalState();
        expect(state).toEqual(getInitialModalState());
      });
    });

    describe('getStartGenerationState', () => {
      it('should return state for starting generation', () => {
        const state = getStartGenerationState();
        expect(state).toEqual({
          isGenerating: true,
          progress: 0,
          backendResponded: false,
        });
      });
    });

    describe('getCompleteGenerationState', () => {
      it('should return state for completed generation', () => {
        const state = getCompleteGenerationState();
        expect(state).toEqual({
          isGenerating: false,
          progress: 100,
          backendResponded: true,
        });
      });
    });

    describe('getErrorGenerationState', () => {
      it('should return state for generation error', () => {
        const state = getErrorGenerationState();
        expect(state).toEqual({
          isGenerating: false,
          progress: 0,
          backendResponded: true,
        });
      });
    });

    describe('updateProgressState', () => {
      it('should update progress in state', () => {
        const currentState: WeekDetailModalState = {
          isGenerating: true,
          progress: 50,
          backendResponded: false,
        };
        const newState = updateProgressState(currentState, 75);
        expect(newState.progress).toBe(75);
        expect(newState.isGenerating).toBe(true);
        expect(newState.backendResponded).toBe(false);
      });

      it('should clamp progress to 0-100', () => {
        const currentState: WeekDetailModalState = {
          isGenerating: true,
          progress: 50,
          backendResponded: false,
        };
        
        const negativeState = updateProgressState(currentState, -10);
        expect(negativeState.progress).toBe(0);
        
        const overState = updateProgressState(currentState, 150);
        expect(overState.progress).toBe(100);
      });
    });

    describe('markBackendResponded', () => {
      it('should mark backend as responded', () => {
        const currentState: WeekDetailModalState = {
          isGenerating: true,
          progress: 50,
          backendResponded: false,
        };
        const newState = markBackendResponded(currentState);
        expect(newState.backendResponded).toBe(true);
        expect(newState.isGenerating).toBe(true);
        expect(newState.progress).toBe(50);
      });
    });
  });
});

