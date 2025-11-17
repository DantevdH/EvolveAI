/**
 * Training Date Utilities
 * Functions to determine if training days are editable based on scheduled dates
 */

import { DailyTraining } from '../types/training';

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

