/**
 * Unit Tests for API Error Handler Utilities
 */

import {
  getApiErrorMessage,
  isRetryableError,
  normalizeApiError,
  ApiError,
} from '../../utils/apiErrorHandler';

describe('API Error Handler', () => {
  describe('getApiErrorMessage', () => {
    it('should extract message from error response data', () => {
      const error = {
        response: {
          data: {
            message: 'Custom error message',
          },
        },
      };
      expect(getApiErrorMessage(error as any)).toBe('Custom error message');
    });

    it('should extract message from error.message', () => {
      const error = {
        message: 'Network error occurred',
      };
      expect(getApiErrorMessage(error as any)).toBe('Network error occurred');
    });

    it('should generate message from status code', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      expect(getApiErrorMessage(error as any)).toBe('The requested resource was not found.');
    });

    it('should return default message for unknown errors', () => {
      const error = {};
      expect(getApiErrorMessage(error as any)).toBe('Something went wrong. Please try again.');
    });

    it('should handle string-like error messages', () => {
      const error = {
        message: 'Simple string error',
      };
      expect(getApiErrorMessage(error as any)).toBe('Simple string error');
    });

    it('should prioritize response data over error message', () => {
      const error = {
        message: 'Less specific message',
        response: {
          data: {
            message: 'More specific message',
          },
        },
      };
      expect(getApiErrorMessage(error as any)).toBe('More specific message');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = {
        message: 'Network request failed',
        code: 'NETWORK_ERROR',
      };
      expect(isRetryableError(error as any)).toBe(true);
    });

    it('should return true for 5xx server errors', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      expect(isRetryableError(error as any)).toBe(true);
    });

    it('should return true for 429 rate limit errors', () => {
      const error = {
        response: {
          status: 429,
        },
      };
      expect(isRetryableError(error as any)).toBe(true);
    });

    it('should return false for 4xx client errors (except 429)', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      expect(isRetryableError(error as any)).toBe(false);
    });

    it('should return false for 404 errors', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      expect(isRetryableError(error as any)).toBe(false);
    });

    it('should return false for 401 unauthorized errors', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isRetryableError(error as any)).toBe(false);
    });

    it('should return false for errors without status or network indicators', () => {
      const error = {
        message: 'Some other error',
      };
      expect(isRetryableError(error as any)).toBe(false);
    });
  });

  describe('normalizeApiError', () => {
    it('should normalize error with response data', () => {
      const error = {
        response: {
          status: 500,
          data: {
            message: 'Server error',
          },
        },
      };
      const normalized = normalizeApiError(error as any);
      expect(normalized.message).toBe('Server error');
      expect(normalized.status).toBe(500);
      expect(normalized.retryable).toBe(true);
    });

    it('should normalize network error', () => {
      const error = {
        message: 'Network request failed',
        code: 'NETWORK_ERROR',
      };
      const normalized = normalizeApiError(error as any);
      expect(normalized.message).toBe('Network request failed');
      expect(normalized.retryable).toBe(true);
    });

    it('should normalize 4xx error as non-retryable', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Bad request',
          },
        },
      };
      const normalized = normalizeApiError(error as any);
      expect(normalized.message).toBe('Bad request');
      expect(normalized.status).toBe(400);
      expect(normalized.retryable).toBe(false);
    });

    it('should handle string errors', () => {
      // String errors are converted to objects with message property
      const normalized = normalizeApiError({ message: 'String error' });
      expect(normalized.message).toBe('String error');
      expect(normalized.retryable).toBe(false);
    });

    it('should handle unknown error format', () => {
      const normalized = normalizeApiError({} as any);
      // Default fallback message
      expect(normalized.message).toBe('Something went wrong. Please try again.');
      expect(normalized.retryable).toBe(false);
    });
  });
});

