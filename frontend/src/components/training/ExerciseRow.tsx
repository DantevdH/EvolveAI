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
  onSwapExercise,
  onRemoveExercise,
  isLocked = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  


  const handleSetUpdate = async (setIndex: number, reps: number, weight: number) => {
    try {
      await onSetUpdate(setIndex, reps, weight);
    } catch (error) {
      console.error('Error updating set:', error);
    }
  };

  const handleAddSet = async () => {
    try {
      await onSetUpdate(-1, 0, 0); // -1 indicates add set
    } catch (error) {
      console.error('Error adding set:', error);
    }
  };

  const handleRemoveSet = async () => {
    try {
      await onSetUpdate(-2, 0, 0); // -2 indicates remove set
    } catch (error) {
      console.error('Error removing set:', error);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Display helpers
  const isEndurance = !!exercise.exerciseId?.startsWith('endurance_');
  const displayName = isEndurance
    ? (exercise.enduranceSession?.name || (exercise as any)?.name || 'Endurance Session')
    : (exercise.exercise?.name || 'Exercise');
  const equipmentLabel = exercise.exercise?.equipment || (exercise as any).equipment || 'Bodyweight';
  const numSets = (exercise.sets || []).length;

  return (
    <View style={styles.container}>
      {/* Remove Button - Top Right */}
      {onRemoveExercise && !isLocked && (
        <TouchableOpacity
          style={styles.removeButtonTopRight}
          onPress={onRemoveExercise}
        >
          <Ionicons name="close" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
      
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
            <Text style={styles.exerciseName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          
          <View style={styles.exerciseDetails}>
            {exercise.exerciseId?.startsWith('endurance_') ? (
              <Text style={styles.setsText}>
                {exercise.enduranceSession?.trainingVolume || 'N/A'} {exercise.enduranceSession?.unit || ''} • zone {exercise.enduranceSession?.heartRateZone || 'N/A'}
              </Text>
            ) : (
              <Text style={styles.setsText}>
                {equipmentLabel} • {numSets} {numSets === 1 ? 'set' : 'sets'}
              </Text>
            )}
            
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
          {/* Swap Exercise Button - only for strength exercises */}
          {onSwapExercise && !exercise.exerciseId?.startsWith('endurance_') && (
            <TouchableOpacity
              style={[styles.swapButton, isLocked && styles.swapButtonLocked]}
              onPress={isLocked ? undefined : onSwapExercise}
              disabled={isLocked}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color={isLocked ? colors.muted : colors.primary} />
            </TouchableOpacity>
          )}

          {/* 1RM Calculator Button - only for strength exercises */}
          {/* COMMENTED OUT - 1RM calculator */}
          {/*
          {!exercise.exerciseId?.startsWith('endurance_') && (
            <TouchableOpacity
              style={[styles.calculatorButton, isLocked && styles.calculatorButtonLocked]}
              onPress={isLocked ? undefined : () => onOneRMCalculator(exercise.exercise?.name || '')}
              disabled={isLocked}
            >
              <Ionicons name="calculator-outline" size={20} color={isLocked ? colors.muted : colors.primary} />
            </TouchableOpacity>
          )}
          */}

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              onShowDetail();
            }}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded detail - strength exercises show sets, endurance shows details */}
      {isExpanded && (
        <View style={styles.setsContainer}>
          {exercise.exerciseId?.startsWith('endurance_') ? (
            // Endurance session details
            <View style={styles.enduranceContainer}>
              <View style={styles.enduranceDetails}>
                {/* Type */}
                <View style={styles.enduranceDetailItemVertical}>
                  <Text style={styles.enduranceDetailLabelSmall}>TYPE</Text>
                  <Text style={styles.enduranceDetailValueSmall}>
                    {exercise.enduranceSession?.sportType || 'N/A'}
                  </Text>
                </View>
                
                {/* Volume */}
                <View style={styles.enduranceDetailItemVertical}>
                  <Text style={styles.enduranceDetailLabelSmall}>VOLUME</Text>
                  <Text style={styles.enduranceDetailValueSmall}>
                    {exercise.enduranceSession?.trainingVolume || 'N/A'} {exercise.enduranceSession?.unit || ''}
                  </Text>
                </View>
                
                {/* Heart Zone */}
                <View style={styles.enduranceDetailItemVertical}>
                  <Text style={styles.enduranceDetailLabelSmall}>HEART ZONE</Text>
                  <Text style={styles.enduranceDetailValueSmall}>
                    Zone {exercise.enduranceSession?.heartRateZone || 'N/A'}
                  </Text>
                </View>
              </View>
              
              {/* Intensity UI removed per request */}
            </View>
          ) : (
            // Strength exercise sets
            <>
              <View style={styles.setsHeader}>
                <Text style={styles.setsTitle}>Sets</Text>
                
                {/* Add/Remove set buttons */}
                <View style={styles.setControls}>
                  <TouchableOpacity
                    style={styles.setButton}
                    onPress={handleAddSet}
                  >
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.setButton}
                    onPress={handleRemoveSet}
                    disabled={(exercise.sets?.length || 0) <= 1}
                  >
                    <Ionicons 
                      name="remove-circle" 
                      size={20} 
                      color={(exercise.sets?.length || 0) <= 1 ? colors.border : colors.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {(exercise.sets || []).map((set, index) => (
                <SetRow
                  key={set.id}
                  set={set}
                  setIndex={index}
                  onUpdate={(reps, weight) => handleSetUpdate(index, reps, weight)}
                  weight1RMPercentages={undefined}
                  // allSets={exercise.sets || []} // COMMENTED OUT - 1RM calculator
                />
              ))}
            </>
          )}
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
  // allSets?: any[]; // All sets to estimate 1RM from - COMMENTED OUT
}

const SetRow: React.FC<SetRowProps> = ({ set, setIndex, onUpdate, weight1RMPercentages }) => {
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weight);

  // Get the weight_1rm percentage for this set to calculate advised weight
  // If setIndex exceeds array length, use the last value (or cycle through)
  const getWeight1RMPercentage = () => {
    if (!weight1RMPercentages || weight1RMPercentages.length === 0) return 0;
    
    // If index is within array bounds, use that value
    if (setIndex < weight1RMPercentages.length) {
      return weight1RMPercentages[setIndex];
    }
    
    // Otherwise, use the last value in the array (fallback)
    return weight1RMPercentages[weight1RMPercentages.length - 1];
  };
  
  const weight1RMPercentage = getWeight1RMPercentage();
  
  // Calculate advised weight based on weight_1rm percentage
  // Estimate 1RM from other sets with weight > 0
  // COMMENTED OUT - 1RM calculator
  /*
  const calculateAdvisedWeight = () => {
    if (!allSets || allSets.length === 0 || weight1RMPercentage === 0) return null;
    
    // Find sets with weight > 0 to estimate 1RM (excluding current set)
    const setsWithWeight = allSets.filter((s, idx) => 
      s.weight > 0 && s.reps > 0 && idx !== setIndex
    );
    
    if (setsWithWeight.length === 0) return null;
    
    // Use the set with highest weight for better 1RM estimate
    const maxWeightSet = setsWithWeight.reduce((max, s) => 
      s.weight > max.weight ? s : max
    );
    
    // Calculate 1RM using Epley formula: 1RM = weight * (1 + reps/30)
    let estimated1RM: number;
    if (maxWeightSet.reps === 1) {
      estimated1RM = maxWeightSet.weight;
    } else {
      estimated1RM = maxWeightSet.weight * (1 + maxWeightSet.reps / 30);
    }
    
    // Calculate advised weight: (estimated1RM * percentage) / 100
    const advisedWeight = Math.round((estimated1RM * weight1RMPercentage) / 100);
    
    return {
      estimated1RM: Math.round(estimated1RM),
      advisedWeight,
      percentage: weight1RMPercentage
    };
  };
  
  const advisedWeightData = calculateAdvisedWeight();
  
  // Log the calculation
  if (advisedWeightData) {
    console.log(`[SetRow] setIndex=${setIndex}, weight1RMPercentage=${advisedWeightData.percentage}%, estimated1RM=${advisedWeightData.estimated1RM}kg, advisedWeight=${advisedWeightData.advisedWeight}kg`);
  } else if (weight1RMPercentage > 0) {
    console.log(`[SetRow] setIndex=${setIndex}, weight1RMPercentage=${weight1RMPercentage}%, no 1RM estimate available (need completed sets with weight)`);
  }
  */
  
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
    position: 'relative',
  },
  removeButtonTopRight: {
    position: 'absolute',
    top: -12, // Half outside to sit on border
    right: -12, // Half outside to sit on border
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    gap: 4,
    padding: 4
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    minHeight: 32
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 100,
    maxWidth: '100%'
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  swapButton: {
    // No additional styling needed
  },
  swapButtonLocked: {
    opacity: 0.5
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
    fontSize: 11,
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
  },
  // Endurance session styles
  enduranceContainer: {
    paddingVertical: 8,
    gap: 16
  },
  enduranceDetails: {
    gap: 8
  },
  enduranceDetailItem: {
    alignItems: 'center',
    gap: 4
  },
  enduranceDetailItemVertical: {
    gap: 4
  },
  enduranceDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    textTransform: 'uppercase'
  },
  enduranceDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  enduranceDetailLabelSmall: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.muted,
    textTransform: 'uppercase'
  },
  enduranceDetailValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  }
});

export default ExerciseRow;
