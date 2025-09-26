/**
 * Full Profile Screen - Complete user profile display
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/constants/colors';

const FullProfileScreen: React.FC = () => {
  const router = useRouter();
  const { state } = useAuth();

  const handleBackPress = () => {
    router.back();
  };

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || value === '') {
      return 'Not set';
    }
    return unit ? `${value} ${unit}` : value;
  };

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    return value ? 'Yes' : 'No';
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
          <Text style={styles.headerTitle}>Full Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Username</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.username)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{formatValue(state.user?.email)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Age</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.age, 'years')}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Gender</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.gender)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Height</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.height, state.userProfile?.heightUnit)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Weight</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.weight, state.userProfile?.weightUnit)}</Text>
            </View>
          </View>

          {/* Fitness Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitness Goals</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Primary Goal</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.primaryGoal)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Goal Description</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.primaryGoalDescription)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Experience Level</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.experienceLevel)}</Text>
            </View>
          </View>

          {/* Workout Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Preferences</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Days Per Week</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.daysPerWeek)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Minutes Per Session</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.minutesPerSession)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Equipment</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.equipment)}</Text>
            </View>
          </View>

          {/* Health & Limitations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health & Limitations</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Has Limitations</Text>
              <Text style={styles.profileValue}>{formatBoolean(state.userProfile?.hasLimitations)}</Text>
            </View>

            {state.userProfile?.hasLimitations && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Limitations Description</Text>
                <Text style={styles.profileValue}>{formatValue(state.userProfile?.limitationsDescription)}</Text>
              </View>
            )}
          </View>

          {/* Additional Notes */}
          {state.userProfile?.finalChatNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Coach Notes</Text>
                <Text style={styles.profileValue}>{formatValue(state.userProfile?.finalChatNotes)}</Text>
              </View>
            </View>
          )}

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Member Since</Text>
              <Text style={styles.profileValue}>
                {state.userProfile?.createdAt 
                  ? new Date(state.userProfile.createdAt).toLocaleDateString()
                  : 'Not available'
                }
              </Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Last Updated</Text>
              <Text style={styles.profileValue}>
                {state.userProfile?.updatedAt 
                  ? new Date(state.userProfile.updatedAt).toLocaleDateString()
                  : 'Not available'
                }
              </Text>
            </View>
          </View>
        </ScrollView>
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
    width: 40,
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
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
    flex: 1,
    marginRight: 16,
  },
  profileValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
});

export default FullProfileScreen;
