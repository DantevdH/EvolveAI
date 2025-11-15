import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { Exercise } from '../../../types/training';

interface GeneralInfoTabProps {
  exercise: Exercise;
  difficultyColor: (difficulty: string) => string;
}

export const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({
  exercise,
  difficultyColor
}) => {
  return (
    <View style={styles.container}>
      {/* Exercise Details Section */}
      <View style={styles.section}>
        {/* Target Area and Difficulty */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Target Area</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{exercise.target_area || 'Full Body'}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Difficulty</Text>
            <View style={[styles.tag, { backgroundColor: difficultyColor(exercise.difficulty || 'Intermediate') + '20' }]}>
              <Text style={[styles.tagText, { color: difficultyColor(exercise.difficulty || 'Intermediate') }]}>
                {exercise.difficulty || 'Intermediate'}
              </Text>
            </View>
          </View>
        </View>

        {/* Equipment and Tier */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Equipment</Text>
            <Text style={styles.detailValue}>{exercise.equipment || 'Bodyweight'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Exercise Level</Text>
            <Text style={styles.detailValue}>
              {exercise.exercise_tier ? exercise.exercise_tier.charAt(0).toUpperCase() + exercise.exercise_tier.slice(1) : 'Standard'}
            </Text>
          </View>
        </View>
      </View>

      {/* Muscles Worked */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="fitness" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Muscles Worked</Text>
        </View>

        {/* Primary Muscles */}
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupTitle}>Primary Muscles</Text>
          <View style={styles.muscleTags}>
            {exercise.main_muscles && exercise.main_muscles.length > 0 ? (
              exercise.main_muscles.map((muscle, index) => (
                <View key={index} style={styles.primaryMuscleTag}>
                  <Text style={styles.primaryMuscleText}>{muscle}</Text>
                </View>
              ))
            ) : (
              <View style={styles.primaryMuscleTag}>
                <Text style={styles.primaryMuscleText}>Full Body</Text>
              </View>
            )}
          </View>
        </View>

        {/* Secondary Muscles */}
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupTitle}>Secondary Muscles</Text>
          <View style={styles.secondaryMuscleTags}>
            {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 ? (
              exercise.secondary_muscles.map((muscle, index) => (
                <View key={index} style={styles.secondaryMuscleTag}>
                  <Text style={styles.secondaryMuscleText}>{muscle}</Text>
                </View>
              ))
            ) : (
              <View style={styles.secondaryMuscleTag}>
                <Text style={styles.secondaryMuscleText}>Core Stabilizers</Text>
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  tag: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
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
  muscleGroup: {
    marginBottom: 16,
  },
  muscleGroupTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 8,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryMuscleTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  primaryMuscleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  secondaryMuscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryMuscleTag: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  secondaryMuscleText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '400',
  },
});

