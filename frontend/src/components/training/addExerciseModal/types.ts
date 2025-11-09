import { Exercise } from '../../../types/training';
import { ExerciseSearchResult, ExerciseSearchFilters } from '../../../services/exerciseSwapService';

export interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  onAddEnduranceSession?: (sessionData: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  }) => void;
  scheduledExerciseIds?: string[];
  scheduledExerciseNames?: string[];
}

export interface EnduranceFormData {
  sportType: string;
  duration: number;
  unit: string;
  heartRateZone: number;
  name: string;
  description: string;
}

export interface FilterOptions {
  targetAreas: string[];
  equipment: string[];
  difficulties: string[];
}

export interface SearchState {
  query: string;
  filters: ExerciseSearchFilters;
  showFilters: boolean;
  results: ExerciseSearchResult[];
  loadingResults: boolean;
  filterOptions: FilterOptions;
}

