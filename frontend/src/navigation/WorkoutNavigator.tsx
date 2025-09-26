/**
 * Workout Navigator - Handles workout-specific flows
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WorkoutScreen } from '../screens/WorkoutScreen';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutDetail: { workoutId: string };
  ActiveWorkout: { workoutId: string };
  WorkoutHistory: undefined;
  ExerciseDetail: { exerciseId: string };
};

const Stack = createStackNavigator<WorkoutStackParamList>();

export const WorkoutNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
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
      <Stack.Screen name="WorkoutList" component={WorkoutScreen} />
      {/* Add more workout screens as they are implemented */}
    </Stack.Navigator>
  );
};
