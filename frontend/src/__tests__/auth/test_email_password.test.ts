/**
 * Email/Password Authentication Tests
 * Verify login and signup flows work correctly
 */

jest.mock('@/src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('@/src/services/tokenManager', () => ({
  TokenManager: {
    storeTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { AuthService } from '@/src/services/authService';

describe('Email/Password Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const { supabase } = require('@/src/config/supabase');
      const { TokenManager } = require('@/src/services/tokenManager');
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { 
        access_token: 'token123', 
        refresh_token: 'refresh123',
        user: mockUser 
      };
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(TokenManager.storeTokens).toHaveBeenCalledWith(
        'token123',
        'refresh123',
        '123'
      );
    });

    it('should return sanitized error for invalid credentials', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      // Verify error doesn't expose sensitive info
      expect(result.error).not.toContain('credentials');
      expect(result.error).not.toContain('user');
    });

    it('should return sanitized error for unverified email', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please verify your email address before signing in');
    });

    it('should handle rate limiting errors', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests' },
      });

      const result = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many login attempts. Please try again later');
    });
  });

  describe('Signup Flow', () => {
    it('should successfully sign up with valid credentials', async () => {
      const { supabase } = require('@/src/config/supabase');
      const { TokenManager } = require('@/src/services/tokenManager');
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { 
        access_token: 'token123', 
        refresh_token: 'refresh123',
        user: mockUser 
      };
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await AuthService.signUpWithEmail({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(TokenManager.storeTokens).toHaveBeenCalled();
    });

    it('should return sanitized error for existing user', async () => {
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

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists');
    });

    it('should return sanitized error for weak password', async () => {
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

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password does not meet requirements');
    });

    it('should handle email verification required flow', async () => {
      const { supabase } = require('@/src/config/supabase');
      const mockUser = { id: '123', email: 'test@example.com', email_confirmed_at: null };
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await AuthService.signUpWithEmail({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe('Please check your email to verify your account');
    });
  });
});

