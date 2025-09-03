/**
 * Onboarding form validation rules and utilities
 */

import { OnboardingData, ValidationRule, onboardingSteps } from '../types/onboarding';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a single field based on validation rules
 */
export const validateField = (
  field: keyof OnboardingData,
  value: any,
  rules: ValidationRule[]
): FieldValidationResult => {
  const fieldRules = rules.filter(rule => rule.field === field);
  
  for (const rule of fieldRules) {
    const result = validateRule(value, rule);
    if (!result.isValid) {
      return result;
    }
  }
  
  return { isValid: true };
};

/**
 * Validates a single rule
 */
const validateRule = (value: any, rule: ValidationRule): FieldValidationResult => {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        return { isValid: false, error: rule.message };
      }
      break;
      
    case 'min':
      if (typeof value === 'string' && value.length < rule.value) {
        return { isValid: false, error: rule.message };
      }
      if (typeof value === 'number' && value < rule.value) {
        return { isValid: false, error: rule.message };
      }
      if (Array.isArray(value) && value.length < rule.value) {
        return { isValid: false, error: rule.message };
      }
      break;
      
    case 'max':
      if (typeof value === 'string' && value.length > rule.value) {
        return { isValid: false, error: rule.message };
      }
      if (typeof value === 'number' && value > rule.value) {
        return { isValid: false, error: rule.message };
      }
      if (Array.isArray(value) && value.length > rule.value) {
        return { isValid: false, error: rule.message };
      }
      break;
      
    case 'pattern':
      if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
        return { isValid: false, error: rule.message };
      }
      break;
      
    case 'custom':
      if (rule.value && !rule.value(value)) {
        return { isValid: false, error: rule.message };
      }
      break;
  }
  
  return { isValid: true };
};

/**
 * Validates a specific onboarding step
 */
export const validateStep = (stepId: number, data: OnboardingData): ValidationResult => {
  const step = onboardingSteps.find(s => s.id === stepId);
  if (!step || !step.validationRules) {
    return { isValid: true, errors: [] };
  }
  
  const errors: string[] = [];
  
  for (const rule of step.validationRules) {
    const fieldValue = data[rule.field];
    const result = validateField(rule.field, fieldValue, [rule]);
    
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates all onboarding data
 */
export const validateAllSteps = (data: OnboardingData): ValidationResult => {
  const allErrors: string[] = [];
  let allValid = true;
  
  for (const step of onboardingSteps) {
    const stepResult = validateStep(step.id, data);
    if (!stepResult.isValid) {
      allValid = false;
      allErrors.push(...stepResult.errors);
    }
  }
  
  return {
    isValid: allValid,
    errors: allErrors
  };
};

/**
 * Validates specific onboarding fields with custom rules
 */
export const validateUsername = (username: string): FieldValidationResult => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true };
};

export const validateAge = (age: number): FieldValidationResult => {
  if (!age || age < 13) {
    return { isValid: false, error: 'Age must be at least 13' };
  }
  
  if (age > 100) {
    return { isValid: false, error: 'Age must be less than 100' };
  }
  
  return { isValid: true };
};

export const validateWeight = (weight: number, unit: 'kg' | 'lbs'): FieldValidationResult => {
  if (!weight || weight <= 0) {
    return { isValid: false, error: 'Weight must be greater than 0' };
  }
  
  if (unit === 'kg' && (weight < 20 || weight > 300)) {
    return { isValid: false, error: 'Weight must be between 20-300 kg' };
  }
  
  if (unit === 'lbs' && (weight < 44 || weight > 660)) {
    return { isValid: false, error: 'Weight must be between 44-660 lbs' };
  }
  
  return { isValid: true };
};

export const validateHeight = (height: number, unit: 'cm' | 'in'): FieldValidationResult => {
  if (!height || height <= 0) {
    return { isValid: false, error: 'Height must be greater than 0' };
  }
  
  if (unit === 'cm' && (height < 100 || height > 250)) {
    return { isValid: false, error: 'Height must be between 100-250 cm' };
  }
  
  if (unit === 'in' && (height < 39 || height > 98)) {
    return { isValid: false, error: 'Height must be between 39-98 inches' };
  }
  
  return { isValid: true };
};

export const validateDaysPerWeek = (days: number): FieldValidationResult => {
  if (!days || days < 1) {
    return { isValid: false, error: 'Must work out at least 1 day per week' };
  }
  
  if (days > 7) {
    return { isValid: false, error: 'Cannot work out more than 7 days per week' };
  }
  
  return { isValid: true };
};

export const validateMinutesPerSession = (minutes: number): FieldValidationResult => {
  if (!minutes || minutes < 15) {
    return { isValid: false, error: 'Workout must be at least 15 minutes' };
  }
  
  if (minutes > 180) {
    return { isValid: false, error: 'Workout should not exceed 180 minutes' };
  }
  
  return { isValid: true };
};

export const validateMotivationLevel = (level: number): FieldValidationResult => {
  if (!level || level < 1 || level > 10) {
    return { isValid: false, error: 'Motivation level must be between 1-10' };
  }
  
  return { isValid: true };
};

export const validateEquipmentSelection = (equipment: string[]): FieldValidationResult => {
  if (!equipment || equipment.length === 0) {
    return { isValid: false, error: 'Please select at least one equipment type' };
  }
  
  return { isValid: true };
};

export const validateGoalDescription = (description: string): FieldValidationResult => {
  if (description && description.length > 500) {
    return { isValid: false, error: 'Goal description must be less than 500 characters' };
  }
  
  return { isValid: true };
};

export const validateLimitationsDescription = (description: string, hasLimitations: boolean): FieldValidationResult => {
  if (hasLimitations && (!description || description.trim().length === 0)) {
    return { isValid: false, error: 'Please describe your limitations' };
  }
  
  if (description && description.length > 500) {
    return { isValid: false, error: 'Limitations description must be less than 500 characters' };
  }
  
  return { isValid: true };
};

export const validateHealthConditions = (hasConditions: boolean, conditions: string[]): FieldValidationResult => {
  if (hasConditions && (!conditions || conditions.length === 0)) {
    return { isValid: false, error: 'Please specify your health conditions' };
  }
  
  return { isValid: true };
};

export const validateTermsAcceptance = (termsAccepted: boolean, privacyAccepted: boolean): FieldValidationResult => {
  if (!termsAccepted) {
    return { isValid: false, error: 'You must accept the terms of service' };
  }
  
  if (!privacyAccepted) {
    return { isValid: false, error: 'You must accept the privacy policy' };
  }
  
  return { isValid: true };
};

/**
 * Gets validation errors for a specific step
 */
export const getStepValidationErrors = (stepId: number, data: OnboardingData): string[] => {
  const result = validateStep(stepId, data);
  return result.errors;
};

/**
 * Checks if a step can be completed (all required fields filled)
 */
export const canCompleteStep = (stepId: number, data: OnboardingData): boolean => {
  const result = validateStep(stepId, data);
  return result.isValid;
};

/**
 * Gets the next incomplete step
 */
export const getNextIncompleteStep = (data: OnboardingData): number | null => {
  for (const step of onboardingSteps) {
    if (!canCompleteStep(step.id, data)) {
      return step.id;
    }
  }
  return null;
};

/**
 * Gets completion percentage
 */
export const getCompletionPercentage = (data: OnboardingData): number => {
  let completedSteps = 0;
  
  for (const step of onboardingSteps) {
    if (canCompleteStep(step.id, data)) {
      completedSteps++;
    }
  }
  
  return Math.round((completedSteps / onboardingSteps.length) * 100);
};
