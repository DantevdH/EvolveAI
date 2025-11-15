import { Exercise } from '../../../types/training';

export interface ExerciseDetailViewProps {
  exercise: Exercise | null;
  isVisible: boolean;
  onClose: () => void;
}

export enum ExerciseTab {
  General = 'General Info',
  Instructions = 'Instructions',
  History = 'History'
}

export interface HistoryData {
  volumeData: Array<{ date: string; volume: number }>;
  recentTrainings: Array<{ 
    date: string; 
    volume: number; 
    maxWeight: number;
    sets: number;
    reps: number[];
    weights: number[];
  }>;
  maxWeight: number;
  maxVolume: number;
}

