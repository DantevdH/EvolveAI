/**
 * Utility function for API calls with timeout and retry logic
 * Can be used outside of React components (e.g., in callbacks, services)
 * 
 * Note: This is similar to useApiCall hook but:
 * - Can be used outside React components (no hooks)
 * - Includes timeout handling (useApiCall doesn't have timeout)
 * - Returns the result directly (not wrapped in state)
 */

import { isRetryableError, getApiErrorMessage } from './apiErrorHandler';
import { logger } from './logger';
import { PROFILE_LOADING_CONFIG } from '../constants/api';

export interface ApiCallWithRetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  context?: string; // For logging
}

/**
 * Exponential backoff retry delay calculator
 */
function getRetryDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

/**
 * Execute an API call with timeout and automatic retry logic
 * 
 * @param apiCall - The API function to call
 * @param options - Configuration options
 * @returns Promise with the API response or throws error
 */
export async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  options: ApiCallWithRetryOptions = {}
): Promise<T> {
  const {
    timeoutMs = PROFILE_LOADING_CONFIG.TIMEOUT_MS,
    maxRetries = PROFILE_LOADING_CONFIG.MAX_RETRIES,
    retryDelayMs = PROFILE_LOADING_CONFIG.RETRY_DELAY_MS,
    context = 'API call',
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise if timeout is specified
      if (timeoutMs > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        });

        // Race between API call and timeout
        const response = await Promise.race([apiCall(), timeoutPromise]);
        return response;
      } else {
        // No timeout, just call the API
        return await apiCall();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const shouldRetry = attempt < maxRetries && isRetryableError(error);

      if (shouldRetry) {
        const delay = getRetryDelay(attempt, retryDelayMs);
        
        logger.warn(`${context} failed, retrying... (attempt ${attempt + 1}/${maxRetries})`, {
          error: lastError.message,
          delay,
        });

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // No more retries or non-retryable error
      logger.error(`${context} failed after ${attempt + 1} attempts`, {
        error: lastError.message,
        attempts: attempt + 1,
      });
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error(`${context} failed after retries`);
}

/**
 * Generate user-friendly error message for profile loading
 */
export function getProfileLoadingErrorMessage(error: any): string {
  if (!error) {
    return 'Unable to load profile. Please try again later.';
  }

  const errorMessage = getApiErrorMessage(error);
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Customize messages for profile loading context
  if (errorMsg.includes('timeout')) {
    return 'Connection is slow. Profile will load when connection improves.';
  }

  if (errorMsg.includes('network') || errorMsg.includes('fetch failed') || errorMsg.includes('connection')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
    return 'Session expired. Please sign in again.';
  }

  return errorMessage || 'Unable to load profile. Please try again later.';
}

