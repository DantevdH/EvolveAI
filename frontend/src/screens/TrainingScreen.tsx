// Training Screen - Main training interface
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTraining } from '../hooks/useTraining';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import { TrainingHeader } from '../components/training/header';
import { DailyTrainingDetail } from '../components/training/dailyDetail';
import ConfirmationDialog from '../components/shared/ConfirmationDialog';
import { ExerciseDetailView } from '../components/training/exerciseDetail';
import OneRMCalculatorView from '../components/training/OneRMCalculatorView';
import { ExerciseSwapModal } from '../components/training/exerciseSwapModal';
import SessionRPEModal from '../components/training/SessionRPEModal';
import { DailyFeedbackModal, DailyFeedbackData } from '../components/training/dailyFeedback';
import { useDailyFeedback } from '../hooks/useDailyFeedback';
import { AddExerciseModal } from '../components/training/addExerciseModal';
import { AddEnduranceSessionModal } from '../components/training/addEnduranceSession';
import { FitnessJourneyMap } from '../components/training/journeyMap';
import { WelcomeHeader } from '../components/home/WelcomeHeader';
import { ProgressSummary } from '../components/home/ProgressSummary';

const TrainingScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const [oneRMCalculatorVisible, setOneRMCalculatorVisible] = useState(false);
  const [selectedExerciseForCalculator, setSelectedExerciseForCalculator] = useState<string>('');
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
    toggleOneRMCalculator,
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
    removeExercise: removeExerciseHook
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

  const handleToggleChange = (isStrength: boolean) => {
    setIsStrengthMode(isStrength);
  };

  // Handle week selection from map
  const handleWeekSelectFromMap = (weekNumber: number) => {
    setSelectedWeekFromMap(weekNumber);
    selectWeek(weekNumber);
  };

  // Handle back to map
  const handleBackToMap = () => {
    setSelectedWeekFromMap(null);
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

  // Calculate KPIs for ProgressSummary
  const completedWeeks = trainingPlan?.weeklySchedules?.filter(
    week => week.weekNumber < trainingPlan.currentWeek
  ).length || 0;

  // Calculate streak (consecutive completed days)
  const calculateStreak = () => {
    if (!trainingPlan?.weeklySchedules) return 0;
    
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();
    const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, etc.
    const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0
    const todayName = dayOrder[mondayFirstIndex];
    const todayIndex = dayOrder.indexOf(todayName);
    
    const allDailyTrainings: Array<{ weekNumber: number; dayOfWeek: string; completed: boolean }> = [];
    
    trainingPlan.weeklySchedules.forEach(week => {
      week.dailyTrainings.forEach(daily => {
        if (!daily.isRestDay) {
          const dayIndex = dayOrder.indexOf(daily.dayOfWeek);
          const isPastOrToday = dayIndex <= todayIndex;
          
          if (isPastOrToday) {
            const isCompleted = daily.exercises.length > 0 && daily.exercises.every(ex => ex.completed);
            allDailyTrainings.push({
              weekNumber: week.weekNumber,
              dayOfWeek: daily.dayOfWeek,
              completed: isCompleted
            });
          }
        }
      });
    });
    
    // Sort by week number (descending) and day order (descending) - most recent first
    allDailyTrainings.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return b.weekNumber - a.weekNumber;
      }
      return dayOrder.indexOf(b.dayOfWeek) - dayOrder.indexOf(a.dayOfWeek);
    });
    
    let streak = 0;
    for (const training of allDailyTrainings) {
      if (training.completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calculate weekly trainings (completed trainings in current week)
  const calculateWeeklyTrainings = () => {
    if (!trainingPlan?.weeklySchedules) return 0;
    
    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingPlan.currentWeek
    );
    
    if (!currentWeek) return 0;
    
    return currentWeek.dailyTrainings.filter(
      training => !training.isRestDay && 
                  training.exercises.length > 0 && 
                  training.exercises.every(ex => ex.completed)
    ).length;
  };

  const streak = calculateStreak();
  const weeklyTrainings = calculateWeeklyTrainings();

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
            weeksCompleted={completedWeeks}
          />
          
          {/* Journey Map - Scrollable Card */}
          <View style={styles.journeyMapContainer}>
            <FitnessJourneyMap
              trainingPlan={trainingPlan}
              currentWeek={trainingPlan.currentWeek}
              onWeekSelect={handleWeekSelectFromMap}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show detail view if a week is selected
  return (
    <SafeAreaView style={styles.container}>
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
          isPastWeek={isPastWeek}
          onExerciseToggle={toggleExerciseCompletion}
          onSetUpdate={updateSetDetails}
          onExerciseDetail={showExerciseDetail}
          onOneRMCalculator={handleOneRMCalculator}
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
        scheduledExerciseIds={selectedDayTraining?.exercises.map(ex => ex.exercise?.id).filter(Boolean) || []}
        scheduledExerciseNames={selectedDayTraining?.exercises.map(ex => ex.exercise?.name).filter(Boolean) || []}
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
  },
  journeyMapContainer: {
    flex: 1,
    minHeight: 0, // Important for flex children to shrink
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
