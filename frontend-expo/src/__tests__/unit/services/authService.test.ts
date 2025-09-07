/**
 * Simple unit tests for AuthService - testing business logic without React Native dependencies
 */

// Mock the dependencies before importing
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
    },
  },
}));

jest.mock('../../../services/tokenManager', () => ({
  TokenManager: {
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    getCurrentSession: jest.fn(),
    storeTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Now import the AuthService
import { AuthService } from '@/src/services/authService';

describe('AuthService - Business Logic', () => {
  const mockCredentials = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockSignupData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should return success response when Supabase returns valid data', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      const result = await AuthService.signInWithEmail(mockCredentials);

      // Assert
      console.log('SignIn result:', result); // Debug log
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(mockCredentials);
    });

    it('should return error response when Supabase returns error', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      // Act
      const result = await AuthService.signInWithEmail(mockCredentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await AuthService.signInWithEmail(mockCredentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('signUpWithEmail', () => {
    it('should return success response when signup succeeds', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      const result = await AuthService.signUpWithEmail(mockSignupData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
    });

    it('should return error response when user already exists', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      // Act
      const result = await AuthService.signUpWithEmail(mockSignupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered');
    });
  });

  describe('signOut', () => {
    it('should return success when signout succeeds', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const result = await AuthService.signOut();

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when signout fails', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      // Act
      const result = await AuthService.signOut();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const mockUser = { id: '123', email: 'test@example.com' };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const result = await AuthService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await AuthService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user has valid session', async () => {
      // Arrange
      const { TokenManager } = require('../../../services/tokenManager');
      const mockSession = { user: { id: '123' } };
      
      TokenManager.getCurrentSession.mockResolvedValue(mockSession);

      // Act
      const result = await AuthService.isAuthenticated();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no session', async () => {
      // Arrange
      const { TokenManager } = require('../../../services/tokenManager');
      TokenManager.getCurrentSession.mockResolvedValue(null);

      // Act
      const result = await AuthService.isAuthenticated();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should return success when reset email is sent', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // Act
      const result = await AuthService.resetPassword('test@example.com');

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when reset fails', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'Email not found' },
      });

      // Act
      const result = await AuthService.resetPassword('test@example.com');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found');
    });
  });
});
