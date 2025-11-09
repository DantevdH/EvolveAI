/**
 * Exercise Row Component
 * Main orchestrator for individual exercise with sets/reps tracking (Quest-style)
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { ExerciseRowProps } from '../../../types/training';
import ExerciseNumberBadge from './ExerciseNumberBadge';
import ExerciseCompletionStar from './ExerciseCompletionStar';
import ExerciseInfo from './ExerciseInfo';
import ExerciseActions from './ExerciseActions';
import SetsHeader from './SetsHeader';
import SetRow from './SetRow';
import EnduranceDetails from './EnduranceDetails';
import RemoveButton from './RemoveButton';

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  exerciseNumber = 1,
  onToggle,
  onSetUpdate,
  onShowDetail,
  onOneRMCalculator,
  onSwapExercise,
  onRemoveExercise,
  isLocked = false,
  hideCompletionButton = false,
  hideExpandButton = false,
  hideInfoButton = false,
  compactMode = false,
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
    <View style={[styles.wrapper, compactMode && styles.wrapperCompact]}>
      <View style={[
        styles.container,
        exercise.completed && styles.containerCompleted,
        isExpanded && styles.containerExpanded
      ]}>
        {/* Main exercise row */}
        <View style={[styles.exerciseRow, compactMode && styles.exerciseRowCompact]}>
          <ExerciseNumberBadge exerciseNumber={exerciseNumber} />

          {!hideCompletionButton && (
            <ExerciseCompletionStar
              completed={exercise.completed}
              isLocked={isLocked}
              onToggle={onToggle}
            />
          )}

          <ExerciseInfo
            displayName={displayName}
            equipmentLabel={equipmentLabel}
            numSets={numSets}
            isEndurance={isEndurance}
            enduranceSession={exercise.enduranceSession}
            isExpanded={isExpanded}
            isLocked={isLocked}
            onToggleExpand={toggleExpanded}
            hideExpandButton={hideExpandButton}
            compactMode={compactMode}
          />

          {!hideInfoButton && (
            <ExerciseActions
              onSwapExercise={onSwapExercise}
              onShowDetail={onShowDetail}
              isEndurance={isEndurance}
              isLocked={isLocked}
            />
          )}
        </View>

        {/* Expanded detail - strength exercises show sets, endurance shows details */}
        {isExpanded && (
          <View style={styles.setsContainer}>
            {isEndurance ? (
              <EnduranceDetails enduranceSession={exercise.enduranceSession} />
            ) : (
              <>
                <SetsHeader
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                  canRemoveSet={(exercise.sets?.length || 0) > 1}
                />
                
                {(exercise.sets || []).map((set, index) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    setIndex={index}
                    onUpdate={(reps, weight) => handleSetUpdate(index, reps, weight)}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </View>
      
      {/* Remove Button - Top Right - Outside container to avoid overflow clipping */}
      {onRemoveExercise && !isLocked && (
        <RemoveButton onPress={onRemoveExercise} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 6,
  },
  wrapperCompact: {
    marginVertical: 2,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  containerCompleted: {
    borderColor: createColorWithOpacity(colors.primary, 0.45),
    shadowColor: createColorWithOpacity(colors.primary, 0.2),
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  containerExpanded: {
    borderColor: createColorWithOpacity(colors.primary, 0.55),
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12
  },
  exerciseRowCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6
  },
  setsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: createColorWithOpacity(colors.background, 0.92),
    borderTopWidth: 1,
    borderTopColor: createColorWithOpacity(colors.secondary, 0.2),
    gap: 8
  },
});

export default ExerciseRow;

