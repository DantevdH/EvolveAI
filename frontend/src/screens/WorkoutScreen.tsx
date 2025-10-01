import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export const TrainingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Trainings</Text>
        <Text style={styles.subtitle}>
          Your personalized training plans will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
