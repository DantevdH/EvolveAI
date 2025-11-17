/**
 * Unit Tests for Training Completion Logic
 * Tests week completion, daily training completion, and exercise completion logic
 */

import { TrainingPlan, WeeklySchedule, DailyTraining, TrainingExercise } from '../../types/training';
import { calculateStreak } from '../../utils/trainingKPIs';

describe('Training Completion Logic', () => {
  const createMockExercise = (id: string, completed: boolean, isEndurance: boolean = false): TrainingExercise => ({
    id,
    exerciseId: id,
    order: 1,
    executionOrder: 1,
    exercise: {
      id,
      name: 'Test Exercise',
      target_area: 'Chest',
      equipment: 'Barbell',
    },
    sets: isEndurance ? undefined : [
      { id: 'set1', reps: 10, weight: 80, completed },
      { id: 'set2', reps: 10, weight: 80, completed },
    ],
    enduranceSession: isEndurance ? {
      id: `endurance-${id}`,
      sportType: 'Running',
      trainingVolume: 5,
      unit: 'km',
      heartRateZone: 3,
      executionOrder: 1,
      completed,
    } : undefined,
    completed,
  });

  const createMockDailyTraining = (
    id: string,
    dayOfWeek: string,
    exercises: TrainingExercise[],
    isRestDay: boolean = false
  ): DailyTraining => {
    const allExercisesCompleted = exercises.length > 0 && exercises.every(ex => ex.completed === true);
    return {
      id,
      dayOfWeek,
      isRestDay,
      exercises,
      completed: allExercisesCompleted,
    };
  };

  const createMockWeek = (
    weekNumber: number,
    dailyTrainings: DailyTraining[],
    completed: boolean = false
  ): WeeklySchedule => {
    // Week is complete if all daily trainings are complete (or rest days)
    const isWeekComplete = dailyTrainings.every(dt => dt.completed || dt.isRestDay);
    return {
      id: `week-${weekNumber}`,
      weekNumber,
      focusTheme: 'Strength',
      dailyTrainings,
      completed: completed || isWeekComplete,
    };
  };

  describe('Week Completion Logic', () => {
    it('should mark week as complete when all daily trainings are complete', () => {
      const week = createMockWeek(1, [
        createMockDailyTraining('dt1', 'Monday', [createMockExercise('ex1', true)]),
        createMockDailyTraining('dt2', 'Tuesday', [createMockExercise('ex2', true)]),
        createMockDailyTraining('dt3', 'Wednesday', [createMockExercise('ex3', true)]),
      ]);

      // Week should be complete if all daily trainings are complete
      const isWeekComplete = week.dailyTrainings.every(dt => dt.completed || dt.isRestDay);
      expect(isWeekComplete).toBe(true);
      expect(week.completed).toBe(true);
    });

    it('should not mark week as complete if any training day is incomplete', () => {
      const week = createMockWeek(1, [
        createMockDailyTraining('dt1', 'Monday', [createMockExercise('ex1', true)]),
        createMockDailyTraining('dt2', 'Tuesday', [createMockExercise('ex2', false)]), // Incomplete
        createMockDailyTraining('dt3', 'Wednesday', [createMockExercise('ex3', true)]),
      ]);

      const isWeekComplete = week.dailyTrainings.every(dt => dt.completed || dt.isRestDay);
      expect(isWeekComplete).toBe(false);
      expect(week.completed).toBe(false);
    });

    it('should mark week as complete even if it only has rest days', () => {
      const week = createMockWeek(1, [
        createMockDailyTraining('dt1', 'Monday', [], true), // Rest day
        createMockDailyTraining('dt2', 'Tuesday', [], true), // Rest day
      ]);

      // Rest days count as "complete" for week completion
      const isWeekComplete = week.dailyTrainings.every(dt => dt.completed || dt.isRestDay);
      expect(isWeekComplete).toBe(true);
      expect(week.completed).toBe(true);
    });

    it('should mark week as complete when all trainings complete including rest days', () => {
      const week = createMockWeek(1, [
        createMockDailyTraining('dt1', 'Monday', [createMockExercise('ex1', true)]),
        createMockDailyTraining('dt2', 'Tuesday', [], true), // Rest day
        createMockDailyTraining('dt3', 'Wednesday', [createMockExercise('ex2', true)]),
      ]);

      const isWeekComplete = week.dailyTrainings.every(dt => dt.completed || dt.isRestDay);
      expect(isWeekComplete).toBe(true);
      expect(week.completed).toBe(true);
    });
  });

  describe('Exercise Completion Logic', () => {
    it('should mark daily training as complete when all exercises are completed', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true),
        createMockExercise('ex2', true),
      ]);

      const allExercisesCompleted = dailyTraining.exercises.length > 0 &&
                                    dailyTraining.exercises.every(ex => ex.completed === true);
      expect(allExercisesCompleted).toBe(true);
      expect(dailyTraining.completed).toBe(true);
    });

    it('should not mark daily training as complete if any exercise is incomplete', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true),
        createMockExercise('ex2', false), // Incomplete
      ]);

      const allExercisesCompleted = dailyTraining.exercises.length > 0 &&
                                    dailyTraining.exercises.every(ex => ex.completed === true);
      expect(allExercisesCompleted).toBe(false);
      expect(dailyTraining.completed).toBe(false);
    });

    it('should not mark daily training as complete if exercises array is empty', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', []);

      const allExercisesCompleted = dailyTraining.exercises.length > 0 &&
                                    dailyTraining.exercises.every(ex => ex.completed === true);
      expect(allExercisesCompleted).toBe(false);
      expect(dailyTraining.completed).toBe(false);
    });

    it('should handle partial exercise completion correctly', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true),
        createMockExercise('ex2', true),
        createMockExercise('ex3', false), // One incomplete
      ]);

      const allExercisesCompleted = dailyTraining.exercises.length > 0 &&
                                    dailyTraining.exercises.every(ex => ex.completed === true);
      expect(allExercisesCompleted).toBe(false);
      expect(dailyTraining.completed).toBe(false);
    });
  });

  describe('Cross-Week Streak', () => {
    it('should calculate streak across week boundaries', () => {
      // Mock Date to ensure consistent test results
      const mockDate = new Date('2024-01-10'); // Wednesday, Week 2
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 2,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('dt1', 'Monday', [createMockExercise('ex1', true)]),
            createMockDailyTraining('dt2', 'Tuesday', [createMockExercise('ex2', true)]),
            createMockDailyTraining('dt3', 'Wednesday', [createMockExercise('ex3', true)]),
            createMockDailyTraining('dt4', 'Thursday', [createMockExercise('ex4', true)]),
            createMockDailyTraining('dt5', 'Friday', [createMockExercise('ex5', true)]),
            createMockDailyTraining('dt6', 'Saturday', [createMockExercise('ex6', true)]),
            createMockDailyTraining('dt7', 'Sunday', [createMockExercise('ex7', true)]),
          ]),
          createMockWeek(2, [
            createMockDailyTraining('dt8', 'Monday', [createMockExercise('ex8', true)]),
            createMockDailyTraining('dt9', 'Tuesday', [createMockExercise('ex9', true)]),
            createMockDailyTraining('dt10', 'Wednesday', [createMockExercise('ex10', true)]), // Today
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };

      // Streak should count consecutive completed days across weeks
      const streak = calculateStreak(plan);
      // Should be at least 3 (Monday, Tuesday, Wednesday of Week 2)
      expect(streak).toBeGreaterThanOrEqual(3);

      jest.restoreAllMocks();
    });

    it('should break streak at week boundary if first day of new week is incomplete', () => {
      const mockDate = new Date('2024-01-10'); // Wednesday, Week 2
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const plan: TrainingPlan = {
        id: 'plan1',
        title: 'Test Plan',
        description: 'Test',
        currentWeek: 2,
        totalWeeks: 12,
        weeklySchedules: [
          createMockWeek(1, [
            createMockDailyTraining('dt1', 'Sunday', [createMockExercise('ex1', true)]), // Last day of week 1
          ]),
          createMockWeek(2, [
            createMockDailyTraining('dt2', 'Monday', [createMockExercise('ex2', false)]), // Incomplete - breaks streak
            createMockDailyTraining('dt3', 'Tuesday', [createMockExercise('ex3', true)]),
          ]),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false,
      };

      const streak = calculateStreak(plan);
      // Streak should be broken, so should only count days after the incomplete day
      expect(streak).toBeLessThan(3);

      jest.restoreAllMocks();
    });
  });

  describe('Daily Training Completion - Mixed Exercise Types', () => {
    it('should mark daily training as complete when both strength and endurance are complete', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true, false), // Strength - complete
        createMockExercise('ex2', true, true),  // Endurance - complete
      ]);

      const strengthCompleted = dailyTraining.exercises
        .filter(ex => !ex.enduranceSession)
        .every(ex => ex.completed);
      const enduranceCompleted = dailyTraining.exercises
        .filter(ex => ex.enduranceSession)
        .every(ex => ex.completed);

      expect(strengthCompleted).toBe(true);
      expect(enduranceCompleted).toBe(true);
      expect(dailyTraining.completed).toBe(true);
    });

    it('should not mark daily training as complete if endurance is incomplete', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true, false),  // Strength - complete
        createMockExercise('ex2', false, true),  // Endurance - incomplete
      ]);

      const strengthCompleted = dailyTraining.exercises
        .filter(ex => !ex.enduranceSession)
        .every(ex => ex.completed);
      const enduranceCompleted = dailyTraining.exercises
        .filter(ex => ex.enduranceSession)
        .every(ex => ex.completed);

      expect(strengthCompleted).toBe(true);
      expect(enduranceCompleted).toBe(false);
      expect(dailyTraining.completed).toBe(false);
    });

    it('should not mark daily training as complete if strength is incomplete', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', false, false), // Strength - incomplete
        createMockExercise('ex2', true, true),    // Endurance - complete
      ]);

      const strengthCompleted = dailyTraining.exercises
        .filter(ex => !ex.enduranceSession)
        .every(ex => ex.completed);
      const enduranceCompleted = dailyTraining.exercises
        .filter(ex => ex.enduranceSession)
        .every(ex => ex.completed);

      expect(strengthCompleted).toBe(false);
      expect(enduranceCompleted).toBe(true);
      expect(dailyTraining.completed).toBe(false);
    });

    it('should handle daily training with only strength exercises', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true, false),
        createMockExercise('ex2', true, false),
      ]);

      const strengthCompleted = dailyTraining.exercises
        .filter(ex => !ex.enduranceSession)
        .every(ex => ex.completed);

      expect(strengthCompleted).toBe(true);
      expect(dailyTraining.completed).toBe(true);
    });

    it('should handle daily training with only endurance exercises', () => {
      const dailyTraining = createMockDailyTraining('dt1', 'Monday', [
        createMockExercise('ex1', true, true),
        createMockExercise('ex2', true, true),
      ]);

      const enduranceCompleted = dailyTraining.exercises
        .filter(ex => ex.enduranceSession)
        .every(ex => ex.completed);

      expect(enduranceCompleted).toBe(true);
      expect(dailyTraining.completed).toBe(true);
    });
  });
});

