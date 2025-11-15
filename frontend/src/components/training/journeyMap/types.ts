/**
 * Type definitions for Journey Map components
 */

export interface WeekNodeData {
  weekNumber: number;
  x: number;
  y: number;
  status: 'completed' | 'current' | 'locked';
  stars: number;
  completionPercentage: number;
  focusTheme?: string; // Week's focus theme (e.g., 'Hypertrophy Volume Build')
}

export interface WeekModalData {
  weekNumber: number;
  status: 'completed' | 'current' | 'locked';
  stars: number;
  completionPercentage: number;
  completedWorkouts: number;
  totalWorkouts: number;
}

export interface WeekStats {
  totalWorkouts: number;
  completedWorkouts: number;
  completionPercentage: number;
  stars: number;
}

