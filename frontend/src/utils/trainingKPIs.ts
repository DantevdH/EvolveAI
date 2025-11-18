/**
 * Training KPI Calculation Utilities
 * Extracted from TrainingScreen for better testability
 * Uses scheduledDate for accurate date-based calculations
 */

import { TrainingPlan, WeeklySchedule, DailyTraining } from '../types/training';
import { logger } from './logger';
import { parseLocalDate } from './trainingDateUtils';

/**
 * Get today's date normalized to midnight (local time)
 * Uses ISO string to get calendar date, then parses as local date
 * This ensures consistent normalization regardless of timezone
 */
function getTodayMidnight(): Date {
  const today = new Date();
  // Get calendar date string (YYYY-MM-DD) using UTC to get the calendar date
  const dateString = today.toISOString().split('T')[0];
  // Parse as local date to ensure consistent normalization
  const normalized = parseLocalDate(dateString);
  return normalized || new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/**
 * Determine the current week number based on scheduledDate
 * Finds which week contains today's date by finding the training closest to today
 * Falls back to trainingPlan.currentWeek if scheduledDate is not available
 */
function getCurrentWeekFromDates(trainingPlan: TrainingPlan | null): number | null {
  if (!trainingPlan?.weeklySchedules) return null;
  
  const today = getTodayMidnight();
  let closestWeek: number | null = null;
  let minDaysDiff = Infinity;
  
  // Find the week with the training date closest to today
  for (const week of trainingPlan.weeklySchedules) {
    if (!week.dailyTrainings) continue;
    
      for (const daily of week.dailyTrainings) {
        if (daily.scheduledDate) {
          let scheduledDate: Date | undefined;
          
          if (daily.scheduledDate instanceof Date) {
            scheduledDate = daily.scheduledDate;
          } else if (typeof daily.scheduledDate === 'string') {
            scheduledDate = parseLocalDate(daily.scheduledDate);
          }
          
          if (scheduledDate) {
            scheduledDate.setHours(0, 0, 0, 0);
            
            // Calculate days difference (absolute value)
            const daysDiff = Math.abs((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Find the week with the training closest to today (within 7 days)
            if (daysDiff < minDaysDiff && daysDiff <= 7) {
              minDaysDiff = daysDiff;
              closestWeek = week.weekNumber;
            }
          }
        }
      }
  }
  
  // Return closest week or fallback to stored currentWeek
  return closestWeek || trainingPlan.currentWeek || null;
}

/**
 * Calculate training streak (consecutive completed days)
 * Uses scheduledDate for accurate date-based calculation
 * Falls back to day-of-week logic if scheduledDate is not available
 */
export function calculateStreak(trainingPlan: TrainingPlan | null): number {
  if (!trainingPlan?.weeklySchedules || !Array.isArray(trainingPlan.weeklySchedules)) return 0;
  
  const today = getTodayMidnight();
  
  // Collect all completed trainings with scheduledDate
  const completedTrainings: Array<{ date: Date; completed: boolean }> = [];
  let hasScheduledDates = false;
  
  // Also collect rest days to know which dates to skip
  const restDays = new Set<number>();
  
  trainingPlan.weeklySchedules.forEach(week => {
    if (!week.dailyTrainings || !Array.isArray(week.dailyTrainings)) return;
    week.dailyTrainings.forEach(daily => {
      if (daily.scheduledDate) {
        hasScheduledDates = true;
        let scheduledDate: Date | undefined;
        
        // Handle Date objects - check both instanceof and constructor name
        // because Jest's Date mocking can break instanceof checks
        const scheduledDateValue = daily.scheduledDate as any;
        const isDateObject = daily.scheduledDate instanceof Date || 
                            (scheduledDateValue && 
                             typeof scheduledDateValue === 'object' && 
                             (scheduledDateValue.constructor?.name === 'Date' || 
                              typeof scheduledDateValue.getTime === 'function'));
        
        if (isDateObject) {
          scheduledDate = scheduledDateValue as Date;
        } else if (typeof daily.scheduledDate === 'string') {
          scheduledDate = parseLocalDate(daily.scheduledDate);
        } else {
          // Fallback: try to convert to Date
          scheduledDate = new Date(scheduledDateValue);
          if (isNaN(scheduledDate.getTime())) {
            scheduledDate = undefined;
          }
        }
        
        if (scheduledDate) {
          // Normalize date to midnight local time for consistent comparison
          // Extract year, month, day from the date and create a new local date
          // This ensures consistent normalization regardless of timezone
          let normalizedDate: Date | undefined;
          
          // scheduledDate is already verified as a Date object, so we can use it directly
          // Use the same normalization method as getTodayMidnight()
          // Get calendar date string (YYYY-MM-DD) using UTC to get the calendar date
          const dateString = (scheduledDate as Date).toISOString().split('T')[0];
          // Parse as local date to ensure consistent normalization
          normalizedDate = parseLocalDate(dateString);
          // Fallback: if parseLocalDate returns undefined, use UTC date components
          if (!normalizedDate) {
            normalizedDate = new Date(
              (scheduledDate as Date).getUTCFullYear(),
              (scheduledDate as Date).getUTCMonth(),
              (scheduledDate as Date).getUTCDate()
            );
          }
          
          // normalizedDate is already at midnight local time (created with Date(year, month, day))
          // No need to call setHours
          
          if (normalizedDate) {
            const normalizedTime = normalizedDate.getTime();
            const todayTime = today.getTime();
            
            if (daily.isRestDay) {
              // Track rest days so we can skip them in streak calculation
              if (normalizedDate <= today) {
                restDays.add(normalizedDate.getTime());
              }
            } else {
              // Only count past or today's workouts (non-rest days)
              // Compare dates by their time values (midnight normalized)
              if (normalizedTime <= todayTime) {
                const exercises = daily.exercises || [];
                const isCompleted = exercises.length > 0 && exercises.every(ex => ex && ex.completed === true);
                
                completedTrainings.push({
                  date: normalizedDate,
                  completed: isCompleted
                });
              }
            }
          }
        }
      }
    });
  });
  
  // If no scheduledDate found, fallback to day-of-week logic
  if (!hasScheduledDates) {
    return calculateStreakLegacy(trainingPlan);
  }
  
  // Sort by date descending (most recent first)
  completedTrainings.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Create a map of dates to completion status for quick lookup
  const dateMap = new Map<number, boolean>();
  completedTrainings.forEach(training => {
    const dateKey = training.date.getTime();
    // If multiple trainings on same date, all must be completed
    // If we already have this date and it's incomplete, keep it incomplete
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, training.completed);
    } else if (!training.completed) {
      // If we find an incomplete training for this date, mark it as incomplete
      dateMap.set(dateKey, false);
    }
  });
  
  // Calculate consecutive days from today backwards
  let streak = 0;
  // today is already at midnight, so we can use it directly
  let currentDate = new Date(today);
  
  // Check up to 365 days back (reasonable limit)
  for (let i = 0; i < 365; i++) {
    const dateKey = currentDate.getTime();
    
    // Skip rest days - they don't break the streak
    if (restDays.has(dateKey)) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }
    
    const completionStatus = dateMap.get(dateKey);
    
    if (completionStatus === true) {
      // Workout exists and is completed - continue streak
      streak++;
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (completionStatus === false) {
      // Workout exists but is incomplete - streak broken
      break;
    } else {
      // No workout scheduled for this date
      // If we've already started a streak, a missing day breaks it
      if (streak > 0) {
        // We had a streak going, missing day breaks it
        break;
      }
      // No streak yet, continue looking backwards (might be before first workout)
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }
  
  return streak;
}

/**
 * Legacy streak calculation using day-of-week names
 * Used as fallback when scheduledDate is not available
 */
function calculateStreakLegacy(trainingPlan: TrainingPlan | null): number {
  if (!trainingPlan?.weeklySchedules || !Array.isArray(trainingPlan.weeklySchedules)) return 0;
  
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date();
  const jsDayIndex = today.getDay();
  const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1;
  const todayName = dayOrder[mondayFirstIndex];
  const todayIndex = dayOrder.indexOf(todayName);
  
  const allDailyTrainings: Array<{ weekNumber: number; dayOfWeek: string; completed: boolean }> = [];
  
  trainingPlan.weeklySchedules.forEach(week => {
    if (!week.dailyTrainings || !Array.isArray(week.dailyTrainings)) return;
    week.dailyTrainings.forEach(daily => {
      if (!daily.isRestDay) {
        const dayIndex = dayOrder.indexOf(daily.dayOfWeek);
        const isPastOrToday = dayIndex <= todayIndex;
        
        if (isPastOrToday) {
          const exercises = daily.exercises || [];
          const isCompleted = exercises.length > 0 && exercises.every(ex => ex && ex.completed === true);
          allDailyTrainings.push({
            weekNumber: week.weekNumber,
            dayOfWeek: daily.dayOfWeek,
            completed: isCompleted
          });
        }
      }
    });
  });
  
  allDailyTrainings.sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return b.weekNumber - a.weekNumber;
    }
    return dayOrder.indexOf(b.dayOfWeek) - dayOrder.indexOf(a.dayOfWeek);
  });
  
  let streak = 0;
  for (const training of allDailyTrainings) {
    if (training.completed) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate weekly trainings (total trainings that exist in current week)
 * Uses scheduledDate to determine current week, falls back to trainingPlan.currentWeek
 */
export function calculateWeeklyTrainings(trainingPlan: TrainingPlan | null): number {
  if (!trainingPlan?.weeklySchedules || !Array.isArray(trainingPlan.weeklySchedules)) return 0;
  
  // Determine current week from scheduledDate or fallback to stored currentWeek
  const currentWeekNumber = getCurrentWeekFromDates(trainingPlan) || trainingPlan.currentWeek;
  
  if (!currentWeekNumber || currentWeekNumber < 1) return 0;
  
  const currentWeek = trainingPlan.weeklySchedules.find(
    week => week.weekNumber === currentWeekNumber
  );
  
  if (!currentWeek || !currentWeek.dailyTrainings || !Array.isArray(currentWeek.dailyTrainings)) return 0;
  
  // Count all trainings that exist (not rest days) and have exercises
  return currentWeek.dailyTrainings.filter(
    training => !training.isRestDay && 
                training.exercises && 
                Array.isArray(training.exercises) &&
                training.exercises.length > 0
  ).length;
}

/**
 * Calculate completed weeks
 * Uses scheduledDate to determine current week and verifies actual completion
 * Falls back to simple week count if scheduledDate is not available
 */
export function calculateCompletedWeeks(trainingPlan: TrainingPlan | null): number {
  if (!trainingPlan?.weeklySchedules) return 0;
  
  // Determine current week from scheduledDate or fallback to stored currentWeek
  const currentWeekNumber = getCurrentWeekFromDates(trainingPlan) || trainingPlan.currentWeek;
  
  if (!currentWeekNumber || currentWeekNumber <= 1) return 0;
  
  // Edge case: currentWeek > totalWeeks
  if (trainingPlan.totalWeeks && currentWeekNumber > trainingPlan.totalWeeks) {
    return trainingPlan.totalWeeks || 0;
  }
  
  // Check if we have scheduledDate to verify completion
  const hasScheduledDates = trainingPlan.weeklySchedules.some(week =>
    week.dailyTrainings?.some(daily => daily.scheduledDate)
  );
  
  if (!hasScheduledDates) {
    // Fallback: simple count of weeks before current week
    return trainingPlan.weeklySchedules.filter(
      week => week.weekNumber < currentWeekNumber
    ).length;
  }
  
  // Verify actual completion: count only fully completed weeks
  let completedWeeks = 0;
  const processedWeeks = new Set<number>();
  
  trainingPlan.weeklySchedules.forEach(week => {
    if (week.weekNumber >= currentWeekNumber) return; // Skip current and future weeks
    
    // Check if all non-rest day trainings in this week are completed
    const weekTrainings = week.dailyTrainings?.filter(daily => !daily.isRestDay) || [];
    
    if (weekTrainings.length === 0) return;
    
    const allCompleted = weekTrainings.every(daily => {
      const exercises = daily.exercises || [];
      return exercises.length > 0 && exercises.every(ex => ex.completed === true);
    });
    
    if (allCompleted && !processedWeeks.has(week.weekNumber)) {
      processedWeeks.add(week.weekNumber);
      completedWeeks++;
    }
  });
  
  return completedWeeks;
}

/**
 * Calculate KPIs with error handling
 */
export function calculateKPIs(trainingPlan: TrainingPlan | null): {
  streak: number;
  weeklyTrainings: number;
  completedWeeks: number;
} {
  let streak = 0;
  let weeklyTrainings = 0;
  let completedWeeks = 0;

  try {
    streak = calculateStreak(trainingPlan);
  } catch (error) {
    logger.error('Error calculating streak', { error });
    streak = 0;
  }

  try {
    weeklyTrainings = calculateWeeklyTrainings(trainingPlan);
  } catch (error) {
    logger.error('Error calculating weekly trainings', { error });
    weeklyTrainings = 0;
  }

  try {
    completedWeeks = calculateCompletedWeeks(trainingPlan);
  } catch (error) {
    logger.error('Error calculating completed weeks', { error });
    completedWeeks = 0;
  }

  return { streak, weeklyTrainings, completedWeeks };
}

