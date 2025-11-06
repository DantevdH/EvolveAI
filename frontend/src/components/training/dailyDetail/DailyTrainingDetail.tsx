/**
 * Daily Training Detail Component
 * Main orchestrator for showing selected day's training
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { ExerciseRow } from '../exerciseRow';
import { DailyTrainingDetailProps } from '../../../types/training';
import DayHeader from './DayHeader';
import TrainingCompletionBadge from './TrainingCompletionBadge';
import AddExerciseButton from './AddExerciseButton';

const DailyTrainingDetail: React.FC<DailyTrainingDetailProps> = ({
  dailyTraining,
  isPastWeek,
  onExerciseToggle,
  onSetUpdate,
  onExerciseDetail,
  onOneRMCalculator,
  onSwapExercise,
  onReopenTraining,
  onAddExercise,
  onAddEnduranceSession,
  onRemoveExercise,
  onToggleChange,
  isStrengthMode,
  hideDayName = false,
  hideExerciseCompletionButton = false,
  hideExerciseExpandButton = false,
  hideExerciseInfoButton = false,
  exerciseCompactMode = false,
}) => {
  const isLocked = dailyTraining?.completed || false;
  
  // Check if this is today's workout
  const today = new Date();
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
  const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
  const todayName = dayNames[mondayFirstIndex];
  const isTodaysWorkout = dailyTraining?.dayOfWeek === todayName;
  
  if (!dailyTraining) {
    return (
      <View style={styles.container}>
        <Text style={styles.noTrainingText}>No training selected</Text>
      </View>
    );
  }

  if (dailyTraining.isRestDay) {
    return (
      <View style={styles.container}>
        <View style={styles.trainingCard}>
          <DayHeader
            dayOfWeek={dailyTraining.dayOfWeek}
            isTodaysWorkout={isTodaysWorkout}
            isPastWeek={isPastWeek}
            isRestDay={true}
          />

          {/* Rest Day Content */}
          <View style={styles.restDayContent}>
            <Ionicons name="moon" size={48} color={colors.purple + '60'} />
            <Text style={styles.restDayTitle}>Rest Day</Text>
            <Text style={[styles.restDaySubtitle, { color: colors.purple + '60', fontStyle: 'italic' }]}>
              Recharge and get ready for your next training!
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.trainingCard}>
        {/* Day Header */}
        <DayHeader
          dayOfWeek={dailyTraining.dayOfWeek}
          isTodaysWorkout={isTodaysWorkout}
          isPastWeek={isPastWeek}
          isRestDay={false}
          hideDayName={hideDayName}
        />

        {/* Training completion status - At top for immediate visibility */}
        <TrainingCompletionBadge
          completed={dailyTraining.completed}
          onReopenTraining={onReopenTraining}
        />

        {/* Exercises */}
        <View style={styles.exercisesContainer}>
          {dailyTraining.exercises
            .sort((a, b) => (a.executionOrder || a.order || 0) - (b.executionOrder || b.order || 0))
            .map((exercise, index) => {
              const isEndurance = !!exercise.enduranceSession;
              return (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  exerciseNumber={index + 1}
                  onToggle={() => onExerciseToggle(exercise.id)}
                  onSetUpdate={(setIndex, reps, weight) => 
                    onSetUpdate(exercise.id, setIndex, reps, weight)
                  }
                  onShowDetail={() => {
                    if (exercise.exercise) {
                      console.log('🔍 DailyTrainingDetail: Calling onExerciseDetail with exercise:', exercise.exercise);
                      onExerciseDetail(exercise.exercise);
                    }
                  }}
                  onOneRMCalculator={onOneRMCalculator}
                  onSwapExercise={onSwapExercise && exercise.exercise ? () => onSwapExercise(exercise.exercise!) : undefined}
                  onRemoveExercise={!isLocked && isTodaysWorkout && onRemoveExercise ? () => {
                    onRemoveExercise(exercise.id, isEndurance);
                  } : undefined}
                  isLocked={isLocked}
                  hideCompletionButton={hideExerciseCompletionButton}
                  hideExpandButton={hideExerciseExpandButton}
                  hideInfoButton={hideExerciseInfoButton}
                  compactMode={exerciseCompactMode}
                />
              );
            })}
          
          {/* Add Exercise Button - Only show for today's workout */}
          {!isLocked && isTodaysWorkout && onAddExercise && (
            <AddExerciseButton onPress={onAddExercise} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  trainingCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 16
  },
  exercisesContainer: {
    gap: 12
  },
  noTrainingText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.muted,
    marginTop: 40
  },
  restDayContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  restDayTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.purple + '60',
    marginTop: 12,
    marginBottom: 8,
  },
  restDaySubtitle: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default DailyTrainingDetail;

