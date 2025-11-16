/**
 * Critical Smoke Tests for Authentication
 * Basic tests to verify core authentication functionality works
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

describe('AuthService - Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully sign in with email and password', async () => {
    const { supabase } = require('@/src/config/supabase');
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
    expect(result.session).toEqual(mockSession);
  });

  it('should successfully sign up with email and password', async () => {
    const { supabase } = require('@/src/config/supabase');
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
  });

  it('should successfully sign out', async () => {
    const { supabase } = require('@/src/config/supabase');
    const { TokenManager } = require('@/src/services/tokenManager');
    
    supabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const result = await AuthService.signOut();

    expect(result.success).toBe(true);
    expect(TokenManager.clearTokens).toHaveBeenCalled();
  });

  it('should check authentication status', async () => {
    const { TokenManager } = require('@/src/services/tokenManager');
    const mockSession = { user: { id: '123' } };
    
    TokenManager.getCurrentSession.mockResolvedValue(mockSession);

    const result = await AuthService.isAuthenticated();

    expect(result).toBe(true);
  });
});

