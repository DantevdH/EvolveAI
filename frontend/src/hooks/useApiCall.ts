/**
 * useApiCall Hook
 * Wrapper for API calls with automatic error handling, retry logic, and loading states
 * Easy to use across all API/DB calls
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

export interface UseApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number; // milliseconds
  retryable?: boolean;
  showError?: boolean; // Whether to show error banner (default: true)
}

export interface UseApiCallResult<T> {
  execute: (...args: any[]) => Promise<T | null>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  retry: () => void;
  clearError: () => void;
}

/**
 * Exponential backoff retry delay calculator
 */
const getRetryDelay = (attempt: number, baseDelay: number): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
};

/**
 * Check if error is retryable (network errors, timeouts, 5xx errors)
 */
const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.statusCode;
  
  // Network errors
  if (message.includes('network') || 
      message.includes('connection') || 
      message.includes('timeout') ||
      message.includes('fetch failed')) {
    return true;
  }
  
  // Server errors (5xx)
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // Rate limiting (429) - retryable
  if (status === 429) {
    return true;
  }
  
  return false;
};

/**
 * Hook for making API calls with error handling and retry logic
 * 
 * @example
 * ```tsx
 * const { execute, loading, error, retry } = useApiCall({
 *   onSuccess: (data) => console.log('Success!', data),
 *   retryCount: 3,
 * });
 * 
 * // In your component:
 * const handleSave = async () => {
 *   const result = await execute(() => saveTrainingPlan(plan));
 *   if (result) {
 *     // Success!
 *   }
 * };
 * ```
 */
export function useApiCall<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiCallOptions = {}
): UseApiCallResult<T> {
  const {
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000,
    retryable = true,
    showError = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const lastCallRef = useRef<{ fn: (...args: any[]) => Promise<T>; args: any[] } | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setLoading(true);
      setError(null);
      
      lastCallRef.current = { fn: apiFunction, args };
      
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const result = await apiFunction(...args);
          
          setData(result);
          setLoading(false);
          onSuccess?.(result);
          
          logger.info('API call succeeded', {
            attempt: attempt + 1,
            function: apiFunction.name,
          });
          
          return result;
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
          
          const shouldRetry = 
            retryable && 
            attempt < retryCount && 
            isRetryableError(err);
          
          if (shouldRetry) {
            const delay = getRetryDelay(attempt, retryDelay);
            
            logger.warn(`API call failed, retrying... (attempt ${attempt + 1}/${retryCount})`, {
              error: lastError.message,
              delay,
              function: apiFunction.name,
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // No more retries or non-retryable error
          setError(lastError);
          setLoading(false);
          onError?.(lastError);
          
          if (showError) {
            logger.error('API call failed', {
              error: lastError.message,
              attempts: attempt + 1,
              function: apiFunction.name,
            });
          }
          
          return null;
        }
      }
      
      // Should never reach here, but TypeScript needs it
      setLoading(false);
      return null;
    },
    [apiFunction, retryCount, retryDelay, retryable, onSuccess, onError, showError]
  );

  const retry = useCallback(() => {
    if (lastCallRef.current) {
      execute(...lastCallRef.current.args);
    }
  }, [execute]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    retry,
    clearError,
  };
}

