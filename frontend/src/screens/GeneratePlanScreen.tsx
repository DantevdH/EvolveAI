/**
 * Generate Plan Screen - AI-Driven Conversational Onboarding Flow
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ConversationalOnboarding } from '../components/onboarding/ConversationalOnboarding';
import { LoadingScreen } from '../components/shared/LoadingScreen';

export const GeneratePlanScreen: React.FC = () => {
  const router = useRouter();
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = async (trainingPlan: any) => {
    console.log('✅ Training plan generated and saved to database');
    
    // Navigate directly to main app - training plan generation is complete
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    console.error('❌ Plan generation error:', error);
    
    Alert.alert(
      'Plan Generation Error',
      `Failed to generate training plan: ${error}\n\nThis step creates your final personalized training plan.`,
      [
        {
          text: 'Try Again',
          onPress: () => {
            // The component will handle retry logic
          },
        },
        {
          text: 'Start Over',
          onPress: () => {
            router.replace('/onboarding');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <LoadingScreen message="Preparing your personalized training plan..." />
    );
  }

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
        startFromStep="generation"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});