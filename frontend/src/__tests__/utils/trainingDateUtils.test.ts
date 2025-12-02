/**
 * Tests for Training Date Utilities
 * Validates locked day behavior and date-based editability
 */

import {
  isTrainingDayEditable,
  getTrainingDayStatus,
  isTrainingDayLocked,
  parseLocalDate,
} from '../../utils/trainingDateUtils';
import { DailyTraining } from '../../types/training';

describe('trainingDateUtils', () => {
  // Mock today's date for consistent testing
  const mockToday = new Date('2025-01-15T12:00:00');
  const originalDate = Date;
  let dateSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock Date constructor to return a fixed date when called without arguments
    // When called with arguments, use the original Date constructor
    dateSpy = jest.spyOn(global, 'Date').mockImplementation(function(this: any, ...args: any[]) {
      if (args.length === 0) {
        return new originalDate(mockToday);
      }
      // Use original Date constructor for all other cases
      return new (originalDate as any)(...args);
    }) as any;
    // Preserve Date static methods and prototype
    Object.setPrototypeOf(Date, originalDate);
    Object.setPrototypeOf(Date.prototype, originalDate.prototype);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD format as local date', () => {
      const result = parseLocalDate('2025-01-15');
      expect(result).not.toBeUndefined();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // January is 0-indexed
      expect(result?.getDate()).toBe(15);
    });

    it('should return undefined for null input', () => {
      expect(parseLocalDate(null)).toBeUndefined();
      expect(parseLocalDate(undefined)).toBeUndefined();
    });

    it('should handle invalid date strings', () => {
      const result = parseLocalDate('invalid');
      expect(result).not.toBeUndefined();
      expect(isNaN(result?.getTime() as number)).toBe(true);
    });
  });

  describe('isTrainingDayEditable', () => {
    it('should return false for null dailyTraining', () => {
      expect(isTrainingDayEditable(null)).toBe(false);
    });

    it('should return true for legacy plans without scheduledDate', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
      };
      expect(isTrainingDayEditable(dailyTraining)).toBe(true);
    });

    it('should return true for today\'s workout', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-15'),
      };
      expect(isTrainingDayEditable(dailyTraining)).toBe(true);
    });

    it('should return false for past workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-14'), // Yesterday
      };
      expect(isTrainingDayEditable(dailyTraining)).toBe(false);
    });

    it('should return false for future workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-16'), // Tomorrow
      };
      expect(isTrainingDayEditable(dailyTraining)).toBe(false);
    });

    it('should handle Date objects correctly', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: mockToday,
      };
      expect(isTrainingDayEditable(dailyTraining)).toBe(true);
    });

    it('should handle date strings correctly', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: '2025-01-15' as any, // String date
      };
      // Should still work as it gets converted to Date
      expect(isTrainingDayEditable(dailyTraining)).toBe(true);
    });
  });

  describe('getTrainingDayStatus', () => {
    it('should return "unknown" for null dailyTraining', () => {
      expect(getTrainingDayStatus(null)).toBe('unknown');
    });

    it('should return "unknown" for dailyTraining without scheduledDate', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('unknown');
    });

    it('should return "today" for today\'s workout', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-15'),
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('today');
    });

    it('should return "past" for past workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-14'), // Yesterday
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('past');
    });

    it('should return "future" for future workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-16'), // Tomorrow
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('future');
    });

    it('should handle multiple days in the past', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-10'), // 5 days ago
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('past');
    });

    it('should handle multiple days in the future', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-20'), // 5 days from now
      };
      expect(getTrainingDayStatus(dailyTraining)).toBe('future');
    });
  });

  describe('isTrainingDayLocked', () => {
    it('should return true for past workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-14'),
      };
      expect(isTrainingDayLocked(dailyTraining)).toBe(true);
    });

    it('should return true for future workouts', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-16'),
      };
      expect(isTrainingDayLocked(dailyTraining)).toBe(true);
    });

    it('should return false for today\'s workout', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-15'),
      };
      expect(isTrainingDayLocked(dailyTraining)).toBe(false);
    });

    it('should return false for legacy plans without scheduledDate', () => {
      const dailyTraining: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
      };
      expect(isTrainingDayLocked(dailyTraining)).toBe(false);
    });

    it('should return true for null dailyTraining', () => {
      expect(isTrainingDayLocked(null)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle rest days correctly', () => {
      const restDay: DailyTraining = {
        id: '1',
        dayOfWeek: 'Sunday',
        isRestDay: true,
        exercises: [],
        scheduledDate: new Date('2025-01-15'),
      };
      // Rest days should still follow the same date-based rules
      expect(isTrainingDayEditable(restDay)).toBe(true);
      expect(getTrainingDayStatus(restDay)).toBe('today');
    });

    it('should handle completed workouts correctly', () => {
      const completedWorkout: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: new Date('2025-01-15'),
        completed: true,
      };
      // Date-based editability is independent of completion status
      expect(isTrainingDayEditable(completedWorkout)).toBe(true);
      expect(getTrainingDayStatus(completedWorkout)).toBe('today');
    });

    it('should handle workouts at midnight boundary', () => {
      // Test that date comparison works correctly at day boundaries
      const todayStart = new Date('2025-01-15T00:00:00');
      const todayEnd = new Date('2025-01-15T23:59:59');
      
      const dailyTraining1: DailyTraining = {
        id: '1',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: todayStart,
      };
      
      const dailyTraining2: DailyTraining = {
        id: '2',
        dayOfWeek: 'Monday',
        isRestDay: false,
        exercises: [],
        scheduledDate: todayEnd,
      };
      
      expect(isTrainingDayEditable(dailyTraining1)).toBe(true);
      expect(isTrainingDayEditable(dailyTraining2)).toBe(true);
      expect(getTrainingDayStatus(dailyTraining1)).toBe('today');
      expect(getTrainingDayStatus(dailyTraining2)).toBe('today');
    });
  });
});

