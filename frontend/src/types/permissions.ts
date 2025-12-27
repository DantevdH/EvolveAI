/**
 * Permission Error Types
 * 
 * Custom error types for permission-related errors
 */

export enum PermissionErrorCode {
  MODULE_NOT_AVAILABLE = 'MODULE_NOT_AVAILABLE',
  TIMEOUT = 'TIMEOUT',
  USER_DENIED = 'USER_DENIED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  INVALID_PERMISSION_STATE = 'INVALID_PERMISSION_STATE',
}

export class PermissionError extends Error {
  constructor(
    public code: PermissionErrorCode,
    message: string,
    public originalError?: Error | unknown
  ) {
    super(message);
    this.name = 'PermissionError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionError);
    }
  }

  /**
   * Check if error is a user denial (not a system error)
   */
  isUserDenial(): boolean {
    return this.code === PermissionErrorCode.USER_DENIED;
  }

  /**
   * Check if error is recoverable (can retry)
   */
  isRecoverable(): boolean {
    return this.code === PermissionErrorCode.TIMEOUT || 
           this.code === PermissionErrorCode.SYSTEM_ERROR;
  }
}





