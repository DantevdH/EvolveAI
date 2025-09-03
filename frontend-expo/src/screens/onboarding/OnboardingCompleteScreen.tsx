/**
 * Onboarding Complete screen - Final step of onboarding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { OnboardingCard } from '../../components/onboarding';
import { colors } from '../../constants/colors';

export const OnboardingCompleteScreen: React.FC = () => {
  const { state, completeOnboarding, setGeneratingPlan } = useOnboarding();
  const { createUserProfile, generateWorkoutPlan } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      // Complete onboarding in the onboarding context
      const success = await completeOnboarding();
      
      if (success) {
        // Create user profile in Supabase with all onboarding data
        const profileCreated = await createUserProfile({
          username: state.data.username,
          primaryGoal: state.data.primaryGoal,
          primaryGoalDescription: state.data.goalDescription || '',
          experienceLevel: state.data.experienceLevel,
          daysPerWeek: state.data.daysPerWeek,
          minutesPerSession: state.data.minutesPerSession,
          equipment: state.data.equipment.join(', '),
          age: state.data.age,
          weight: state.data.weight,
          weightUnit: state.data.weightUnit,
          height: state.data.height,
          heightUnit: state.data.heightUnit,
          gender: state.data.gender,
          hasLimitations: state.data.hasLimitations,
          limitationsDescription: state.data.limitationsDescription || '',
          finalChatNotes: state.data.finalNotes || '',
        });
        
        if (profileCreated) {
          // Start generating workout plan
          setGeneratingPlan(true);
          
          // Generate the workout plan
          const planGenerated = await generateWorkoutPlan();
          
          if (planGenerated) {
            // Navigate to main app after successful plan generation
            router.replace('/(tabs)');
          } else {
            // If plan generation fails, still navigate to main app
            // The user can regenerate the plan later
            console.error('Failed to generate workout plan, but continuing to main app');
            router.replace('/(tabs)');
          }
        } else {
          Alert.alert(
            'Error',
            'Failed to create user profile. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Error',
          'Failed to complete onboarding. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
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
    // Navigate back to first step to allow editing
    // This would be handled by the onboarding navigation
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
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
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <Text style={styles.progressText}>Onboarding Complete</Text>
            </View>
          </View>
        </OnboardingCard>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
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
