/**
 * Training Completion Badge Component
 * Displays training completion status with tertiary styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { TrainingCompletionBadgeProps } from './types';

const TrainingCompletionBadge: React.FC<TrainingCompletionBadgeProps> = ({
  completed,
  onReopenTraining,
}) => {
  if (!completed) return null;

  return (
    <View style={styles.completedStatusContainer}>
      <View style={styles.completedStatusBadge}>
        <View style={styles.completedStatusContent}>
          <Ionicons name="star" size={20} color={colors.tertiary} />
          <Text style={styles.statusTextComplete}>Training Complete</Text>
        </View>
        {onReopenTraining && (
          <TouchableOpacity 
            style={styles.reopenButton}
            onPress={onReopenTraining}
          >
            <Ionicons name="lock-open-outline" size={16} color={colors.tertiary} />
            <Text style={styles.reopenButtonText}>Reopen</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  completedStatusContainer: {
    gap: 12
  },
  completedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: createColorWithOpacity(colors.tertiary, 0.15),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.tertiary,
    shadowColor: colors.tertiary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  completedStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: createColorWithOpacity(colors.tertiary, 0.25),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  reopenButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tertiary
  },
  statusTextComplete: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.tertiary,
    letterSpacing: 0.3,
  },
});

export default TrainingCompletionBadge;

