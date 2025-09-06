import { supabase } from '@/src/config/supabase';
import { TokenManager } from './tokenManager';
import { Platform } from 'react-native';;

export interface AuthResponse {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthState {
  user: any | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export class AuthService {
  /**
   * Get the correct redirect URL based on platform
   */
  private static getRedirectUrl(path: string): string {
    // For both web and mobile, use HTTP URLs that Supabase accepts
    // These will work for web directly, and for mobile via deep linking
    if (Platform.OS === 'web') {
      // Safe check for window object
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3000';
      return `${origin}${path}`;
    } else {
      // For mobile development, use the app scheme for deep linking
      // This will open the app when the email link is clicked
      return `frontendexpo2://login`;
    }
  }
  /**
   * Sign in with email and password
   */
  static async signInWithEmail(credentials: LoginCredentials): Promise<AuthResponse> {
    try {

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {

        // Clear any existing session when auth fails
        await supabase.auth.signOut();
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.session && data.user) {

        // Store tokens securely
        await TokenManager.storeTokens(
          data.session.access_token,
          data.session.refresh_token,
          data.user.id
        );

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return {
        success: false,
        error: 'No session returned from authentication',
      };
    } catch (error) {
      console.error('💥 AuthService sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
          },
          emailRedirectTo: this.getRedirectUrl('/login'),
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.session && data.user) {
        // Store tokens securely
        await TokenManager.storeTokens(
          data.session.access_token,
          data.session.refresh_token,
          data.user.id
        );

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return {
        success: true,
        user: data.user,
        error: 'Please check your email to verify your account',
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: this.getRedirectUrl('/oauth/callback'),
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // OAuth flow initiated successfully
      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      console.error('Google sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign in with Apple OAuth
   */
  static async signInWithApple(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: this.getRedirectUrl('/oauth/callback'),
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      console.error('Apple sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign in with Facebook OAuth
   */
  static async signInWithFacebook(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: this.getRedirectUrl('/oauth/callback'),
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      console.error('Facebook sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Clear stored tokens
      await TokenManager.clearTokens();

      return {
        success: true,
      };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get current user session
   */
  static async getCurrentSession(): Promise<any> {
    try {
      const session = await TokenManager.getCurrentSession();
      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Get current user error:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return !!session;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: this.getRedirectUrl('/reset-password'),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: this.getRedirectUrl('/login'),
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
