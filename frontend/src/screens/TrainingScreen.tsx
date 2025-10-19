// Training Screen - Main training interface
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useTraining } from '../hooks/useTraining';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import TrainingHeader from '../components/training/TrainingHeader';
import WeekNavigationAndOverview from '../components/training/WeekNavigationAndOverview';
import DailyTrainingDetail from '../components/training/DailyTrainingDetail';
import ConfirmationDialog from '../components/shared/ConfirmationDialog';
import ExerciseDetailView from '../components/training/ExerciseDetailView';
import OneRMCalculatorView from '../components/training/OneRMCalculatorView';
import ExerciseSwapModal from '../components/training/ExerciseSwapModal';
import { DailyFeedbackModal, DailyFeedbackData } from '../components/training/DailyFeedbackModal';
import { useDailyFeedback } from '../hooks/useDailyFeedback';

const TrainingScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const [oneRMCalculatorVisible, setOneRMCalculatorVisible] = useState(false);
  const [selectedExerciseForCalculator, setSelectedExerciseForCalculator] = useState<string>('');
  
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
    updateIntensity,
    showExerciseDetail,
    hideExerciseDetail,
    toggleOneRMCalculator,
    completeTraining,
    reopenTraining,
    confirmReopenTraining,
    cancelReopenTraining,
    showExerciseSwapModal,
    hideExerciseSwapModal,
    swapExercise,
    isExerciseSwapModalVisible,
    exerciseToSwap,
    isPlanComplete,
    currentWeekProgress
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

  // Show feedback modal when training is completed
  useEffect(() => {
    if (selectedDayTraining?.completed && !selectedDayTraining.isRestDay) {
      // Small delay to let the completion animation finish
      const timer = setTimeout(() => {
        setShowFeedbackModal(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [selectedDayTraining?.completed, selectedDayTraining?.isRestDay, setShowFeedbackModal]);

  const handleOneRMCalculator = (exerciseName: string) => {
    setSelectedExerciseForCalculator(exerciseName);
    setOneRMCalculatorVisible(true);
  };

  const handleOneRMCalculate = (estimated1RM: number) => {
    console.log('Calculated 1RM:', estimated1RM, 'for exercise:', selectedExerciseForCalculator);
    
    // Find the exercise in the current training and apply the 1RM calculation
    if (selectedDayTraining && selectedExerciseForCalculator) {
      const exercise = selectedDayTraining.exercises.find(
        ex => ex.exercise?.name === selectedExerciseForCalculator
      );
      
      if (exercise && exercise.weight1RM) {
        // Calculate weights based on weight_1rm percentages
        const calculatedWeights = exercise.weight1RM.map((percentage: number) => {
          return Math.round((estimated1RM * percentage) / 100);
        });
        
        console.log('Applying calculated weights:', calculatedWeights, 'based on percentages:', exercise.weight1RM);
        
        // Update each set with the calculated weight
        calculatedWeights.forEach((weight: number, index: number) => {
          if (exercise.sets[index]) {
            updateSetDetails(exercise.id, index, exercise.sets[index].reps, weight);
          }
        });
      }
    }
  };

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
      console.error('Failed to submit feedback');
    }
  };

  const handleFeedbackSkip = async () => {
    if (!selectedDayTraining) return;

    await skipFeedback(selectedDayTraining);
    setShowFeedbackModal(false);
  };

  // Handle loading state
  if (trainingState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
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

  // Handle no training plan
  if (!trainingPlan) {
    return (
      <SafeAreaView style={styles.container}>
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

  // Calculate current week stats
  const currentWeek = trainingPlan?.weeklySchedules?.find(
    week => week.weekNumber === trainingState.currentWeekSelected
  );
  
  const completedTrainingsThisWeek = currentWeek?.dailyTrainings.filter(
    training => training.completed && !training.isRestDay
  ).length || 0;
  
  const totalTrainingsThisWeek = currentWeek?.dailyTrainings.filter(
    training => !training.isRestDay
  ).length || 0;

  const isPastWeek = trainingState.currentWeekSelected < (trainingPlan?.currentWeek || 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Training Header */}
        <TrainingHeader
          trainingPlan={trainingPlan}
          progressRing={progressRing}
          currentWeek={trainingState.currentWeekSelected}
          completedTrainingsThisWeek={completedTrainingsThisWeek}
          totalTrainingsThisWeek={totalTrainingsThisWeek}
        />

        {/* Week Navigation and Overview */}
        <WeekNavigationAndOverview
          weekNavigation={weekNavigation}
          dayIndicators={dayIndicators}
          onWeekChange={selectWeek}
          onDaySelect={selectDay}
        />

        {/* Daily Training Detail */}
        <DailyTrainingDetail
          dailyTraining={selectedDayTraining}
          isPastWeek={isPastWeek}
          onExerciseToggle={toggleExerciseCompletion}
          onSetUpdate={updateSetDetails}
          onExerciseDetail={showExerciseDetail}
          onOneRMCalculator={handleOneRMCalculator}
          onSwapExercise={handleExerciseSwap}
          onReopenTraining={reopenTraining}
          onIntensityUpdate={(exerciseId, intensity) => {
            console.log('🎯 TrainingScreen: onIntensityUpdate called with exerciseId:', exerciseId, 'intensity:', intensity);
            updateIntensity(exerciseId, intensity);
          }}
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

      {/* OneRM Calculator Modal */}
      <OneRMCalculatorView
        exerciseName={selectedExerciseForCalculator}
        isVisible={oneRMCalculatorVisible}
        onClose={() => setOneRMCalculatorVisible(false)}
        onCalculate={handleOneRMCalculate}
      />

      {/* Exercise Swap Modal */}
      {exerciseToSwap && (
        <ExerciseSwapModal
          visible={isExerciseSwapModalVisible}
          currentExercise={exerciseToSwap}
          onClose={hideExerciseSwapModal}
          onSwapExercise={handleConfirmExerciseSwap}
          scheduledExerciseIds={selectedDayTraining?.exercises.map(ex => ex.exercise?.id).filter(Boolean) || []}
          scheduledExerciseNames={selectedDayTraining?.exercises.map(ex => ex.exercise?.name).filter(Boolean) || []}
        />
      )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar
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

export default TrainingScreen;
