import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/config/supabase';
import { colors } from '@/src/constants/colors';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {

      // For OAuth callbacks, tokens are often in URL fragments (after #)
      // We need to parse them from the current URL
      let access_token: string | undefined;
      let refresh_token: string | undefined;
      let expires_at: string | undefined;
      let expires_in: string | undefined;
      let provider_token: string | undefined;
      let token_type: string | undefined;
      
      // If we're on web, we might need to parse the URL fragment
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        access_token = hashParams.get('access_token') || undefined;
        refresh_token = hashParams.get('refresh_token') || undefined;
        expires_at = hashParams.get('expires_at') || undefined;
        expires_in = hashParams.get('expires_in') || undefined;
        provider_token = hashParams.get('provider_token') || undefined;
        token_type = hashParams.get('token_type') || undefined;

      } else {
        // Use params from Expo Router
        access_token = params.access_token as string;
        refresh_token = params.refresh_token as string;
        expires_at = params.expires_at as string;
        expires_in = params.expires_in as string;
        provider_token = params.provider_token as string;
        token_type = params.token_type as string;
      }
      
      if (access_token && refresh_token) {

        // Set the session using the tokens from the OAuth callback
        const { data, error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        });

        if (error) {
          console.error('Error setting OAuth session:', error);
          // Redirect to login with error
          router.replace('/login');
          return;
        }

        if (data.session) {

          // Check if user needs email verification
          if (data.user && !data.user.email_confirmed_at) {

            router.replace({
              pathname: '/email-verification',
              params: { email: data.user.email }
            });
          } else {

            // Redirect to main app - the auth state change will handle the proper routing
            router.replace('/');
          }
        } else {
          console.error('No session data received from OAuth callback');
          router.replace('/login');
        }
      } else {
        console.error('Missing tokens in OAuth callback');
        router.replace('/login');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
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
