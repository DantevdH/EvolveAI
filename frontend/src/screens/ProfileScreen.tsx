import React from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {useAppContext} from '@/src/context/AppContext';
import {useAuth} from '@/src/context/AuthContext';
import {Button} from '@/src/components/Button';

export const ProfileScreen: React.FC = () => {
  const {state, toggleTheme} = useAppContext();
  const {state: authState, signOut} = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        {authState.userProfile && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{authState.userProfile.username}</Text>
            <Text style={styles.userEmail}>Email: {authState.user?.email}</Text>
            <Text style={styles.fitnessLevel}>
              Experience Level: {authState.userProfile.experienceLevel}
            </Text>
            <Text style={styles.fitnessLevel}>
              Goal: {authState.userProfile.primaryGoal}
            </Text>
            <Text style={styles.fitnessLevel}>
              Workouts per week: {authState.userProfile.daysPerWeek}
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
            loading={authState.isLoading}
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
