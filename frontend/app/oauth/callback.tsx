import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/config/supabase';
import { colors } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dispatch } = useAuth();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  // Extract tokens from URL (handles both web hash and native deep links)
  const extractTokensFromUrl = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
    // On web, check window.location.hash
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      return {
        accessToken: hashParams.get('access_token'),
        refreshToken: hashParams.get('refresh_token'),
      };
    }
    
    // On native, check params first (query params from URL)
    const accessToken = params.access_token as string || null;
    const refreshToken = params.refresh_token as string || null;
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    
    // On native, tokens might be in URL hash fragment (React Native Linking doesn't parse hash)
    // Try multiple methods to get the deep link URL
    if (Platform.OS !== 'web') {
      try {
        // Method 1: Check if URL is in params (expo-router might pass full URL)
        const urlInParams = params.url as string || params.redirect_uri as string || params._url as string;
        if (urlInParams && urlInParams.includes('#')) {
          console.log('🔑 [OAuth Callback] Found hash in URL params:', urlInParams);
          const hashPart = urlInParams.split('#')[1];
          const hashParams = new URLSearchParams(hashPart);
          const tokenFromHash = {
            accessToken: hashParams.get('access_token'),
            refreshToken: hashParams.get('refresh_token'),
          };
          if (tokenFromHash.accessToken && tokenFromHash.refreshToken) {
            return tokenFromHash;
          }
        }
        
        // Method 2: Try getInitialURL (only works on app launch)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('#') && initialUrl.includes('oauth/callback')) {
          console.log('🔑 [OAuth Callback] Found hash in initial URL:', initialUrl);
          const hashPart = initialUrl.split('#')[1];
          const hashParams = new URLSearchParams(hashPart);
          const tokenFromHash = {
            accessToken: hashParams.get('access_token'),
            refreshToken: hashParams.get('refresh_token'),
          };
          if (tokenFromHash.accessToken && tokenFromHash.refreshToken) {
            return tokenFromHash;
          }
        }

        // Method 3: Try to get current URL using Linking.getURL() (if available)
        // Note: This might not be available in all React Native versions
        try {
          // Check if we can access the URL from the navigation state
          // In expo-router, the URL should be accessible via params
          if (params && Object.keys(params).length > 0) {
            // Log all params to help debug
            console.log('🔑 [OAuth Callback] All params:', JSON.stringify(params));
          }
        } catch (e) {
          console.log('⚠️ [OAuth Callback] Could not get current URL:', e);
        }
      } catch (e) {
        console.log('⚠️ [OAuth Callback] Could not parse URL for tokens:', e);
      }
    }
    
    return { accessToken: null, refreshToken: null };
  };

  const handleOAuthCallback = async () => {
    try {
      console.log('🔄 [OAuth Callback] User flow: Processing OAuth callback, checking for tokens');
      console.log('🔄 [OAuth Callback] Platform:', Platform.OS);
      
      // Log all params for debugging (but limit token values)
      const paramsForLog = { ...params };
      if (paramsForLog.access_token) paramsForLog.access_token = '[REDACTED]';
      if (paramsForLog.refresh_token) paramsForLog.refresh_token = '[REDACTED]';
      console.log('🔄 [OAuth Callback] URL params:', JSON.stringify(paramsForLog));
      
      // Check for error parameters first (OAuth errors)
      const error = params.error as string;
      const errorCode = params.error_code as string;
      const errorDescription = params.error_description as string;
      
      if (error) {
        console.warn('⚠️ [OAuth Callback] OAuth error detected:', { error, errorCode, errorDescription });
        // Some OAuth errors might still have tokens in hash - continue checking
      }
      
      // Priority 1: Extract tokens from URL (handles both web hash and native deep links)
      console.log('🔑 [OAuth Callback] User flow: Extracting authentication tokens from callback URL');
      const { accessToken, refreshToken } = await extractTokensFromUrl();
      
      if (accessToken && refreshToken) {
        console.log('🔑 [OAuth Callback] User flow: Tokens found, setting user session');
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ [OAuth Callback] Error setting session:', sessionError);
          router.replace('/login');
          return;
        }

        if (data.session && data.user) {
          console.log('✅ [OAuth Callback] User flow: Session set successfully, user authenticated');
          
          // CRITICAL: Update auth context immediately so routing logic sees the user
          dispatch({ type: 'SET_USER', payload: data.user });
          dispatch({ type: 'SET_SESSION', payload: data.session });
          
          // Small delay to ensure state propagation before redirect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (!data.user.email_confirmed_at) {
            console.log('📧 [OAuth Callback] User flow: Email verification required, redirecting to verification screen');
            router.replace({
              pathname: '/email-verification',
              params: { email: data.user.email || '' }
            });
          } else {
            console.log('✅ [OAuth Callback] User flow: Authentication complete, redirecting to home screen');
            router.replace('/');
          }
          return;
        }
      }
      
      // If we got here and there was an error, redirect to login
      if (error) {
        console.error('❌ [OAuth Callback] OAuth error without tokens:', { error, errorCode, errorDescription });
        router.replace('/login');
        return;
      }
      
      // Fallback: Check if session is already available (for OAuth flows)
      console.log('🔄 [OAuth Callback] User flow: No tokens found in URL, checking if session already exists');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ [OAuth Callback] Error getting session:', sessionError);
        console.error('❌ [OAuth Callback] Error details:', JSON.stringify(sessionError, null, 2));
        console.error('❌ [OAuth Callback] Error code:', sessionError.code);
        console.error('❌ [OAuth Callback] Error message:', sessionError.message);
        router.replace('/login');
        return;
      }

      console.log('🔄 [OAuth Callback] Session check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email 
      });

      if (session && session.user) {
        console.log('✅ [OAuth Callback] User flow: Session found, user already authenticated');
        
        // CRITICAL: Update auth context immediately so routing logic sees the user
        dispatch({ type: 'SET_USER', payload: session.user });
        dispatch({ type: 'SET_SESSION', payload: session });
        
        // Small delay to ensure state propagation before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user needs email verification
        if (!session.user.email_confirmed_at) {
          console.log('📧 [OAuth Callback] User flow: Email verification required, redirecting to verification screen');
          router.replace({
            pathname: '/email-verification',
            params: { email: session.user.email || '' }
          });
        } else {
          console.log('✅ [OAuth Callback] User flow: Authentication complete, redirecting to home screen');
          router.replace('/');
        }
      } else {
        console.warn('⚠️ [OAuth Callback] No session found - waiting 2 seconds then redirecting to login');
        // No session found - might need to wait a bit or redirect to login
        // Wait a moment in case the session is still being established
        setTimeout(() => {
          console.log('🔄 [OAuth Callback] Retrying session check after timeout...');
          supabase.auth.getSession().then(({ data, error: retryError }) => {
            if (retryError) {
              console.error('❌ [OAuth Callback] Retry error:', retryError);
            }
            if (data?.session) {
              console.log('✅ [OAuth Callback] Session found on retry - waiting for auth state update');
              // Wait for auth state to update
              setTimeout(async () => {
                console.log('✅ [OAuth Callback] Redirecting to app');
                router.replace('/');
              }, 500);
            } else {
              console.error('❌ [OAuth Callback] No session after retry - redirecting to login');
              router.replace('/login');
            }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('❌ [OAuth Callback] Unexpected error:', error);
      console.error('❌ [OAuth Callback] Error details:', JSON.stringify(error, null, 2));
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});
