/**
 * Error Handling Tests
 * Verify error messages don't expose sensitive data
 */

jest.mock('@/src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

jest.mock('@/src/services/tokenManager', () => ({
  TokenManager: {
    storeTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getCurrentSession: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { AuthService } from '@/src/services/authService';

describe('Error Handling - Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Message Sanitization', () => {
    it('should not expose user existence in login errors', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      // Simulate various error scenarios
      const errorScenarios = [
        { message: 'Invalid login credentials' },
        { message: 'Email not confirmed' },
        { message: 'Too many requests' },
        { message: 'User not found' }, // Should be sanitized
        { message: 'Account disabled' }, // Should be sanitized
      ];

      for (const error of errorScenarios) {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: null, session: null },
          error,
        });

        const result = await AuthService.signInWithEmail({
          email: 'test@example.com',
          password: 'password123',
        });

        // Verify error doesn't expose sensitive information
        expect(result.error).toBeDefined();
        if (result.error) {
          expect(result.error).not.toContain('User not found');
          expect(result.error).not.toContain('Account disabled');
          expect(result.error).not.toContain('credentials');
          expect(result.error).not.toContain('user');
          expect(result.error).not.toContain('account');
          
          // Verify error is user-friendly
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      }
    });

    it('should not expose password requirements details in signup errors', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 8 characters' },
      });

      const result = await AuthService.signUpWithEmail({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      });

      // Should return generic error, not expose password requirements
      expect(result.error).toBe('Password does not meet requirements');
      expect(result.error).not.toContain('8 characters');
      expect(result.error).not.toContain('Password should');
    });

    it('should not expose internal error details', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Internal server error: database connection failed')
      );

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should return generic error, not internal details
      expect(result.error).toBe('An unexpected error occurred. Please try again.');
      expect(result.error).not.toContain('database');
      expect(result.error).not.toContain('connection');
      expect(result.error).not.toContain('server');
    });

    it('should sanitize signup errors for existing users', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await AuthService.signUpWithEmail({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.error).toBe('An account with this email already exists');
      expect(result.error).not.toContain('User already');
      expect(result.error).not.toContain('registered');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again.');
      expect(result.error).not.toContain('Network');
    });

    it('should handle timeout errors gracefully', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Request timeout')
      );

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Error Response Structure', () => {
    it('should always return consistent error response structure', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      const errorCases = [
        { message: 'Invalid credentials' },
        { message: 'Network error' },
        null, // Network rejection
      ];

      for (const error of errorCases) {
        if (error === null) {
          supabase.auth.signInWithPassword.mockRejectedValueOnce(
            new Error('Network error')
          );
        } else {
          supabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: null, session: null },
            error,
          });
        }

        const result = await AuthService.signInWithEmail({
          email: 'test@example.com',
          password: 'password123',
        });

        // Verify consistent structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('error');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.error).toBe('string');
        expect(result.success).toBe(false);
      }
    });
  });
});

