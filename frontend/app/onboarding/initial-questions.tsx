import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';

export default function InitialQuestionsStep() {
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
    console.log('✅ Initial questions completed successfully');
    
    // Refresh user profile to get updated data
    await refreshUserProfile();
    
    // Navigate to next step - let index.tsx handle the routing logic
    router.replace('/');
  };

  const handleError = (error: string) => {
    console.error('❌ Initial questions error:', error);
    
    Alert.alert(
      'Initial Questions Error',
      `Failed to load initial questions: ${error}\n\nThis step helps us understand your training goals and preferences.`,
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
      <LoadingScreen message="Preparing your personalized questions..." />
    );
  }

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
        startFromStep="initial"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
