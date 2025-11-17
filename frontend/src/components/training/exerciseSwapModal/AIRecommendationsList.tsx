import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseRecommendation } from '../../../services/exerciseSwapService';

interface AIRecommendationsListProps {
  recommendations: ExerciseRecommendation[];
  loading: boolean;
  onSelectExercise: (exercise: any) => void;
}

export const AIRecommendationsList: React.FC<AIRecommendationsListProps> = ({
  recommendations,
  loading,
  onSelectExercise,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading AI recommendations...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="sparkles-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyText}>No recommendations available</Text>
        <Text style={styles.emptySubtext}>
          Try searching for exercises instead
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtext}>
          Based on your current exercise and training goals
        </Text>
      </View>
      <ScrollView style={styles.list}>
        {recommendations.map((recommendation, index) => (
          <TouchableOpacity
            key={recommendation.exercise.id}
            style={styles.card}
            onPress={() => onSelectExercise(recommendation.exercise)}
          >
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">
                  {recommendation.exercise.name}
                </Text>
                <Text style={styles.exerciseDetails}>
                  {recommendation.exercise.equipment} • {recommendation.exercise.difficulty}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.swapButton}
                onPress={() => onSelectExercise(recommendation.exercise)}
              >
                <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.muscleInfo}>
              <Text style={styles.muscleLabel}>Primary Muscles:</Text>
              <Text style={styles.muscleText}>
                {recommendation.exercise.main_muscles?.join(', ') || 'Not specified'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
  swapButton: {
    padding: 8,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
  },
  muscleInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  muscleLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  muscleText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});

