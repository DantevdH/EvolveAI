/**
 * Validation utilities for onboarding data and authentication forms
 */

import { AIQuestion, QuestionType, PersonalInfo } from '../types/onboarding';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates login form data
 */
export const validateLoginForm = (
  email: string,
  password: string
): ValidationResult => {
  // Email validation
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Email is required',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address',
    };
  }

  // Password validation
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Password is required',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Validates signup form data
 */
export interface SignupValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const validateSignupForm = (
  email: string,
  password: string,
  confirmPassword: string
): SignupValidationResult => {
  // Email validation
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Email is required',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address',
    };
  }

  // Password validation
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      errorMessage: 'Password must be at least 8 characters long',
    };
  }

  // Password strength check
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      isValid: false,
      errorMessage: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    };
  }

  // Confirm password validation
  if (!confirmPassword || confirmPassword.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Please confirm your password',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      errorMessage: 'Passwords do not match',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Validates if a value is a properly formatted response string
 */
export const isValidFormattedResponse = (response: any): response is string => {
  return typeof response === 'string' && 
         response.length > 0 && 
         response.includes('Q:') && 
         response.includes('A:');
};

/**
 * Validates if a value is a valid user profile for onboarding
 */
export const isValidUserProfile = (profile: any): boolean => {
  return profile && 
         typeof profile === 'object' &&
         typeof profile.username === 'string' &&
         typeof profile.age === 'number' &&
         typeof profile.weight === 'number' &&
         typeof profile.height === 'number';
};

/**
 * Validates if a value is a valid training plan
 */
export const isValidTrainingPlan = (plan: any): boolean => {
  return plan && 
         typeof plan === 'object' &&
         (plan.weekly_schedules || plan.training_plan_id);
};

/**
 * Cleans and validates user profile data for resume flow
 */
export const cleanUserProfileForResume = (profile: any) => {
  if (!isValidUserProfile(profile)) {
    console.warn('Invalid user profile detected, using defaults');
    return null;
  }

  return {
    username: profile.username || '',
    age: profile.age || 25,
    weight: profile.weight || 70,
    height: profile.height || 175,
    weight_unit: profile.weight_unit || 'kg',
    height_unit: profile.height_unit || 'cm',
    measurement_system: profile.weight_unit === 'lbs' ? 'imperial' : 'metric',
    gender: profile.gender || 'male',
    goal_description: profile.goalDescription || '',
    experience_level: profile.experienceLevel || 'novice',
    initial_questions: profile.initial_questions || null,
    initial_responses: profile.initial_responses || null,
    
    // AI messages from backend
    initial_ai_message: profile.initial_ai_message || null,
    
  };
};

/**
 * Onboarding step validators
 */

export const validateUsername = (username: string): ValidationResult => {
  const trimmed = (username || '').trim();
  if (trimmed.length < 3) {
    return {
      isValid: false,
      errorMessage: 'Username must be at least 3 characters long',
    };
  }
  if (trimmed.length > 20) {
    return {
      isValid: false,
      errorMessage: 'Username must be at most 20 characters long',
    };
  }
  return { isValid: true };
};

export const validatePersonalInfo = (personalInfo: PersonalInfo | null): ValidationResult => {
  if (!personalInfo) {
    return { isValid: false, errorMessage: 'Personal information is required' };
  }

  if (!personalInfo.gender || personalInfo.gender.trim().length === 0) {
    return { isValid: false, errorMessage: 'Gender is required' };
  }

  if (!personalInfo.age || personalInfo.age <= 0) {
    return { isValid: false, errorMessage: 'Age must be greater than 0' };
  }

  if (!personalInfo.weight || personalInfo.weight <= 0) {
    return { isValid: false, errorMessage: 'Weight must be greater than 0' };
  }

  if (!personalInfo.height || personalInfo.height <= 0) {
    return { isValid: false, errorMessage: 'Height must be greater than 0' };
  }

  return { isValid: true };
};

export const validateGoalDescription = (goalDescription: string): ValidationResult => {
  const trimmed = (goalDescription || '').trim();
  const minLength = 10;
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      errorMessage: `Please describe your training goal in at least ${minLength} characters`,
    };
  }
  return { isValid: true };
};

export const validateExperienceLevel = (experienceLevel: string): ValidationResult => {
  if (!experienceLevel || experienceLevel.trim().length === 0) {
    return { isValid: false, errorMessage: 'Please select your experience level' };
  }
  return { isValid: true };
};

/**
 * Validation result for an individual AI onboarding question response
 */
export interface QuestionValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates a single AI onboarding question response based on its type and config.
 *
 * This is used to decide whether a user can advance to the next onboarding question.
 */
export const validateQuestionResponse = (
  question: AIQuestion,
  value: any
): QuestionValidationResult => {
  // All AI questions are required in the onboarding flow (UX best practice)
  // Even if marked as optional in the backend, we require users to answer all questions
  const isRequired = true;

  const makeResult = (isValid: boolean, errorMessage?: string): QuestionValidationResult => ({
    isValid,
    errorMessage,
  });

  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0);

  // All questions must have some value
  if (isEmpty) {
    return makeResult(false, 'This question is required.');
  }

  switch (question.response_type) {
    case QuestionType.FREE_TEXT: {
      const text = typeof value === 'string' ? value.trim() : '';
      const minLength = question.min_length ?? 10;
      if (!text || text.length < minLength) {
        return makeResult(false, `Please provide at least ${minLength} characters.`);
      }
      if (question.max_length && text.length > question.max_length) {
        return makeResult(false, `Please keep your answer under ${question.max_length} characters.`);
      }
      return makeResult(true);
    }

    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.DROPDOWN: {
      const options = question.options || [];
      const allowedValues = new Set(options.map(o => o.value));

      if (question.multiselect) {
        if (!Array.isArray(value) || value.length === 0) {
          return makeResult(false, 'Please select at least one option.');
        }
        const invalid = value.some((v: any) => !allowedValues.has(String(v)));
        if (invalid) {
          return makeResult(false, 'One or more selected options are invalid.');
        }
        return makeResult(true);
      }

      // Single-select: check for empty value first
      const singleValue = Array.isArray(value) ? value[0] : value;
      const stringValue = String(singleValue);
      
      // Empty string or invalid value means no selection
      if (!singleValue || stringValue.trim().length === 0 || !allowedValues.has(stringValue)) {
        return makeResult(false, 'Please select a valid option.');
      }
      return makeResult(true);
    }

    case QuestionType.SLIDER:
    case QuestionType.RATING: {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) {
        return makeResult(false, 'Please select a value.');
      }

      if (typeof question.min_value === 'number' && num < question.min_value) {
        return makeResult(false, `Value must be at least ${question.min_value}.`);
      }
      if (typeof question.max_value === 'number' && num > question.max_value) {
        return makeResult(false, `Value must be at most ${question.max_value}.`);
      }

      if (typeof question.step === 'number' && question.step > 0) {
        const base = typeof question.min_value === 'number' ? question.min_value : 0;
        const delta = Math.abs(num - base);
        const remainder = delta % question.step;
        const tolerance = 1e-6;
        if (remainder > tolerance && Math.abs(remainder - question.step) > tolerance) {
          return makeResult(false, 'Value must align with the allowed step increments.');
        }
      }

      return makeResult(true);
    }

    case QuestionType.CONDITIONAL_BOOLEAN: {
      // Expected shape: { boolean: boolean, text?: string }
      const response = value || {};
      if (response.boolean === null || response.boolean === undefined) {
        return makeResult(false, 'Please answer yes or no.');
      }
      if (response.boolean === false) {
        return makeResult(true);
      }
      const text = typeof response.text === 'string' ? response.text.trim() : '';
      const minLength = question.min_length ?? 10;
      if (text.length < minLength) {
        return makeResult(false, `Please add a short explanation (at least ${minLength} characters).`);
      }
      return makeResult(true);
    }

    default:
      // If we don't recognize the type, fall back to basic non-empty check
      return makeResult(!isEmpty);
  }
};
