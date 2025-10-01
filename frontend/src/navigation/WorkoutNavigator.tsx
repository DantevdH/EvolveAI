/**
 * Training Navigator - Handles training-specific flows
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TrainingScreen } from '../screens/TrainingScreen';

export type TrainingStackParamList = {
  TrainingList: undefined;
  TrainingDetail: { trainingId: string };
  ActiveTraining: { trainingId: string };
  TrainingHistory: undefined;
  ExerciseDetail: { exerciseId: string };
};

const Stack = createStackNavigator<TrainingStackParamList>();

export const TrainingNavigator: React.FC = () => {
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
      <Stack.Screen name="TrainingList" component={TrainingScreen} />
      {/* Add more training screens as they are implemented */}
    </Stack.Navigator>
  );
};
