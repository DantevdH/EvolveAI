/**
 * Exercise Completion Star Component
 * Star badge for marking exercise completion
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { ExerciseCompletionStarProps } from './types';

const ExerciseCompletionStar: React.FC<ExerciseCompletionStarProps> = ({
  completed,
  isLocked,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      style={styles.completionButton}
      onPress={isLocked ? undefined : onToggle}
      disabled={isLocked}
      activeOpacity={0.7}
    >
      <View style={[
        styles.completionStar,
        !completed && !isLocked && styles.completionStarIncomplete,
        completed && styles.completionStarActive,
        isLocked && styles.completionStarLocked
      ]}>
        {isLocked ? (
          <Ionicons name="lock-closed" size={12} color={colors.muted} />
        ) : completed ? (
          <Ionicons name="star" size={18} color={colors.tertiary} />
        ) : (
          <Ionicons name="star-outline" size={18} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  completionButton: {
    // No additional styling needed
  },
  completionStar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionStarIncomplete: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    borderRadius: 14,
  },
  completionStarActive: {
    backgroundColor: createColorWithOpacity(colors.tertiary, 0.2),
    borderRadius: 14,
    shadowColor: colors.tertiary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  completionStarLocked: {
    backgroundColor: createColorWithOpacity(colors.muted, 0.1),
    opacity: 0.6
  },
});

export default ExerciseCompletionStar;

