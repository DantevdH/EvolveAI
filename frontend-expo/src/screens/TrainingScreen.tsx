// Training Screen - Main training interface
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useTraining } from '../hooks/useTraining';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import TrainingHeader from '../components/training/TrainingHeader';
import WeekNavigationAndOverview from '../components/training/WeekNavigationAndOverview';
import DailyWorkoutDetail from '../components/training/DailyWorkoutDetail';
import ConfirmationDialog from '../components/shared/ConfirmationDialog';
import ExerciseDetailView from '../components/training/ExerciseDetailView';
import OneRMCalculatorView from '../components/training/OneRMCalculatorView';

const TrainingScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const [oneRMCalculatorVisible, setOneRMCalculatorVisible] = useState(false);
  const [selectedExerciseForCalculator, setSelectedExerciseForCalculator] = useState<string>('');
  
  const {
    trainingState,
    workoutPlan,
    selectedDayWorkout,
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
    completeWorkout,
    reopenWorkout,
    confirmReopenWorkout,
    cancelReopenWorkout,
    isPlanComplete,
    currentWeekProgress
  } = useTraining();

  const handleOneRMCalculator = (exerciseName: string) => {
    setSelectedExerciseForCalculator(exerciseName);
    setOneRMCalculatorVisible(true);
  };

  const handleOneRMCalculate = (estimated1RM: number) => {
    console.log('Calculated 1RM:', estimated1RM, 'for exercise:', selectedExerciseForCalculator);
    
    // Find the exercise in the current workout and apply the 1RM calculation
    if (selectedDayWorkout && selectedExerciseForCalculator) {
      const exercise = selectedDayWorkout.exercises.find(
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

  // Handle loading state
  if (trainingState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout plan...</Text>
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

  // Handle no workout plan
  if (!workoutPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPlanContainer}>
          <Text style={styles.noPlanTitle}>No Workout Plan</Text>
          <Text style={styles.noPlanText}>
            You don't have an active workout plan yet. Create one to get started with your training.
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
            Congratulations! You've completed your workout plan. Ready for the next challenge?
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate current week stats
  const currentWeek = workoutPlan.weeklySchedules.find(
    week => week.weekNumber === trainingState.currentWeekSelected
  );
  
  const completedWorkoutsThisWeek = currentWeek?.dailyWorkouts.filter(
    workout => workout.completed && !workout.isRestDay
  ).length || 0;
  
  const totalWorkoutsThisWeek = currentWeek?.dailyWorkouts.filter(
    workout => !workout.isRestDay
  ).length || 0;

  const isPastWeek = trainingState.currentWeekSelected < workoutPlan.currentWeek;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Training Header */}
        <TrainingHeader
          workoutPlan={workoutPlan}
          progressRing={progressRing}
          currentWeek={trainingState.currentWeekSelected}
          completedWorkoutsThisWeek={completedWorkoutsThisWeek}
          totalWorkoutsThisWeek={totalWorkoutsThisWeek}
        />

        {/* Week Navigation and Overview */}
        <WeekNavigationAndOverview
          weekNavigation={weekNavigation}
          dayIndicators={dayIndicators}
          onWeekChange={selectWeek}
          onDaySelect={selectDay}
        />

        {/* Daily Workout Detail */}
        <DailyWorkoutDetail
          dailyWorkout={selectedDayWorkout}
          isPastWeek={isPastWeek}
          onExerciseToggle={toggleExerciseCompletion}
          onSetUpdate={updateSetDetails}
          onExerciseDetail={showExerciseDetail}
          onOneRMCalculator={handleOneRMCalculator}
          onReopenWorkout={reopenWorkout}
        />

        {/* Bottom spacing for scroll comfort */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Exercise Detail Modal */}
      <ExerciseDetailView
        exercise={trainingState.selectedExercise}
        isVisible={trainingState.isShowingExerciseDetail}
        onClose={hideExerciseDetail}
      />

      {/* OneRM Calculator Modal */}
      <OneRMCalculatorView
        exerciseName={selectedExerciseForCalculator}
        isVisible={oneRMCalculatorVisible}
        onClose={() => setOneRMCalculatorVisible(false)}
        onCalculate={handleOneRMCalculate}
      />

      {/* Reopen Workout Confirmation Dialog */}
      <ConfirmationDialog
        visible={trainingState.showReopenDialog}
        title="Reopen Workout"
        message="Reopening this workout will unlock all exercises for editing. All exercise completion checkmarks will be reset, but your weight inputs will be preserved."
        confirmText="Reopen"
        cancelText="Cancel"
        onConfirm={() => confirmReopenWorkout(true)}
        onCancel={() => confirmReopenWorkout(false)}
        confirmButtonColor={colors.primary}
        icon="refresh"
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
