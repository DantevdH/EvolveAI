import { supabase } from '@/src/config/supabase';
import { TokenManager } from './tokenManager';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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
    console.log('🔗 [AuthService] getRedirectUrl called - Platform:', Platform.OS, 'Path:', path);
    
    // Always use Supabase callback URL for email verification/password reset
    // This is the safest approach and works for both web and mobile
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
      console.error('❌ [AuthService] EXPO_PUBLIC_SUPABASE_URL not set!');
      // Fallback - but this should never happen
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        console.warn('⚠️ [AuthService] Using window origin as fallback:', origin);
        return `${origin}${path}`;
      }
      // For mobile, use deep link scheme as last resort
      return `frontendexpo2://${path.replace('/', '')}`;
    }
    
    // For mobile apps (iOS/Android), ALWAYS use Supabase callback URL
    // This ensures proper handling of email verification links
    // The callback will redirect to the app deep link automatically
    if (Platform.OS !== 'web') {
      console.log('📱 [AuthService] Mobile platform detected - using Supabase callback URL');
      const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
      console.log('🔗 [AuthService] Redirect URL:', callbackUrl);
      return callbackUrl;
    }
    
    // For web platform, use Supabase callback or current origin
    if (Platform.OS === 'web') {
      // Use Supabase callback for email verification and password reset
      if (path === '/login' || path === '/reset-password') {
        const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
        console.log('🌐 [AuthService] Web platform - using Supabase callback:', callbackUrl);
        return callbackUrl;
      }
      
      // For other paths on web, use current origin (not localhost:8081!)
      if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        // Only use origin if it's NOT a development bundler URL (localhost:8081, etc.)
        if (!origin.includes(':8081') && !origin.includes(':19000') && !origin.includes(':19006')) {
          console.log('🌐 [AuthService] Web platform - using window origin:', origin);
          return `${origin}${path}`;
        }
      }
      
      // Default: use Supabase callback
      const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
      console.log('🌐 [AuthService] Web platform - using Supabase callback (default):', callbackUrl);
      return callbackUrl;
    }
    
    // Fallback (should never reach here)
    console.warn('⚠️ [AuthService] Unknown platform, using Supabase callback as fallback');
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
      console.log('🔵 [AuthService] Starting Google OAuth flow...');
      console.log('🔵 [AuthService] Platform:', Platform.OS);
      
      // Check environment variable first
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      console.log('🔵 [AuthService] Supabase URL exists:', !!supabaseUrl);
      
      if (!supabaseUrl) {
        console.error('❌ [AuthService] EXPO_PUBLIC_SUPABASE_URL is not set!');
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
      
      console.log('🔵 [AuthService] Redirect URL for OAuth request:', redirectToUrl);
      
      console.log('🔵 [AuthService] Calling supabase.auth.signInWithOAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      console.log('🔵 [AuthService] OAuth response received');
      console.log('🔵 [AuthService] Error:', error ? error.message : 'none');
      console.log('🔵 [AuthService] Data exists:', !!data);
      console.log('🔵 [AuthService] Data URL exists:', !!data?.url);
      console.log('🔵 [AuthService] Data URL:', data?.url ? data.url.substring(0, 100) + '...' : 'none');

      if (error) {
        console.error('❌ [AuthService] OAuth error from Supabase:', error);
        return {
          success: false,
          error: error.message || 'Failed to initiate OAuth flow',
        };
      }

      // On React Native, we need to manually open the OAuth URL
      if (!data?.url) {
        console.error('❌ [AuthService] No OAuth URL returned from Supabase');
        return {
          success: false,
          error: 'OAuth URL not received from authentication server',
        };
      }

      // Platform-specific handling
      if (Platform.OS === 'web') {
        console.log('🔵 [AuthService] Opening OAuth URL in web browser (window.location)...');
        // On web, we can redirect directly or use window.open
        window.location.href = data.url;
        return {
          success: true,
          user: null,
          session: null,
        };
      }

      console.log('🔵 [AuthService] Opening browser with OAuth URL on native platform...');
      console.log('🔵 [AuthService] URL to open:', data.url.substring(0, 100) + '...');
      
      // On mobile, openAuthSessionAsync needs the app's deep link scheme
      // This must match the redirectToUrl we passed to Supabase OAuth
      const appRedirectUrl = redirectToUrl;
      
      console.log('🔵 [AuthService] Using redirect URL for openAuthSessionAsync:', appRedirectUrl);
      
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          appRedirectUrl
        );

        console.log('🔵 [AuthService] Browser result type:', result.type);
        console.log('🔵 [AuthService] Browser result:', JSON.stringify(result));

        if (result.type === 'success' && result.url) {
          console.log('✅ [AuthService] User flow: OAuth redirect successful, extracting tokens');
          console.log('🔑 [AuthService] Callback URL length:', result.url.length);
          
          // Extract tokens from URL hash fragment
          try {
            const url = result.url;
            const hasHash = url.includes('#');
            console.log('🔑 [AuthService] URL has hash fragment:', hasHash);
            
            if (hasHash) {
              const hashPart = url.split('#')[1];
              console.log('🔑 [AuthService] Hash part length:', hashPart.length);
              
              const hashParams = new URLSearchParams(hashPart);
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              
              console.log('🔑 [AuthService] Access token extracted:', !!accessToken);
              console.log('🔑 [AuthService] Refresh token extracted:', !!refreshToken);
              
              if (accessToken && refreshToken) {
                console.log('🔑 [AuthService] User flow: Tokens found, setting user session');
                const { data, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (sessionError) {
                  console.error('❌ [AuthService] User flow: Error setting session, callback screen will handle');
                  console.error('❌ [AuthService] Session error:', sessionError.message);
                  // Don't fail here - let callback screen handle it
                } else if (data.session && data.user) {
                  console.log('✅ [AuthService] User flow: Session set successfully, authentication complete');
                  console.log('✅ [AuthService] User email:', data.user.email);
                  // Session is now set - auth state listener will update context
                  return {
                    success: true,
                    user: data.user,
                    session: data.session,
                  };
                } else {
                  console.error('❌ [AuthService] User flow: Session set but no user/session in response');
                }
              } else {
                console.log('⚠️ [AuthService] User flow: Tokens missing - access_token:', !!accessToken, 'refresh_token:', !!refreshToken);
              }
            } else {
              console.log('⚠️ [AuthService] User flow: No hash fragment in URL, callback screen will handle');
            }
          } catch (tokenError) {
            console.error('❌ [AuthService] Error extracting tokens from URL:', tokenError);
            console.error('❌ [AuthService] Token error details:', tokenError instanceof Error ? tokenError.message : String(tokenError));
            // Don't fail here - let callback screen handle it
          }
          
          // If we get here, tokens weren't in the URL or extraction failed
          // The callback screen will handle it via getSession() or token extraction
        } else if (result.type === 'cancel') {
          console.log('⚠️ [AuthService] User cancelled OAuth flow');
          return {
            success: false,
            error: 'Authentication was cancelled',
          };
        } else if (result.type === 'dismiss') {
          console.log('⚠️ [AuthService] OAuth flow dismissed');
          return {
            success: false,
            error: 'Authentication was dismissed',
          };
        } else {
          console.log('⚠️ [AuthService] Unknown browser result type:', result.type);
        }
      } catch (browserError) {
        console.error('❌ [AuthService] Error opening browser:', browserError);
        console.error('❌ [AuthService] Browser error details:', JSON.stringify(browserError));
        return {
          success: false,
          error: `Failed to open browser: ${browserError instanceof Error ? browserError.message : 'Unknown error'}`,
        };
      }

      // OAuth flow initiated successfully
      console.log('✅ [AuthService] OAuth flow initiated successfully');
      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      console.error('❌ [AuthService] Google sign in error:', error);
      console.error('❌ [AuthService] Error details:', JSON.stringify(error));
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
          redirectTo: this.getSupabaseOAuthCallbackUrl(),
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        return {
          success: false,
          error: error.message,
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
            console.log('OAuth redirect successful');
          }
        } catch (browserError) {
          console.error('Error opening browser:', browserError);
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
      console.log('🔵 [AuthService] Starting Facebook OAuth flow...');
      console.log('🔵 [AuthService] Platform:', Platform.OS);
      
      // Check environment variable first
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      console.log('🔵 [AuthService] Supabase URL exists:', !!supabaseUrl);
      
      if (!supabaseUrl) {
        console.error('❌ [AuthService] EXPO_PUBLIC_SUPABASE_URL is not set!');
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
      
      console.log('🔵 [AuthService] Redirect URL for OAuth request:', redirectToUrl);
      
      console.log('🔵 [AuthService] Calling supabase.auth.signInWithOAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) {
        console.error('❌ OAuth error from Supabase:', error);
        return {
          success: false,
          error: error.message || 'Failed to initiate OAuth flow',
        };
      }

      console.log('🔵 [AuthService] OAuth response received');
      console.log('🔵 [AuthService] Error:', error ? (error as any).message : 'none');
      console.log('🔵 [AuthService] Data exists:', !!data);
      console.log('🔵 [AuthService] Data URL exists:', !!data?.url);
      console.log('🔵 [AuthService] Data URL:', data?.url ? data.url.substring(0, 100) + '...' : 'none');

      if (error) {
        console.error('❌ [AuthService] OAuth error from Supabase:', error);
        return {
          success: false,
          error: (error as any).message || 'Failed to initiate OAuth flow',
        };
      }

      // On React Native, we need to manually open the OAuth URL
      if (!data?.url) {
        console.error('❌ [AuthService] No OAuth URL returned from Supabase');
        return {
          success: false,
          error: 'OAuth URL not received from authentication server',
        };
      }

      // Platform-specific handling
      if (Platform.OS === 'web') {
        console.log('🔵 [AuthService] Opening OAuth URL in web browser (window.location)...');
        window.location.href = data.url;
        return {
          success: true,
          user: null,
          session: null,
        };
      }

      console.log('🔵 [AuthService] Opening browser with OAuth URL on native platform...');
      console.log('🔵 [AuthService] URL to open:', data.url.substring(0, 100) + '...');
      
      // On mobile, openAuthSessionAsync needs the app's deep link scheme
      // This must match the redirectToUrl we passed to Supabase OAuth
      const appRedirectUrl = redirectToUrl;
      
      console.log('🔵 [AuthService] Using redirect URL for openAuthSessionAsync:', appRedirectUrl);
      
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          appRedirectUrl
        );

        console.log('🔵 [AuthService] Browser result type:', result.type);
        console.log('🔵 [AuthService] Browser result:', JSON.stringify(result));

        if (result.type === 'success') {
          console.log('✅ [AuthService] OAuth redirect successful');
          // The deep link will trigger our oauth/callback route
        } else if (result.type === 'cancel') {
          console.log('⚠️ [AuthService] User cancelled OAuth flow');
          return {
            success: false,
            error: 'Authentication was cancelled',
          };
        } else if (result.type === 'dismiss') {
          console.log('⚠️ [AuthService] OAuth flow dismissed');
          return {
            success: false,
            error: 'Authentication was dismissed',
          };
        } else {
          console.log('⚠️ [AuthService] Unknown browser result type:', result.type);
        }
      } catch (browserError) {
        console.error('❌ [AuthService] Error opening browser:', browserError);
        console.error('❌ [AuthService] Browser error details:', JSON.stringify(browserError));
        return {
          success: false,
          error: `Failed to open browser: ${browserError instanceof Error ? browserError.message : 'Unknown error'}`,
        };
      }

      // OAuth flow initiated successfully
      console.log('✅ OAuth flow initiated successfully');
      return {
        success: true,
        user: null, // OAuth flow will complete asynchronously
        session: null,
      };
    } catch (error) {
      console.error('❌ Facebook sign in error:', error);
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
      console.log('🚪 [AuthService] User flow: Signing out user, clearing all storage...');
      
      // Sign out from Supabase (clears session from AsyncStorage)
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ [AuthService] Supabase signOut error:', error.message);
        // Continue anyway to clear other storage
      } else {
        console.log('✅ [AuthService] Supabase session cleared from AsyncStorage');
      }

      // Clear stored tokens from SecureStore
      await TokenManager.clearTokens();
      console.log('✅ [AuthService] Tokens cleared from SecureStore');

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
            console.log(`✅ [AuthService] Cleared AsyncStorage key: ${supabaseKey}`);
            
            // Also try the older format (in case it exists)
            await AsyncStorage.removeItem(`supabase.auth.token`);
            console.log('✅ [AuthService] Cleared legacy AsyncStorage key');
          }
        }
        
        // Clear all AsyncStorage keys containing 'supabase' or 'auth'
        const allKeys = await AsyncStorage.getAllKeys();
        const supabaseKeys = allKeys.filter(key => 
          key.includes('supabase') || 
          key.includes('sb-') ||
          (key.includes('auth') && key.includes('token'))
        );
        
        if (supabaseKeys.length > 0) {
          await AsyncStorage.multiRemove(supabaseKeys);
          console.log(`✅ [AuthService] Cleared ${supabaseKeys.length} Supabase-related AsyncStorage keys:`, supabaseKeys);
        }
      } catch (asyncStorageError) {
        console.warn('⚠️ [AuthService] Could not clear AsyncStorage:', asyncStorageError);
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

      console.log('✅ [AuthService] User flow: Sign out complete, all storage cleared');
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ [AuthService] Sign out error:', error);
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
