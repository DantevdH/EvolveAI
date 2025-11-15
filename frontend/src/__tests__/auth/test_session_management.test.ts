/**
 * Session Management Tests
 * Verify token refresh, session persistence, and logout
 */

jest.mock('@/src/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));

// Mock TokenManager methods
const mockStoreTokens = jest.fn().mockResolvedValue(undefined);
const mockClearTokens = jest.fn().mockResolvedValue(undefined);
const mockGetCurrentSession = jest.fn();
const mockGetAccessToken = jest.fn();
const mockGetRefreshToken = jest.fn();

jest.mock('@/src/services/tokenManager', () => {
  const actual = jest.requireActual('@/src/services/tokenManager');
  return {
    TokenManager: {
      storeTokens: mockStoreTokens,
      clearTokens: mockClearTokens,
      getCurrentSession: mockGetCurrentSession,
      getAccessToken: mockGetAccessToken,
      getRefreshToken: mockGetRefreshToken,
      // Use actual refreshAccessToken implementation
      refreshAccessToken: actual.TokenManager.refreshAccessToken,
    },
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { AuthService } from '@/src/services/authService';

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token', async () => {
      const { TokenManager } = require('@/src/services/tokenManager');
      const { supabase } = require('@/src/config/supabase');
      
      const oldRefreshToken = 'old_refresh_token';
      const newAccessToken = 'new_access_token';
      const newRefreshToken = 'new_refresh_token';
      const mockUser = { id: '123', email: 'test@example.com' };

      // Mock the refresh token retrieval
      mockGetRefreshToken.mockResolvedValue(oldRefreshToken);
      
      // Mock Supabase refresh session
      supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            user: mockUser,
          },
        },
        error: null,
      });

      // Call the actual method
      const result = await TokenManager.refreshAccessToken();

      expect(result).toBe(newAccessToken);
      expect(mockStoreTokens).toHaveBeenCalledWith(
        newAccessToken,
        newRefreshToken,
        '123'
      );
    });

    it('should handle refresh token expiration', async () => {
      const { TokenManager } = require('@/src/services/tokenManager');
      const { supabase } = require('@/src/config/supabase');
      
      mockGetRefreshToken.mockResolvedValue('expired_token');
      supabase.auth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid Refresh Token' },
      });

      const result = await TokenManager.refreshAccessToken();

      expect(result).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    it('should retrieve current session', async () => {
      const { TokenManager } = require('@/src/services/tokenManager');
      const mockSession = {
        access_token: 'token123',
        refresh_token: 'refresh123',
        user: { id: '123', email: 'test@example.com' },
      };

      mockGetCurrentSession.mockResolvedValue(mockSession);

      const session = await AuthService.getCurrentSession();

      expect(session).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      const { TokenManager } = require('@/src/services/tokenManager');
      
      mockGetCurrentSession.mockResolvedValue(null);

      const session = await AuthService.getCurrentSession();

      expect(session).toBeNull();
    });

    it('should get current user from session', async () => {
      const { supabase } = require('@/src/config/supabase');
      const mockUser = { id: '123', email: 'test@example.com' };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await AuthService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });
  });

  describe('Logout', () => {
    it('should clear all tokens and session on logout', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await AuthService.signOut();

      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockClearTokens).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const { supabase } = require('@/src/config/supabase');
      
      supabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await AuthService.signOut();

      // Should still attempt to clear tokens even if Supabase signOut fails
      expect(mockClearTokens).toHaveBeenCalled();
      expect(result.success).toBe(true); // SignOut continues even with errors
    });
  });

  describe('Authentication Status', () => {
    it('should correctly identify authenticated state', async () => {
      const mockSession = { user: { id: '123' } };

      mockGetCurrentSession.mockResolvedValue(mockSession);

      const isAuthenticated = await AuthService.isAuthenticated();

      expect(isAuthenticated).toBe(true);
    });

    it('should correctly identify unauthenticated state', async () => {
      mockGetCurrentSession.mockResolvedValue(null);

      const isAuthenticated = await AuthService.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });
  });
});

