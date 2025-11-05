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
          createColorWithOpacity(colors.primary, 0.8),
          createColorWithOpacity(colors.secondary, 0.8)
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.3),
  },
  numberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
});

export default ExerciseNumberBadge;

