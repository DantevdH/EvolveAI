/**
 * Generate Plan Screen - AI-Driven Conversational Onboarding Flow
 */

import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ConversationalOnboarding } from '../components/onboarding/ConversationalOnboarding';

export const GeneratePlanScreen: React.FC = () => {
  const router = useRouter();

  const handleComplete = async (workoutPlan: any) => {
    console.log('✅ Workout plan generated and saved to database');
    
    // Navigate to main app - let index.tsx handle the routing logic
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