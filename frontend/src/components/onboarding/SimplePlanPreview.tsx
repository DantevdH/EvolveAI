import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { TrainingPlan } from '../../types/training';

interface SimplePlanPreviewProps {
  trainingPlan: TrainingPlan;
  selectedDayIndex: number;
}

export const SimplePlanPreview: React.FC<SimplePlanPreviewProps> = ({
  trainingPlan,
  selectedDayIndex
}) => {
  const selectedDay = trainingPlan.weeklySchedules?.[0]?.dailyTrainings?.[selectedDayIndex];

  if (!selectedDay) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No training data available</Text>
      </View>
    );
  }

  if (selectedDay.isRestDay) {
    return (
      <View style={styles.container}>
        <View style={styles.trainingCard}>
          {/* Day Header */}
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{selectedDay.dayOfWeek}</Text>
          </View>

          {/* Rest Day Content - Exactly like main app */}
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={true}
      indicatorStyle="white"
      scrollIndicatorInsets={{ right: 2 }}
    >
      <View style={styles.card}>
        {selectedDay.exercises?.map((exercise, index) => {
          const exerciseName = exercise.exerciseId?.startsWith('endurance_')
            ? exercise.enduranceSession?.name || 'Endurance Session'
            : exercise.exerciseName || exercise.exercise?.name || `Exercise ${index + 1}`;

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseNameContainer}>
                  <Text style={styles.exerciseName}>{exerciseName}</Text>
                  {!exercise.exerciseId?.startsWith('endurance_') && exercise.sets && (
                    <Text style={styles.setsInfo}>
                      {exercise.equipment || 'Bodyweight'} • [{exercise.sets.map(set => set.reps).join(', ')}]
                    </Text>
                  )}
                </View>
              </View>

            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border + '30', // Subtle border
    borderRadius: 8,
  },
  trainingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
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
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
  },
  exerciseCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 12, // Match WeekNavigationAndOverview dayText
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  setsInfo: {
    fontSize: 10, // Smaller than exercise name
    color: colors.muted,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    padding: 20,
  },
});

