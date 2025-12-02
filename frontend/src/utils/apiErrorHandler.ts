/**
 * API Error Handler Utilities
 * Centralized error handling for API/DB calls with user-friendly messages
 */

import { logger } from './logger';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  retryable: boolean;
}

/**
 * Extract user-friendly error message from API error
 */
export function getApiErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  // Check for structured error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Check for error message
  if (error.message) {
    // Network errors
    if (error.message.includes('Network Error') || 
        error.message.includes('fetch failed') ||
        error.message.includes('network request failed')) {
      return 'Connection problem. Please check your internet and try again.';
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Return the message if it's user-friendly
    if (error.message.length < 100) {
      return error.message;
    }
  }

  // Status code based messages
  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;
    
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again in a moment.';
      case 502:
      case 503:
        return 'Service temporarily unavailable. Please try again soon.';
      case 504:
        return 'Request timed out. Please try again.';
      default:
        return `Error ${status}. Please try again.`;
    }
  }

  // Default fallback
  return 'Something went wrong. Please try again.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  const status = error.status || error.response?.status;

  // Network errors are retryable
  if (message.includes('network') || 
      message.includes('connection') || 
      message.includes('timeout') ||
      message.includes('fetch failed')) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (status >= 500 && status < 600) {
    return true;
  }

  // Rate limiting (429) is retryable
  if (status === 429) {
    return true;
  }

  return false;
}

/**
 * Normalize error to ApiError format
 */
export function normalizeApiError(error: any): ApiError {
  const message = getApiErrorMessage(error);
  const status = error.status || error.response?.status;
  const code = error.code || error.response?.data?.code;
  const retryable = isRetryableError(error);

  return {
    message,
    status,
    code,
    retryable,
  };
}

/**
 * Log error with context
 */
export function logApiError(error: any, context: string, additionalData?: any) {
  const normalized = normalizeApiError(error);
  
  logger.error(`API error in ${context}`, {
    message: normalized.message,
    status: normalized.status,
    code: normalized.code,
    retryable: normalized.retryable,
    originalError: error,
    ...additionalData,
  });
}

