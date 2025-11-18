/**
 * Daily Training Detail Types
 */

export interface DayHeaderProps {
  dayOfWeek: string;
  isEditable: boolean;
  dayStatus: 'past' | 'today' | 'future' | 'unknown';
  isRestDay: boolean;
  hideDayName?: boolean;
}

export interface TrainingCompletionBadgeProps {
  completed: boolean;
  onReopenTraining?: () => void;
}

export interface AddExerciseButtonProps {
  onPress: () => void;
}

