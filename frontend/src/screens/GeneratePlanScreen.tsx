/**
 * Generate Plan Screen - AI-Driven Conversational Onboarding Flow
 */

import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ConversationalOnboarding } from '../components/onboarding/ConversationalOnboarding';

export const GeneratePlanScreen: React.FC = () => {
  const { setWorkoutPlan, setComingFromOnboarding } = useAuth();
  const router = useRouter();

  const handleComplete = (workoutPlan: any) => {
    console.log('✅ Workout plan generated successfully');
    
    // Set the workout plan in auth context
    setWorkoutPlan(workoutPlan);
    
    // Reset onboarding flag
    setComingFromOnboarding(false);
    
    // Navigate to main app
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    console.error('❌ Onboarding error:', error);
    
    Alert.alert(
      'Error',
      error,
      [
        {
          text: 'Try Again',
          onPress: () => {
            // The component will handle retry logic
          },
        },
        {
          text: 'Go Back',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});