/**
 * Progress Summary Component - Quick stats overview
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface StatData {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ProgressSummaryProps {
  streak?: number;
  weeklyTrainings?: number;
  goalProgress?: number;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  streak = 0,
  weeklyTrainings = 0,
  goalProgress = 0,
}) => {
  const stats: StatData[] = [
    {
      title: 'Streak',
      value: streak.toString(),
      subtitle: 'days',
      color: colors.primary,
      icon: 'flame',
    },
    {
      title: 'This Week',
      value: weeklyTrainings.toString(),
      subtitle: 'trainings',
      color: colors.tertiary,
      icon: 'calendar',
    },
    {
      title: 'Goal',
      value: `${goalProgress}%`,
      subtitle: 'complete',
      color: colors.secondary,
      icon: 'flag',
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </View>
  );
};

interface StatCardProps extends StatData {}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  color,
  icon,
}) => {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: colors.text,
    opacity: 0.8,
  },
});
