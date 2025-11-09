'use client';

/**
 * Exercise Number Badge Component
 * Displays the exercise number with gradient background
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { ExerciseNumberBadgeProps } from './types';

const ExerciseNumberBadge: React.FC<ExerciseNumberBadgeProps> = ({ exerciseNumber }) => {
  return (
    <View style={styles.numberBadgeContainer}>
      <LinearGradient
        colors={[
          createColorWithOpacity(colors.secondary, 0.32),
          createColorWithOpacity(colors.secondary, 0.18),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.numberBadge}
      >
        <Text style={styles.numberText}>{exerciseNumber}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  numberBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    shadowColor: createColorWithOpacity(colors.secondary, 0.25),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default ExerciseNumberBadge;

