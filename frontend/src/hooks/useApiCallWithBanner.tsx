/**
 * useApiCallWithBanner Hook
 * Combines useApiCall with ErrorBanner for complete error handling solution
 * Perfect for TrainingScreen and other screens with API calls
 */

import React from 'react';
import { useApiCall, UseApiCallOptions } from './useApiCall';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { normalizeApiError } from '../utils/apiErrorHandler';

export interface UseApiCallWithBannerOptions extends UseApiCallOptions {
  bannerPosition?: 'top' | 'bottom';
  autoDismiss?: boolean;
  dismissAfter?: number;
}

export interface UseApiCallWithBannerResult<T> extends ReturnType<typeof useApiCall<T>> {
  ErrorBannerComponent: React.FC;
}

/**
 * Hook that combines API call handling with error banner display
 * 
 * @example
 * ```tsx
 * const { execute, loading, ErrorBannerComponent } = useApiCallWithBanner(
 *   swapExercise,
 *   { retryCount: 3 }
 * );
 * 
 * // In JSX:
 * <View>
 *   <ErrorBannerComponent />
 *   <Button onPress={() => execute(exerciseId, newExercise)} />
 * </View>
 * ```
 */
export function useApiCallWithBanner<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiCallWithBannerOptions = {}
): UseApiCallWithBannerResult<T> {
  const {
    bannerPosition = 'top',
    autoDismiss = true,
    dismissAfter = 5000,
    ...apiCallOptions
  } = options;

  const apiCall = useApiCall(apiFunction, apiCallOptions);
  const normalizedError = apiCall.error ? normalizeApiError(apiCall.error) : null;

  const ErrorBannerComponent: React.FC = () => {
    if (!normalizedError) return null;

    return (
      <ErrorBanner
        error={normalizedError.message}
        onRetry={apiCall.retry}
        onDismiss={apiCall.clearError}
        retryable={normalizedError.retryable}
        autoDismiss={autoDismiss}
        dismissAfter={dismissAfter}
      />
    );
  };

  return {
    ...apiCall,
    ErrorBannerComponent,
  };
}

