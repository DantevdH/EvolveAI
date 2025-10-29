// Exercise Row Component - Individual exercise with sets/reps tracking
import React, { useState, useEffect } from 'react';
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
  onIntensityUpdate,
  isLocked = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localIntensity, setLocalIntensity] = useState(exercise.enduranceSession?.intensity || 3);
  
  // Use local state for immediate UI updates, sync with prop changes
  const currentIntensity = localIntensity;

  // Sync local state with prop changes (only on mount or when prop actually changes)
  useEffect(() => {
    const propIntensity = exercise.enduranceSession?.intensity || 3;
    if (propIntensity !== localIntensity) {
      setLocalIntensity(propIntensity);
    }
  }, [exercise.enduranceSession?.intensity]);


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
            <View style={{ backgroundColor: 'red', padding: 10, width: '100%' }}>
              <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }}>
                HARDCODED TEXT TEST
              </Text>
              <Text style={{ fontSize: 18, color: 'yellow', fontWeight: 'bold' }}>
                {exercise.exercise?.name || 'NO NAME'}
              </Text>
            </View>
          </View>
          
          <View style={styles.exerciseDetails}>
            <Text style={styles.setsText}>
              {exercise.exerciseId?.startsWith('endurance_') ? 'Endurance' : `${exercise.sets?.length || 0} sets`}
            </Text>
            
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
          {!exercise.exerciseId?.startsWith('endurance_') && (
            <TouchableOpacity
              style={[styles.calculatorButton, isLocked && styles.calculatorButtonLocked]}
              onPress={isLocked ? undefined : () => onOneRMCalculator(exercise.exercise?.name || '')}
              disabled={isLocked}
            >
              <Ionicons name="calculator-outline" size={20} color={isLocked ? colors.muted : colors.primary} />
            </TouchableOpacity>
          )}

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

      {/* Expanded detail - strength exercises show sets, endurance shows intensity slider */}
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
                {exercise.enduranceSession?.heartRateZone && (
                  <View style={styles.enduranceDetailItemVertical}>
                    <Text style={styles.enduranceDetailLabelSmall}>HEART ZONE</Text>
                    <Text style={styles.enduranceDetailValueSmall}>
                      Zone {exercise.enduranceSession.heartRateZone}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Intensity Slider */}
              <View style={styles.setsHeader}>
                <Text style={styles.setsTitle}>Session Intensity</Text>
              </View>
              <IntensitySlider 
                exerciseId={exercise.id}
                currentIntensity={currentIntensity}
                onIntensityChange={(intensity) => {
                  setLocalIntensity(intensity); // Update local state immediately for UI
                  onIntensityUpdate?.(exercise.id, intensity); // Update parent state
                }}
                disabled={isLocked}
              />
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
                    onPress={() => onSetUpdate(-1, 0, 0)} // -1 indicates add set
                  >
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.setButton}
                    onPress={() => onSetUpdate(-2, 0, 0)} // -2 indicates remove set
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
                  weight1RMPercentages={exercise.weight1RM}
                />
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

// Intensity Slider Component for Endurance Sessions
interface IntensitySliderProps {
  exerciseId: string;
  currentIntensity: number;
  onIntensityChange: (intensity: number) => void;
  disabled?: boolean;
}

const IntensitySlider: React.FC<IntensitySliderProps> = ({
  exerciseId,
  currentIntensity,
  onIntensityChange,
  disabled = false
}) => {
  const intensityLabels = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
  
  return (
    <View style={styles.intensityContainer}>
      <View style={styles.intensitySlider}>
        {[1, 2, 3, 4, 5].map((intensity) => (
          <TouchableOpacity
            key={intensity}
            style={[
              styles.intensityButton,
              currentIntensity === intensity && styles.intensityButtonActive,
              disabled && styles.intensityButtonDisabled
            ]}
            onPress={() => {
              if (!disabled) {
                onIntensityChange(intensity);
              }
            }}
            disabled={disabled}
          >
            <Text style={[
              styles.intensityNumber,
              currentIntensity === intensity && styles.intensityNumberActive,
              disabled && styles.intensityNumberDisabled
            ]}>
              {intensity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.intensityLabel, disabled && styles.intensityLabelDisabled]}>
        {intensityLabels[currentIntensity - 1]}
      </Text>
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
    gap: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green debug background
    padding: 4
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    minHeight: 40,
    backgroundColor: 'rgba(255, 0, 255, 0.2)' // Magenta debug background
  },
  exerciseName: {
    fontSize: 24, // Increased size
    fontWeight: '700', // Bolder
    color: '#FF0000', // Bright red for debugging
    backgroundColor: '#FFFF00', // Bright yellow background for debugging
    marginRight: 8,
    padding: 8,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 100,
    maxWidth: '100%',
    textAlign: 'left',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 30
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
  },
  intensityContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6
  },
  intensitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  intensityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  intensityButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  intensityButtonDisabled: {
    opacity: 0.5
  },
  intensityNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text
  },
  intensityNumberActive: {
    color: colors.text
  },
  intensityNumberDisabled: {
    color: colors.muted
  },
  intensityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center'
  },
  intensityLabelDisabled: {
    color: colors.muted
  }
});

export default ExerciseRow;
