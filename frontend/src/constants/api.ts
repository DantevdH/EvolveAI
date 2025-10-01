/**
 * API and configuration constants
 */

// Backend API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000',
  ENDPOINTS: {
    GENERATE_WORKOUT_PLAN: '/api/trainingplan/generate/',
    USER_PROFILE: '/api/user/profile/',
    COACHES: '/api/coaches/',
  },
  TIMEOUT: 30000, // 30 seconds
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  USERNAME: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 20,
  },
  AGE: {
    MIN: 13,
    MAX: 100,
  },
  WEIGHT: {
    MIN_KG: 20,
    MAX_KG: 300,
    MIN_LBS: 44,
    MAX_LBS: 660,
  },
  HEIGHT: {
    MIN_CM: 100,
    MAX_CM: 250,
    MIN_IN: 39,
    MAX_IN: 98,
  },
  GOAL_DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  LIMITATIONS_DESCRIPTION: {
    MAX_LENGTH: 300,
  },
  FINAL_NOTES: {
    MAX_LENGTH: 1000,
  },
} as const;

// Default Values
export const DEFAULT_VALUES = {
  USER_PROFILE: {
    AGE: 25,
    WEIGHT: 70,
    WEIGHT_UNIT: 'kg',
    HEIGHT: 170,
    HEIGHT_UNIT: 'cm',
    DAYS_PER_WEEK: 3,
    MINUTES_PER_SESSION: 45,
    HAS_LIMITATIONS: false,
  },
  WORKOUT_PLAN: {
    TITLE: 'Personalized Training Plan',
    SUMMARY: '',
  },
} as const;

// UI Constants
export const UI_CONSTANTS = {
  ANIMATION: {
    ROTATION_DURATION: 2000,
    FADE_DURATION: 300,
  },
  LOADING: {
    SPINNER_SIZE: 'small' as const,
    TIMEOUT_MESSAGE: 'This might take a few moments. Feel free to close the app, we\'ll notify you when it\'s ready.',
  },
  ALERTS: {
    DEFAULT_TITLE: 'Error',
    RETRY_TEXT: 'Retry',
    CANCEL_TEXT: 'Cancel',
    OK_TEXT: 'OK',
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: {
    CONNECTION_FAILED: 'Network request failed. Please check your connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    GENERIC: 'An unexpected network error occurred.',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_FORMAT: 'Please enter a valid value.',
    OUT_OF_RANGE: 'Value is out of acceptable range.',
  },
  PROFILE: {
    CREATION_FAILED: 'Failed to create your profile. Please try again.',
    NOT_FOUND: 'Your profile was not found. Please complete onboarding first.',
    UPDATE_FAILED: 'Failed to update your profile. Please try again.',
  },
  WORKOUT_PLAN: {
    GENERATION_FAILED: 'We couldn\'t create your plan. Please check your connection and try again.',
    SAVE_FAILED: 'Failed to save your training plan. Please try again.',
    NOT_FOUND: 'No training plan found.',
  },
  COACHES: {
    FETCH_FAILED: 'Failed to load coaches. Please try again.',
    NOT_FOUND: 'No coaches found for your goal.',
  },
} as const;
