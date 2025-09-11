/**
 * Onboarding Complete screen - Final step of onboarding
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';
import { OnboardingCard, OnboardingBackground } from '../../components/onboarding';
import { colors } from '../../constants/designSystem';
// Removed useUserProfile - using AuthContext instead
import { OnboardingStyles } from '../../components/shared/OnboardingStyles';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';

export const OnboardingCompleteScreen: React.FC = () => {
  const { state, completeOnboarding, setGeneratingPlan, goToStep } = useOnboarding();
  const { state: authState, setComingFromOnboarding, dispatch } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();


  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      // Step 1: Complete onboarding validation
      const onboardingSuccess = await completeOnboarding();
      
      if (!onboardingSuccess) {
        Alert.alert(
          'Error',
          'Failed to complete onboarding. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Step 2: Create user profile using AuthContext
      const profileData = {
        userId: authState.user.id,
        username: state.data.username || '',
        primaryGoal: state.data.primaryGoal || '',
        primaryGoalDescription: state.data.goalDescription || '',
        experienceLevel: state.data.experienceLevel || '',
        daysPerWeek: state.data.daysPerWeek || 3,
        minutesPerSession: state.data.minutesPerSession || 45,
        equipment: Array.isArray(state.data.equipment) ? state.data.equipment[0] || '' : state.data.equipment || '',
        age: state.data.age || 25,
        weight: state.data.weight || 70,
        weightUnit: state.data.weightUnit || 'kg',
        height: state.data.height || 170,
        heightUnit: state.data.heightUnit || 'cm',
        gender: state.data.gender || '',
        hasLimitations: state.data.hasLimitations || false,
        limitationsDescription: state.data.limitationsDescription || '',
        finalChatNotes: state.data.finalNotes || '',
        coachId: state.data.selectedCoachId || null,
      };
      
      // Use the new UserService method directly
      const response = await UserService.createUserProfile(authState.user?.id || '', profileData);
      
      if (!response.success) {
        Alert.alert(
          'Profile Creation Failed',
          response.error || 'Failed to create your profile. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Load the created profile into AuthContext (without workout plan since we'll generate one)
      if (authState.user?.id) {
        // Only load the profile, not the workout plan since we're about to generate one
        const profileResponse = await UserService.getUserProfile(authState.user.id);
        if (profileResponse.success && profileResponse.data) {
          // Update AuthContext directly with the profile data
          dispatch({ type: 'SET_USER_PROFILE', payload: profileResponse.data });
        }
      }
      
      // Step 3: Set flag and navigate immediately for smooth transition
      setComingFromOnboarding(true);
      console.log('✅ Profile created → GeneratePlanScreen');
      router.replace('/generate-plan');
      
    } catch (error) {
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
                style={[styles.completeButton, isCompleting && styles.completeButtonDisabled]}
                onPress={handleComplete}
                disabled={isCompleting}
                testID="create-plan-button"
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.completeButtonText}>Create My Plan</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={handleBackToEdit}
                disabled={isCompleting}
                testID="edit-profile-button"
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </OnboardingCard>
        
        {/* Loading Overlay */}
        <LoadingOverlay 
          visible={isCompleting} 
          message="Creating your profile..."
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
