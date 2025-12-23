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
import { getTrainingDayStatus } from '../../../utils/trainingDateUtils';

const DailyTrainingDetail: React.FC<DailyTrainingDetailProps> = ({
  dailyTraining,
  onExerciseToggle,
  onSetUpdate,
  onExerciseDetail,
  onSwapExercise,
  onReopenTraining,
  onAddExercise,
  onAddEnduranceSession,
  onRemoveExercise,
  onReopenEnduranceSession,
  onToggleChange,
  isStrengthMode,
  hideDayName = false,
  hideExerciseCompletionButton = false,
  hideExerciseExpandButton = false,
  hideExerciseInfoButton = false,
  exerciseCompactMode = false,
  onStartTracking,
  onImportFromHealth,
  useMetric = true,
}) => {
  // Use isEditable from dailyTraining (computed based on scheduledDate)
  const isEditable = dailyTraining?.isEditable ?? true; // Default to true for legacy plans without scheduledDate
  const isLocked = !isEditable || dailyTraining?.completed || false;
  const dayStatus = getTrainingDayStatus(dailyTraining);
  
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
          isEditable={isEditable}
          dayStatus={dayStatus}
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
          isEditable={isEditable}
          dayStatus={dayStatus}
          isRestDay={false}
          hideDayName={hideDayName}
        />

        {/* Training completion status - At top for immediate visibility */}
        <TrainingCompletionBadge
          completed={dailyTraining.completed ?? false}
          onReopenTraining={dayStatus === 'past' ? undefined : onReopenTraining}
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
                  onSwapExercise={onSwapExercise && exercise.exercise ? () => onSwapExercise(exercise.exercise!) : undefined}
                  onRemoveExercise={!isLocked && onRemoveExercise ? () => {
                    onRemoveExercise(exercise.id, isEndurance);
                  } : undefined}
                  onReopenEnduranceSession={isEndurance && onReopenEnduranceSession
                    ? () => onReopenEnduranceSession(exercise.id)
                    : undefined
                  }
                  isLocked={isLocked}
                  hideCompletionButton={hideExerciseCompletionButton}
                  hideExpandButton={hideExerciseExpandButton}
                  hideInfoButton={hideExerciseInfoButton}
                  compactMode={exerciseCompactMode}
                  // Tracking props for endurance sessions
                  onStartTracking={isEndurance && exercise.enduranceSession && onStartTracking
                    ? () => onStartTracking(exercise.enduranceSession!)
                    : undefined
                  }
                  onImportFromHealth={isEndurance && exercise.enduranceSession && onImportFromHealth
                    ? () => onImportFromHealth(exercise.enduranceSession!)
                    : undefined
                  }
                  useMetric={useMetric}
                />
              );
            })}
          
          {/* Add Exercise Button - Only show if editable */}
          {!isLocked && onAddExercise && (
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
    padding: 20, // Increased from 16 for better spacing
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20, // Increased from 12 to match home page cards
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: {
      width: 0,
      height: 4, // Increased from 2 for better elevation
    },
    shadowOpacity: 0.15, // Increased for deeper shadow
    shadowRadius: 12, // Increased for softer shadow spread
    elevation: 4, // Increased for Android elevation
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
  lockMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: createColorWithOpacity(colors.muted, 0.1),
    borderRadius: 8,
    marginBottom: 8,
  },
  lockMessage: {
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
});

export default DailyTrainingDetail;

