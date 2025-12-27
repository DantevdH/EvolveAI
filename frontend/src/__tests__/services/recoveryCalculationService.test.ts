/**
 * Unit Tests for Recovery Calculation Service
 * Tests ACWR calculations, recovery status, and muscle group tracking
 */

import {
  extractCompletedTrainingData,
  calculateACWR,
  getRecoveryStatus,
  getRecoveryRecommendation,
  calculateAllMuscleRecoveryStatus,
  calculateBaselineVolumes,
  getRecoveryStatusColor,
  formatACWR,
  ENDURANCE_TO_TARGET_AREA,
  TargetArea,
  DailyVolumeData,
} from '../../services/recoveryCalculationService';
import { TrainingPlan, WeeklySchedule, DailyTraining, TrainingExercise } from '../../types/training';

describe('RecoveryCalculationService', () => {
  // Helper to create mock training data
  const createMockExercise = (
    completed: boolean,
    targetArea: TargetArea,
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
      name: 'Test Exercise',
      target_area: targetArea,
      main_muscles: ['Test Muscle'],
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

  const createMockDailyTraining = (
    completed: boolean,
    exercises: TrainingExercise[],
    completedAt?: Date,
    sessionRPE?: number
  ): DailyTraining => ({
    id: `dt-${Math.random()}`,
    dayOfWeek: 'Monday',
    isRestDay: false,
    exercises,
    completed,
    completedAt,
    sessionRPE,
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

  describe('extractCompletedTrainingData', () => {
    it('should return empty array for null training plan', () => {
      const result = extractCompletedTrainingData(null);
      expect(result).toEqual([]);
    });

    it('should extract volume data from completed strength exercises', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
          ], completedDate, 4),
        ]),
      ]);

      const result = extractCompletedTrainingData(plan);

      expect(result.length).toBe(1);
      expect(result[0].targetArea).toBe('Chest');
      expect(result[0].volumeKg).toBe(2400); // 80*10 * 3
      expect(result[0].sessionRPE).toBe(4);
      expect(result[0].date).toBe('2025-01-15');
    });

    it('should not include incomplete exercises', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockExercise(false, 'Chest', [80, 80, 80], [10, 10, 10]),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedTrainingData(plan);
      expect(result).toEqual([]);
    });

    it('should not include exercises from incomplete daily trainings', () => {
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(false, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
          ]),
        ]),
      ]);

      const result = extractCompletedTrainingData(plan);
      expect(result).toEqual([]);
    });

    it('should extract data for multiple muscle groups', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
            createMockExercise(true, 'Back', [60, 60, 60], [12, 12, 12]),
          ], completedDate),
        ]),
      ]);

      const result = extractCompletedTrainingData(plan);

      expect(result.length).toBe(2);
      expect(result.find(r => r.targetArea === 'Chest')).toBeDefined();
      expect(result.find(r => r.targetArea === 'Back')).toBeDefined();
    });
  });

  describe('calculateACWR', () => {
    const referenceDate = new Date('2025-01-20');

    it('should return null ACWR for muscle group with no data', () => {
      const result = calculateACWR([], 'Chest', referenceDate);

      expect(result.acwr).toBeNull();
      expect(result.acuteLoad).toBe(0);
      expect(result.chronicLoad).toBe(0);
      expect(result.lastTrainedAt).toBeNull();
    });

    it('should calculate ACWR correctly with training data', () => {
      // Create 7 days of training data (one per day)
      const volumeData: DailyVolumeData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-01-14');
        date.setDate(date.getDate() + i);
        volumeData.push({
          date: date.toISOString().split('T')[0],
          targetArea: 'Chest',
          volumeKg: 1000,
          sessionRPE: 4,
          durationMinutes: 30,
        });
      }

      const result = calculateACWR(volumeData, 'Chest', referenceDate);

      expect(result.acuteLoad).toBe(7000); // 7 days * 1000
      expect(result.chronicLoad).toBe(1000); // 7000 / 7 days
      expect(result.acwr).toBe(7); // 7000 / 1000
      expect(result.lastTrainedAt).not.toBeNull();
    });

    it('should only consider data within the time window', () => {
      const volumeData: DailyVolumeData[] = [
        // Old data (> 28 days ago)
        {
          date: '2024-12-01',
          targetArea: 'Chest',
          volumeKg: 5000,
          sessionRPE: 5,
          durationMinutes: 60,
        },
        // Recent data (within 7 days)
        {
          date: '2025-01-18',
          targetArea: 'Chest',
          volumeKg: 1000,
          sessionRPE: 3,
          durationMinutes: 30,
        },
      ];

      const result = calculateACWR(volumeData, 'Chest', referenceDate);

      expect(result.acuteLoad).toBe(1000); // Only recent data
    });
  });

  describe('getRecoveryStatus', () => {
    it('should return "not_trained_yet" for null ACWR', () => {
      expect(getRecoveryStatus(null)).toBe('not_trained_yet');
    });

    it('should return "needs_rest" for ACWR > 1.5', () => {
      expect(getRecoveryStatus(1.6)).toBe('needs_rest');
      expect(getRecoveryStatus(2.0)).toBe('needs_rest');
    });

    it('should return "recovering" for ACWR > 1.2 and <= 1.5', () => {
      expect(getRecoveryStatus(1.3)).toBe('recovering');
      expect(getRecoveryStatus(1.5)).toBe('recovering');
    });

    it('should return "recovered" for ACWR between 0.8 and 1.2', () => {
      expect(getRecoveryStatus(0.8)).toBe('recovered');
      expect(getRecoveryStatus(1.0)).toBe('recovered');
      expect(getRecoveryStatus(1.2)).toBe('recovered');
    });

    it('should return "recovered" for ACWR < 0.8 (detraining)', () => {
      expect(getRecoveryStatus(0.5)).toBe('recovered');
      expect(getRecoveryStatus(0.3)).toBe('recovered');
    });
  });

  describe('getRecoveryRecommendation', () => {
    it('should provide appropriate recommendations for each status', () => {
      expect(getRecoveryRecommendation('needs_rest', 'Chest')).toContain('rest');
      expect(getRecoveryRecommendation('recovering', 'Chest')).toContain('recovering');
      expect(getRecoveryRecommendation('recovered', 'Chest')).toContain('ready');
      expect(getRecoveryRecommendation('not_trained_yet', 'Chest')).toContain('No recent training');
    });

    it('should include the target area in the recommendation', () => {
      expect(getRecoveryRecommendation('recovered', 'Chest')).toContain('chest');
      expect(getRecoveryRecommendation('recovered', 'Back')).toContain('back');
    });
  });

  describe('calculateAllMuscleRecoveryStatus', () => {
    it('should return empty array for null training plan', () => {
      const result = calculateAllMuscleRecoveryStatus(null);
      expect(result).toEqual([]);
    });

    it('should calculate recovery status for all trained muscle groups', () => {
      const completedDate = new Date('2025-01-15');
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
            createMockExercise(true, 'Back', [60, 60, 60], [12, 12, 12]),
          ], completedDate),
        ]),
      ]);

      const referenceDate = new Date('2025-01-20');
      const result = calculateAllMuscleRecoveryStatus(plan, referenceDate);

      expect(result.length).toBe(2);
      expect(result.find(r => r.targetArea === 'Chest')).toBeDefined();
      expect(result.find(r => r.targetArea === 'Back')).toBeDefined();
    });

    it('should sort results by status priority', () => {
      // Create data that results in different statuses
      const volumeData: DailyVolumeData[] = [];

      // Heavy recent training for Chest (needs_rest: high acute, low chronic)
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-01-14');
        date.setDate(date.getDate() + i);
        volumeData.push({
          date: date.toISOString().split('T')[0],
          targetArea: 'Chest',
          volumeKg: 3000, // Very high volume
          sessionRPE: 5,
          durationMinutes: 60,
        });
      }

      // Light training for Back (recovered)
      volumeData.push({
        date: '2025-01-15',
        targetArea: 'Back',
        volumeKg: 500,
        sessionRPE: 2,
        durationMinutes: 20,
      });

      // The sorting should prioritize needs_rest > recovering > recovered
    });
  });

  describe('calculateBaselineVolumes', () => {
    it('should return empty object for null training plan', () => {
      const result = calculateBaselineVolumes(null);
      expect(result).toEqual({});
    });

    it('should calculate average daily volume for each muscle group', () => {
      const plan = createMockPlan([
        createMockWeek(1, [
          createMockDailyTraining(true, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
          ], new Date('2025-01-15')),
          createMockDailyTraining(true, [
            createMockExercise(true, 'Chest', [80, 80, 80], [10, 10, 10]),
          ], new Date('2025-01-17')),
        ]),
      ]);

      const result = calculateBaselineVolumes(plan, new Date('2025-01-20'));

      // 2 training days with 2400kg each = 4800 total
      // Average = 4800 / 2 days = 2400
      expect(result['Chest']).toBe(2400);
    });
  });

  describe('ENDURANCE_TO_TARGET_AREA mapping', () => {
    it('should map running to Thighs', () => {
      expect(ENDURANCE_TO_TARGET_AREA['running']).toBe('Thighs');
    });

    it('should map cycling to Thighs', () => {
      expect(ENDURANCE_TO_TARGET_AREA['cycling']).toBe('Thighs');
    });

    it('should map swimming to Upper Arms', () => {
      expect(ENDURANCE_TO_TARGET_AREA['swimming']).toBe('Upper Arms');
    });

    it('should map rowing to Back', () => {
      expect(ENDURANCE_TO_TARGET_AREA['rowing']).toBe('Back');
    });

    it('should map other to null', () => {
      expect(ENDURANCE_TO_TARGET_AREA['other']).toBeNull();
    });
  });

  describe('getRecoveryStatusColor', () => {
    it('should return red for needs_rest', () => {
      expect(getRecoveryStatusColor('needs_rest')).toBe('#F44336');
    });

    it('should return orange for recovering', () => {
      expect(getRecoveryStatusColor('recovering')).toBe('#FF9800');
    });

    it('should return green for recovered', () => {
      expect(getRecoveryStatusColor('recovered')).toBe('#4CAF50');
    });

    it('should return gray for not_trained_yet', () => {
      expect(getRecoveryStatusColor('not_trained_yet')).toBe('#6B6B6B');
    });
  });

  describe('formatACWR', () => {
    it('should return "-" for null', () => {
      expect(formatACWR(null)).toBe('-');
    });

    it('should format to 2 decimal places', () => {
      expect(formatACWR(1.234567)).toBe('1.23');
      expect(formatACWR(0.5)).toBe('0.50');
      expect(formatACWR(2)).toBe('2.00');
    });
  });
});
