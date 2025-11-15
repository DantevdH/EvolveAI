/**
 * Root App Navigator - Handles conditional navigation based on auth state
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { LoadingScreen } from '../components/shared/LoadingScreen';

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Onboarding: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { state } = useAuth();

  // Show loading screen while auth is initializing
  if (!state.isInitialized) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Determine which navigator to show based on auth state
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!state.user) {
      return 'Auth';
    }
    
    if (!state.userProfile) {
      return 'Onboarding';
    }
    
    // If user is authenticated and has profile, let Expo Router handle main navigation
    return 'Auth'; // This will redirect to tabs via Expo Router
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
