/**
 * Add Exercise Button Component
 * Circular add button for adding exercises
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity, goldenGradient } from '../../../constants/colors';
import { AddExerciseButtonProps } from './types';

const AddExerciseButton: React.FC<AddExerciseButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.addControls}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <LinearGradient
          colors={goldenGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addControls: {
    marginTop: 16,
    alignItems: 'center',
  },
  addButton: {
    alignSelf: 'center',
    width: 32, // Increased from 28 for better visibility
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.4), // Golden border accent
    shadowColor: createColorWithOpacity(colors.secondary, 0.3), // Golden shadow
    shadowOffset: {
      width: 0,
      height: 3, // Increased for better elevation
    },
    shadowOpacity: 0.3, // Increased shadow opacity
    shadowRadius: 5, // Increased for softer shadow
    elevation: 5,
  },
});

export default AddExerciseButton;

