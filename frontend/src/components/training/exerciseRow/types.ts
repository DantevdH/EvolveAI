/**
 * Exercise Row Types
 */

export interface ExerciseNumberBadgeProps {
  exerciseNumber: number;
}

export interface ExerciseCompletionStarProps {
  completed: boolean;
  isLocked: boolean;
  onToggle: () => void;
}

export interface ExerciseInfoProps {
  displayName: string;
  equipmentLabel: string;
  numSets: number;
  isEndurance: boolean;
  enduranceSession?: {
    trainingVolume?: number;
    unit?: string;
    heartRateZone?: number;
  };
  isExpanded: boolean;
  isLocked: boolean;
  onToggleExpand: () => void;
  hideExpandButton?: boolean;
  compactMode?: boolean;
}

export interface ExerciseActionsProps {
  onSwapExercise?: () => void;
  onShowDetail: () => void;
  isEndurance: boolean;
  isLocked: boolean;
}

