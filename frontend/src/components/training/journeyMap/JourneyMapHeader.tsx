/**
 * Journey Map Header Component
 * Displays training plan header with journey statistics
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { TrainingPlan } from '../../../types/training';

interface JourneyMapHeaderProps {
  trainingPlan: TrainingPlan;
  currentWeek: number;
  completedWeeks: number;
  totalStars: number;
}

const JourneyMapHeader: React.FC<JourneyMapHeaderProps> = ({
  trainingPlan,
  currentWeek,
  completedWeeks,
  totalStars,
}) => {
  if (!trainingPlan) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Training Plan</Text>
        <Text style={styles.subtitle}>Create a training plan to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{trainingPlan.title}</Text>
          <Text style={styles.subtitle}>{trainingPlan.description}</Text>
        </View>
      </View>
      
      {/* Week progress summary - horizontal layout */}
      <View style={styles.weekInfo}>
        <Text style={styles.weekText}>
          Week {currentWeek} of {trainingPlan.totalWeeks}
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={16} color={colors.tertiary} />
            <Text style={styles.statText}>{completedWeeks} weeks</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.statText}>{totalStars} stars</Text>
          </View>
        </View>
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
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
});

export default JourneyMapHeader;

