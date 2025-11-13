import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
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
import { colors } from '@/src/constants/colors';
import FloatingChatButton from '@/components/FloatingChatButton';

// Custom theme with transparent tab bar
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background, // This affects the tab bar wrapper
    text: colors.text,
    border: 'transparent',
    notification: colors.primary,
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background, // This affects the tab bar wrapper
    text: colors.text,
    border: 'transparent',
    notification: colors.primary,
  },
};

function RootLayoutNav() {
  const { state } = useAuth();
  const colorScheme = useColorScheme();
  const pathname = usePathname();

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

  // Check if user is in main app (tabs), not on auth/onboarding screens.
  // Best-practice: show FloatingChatButton for any tabs route and its children.
  const isOnAuthOrOnboarding =
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/onboarding') ||
    pathname?.includes('/generate-plan') ||
    pathname?.includes('/email-verification') ||
    pathname?.includes('/forgot-password') ||
    pathname?.includes('/reset-password');

  // Consider we are in main app when path is within the tabs layout or its children.
  // Avoid gating visibility on `planAccepted` here — the button must be visible so it can
  // auto-open and allow users to accept the plan.
  const isInMainApp =
    !isOnAuthOrOnboarding &&
    (pathname?.startsWith('/(tabs)') || pathname?.startsWith('/(tabs)/') || pathname === '/' || false);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
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
        {/* follow-up onboarding route removed */}
        <Stack.Screen name="generate-plan" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="full-profile" options={{ headerShown: false }} />
        <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NetworkStatus />
      <StatusBar style="auto" />
      {/* Floating Chat Button - Only show when authenticated */}
      {state.user && state.session && isInMainApp && <FloatingChatButton />}
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
