import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { MilestonePrediction } from './types';
import { MilestoneCard } from './MilestoneCard';

interface MilestonesListProps {
  milestones: MilestonePrediction[];
  onMilestonePress?: (milestone: MilestonePrediction) => void;
}

export const MilestonesList: React.FC<MilestonesListProps> = ({ milestones, onMilestonePress }) => {
  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flag" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Upcoming Milestones</Text>
      </View>

      <View style={styles.list}>
        {milestones.map((milestone, index) => (
          <MilestoneCard
            key={`${milestone.exercise.id}-${index}`}
            milestone={milestone}
            onPress={() => onMilestonePress?.(milestone)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  list: {
    gap: 12,
  },
});

