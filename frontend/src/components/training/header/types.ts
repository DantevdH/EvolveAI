/**
 * Training Header Types
 */

import { TrainingHeaderProps, DayIndicator } from '../../../types/training';

export interface TrainingHeaderComponentProps extends TrainingHeaderProps {
  dayIndicators: DayIndicator[];
  onDaySelect: (dayIndex: number) => void;
  currentWeek: number;
}

export interface ProgressSectionProps {
  progressRing?: {
    progress: number;
    total: number;
    completed: number;
    color: string;
  };
  currentWeek: number;
}

export interface WeekdayPathProps {
  dayIndicators: DayIndicator[];
  onDaySelect: (dayIndex: number) => void;
}

export interface WeekdayButtonProps {
  day: DayIndicator;
  index: number;
  onPress: () => void;
}

