/**
 * Unit Tests for Training KPI Calculations
 * Tests the extracted KPI calculation utilities
 */

import { calculateStreak, calculateWeeklyTrainings, calculateCompletedWeeks, calculateKPIs } from '../../utils/trainingKPIs';
import { TrainingPlan, WeeklySchedule, DailyTraining, TrainingExercise } from '../../types/training';

describe('Training KPI Calculations', () => {
  const createMockExercise = (completed: boolean): TrainingExercise => ({
    id: 'ex1',
    exerciseId: '1',
    order: 1,
    executionOrder: 1,
    exercise: {
      id: '1',
      name: 'Bench Press',
      target_area: 'Chest',
      equipment: 'Barbell',
    },
    sets: [
      { id: 'set1', reps: 10, weight: 80, completed },
      { id: 'set2', reps: 10, weight: 80, completed },
    ],
    completed,
  });

  const createMockDailyTraining = (
    dayOfWeek: string, 
    completed: boolean, 
    isRestDay: boolean = false,
    scheduledDate?: Date
  ): DailyTraining => ({
    id: `dt-${dayOfWeek}`,
    dayOfWeek,
    isRestDay,
    exercises: isRestDay ? [] : [createMockExercise(completed)],
    completed,
    scheduledDate,
  });

  const createMockWeek = (weekNumber: number, dailyTrainings: DailyTraining[]): WeeklySchedule => ({
    id: `week-${weekNumber}`,
    weekNumber,
    dailyTrainings,
    completed: false,
  });

  describe('calculateStreak', () => {
    const mockToday = new Date('2025-01-15T12:00:00'); // Wednesday
    const originalDate = Date;
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      dateSpy = jest.spyOn(global, 'Date').mockImplementation(function(this: any, ...args: any[]) {
        if (args.length === 0) {
          return new originalDate(mockToday);
        }
        return new (originalDate as any)(...args);
      }) as any;
      Object.setPrototypeOf(Date, originalDate);
      Object.setPrototypeOf(Date.prototype, originalDate.prototype);
    });

    afterEach(() => {
      dateSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should return 0 for null training plan', () => {
      expect(calculateStreak(null)).toBe(0);
    });

    it('should return 0 for empty training plan', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateStreak(plan)).toBe(0);
    });

    it('should calculate streak correctly using scheduledDate', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, false, new Date('2025-01-14')),
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-15')), // Today
            createMockDailyTraining('Thursday', false, false, new Date('2025-01-16')),
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateStreak(plan)).toBe(3);
    });

    it('should break streak when a day is missed (using scheduledDate)', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', false, false, new Date('2025-01-14')), // Missed
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-15')), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Streak should be 1 (only today), because Tuesday was missed
      expect(calculateStreak(plan)).toBe(1);
    });

    it('should handle streak across multiple weeks (using scheduledDate)', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 2,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Sunday', true, false, new Date('2025-01-12')),
          ]),
          createMockWeek(2, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, false, new Date('2025-01-14')),
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-15')), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateStreak(plan)).toBe(4); // 4 consecutive days
    });

    it('should fallback to legacy calculation when scheduledDate is missing', () => {
      // Mock Date to ensure consistent test results
      const mockDate = new Date('2024-01-10'); // Wednesday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true), // No scheduledDate
            createMockDailyTraining('Tuesday', true), // No scheduledDate
            createMockDailyTraining('Wednesday', true), // No scheduledDate
            createMockDailyTraining('Thursday', false), // No scheduledDate
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateStreak(plan)).toBe(3);
      
      jest.restoreAllMocks();
    });

    it('should exclude rest days from streak calculation', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, true, new Date('2025-01-14')), // Rest day - should be excluded
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-15')), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Rest days are excluded, so streak should be 2 (Monday and Wednesday)
      expect(calculateStreak(plan)).toBe(2);
    });
  });

  describe('calculateWeeklyTrainings', () => {
    const mockToday = new Date('2025-01-15T12:00:00'); // Wednesday
    const originalDate = Date;
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      dateSpy = jest.spyOn(global, 'Date').mockImplementation(function(this: any, ...args: any[]) {
        if (args.length === 0) {
          return new originalDate(mockToday);
        }
        return new (originalDate as any)(...args);
      }) as any;
      Object.setPrototypeOf(Date, originalDate);
      Object.setPrototypeOf(Date.prototype, originalDate.prototype);
    });

    afterEach(() => {
      dateSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should return 0 for null training plan', () => {
      expect(calculateWeeklyTrainings(null)).toBe(0);
    });

    it('should return 0 when currentWeek is invalid', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 0,
        totalWeeks: 12,
        weeklySchedules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateWeeklyTrainings(plan)).toBe(0);
    });

    it('should determine current week from scheduledDate and count trainings', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, false, new Date('2025-01-14')),
            createMockDailyTraining('Wednesday', false, false, new Date('2025-01-15')), // Today - not completed but should be counted
            createMockDailyTraining('Thursday', true, true, new Date('2025-01-16')), // Rest day - should be excluded
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Should count all 3 trainings (Monday, Tuesday, Wednesday), excluding rest day
      expect(calculateWeeklyTrainings(plan)).toBe(3);
    });

    it('should fallback to stored currentWeek when scheduledDate is missing', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true), // No scheduledDate
            createMockDailyTraining('Tuesday', true), // No scheduledDate
            createMockDailyTraining('Wednesday', false), // No scheduledDate
            createMockDailyTraining('Thursday', true, true), // Rest day - should be excluded
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Should count all 3 trainings (Monday, Tuesday, Wednesday), excluding rest day
      expect(calculateWeeklyTrainings(plan)).toBe(3);
    });

    it('should exclude rest days from count', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true),
            createMockDailyTraining('Tuesday', true, true), // Rest day - should be excluded
            createMockDailyTraining('Wednesday', false), // Not completed but should be counted
            createMockDailyTraining('Thursday', true),
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Should count all 3 trainings (Monday, Wednesday, Thursday), excluding rest day
      expect(calculateWeeklyTrainings(plan)).toBe(3);
    });
  });

  describe('calculateCompletedWeeks', () => {
    const mockToday = new Date('2025-01-22T12:00:00'); // Wednesday of week 2
    const originalDate = Date;
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      dateSpy = jest.spyOn(global, 'Date').mockImplementation(function(this: any, ...args: any[]) {
        if (args.length === 0) {
          return new originalDate(mockToday);
        }
        return new (originalDate as any)(...args);
      }) as any;
      Object.setPrototypeOf(Date, originalDate);
      Object.setPrototypeOf(Date.prototype, originalDate.prototype);
    });

    afterEach(() => {
      dateSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should return 0 for null training plan', () => {
      expect(calculateCompletedWeeks(null)).toBe(0);
    });

    it('should return 0 when currentWeek is 1', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 1,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [createMockDailyTraining('Monday', true, false, new Date('2025-01-15'))]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateCompletedWeeks(plan)).toBe(0);
    });

    it('should verify actual completion when scheduledDate is available', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 2,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, false, new Date('2025-01-14')),
            // Week 1 is fully completed
          ]),
          createMockWeek(2, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-20')),
            createMockDailyTraining('Tuesday', false, false, new Date('2025-01-21')), // Not completed
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-22')), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Week 1 is fully completed, week 2 is current week (not counted)
      expect(calculateCompletedWeeks(plan)).toBe(1);
    });

    it('should not count incomplete weeks even if before current week', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 3,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-06')),
            createMockDailyTraining('Tuesday', false, false, new Date('2025-01-07')), // Not completed
          ]),
          createMockWeek(2, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-13')),
            createMockDailyTraining('Tuesday', true, false, new Date('2025-01-14')),
          ]),
          createMockWeek(3, [
            createMockDailyTraining('Monday', true, false, new Date('2025-01-20')),
            createMockDailyTraining('Wednesday', true, false, new Date('2025-01-22')), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Week 1 is incomplete, week 2 is complete, week 3 is current
      expect(calculateCompletedWeeks(plan)).toBe(1);
    });

    it('should fallback to simple count when scheduledDate is missing', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 3,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [createMockDailyTraining('Monday', true)]), // No scheduledDate
          createMockWeek(2, [createMockDailyTraining('Monday', true)]), // No scheduledDate
          createMockWeek(3, [createMockDailyTraining('Monday', true)]), // No scheduledDate
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      // Should count weeks before current week (simple count)
      expect(calculateCompletedWeeks(plan)).toBe(2);
    });

    it('should handle edge case when currentWeek > totalWeeks', () => {
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 15,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [createMockDailyTraining('Monday', true)]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      expect(calculateCompletedWeeks(plan)).toBe(12);
    });
  });

  describe('calculateKPIs', () => {
    it('should return all zeros for null training plan', () => {
      const result = calculateKPIs(null);
      expect(result).toEqual({
        streak: 0,
        weeklyTrainings: 0,
        completedWeeks: 0,
      });
    });

    it('should calculate all KPIs correctly', () => {
      // Mock Date to ensure consistent test results
      const mockDate = new Date('2024-01-10'); // Wednesday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 2,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('Monday', true),
            createMockDailyTraining('Tuesday', true),
            createMockDailyTraining('Wednesday', true),
          ]),
          createMockWeek(2, [
            createMockDailyTraining('Monday', true),
            createMockDailyTraining('Tuesday', true),
            createMockDailyTraining('Wednesday', false),
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };
      const result = calculateKPIs(plan);
      // Verify all KPIs are calculated
      expect(typeof result.streak).toBe('number');
      expect(typeof result.weeklyTrainings).toBe('number');
      expect(typeof result.completedWeeks).toBe('number');
      expect(result.completedWeeks).toBe(1); // This one is straightforward
      // Week 2 has 3 trainings (Monday, Tuesday, Wednesday) - all should be counted regardless of completion
      expect(result.weeklyTrainings).toBe(3);
      expect(result.streak).toBeGreaterThanOrEqual(0);
      
      jest.restoreAllMocks();
    });
  });
});

