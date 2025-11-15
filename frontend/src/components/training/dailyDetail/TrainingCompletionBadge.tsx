/**
 * Training Completion Badge Component
 * Displays training completion status with golden card styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity, goldenGradient } from '../../../constants/colors';
import { TrainingCompletionBadgeProps } from './types';

const TrainingCompletionBadge: React.FC<TrainingCompletionBadgeProps> = ({
  completed,
  onReopenTraining,
}) => {
  if (!completed) return null;

  return (
    <View style={styles.completedStatusContainer}>
      <View style={styles.completedStatusBadge}>
        <LinearGradient
          colors={[createColorWithOpacity(colors.secondary, 0.12), createColorWithOpacity(colors.secondary, 0.06)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badgeGradient}
        >
          <View style={styles.completedStatusContent}>
            <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
            <Text style={styles.statusTextComplete}>Training Complete</Text>
          </View>
          {onReopenTraining && (
            <TouchableOpacity 
              style={styles.reopenButton}
              onPress={onReopenTraining}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-open-outline" size={16} color={colors.secondary} />
              <Text style={styles.reopenButtonText}>Reopen</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  completedStatusContainer: {
    gap: 12,
    marginBottom: 8,
  },
  completedStatusBadge: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
    shadowColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.4),
    shadowColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reopenButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  statusTextComplete: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
});

export default TrainingCompletionBadge;

