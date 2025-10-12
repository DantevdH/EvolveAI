/**
 * Integration tests for Authentication Services
 * Tests how AuthService integrates with the broader authentication system
 */

import { AuthService } from '@/src/services/authService';
import { TokenManager } from '@/src/services/tokenManager';

// Mock the dependencies
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
      signInWithOAuth: jest.fn(),
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

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete sign up to sign in flow', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const { TokenManager } = require('../../../services/tokenManager');
      
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123', refresh_token: 'refresh123' };

      // Mock successful signup
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock successful signin
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock successful session retrieval
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock successful user retrieval
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock TokenManager for isAuthenticated
      TokenManager.getCurrentSession.mockResolvedValue(mockSession);

      // Act - Complete flow
      const signupResult = await AuthService.signUpWithEmail({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const signinResult = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      const currentUser = await AuthService.getCurrentUser();
      const isAuthenticated = await AuthService.isAuthenticated();

      // Assert
      expect(signupResult.success).toBe(true);
      expect(signinResult.success).toBe(true);
      expect(currentUser).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
      expect(TokenManager.storeTokens).toHaveBeenCalled();
    });

    it('should handle complete sign out flow', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const { TokenManager } = require('../../../services/tokenManager');
      
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };

      // Mock authenticated state
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock TokenManager for isAuthenticated
      TokenManager.getCurrentSession.mockResolvedValue(mockSession);

      // Mock successful signout
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const isAuthenticatedBefore = await AuthService.isAuthenticated();
      const signoutResult = await AuthService.signOut();
      
      // Mock unauthenticated state after signout
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Update TokenManager mock to return null after signout
      TokenManager.getCurrentSession.mockResolvedValue(null);

      const isAuthenticatedAfter = await AuthService.isAuthenticated();

      // Assert
      expect(isAuthenticatedBefore).toBe(true);
      expect(signoutResult.success).toBe(true);
      expect(isAuthenticatedAfter).toBe(false);
      expect(TokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle network error and recovery', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };

      // Mock network error first
      supabase.auth.signInWithPassword.mockRejectedValueOnce(new Error('Network error'));

      // Mock successful retry
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act - First attempt (should fail)
      const firstAttempt = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      // Act - Retry (should succeed)
      const retryAttempt = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(firstAttempt.success).toBe(false);
      expect(firstAttempt.error).toContain('Network error');
      expect(retryAttempt.success).toBe(true);
      expect(retryAttempt.user).toEqual(mockUser);
    });

    it('should handle invalid credentials and recovery', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };

      // Mock invalid credentials
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      // Mock successful login with correct credentials
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act - Wrong password
      const wrongPassword = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      // Act - Correct password
      const correctPassword = await AuthService.signInWithEmail({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      // Assert
      expect(wrongPassword.success).toBe(false);
      expect(wrongPassword.error).toBe('Invalid credentials');
      expect(correctPassword.success).toBe(true);
      expect(correctPassword.user).toEqual(mockUser);
    });
  });

  describe('Session Management Integration', () => {
    it('should maintain session across multiple operations', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const { TokenManager } = require('../../../services/tokenManager');
      
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };

      // Mock authenticated state
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      TokenManager.getCurrentSession.mockResolvedValue(mockSession);

      // Act - Multiple operations that should maintain session
      const user1 = await AuthService.getCurrentUser();
      const isAuth1 = await AuthService.isAuthenticated();
      const user2 = await AuthService.getCurrentUser();
      const isAuth2 = await AuthService.isAuthenticated();

      // Assert - Session should be consistent
      expect(user1).toEqual(mockUser);
      expect(user2).toEqual(mockUser);
      expect(isAuth1).toBe(true);
      expect(isAuth2).toBe(true);
      expect(user1).toBe(user2); // Same reference
    });

    it('should handle session expiration gracefully', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      const { TokenManager } = require('../../../services/tokenManager');
      
      // Mock expired session
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      TokenManager.getCurrentSession.mockResolvedValue(null);

      // Act
      const user = await AuthService.getCurrentUser();
      const isAuthenticated = await AuthService.isAuthenticated();

      // Assert
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Password Reset Integration', () => {
    it('should handle complete password reset flow', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      
      // Mock successful password reset request
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // Act
      const resetResult = await AuthService.resetPassword('test@example.com');

      // Assert
      expect(resetResult.success).toBe(true);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('frontendexpo2://'),
        })
      );
    });

    it('should handle password reset errors', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      
      // Mock password reset error
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'Email not found' },
      });

      // Act
      const resetResult = await AuthService.resetPassword('nonexistent@example.com');

      // Assert
      expect(resetResult.success).toBe(false);
      expect(resetResult.error).toBe('Email not found');
    });
  });

  describe('OAuth Integration', () => {
    it('should handle OAuth provider initialization', async () => {
      // Arrange
      const { supabase } = require('../../../config/supabase');
      
      // Mock OAuth response
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://oauth.google.com' },
        error: null,
      });

      // Act
      const googleResult = await AuthService.signInWithGoogle();
      const appleResult = await AuthService.signInWithApple();
      const facebookResult = await AuthService.signInWithFacebook();

      // Assert
      expect(googleResult.success).toBe(true);
      expect(appleResult.success).toBe(true);
      expect(facebookResult.success).toBe(true);
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(3);
    });
  });
});
