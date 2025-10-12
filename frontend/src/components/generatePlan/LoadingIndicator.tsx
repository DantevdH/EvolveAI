import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/designSystem';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isLoading, 
  message = 'Generating your plan...' 
}) => {
  if (!isLoading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
