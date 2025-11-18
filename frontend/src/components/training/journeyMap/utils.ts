/**
 * Utility functions for Journey Map
 */

import { WeeklySchedule } from '../../../types/training';
import { WeekStats, WeekModalData } from './types';

/**
 * Calculate stars based on workout completion percentage
 * @param completionPercentage - percentage of completed workouts (0-100)
 * @returns number of stars (0-3)
 */
export const calculateStars = (completionPercentage: number): number => {
  if (completionPercentage >= 100) return 3;
  if (completionPercentage >= 80) return 2;
  if (completionPercentage >= 60) return 1;
  return 0;
};

/**
 * Calculate week statistics including completion and stars
 * @param week - weekly schedule data
 * @returns week statistics
 */
export const calculateWeekStats = (week: WeeklySchedule): WeekStats => {
  const workouts = week.dailyTrainings.filter(training => !training.isRestDay);
  const totalWorkouts = workouts.length;
  const completedWorkouts = workouts.filter(training => {
    // Check if all exercises are completed
    return training.exercises.length > 0 && training.exercises.every(ex => ex.completed);
  }).length;
  
  const completionPercentage = totalWorkouts > 0 
    ? Math.round((completedWorkouts / totalWorkouts) * 100) 
    : 0;
  
  return {
    totalWorkouts,
    completedWorkouts,
    completionPercentage,
    stars: calculateStars(completionPercentage),
  };
};

/**
 * Get the button text for a week based on its status
 * @param status - The week status
 * @param isGenerating - Whether the week is currently being generated
 * @returns The button text to display
 */
export const getWeekButtonText = (
  status: WeekModalData['status'],
  isGenerating: boolean = false
): string => {
  if (isGenerating) return 'Generating...';
  
  // Current week (generated) -> "Start Today's Training"
  if (status === 'current') {
    return "Start Today's Training";
  }
  
  // Current week but not generated -> "Generate Training"
  if (status === 'unlocked-not-generated') {
    return 'Generate Training';
  }
  
  // Future week -> "Training Locked"
  if (status === 'future-locked') {
    return 'Training Locked';
  }
  
  // Past week (generated) -> "View Past Training"
  if (status === 'completed') {
    return 'View Past Training';
  }
  
  // Past week (not generated) -> "Training Locked"
  if (status === 'past-not-generated') {
    return 'Training Locked';
  }
  
  // Future week (generated) -> "Training Locked" (shouldn't be accessible, but handle it)
  if (status === 'generated') {
    return 'Training Locked';
  }
  
  // Default fallback
  return 'Training Locked';
};

/**
 * Determine if the week button should be disabled based on button text
 * @param buttonText - The button text to check
 * @returns True if the button should be disabled (when text is "Training Locked")
 */
export const isWeekButtonDisabled = (buttonText: string): boolean => {
  return buttonText === 'Training Locked';
};

