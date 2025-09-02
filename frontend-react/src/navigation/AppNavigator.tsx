import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {RootStackParamList} from '@/types';
import {useAppContext} from '@/context/AppContext';

// Import screens (we'll create these)
import {HomeScreen} from '@/screens/HomeScreen';
import {LoginScreen} from '@/screens/LoginScreen';
import {OnboardingScreen} from '@/screens/OnboardingScreen';
import {ProfileScreen} from '@/screens/ProfileScreen';
import {WorkoutScreen} from '@/screens/WorkoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Main Tab Navigator for authenticated users
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          // Add icon here when you have them
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          title: 'Workouts',
          // Add icon here when you have them
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          // Add icon here when you have them
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
export const AppNavigator: React.FC = () => {
  const {state} = useAppContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}>
      {!state.isAuthenticated ? (
        // Auth flow
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Group>
      ) : (
        // Main app flow
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
