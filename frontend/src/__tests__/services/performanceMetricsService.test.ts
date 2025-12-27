/**
 * Unit Tests for Performance Metrics Service
 * Tests sport-specific analytics, weekly aggregations, and formatting
 */

import {
  extractCompletedSessions,
  getPerformedSportTypes,
  getWeeklyMetrics,
  getCombinedWeeklyMetrics,
  getSportSummaryStats,
  formatPace,
  formatDuration,
  formatDistance,
  formatVolume,
  SPORT_TYPE_LABELS,
  SPORT_METRICS_CONFIG,
  SportType,
} from '../../services/performanceMetricsService';
import { TrainingPlan, WeeklySchedule, DailyTraining, TrainingExercise } from '../../types/training';

describe('PerformanceMetricsService', () => {
  // Helper to create mock training data
  const createMockStrengthExercise = (
    completed: boolean,
    weights: number[] = [80, 80, 80],
    reps: number[] = [10, 10, 10]
  ): TrainingExercise => ({
    id: `ex-${Math.random()}`,
    exerciseId: '1',
    order: 1,
    executionOrder: 1,
    completed,
    exercise: {
      id: '1',
      name: 'Bench Press',
      target_area: 'Chest',
      main_muscles: ['Pectoralis Major'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
    },
    sets: weights.map((weight, index) => ({
      id: `set-${index}`,
      reps: reps[index] || 10,
      weight,
      completed,
    })),
  });

  const createMockEnduranceExercise = (
    completed: boolean,
    sportType: string = 'running',
    trainingVolume: number = 30,
    unit: string = 'minutes',
    actualDistance?: number,
    actualDuration?: number
  ): TrainingExercise => ({
    id: `endurance-${Math.random()}`,
    exerciseId: `endurance-${sportType}`,
    order: 1,
    executionOrder: 1,
    completed,
    enduranceSession: {
      id: `session-${Math.random()}`,
      sportType,
      trainingVolume,
      unit,
      heartRateZone: 3,
      executionOrder: 1,
      completed,
      actualDistance,
      actualDuration,
    },
  });

  const createMockDailyTraining = (
    completed: boolean,
    exercises: TrainingExercise[],
    completedAt?: Date
  ): DailyTraining => ({
    id: `dt-${Math.random()}`,
    dayOfWeek: 'Monday',
    isRestDay: false,
    exercises,
    completed,
    completedAt,
  });

  const createMockWeek = (weekNumber: number, dailyTrainings: DailyTraining[]): WeeklySchedule => ({
    id: `week-${weekNumber}`,
    weekNumber,
    dailyTrainings,
    completed: false,
  });

  const createMockPlan = (weeklySchedules: WeeklySchedule[]): TrainingPlan => ({
    id: 'plan1',
    title: 'Test Plan',
    description: 'Test',
    currentWeek: 1,
    totalWeeks: 12,
    weeklySchedules,
    createdAt: new Date(),
    updatedAt: new Date(),
    completed: false,
  });

  describe('extractCompletedSessions', () => {
    it('should return empty array for null training plan', () => {
      const result = extractCompletedSessions(null);
      expect(result).toEqual([]);
    });

    it('should extract strength sessions correctly', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80, 80], [10, 10, 10]),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedSessions(plan);

      expect(result.length).toBe(1);
      expect(result[0].sportType).toBe('strength');
      expect(result[0].volumeKg).toBe(2400); // 80*10 * 3 sets
      expect(result[0].sets).toBe(3);
      expect(result[0].reps).toBe(30); // 10*3
    });

    it('should extract endurance sessions correctly', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockEnduranceExercise(true, 'running', 5, 'km', 5000, 1800),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedSessions(plan);

      expect(result.length).toBe(1);
      expect(result[0].sportType).toBe('running');
      expect(result[0].distanceKm).toBe(5); // 5000m / 1000
      expect(result[0].durationMinutes).toBe(30); // 1800s / 60
    });

    it('should use training volume when actual values not available', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockEnduranceExercise(true, 'running', 30, 'minutes'),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedSessions(plan);

      expect(result.length).toBe(1);
      expect(result[0].durationMinutes).toBe(30);
    });

    it('should not include incomplete sessions', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(false),
            createMockEnduranceExercise(false),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedSessions(plan);
      expect(result).toEqual([]);
    });
  });

  describe('getPerformedSportTypes', () => {
    it('should return empty array for null training plan', () => {
      const result = getPerformedSportTypes(null);
      expect(result).toEqual([]);
    });

    it('should return unique sport types in correct order', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true),
            createMockEnduranceExercise(true, 'running'),
            createMockEnduranceExercise(true, 'cycling'),
          ], completedDate),
        ]),
      ]);

      const result = getPerformedSportTypes(plan);

      expect(result).toContain('strength');
      expect(result).toContain('running');
      expect(result).toContain('cycling');
      // Strength should be first
      expect(result[0]).toBe('strength');
    });

    it('should not duplicate sport types', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockEnduranceExercise(true, 'running'),
            createMockEnduranceExercise(true, 'running'),
          ], completedDate),
        ]),
      ]);

      const result = getPerformedSportTypes(plan);

      expect(result.filter(s => s === 'running').length).toBe(1);
    });
  });

  describe('getWeeklyMetrics', () => {
    it('should return empty array for null training plan', () => {
      const result = getWeeklyMetrics(null);
      expect(result).toEqual([]);
    });

    it('should aggregate metrics by week', () => {
      const week1Date = new Date('2025-01-13'); // Monday
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80], [10, 10]),
          ], week1Date),
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80], [10, 10]),
          ], new Date('2025-01-14')),
        ]),
      ]);

      const result = getWeeklyMetrics(plan, 'strength');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const weekMetrics = result[0];
      expect(weekMetrics.sportType).toBe('strength');
      expect(weekMetrics.sessionCount).toBe(2);
    });

    it('should filter by sport type', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true),
            createMockEnduranceExercise(true, 'running'),
          ], completedDate),
        ]),
      ]);

      const strengthResult = getWeeklyMetrics(plan, 'strength');
      const runningResult = getWeeklyMetrics(plan, 'running');

      expect(strengthResult.every(m => m.sportType === 'strength')).toBe(true);
      expect(runningResult.every(m => m.sportType === 'running')).toBe(true);
    });

    it('should include all sports when filter is "all"', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true),
            createMockEnduranceExercise(true, 'running'),
          ], completedDate),
        ]),
      ]);

      const result = getWeeklyMetrics(plan, 'all');

      expect(result.length).toBe(2);
    });
  });

  describe('getCombinedWeeklyMetrics', () => {
    it('should return empty array for null training plan', () => {
      const result = getCombinedWeeklyMetrics(null);
      expect(result).toEqual([]);
    });

    it('should aggregate all sports into combined metrics', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80, 80], [10, 10, 10]), // 2400 volume
            createMockEnduranceExercise(true, 'running', 5, 'km'),
          ], completedDate),
        ]),
      ]);

      const result = getCombinedWeeklyMetrics(plan);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].totalVolume).toBe(2400);
      expect(result[0].sessionCount).toBe(2);
    });
  });

  describe('getSportSummaryStats', () => {
    it('should calculate summary statistics', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80, 80], [10, 10, 10]),
          ], completedDate),
          createMockDailyTraining(true, [
            createMockStrengthExercise(true, [80, 80, 80], [10, 10, 10]),
          ], new Date('2025-01-17')),
        ]),
      ]);

      const result = getSportSummaryStats(plan, 'strength');

      expect(result.totalSessions).toBe(2);
      expect(result.totalVolume).toBe(4800); // 2400 * 2
    });
  });

  describe('SPORT_METRICS_CONFIG', () => {
    it('should have config for all sport types', () => {
      const sportTypes: SportType[] = [
        'strength', 'running', 'cycling', 'swimming', 'rowing',
        'hiking', 'walking', 'elliptical', 'stair_climbing', 'jump_rope', 'other'
      ];

      sportTypes.forEach(sport => {
        expect(SPORT_METRICS_CONFIG[sport]).toBeDefined();
      });
    });

    it('should have strength configured with volume', () => {
      expect(SPORT_METRICS_CONFIG['strength'].hasVolume).toBe(true);
      expect(SPORT_METRICS_CONFIG['strength'].primaryMetric).toBe('volume');
    });

    it('should have running configured with distance and pace', () => {
      expect(SPORT_METRICS_CONFIG['running'].hasDistance).toBe(true);
      expect(SPORT_METRICS_CONFIG['running'].hasPace).toBe(true);
      expect(SPORT_METRICS_CONFIG['running'].primaryMetric).toBe('distance');
    });
  });

  describe('SPORT_TYPE_LABELS', () => {
    it('should have labels for all sport types', () => {
      expect(SPORT_TYPE_LABELS['strength']).toBe('Strength');
      expect(SPORT_TYPE_LABELS['running']).toBe('Running');
      expect(SPORT_TYPE_LABELS['cycling']).toBe('Cycling');
      expect(SPORT_TYPE_LABELS['other']).toBe('Other');
    });
  });

  describe('formatPace', () => {
    it('should return "-" for null', () => {
      expect(formatPace(null)).toBe('-');
    });

    it('should format correctly', () => {
      expect(formatPace(300)).toBe('5:00 /km');
      expect(formatPace(330)).toBe('5:30 /km');
      expect(formatPace(275)).toBe('4:35 /km');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(45)).toBe('45 min');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2h');
    });
  });

  describe('formatDistance', () => {
    it('should format meters for short distances', () => {
      expect(formatDistance(0.5)).toBe('500 m');
      expect(formatDistance(0.1)).toBe('100 m');
    });

    it('should format kilometers for longer distances', () => {
      expect(formatDistance(5)).toBe('5.0 km');
      expect(formatDistance(10.5)).toBe('10.5 km');
    });
  });

  describe('formatVolume', () => {
    it('should format small volumes', () => {
      expect(formatVolume(500)).toBe('500 kg');
      expect(formatVolume(999)).toBe('999 kg');
    });

    it('should format large volumes with k suffix', () => {
      expect(formatVolume(1000)).toBe('1.0k kg');
      expect(formatVolume(2500)).toBe('2.5k kg');
      expect(formatVolume(10000)).toBe('10.0k kg');
    });
  });
});
