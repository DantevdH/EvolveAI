import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: colors.muted,
  },
});

