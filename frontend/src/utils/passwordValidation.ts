/**
 * Password validation utilities for settings and authentication
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errorMessage?: string;
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * Validates password for change/update operations
 * More lenient than signup validation (minimum 6 chars, no complexity required)
 */
export function validatePasswordChange(
  newPassword: string,
  confirmPassword: string
): PasswordValidationResult {
  // Check if passwords are provided
  if (!newPassword || newPassword.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'New password is required',
    };
  }

  if (!confirmPassword || confirmPassword.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Please confirm your password',
    };
  }

  // Minimum length check (Supabase requires at least 6 characters)
  if (newPassword.length < 6) {
    return {
      isValid: false,
      errorMessage: 'Password must be at least 6 characters long',
    };
  }

  // Maximum length check (reasonable limit)
  if (newPassword.length > 128) {
    return {
      isValid: false,
      errorMessage: 'Password must be less than 128 characters',
    };
  }

  // Check if passwords match
  if (newPassword !== confirmPassword) {
    return {
      isValid: false,
      errorMessage: 'New passwords do not match',
    };
  }

  // Calculate password strength (optional, for user feedback)
  const strength = calculatePasswordStrength(newPassword);

  return {
    isValid: true,
    strength,
  };
}

/**
 * Validates password with comprehensive requirements (for signup)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
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

  // Password strength checks
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

  const strength = calculatePasswordStrength(password);

  return {
    isValid: true,
    strength,
  };
}

/**
 * Calculates password strength based on complexity
 */
function calculatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
}

