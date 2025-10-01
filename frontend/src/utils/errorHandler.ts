/**
 * Centralized error handling service
 * Provides consistent error handling across the application
 */

import { Alert } from 'react-native';
import { logger } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  /**
   * Handle different types of errors with appropriate user feedback
   */
  static handleError(error: any, context?: string): AppError {
    const appError = this.categorizeError(error);
    
    // Log the error
    logger.error(`Error in ${context || 'Unknown context'}`, context, {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      details: appError.details,
    });

    // Show user-friendly error message
    this.showUserError(appError);

    return appError;
  }

  /**
   * Categorize and normalize errors
   */
  private static categorizeError(error: any): AppError {
    const timestamp = new Date();

    // Network errors
    if (error?.message?.includes('Network Error') || 
        error?.message?.includes('fetch failed') ||
        error?.code === 'NETWORK_ERROR') {
      return {
        type: ErrorType.NETWORK,
        message: 'Please check your internet connection and try again.',
        code: 'NETWORK_ERROR',
        details: error,
        timestamp,
      };
    }

    // Authentication errors
    if (error?.message?.includes('Invalid credentials') ||
        error?.message?.includes('Unauthorized') ||
        error?.code === 'AUTH_ERROR') {
      return {
        type: ErrorType.AUTHENTICATION,
        message: 'Please sign in again to continue.',
        code: 'AUTH_ERROR',
        details: error,
        timestamp,
      };
    }

    // Validation errors
    if (error?.message?.includes('validation') ||
        error?.message?.includes('required') ||
        error?.code === 'VALIDATION_ERROR') {
      return {
        type: ErrorType.VALIDATION,
        message: 'Please check your input and try again.',
        code: 'VALIDATION_ERROR',
        details: error,
        timestamp,
      };
    }

    // Permission errors
    if (error?.message?.includes('permission') ||
        error?.message?.includes('access denied') ||
        error?.code === 'PERMISSION_ERROR') {
      return {
        type: ErrorType.PERMISSION,
        message: 'You don\'t have permission to perform this action.',
        code: 'PERMISSION_ERROR',
        details: error,
        timestamp,
      };
    }

    // Unknown errors
    return {
      type: ErrorType.UNKNOWN,
      message: 'Something went wrong. Please try again.',
      code: 'UNKNOWN_ERROR',
      details: error,
      timestamp,
    };
  }

  /**
   * Show user-friendly error messages
   */
  private static showUserError(error: AppError) {
    const title = this.getErrorTitle(error.type);
    
    Alert.alert(
      title,
      error.message,
      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  }

  /**
   * Get appropriate title for error type
   */
  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTHENTICATION:
        return 'Authentication Error';
      case ErrorType.VALIDATION:
        return 'Validation Error';
      case ErrorType.PERMISSION:
        return 'Permission Error';
      case ErrorType.UNKNOWN:
      default:
        return 'Error';
    }
  }

  /**
   * Handle specific error scenarios with custom messages
   */
  static showTrainingPlanError(error: any, onRetry?: () => void) {
    const title = 'Plan Generation Failed';
    const message = 'We couldn\'t generate your training plan. Please try again.';
    
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Retry',
          onPress: onRetry,
          style: 'default',
        },
      ]
    );
  }

  static showOnboardingError(error: any, onRetry?: () => void) {
    const title = 'Onboarding Error';
    const message = 'There was a problem saving your information. Please try again.';
    
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Retry',
          onPress: onRetry,
          style: 'default',
        },
      ]
    );
  }

  static showAuthError(error: any) {
    const title = 'Authentication Error';
    const message = 'Please check your credentials and try again.';
    
    Alert.alert(
      title,
      message,
      [{ text: 'OK' }]
    );
  }

  /**
   * Handle network errors with retry option
   */
  static showNetworkError(onRetry?: () => void) {
    const title = 'Connection Error';
    const message = 'Please check your internet connection and try again.';
    
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Retry',
          onPress: onRetry,
          style: 'default',
        },
      ]
    );
  }

  /**
   * Handle validation errors with specific field information
   */
  static showValidationError(field: string, message: string) {
    const title = 'Validation Error';
    const fullMessage = `${field}: ${message}`;
    
    Alert.alert(
      title,
      fullMessage,
      [{ text: 'OK' }]
    );
  }
}

// Export convenience functions
export const handleError = (error: any, context?: string) => 
  ErrorHandler.handleError(error, context);

export const showTrainingPlanError = (error: any, onRetry?: () => void) =>
  ErrorHandler.showTrainingPlanError(error, onRetry);

export const showOnboardingError = (error: any, onRetry?: () => void) =>
  ErrorHandler.showOnboardingError(error, onRetry);

export const showAuthError = (error: any) =>
  ErrorHandler.showAuthError(error);

export const showNetworkError = (onRetry?: () => void) =>
  ErrorHandler.showNetworkError(onRetry);

export const showValidationError = (field: string, message: string) =>
  ErrorHandler.showValidationError(field, message);
