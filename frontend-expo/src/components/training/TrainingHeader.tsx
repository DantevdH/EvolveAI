// Training Header Component - Plan title, progress, and week summary
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import ProgressRing from './ProgressRing';
import { TrainingHeaderProps } from '../../types/training';

const TrainingHeader: React.FC<TrainingHeaderProps> = ({
  workoutPlan,
  progressRing,
  currentWeek,
  completedWorkoutsThisWeek,
  totalWorkoutsThisWeek
}) => {
  if (!workoutPlan) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Workout Plan</Text>
        <Text style={styles.subtitle}>Create a workout plan to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{workoutPlan.title}</Text>
          <Text style={styles.subtitle}>{workoutPlan.description}</Text>
        </View>
        
        <View style={styles.rightContainer}>
          <View style={styles.progressContainer}>
            <ProgressRing
              progress={progressRing.progress}
              total={progressRing.total}
              completed={progressRing.completed}
              size={44}
              strokeWidth={4}
              color={progressRing.color}
            />
          </View>
          
          {/* Weight unit indicator (kg only) */}
          <View style={styles.weightUnitContainer}>
            <Ionicons name="scale-outline" size={12} color={colors.muted} />
            <Text style={styles.weightUnitText}>KG</Text>
          </View>
        </View>
      </View>
      
      {/* Week progress summary - horizontal layout */}
      <View style={styles.weekInfo}>
        <Text style={styles.weekText}>
          Week {currentWeek} of {workoutPlan.totalWeeks}
        </Text>
        <Text style={styles.workoutsText}>
          {completedWorkoutsThisWeek}/{totalWorkoutsThisWeek} workouts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 0,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  titleContainer: {
    flex: 1,
    marginRight: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    fontStyle: 'italic'
  },
  rightContainer: {
    alignItems: 'center',
    gap: 8
  },
  progressContainer: {
    alignItems: 'center'
  },
  weightUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.muted + '20',
    borderRadius: 8
  },
  weightUnitText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted
  },
  weekInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  weekText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500'
  },
  workoutsText: {
    fontSize: 14,
    color: colors.muted
  }
});

export default TrainingHeader;
