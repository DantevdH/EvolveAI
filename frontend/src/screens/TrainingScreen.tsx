// Training Screen - Main training interface
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { triggerChatAutoOpen } from '@/src/utils/chatAutoOpen';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from '../hooks/useTraining';
import { useAuth } from '../context/AuthContext';
import { colors, createColorWithOpacity, goldenGradient } from '../constants/colors';
import { logger } from '../utils/logger';
import { calculateKPIs } from '../utils/trainingKPIs';
import { TrainingHeader } from '../components/training/header';
import { DailyTrainingDetail } from '../components/training/dailyDetail';
import ConfirmationDialog from '../components/shared/ConfirmationDialog';
import { ExerciseDetailView } from '../components/training/exerciseDetail';
import { ExerciseSwapModal } from '../components/training/exerciseSwapModal';
import SessionRPEModal from '../components/training/SessionRPEModal';
import { DailyFeedbackModal, DailyFeedbackData } from '../components/training/dailyFeedback';
import { useDailyFeedback } from '../hooks/useDailyFeedback';
import { AddExerciseModal } from '../components/training/addExerciseModal';
import { AddEnduranceSessionModal } from '../components/training/addEnduranceSession';
import { FitnessJourneyMap } from '../components/training/journeyMap';
import { WelcomeHeader } from '../components/home/WelcomeHeader';
import { ProgressSummary } from '../components/home/ProgressSummary';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { trainingService } from '../services/onboardingService';
import { reverseTransformTrainingPlan, transformUserProfileToPersonalInfo } from '../utils/trainingPlanTransformer';
import { supabase } from '../config/supabase';
import { useApiCallWithBanner } from '../hooks/useApiCallWithBanner';

const TrainingScreenContent: React.FC = () => {
  const { state: authState, refreshTrainingPlan, setTrainingPlan } = useAuth();
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [removeExerciseId, setRemoveExerciseId] = useState<{ id: string; isEndurance: boolean; name: string } | null>(null);
  const [selectedWeekFromMap, setSelectedWeekFromMap] = useState<number | null>(null);
  
  const {
    trainingState,
    trainingPlan,
    selectedDayTraining,
    progressRing,
    weekNavigation,
    dayIndicators,
    selectWeek,
    selectDay,
    toggleExerciseCompletion,
    updateSetDetails,
    showExerciseDetail,
    hideExerciseDetail,
    completeTraining,
    reopenTraining,
    confirmReopenTraining,
    cancelReopenTraining,
    handleRPESelection,
    handleRPEModalClose,
    showExerciseSwapModal,
    hideExerciseSwapModal,
    swapExercise,
    isExerciseSwapModalVisible,
    exerciseToSwap,
    isPlanComplete,
    currentWeekProgress,
    addExercise: addExerciseHook,
    addEnduranceSession: addEnduranceSessionHook,
    removeExercise: removeExerciseHook,
    SwapExerciseErrorBanner,
    CompleteTrainingErrorBanner
  } = useTraining();

  // Daily Feedback Hook for ACE Pattern
  const {
    showFeedbackModal,
    setShowFeedbackModal,
    captureOriginalTraining,
    submitFeedback,
    skipFeedback,
    modificationsDetected,
    isSubmitting,
  } = useDailyFeedback(
    authState.user?.id || '',
    trainingPlan?.id || '',
    trainingState.currentWeekSelected,
    {
      username: authState.userProfile?.username || authState.user?.user_metadata?.username || authState.user?.email || 'User',
      age: authState.userProfile?.age || 30,
      weight: authState.userProfile?.weight || 70,
      weight_unit: authState.userProfile?.weightUnit || 'kg',
      height: authState.userProfile?.height || 175,
      height_unit: authState.userProfile?.heightUnit || 'cm',
      gender: authState.userProfile?.gender || 'male',
      goal_description: authState.userProfile?.goalDescription || trainingPlan?.description || 'General Fitness',
      experience_level: authState.userProfile?.experienceLevel || 'intermediate',
      measurement_system: authState.userProfile?.weightUnit === 'lbs' ? 'imperial' : 'metric',
    }
  );

  // Capture original training state when selected day changes
  useEffect(() => {
    if (selectedDayTraining && !selectedDayTraining.completed) {
      captureOriginalTraining(selectedDayTraining);
    }
  }, [selectedDayTraining, captureOriginalTraining]);

  // Daily feedback on single-day completion disabled per request
  useEffect(() => {
    // Intentionally no-op: feedback will be triggered after full week completion in a future step
  }, [selectedDayTraining?.completed, selectedDayTraining?.isRestDay, setShowFeedbackModal]);

  // Auto-open chat when user navigates INTO the week detail view (not the journey map)
  // and a plan needs review (trainingPlan exists but planAccepted is false)
  useEffect(() => {
    const planNeedsReview = !!authState.trainingPlan && !authState.userProfile?.planAccepted;
    
    // Only trigger when user navigates into week detail view (selectedWeekFromMap is set)
    // This ensures the chat opens when viewing exercises, not on the journey map overview
    if (planNeedsReview && selectedWeekFromMap !== null) {
      triggerChatAutoOpen();
    }
  }, [selectedWeekFromMap, authState.trainingPlan, authState.userProfile?.planAccepted]);


  const handleExerciseSwap = (exercise: any) => {
    showExerciseSwapModal(exercise);
  };

  const handleConfirmExerciseSwap = (newExercise: any) => {
    if (exerciseToSwap && selectedDayTraining) {
      // Find the exercise to swap in the current training
      const exerciseToReplace = selectedDayTraining.exercises.find(
        ex => ex.exercise?.name === exerciseToSwap.name
      );
      
      if (exerciseToReplace) {
        swapExercise(exerciseToReplace.id, newExercise);
      }
    }
  };

  // Daily Feedback Handlers
  const handleFeedbackSubmit = async (feedbackData: DailyFeedbackData) => {
    if (!selectedDayTraining) return;

    try {
      await submitFeedback(feedbackData, selectedDayTraining);
      // Success message is shown by the hook
    } catch (error) {
      // Error is already handled by the hook
      logger.error('Failed to submit feedback', error);
    }
  };

  const handleFeedbackSkip = async () => {
    if (!selectedDayTraining) return;

    await skipFeedback(selectedDayTraining);
    setShowFeedbackModal(false);
  };

  // Add Exercise Handlers
  const handleAddExercise = () => {
    setAddExerciseModalVisible(true);
  };

  const handleAddEnduranceSession = (sessionData: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  }) => {
    if (selectedDayTraining) {
      addEnduranceSessionHook(sessionData, selectedDayTraining.id);
    }
  };

  const handleConfirmAddExercise = (exercise: any) => {
    if (selectedDayTraining) {
      addExerciseHook(exercise, selectedDayTraining.id);
    }
    setAddExerciseModalVisible(false);
  };


  // Remove Exercise Handlers
  const handleRemoveExercise = (exerciseId: string, isEndurance: boolean) => {
    if (!selectedDayTraining) return;

    const exercise = selectedDayTraining.exercises.find(ex => ex.id === exerciseId);
    const exerciseName = exercise?.exercise?.name || exercise?.enduranceSession?.name || 'Exercise';
    
    setRemoveExerciseId({ id: exerciseId, isEndurance, name: exerciseName });
  };

  const handleConfirmRemoveExercise = () => {
    if (removeExerciseId && selectedDayTraining) {
      removeExerciseHook(removeExerciseId.id, removeExerciseId.isEndurance, selectedDayTraining.id);
    }
    setRemoveExerciseId(null);
  };

  const handleCancelRemoveExercise = () => {
    setRemoveExerciseId(null);
  };

  // Handle week selection from map
  const handleWeekSelectFromMap = (weekNumber: number) => {
    setSelectedWeekFromMap(weekNumber);
    selectWeek(weekNumber);
  };

  // Handle week generation
  // API call with error handling for week generation
  const { execute: executeGenerateWeek, ErrorBannerComponent: GenerateWeekErrorBanner } = useApiCallWithBanner(
    async (weekNumber: number) => {
      if (!trainingPlan || !authState.userProfile) {
        throw new Error('Unable to generate week: missing training plan or user profile');
      }

      const planId = typeof trainingPlan.id === 'string' ? parseInt(trainingPlan.id, 10) : trainingPlan.id;
      if (!planId) {
        throw new Error('Invalid plan ID');
      }

      // Get JWT token
      let jwtToken = authState.session?.access_token;
      if (!jwtToken) {
        const { data: { session } } = await supabase.auth.getSession();
        jwtToken = session?.access_token;
      }

      if (!jwtToken) {
        throw new Error('JWT token not available. Please sign in again.');
      }

      // Prepare data
      const backendFormatPlan = reverseTransformTrainingPlan(trainingPlan);
      const personalInfo = transformUserProfileToPersonalInfo(authState.userProfile);

      if (!personalInfo) {
        throw new Error('Failed to prepare user profile data.');
      }

      // Call API
      const userProfileId = authState.userProfile.id;
      if (!userProfileId) {
        throw new Error('User profile ID not available.');
      }

      const response = await trainingService.generateWeek(
        planId,
        backendFormatPlan,
        userProfileId,
        personalInfo,
        jwtToken
      );

      // Update training plan with new week
      if (response?.data) {
        // Transform the response back to frontend format
        const { transformTrainingPlan } = await import('../utils/trainingPlanTransformer');
        const updatedPlan = transformTrainingPlan(response.data);
        
        // Update the training plan in auth context
        setTrainingPlan(updatedPlan);
        
        // Refresh to get the latest data
        await refreshTrainingPlan();
        
        logger.info(`Week ${weekNumber} generated successfully`);
      } else {
        throw new Error('Invalid response from server');
      }
    },
    {
      retryAttempts: 3,
    }
  );

  const handleGenerateWeek = useCallback(async (weekNumber: number) => {
    try {
      await executeGenerateWeek(weekNumber);
    } catch (error) {
      // Error is already handled by useApiCallWithBanner, but we re-throw for modal to handle
      throw error;
    }
  }, [executeGenerateWeek]);

  // Handle back to map
  const handleBackToMap = () => {
    setSelectedWeekFromMap(null);
  };

  // Handle loading state
  if (trainingState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <SwapExerciseErrorBanner />
        <CompleteTrainingErrorBanner />
        <GenerateWeekErrorBanner />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading training plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle error state
  if (trainingState.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{trainingState.error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle no training plan (graceful handling of null/undefined)
  if (!trainingPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <SwapExerciseErrorBanner />
        <CompleteTrainingErrorBanner />
        <GenerateWeekErrorBanner />
        <View style={styles.noPlanContainer}>
          <Text style={styles.noPlanTitle}>No Training Plan</Text>
          <Text style={styles.noPlanText}>
            You don't have an active training plan yet. Create one to get started with your training.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle plan completion
  if (isPlanComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completeContainer}>
          <Text style={styles.completeTitle}>🎉 Plan Complete!</Text>
          <Text style={styles.completeText}>
            Congratulations! You've completed your training plan. Ready for the next challenge?
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate current week stats (with null/undefined validation)
  const currentWeek = trainingPlan?.weeklySchedules?.find(
    week => week.weekNumber === trainingState.currentWeekSelected
  );
  
  const completedTrainingsThisWeek = currentWeek?.dailyTrainings?.filter(
    training => training.completed && !training.isRestDay
  ).length || 0;
  
  const totalTrainingsThisWeek = currentWeek?.dailyTrainings?.filter(
    training => !training.isRestDay
  ).length || 0;

  const isPastWeek = trainingState.currentWeekSelected < (trainingPlan?.currentWeek || 1);

  // Calculate KPIs using extracted utility functions
  const { streak, weeklyTrainings, completedWeeks: validatedCompletedWeeks } = calculateKPIs(trainingPlan);

  const renderJourneyAccessory = (
    <TouchableOpacity
      style={styles.journeyHeaderButtonWrapper}
      activeOpacity={0.9}
      onPress={() => handleWeekSelectFromMap(trainingPlan.currentWeek)}
    >
      <LinearGradient
        colors={goldenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.journeyHeaderButton}
      >
        <Text style={styles.journeyHeaderButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </LinearGradient>
    </TouchableOpacity>
  );

  // Show map view if no week is selected from map
  if (selectedWeekFromMap === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.journeyPageContainer}>
          {/* Welcome Header */}
          <WelcomeHeader username={authState.userProfile?.username} />
          
          {/* Progress Summary - KPIs */}
          <ProgressSummary 
            streak={streak}
            weeklyTrainings={weeklyTrainings}
            weeksCompleted={validatedCompletedWeeks}
          />
          {/* Journey Map - Scrollable Card */}
          <View style={styles.journeyMapContainer}>
            <FitnessJourneyMap
              trainingPlan={trainingPlan}
              currentWeek={trainingPlan.currentWeek}
              onWeekSelect={handleWeekSelectFromMap}
              onGenerateWeek={handleGenerateWeek}
              headerTitle={trainingPlan.title}
              headerAccessory={renderJourneyAccessory}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show detail view if a week is selected
  return (
    <SafeAreaView style={styles.container}>
      <SwapExerciseErrorBanner />
      <CompleteTrainingErrorBanner />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Training Header (Unified: Back + Progress + Weekdays) */}
        <TrainingHeader
          progressRing={progressRing}
          onBackToMap={handleBackToMap}
          dayIndicators={dayIndicators}
          onDaySelect={selectDay}
          currentWeek={trainingState.currentWeekSelected}
        />

        {/* Daily Training Detail */}
        <DailyTrainingDetail
          dailyTraining={selectedDayTraining}
          onExerciseToggle={toggleExerciseCompletion}
          onSetUpdate={updateSetDetails}
          onExerciseDetail={showExerciseDetail}
          onSwapExercise={handleExerciseSwap}
          onReopenTraining={reopenTraining}
          onAddExercise={handleAddExercise}
          onRemoveExercise={handleRemoveExercise}
        />

        {/* Bottom spacing for scroll comfort */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Exercise Detail Modal */}
      {trainingState.selectedExercise && (
        <ExerciseDetailView
          exercise={trainingState.selectedExercise}
          isVisible={trainingState.isShowingExerciseDetail}
          onClose={hideExerciseDetail}
        />
      )}

      {/* Exercise Swap Modal */}
      {exerciseToSwap && (
        <ExerciseSwapModal
          visible={isExerciseSwapModalVisible}
          currentExercise={exerciseToSwap}
          onClose={hideExerciseSwapModal}
          onSwapExercise={handleConfirmExerciseSwap}
          scheduledExerciseIds={selectedDayTraining?.exercises.map(ex => ex.exercise?.id).filter((id): id is string => !!id) || []}
          scheduledExerciseNames={selectedDayTraining?.exercises.map(ex => ex.exercise?.name).filter((name): name is string => !!name) || []}
        />
      )}

      {/* Session RPE Modal */}
      <SessionRPEModal
        visible={trainingState.showRPEModal}
        onSelect={handleRPESelection}
      />

      {/* Reopen Training Confirmation Dialog */}
      <ConfirmationDialog
        visible={trainingState.showReopenDialog}
        title="Reopen Training"
        message="Reopening this training will unlock all exercises for editing. All exercise completion checkmarks will be reset, but your weight inputs will be preserved."
        confirmText="Reopen"
        cancelText="Cancel"
        onConfirm={() => confirmReopenTraining(true)}
        onCancel={() => confirmReopenTraining(false)}
        confirmButtonColor={colors.primary}
        icon="refresh"
      />

      {/* Daily Feedback Modal (ACE Pattern) */}
      <DailyFeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
        dayOfWeek={selectedDayTraining?.dayOfWeek || ''}
        trainingType={selectedDayTraining?.isRestDay ? 'Rest Day' : 'Training'}
        modificationsDetected={modificationsDetected}
      />

      {/* Add Exercise Modal (with toggle inside) */}
      <AddExerciseModal
        visible={addExerciseModalVisible}
        onClose={() => setAddExerciseModalVisible(false)}
        onAddExercise={handleConfirmAddExercise}
        onAddEnduranceSession={handleAddEnduranceSession}
        scheduledExerciseIds={selectedDayTraining?.exercises.map(ex => ex.exercise?.id).filter((id): id is string => !!id) || []}
        scheduledExerciseNames={selectedDayTraining?.exercises.map(ex => ex.exercise?.name).filter((name): name is string => !!name) || []}
      />

      {/* Remove Exercise Confirmation Dialog */}
      <ConfirmationDialog
        visible={!!removeExerciseId}
        title="Remove Exercise"
        message={`Remove ${removeExerciseId?.name}? This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemoveExercise}
        onCancel={handleCancelRemoveExercise}
        confirmButtonColor={colors.primary}
        icon="trash"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  journeyPageContainer: {
    flex: 1,
    paddingTop: 12,
    gap: 12,
  },
  journeyMapContainer: {
    flex: 1,
    minHeight: 0, // Important for flex children to shrink
  },
  journeyHeaderButtonWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    maxWidth: 180,
  },
  journeyHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  journeyHeaderButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar (matching home page)
  },
  bottomSpacing: {
    height: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  noPlanTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  noPlanText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  },
  completeText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// Wrap TrainingScreen with ErrorBoundary to prevent crashes
// Note: ErrorBoundary will show a fallback UI if an error occurs, but this is better than crashing the entire app
// The default ErrorBoundary UI includes a "Try Again" button that resets the error state
const TrainingScreen: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('TrainingScreen error caught by ErrorBoundary', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <TrainingScreenContent />
    </ErrorBoundary>
  );
};

export default TrainingScreen;
export { TrainingScreen };
