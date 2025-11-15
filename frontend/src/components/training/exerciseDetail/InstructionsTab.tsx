import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { Exercise } from '../../../types/training';

interface InstructionsTabProps {
  exercise: Exercise;
}

export const InstructionsTab: React.FC<InstructionsTabProps> = ({ exercise }) => {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
        </View>

        {/* Preparation Section */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionSectionTitle}>Preparation</Text>
          <View style={styles.instructionsList}>
            {exercise.preparation ? (
              <Text style={styles.instructionStep}>{exercise.preparation}</Text>
            ) : (
              <Text style={styles.instructionStep}>No preparation instructions available for this exercise.</Text>
            )}
          </View>
        </View>

        {/* Execution Section */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionSectionTitle}>Execution</Text>
          <View style={styles.instructionsList}>
            {exercise.execution ? (
              <Text style={styles.instructionStep}>{exercise.execution}</Text>
            ) : (
              <Text style={styles.instructionStep}>No execution instructions available for this exercise.</Text>
            )}
          </View>
        </View>

        {/* Tips Section */}
        {exercise.tips && (
          <View style={styles.instructionSection}>
            <Text style={styles.instructionSectionTitle}>Tips</Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionStep}>{exercise.tips}</Text>
            </View>
          </View>
        )}
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
  instructionSection: {
    marginBottom: 16,
  },
  instructionSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  instructionsList: {
    gap: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

