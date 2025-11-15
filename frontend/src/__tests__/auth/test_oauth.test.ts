/**
 * OAuth Authentication Tests
 * Verify Google OAuth flow works on web and mobile
 */

jest.mock('@/src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

import { AuthService } from '@/src/services/authService';
import * as WebBrowser from 'expo-web-browser';

describe('OAuth Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default environment variable
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  describe('Google OAuth', () => {
    it('should initiate Google OAuth flow on web', async () => {
      const { supabase } = require('@/src/config/supabase');
      const { Platform } = require('react-native');
      Platform.OS = 'web';
      
      const mockOAuthUrl = 'https://accounts.google.com/oauth';
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      // Mock window.location
      const mockLocation = { href: '' };
      global.window = { location: mockLocation } as any;

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('supabase.co'),
        },
      });
      expect(mockLocation.href).toBe(mockOAuthUrl);
    });

    it('should initiate Google OAuth flow on mobile', async () => {
      const { supabase } = require('@/src/config/supabase');
      const { Platform } = require('react-native');
      Platform.OS = 'ios';
      
      const mockOAuthUrl = 'https://accounts.google.com/oauth';
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      const mockResult = {
        type: 'success' as const,
        url: 'frontendexpo2://oauth/callback#access_token=token&refresh_token=refresh',
      };
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockResult);

      supabase.auth.setSession.mockResolvedValue({
        data: {
          session: { access_token: 'token', refresh_token: 'refresh' },
          user: { id: '123', email: 'test@example.com' },
        },
        error: null,
      });

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(true);
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
    });

    it('should handle OAuth cancellation', async () => {
      const { supabase } = require('@/src/config/supabase');
      const mockOAuthUrl = 'https://accounts.google.com/oauth';
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel' as const,
      });

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication was cancelled');
    });

    it('should handle missing OAuth URL', async () => {
      const { supabase } = require('@/src/config/supabase');
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: null,
      });

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth URL not received from authentication server');
    });

    it('should handle OAuth errors', async () => {
      const { supabase } = require('@/src/config/supabase');
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to initiate OAuth flow');
    });
  });

  describe('Environment Validation', () => {
    it('should fail when Supabase URL is not configured', async () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;

      const result = await AuthService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Supabase URL is not configured');
    });
  });
});

