/**
 * Profile utility functions - extracted for testability
 */

import { PlaybookLesson } from '../types';

/**
 * Formats a profile value for display
 * Handles null, undefined, empty strings, and numeric values
 */
export function formatProfileValue(value: any, unit?: string): string {
  // Handle null, undefined, empty string, or NaN
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return 'Not set';
  }
  
  // Handle zero as valid value
  if (value === 0) {
    return unit ? `0 ${unit}` : '0';
  }
  
  // Format with unit if provided
  return unit ? `${value} ${unit}` : String(value);
}

/**
 * Validates a lesson object has required properties
 */
export function validateLesson(lesson: any): lesson is PlaybookLesson {
  if (!lesson || typeof lesson !== 'object') {
    return false;
  }
  
  // Required fields
  if (typeof lesson.id !== 'string' || lesson.id.trim() === '') {
    return false;
  }
  
  if (typeof lesson.text !== 'string' || lesson.text.trim() === '') {
    return false;
  }
  
  if (typeof lesson.confidence !== 'number' || isNaN(lesson.confidence) || lesson.confidence < 0 || lesson.confidence > 1) {
    return false;
  }
  
  // Optional but validate if present
  if (lesson.tags !== undefined && !Array.isArray(lesson.tags)) {
    return false;
  }
  
  if (lesson.positive !== undefined && typeof lesson.positive !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Validates and filters lessons array
 */
export function validateAndFilterLessons(lessons: any[]): PlaybookLesson[] {
  if (!Array.isArray(lessons)) {
    return [];
  }
  
  return lessons.filter(validateLesson);
}

/**
 * Sorts lessons by confidence (highest first)
 */
export function sortLessonsByConfidence(lessons: PlaybookLesson[]): PlaybookLesson[] {
  return [...lessons].sort((a, b) => {
    // Handle missing confidence values
    const confidenceA = typeof a.confidence === 'number' ? a.confidence : 0;
    const confidenceB = typeof b.confidence === 'number' ? b.confidence : 0;
    return confidenceB - confidenceA;
  });
}

/**
 * Calculates pagination bounds safely
 */
export function calculatePaginationBounds(
  currentPage: number,
  totalPages: number
): { page: number; isValid: boolean } {
  if (totalPages <= 0) {
    return { page: 0, isValid: false };
  }
  
  // Clamp page to valid range
  const clampedPage = Math.max(0, Math.min(currentPage, totalPages - 1));
  const isValid = clampedPage === currentPage && currentPage >= 0 && currentPage < totalPages;
  
  return { page: clampedPage, isValid };
}

/**
 * Gets lessons for current page
 */
export function getLessonsForPage(
  lessons: PlaybookLesson[],
  currentPage: number,
  lessonsPerPage: number
): PlaybookLesson[] {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return [];
  }
  
  if (lessonsPerPage <= 0) {
    return lessons;
  }
  
  const totalPages = Math.ceil(lessons.length / lessonsPerPage);
  const { page: safePage } = calculatePaginationBounds(currentPage, totalPages);
  
  const startIndex = safePage * lessonsPerPage;
  const endIndex = startIndex + lessonsPerPage;
  
  return lessons.slice(startIndex, endIndex);
}

