// Daily Training Detail Component - Shows selected day's training
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import ExerciseRow from './ExerciseRow';
import { DailyTrainingDetailProps } from '../../types/training';


const DailyTrainingDetail: React.FC<DailyTrainingDetailProps> = ({
  dailyTraining,
  isPastWeek,
  onExerciseToggle,
  onSetUpdate,
  onExerciseDetail,
  onOneRMCalculator,
  onSwapExercise,
  onReopenTraining,
  onIntensityUpdate
}) => {
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
          {/* Day Header */}
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{dailyTraining.dayOfWeek}</Text>
            
            {/* Show past week indicator */}
            {isPastWeek && (
              <View style={styles.pastWeekIndicator}>
                <Ionicons name="lock-closed" size={12} color={colors.muted} />
                <Text style={styles.pastWeekText}>Past Week</Text>
              </View>
            )}
          </View>

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

  const completedExercises = dailyTraining.exercises.filter(ex => ex.completed).length;
  const totalExercises = dailyTraining.exercises.length;
  const progress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.trainingCard}>
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayName}>{dailyTraining.dayOfWeek}</Text>
          
          {/* Show past week indicator */}
          {isPastWeek && (
            <View style={styles.pastWeekIndicator}>
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
              <Text style={styles.pastWeekText}>Past Week</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.exercisesContainer}>
            {dailyTraining.exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onToggle={() => onExerciseToggle(exercise.id)}
                onSetUpdate={(setIndex, reps, weight) => 
                  onSetUpdate(exercise.id, setIndex, reps, weight)
                }
                onShowDetail={() => {
                  console.log('🔍 DailyTrainingDetail: Calling onExerciseDetail with exercise:', exercise.exercise);
                  onExerciseDetail(exercise.exercise);
                }}
                onOneRMCalculator={onOneRMCalculator}
                onSwapExercise={onSwapExercise ? () => onSwapExercise(exercise.exercise) : undefined}
                onIntensityUpdate={(exerciseId, intensity) => {
                  console.log('🎯 DailyTrainingDetail: onIntensityUpdate called with exerciseId:', exerciseId, 'intensity:', intensity);
                  onIntensityUpdate?.(exerciseId, intensity);
                }}
                isLocked={dailyTraining.completed}
              />
            ))}
            
            {/* Training completion status */}
            <View style={styles.trainingStatus}>
              {dailyTraining.completed ? (
                <View style={styles.completedStatusContainer}>
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    <Text style={styles.statusTextComplete}>Training Complete</Text>
                    {onReopenTraining && (
                      <TouchableOpacity 
                        style={styles.reopenButton}
                        onPress={onReopenTraining}
                      >
                        <Ionicons name="lock-open-outline" size={16} color={colors.primary} />
                        <Text style={styles.reopenButtonText}>Reopen Training</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.statusRow}>
                  <Ionicons name="ellipse-outline" size={20} color={colors.muted} />
                  <Text style={styles.statusTextIncomplete}>Training Incomplete</Text>
                </View>
              )}
            </View>
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
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text
  },
  pastWeekIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.muted + '20',
    borderRadius: 8
  },
  pastWeekText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500'
  },
  exercisesContainer: {
    gap: 12
  },
  trainingStatus: {
    paddingTop: 8
  },
  completedStatusContainer: {
    gap: 12
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    marginLeft: 'auto'
  },
  reopenButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary
  },
  statusTextComplete: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary
  },
  statusTextIncomplete: {
    fontSize: 16,
    color: colors.muted
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
  }
});

export default DailyTrainingDetail;
