/**
 * Unit Tests for Set Update Validation
 * Tests weight and reps validation logic
 */

import { TRAINING_VALIDATION_CONSTANTS, validateWeight, validateReps } from '../../utils/validation';

describe('Set Update Validation', () => {
  describe('Weight Validation', () => {
    it('should accept weight within valid range', () => {
      const MAX_WEIGHT = TRAINING_VALIDATION_CONSTANTS.MAX_WEIGHT;
      const validWeights = [0.5, 1, 50, 100, 200, MAX_WEIGHT];
      
      validWeights.forEach(weight => {
        const result = validateWeight(weight, weight);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(weight);
      });
    });

    it('should reject weight below minimum', () => {
      const invalidWeights = [-10, -1]; // Note: 0 is actually valid (MIN_WEIGHT = 0)
      
      invalidWeights.forEach(weight => {
        const result = validateWeight(weight, 50); // Use 50 as previous value (valid)
        expect(result.isValid).toBe(false);
        // When previous value is valid, it uses previous value as replacement
        expect(result.value).toBe(50);
      });
    });

    it('should reject weight above maximum', () => {
      const MAX_WEIGHT = TRAINING_VALIDATION_CONSTANTS.MAX_WEIGHT;
      const invalidWeights = [MAX_WEIGHT + 1, MAX_WEIGHT + 10, MAX_WEIGHT * 2];
      
      invalidWeights.forEach(weight => {
        const result = validateWeight(weight, 50); // Use 50 as previous value (valid)
        expect(result.isValid).toBe(false);
        // When previous value is valid, it uses previous value as replacement
        expect(result.value).toBe(50);
      });
    });

    it('should reject invalid weight types', () => {
      const invalidWeights = [NaN, Infinity, -Infinity];
      
      invalidWeights.forEach(weight => {
        const result = validateWeight(weight, 50); // Use 50 as previous value
        expect(result.isValid).toBe(false);
      });
    });

    it('should replace invalid weight with max when previous value is invalid', () => {
      const invalidWeight = 2000;
      const result = validateWeight(invalidWeight, 2000); // Previous value also invalid
      
      expect(result.isValid).toBe(false);
      expect(result.value).toBe(TRAINING_VALIDATION_CONSTANTS.MAX_WEIGHT);
    });
  });

  describe('Reps Validation', () => {
    it('should accept reps within valid range', () => {
      const validReps = [1, 5, 10, 20, 50, 99, 100];
      
      validReps.forEach(reps => {
        const result = validateReps(reps, reps);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(reps);
      });
    });

    it('should reject reps below minimum', () => {
      const invalidReps = [-5, 0];
      const MIN_REPS = TRAINING_VALIDATION_CONSTANTS.MIN_REPS;
      
      invalidReps.forEach(reps => {
        const result = validateReps(reps, 10); // Use 10 as previous value (valid)
        expect(result.isValid).toBe(false);
        // When previous value is valid, it uses previous value as replacement
        expect(result.value).toBe(10);
      });
    });

    it('should reject reps above maximum', () => {
      const invalidReps = [101, 200, 1000];
      const MAX_REPS = TRAINING_VALIDATION_CONSTANTS.MAX_REPS;
      
      invalidReps.forEach(reps => {
        const result = validateReps(reps, 10); // Use 10 as previous value (valid)
        expect(result.isValid).toBe(false);
        // When previous value is valid, it uses previous value as replacement
        expect(result.value).toBe(10);
      });
    });

    it('should reject invalid reps types', () => {
      const invalidReps = [NaN, Infinity, -Infinity];
      
      invalidReps.forEach(reps => {
        const result = validateReps(reps, 10); // Use 10 as previous value
        expect(result.isValid).toBe(false);
      });
    });

    it('should replace invalid reps with max when previous value is invalid', () => {
      const invalidReps = 200;
      const result = validateReps(invalidReps, 200); // Previous value also invalid
      
      expect(result.isValid).toBe(false);
      expect(result.value).toBe(TRAINING_VALIDATION_CONSTANTS.MAX_REPS);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal weight values', () => {
      const decimalWeights = [0.5, 1.25, 2.5, 10.75];
      
      decimalWeights.forEach(weight => {
        const result = validateWeight(weight, weight);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(weight);
      });
    });

    it('should handle boundary values correctly', () => {
      const MIN_WEIGHT = TRAINING_VALIDATION_CONSTANTS.MIN_WEIGHT;
      const MAX_WEIGHT = TRAINING_VALIDATION_CONSTANTS.MAX_WEIGHT;
      const MIN_REPS = TRAINING_VALIDATION_CONSTANTS.MIN_REPS;
      const MAX_REPS = TRAINING_VALIDATION_CONSTANTS.MAX_REPS;

      // Test minimum boundaries (should be valid)
      expect(validateWeight(MIN_WEIGHT, MIN_WEIGHT).isValid).toBe(true);
      expect(validateReps(MIN_REPS, MIN_REPS).isValid).toBe(true);

      // Test maximum boundaries (should be valid)
      expect(validateWeight(MAX_WEIGHT, MAX_WEIGHT).isValid).toBe(true);
      expect(validateReps(MAX_REPS, MAX_REPS).isValid).toBe(true);

      // Test just below minimum (should be invalid)
      expect(validateWeight(MIN_WEIGHT - 0.1, MIN_WEIGHT).isValid).toBe(false);
      expect(validateReps(MIN_REPS - 1, MIN_REPS).isValid).toBe(false);

      // Test just above maximum (should be invalid)
      expect(validateWeight(MAX_WEIGHT + 0.1, MAX_WEIGHT).isValid).toBe(false);
      expect(validateReps(MAX_REPS + 1, MAX_REPS).isValid).toBe(false);
    });
  });
});

