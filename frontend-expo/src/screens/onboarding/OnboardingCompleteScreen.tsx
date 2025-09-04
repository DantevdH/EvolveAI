/**
 * Onboarding Complete screen - Final step of onboarding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { OnboardingCard, OnboardingBackground } from '../../components/onboarding';
import { colors } from '../../constants/designSystem';
import { useUserProfile } from '../../hooks/useUserProfile';
import { OnboardingStyles } from '../../components/shared/OnboardingStyles';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';

export const OnboardingCompleteScreen: React.FC = () => {
  const { state, completeOnboarding, setGeneratingPlan, goToStep } = useOnboarding();
  const { state: authState } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();
  const { createUserProfile, isLoading: isCreatingProfile, error: profileError } = useUserProfile(authState.user?.id || '');


  const handleComplete = async () => {
    console.log('🎯 OnboardingCompleteScreen: handleComplete called');
    setIsCompleting(true);
    
    try {
      // Step 1: Complete onboarding validation
      console.log('🔄 Step 1: Completing onboarding validation...');
      const onboardingSuccess = await completeOnboarding();
      console.log('✅ completeOnboarding result:', onboardingSuccess);
      
      if (!onboardingSuccess) {
        console.log('❌ completeOnboarding failed');
        Alert.alert(
          'Error',
          'Failed to complete onboarding. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Step 2: Create user profile
      console.log('📝 Step 2: Creating user profile...');
      const profileResult = await createUserProfile(state.data);
      
      if (!profileResult.success) {
        console.log('❌ Profile creation failed');
        Alert.alert(
          'Profile Creation Failed',
          profileError || 'Failed to create your profile. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Profile created successfully with ID:', profileResult.profileId);
      
      // Step 3: Navigate to GeneratePlanScreen with entire profile data
      console.log('🚀 Step 3: Navigating to generate-plan with profile data...');
      // GeneratePlanScreen will now only handle:
      // 1. Generate plan via backend API (using passed profile data)
      // 2. Store plan in backend database
      // 3. Push plan to frontend
      
      const profileDataToPass = {
        id: profileResult.profileId,
        user_id: authState.user.id,
        username: state.data.username || '',
        primary_goal: state.data.primaryGoal || '',
        primary_goal_description: state.data.goalDescription || '',
        experience_level: state.data.experienceLevel || '',
        days_per_week: state.data.daysPerWeek || 3,
        minutes_per_session: state.data.minutesPerSession || 45,
        equipment: Array.isArray(state.data.equipment) ? state.data.equipment[0] || '' : state.data.equipment || '',
        age: state.data.age || 25,
        weight: state.data.weight || 70,
        weight_unit: state.data.weightUnit || 'kg',
        height: state.data.height || 170,
        height_unit: state.data.heightUnit || 'cm',
        gender: state.data.gender || '',
        has_limitations: state.data.hasLimitations || false,
        limitations_description: state.data.limitationsDescription || '',
        final_chat_notes: state.data.finalNotes || '',
      };
      
      console.log('🚀 Navigating to generate-plan with profile data:');
      console.log('📋 Profile ID:', profileResult.profileId);
      console.log('📋 Profile data to pass:', profileDataToPass);
      console.log('📋 JSON stringified data:', JSON.stringify(profileDataToPass));
      
      router.replace({
        pathname: '/generate-plan',
        params: { 
          profileData: JSON.stringify(profileDataToPass)
        }
      });
      
    } catch (error) {
      console.error('💥 Onboarding completion error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleBackToEdit = () => {
    // Navigate back to Physical Limitations screen (step 7) to allow editing
    goToStep(7);
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />
        
        <OnboardingCard
          title="You're All Set!"
          subtitle="Let's create your personalized fitness plan"
        >
          <View style={styles.content}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Text style={styles.iconText}>✓</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Your Profile Summary</Text>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Username:</Text>
                <Text style={styles.summaryValue}>{state.data.username}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Experience:</Text>
                <Text style={styles.summaryValue}>{state.data.experienceLevel}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Primary Goal:</Text>
                <Text style={styles.summaryValue}>{state.data.primaryGoal}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Training Days:</Text>
                <Text style={styles.summaryValue}>{state.data.daysPerWeek} days/week</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Session Duration:</Text>
                <Text style={styles.summaryValue}>{state.data.minutesPerSession} minutes</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.completeButton, (isCompleting || isCreatingProfile) && styles.completeButtonDisabled]}
                onPress={handleComplete}
                disabled={isCompleting || isCreatingProfile}
              >
                {(isCompleting || isCreatingProfile) ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.completeButtonText}>Create My Plan</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={handleBackToEdit}
                disabled={isCompleting || isCreatingProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </OnboardingCard>
        
        {/* Loading Overlay */}
        <LoadingOverlay 
          visible={isCompleting || isCreatingProfile} 
          message={isCreatingProfile ? "Creating your profile..." : "Completing onboarding..."}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primaryTransparent,
  },
  iconText: {
    fontSize: 36,
    color: colors.text,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
});
