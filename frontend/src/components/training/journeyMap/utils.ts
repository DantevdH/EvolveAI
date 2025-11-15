/**
 * Utility functions for Journey Map
 */

import { WeeklySchedule } from '../../../types/training';
import { WeekStats } from './types';

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

