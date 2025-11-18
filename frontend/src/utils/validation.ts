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

/**
 * Training-specific validation utilities
 */

export interface WeightValidationResult {
  isValid: boolean;
  value: number;
  replacement?: number;
  errorMessage?: string;
}

export interface RepsValidationResult {
  isValid: boolean;
  value: number;
  replacement?: number;
  errorMessage?: string;
}

const MAX_WEIGHT = 500; // Maximum reasonable weight in kg
const MAX_REPS = 100; // Maximum reasonable reps
const MIN_WEIGHT = 0;
const MIN_REPS = 1;

/**
 * Validates weight value for training exercises
 * Returns validated value with replacement if invalid
 */
export const validateWeight = (
  value: number,
  previousValue: number = 0
): WeightValidationResult => {
  // Check for NaN or non-finite values
  if (isNaN(value) || !isFinite(value)) {
    const replacement = previousValue >= MIN_WEIGHT && previousValue <= MAX_WEIGHT 
      ? previousValue 
      : MIN_WEIGHT;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Invalid weight value: ${value}. Using replacement: ${replacement}kg`
    };
  }

  // Check minimum
  if (value < MIN_WEIGHT) {
    const replacement = previousValue >= MIN_WEIGHT && previousValue <= MAX_WEIGHT 
      ? previousValue 
      : MIN_WEIGHT;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Weight must be at least ${MIN_WEIGHT}kg. Using replacement: ${replacement}kg`
    };
  }

  // Check maximum
  if (value > MAX_WEIGHT) {
    const replacement = previousValue >= MIN_WEIGHT && previousValue <= MAX_WEIGHT 
      ? previousValue 
      : MAX_WEIGHT;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Weight exceeds maximum ${MAX_WEIGHT}kg. Using replacement: ${replacement}kg`
    };
  }

  return {
    isValid: true,
    value
  };
};

/**
 * Validates reps value for training exercises
 * Returns validated integer value with replacement if invalid
 */
export const validateReps = (
  value: number,
  previousValue: number = 1
): RepsValidationResult => {
  // Ensure it's an integer
  const intValue = Math.round(value);

  // Check for NaN or non-finite values
  if (isNaN(intValue) || !isFinite(intValue)) {
    const replacement = previousValue >= MIN_REPS && previousValue <= MAX_REPS 
      ? Math.round(previousValue) 
      : MIN_REPS;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Invalid reps value: ${value}. Using replacement: ${replacement}`
    };
  }

  // Check minimum
  if (intValue < MIN_REPS) {
    const replacement = previousValue >= MIN_REPS && previousValue <= MAX_REPS 
      ? Math.round(previousValue) 
      : MIN_REPS;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Reps must be at least ${MIN_REPS}. Using replacement: ${replacement}`
    };
  }

  // Check maximum
  if (intValue > MAX_REPS) {
    const replacement = previousValue >= MIN_REPS && previousValue <= MAX_REPS 
      ? Math.round(previousValue) 
      : MAX_REPS;
    return {
      isValid: false,
      value: replacement,
      replacement,
      errorMessage: `Reps exceeds maximum ${MAX_REPS}. Using replacement: ${replacement}`
    };
  }

  return {
    isValid: true,
    value: intValue
  };
};

/**
 * Exports constants for use in components
 */
export const TRAINING_VALIDATION_CONSTANTS = {
  MAX_WEIGHT,
  MAX_REPS,
  MIN_WEIGHT,
  MIN_REPS,
  MIN_RPE: 1,
  MAX_RPE: 5,
  MIN_HEART_RATE_ZONE: 1,
  MAX_HEART_RATE_ZONE: 5,
  MIN_STAR_RATING: 1,
  MAX_STAR_RATING: 5,
  MAX_FEEDBACK_TEXT_LENGTH: 1000,
  MIN_TRAINING_VOLUME: 0.1
} as const;

/**
 * Training Plan Validation
 */
export interface TrainingPlanValidationResult extends ValidationResult {
  plan?: any; // Validated training plan
}

/**
 * Validates training plan data structure
 */
export const validateTrainingPlan = (plan: any): TrainingPlanValidationResult => {
  if (!plan) {
    return {
      isValid: false,
      errorMessage: 'Training plan is required'
    };
  }

  if (typeof plan !== 'object') {
    return {
      isValid: false,
      errorMessage: 'Training plan must be an object'
    };
  }

  // Check required fields
  if (!plan.id || typeof plan.id !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Training plan must have a valid id'
    };
  }

  if (!plan.title || typeof plan.title !== 'string' || plan.title.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Training plan must have a valid title'
    };
  }

  if (!plan.weeklySchedules || !Array.isArray(plan.weeklySchedules)) {
    return {
      isValid: false,
      errorMessage: 'Training plan must have weeklySchedules array'
    };
  }

  // Validate weekly schedules
  for (const week of plan.weeklySchedules) {
    if (!week.id || typeof week.id !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Weekly schedule must have a valid id'
      };
    }

    if (typeof week.weekNumber !== 'number' || week.weekNumber < 1) {
      return {
        isValid: false,
        errorMessage: 'Weekly schedule must have a valid weekNumber'
      };
    }

    if (!Array.isArray(week.dailyTrainings)) {
      return {
        isValid: false,
        errorMessage: 'Weekly schedule must have dailyTrainings array'
      };
    }
  }

  return {
    isValid: true,
    plan
  };
};

/**
 * RPE Validation
 */
export interface RPEValidationResult extends ValidationResult {
  rpe?: number;
  replacement?: number;
}

/**
 * Validates RPE (Rate of Perceived Exertion) value (1-5)
 * 
 * @param rpe - The RPE value to validate
 * @param options - Validation options
 * @param options.allowReplacement - If true, returns replacement value for invalid input (for programmatic data). If false, blocks invalid input (for user input). Default: false
 * @param options.previousValue - Previous value to use as replacement if allowReplacement is true. Default: 3
 * 
 * Best practice:
 * - Use allowReplacement: false for direct user input (button clicks, form submissions) → BLOCK and show error
 * - Use allowReplacement: true for programmatic data (API responses, corrupted data) → REPLACE and log
 */
export const validateRPE = (
  rpe: number | null | undefined, 
  options: { allowReplacement?: boolean; previousValue?: number } = {}
): RPEValidationResult => {
  const { allowReplacement = false, previousValue = 3 } = options;
  const DEFAULT_RPE = 3; // Middle value as safe default
  
  if (rpe === null || rpe === undefined) {
    if (allowReplacement) {
      const replacement = (previousValue >= TRAINING_VALIDATION_CONSTANTS.MIN_RPE && 
                           previousValue <= TRAINING_VALIDATION_CONSTANTS.MAX_RPE) 
        ? previousValue 
        : DEFAULT_RPE;
      return {
        isValid: false,
        rpe: replacement,
        replacement,
        errorMessage: `RPE is required. Using replacement: ${replacement}`
      };
    }
    return {
      isValid: false,
      errorMessage: 'RPE is required'
    };
  }

  const numRPE = typeof rpe === 'number' ? rpe : Number(rpe);

  if (isNaN(numRPE) || !isFinite(numRPE)) {
    if (allowReplacement) {
      const replacement = (previousValue >= TRAINING_VALIDATION_CONSTANTS.MIN_RPE && 
                           previousValue <= TRAINING_VALIDATION_CONSTANTS.MAX_RPE) 
        ? previousValue 
        : DEFAULT_RPE;
      return {
        isValid: false,
        rpe: replacement,
        replacement,
        errorMessage: `Invalid RPE value: ${rpe}. Using replacement: ${replacement}`
      };
    }
    return {
      isValid: false,
      errorMessage: 'RPE must be a valid number'
    };
  }

  if (numRPE < TRAINING_VALIDATION_CONSTANTS.MIN_RPE || numRPE > TRAINING_VALIDATION_CONSTANTS.MAX_RPE) {
    if (allowReplacement) {
      // Clamp to valid range
      const clamped = Math.max(
        TRAINING_VALIDATION_CONSTANTS.MIN_RPE,
        Math.min(TRAINING_VALIDATION_CONSTANTS.MAX_RPE, Math.round(numRPE))
      );
      return {
        isValid: false,
        rpe: clamped,
        replacement: clamped,
        errorMessage: `RPE ${numRPE} is out of range (${TRAINING_VALIDATION_CONSTANTS.MIN_RPE}-${TRAINING_VALIDATION_CONSTANTS.MAX_RPE}). Using replacement: ${clamped}`
      };
    }
    return {
      isValid: false,
      errorMessage: `RPE must be between ${TRAINING_VALIDATION_CONSTANTS.MIN_RPE} and ${TRAINING_VALIDATION_CONSTANTS.MAX_RPE}`
    };
  }

  return {
    isValid: true,
    rpe: Math.round(numRPE)
  };
};

/**
 * Daily Feedback Validation
 */
export interface DailyFeedbackValidationResult extends ValidationResult {
  feedback?: {
    energy_level: number;
    difficulty: number;
    enjoyment: number;
    soreness_level: number;
    user_feedback?: string;
  };
}

/**
 * Validates daily feedback data
 * 
 * @param feedback - The feedback data to validate
 * @param options - Validation options
 * @param options.allowReplacement - If true, returns replacement values for invalid input (for programmatic data). If false, blocks invalid input (for user input). Default: false
 * 
 * Best practice:
 * - Use allowReplacement: false for direct user input (form submissions) → BLOCK and show error
 * - Use allowReplacement: true for programmatic data (API responses, corrupted data) → REPLACE and log
 */
export const validateDailyFeedback = (
  feedback: {
    energy_level?: number;
    difficulty?: number;
    enjoyment?: number;
    soreness_level?: number;
    user_feedback?: string;
  },
  options: { allowReplacement?: boolean } = {}
): DailyFeedbackValidationResult => {
  const { allowReplacement = false } = options;
  const DEFAULT_STAR_RATING = 3; // Middle value as safe default
  
  const validateStarRating = (
    value: number | undefined, 
    fieldName: string
  ): { isValid: boolean; value?: number; errorMessage?: string } => {
    if (value === undefined || value === null) {
      return {
        isValid: false,
        errorMessage: `${fieldName} is required`
      };
    }

    const num = typeof value === 'number' ? value : Number(value);

    if (isNaN(num) || !isFinite(num)) {
      return {
        isValid: false,
        errorMessage: `${fieldName} must be a valid number`
      };
    }

    if (num < TRAINING_VALIDATION_CONSTANTS.MIN_STAR_RATING || num > TRAINING_VALIDATION_CONSTANTS.MAX_STAR_RATING) {
      return {
        isValid: false,
        errorMessage: `${fieldName} must be between ${TRAINING_VALIDATION_CONSTANTS.MIN_STAR_RATING} and ${TRAINING_VALIDATION_CONSTANTS.MAX_STAR_RATING}`
      };
    }

    return { isValid: true, value: Math.round(num) };
  };

  // Validate star ratings
  const energyResult = validateStarRating(feedback.energy_level, 'Energy level');
  const difficultyResult = validateStarRating(feedback.difficulty, 'Difficulty');
  const enjoymentResult = validateStarRating(feedback.enjoyment, 'Enjoyment');
  const sorenessResult = validateStarRating(feedback.soreness_level, 'Soreness level');

  // Collect all validation errors
  const errors: string[] = [];
  if (!energyResult.isValid) {
    errors.push(energyResult.errorMessage || 'Energy level validation failed');
  }
  if (!difficultyResult.isValid) {
    errors.push(difficultyResult.errorMessage || 'Difficulty validation failed');
  }
  if (!enjoymentResult.isValid) {
    errors.push(enjoymentResult.errorMessage || 'Enjoyment validation failed');
  }
  if (!sorenessResult.isValid) {
    errors.push(sorenessResult.errorMessage || 'Soreness level validation failed');
  }

  // If any validation failed
  if (errors.length > 0) {
    if (allowReplacement) {
      // For programmatic data: return replacement values (default to 3)
      return {
        isValid: false,
        errorMessage: errors.join('; '),
        feedback: {
          energy_level: energyResult.value ?? DEFAULT_STAR_RATING,
          difficulty: difficultyResult.value ?? DEFAULT_STAR_RATING,
          enjoyment: enjoymentResult.value ?? DEFAULT_STAR_RATING,
          soreness_level: sorenessResult.value ?? DEFAULT_STAR_RATING,
          user_feedback: feedback.user_feedback?.trim() || undefined
        }
      };
    } else {
      // For user input: block and show error
      return {
        isValid: false,
        errorMessage: errors.join('; ')
      };
    }
  }

  // Validate feedback text length if provided
  if (feedback.user_feedback !== undefined && feedback.user_feedback !== null) {
    const text = typeof feedback.user_feedback === 'string' ? feedback.user_feedback.trim() : String(feedback.user_feedback);
    if (text.length > TRAINING_VALIDATION_CONSTANTS.MAX_FEEDBACK_TEXT_LENGTH) {
      return {
        isValid: false,
        errorMessage: `Feedback text must be less than ${TRAINING_VALIDATION_CONSTANTS.MAX_FEEDBACK_TEXT_LENGTH} characters`
      };
    }
  }

  return {
    isValid: true,
    feedback: {
      energy_level: Math.round(feedback.energy_level!),
      difficulty: Math.round(feedback.difficulty!),
      enjoyment: Math.round(feedback.enjoyment!),
      soreness_level: Math.round(feedback.soreness_level!),
      user_feedback: feedback.user_feedback?.trim() || undefined
    }
  };
};

/**
 * Exercise Swap Validation
 */
export interface ExerciseSwapValidationResult extends ValidationResult {
  exercise?: any; // Validated exercise
}

/**
 * Validates exercise data for swap operation
 */
export const validateExerciseSwap = (exercise: any): ExerciseSwapValidationResult => {
  if (!exercise) {
    return {
      isValid: false,
      errorMessage: 'Exercise is required'
    };
  }

  if (typeof exercise !== 'object') {
    return {
      isValid: false,
      errorMessage: 'Exercise must be an object'
    };
  }

  // Required fields
  if (!exercise.id || (typeof exercise.id !== 'string' && typeof exercise.id !== 'number')) {
    return {
      isValid: false,
      errorMessage: 'Exercise must have a valid id'
    };
  }

  if (!exercise.name || typeof exercise.name !== 'string' || exercise.name.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Exercise must have a valid name'
    };
  }

  return {
    isValid: true,
    exercise
  };
};

/**
 * Endurance Session Validation
 */
export interface EnduranceSessionValidationResult extends ValidationResult {
  session?: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  };
}

/**
 * Validates endurance session data
 * 
 * @param session - The session data to validate
 * @param options - Validation options
 * @param options.allowReplacement - If true, returns replacement values for invalid input (for programmatic data). If false, blocks invalid input (for user input). Default: false
 * 
 * Best practice:
 * - Use allowReplacement: false for direct user input (form submissions) → BLOCK and show error
 * - Use allowReplacement: true for programmatic data (API responses, corrupted data) → REPLACE and log
 */
export const validateEnduranceSession = (
  session: {
    sportType?: string;
    trainingVolume?: number | string;
    unit?: string;
    heartRateZone?: number;
    name?: string;
    description?: string;
  },
  options: { allowReplacement?: boolean } = {}
): EnduranceSessionValidationResult => {
  const { allowReplacement = false } = options;
  if (!session.sportType || typeof session.sportType !== 'string' || session.sportType.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Sport type is required'
    };
  }

  const volume = typeof session.trainingVolume === 'string' 
    ? parseFloat(session.trainingVolume) 
    : (session.trainingVolume || 0);

  if (isNaN(volume) || !isFinite(volume) || volume < TRAINING_VALIDATION_CONSTANTS.MIN_TRAINING_VOLUME) {
    return {
      isValid: false,
      errorMessage: `Training volume must be at least ${TRAINING_VALIDATION_CONSTANTS.MIN_TRAINING_VOLUME}`
    };
  }

  if (!session.unit || typeof session.unit !== 'string' || session.unit.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Unit is required'
    };
  }

  const hrZone = session.heartRateZone;
  if (hrZone === undefined || hrZone === null) {
    return {
      isValid: false,
      errorMessage: 'Heart rate zone is required'
    };
  }

  const numHRZone = typeof hrZone === 'number' ? hrZone : Number(hrZone);
  if (isNaN(numHRZone) || !isFinite(numHRZone)) {
    if (allowReplacement) {
      const DEFAULT_HEART_RATE_ZONE = 3;
      return {
        isValid: false,
        errorMessage: `Invalid heart rate zone value: ${hrZone}. Using replacement: ${DEFAULT_HEART_RATE_ZONE}`,
        session: {
          sportType: session.sportType.trim(),
          trainingVolume: volume,
          unit: session.unit.trim(),
          heartRateZone: DEFAULT_HEART_RATE_ZONE,
          name: session.name?.trim() || undefined,
          description: session.description?.trim() || undefined
        }
      };
    }
    return {
      isValid: false,
      errorMessage: 'Heart rate zone must be a valid number'
    };
  }

  if (numHRZone < TRAINING_VALIDATION_CONSTANTS.MIN_HEART_RATE_ZONE || 
      numHRZone > TRAINING_VALIDATION_CONSTANTS.MAX_HEART_RATE_ZONE) {
    if (allowReplacement) {
      // Clamp to valid range
      const clamped = Math.max(
        TRAINING_VALIDATION_CONSTANTS.MIN_HEART_RATE_ZONE,
        Math.min(TRAINING_VALIDATION_CONSTANTS.MAX_HEART_RATE_ZONE, Math.round(numHRZone))
      );
      return {
        isValid: false,
        errorMessage: `Heart rate zone ${numHRZone} is out of range (${TRAINING_VALIDATION_CONSTANTS.MIN_HEART_RATE_ZONE}-${TRAINING_VALIDATION_CONSTANTS.MAX_HEART_RATE_ZONE}). Using replacement: ${clamped}`,
        session: {
          sportType: session.sportType.trim(),
          trainingVolume: volume,
          unit: session.unit.trim(),
          heartRateZone: clamped,
          name: session.name?.trim() || undefined,
          description: session.description?.trim() || undefined
        }
      };
    }
    return {
      isValid: false,
      errorMessage: `Heart rate zone must be between ${TRAINING_VALIDATION_CONSTANTS.MIN_HEART_RATE_ZONE} and ${TRAINING_VALIDATION_CONSTANTS.MAX_HEART_RATE_ZONE}`
    };
  }

  return {
    isValid: true,
    session: {
      sportType: session.sportType.trim(),
      trainingVolume: volume,
      unit: session.unit.trim(),
      heartRateZone: Math.round(numHRZone),
      name: session.name?.trim() || undefined,
      description: session.description?.trim() || undefined
    }
  };
};

/**
 * Exercise Search Validation
 */
export interface ExerciseSearchValidationResult extends ValidationResult {
  searchTerm?: string;
}

/**
 * Validates exercise search input
 */
export const validateExerciseSearch = (searchTerm: string | undefined | null): ExerciseSearchValidationResult => {
  if (searchTerm === undefined || searchTerm === null) {
    return {
      isValid: true, // Empty search is valid (shows all exercises)
      searchTerm: ''
    };
  }

  const trimmed = typeof searchTerm === 'string' ? searchTerm.trim() : String(searchTerm);

  // Search term can be empty (shows all) or have a reasonable length
  if (trimmed.length > 100) {
    return {
      isValid: false,
      errorMessage: 'Search term must be less than 100 characters'
    };
  }

  return {
    isValid: true,
    searchTerm: trimmed
  };
};

/**
 * Exercise Detail Validation
 */
export interface ExerciseDetailValidationResult extends ValidationResult {
  exercise?: any;
}

/**
 * Validates exercise detail data
 */
export const validateExerciseDetail = (exercise: any): ExerciseDetailValidationResult => {
  if (!exercise) {
    return {
      isValid: false,
      errorMessage: 'Exercise is required'
    };
  }

  if (typeof exercise !== 'object') {
    return {
      isValid: false,
      errorMessage: 'Exercise must be an object'
    };
  }

  // At minimum, exercise should have an id
  if (!exercise.id || (typeof exercise.id !== 'string' && typeof exercise.id !== 'number')) {
    return {
      isValid: false,
      errorMessage: 'Exercise must have a valid id'
    };
  }

  return {
    isValid: true,
    exercise
  };
};
