import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { MilestonePrediction } from './types';

interface MilestoneCardProps {
  milestone: MilestonePrediction;
  onPress?: () => void;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestone, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return colors.success;
    if (confidence >= 60) return colors.warning;
    return colors.error;
  };

  const CardContent = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {milestone.exercise.name}
          </Text>
          <Text style={styles.exerciseDetails}>
            Current: {milestone.current1RM.toFixed(1)} kg → Goal: {milestone.nextMilestone.toFixed(1)} kg
          </Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(milestone.confidence) + '20' }]}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(milestone.confidence) }]}>
            {Math.round(milestone.confidence)}%
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.predictionRow}>
          <Ionicons name="calendar" size={16} color={colors.muted} />
          <Text style={styles.predictionText}>
            Predicted: {formatDate(milestone.predictedDate)}
          </Text>
        </View>
        <View style={styles.predictionRow}>
          <Ionicons name="time" size={16} color={colors.muted} />
          <Text style={styles.predictionText}>
            {milestone.weeksToGoal} week{milestone.weeksToGoal !== 1 ? 's' : ''} to goal
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.muted,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictionText: {
    fontSize: 14,
    color: colors.text,
  },
});

