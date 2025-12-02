/**
 * Settings Screen - Profile and app settings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, Alert, Switch, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AuthService } from '../src/services/authService';
import { useNotifications } from '../src/hooks/useNotifications';
import { colors, createColorWithOpacity, goldenGradient } from '../src/constants/colors';
import { validatePasswordChange } from '../src/utils/passwordValidation';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function SettingsScreenContent() {
  const router = useRouter();
  const { state, signOut } = useAuth();
  
  // Settings state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

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

  // Get units from userProfile with null check
  const units = state.userProfile?.weightUnit === 'lbs' ? 'imperial' : 'metric';
  
  // Validate user profile exists
  const hasUserProfile = !!state.userProfile;
  const userEmail = state.user?.email || null;

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

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLogoutLoading(true);
              await signOut();
            } catch (error) {
              setLogoutLoading(false);
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    setShowPasswordChange(true);
  };

  const handlePasswordSubmit = async () => {
    // Clear previous errors
    setPasswordError(null);
    
    // Validate password using utility function
    const validation = validatePasswordChange(newPassword, confirmPassword);
    
    if (!validation.isValid) {
      setPasswordError(validation.errorMessage || 'Invalid password');
      Alert.alert('Error', validation.errorMessage || 'Invalid password');
      return;
    }

    try {
      setPasswordChangeLoading(true);
      setPasswordError(null);
      
      const response = await AuthService.updatePassword(newPassword);
      
      if (response.success) {
        Alert.alert('Success', 'Password updated successfully!');
        setShowPasswordChange(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
      } else {
        const errorMessage = response.error || 'Failed to update password. Please try again.';
        setPasswordError(errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      setPasswordError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setPasswordChangeLoading(false);
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
    try {
      if (enabled) {
        const granted = await enableNotifications();
        if (!granted) {
          // Show clear message when user denies notification permissions
          Alert.alert(
            'Notification Permission Denied',
            'To receive training reminders, please enable notifications in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => {
                  // Note: In a real implementation, you might want to use Linking.openSettings()
                  // For now, just show the alert
                }
              }
            ]
          );
          return;
        }
        if (granted && state.trainingPlan) {
          await scheduleTrainingReminder(state.trainingPlan);
        }
      } else {
        await disableNotifications();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update notification settings. Please try again.'
      );
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
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionGradient}
          >
            <Text style={styles.sectionTitle}>Profile</Text>
          </LinearGradient>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="person-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Username</Text>
            </View>
            <Text style={styles.settingValue}>
              {hasUserProfile && state.userProfile?.username ? state.userProfile.username : 'Not set'}
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Email</Text>
            </View>
            <Text style={styles.settingValue}>{userEmail || 'Not available'}</Text>
          </View>

        </View>


        {/* Preferences Section */}
        <View style={styles.section}>
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionGradient}
          >
            <Text style={styles.sectionTitle}>Preferences</Text>
          </LinearGradient>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="resize-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Units</Text>
            </View>
            <Text style={styles.settingValue}>
              {units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Training Reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: createColorWithOpacity(colors.muted, 0.4), true: createColorWithOpacity(colors.secondary, 0.4) }}
              thumbColor={notificationsEnabled ? colors.secondary : colors.muted}
              disabled={notificationsLoading}
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.secondary} />
                  </LinearGradient>
                </View>
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
                <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
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
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionGradient}
          >
            <Text style={styles.sectionTitle}>Support</Text>
          </LinearGradient>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleHelpSupport}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="help-circle-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleAbout}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="information-circle-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionGradient}
          >
            <Text style={styles.sectionTitle}>Account</Text>
          </LinearGradient>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="card-outline" size={18} color={colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.settingText}>Subscription</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Free Plan</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
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
            disabled={logoutLoading}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={[styles.settingText, styles.logoutText]}>
                {logoutLoading ? 'Signing out...' : 'Sign Out'}
              </Text>
            </View>
            {logoutLoading && (
              <ActivityIndicator size="small" color={colors.error} style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={goldenGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Change Password</Text>
            </LinearGradient>
            
            <View style={styles.modalInputContainer}>
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
              
              {passwordError && (
                <View style={styles.errorItem}>
                  <Ionicons name="warning-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePasswordCancel}
                activeOpacity={0.7}
                disabled={passwordChangeLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, passwordChangeLoading && styles.submitButtonDisabled]}
                onPress={handlePasswordSubmit}
                activeOpacity={0.7}
                disabled={passwordChangeLoading}
              >
                <LinearGradient
                  colors={goldenGradient as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButtonGradient}
                >
                  {passwordChangeLoading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.submitButtonText}>Update Password</Text>
                  )}
                </LinearGradient>
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
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.15),
    backgroundColor: createColorWithOpacity(colors.secondary, 0.03),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
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
  sectionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
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
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowColor: createColorWithOpacity(colors.secondary, 0.1),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
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
    backgroundColor: createColorWithOpacity(colors.text, 0.35),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    shadowColor: createColorWithOpacity(colors.text, 0.12),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  modalInputContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.08),
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  // Notification styles
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
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

// Wrap with ErrorBoundary
const SettingsScreen: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('SettingsScreen error:', error, errorInfo);
      }}
    >
      <SettingsScreenContent />
    </ErrorBoundary>
  );
};

export default SettingsScreen;
