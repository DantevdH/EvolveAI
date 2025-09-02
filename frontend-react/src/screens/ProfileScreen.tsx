import React from 'react';
import {View, Text, StyleSheet, SafeAreaView} from 'react-native';
import {useAppContext} from '@/context/AppContext';
import {Button} from '@/components/Button';

export const ProfileScreen: React.FC = () => {
  const {state, setAuthenticated, setUser, toggleTheme} = useAppContext();

  const handleLogout = () => {
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        {state.user && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{state.user.username}</Text>
            <Text style={styles.userEmail}>User ID: {state.user.userId}</Text>
            <Text style={styles.fitnessLevel}>
              Experience Level: {state.user.experienceLevel}
            </Text>
            <Text style={styles.fitnessLevel}>
              Goal: {state.user.primaryGoal}
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          <Button
            title={`Switch to ${state.isDarkMode ? 'Light' : 'Dark'} Theme`}
            onPress={toggleTheme}
            variant="outline"
            style={styles.button}
          />
          
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="secondary"
            style={styles.button}
          />
        </View>
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
    marginBottom: 30,
  },
  userInfo: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 10,
  },
  fitnessLevel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  buttons: {
    gap: 15,
  },
  button: {
    marginBottom: 10,
  },
});
