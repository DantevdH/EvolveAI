/**
 * Type definitions for Journey Map components
 */

export interface WeekNodeData {
  weekNumber: number;
  x: number;
  y: number;
  status: 'completed' | 'current' | 'locked'; // Visual status for display
  stars: number;
  completionPercentage: number;
  focusTheme?: string; // Week's focus theme (e.g., 'Hypertrophy Volume Build')
  primaryGoal?: string; // Week's primary goal
  progressionLever?: string; // Week's progression lever
  isClickable?: boolean; // Whether the week node should be clickable (based on actual week status)
}

export interface WeekModalData {
  weekNumber: number;
  status: 'completed' | 'current' | 'locked' | 'unlocked-not-generated' | 'past-not-generated' | 'future-locked' | 'generated';
  stars: number;
  completionPercentage: number;
  completedWorkouts: number;
  totalWorkouts: number;
  focusTheme?: string; // Week's focus theme
  primaryGoal?: string; // Week's primary goal
  progressionLever?: string; // Week's progression lever
  isUnlocked?: boolean; // Whether the week is unlocked (date > previous week's last date)
  isGenerated?: boolean; // Whether the week exists in weeklySchedules
  isPastWeek?: boolean; // Whether the week's dates have passed
}

export interface WeekStats {
  totalWorkouts: number;
  completedWorkouts: number;
  completionPercentage: number;
  stars: number;
}

