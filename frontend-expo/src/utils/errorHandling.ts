import { Alert } from 'react-native';
import { useState } from 'react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorHandlingOptions {
  title?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * Standardized error handling utility for onboarding screens
 */
export class ErrorHandler {
  /**
   * Show a standardized error alert
   */
  static showError(
    message: string, 
    options: ErrorHandlingOptions = {}
  ): void {
    const {
      title = 'Error',
      showRetry = false,
      onRetry,
      onCancel
    } = options;

    const buttons = [
      {
        text: 'OK',
        onPress: onCancel,
        style: 'default' as const
      }
    ];

    if (showRetry && onRetry) {
      buttons.unshift({
        text: 'Retry',
        onPress: onRetry,
        style: 'default' as const
      });
    }

    Alert.alert(title, message, buttons);
  }

  /**
   * Show validation errors in a user-friendly way
   */
  static showValidationErrors(errors: ValidationError[]): void {
    if (errors.length === 0) return;

    const errorMessages = errors.map(error => `• ${error.message}`).join('\n');
    const message = `Please fix the following issues:\n\n${errorMessages}`;
    
    this.showError(message, { title: 'Validation Error' });
  }

  /**
   * Show network/API errors
   */
  static showNetworkError(
    error: string, 
    onRetry?: () => void
  ): void {
    this.showError(
      `Network Error: ${error}\n\nPlease check your connection and try again.`,
      {
        title: 'Connection Error',
        showRetry: !!onRetry,
        onRetry
      }
    );
  }

  /**
   * Show profile creation errors
   */
  static showProfileError(
    error: string, 
    onRetry?: () => void
  ): void {
    this.showError(
      `Profile Creation Failed: ${error}\n\nPlease try again.`,
      {
        title: 'Profile Error',
        showRetry: !!onRetry,
        onRetry
      }
    );
  }

  /**
   * Show workout plan generation errors
   */
  static showWorkoutPlanError(
    error: string, 
    onRetry?: () => void
  ): void {
    this.showError(
      `Workout Plan Generation Failed: ${error}\n\nPlease check your connection and try again.`,
      {
        title: 'Generation Error',
        showRetry: !!onRetry,
        onRetry
      }
    );
  }
}

/**
 * Hook for managing validation errors consistently
 */
export const useValidationErrors = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = (field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  const hasErrors = () => {
    return Object.keys(errors).length > 0;
  };

  const getValidationErrors = (): ValidationError[] => {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message
    }));
  };

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    hasErrors,
    getValidationErrors
  };
};
