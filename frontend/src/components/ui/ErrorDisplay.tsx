import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

export interface ErrorDisplayProps {
  error: string | Error;
  onRetry?: () => void;
  variant?: 'default' | 'network' | 'server' | 'auth' | 'validation';
  showRetry?: boolean;
}

interface ErrorInfo {
  icon: string;
  title: string;
  message: string;
  actionText: string;
}

const getErrorInfo = (error: string | Error, variant?: string): ErrorInfo => {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorCode = extractErrorCode(errorMessage);
  
  // Network errors
  if (isNetworkError(errorMessage) || variant === 'network') {
    return {
      icon: 'globe',
      title: 'Connection Problem',
      message: 'Please check your internet connection and try again.',
      actionText: 'Try Again',
    };
  }
  
  // Server errors
  if (isServerError(errorMessage) || variant === 'server') {
    return {
      icon: 'exclamationmark.triangle.fill',
      title: 'Server Issue',
      message: 'Our servers are temporarily unavailable. Please try again in a few minutes.',
      actionText: 'Try Again',
    };
  }
  
  // Authentication errors
  if (isAuthError(errorMessage) || variant === 'auth') {
    return {
      icon: 'person.fill',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      actionText: 'Sign In Again',
    };
  }
  
  // Rate limiting
  if (isRateLimitError(errorMessage)) {
    return {
      icon: 'exclamationmark.triangle.fill',
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please wait a moment and try again.',
      actionText: 'Try Again',
    };
  }
  
  // AI service errors
  if (isAIServiceError(errorMessage)) {
    return {
      icon: 'person.2.fill',
      title: 'AI Coach Unavailable',
      message: 'Our AI coach is temporarily unavailable. Please try again in a moment.',
      actionText: 'Try Again',
    };
  }
  
  // Validation errors
  if (isValidationError(errorMessage) || variant === 'validation') {
    return {
      icon: 'exclamationmark.triangle.fill',
      title: 'Invalid Input',
      message: 'Please check your answers and try again.',
      actionText: 'Try Again',
    };
  }
  
  // Generic error
  return {
    icon: 'exclamationmark.triangle.fill',
    title: 'Something Went Wrong',
    message: 'We encountered an unexpected issue. Please try again.',
    actionText: 'Try Again',
  };
};

// Error detection helpers
const extractErrorCode = (message: string): string | null => {
  // Extract HTTP status codes
  const httpMatch = message.match(/HTTP (\d+)/);
  if (httpMatch) return httpMatch[1];
  
  // Extract specific error codes
  const codeMatch = message.match(/error[:\s]+(\w+)/i);
  if (codeMatch) return codeMatch[1];
  
  return null;
};

const isNetworkError = (message: string): boolean => {
  const networkKeywords = [
    'network', 'connection', 'timeout', 'offline', 'unreachable',
    'fetch', 'network request failed', 'no internet', 'connectivity'
  ];
  return networkKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

const isServerError = (message: string): boolean => {
  const serverKeywords = [
    'server', '500', '502', '503', '504', 'internal server error',
    'service unavailable', 'maintenance', 'overloaded'
  ];
  return serverKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

const isAuthError = (message: string): boolean => {
  const authKeywords = [
    'unauthorized', '401', '403', 'session', 'expired', 'invalid token',
    'authentication', 'credentials', 'sign in', 'login'
  ];
  return authKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

const isRateLimitError = (message: string): boolean => {
  const rateLimitKeywords = [
    'rate limit', '429', 'too many requests', 'quota', 'limit exceeded',
    'throttle', 'slow down'
  ];
  return rateLimitKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

const isAIServiceError = (message: string): boolean => {
  const aiKeywords = [
    'ai', 'coach', 'generation', 'openai', 'gpt', 'model',
    'ai service', 'artificial intelligence'
  ];
  return aiKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

const isValidationError = (message: string): boolean => {
  const validationKeywords = [
    'validation', 'invalid', 'required', 'missing', 'format',
    '422', 'bad request', '400'
  ];
  return validationKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  variant,
  showRetry = true,
}) => {
  const errorInfo = getErrorInfo(error, variant);

  return (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <IconSymbol name={errorInfo.icon as any} size={48} color={colors.muted} />
        <Text style={styles.errorTitle}>{errorInfo.title}</Text>
        <Text style={styles.errorMessage}>{errorInfo.message}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {showRetry && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>{errorInfo.actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
