/**
 * Set Row Component
 * Individual set row with reps and weight controls
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface SetRowProps {
  set: any;
  setIndex: number;
  onUpdate: (reps: number, weight: number) => Promise<void>;
}

const SetRow: React.FC<SetRowProps> = ({ set, setIndex, onUpdate }) => {
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weight);

  const placeholderText = '0';

  const handleRepsChange = (newReps: number) => {
    setReps(newReps);
    onUpdate(newReps, weight);
  };

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    onUpdate(reps, newWeight);
  };

  return (
    <View style={styles.setRow}>
      <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
      
      {/* Reps controls */}
      <View style={styles.repsControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => reps > 1 && handleRepsChange(reps - 1)}
        >
          <Ionicons name="remove-circle" size={20} color={colors.secondary} />
        </TouchableOpacity>
        
        <Text style={styles.repsText}>{reps}</Text>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => handleRepsChange(reps + 1)}
        >
          <Ionicons name="add-circle" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>
      
      {/* Weight input */}
      <View style={styles.weightInput}>
        <TextInput
          style={styles.weightField}
          value={weight?.toString() || ''}
          onChangeText={(text) => {
            const num = parseFloat(text) || 0;
            handleWeightChange(num);
          }}
          keyboardType="decimal-pad"
          placeholder={placeholderText}
          placeholderTextColor={colors.inputPlaceholder}
        />
        <Text style={styles.kgText}>kg</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8, // Reduced from 12
    backgroundColor: colors.background,
    borderRadius: 8,
    gap: 6, // Reduced from 12
    flexWrap: 'nowrap',
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    width: 45, // Optimized width
    flexShrink: 0,
  },
  repsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Reduced from 8
    flexShrink: 0,
  },
  controlButton: {
    // No additional styling needed
  },
  repsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 28, // Reduced from 30
    textAlign: 'center',
    flexShrink: 0,
  },
  weightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto', // Push to right side
    flexShrink: 0, // Don't shrink, just push to right
  },
  weightField: {
    width: 60, // Further reduced from 70
    height: 36,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingHorizontal: 4, // Further reduced
    textAlign: 'center',
    fontSize: 12,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontStyle: 'italic',
    flexShrink: 0,
  },
  kgText: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 0,
    paddingLeft: 0,
    marginLeft: 0,
  },
});

export default SetRow;

