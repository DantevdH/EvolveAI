/**
 * Unit tests for password validation utilities
 */

import {
  validatePasswordChange,
  validatePasswordStrength,
  PasswordValidationResult,
} from '../../utils/passwordValidation';

describe('passwordValidation', () => {
  describe('validatePasswordChange', () => {
    it('should validate matching passwords with minimum length', () => {
      const result = validatePasswordChange('password123', 'password123');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject passwords shorter than 6 characters', () => {
      const result = validatePasswordChange('pass', 'pass');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Password must be at least 6 characters long');
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePasswordChange(longPassword, longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Password must be less than 128 characters');
    });

    it('should reject when passwords do not match', () => {
      const result = validatePasswordChange('password123', 'password456');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('New passwords do not match');
    });

    it('should reject empty new password', () => {
      const result = validatePasswordChange('', 'password123');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('New password is required');
    });

    it('should reject empty confirm password', () => {
      const result = validatePasswordChange('password123', '');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Please confirm your password');
    });

    it('should reject whitespace-only passwords', () => {
      const result = validatePasswordChange('   ', '   ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('New password is required');
    });

    it('should accept password with exactly 6 characters', () => {
      const result = validatePasswordChange('pass12', 'pass12');
      expect(result.isValid).toBe(true);
    });

    it('should accept password with exactly 128 characters', () => {
      const password = 'a'.repeat(128);
      const result = validatePasswordChange(password, password);
      expect(result.isValid).toBe(true);
    });

    it('should calculate password strength', () => {
      const weakResult = validatePasswordChange('password', 'password');
      expect(weakResult.isValid).toBe(true);
      expect(weakResult.strength).toBeDefined();

      const strongResult = validatePasswordChange('P@ssw0rd123!', 'P@ssw0rd123!');
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.strength).toBeDefined();
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password with all requirements', () => {
      const result = validatePasswordStrength('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Pass123');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('password123');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('number');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Password is required');
    });

    it('should reject whitespace-only password', () => {
      const result = validatePasswordStrength('   ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Password is required');
    });

    it('should accept password with minimum requirements', () => {
      const result = validatePasswordStrength('Password1');
      expect(result.isValid).toBe(true);
    });

    it('should calculate strength correctly', () => {
      const weakResult = validatePasswordStrength('Password1');
      expect(weakResult.strength).toBeDefined();

      const mediumResult = validatePasswordStrength('Password123');
      expect(mediumResult.strength).toBeDefined();

      const strongResult = validatePasswordStrength('P@ssw0rd123!');
      expect(strongResult.strength).toBe('strong');
    });
  });
});

