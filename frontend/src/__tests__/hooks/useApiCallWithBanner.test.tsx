/**
 * Unit Tests for useApiCallWithBanner Hook
 * Simplified tests focusing on reliable, testable functionality
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useApiCallWithBanner } from '../../hooks/useApiCallWithBanner';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ErrorBanner component
jest.mock('../../components/ui/ErrorBanner', () => ({
  ErrorBanner: ({ error, onRetry, onDismiss, retryable }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    if (!error) return null;
    return React.createElement(
      View,
      { testID: 'ErrorBanner' },
      React.createElement(Text, { testID: 'error-message' }, error),
      retryable && onRetry && React.createElement(Text, { testID: 'retry-button' }, 'Retry'),
      onDismiss && React.createElement(Text, { testID: 'dismiss-button' }, 'Dismiss')
    );
  },
}));

describe('useApiCallWithBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ErrorBannerComponent', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCallWithBanner(apiFunction));

    expect(result.current.ErrorBannerComponent).toBeDefined();
    expect(typeof result.current.ErrorBannerComponent).toBe('function');
  });

  it('should expose all useApiCall properties', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCallWithBanner(apiFunction));

    expect(result.current.loading).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeDefined();
    expect(result.current.execute).toBeDefined();
    expect(result.current.retry).toBeDefined();
    expect(result.current.clearError).toBeDefined();
    expect(result.current.ErrorBannerComponent).toBeDefined();
  });

  it('should support custom banner options', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() =>
      useApiCallWithBanner(apiFunction, {
        bannerPosition: 'bottom',
        autoDismiss: false,
        dismissAfter: 3000,
      })
    );

    // Just verify the hook doesn't crash with custom options
    expect(result.current.ErrorBannerComponent).toBeDefined();
    expect(typeof result.current.execute).toBe('function');
  });

  it('should initialize with no error', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCallWithBanner(apiFunction));

    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
  });
});
