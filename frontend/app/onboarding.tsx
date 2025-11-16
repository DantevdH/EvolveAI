import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConversationalOnboarding } from '@/src/components/onboarding/ConversationalOnboarding';

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resume?: string }>();
  const { state: authState } = useAuth();

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
      <ConversationalOnboarding
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
