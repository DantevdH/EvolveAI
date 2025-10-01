/**
 * Unit tests for validation utilities
 */

import { validateField, validateStep } from '@/src/utils/onboardingValidation';
import { OnboardingData } from '@/src/types/onboarding';

describe('onboardingValidation', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'required' as const,
          message: 'Username is required',
        },
      ];

      const result = validateField('username', '', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should pass validation for valid required fields', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'required' as const,
          message: 'Username is required',
        },
      ];

      const result = validateField('username', 'TestUser', rules);
      expect(result.isValid).toBe(true);
    });

    it('should validate minimum length', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'min' as const,
          value: 3,
          message: 'Username must be at least 3 characters',
        },
      ];

      const result = validateField('username', 'ab', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    it('should validate maximum length', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'max' as const,
          value: 10,
          message: 'Username must be less than 10 characters',
        },
      ];

      const result = validateField('username', 'verylongusername', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be less than 10 characters');
    });

    it('should validate pattern (email format)', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'pattern' as const,
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email format',
        },
      ];

      const result = validateField('username', 'invalid-email', rules);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should pass validation for valid email pattern', () => {
      const rules = [
        {
          field: 'username' as keyof OnboardingData,
          type: 'pattern' as const,
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email format',
        },
      ];

      const result = validateField('username', 'test@example.com', rules);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateStep', () => {
    it('should validate a complete step', () => {
      const stepData = {
        username: 'TestUser',
        age: 25,
        weight: 70,
        weightUnit: 'kg' as const,
        height: 170,
        heightUnit: 'cm' as const,
        gender: 'Male' as const,
        experienceLevel: 'Beginner' as const,
        primaryGoal: 'Weight Loss',
        goalDescription: 'I want to lose weight',
        targetWeightUnit: 'kg' as const,
        timeline: '3 months',
        equipment: ['Home Gym'] as any[],
        homeGym: true,
        gymMembership: false,
        daysPerWeek: 3,
        minutesPerSession: 45,
        preferredTrainingTimes: ['Morning'],
        scheduleFlexibility: 'Somewhat Flexible' as const,
        hasLimitations: false,
        limitations: [],
        limitationsDescription: '',
        injuryHistory: '',
        finalNotes: '',
        termsAccepted: true,
        privacyAccepted: true,
        availableCoaches: [],
      } as OnboardingData;

      const result = validateStep(1, stepData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for incomplete step', () => {
      const stepData = {
        username: '',
        age: 25,
        weight: 70,
        weightUnit: 'kg' as const,
        height: 170,
        heightUnit: 'cm' as const,
        gender: 'Male' as const,
        experienceLevel: 'Beginner' as const,
        primaryGoal: 'Weight Loss',
        goalDescription: 'I want to lose weight',
        targetWeightUnit: 'kg' as const,
        timeline: '3 months',
        equipment: ['Home Gym'] as any[],
        homeGym: true,
        gymMembership: false,
        daysPerWeek: 3,
        minutesPerSession: 45,
        preferredTrainingTimes: ['Morning'],
        scheduleFlexibility: 'Somewhat Flexible' as const,
        hasLimitations: false,
        limitations: [],
        limitationsDescription: '',
        injuryHistory: '',
        finalNotes: '',
        termsAccepted: true,
        privacyAccepted: true,
        availableCoaches: [],
      } as OnboardingData;

      const result = validateStep(1, stepData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
