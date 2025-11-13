/**
 * Validation utilities for onboarding data and authentication forms
 */

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