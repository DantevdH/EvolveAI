/**
 * Validation utilities for forms
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return {
      isValid: false,
      errorMessage: 'Email is required'
    };
  }

  // Email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates password strength
 * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 special character
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return {
      isValid: false,
      errorMessage: 'Password is required'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      errorMessage: 'Password must be at least 8 characters long'
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: 'Password must contain at least one uppercase letter'
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: 'Password must contain at least one lowercase letter'
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      errorMessage: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates password confirmation
 */
export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return {
      isValid: false,
      errorMessage: 'Please confirm your password'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      errorMessage: 'Passwords do not match'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates login form
 */
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  if (!password.trim()) {
    return {
      isValid: false,
      errorMessage: 'Password is required'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates signup form
 */
export const validateSignupForm = (email: string, password: string, confirmPassword: string): ValidationResult => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }

  const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    return confirmPasswordValidation;
  }

  return {
    isValid: true
  };
};

/**
 * Validates forgot password form
 */
export const validateForgotPasswordForm = (email: string): ValidationResult => {
  return validateEmail(email);
};
