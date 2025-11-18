/**
 * Training Date Utilities
 * Functions to determine if training days are editable based on scheduled dates
 * and to determine week unlocking status
 */

import { DailyTraining, WeeklySchedule, TrainingPlan } from '../types/training';

/**
 * Parse a date string (ISO format like "2025-01-27") as a local date
 * This avoids timezone issues when comparing dates
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone, or undefined if input is null/undefined
 */
export function parseLocalDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  
  // Parse YYYY-MM-DD format as local date (not UTC)
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  // Fallback to standard parsing
  return new Date(dateString);
}

/**
 * Get today's date as a Date object with time set to midnight (local time)
 */
function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Normalize a Date to midnight (local time) for comparison
 */
function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Compare two dates ignoring time (only compare year, month, day)
 */
function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = normalizeToMidnight(date1);
  const d2 = normalizeToMidnight(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if a date is before today (past)
 */
function isPastDate(date: Date): boolean {
  const today = getTodayMidnight();
  const compareDate = normalizeToMidnight(date);
  return compareDate < today;
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = getTodayMidnight();
  const compareDate = normalizeToMidnight(date);
  return isSameDay(compareDate, today);
}

/**
 * Check if a date is after today (future)
 */
function isFutureDate(date: Date): boolean {
  const today = getTodayMidnight();
  const compareDate = normalizeToMidnight(date);
  return compareDate > today;
}

/**
 * Determine if a training day is editable
 * - Editable: scheduledDate is today
 * - Locked: scheduledDate is past or future, or scheduledDate is missing
 * 
 * @param dailyTraining - The daily training to check
 * @returns true if editable, false if locked
 */
export function isTrainingDayEditable(dailyTraining: DailyTraining | null): boolean {
  if (!dailyTraining) return false;
  
  // If no scheduledDate, fallback to legacy behavior (allow editing)
  // This handles cases where old plans don't have scheduledDate yet
  if (!dailyTraining.scheduledDate) {
    return true; // Legacy: allow editing if no date
  }
  
  // Ensure scheduledDate is a Date object
  const scheduledDate = dailyTraining.scheduledDate instanceof Date 
    ? dailyTraining.scheduledDate 
    : new Date(dailyTraining.scheduledDate);
  
  return isToday(scheduledDate);
}

/**
 * Get the date status of a training day
 * 
 * @param dailyTraining - The daily training to check
 * @returns 'past' | 'today' | 'future' | 'unknown'
 */
export function getTrainingDayStatus(
  dailyTraining: DailyTraining | null
): 'past' | 'today' | 'future' | 'unknown' {
  if (!dailyTraining || !dailyTraining.scheduledDate) {
    return 'unknown';
  }
  
  // Ensure scheduledDate is a Date object
  const scheduledDate = dailyTraining.scheduledDate instanceof Date 
    ? dailyTraining.scheduledDate 
    : new Date(dailyTraining.scheduledDate);
  
  if (isToday(scheduledDate)) {
    return 'today';
  }
  
  if (isPastDate(scheduledDate)) {
    return 'past';
  }
  
  if (isFutureDate(scheduledDate)) {
    return 'future';
  }
  
  return 'unknown';
}

/**
 * Check if a training day is locked (not editable)
 * 
 * @param dailyTraining - The daily training to check
 * @returns true if locked, false if editable
 */
export function isTrainingDayLocked(dailyTraining: DailyTraining | null): boolean {
  return !isTrainingDayEditable(dailyTraining);
}

/**
 * Get the last scheduled date of a week
 * Returns the latest scheduledDate from all daily trainings in the week
 * 
 * @param week - The weekly schedule
 * @returns Date object of the last scheduled date, or null if no scheduled dates exist
 */
export function getLastScheduledDateOfWeek(week: WeeklySchedule): Date | null {
  if (!week.dailyTrainings || week.dailyTrainings.length === 0) {
    return null;
  }

  let lastDate: Date | null = null;

  for (const daily of week.dailyTrainings) {
    if (daily.scheduledDate) {
      let scheduledDate: Date;
      if (daily.scheduledDate instanceof Date) {
        scheduledDate = daily.scheduledDate;
      } else if (typeof daily.scheduledDate === 'string') {
        const parsed = parseLocalDate(daily.scheduledDate);
        if (!parsed) continue;
        scheduledDate = parsed;
      } else {
        continue;
      }

      const normalized = normalizeToMidnight(scheduledDate);
      if (!lastDate || normalized > lastDate) {
        lastDate = normalized;
      }
    }
  }

  return lastDate;
}

/**
 * Get the first scheduled date of a week
 * Returns the earliest scheduledDate from all daily trainings in the week
 * 
 * @param week - The weekly schedule
 * @returns Date object of the first scheduled date, or null if no scheduled dates exist
 */
export function getFirstScheduledDateOfWeek(week: WeeklySchedule): Date | null {
  if (!week.dailyTrainings || week.dailyTrainings.length === 0) {
    return null;
  }

  let firstDate: Date | null = null;

  for (const daily of week.dailyTrainings) {
    if (daily.scheduledDate) {
      let scheduledDate: Date;
      if (daily.scheduledDate instanceof Date) {
        scheduledDate = daily.scheduledDate;
      } else if (typeof daily.scheduledDate === 'string') {
        const parsed = parseLocalDate(daily.scheduledDate);
        if (!parsed) continue;
        scheduledDate = parsed;
      } else {
        continue;
      }

      const normalized = normalizeToMidnight(scheduledDate);
      if (!firstDate || normalized < firstDate) {
        firstDate = normalized;
      }
    }
  }

  return firstDate;
}

/**
 * Calculate expected dates for a non-generated week based on week number
 * Uses Week 1 as baseline to calculate when the week should start/end
 * 
 * @param weekNumber - The week number to calculate dates for
 * @param trainingPlan - The training plan (to get Week 1 baseline)
 * @returns Object with firstDate and lastDate, or null if Week 1 doesn't exist or has no dates
 */
function calculateExpectedWeekDates(
  weekNumber: number,
  trainingPlan: TrainingPlan
): { firstDate: Date; lastDate: Date } | null {
  if (weekNumber <= 1) return null;

  // Find Week 1 to use as baseline
  const week1 = trainingPlan.weeklySchedules?.find(w => w.weekNumber === 1);
  if (!week1) return null;

  const week1FirstDate = getFirstScheduledDateOfWeek(week1);
  const week1LastDate = getLastScheduledDateOfWeek(week1);
  
  if (!week1FirstDate || !week1LastDate) return null;

  // Calculate days to add (each week is 7 days)
  const daysToAdd = (weekNumber - 1) * 7;
  
  const firstDate = new Date(week1FirstDate);
  firstDate.setDate(firstDate.getDate() + daysToAdd);
  
  const lastDate = new Date(week1LastDate);
  lastDate.setDate(lastDate.getDate() + daysToAdd);

  return { firstDate: normalizeToMidnight(firstDate), lastDate: normalizeToMidnight(lastDate) };
}

/**
 * Check if a week is unlocked (date > last scheduled date of previous week)
 * 
 * @param weekNumber - The week number to check
 * @param trainingPlan - The training plan
 * @returns true if week is unlocked (previous week's last date has passed AND week doesn't exist)
 */
export function isWeekUnlocked(weekNumber: number, trainingPlan: TrainingPlan): boolean {
  if (weekNumber <= 1) return true; // Week 1 is always unlocked

  // Check if week already exists
  const weekExists = trainingPlan.weeklySchedules?.some(w => w.weekNumber === weekNumber);
  if (weekExists) return false; // Already generated

  // Find previous week
  const previousWeek = trainingPlan.weeklySchedules?.find(w => w.weekNumber === weekNumber - 1);
  if (!previousWeek) {
    // If previous week doesn't exist, check if we can calculate expected dates
    const expectedDates = calculateExpectedWeekDates(weekNumber - 1, trainingPlan);
    if (!expectedDates) return false;
    
    const today = getTodayMidnight();
    return today > expectedDates.lastDate;
  }

  const previousWeekLastDate = getLastScheduledDateOfWeek(previousWeek);
  if (!previousWeekLastDate) return false;

  const today = getTodayMidnight();
  return today > previousWeekLastDate;
}

/**
 * Check if a week is in the past
 * For generated weeks: checks actual scheduled dates
 * For non-generated weeks: calculates expected dates based on Week 1 baseline
 * 
 * @param weekNumber - The week number to check
 * @param trainingPlan - The training plan
 * @returns true if week's dates have passed
 */
export function isWeekPast(weekNumber: number, trainingPlan: TrainingPlan): boolean {
  const week = trainingPlan.weeklySchedules?.find(w => w.weekNumber === weekNumber);
  
  if (week) {
    // Week exists - check actual dates
    const lastDate = getLastScheduledDateOfWeek(week);
    if (!lastDate) return false;
    
    const today = getTodayMidnight();
    return today > lastDate;
  } else {
    // Week doesn't exist - calculate expected dates
    const expectedDates = calculateExpectedWeekDates(weekNumber, trainingPlan);
    if (!expectedDates) return false;
    
    const today = getTodayMidnight();
    return today > expectedDates.lastDate;
  }
}

/**
 * Get the status of a week
 * 
 * @param weekNumber - The week number to check
 * @param trainingPlan - The training plan
 * @returns Week status: 'completed' | 'current' | 'unlocked-not-generated' | 'past-not-generated' | 'future-locked' | 'generated'
 */
export function getWeekStatus(
  weekNumber: number,
  trainingPlan: TrainingPlan
): 'completed' | 'current' | 'unlocked-not-generated' | 'past-not-generated' | 'future-locked' | 'generated' {
  const week = trainingPlan.weeklySchedules?.find(w => w.weekNumber === weekNumber);
  const currentWeek = trainingPlan.currentWeek || 1;
  const isPast = isWeekPast(weekNumber, trainingPlan);
  const isUnlocked = isWeekUnlocked(weekNumber, trainingPlan);

  if (week) {
    // Week exists (generated)
    if (weekNumber < currentWeek) {
      return 'completed';
    } else if (weekNumber === currentWeek) {
      return 'current';
    } else {
      return 'generated';
    }
  } else {
    // Week doesn't exist (not generated)
    if (isPast) {
      return 'past-not-generated';
    } else if (isUnlocked) {
      return 'unlocked-not-generated';
    } else {
      return 'future-locked';
    }
  }
}

