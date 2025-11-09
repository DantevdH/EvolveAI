/**
 * Generate Plan Screen - AI-Driven Conversational Onboarding Flow
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ConversationalOnboarding } from '../components/onboarding/ConversationalOnboarding';
import { ProgressOverlay } from '../components/onboarding/ProgressOverlay';
import { useProgressOverlay } from '../hooks/useProgressOverlay';

export const GeneratePlanScreen: React.FC = () => {
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
    console.log('✅ Training plan generated and saved to database');
    await refreshUserProfile();
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    console.error('❌ Plan generation error:', error);

    Alert.alert(
      'Plan Generation Error',
      `Failed to generate training plan: ${error}\n\nThis step creates your final personalized training plan.`,
      [
        { text: 'Try Again' },
        {
          text: 'Start Over',
          onPress: () => router.replace('/onboarding'),
        },
        { text: 'Cancel', style: 'cancel' },
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
          startFromStep="followup"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});