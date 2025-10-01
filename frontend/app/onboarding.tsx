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
    console.log('✅ Training plan generated successfully');
    
    // Refresh user profile to get updated data
    await refreshUserProfile();
    
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
