import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppProvider } from '@/src/context/AppContext';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { CoachProvider } from '@/src/context/CoachContext';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { NetworkStatus } from '@/src/components/NetworkStatus';
import { NavigationProvider } from '@/src/navigation/NavigationProvider';

function RootLayoutNav() {
  const { state } = useAuth();
  const colorScheme = useColorScheme();

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      // Parse the URL to extract any tokens or parameters
      const parsedUrl = Linking.parse(url);
      
      // If it's an email verification link, the auth state change will handle it
      // We just need to make sure the app is ready to receive it
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle subsequent deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Show loading screen only while auth is initializing (first app load)
  if (!state.isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Always show all screens, but use initialRouteName to control which one shows first */}
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="email-verification" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/initial-questions" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/follow-up-questions" options={{ headerShown: false }} />
        <Stack.Screen name="generate-plan" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="full-profile" options={{ headerShown: false }} />
        <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NetworkStatus />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CoachProvider>
          <AppProvider>
            <NavigationProvider>
              <RootLayoutNav />
            </NavigationProvider>
          </AppProvider>
        </CoachProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
