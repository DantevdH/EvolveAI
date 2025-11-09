/**
 * Add Exercise Button Component
 * Circular add button for adding exercises
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { AddExerciseButtonProps } from './types';

const AddExerciseButton: React.FC<AddExerciseButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.addControls}>
      <TouchableOpacity style={styles.addButton} onPress={onPress}>
        <Ionicons name="add" size={12} color="white" />
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default AddExerciseButton;

