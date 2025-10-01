import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';

export default function PlanOutlineStep() {
  const router = useRouter();
  const { state, refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = async (trainingPlan: any) => {
    console.log('✅ Plan outline completed successfully');
    
    // Refresh user profile to get updated data
    await refreshUserProfile();
    
    // Navigate to next step - let index.tsx handle the routing logic
    router.replace('/');
  };

  const handleError = (error: string) => {
    console.error('❌ Plan outline error:', error);
    
    Alert.alert(
      'Plan Outline Error',
      `Failed to generate plan outline: ${error}\n\nThis step creates a personalized training plan based on your responses.`,
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
      <LoadingScreen message="Preparing your training plan outline..." />
    );
  }

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
        startFromStep="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
