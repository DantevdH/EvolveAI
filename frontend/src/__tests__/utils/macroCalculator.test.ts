/**
 * Tests for macro calculator utility
 */

import {
  calculateMacros,
  estimateBaseActivityFromProfile,
  estimateTrainingIntensity,
  estimateWeightGoalFromProfile,
  convertWeightToKg,
  convertHeightToCm,
  BASE_ACTIVITY_LEVELS,
  WORKOUT_INTENSITY,
} from '../../utils/macroCalculator';

describe('MacroCalculator', () => {
  describe('calculateMacros', () => {
    it('should calculate macros correctly for a male with weight loss goal', () => {
      const params = {
        sex: 'male' as const,
        weight: 80, // kg
        height: 180, // cm
        age: 30,
        baseActivity: 'moderate' as const,
        trainingsPerWeek: 4,
        trainingIntensity: 'medium' as const,
        targetWeight: 75, // kg (5kg loss)
        timeframeWeeks: 6, // weeks
      };

      const result = calculateMacros(params);

      // Basic checks
      expect(result.calories).toBeGreaterThan(0);
      expect(result.protein).toBeGreaterThan(0);
      expect(result.carbs).toBeGreaterThan(0);
      expect(result.fat).toBeGreaterThan(0);
      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(0);

      // Protein should be 2g per kg
      expect(result.protein).toBe(160); // 80kg * 2g/kg

      // Fat should be 1g per kg
      expect(result.fat).toBe(80); // 80kg * 1g/kg

      // TDEE should be higher than BMR
      expect(result.tdee).toBeGreaterThan(result.bmr);

      // For weight loss, calories should be less than TDEE
      expect(result.calories).toBeLessThan(result.tdee);
    });

    it('should calculate macros correctly for a female maintaining', () => {
      const params = {
        sex: 'female' as const,
        weight: 65, // kg
        height: 165, // cm
        age: 25,
        baseActivity: 'light' as const,
        trainingsPerWeek: 3,
        trainingIntensity: 'low' as const,
        targetWeight: 65, // kg (maintenance)
        timeframeWeeks: 6,
      };

      const result = calculateMacros(params);

      // Basic checks
      expect(result.calories).toBeGreaterThan(0);
      expect(result.protein).toBe(130); // 65kg * 2g/kg
      expect(result.fat).toBe(65); // 65kg * 1g/kg

      // For maintaining, calories should equal TDEE
      expect(result.calories).toBe(result.tdee);
    });

    it('should calculate macros correctly for muscle gain', () => {
      const params = {
        sex: 'male' as const,
        weight: 75, // kg
        height: 175, // cm
        age: 28,
        baseActivity: 'high' as const,
        trainingsPerWeek: 5,
        trainingIntensity: 'high' as const,
        targetWeight: 78, // kg (3kg gain)
        timeframeWeeks: 6,
      };

      const result = calculateMacros(params);

      // For muscle gain, calories should be higher than TDEE
      expect(result.calories).toBeGreaterThan(result.tdee);
      expect(result.protein).toBe(150); // 75kg * 2g/kg
      expect(result.fat).toBe(75); // 75kg * 1g/kg
    });
  });

  describe('estimateBaseActivityFromProfile', () => {
    it('should return sedentary for low activity', () => {
      const result = estimateBaseActivityFromProfile(1, 30); // 1 day/week
      expect(result).toBe(BASE_ACTIVITY_LEVELS.sedentary);
    });

    it('should return light for moderate activity', () => {
      const result = estimateBaseActivityFromProfile(3, 45); // 3 days/week
      expect(result).toBe(BASE_ACTIVITY_LEVELS.light);
    });

    it('should return moderate for regular activity', () => {
      const result = estimateBaseActivityFromProfile(5, 60); // 5 days/week
      expect(result).toBe(BASE_ACTIVITY_LEVELS.moderate);
    });

    it('should return high for very high activity', () => {
      const result = estimateBaseActivityFromProfile(6, 90); // 6 days/week
      expect(result).toBe(BASE_ACTIVITY_LEVELS.high);
    });
  });

  describe('estimateTrainingIntensity', () => {
    it('should return low for light trainings', () => {
      const result = estimateTrainingIntensity(3, 45); // 135 min/week
      expect(result).toBe(WORKOUT_INTENSITY.low);
    });

    it('should return medium for moderate trainings', () => {
      const result = estimateTrainingIntensity(4, 75); // 300 min/week
      expect(result).toBe(WORKOUT_INTENSITY.medium);
    });

    it('should return high for intensive trainings', () => {
      const result = estimateTrainingIntensity(5, 90); // 450 min/week
      expect(result).toBe(WORKOUT_INTENSITY.high);
    });
  });

  describe('estimateWeightGoalFromProfile', () => {
    it('should return weight loss goal for weight loss goals', () => {
      const result = estimateWeightGoalFromProfile('Weight Loss', 80);
      expect(result.targetWeight).toBeLessThan(80);
      expect(result.timeframeWeeks).toBe(6);
    });

    it('should return muscle gain goal for muscle gain goals', () => {
      const result = estimateWeightGoalFromProfile('Muscle Gain', 75);
      expect(result.targetWeight).toBeGreaterThan(75);
      expect(result.timeframeWeeks).toBe(6);
    });

    it('should return maintenance for general training goals', () => {
      const result = estimateWeightGoalFromProfile('General training', 70);
      expect(result.targetWeight).toBe(70);
      expect(result.timeframeWeeks).toBe(6);
    });
  });

  describe('convertWeightToKg', () => {
    it('should convert pounds to kilograms', () => {
      expect(convertWeightToKg(176, 'lbs')).toBeCloseTo(79.8, 1); // 176 lbs ≈ 79.8 kg
      expect(convertWeightToKg(154, 'lb')).toBeCloseTo(69.9, 1); // 154 lbs ≈ 69.9 kg
    });

    it('should return kilograms as-is', () => {
      expect(convertWeightToKg(80, 'kg')).toBe(80);
      expect(convertWeightToKg(70, 'KG')).toBe(70);
    });
  });

  describe('convertHeightToCm', () => {
    it('should convert feet to centimeters', () => {
      expect(convertHeightToCm(5, 'ft')).toBeCloseTo(152.4, 1); // 5 ft = 152.4 cm
      expect(convertHeightToCm(6, 'feet')).toBeCloseTo(182.88, 1); // 6 feet = 182.88 cm
    });

    it('should convert inches to centimeters', () => {
      expect(convertHeightToCm(72, 'in')).toBeCloseTo(182.88, 1); // 72 in = 182.88 cm
      expect(convertHeightToCm(60, 'inches')).toBeCloseTo(152.4, 1); // 60 inches = 152.4 cm
    });

    it('should return centimeters as-is', () => {
      expect(convertHeightToCm(180, 'cm')).toBe(180);
      expect(convertHeightToCm(165, 'CM')).toBe(165);
    });
  });
});
