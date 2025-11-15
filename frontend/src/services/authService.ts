import { supabase } from '@/src/config/supabase';
import { TokenManager } from './tokenManager';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { logger } from '@/src/utils/logger';

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
   * Get the OAuth callback URL based on platform
   * For web: Use Supabase's hosted callback
   * For mobile: Use app deep link scheme (iOS requires this for openAuthSessionAsync)
   */
  private static getOAuthCallbackUrl(): string {
    if (Platform.OS === 'web') {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set');
      }
      // On web, use Supabase's hosted callback
      return `${supabaseUrl}/auth/v1/callback`;
    } else {
      // On mobile, use app deep link scheme
      // This will allow Supabase to redirect back to our app after OAuth
      return 'frontendexpo2://oauth/callback';
    }
  }

  /**
   * Get the Supabase hosted OAuth callback URL (for redirectTo in OAuth request)
   * This tells Supabase where to redirect after processing OAuth
   */
  private static getSupabaseOAuthCallbackUrl(): string {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set');
    }
    // Use Supabase's hosted callback endpoint
    return `${supabaseUrl}/auth/v1/callback`;
  }

  /**
   * Get the correct redirect URL based on platform
   * Used for email verification links and password reset
   * 
   * IMPORTANT: For mobile apps, we should NEVER use localhost URLs
   * - Email links should redirect to Supabase callback
   * - Supabase callback will handle redirecting to the app deep link
   */
  private static getRedirectUrl(path: string): string {
    logger.debug('getRedirectUrl called', { platform: Platform.OS, path });
    
    // Always use Supabase callback URL for email verification/password reset
    // This is the safest approach and works for both web and mobile
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
      logger.error('EXPO_PUBLIC_SUPABASE_URL not set');
      // Fallback - but this should never happen
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        logger.warn('Using window origin as fallback', { origin });
        return `${origin}${path}`;
      }
      // For mobile, use deep link scheme as last resort
      return `frontendexpo2://${path.replace('/', '')}`;
    }
    
    // For mobile apps (iOS/Android), ALWAYS use Supabase callback URL
    // This ensures proper handling of email verification links
    // The callback will redirect to the app deep link automatically
    if (Platform.OS !== 'web') {
      logger.debug('Mobile platform detected - using Supabase callback URL');
      const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
      logger.debug('Redirect URL', { callbackUrl });
      return callbackUrl;
    }
    
    // For web platform, use Supabase callback or current origin
    if (Platform.OS === 'web') {
      // Use Supabase callback for email verification and password reset
      if (path === '/login' || path === '/reset-password') {
        const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
        logger.debug('Web platform - using Supabase callback', { callbackUrl });
        return callbackUrl;
      }
      
      // For other paths on web, use current origin (not localhost:8081!)
      if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        // Only use origin if it's NOT a development bundler URL (localhost:8081, etc.)
        if (!origin.includes(':8081') && !origin.includes(':19000') && !origin.includes(':19006')) {
          logger.debug('Web platform - using window origin', { origin });
          return `${origin}${path}`;
        }
      }
      
      // Default: use Supabase callback
      const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
      logger.debug('Web platform - using Supabase callback (default)', { callbackUrl });
      return callbackUrl;
    }
    
    // Fallback (should never reach here)
    logger.warn('Unknown platform, using Supabase callback as fallback');
        return `${supabaseUrl}/auth/v1/callback`;
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
        
        // Sanitize error message to avoid exposing sensitive information
        let sanitizedError = 'Invalid email or password';
        if (error.message.includes('Email not confirmed')) {
          sanitizedError = 'Please verify your email address before signing in';
        } else if (error.message.includes('Invalid login credentials')) {
          sanitizedError = 'Invalid email or password';
        } else if (error.message.includes('Too many requests')) {
          sanitizedError = 'Too many login attempts. Please try again later';
        }
        
        return {
          success: false,
          error: sanitizedError,
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
      logger.error('Sign in error', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
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
        // Sanitize error message
        let sanitizedError = 'Unable to create account. Please try again.';
        if (error.message.includes('User already registered')) {
          sanitizedError = 'An account with this email already exists';
        } else if (error.message.includes('Password')) {
          sanitizedError = 'Password does not meet requirements';
        }
        
        return {
          success: false,
          error: sanitizedError,
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
      logger.error('Sign up error', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<AuthResponse> {
    try {
      logger.debug('Starting Google OAuth flow', { platform: Platform.OS });
      
      // Check environment variable first
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        logger.error('EXPO_PUBLIC_SUPABASE_URL is not set');
        return {
          success: false,
          error: 'Supabase URL is not configured. Please check your environment variables.',
        };
      }
      
      // For mobile, we need to tell Supabase to redirect to our app's deep link
      // For web, we use Supabase's hosted callback
      const redirectToUrl = Platform.OS === 'web' 
        ? this.getSupabaseOAuthCallbackUrl()
        : 'frontendexpo2://oauth/callback';  // App deep link for mobile
      
      logger.debug('Calling supabase.auth.signInWithOAuth', { redirectToUrl });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) {
        logger.error('OAuth error from Supabase', error);
        return {
          success: false,
          error: 'Failed to initiate OAuth flow',
        };
      }

      // On React Native, we need to manually open the OAuth URL
      if (!data?.url) {
        logger.error('No OAuth URL returned from Supabase');
        return {
          success: false,
          error: 'OAuth URL not received from authentication server',
        };
      }

      // Platform-specific handling
      if (Platform.OS === 'web') {
        logger.debug('Opening OAuth URL in web browser');
        // On web, we can redirect directly or use window.open
        window.location.href = data.url;
        return {
          success: true,
          user: null,
          session: null,
        };
      }

      logger.debug('Opening browser with OAuth URL on native platform');
      
      // On mobile, openAuthSessionAsync needs the app's deep link scheme
      // This must match the redirectToUrl we passed to Supabase OAuth
      const appRedirectUrl = redirectToUrl;
      
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          appRedirectUrl
        );

        logger.debug('Browser result', { type: result.type });

        if (result.type === 'success' && result.url) {
          logger.debug('OAuth redirect successful, extracting tokens');
          
          // Extract tokens from URL hash fragment
          try {
            const url = result.url;
            const hasHash = url.includes('#');
            
            if (hasHash) {
              const hashPart = url.split('#')[1];
              const hashParams = new URLSearchParams(hashPart);
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              
              if (accessToken && refreshToken) {
                logger.debug('Tokens found, setting user session');
                const { data, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (sessionError) {
                  logger.error('Error setting session, callback screen will handle', sessionError);
                  // Don't fail here - let callback screen handle it
                } else if (data.session && data.user) {
                  logger.debug('Session set successfully, authentication complete');
                  // Session is now set - auth state listener will update context
                  return {
                    success: true,
                    user: data.user,
                    session: data.session,
                  };
                } else {
                  logger.error('Session set but no user/session in response');
                }
              } else {
                logger.debug('Tokens missing from URL');
              }
            } else {
              logger.debug('No hash fragment in URL, callback screen will handle');
            }
          } catch (tokenError) {
            logger.error('Error extracting tokens from URL', tokenError);
            // Don't fail here - let callback screen handle it
          }
          
          // If we get here, tokens weren't in the URL or extraction failed
          // The callback screen will handle it via getSession() or token extraction
        } else if (result.type === 'cancel') {
          logger.debug('User cancelled OAuth flow');
          return {
            success: false,
            error: 'Authentication was cancelled',
          };
        } else if (result.type === 'dismiss') {
          logger.debug('OAuth flow dismissed');
          return {
            success: false,
            error: 'Authentication was dismissed',
          };
        } else {
          logger.warn('Unknown browser result type', { type: result.type });
        }
      } catch (browserError) {
        logger.error('Error opening browser', browserError);
        return {
          success: false,
          error: 'Failed to open browser for authentication',
        };
      }

      // OAuth flow initiated successfully
      logger.debug('OAuth flow initiated successfully');
      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      logger.error('Google sign in error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
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
          redirectTo: this.getSupabaseOAuthCallbackUrl(),
        },
      });

      if (error) {
        logger.error('OAuth error', error);
        return {
          success: false,
          error: 'Failed to initiate OAuth flow',
        };
      }

      // On React Native, we need to manually open the OAuth URL
      if (data?.url) {
        try {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            this.getSupabaseOAuthCallbackUrl()
          );

          if (result.type === 'success' && result.url) {
            logger.debug('OAuth redirect successful');
          }
        } catch (browserError) {
          logger.error('Error opening browser', browserError);
          return {
            success: false,
            error: 'Failed to open browser for authentication',
          };
        }
      }

      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      logger.error('Apple sign in error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign in with Facebook OAuth
   */
  static async signInWithFacebook(): Promise<AuthResponse> {
    try {
      logger.debug('Starting Facebook OAuth flow', { platform: Platform.OS });
      
      // Check environment variable first
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        logger.error('EXPO_PUBLIC_SUPABASE_URL is not set');
        return {
          success: false,
          error: 'Supabase URL is not configured. Please check your environment variables.',
        };
      }
      
      // For mobile, we need to tell Supabase to redirect to our app's deep link
      // For web, we use Supabase's hosted callback
      const redirectToUrl = Platform.OS === 'web' 
        ? this.getSupabaseOAuthCallbackUrl()
        : 'frontendexpo2://oauth/callback';  // App deep link for mobile
      
      logger.debug('Calling supabase.auth.signInWithOAuth', { redirectToUrl });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) {
        logger.error('OAuth error from Supabase', error);
        return {
          success: false,
          error: 'Failed to initiate OAuth flow',
        };
      }

      // On React Native, we need to manually open the OAuth URL
      if (!data?.url) {
        logger.error('No OAuth URL returned from Supabase');
        return {
          success: false,
          error: 'OAuth URL not received from authentication server',
        };
      }

      // Platform-specific handling
      if (Platform.OS === 'web') {
        logger.debug('Opening OAuth URL in web browser');
        window.location.href = data.url;
        return {
          success: true,
          user: null,
          session: null,
        };
      }

      logger.debug('Opening browser with OAuth URL on native platform');
      
      // On mobile, openAuthSessionAsync needs the app's deep link scheme
      // This must match the redirectToUrl we passed to Supabase OAuth
      const appRedirectUrl = redirectToUrl;
      
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          appRedirectUrl
        );

        logger.debug('Browser result', { type: result.type });

        if (result.type === 'success') {
          logger.debug('OAuth redirect successful');
          // The deep link will trigger our oauth/callback route
        } else if (result.type === 'cancel') {
          logger.debug('User cancelled OAuth flow');
          return {
            success: false,
            error: 'Authentication was cancelled',
          };
        } else if (result.type === 'dismiss') {
          logger.debug('OAuth flow dismissed');
          return {
            success: false,
            error: 'Authentication was dismissed',
          };
        } else {
          logger.warn('Unknown browser result type', { type: result.type });
        }
      } catch (browserError) {
        logger.error('Error opening browser', browserError);
        return {
          success: false,
          error: 'Failed to open browser for authentication',
        };
      }

      // OAuth flow initiated successfully
      logger.debug('OAuth flow initiated successfully');
      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      logger.error('Facebook sign in error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<AuthResponse> {
    try {
      logger.debug('Signing out user, clearing all storage');
      
      // Sign out from Supabase (clears session from AsyncStorage)
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('Supabase signOut error', error);
        // Continue anyway to clear other storage
      } else {
        logger.debug('Supabase session cleared from AsyncStorage');
      }

      // Clear stored tokens from SecureStore
      await TokenManager.clearTokens();
      logger.debug('Tokens cleared from SecureStore');

      // Also manually clear AsyncStorage entries that Supabase might use
      // Supabase stores sessions with keys like: sb-<project-ref>-auth-token
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        
        if (supabaseUrl) {
          // Extract project ID from URL (e.g., fdiaqlotrgnotvyaswlq from https://fdiaqlotrgnotvyaswlq.supabase.co)
          const projectMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
          if (projectMatch && projectMatch[1]) {
            const projectId = projectMatch[1];
            const supabaseKey = `sb-${projectId}-auth-token`;
            
            // Clear Supabase session key from AsyncStorage
            await AsyncStorage.removeItem(supabaseKey);
            logger.debug('Cleared AsyncStorage key', { key: supabaseKey });
            
            // Also try the older format (in case it exists)
            await AsyncStorage.removeItem(`supabase.auth.token`);
            logger.debug('Cleared legacy AsyncStorage key');
          }
        }
        
        // Clear all AsyncStorage keys containing 'supabase' or 'auth'
        const allKeys = await AsyncStorage.getAllKeys();
        const supabaseKeys = allKeys.filter((key: string) => 
          key.includes('supabase') || 
          key.includes('sb-') ||
          (key.includes('auth') && key.includes('token'))
        );
        
        if (supabaseKeys.length > 0) {
          await AsyncStorage.multiRemove(supabaseKeys);
          logger.debug('Cleared Supabase-related AsyncStorage keys', { count: supabaseKeys.length });
        }
      } catch (asyncStorageError) {
        logger.warn('Could not clear AsyncStorage', asyncStorageError);
        // Don't fail - Supabase signOut should have cleared it
      }

      // Clear all scheduled notifications when signing out
      try {
        const { NotificationService } = await import('./NotificationService');
        await NotificationService.cancelTrainingReminder();
        console.log('✅ [AuthService] Training reminders cancelled');
        
        // Also clear all scheduled notifications to prevent old notifications from firing
        const Notifications = require('expo-notifications');
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of allNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
        if (allNotifications.length > 0) {
          console.log(`✅ [AuthService] Cancelled ${allNotifications.length} scheduled notifications`);
        }
      } catch (notificationError) {
        console.warn('⚠️ [AuthService] Could not clear notifications:', notificationError);
        // Don't fail - this is not critical
      }

      logger.debug('Sign out complete, all storage cleared');
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Sign out error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
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
      logger.error('Get current session error', error);
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
        logger.error('Get current user error', error);
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Get current user error', error);
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
      logger.error('Check authentication error', error);
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
      logger.error('Reset password error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
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
      logger.error('Resend verification error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
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
      logger.error('Update password error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
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
