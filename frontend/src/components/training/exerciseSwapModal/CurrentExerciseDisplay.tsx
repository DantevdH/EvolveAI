import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { Exercise } from '../../../types/training';

interface CurrentExerciseDisplayProps {
  exercise: Exercise;
}

export const CurrentExerciseDisplay: React.FC<CurrentExerciseDisplayProps> = ({ exercise }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current Exercise:</Text>
      <Text style={styles.name}>{exercise.name}</Text>
      <Text style={styles.details}>
        {exercise.equipment} • {exercise.difficulty}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowColor: createColorWithOpacity(colors.secondary, 0.1),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  details: {
    fontSize: 14,
    color: colors.muted,
  },
});

