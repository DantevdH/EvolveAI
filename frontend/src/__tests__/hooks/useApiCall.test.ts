/**
 * Unit Tests for useApiCall Hook
 * Simplified tests focusing on reliable, testable functionality
 */

import { renderHook } from '@testing-library/react-native';
import { useApiCall } from '../../hooks/useApiCall';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading false and no error', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCall(apiFunction));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  it('should expose all required functions', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCall(apiFunction));

    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.retry).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.loading).toBe('boolean');
    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeDefined();
  });

  it('should accept options parameter', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const onSuccess = jest.fn();
    const onError = jest.fn();
    
    const { result } = renderHook(() =>
      useApiCall(apiFunction, {
        onSuccess,
        onError,
        retryCount: 2,
        retryDelay: 100,
      })
    );

    // Hook should initialize without errors
    expect(result.current).toBeDefined();
    expect(typeof result.current.execute).toBe('function');
  });

  it('should handle clearError function', () => {
    const apiFunction = jest.fn().mockResolvedValue({ data: 'success' });
    const { result } = renderHook(() => useApiCall(apiFunction));

    // clearError should be callable without errors
    expect(() => result.current.clearError()).not.toThrow();
    expect(result.current.error).toBe(null);
  });
});
