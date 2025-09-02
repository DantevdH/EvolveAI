export * from './theme';

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:8000' // Development backend URL
    : 'https://api.evolveai.com', // Production backend URL
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_PROFILE: 'user_profile',
  WORKOUT_HISTORY: 'workout_history',
  APP_SETTINGS: 'app_settings',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'EvolveAI',
  VERSION: '1.0.0',
  ENVIRONMENT: __DEV__ ? 'development' : 'production',
  ENABLE_LOGGING: __DEV__,
} as const;

// Workout Constants
export const WORKOUT_CONFIG = {
  MIN_WORKOUT_DURATION: 10, // minutes
  MAX_WORKOUT_DURATION: 120, // minutes
  DEFAULT_REST_TIME: 60, // seconds
  DIFFICULTY_LEVELS: ['easy', 'medium', 'hard'] as const,
  FITNESS_LEVELS: ['beginner', 'intermediate', 'advanced'] as const,
} as const;

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Screen Dimensions Helper
export const SCREEN_CONFIG = {
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 80,
  SAFE_AREA_PADDING: 20,
} as const;
