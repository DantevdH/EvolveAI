/**
 * Settings Screen - Profile and app settings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, Alert, Switch, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AuthService } from '../src/services/authService';
import { useNotifications } from '../src/hooks/useNotifications';
import { colors } from '../src/constants/colors';

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { state, signOut } = useAuth();
  
  // Settings state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications hook
  const {
    notificationsEnabled,
    reminderTime,
    nextScheduledNotification,
    isLoading: notificationsLoading,
    error: notificationError,
    enableNotifications,
    disableNotifications,
    setReminderTime,
    scheduleTrainingReminder,
    cancelTrainingReminder,
  } = useNotifications();

  // Get units from userProfile
  const units = state.userProfile?.weightUnit === 'lbs' ? 'imperial' : 'metric';

  // Schedule training reminder when notifications are enabled
  useEffect(() => {
    if (notificationsEnabled && state.trainingPlan) {
      scheduleTrainingReminder(state.trainingPlan);
    }
  }, [notificationsEnabled, state.trainingPlan]);

  // Clear error when notifications are disabled
  useEffect(() => {
    if (!notificationsEnabled) {
      // Clear any existing error when notifications are disabled
      // This prevents showing "No training scheduled for today" when user disables notifications
    }
  }, [notificationsEnabled]);

  const handleBackPress = () => {
    router.back();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            signOut();
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    setShowPasswordChange(true);
  };

  const handlePasswordSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await AuthService.updatePassword(newPassword);
      
      if (response.success) {
        Alert.alert('Success', 'Password updated successfully!');
        setShowPasswordChange(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.error || 'Failed to update password.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordChange(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubscription = () => {
    Alert.alert(
      'Subscription',
      'Subscription management will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleFullProfile = () => {
    router.push('/full-profile' as any);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Account Deletion',
              'Account deletion will be implemented soon. Please contact support for now.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Contact us at support@evolveai.com or visit our help center.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About EvolveAI',
      'Version 1.0.0\n\nEvolveAI - Your personal training companion powered by AI.',
      [{ text: 'OK' }]
    );
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await enableNotifications();
      if (granted && state.trainingPlan) {
        await scheduleTrainingReminder(state.trainingPlan);
      }
    } else {
      await disableNotifications();
    }
  };

  const handleReminderTimeChange = (hour: number) => {
    setReminderTime(hour);
    if (notificationsEnabled && state.trainingPlan) {
      scheduleTrainingReminder(state.trainingPlan);
    }
  };

  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const showTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const timeOptions = hours.map(hour => ({
      text: formatTime(hour),
      onPress: () => handleReminderTimeChange(hour),
    }));

    Alert.alert(
      'Select Reminder Time',
      'Choose when you want to be reminded about your training',
      timeOptions
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <View style={styles.statusBarPadding} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Username</Text>
            </View>
            <Text style={styles.settingValue}>{state.userProfile?.username || 'Not set'}</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Email</Text>
            </View>
            <Text style={styles.settingValue}>{state.user?.email || 'Not available'}</Text>
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleFullProfile}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="list-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>View Full Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>


        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="resize-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Units</Text>
            </View>
            <Text style={styles.settingValue}>
              {units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Training Reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.muted + '40', true: colors.primary + '40' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.muted}
              disabled={notificationsLoading}
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.settingText}>Reminder Time</Text>
              </View>
              <TouchableOpacity 
                style={styles.timePickerButton}
                onPress={() => showTimePicker()}
                activeOpacity={0.7}
              >
                <Text style={styles.timePickerText}>
                  {formatTime(reminderTime)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}


          {notificationError && (
            <View style={styles.errorItem}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{notificationError}</Text>
            </View>
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleHelpSupport}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleAbout}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Subscription</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Free Plan</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, styles.deleteItem]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.settingText, styles.deleteText]}>Delete Account</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={[styles.settingText, styles.logoutText]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholderTextColor={colors.muted}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={colors.muted}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePasswordCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handlePasswordSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarPadding: {
    height: Platform.OS === 'ios' ? 0 : RNStatusBar.currentHeight || 0,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: colors.muted,
  },
  logoutItem: {
    backgroundColor: colors.muted + '10',
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '400',
  },
  deleteItem: {
    backgroundColor: colors.muted + '10',
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  deleteText: {
    color: colors.muted,
    fontWeight: '400',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.muted + '20',
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.background,
  },
  // Notification styles
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
});

export default SettingsScreen;
