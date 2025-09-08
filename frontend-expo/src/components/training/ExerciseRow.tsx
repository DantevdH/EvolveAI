// Exercise Row Component - Individual exercise with sets/reps tracking
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { ExerciseRowProps } from '../../types/training';

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  onToggle,
  onSetUpdate,
  onShowDetail,
  onOneRMCalculator,
  isLocked = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);


  const handleSetUpdate = async (setIndex: number, reps: number, weight: number) => {
    await onSetUpdate(setIndex, reps, weight);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      {/* Main exercise row */}
      <View style={styles.exerciseRow}>
        {/* Completion status indicator (tappable or locked) */}
        <TouchableOpacity
          style={styles.completionButton}
          onPress={isLocked ? undefined : onToggle}
          disabled={isLocked}
        >
          <View style={[
            styles.completionCircle,
            exercise.completed && styles.completionCircleActive,
            isLocked && styles.completionCircleLocked
          ]}>
            {isLocked ? (
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
            ) : exercise.completed ? (
              <Ionicons name="checkmark" size={12} color={colors.text} />
            ) : (
              <View style={styles.completionDot} />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{exercise.exercise?.name || 'Exercise'}</Text>
          </View>
          
          <View style={styles.exerciseDetails}>
            <Text style={styles.setsText}>{exercise.sets.length} sets</Text>
            
            <TouchableOpacity
              style={[styles.expandButton, isLocked && styles.expandButtonLocked]}
              onPress={isLocked ? undefined : toggleExpanded}
              disabled={isLocked}
            >
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={isLocked ? colors.muted : colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {/* 1RM Calculator Button */}
          <TouchableOpacity
            style={[styles.calculatorButton, isLocked && styles.calculatorButtonLocked]}
            onPress={isLocked ? undefined : () => onOneRMCalculator(exercise.exercise.name)}
            disabled={isLocked}
          >
            <Ionicons name="calculator-outline" size={20} color={isLocked ? colors.muted : colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={onShowDetail}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded sets detail */}
      {isExpanded && (
        <View style={styles.setsContainer}>
          <View style={styles.setsHeader}>
            <Text style={styles.setsTitle}>Sets</Text>
            
            {/* Add/Remove set buttons */}
            <View style={styles.setControls}>
              <TouchableOpacity
                style={styles.setButton}
                onPress={() => onSetUpdate(-1, 0, 0)} // -1 indicates add set
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.setButton}
                onPress={() => onSetUpdate(-2, 0, 0)} // -2 indicates remove set
                disabled={exercise.sets.length <= 1}
              >
                <Ionicons 
                  name="remove-circle" 
                  size={20} 
                  color={exercise.sets.length <= 1 ? colors.border : colors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              setIndex={index}
              onUpdate={(reps, weight) => handleSetUpdate(index, reps, weight)}
              weight1RMPercentages={exercise.weight1RM}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Set Row Component
interface SetRowProps {
  set: any;
  setIndex: number;
  onUpdate: (reps: number, weight: number) => Promise<void>;
  weight1RMPercentages?: number[];
}

const SetRow: React.FC<SetRowProps> = ({ set, setIndex, onUpdate, weight1RMPercentages }) => {
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weight);

  // Get the weight_1rm percentage for this set as placeholder
  const weight1RMPercentage = weight1RMPercentages?.[setIndex] || 0;
  const placeholderText = weight1RMPercentage > 0 ? `${weight1RMPercentage}%` : '0';

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
  container: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  completionButton: {
    // No additional styling needed
  },
  completionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center'
  },
  completionCircleActive: {
    backgroundColor: colors.primary
  },
  completionCircleLocked: {
    backgroundColor: colors.muted + '30',
    opacity: 0.6
  },
  completionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text
  },
  exerciseInfo: {
    flex: 1,
    gap: 4
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  calculatorButton: {
    // No additional styling needed
  },
  calculatorButtonLocked: {
    opacity: 0.5
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  setsText: {
    fontSize: 12,
    color: colors.muted
  },
  expandButton: {
    // No additional styling needed
  },
  expandButtonLocked: {
    opacity: 0.5
  },
  detailButton: {
    // No additional styling needed
  },
  setsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.card + '50',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  setsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted
  },
  setControls: {
    flexDirection: 'row',
    gap: 8
  },
  setButton: {
    // No additional styling needed
  },
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
  }
});

export default ExerciseRow;
