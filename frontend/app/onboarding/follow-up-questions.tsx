import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';

export default function FollowUpQuestionsStep() {
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
    // Navigate directly to main app - training plan is complete
    // Auth context will be updated by ConversationalOnboarding before this is called
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    console.error('❌ Follow-up questions error:', error);
    
    Alert.alert(
      'Follow-up Questions Error',
      `Failed to load follow-up questions: ${error}\n\nThis step helps us dive deeper into your specific needs and preferences.`,
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
      <LoadingScreen message="Preparing your follow-up questions..." />
    );
  }

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
        startFromStep="followup"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
