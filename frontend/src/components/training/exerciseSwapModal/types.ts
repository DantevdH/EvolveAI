import { Exercise } from '../../../types/training';
import { ExerciseSearchFilters } from '../../../services/exerciseSwapService';

export interface ExerciseSwapModalProps {
  visible: boolean;
  currentExercise: Exercise;
  onClose: () => void;
  onSwapExercise: (newExercise: Exercise) => void;
  scheduledExerciseIds?: string[];
  scheduledExerciseNames?: string[];
}

export interface FilterOptions {
  targetAreas: string[];
  equipment: string[];
  difficulties: string[];
}

