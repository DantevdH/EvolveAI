/**
 * Daily Training Detail Types
 */

export interface DayHeaderProps {
  dayOfWeek: string;
  isTodaysWorkout: boolean;
  isPastWeek: boolean;
  isRestDay: boolean;
}

export interface TrainingCompletionBadgeProps {
  completed: boolean;
  onReopenTraining?: () => void;
}

export interface AddExerciseButtonProps {
  onPress: () => void;
}

