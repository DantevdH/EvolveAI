import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';

export default function Onboarding() {
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
    console.log('✅ Onboarding: Training plan generated successfully');
    console.log('🔄 Onboarding: Refreshing user profile before navigation...');
    
    // CRITICAL: Refresh user profile to load the newly generated plan
    await refreshUserProfile();
    
    console.log('✅ Onboarding: User profile refreshed, navigating to main app');
    // Navigate to main app - training plan generation is complete
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

  if (isLoading) {
    return (
      <LoadingScreen message="Preparing your personalized onboarding experience..." />
    );
  }

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
