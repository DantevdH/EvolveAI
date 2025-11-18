/**
 * Set Row Component
 * Individual set row with reps and weight controls
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { logger } from '../../../utils/logger';
import { validateReps, validateWeight, TRAINING_VALIDATION_CONSTANTS } from '../../../utils/validation';

interface SetRowProps {
  set: any;
  setIndex: number;
  onUpdate: (reps: number, weight: number) => Promise<void>;
  isLocked?: boolean;
}

const { MIN_REPS, MAX_REPS } = TRAINING_VALIDATION_CONSTANTS;

const SetRow: React.FC<SetRowProps> = ({ set, setIndex, onUpdate, isLocked = false }) => {
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weight);

  const placeholderText = '0';

  const handleRepsChange = (newReps: number) => {
    const validationResult = validateReps(newReps, reps);
    
    // Log warning if validation failed and replacement was used
    if (!validationResult.isValid && validationResult.replacement !== undefined) {
      logger.warn(validationResult.errorMessage || 'Invalid reps value', {
        setIndex,
        invalidValue: newReps,
        replacement: validationResult.replacement,
        previousValue: reps
      });
    }
    
    setReps(validationResult.value);
    onUpdate(validationResult.value, weight);
  };

  const handleWeightChange = (newWeight: number) => {
    const validationResult = validateWeight(newWeight, weight);
    
    // Log warning if validation failed and replacement was used
    if (!validationResult.isValid && validationResult.replacement !== undefined) {
      logger.warn(validationResult.errorMessage || 'Invalid weight value', {
        setIndex,
        invalidValue: newWeight,
        replacement: validationResult.replacement,
        previousValue: weight
      });
    }
    
    setWeight(validationResult.value);
    onUpdate(reps, validationResult.value);
  };

  return (
    <View style={styles.setRow}>
      <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
      
      {/* Reps controls */}
      <View style={styles.repsControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (!isLocked) {
              const newReps = reps - 1;
              if (newReps >= MIN_REPS) {
                handleRepsChange(newReps);
              }
            }
          }}
          disabled={isLocked}
        >
          <Ionicons 
            name="remove-circle" 
            size={20} 
            color={isLocked ? colors.muted : colors.secondary} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.repsText, isLocked && styles.lockedText]}>{reps}</Text>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (!isLocked) {
              const newReps = reps + 1;
              if (newReps <= MAX_REPS) {
                handleRepsChange(newReps);
              }
            }
          }}
          disabled={isLocked}
        >
          <Ionicons 
            name="add-circle" 
            size={20} 
            color={isLocked ? colors.muted : colors.secondary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Weight input */}
      <View style={styles.weightInput}>
        <TextInput
          style={[styles.weightField, isLocked && styles.lockedInput]}
          value={weight?.toString() || ''}
          onChangeText={(text) => {
            if (!isLocked) {
              const num = parseFloat(text);
              if (!isNaN(num)) {
                handleWeightChange(num);
              } else if (text === '' || text === '.') {
                // Allow empty input for better UX
                setWeight(0);
              }
            }
          }}
          keyboardType="decimal-pad"
          placeholder={placeholderText}
          placeholderTextColor={colors.inputPlaceholder}
          editable={!isLocked}
        />
        <Text style={[styles.kgText, isLocked && styles.lockedText]}>kg</Text>
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
  lockedText: {
    opacity: 0.5,
  },
  lockedInput: {
    backgroundColor: colors.background,
    opacity: 0.6,
  },
});

export default SetRow;

