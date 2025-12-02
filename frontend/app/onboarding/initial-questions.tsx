import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';
import { logError } from '@/src/utils/logger';

const InitialQuestionsResume: React.FC = () => {
  const router = useRouter();
  const { refreshUserProfile } = useAuth();

  const handleComplete = async (trainingPlan: any) => {
    await refreshUserProfile();
    router.replace('/(tabs)');
  };

  const handleError = (error: string) => {
    logError('Onboarding initial-questions error', error);
    Alert.alert(
      'Error',
      'We hit a snag while collecting your initial answers. Please try again.',
      [
        { text: 'Try Again' },
        { text: 'Go Back', onPress: () => router.replace('/onboarding') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ConversationalOnboarding
        onComplete={handleComplete}
        onError={handleError}
        startFromStep="initial"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default InitialQuestionsResume;
