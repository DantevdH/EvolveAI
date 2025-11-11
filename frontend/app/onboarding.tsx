import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { ProgressOverlay } from '@/src/components/onboarding/ui';
import { useProgressOverlay } from '@/src/hooks/useProgressOverlay';

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resume?: string }>();
  const { state: authState, refreshUserProfile } = useAuth();
  const { progressState, runWithProgress } = useProgressOverlay();
  const [isReady, setIsReady] = useState(false);
  const isResumeFromGeneration = params?.resume === 'true';

  useEffect(() => {
    let cancelled = false;

    if (isResumeFromGeneration || !!authState.trainingPlan) {
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }

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
  }, [isResumeFromGeneration, authState.trainingPlan, runWithProgress]);

  const handleComplete = async (trainingPlan: any) => {
    console.log('✅ Onboarding: Plan accepted by user');
    console.log('🔄 Onboarding: Refreshing user profile...');

    await refreshUserProfile();

    console.log('✅ Onboarding: Profile refreshed. Centralized routing will navigate to main app.');
    // No manual navigation - useAppRouting will handle the transition to /(tabs)
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
        title="Preparing your onboarding experience…"
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
