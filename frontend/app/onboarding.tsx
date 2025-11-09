import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { ProgressOverlay } from '@/src/components/onboarding/ProgressOverlay';
import { useProgressOverlay } from '@/src/hooks/useProgressOverlay';

export default function Onboarding() {
  const router = useRouter();
  const { refreshUserProfile } = useAuth();
  const { progressState, runWithProgress } = useProgressOverlay();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    runWithProgress('startup', async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    }).finally(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [runWithProgress]);

  const handleComplete = async (trainingPlan: any) => {
    console.log('✅ Onboarding: Training plan generated successfully');
    console.log('🔄 Onboarding: Refreshing user profile before navigation...');

    await refreshUserProfile();

    console.log('✅ Onboarding: User profile refreshed, navigating to main app');
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    console.error('❌ Onboarding error:', error);

    Alert.alert(
      'Error',
      error,
      [
        { text: 'Try Again' },
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
      <ProgressOverlay
        visible={progressState.visible}
        progress={progressState.progress}
      />
      {isReady && (
        <ConversationalOnboarding
          onComplete={handleComplete}
          onError={handleError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
