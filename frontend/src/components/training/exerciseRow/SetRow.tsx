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
          <Ionicons name="remove-circle" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.repsText}>{reps}</Text>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => handleRepsChange(reps + 1)}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
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
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    gap: 12
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    width: 40
  },
  repsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  controlButton: {
    // No additional styling needed
  },
  repsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 30,
    textAlign: 'center'
  },
  weightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  weightField: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 12,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontStyle: 'italic'
  },
  kgText: {
    fontSize: 12,
    color: colors.muted
  },
});

export default SetRow;

