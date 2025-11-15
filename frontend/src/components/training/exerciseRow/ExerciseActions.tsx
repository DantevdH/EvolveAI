/**
 * Exercise Actions Component
 * Action buttons for exercise (swap, detail)
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseActionsProps } from './types';

const ExerciseActions: React.FC<ExerciseActionsProps> = ({
  onSwapExercise,
  onShowDetail,
  isEndurance,
  isLocked,
}) => {
  return (
    <View style={styles.actionButtons}>
      {/* Swap Exercise Button - only for strength exercises */}
      {onSwapExercise && !isEndurance && (
        <TouchableOpacity
          style={[styles.swapButton, isLocked && styles.swapButtonLocked]}
          onPress={isLocked ? undefined : onSwapExercise}
          disabled={isLocked}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={isLocked ? colors.muted : colors.primary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.detailButton}
        onPress={onShowDetail}
      >
        <Ionicons name="information-circle" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  swapButton: {
    // No additional styling needed
  },
  swapButtonLocked: {
    opacity: 0.5
  },
  detailButton: {
    // No additional styling needed
  },
});

export default ExerciseActions;

