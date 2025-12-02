import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'supabase_access_token',
  REFRESH_TOKEN: 'supabase_refresh_token',
  USER_ID: 'supabase_user_id',
} as const;

export class TokenManager {
  /**
   * Store authentication tokens securely
   */
  static async storeTokens(accessToken: string, refreshToken: string, userId: string): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId),
      ]);
    } catch (error) {
      logger.error('Error storing tokens', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Retrieve access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      logger.error('Error retrieving access token', error);
      return null;
    }
  }

  /**
   * Retrieve refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      logger.error('Error retrieving refresh token', error);
      return null;
    }
  }

  /**
   * Retrieve user ID
   */
  static async getUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    } catch (error) {
      logger.error('Error retrieving user ID', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      // Use the correct method for web platform
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {}),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID).catch(() => {}),
      ]);

    } catch (error) {
      logger.error('Error clearing tokens', error);
      // Don't throw error, just log it - this is not critical for auth flow

    }
  }

  /**
   * Check if user has valid tokens
   */
  static async hasValidTokens(): Promise<boolean> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
      ]);
      return !!(accessToken && refreshToken);
    } catch (error) {
      logger.error('Error checking token validity', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<string | null> {
    try {
      // First, try to get refresh token from SecureStore
      let refreshToken = await this.getRefreshToken();
      
      // If not in SecureStore, try to get it from Supabase's session (fallback)
      if (!refreshToken) {
        logger.info('Refresh token not in SecureStore, checking Supabase session');
        const session = await this.getCurrentSession();
        if (session?.refresh_token) {
          refreshToken = session.refresh_token;
          // Sync it to SecureStore for future use
          if (session.access_token && session.user) {
            try {
              await this.storeTokens(
                session.access_token,
                session.refresh_token,
                session.user.id
              );
              logger.info('Synced tokens from Supabase session to SecureStore');
            } catch (syncError) {
              logger.warn('Failed to sync tokens to SecureStore', syncError);
              // Continue anyway - we have the refresh token
            }
          }
        }
      }
      
      if (!refreshToken) {
        logger.error('No refresh token available in SecureStore or Supabase session');
        throw new Error('No refresh token available');
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        // Handle expected refresh token errors gracefully
        const isRefreshTokenError = 
          error.message?.includes('Invalid Refresh Token') || 
          error.message?.includes('Refresh Token Not Found') ||
          error.message?.includes('refresh_token_not_found');
        
        if (!isRefreshTokenError) {
          // Only log actual errors that need attention (not expected refresh token errors)
          logger.error('Error refreshing token', error);
        }
        // Return null for both expected and unexpected errors
        return null;
      }

      if (data.session) {
        await this.storeTokens(
          data.session.access_token,
          data.session.refresh_token,
          data.session.user.id
        );
        return data.session.access_token;
      }

      return null;
    } catch (error) {
      logger.error('Error refreshing access token', error);
      return null;
    }
  }

  /**
   * Get current session from Supabase
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Error getting session', error);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Error getting current session', error);
      return null;
    }
  }
}
