/**
 * Onboarding Navigator - Handles the complete onboarding flow
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { GeneratePlanScreen } from '../screens/GeneratePlanScreen';

export type OnboardingStackParamList = {
  OnboardingFlow: undefined;
  GeneratePlan: { profileData?: string };
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent back navigation during onboarding
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
      <Stack.Screen name="GeneratePlan" component={GeneratePlanScreen} />
    </Stack.Navigator>
  );
};
