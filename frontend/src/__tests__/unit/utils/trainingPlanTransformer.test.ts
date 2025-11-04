/**
 * Critical Unit Tests: Training Plan Transformer
 * 
 * Tests the fixes for HTTP 422 error:
 * 1. transformStrengthExercise handles multiple data sources (enrichment vs JOIN)
 * 2. reverseTransformStrengthExercise never sends undefined values
 * 3. Round-trip data preservation
 */

import {
  transformTrainingPlan,
  reverseTransformTrainingPlan,
  BackendStrengthExercise,
  BackendTrainingPlan,
} from '../../../utils/trainingPlanTransformer';

// Import internal functions for unit testing
// Note: These are tested indirectly via transformTrainingPlan/reverseTransformTrainingPlan
// For now, we'll mock and test the behavior through integration

describe('TrainingPlanTransformer - HTTP 422 Fix Tests', () => {
  
  describe('Round-trip data preservation with enrichment', () => {
    
    it('should preserve all exercise metadata through full round-trip', () => {
      // Simulate backend format (after enrichment from save_training_plan)
      const backendPlan: BackendTrainingPlan = {
        id: 1,
        user_profile_id: 100,
        title: 'Test Plan',
        summary: 'Test summary',
        justification: 'Test justification',
        weekly_schedules: [
          {
            id: 1,
            training_plan_id: 1,
            week_number: 1,
            justification: 'Week 1',
            daily_trainings: [
              {
                id: 1,
                weekly_schedule_id: 1,
                day_of_week: 'Monday',
                is_rest_day: false,
                training_type: 'strength',
                justification: 'Upper body',
                strength_exercises: [
                  {
                    id: 1,
                    daily_training_id: 1,
                    exercise_id: 101,
                    exercise_name: 'Barbell Bench Press', // CRITICAL: from enrichment
                    main_muscle: 'Chest', // CRITICAL: from enrichment
                    equipment: 'Barbell', // CRITICAL: from enrichment
                    sets: 3,
                    reps: [8, 10, 8],
                    weight: [70, 70, 70],
                    execution_order: 1,
                    target_area: 'Upper Body',
                    main_muscles: ['Chest', 'Triceps'],
                    force: 'Push',
                  },
                ],
                endurance_sessions: [],
              },
            ],
          },
        ],
      };
      
      // Transform to frontend format
      const frontendPlan = transformTrainingPlan(backendPlan);
      
      // Verify extraction worked
      const exercise = frontendPlan.weeklySchedules[0].dailyTrainings[0].strengthExercises[0];
      expect(exercise.exerciseName).toBe('Barbell Bench Press');
      expect(exercise.mainMuscle).toBe('Chest');
      expect(exercise.equipment).toBe('Barbell');
      
      // Transform back to backend format
      const roundTripPlan = reverseTransformTrainingPlan(frontendPlan);
      
      // Verify critical fields are preserved
      const roundTripExercise = roundTripPlan.weekly_schedules[0].daily_trainings[0].strength_exercises[0];
      expect(roundTripExercise.exercise_id).toBe(101);
      expect(roundTripExercise.exercise_name).toBe('Barbell Bench Press');
      expect(roundTripExercise.main_muscle).toBe('Chest');
      expect(roundTripExercise.equipment).toBe('Barbell');
    });
    
    it('should handle nested exercises object from Supabase JOIN', () => {
      // Simulate Supabase JOIN format (from getTrainingPlan)
      const backendPlan: any = {
        id: 1,
        user_profile_id: 100,
        title: 'Test Plan',
        summary: 'Test summary',
        justification: 'Test justification',
        weekly_schedules: [
          {
            id: 1,
            training_plan_id: 1,
            week_number: 1,
            justification: 'Week 1',
            daily_trainings: [
              {
                id: 1,
                weekly_schedule_id: 1,
                day_of_week: 'Monday',
                is_rest_day: false,
                training_type: 'strength',
                justification: 'Lower body',
                strength_exercises: [
                  {
                    id: 1,
                    daily_training_id: 1,
                    exercise_id: 102,
                    sets: 3,
                    reps: [10, 12, 10],
                    weight: [100, 100, 100],
                    execution_order: 1,
                    exercises: {  // CRITICAL: Nested from Supabase JOIN
                      id: 102,
                      name: 'Barbell Squat',
                      main_muscle: 'Quadriceps',
                      equipment: 'Barbell',
                      target_area: 'Lower Body',
                    },
                  },
                ],
                endurance_sessions: [],
              },
            ],
          },
        ],
      };
      
      // Transform to frontend
      const frontendPlan = transformTrainingPlan(backendPlan as BackendTrainingPlan);
      
      // Verify extraction from nested object worked
      const exercise = frontendPlan.weeklySchedules[0].dailyTrainings[0].strengthExercises[0];
      expect(exercise.exerciseName).toBe('Barbell Squat');
      expect(exercise.mainMuscle).toBe('Quadriceps');
      expect(exercise.equipment).toBe('Barbell');
      
      // Round-trip
      const roundTripPlan = reverseTransformTrainingPlan(frontendPlan);
      const roundTripExercise = roundTripPlan.weekly_schedules[0].daily_trainings[0].strength_exercises[0];
      
      // Verify preservation
      expect(roundTripExercise.exercise_id).toBe(102);
      expect(roundTripExercise.exercise_name).toBe('Barbell Squat');
      expect(roundTripExercise.main_muscle).toBe('Quadriceps');
    });
    
    it('should never send undefined for critical fields', () => {
      const backendPlan: BackendTrainingPlan = {
        id: 1,
        user_profile_id: 100,
        title: 'Test Plan',
        summary: 'Test summary',
        justification: 'Test justification',
        weekly_schedules: [
          {
            id: 1,
            training_plan_id: 1,
            week_number: 1,
            justification: 'Week 1',
            daily_trainings: [
              {
                id: 1,
                weekly_schedule_id: 1,
                day_of_week: 'Monday',
                is_rest_day: false,
                training_type: 'strength',
                justification: 'Test',
                strength_exercises: [
                  {
                    id: 1,
                    daily_training_id: 1,
                    exercise_id: 103,
                    exercise_name: 'Push Up',
                    sets: 3,
                    reps: [15, 15, 15],
                    weight: [0, 0, 0],
                    execution_order: 1,
                  },
                ],
                endurance_sessions: [],
              },
            ],
          },
        ],
      };
      
      const frontendPlan = transformTrainingPlan(backendPlan);
      const roundTripPlan = reverseTransformTrainingPlan(frontendPlan);
      
      const exercise = roundTripPlan.weekly_schedules[0].daily_trainings[0].strength_exercises[0];
      
      // All fields should have values (null is OK, undefined is NOT)
      expect(exercise.exercise_id).not.toBeUndefined();
      expect(exercise.exercise_name).not.toBeUndefined();
      expect(exercise.sets).not.toBeUndefined();
      expect(exercise.reps).not.toBeUndefined();
      expect(exercise.weight).not.toBeUndefined();
      expect(exercise.execution_order).not.toBeUndefined();
    });
  });
  
  describe('Edge cases and error handling', () => {
    
    it('should handle missing optional metadata fields', () => {
      const backendPlan: BackendTrainingPlan = {
        id: 1,
        user_profile_id: 100,
        title: 'Test Plan',
        summary: 'Test summary',
        justification: 'Test justification',
        weekly_schedules: [
          {
            id: 1,
            training_plan_id: 1,
            week_number: 1,
            justification: 'Week 1',
            daily_trainings: [
              {
                id: 1,
                weekly_schedule_id: 1,
                day_of_week: 'Monday',
                is_rest_day: false,
                training_type: 'strength',
                justification: 'Test',
                strength_exercises: [
                  {
                    id: 1,
                    daily_training_id: 1,
                    exercise_id: 104,
                    exercise_name: undefined as any, // Missing name
                    sets: 3,
                    reps: [10, 10, 10],
                    weight: [50, 50, 50],
                    execution_order: 1,
                  },
                ],
                endurance_sessions: [],
              },
            ],
          },
        ],
      };
      
      // Should not throw
      const frontendPlan = transformTrainingPlan(backendPlan);
      const roundTripPlan = reverseTransformTrainingPlan(frontendPlan);
      
      // Should handle gracefully
      expect(roundTripPlan.weekly_schedules.length).toBe(1);
    });
  });
});

