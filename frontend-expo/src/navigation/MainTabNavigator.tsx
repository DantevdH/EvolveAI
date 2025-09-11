/**
 * Main Tab Navigator - Handles the main app tabs after authentication
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { HomeScreen } from '../screens/HomeScreen';
import TrainingScreen from '../screens/TrainingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../constants/colors';

// Tab Stack Types
export type HomeStackParamList = {
  Home: undefined;
};

export type TrainingStackParamList = {
  Training: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  EditProfile: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  TrainingTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const TrainingStack = createStackNavigator<TrainingStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Home Stack Navigator
const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
};

// Training Stack Navigator
const TrainingStackNavigator: React.FC = () => {
  return (
    <TrainingStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <TrainingStack.Screen name="Training" component={TrainingScreen} />
    </TrainingStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      {/* Add more profile screens as needed */}
    </ProfileStack.Navigator>
  );
};

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'TrainingTab') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="TrainingTab" 
        component={TrainingStackNavigator}
        options={{ title: 'Workouts' }}
      />
    </Tab.Navigator>
  );
};
