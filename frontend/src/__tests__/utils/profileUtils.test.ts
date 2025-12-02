/**
 * Unit tests for profile utility functions
 */

import {
  formatProfileValue,
  validateLesson,
  validateAndFilterLessons,
  sortLessonsByConfidence,
  calculatePaginationBounds,
  getLessonsForPage,
} from '../../utils/profileUtils';
import { PlaybookLesson } from '../../types';

describe('formatProfileValue', () => {
  test('handles null values', () => {
    expect(formatProfileValue(null)).toBe('Not set');
    expect(formatProfileValue(null, 'kg')).toBe('Not set');
  });

  test('handles undefined values', () => {
    expect(formatProfileValue(undefined)).toBe('Not set');
    expect(formatProfileValue(undefined, 'cm')).toBe('Not set');
  });

  test('handles empty strings', () => {
    expect(formatProfileValue('')).toBe('Not set');
    expect(formatProfileValue('', 'kg')).toBe('Not set');
  });

  test('handles NaN values', () => {
    expect(formatProfileValue(NaN)).toBe('Not set');
    expect(formatProfileValue(NaN, 'kg')).toBe('Not set');
  });

  test('handles zero as valid value', () => {
    expect(formatProfileValue(0)).toBe('0');
    expect(formatProfileValue(0, 'kg')).toBe('0 kg');
  });

  test('formats numeric values without unit', () => {
    expect(formatProfileValue(25)).toBe('25');
    expect(formatProfileValue(70.5)).toBe('70.5');
  });

  test('formats numeric values with unit', () => {
    expect(formatProfileValue(25, 'years')).toBe('25 years');
    expect(formatProfileValue(70, 'kg')).toBe('70 kg');
    expect(formatProfileValue(175, 'cm')).toBe('175 cm');
  });

  test('formats string values', () => {
    expect(formatProfileValue('test')).toBe('test');
    expect(formatProfileValue('test', 'unit')).toBe('test unit');
  });

  test('handles edge cases', () => {
    expect(formatProfileValue(false)).toBe('false');
    expect(formatProfileValue(true)).toBe('true');
    expect(formatProfileValue([])).toBe('');
  });
});

describe('validateLesson', () => {
  const validLesson: PlaybookLesson = {
    id: 'lesson-1',
    text: 'Test lesson text',
    tags: ['tag1', 'tag2'],
    helpful_count: 5,
    harmful_count: 0,
    times_applied: 3,
    confidence: 0.85,
    positive: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  test('validates correct lesson', () => {
    expect(validateLesson(validLesson)).toBe(true);
  });

  test('rejects null or undefined', () => {
    expect(validateLesson(null)).toBe(false);
    expect(validateLesson(undefined)).toBe(false);
  });

  test('rejects non-object values', () => {
    expect(validateLesson('string')).toBe(false);
    expect(validateLesson(123)).toBe(false);
    expect(validateLesson([])).toBe(false);
  });

  test('requires id field', () => {
    expect(validateLesson({ ...validLesson, id: '' })).toBe(false);
    expect(validateLesson({ ...validLesson, id: '   ' })).toBe(false);
    expect(validateLesson({ ...validLesson, id: undefined as any })).toBe(false);
  });

  test('requires text field', () => {
    expect(validateLesson({ ...validLesson, text: '' })).toBe(false);
    expect(validateLesson({ ...validLesson, text: '   ' })).toBe(false);
    expect(validateLesson({ ...validLesson, text: undefined as any })).toBe(false);
  });

  test('requires valid confidence', () => {
    expect(validateLesson({ ...validLesson, confidence: 0.5 })).toBe(true);
    expect(validateLesson({ ...validLesson, confidence: 0 })).toBe(true);
    expect(validateLesson({ ...validLesson, confidence: 1 })).toBe(true);
    expect(validateLesson({ ...validLesson, confidence: -0.1 })).toBe(false);
    expect(validateLesson({ ...validLesson, confidence: 1.1 })).toBe(false);
    expect(validateLesson({ ...validLesson, confidence: undefined as any })).toBe(false);
    expect(validateLesson({ ...validLesson, confidence: NaN })).toBe(false);
  });

  test('validates optional tags field', () => {
    expect(validateLesson({ ...validLesson, tags: ['tag1'] })).toBe(true);
    expect(validateLesson({ ...validLesson, tags: [] })).toBe(true);
    expect(validateLesson({ ...validLesson, tags: undefined })).toBe(true);
    expect(validateLesson({ ...validLesson, tags: 'not-array' as any })).toBe(false);
  });

  test('validates optional positive field', () => {
    expect(validateLesson({ ...validLesson, positive: true })).toBe(true);
    expect(validateLesson({ ...validLesson, positive: false })).toBe(true);
    expect(validateLesson({ ...validLesson, positive: undefined })).toBe(true);
    expect(validateLesson({ ...validLesson, positive: 'not-boolean' as any })).toBe(false);
  });
});

describe('validateAndFilterLessons', () => {
  const validLesson: PlaybookLesson = {
    id: 'lesson-1',
    text: 'Valid lesson',
    tags: [],
    helpful_count: 0,
    harmful_count: 0,
    times_applied: 0,
    confidence: 0.8,
    positive: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  const invalidLesson1 = {
    id: '',
    text: 'Invalid - empty id',
    confidence: 0.5,
  };

  const invalidLesson2 = {
    id: 'lesson-2',
    text: '',
    confidence: 0.5,
  };

  const invalidLesson3 = {
    id: 'lesson-3',
    text: 'Invalid - bad confidence',
    confidence: 1.5, // Out of range
  };

  test('filters out invalid lessons', () => {
    const lessons = [validLesson, invalidLesson1, invalidLesson2, invalidLesson3];
    const result = validateAndFilterLessons(lessons);
    expect(result).toEqual([validLesson]);
  });

  test('handles empty array', () => {
    expect(validateAndFilterLessons([])).toEqual([]);
  });

  test('handles non-array input', () => {
    expect(validateAndFilterLessons(null as any)).toEqual([]);
    expect(validateAndFilterLessons(undefined as any)).toEqual([]);
    expect(validateAndFilterLessons('not-array' as any)).toEqual([]);
  });

  test('keeps all valid lessons', () => {
    const lessons = [
      { ...validLesson, id: 'lesson-1' },
      { ...validLesson, id: 'lesson-2' },
      { ...validLesson, id: 'lesson-3' },
    ];
    const result = validateAndFilterLessons(lessons);
    expect(result).toHaveLength(3);
  });
});

describe('sortLessonsByConfidence', () => {
  const createLesson = (id: string, confidence: number): PlaybookLesson => ({
    id,
    text: `Lesson ${id}`,
    tags: [],
    helpful_count: 0,
    harmful_count: 0,
    times_applied: 0,
    confidence,
    positive: true,
    created_at: '2024-01-01T00:00:00Z',
  });

  test('sorts by confidence descending', () => {
    const lessons = [
      createLesson('1', 0.3),
      createLesson('2', 0.9),
      createLesson('3', 0.5),
    ];
    const result = sortLessonsByConfidence(lessons);
    expect(result[0].confidence).toBe(0.9);
    expect(result[1].confidence).toBe(0.5);
    expect(result[2].confidence).toBe(0.3);
  });

  test('handles missing confidence values', () => {
    const lessons = [
      { ...createLesson('1', 0.5), confidence: undefined as any },
      createLesson('2', 0.8),
      { ...createLesson('3', 0.3), confidence: null as any },
    ];
    const result = sortLessonsByConfidence(lessons);
    expect(result[0].confidence).toBe(0.8);
    expect(result[1].confidence).toBeUndefined();
    expect(result[2].confidence).toBeNull();
  });

  test('does not mutate original array', () => {
    const lessons = [
      createLesson('1', 0.3),
      createLesson('2', 0.9),
    ];
    const original = [...lessons];
    sortLessonsByConfidence(lessons);
    expect(lessons).toEqual(original);
  });

  test('handles empty array', () => {
    expect(sortLessonsByConfidence([])).toEqual([]);
  });
});

describe('calculatePaginationBounds', () => {
  test('returns valid page for in-range values', () => {
    expect(calculatePaginationBounds(0, 5)).toEqual({ page: 0, isValid: true });
    expect(calculatePaginationBounds(2, 5)).toEqual({ page: 2, isValid: true });
    expect(calculatePaginationBounds(4, 5)).toEqual({ page: 4, isValid: true });
  });

  test('clamps negative pages to 0', () => {
    expect(calculatePaginationBounds(-1, 5)).toEqual({ page: 0, isValid: false });
    expect(calculatePaginationBounds(-10, 5)).toEqual({ page: 0, isValid: false });
  });

  test('clamps pages beyond total to last page', () => {
    expect(calculatePaginationBounds(5, 5)).toEqual({ page: 4, isValid: false });
    expect(calculatePaginationBounds(10, 5)).toEqual({ page: 4, isValid: false });
  });

  test('handles zero total pages', () => {
    expect(calculatePaginationBounds(0, 0)).toEqual({ page: 0, isValid: false });
    expect(calculatePaginationBounds(5, 0)).toEqual({ page: 0, isValid: false });
  });

  test('handles negative total pages', () => {
    expect(calculatePaginationBounds(0, -1)).toEqual({ page: 0, isValid: false });
  });

  test('handles single page', () => {
    expect(calculatePaginationBounds(0, 1)).toEqual({ page: 0, isValid: true });
    expect(calculatePaginationBounds(1, 1)).toEqual({ page: 0, isValid: false });
  });
});

describe('getLessonsForPage', () => {
  const createLesson = (id: string): PlaybookLesson => ({
    id,
    text: `Lesson ${id}`,
    tags: [],
    helpful_count: 0,
    harmful_count: 0,
    times_applied: 0,
    confidence: 0.5,
    positive: true,
    created_at: '2024-01-01T00:00:00Z',
  });

  const lessons = [
    createLesson('1'),
    createLesson('2'),
    createLesson('3'),
    createLesson('4'),
    createLesson('5'),
  ];

  test('returns correct page of lessons', () => {
    expect(getLessonsForPage(lessons, 0, 2)).toEqual([createLesson('1'), createLesson('2')]);
    expect(getLessonsForPage(lessons, 1, 2)).toEqual([createLesson('3'), createLesson('4')]);
    expect(getLessonsForPage(lessons, 2, 2)).toEqual([createLesson('5')]);
  });

  test('handles empty array', () => {
    expect(getLessonsForPage([], 0, 1)).toEqual([]);
  });

  test('handles invalid page numbers', () => {
    expect(getLessonsForPage(lessons, -1, 2)).toEqual([createLesson('1'), createLesson('2')]);
    expect(getLessonsForPage(lessons, 10, 2)).toEqual([createLesson('5')]);
  });

  test('handles zero or negative lessonsPerPage', () => {
    expect(getLessonsForPage(lessons, 0, 0)).toEqual(lessons);
    expect(getLessonsForPage(lessons, 0, -1)).toEqual(lessons);
  });

  test('handles single lesson per page', () => {
    expect(getLessonsForPage(lessons, 0, 1)).toEqual([createLesson('1')]);
    expect(getLessonsForPage(lessons, 2, 1)).toEqual([createLesson('3')]);
    expect(getLessonsForPage(lessons, 4, 1)).toEqual([createLesson('5')]);
  });

  test('handles last page with fewer items', () => {
    expect(getLessonsForPage(lessons, 2, 2)).toEqual([createLesson('5')]);
    expect(getLessonsForPage(lessons, 1, 3)).toEqual([createLesson('4'), createLesson('5')]);
  });

  test('handles non-array input', () => {
    expect(getLessonsForPage(null as any, 0, 1)).toEqual([]);
    expect(getLessonsForPage(undefined as any, 0, 1)).toEqual([]);
  });
});

