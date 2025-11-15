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
          createColorWithOpacity(colors.secondary, 0.4), // Increased opacity for more visible golden accent
          createColorWithOpacity(colors.secondary, 0.25), // Increased opacity
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
    borderWidth: 1.5, // Increased from 1 for more visible golden border
    borderColor: createColorWithOpacity(colors.secondary, 0.4), // Increased opacity for better visibility
    shadowColor: createColorWithOpacity(colors.secondary, 0.3), // Increased shadow color opacity
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, // Increased shadow opacity
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

