import React from 'react';
import {View, Text, StyleSheet, SafeAreaView} from 'react-native';
import {useAppContext} from '@/context/AppContext';

export const HomeScreen: React.FC = () => {
  const {state} = useAppContext();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to EvolveAI</Text>
        <Text style={styles.subtitle}>
          Your personal fitness journey starts here
        </Text>
        {state.user && (
          <Text style={styles.welcomeText}>Hello, {state.user.username}!</Text>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 20,
  },
});
