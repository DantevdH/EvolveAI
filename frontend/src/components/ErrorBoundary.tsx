/**
 * Error Boundary component for catching and handling React errors
 * Prevents the entire app from crashing when a component fails
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../constants/designSystem';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    logger.error('Error Boundary caught an error', 'ERROR_BOUNDARY', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name="warning" 
                  size={64} 
                  color={colors.error} 
                />
              </View>

              <Text style={styles.title}>Something went wrong</Text>
              
              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Please try again.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Information:</Text>
                  <Text style={styles.debugText}>
                    {this.state.error.message}
                  </Text>
                  {this.state.error.stack && (
                    <Text style={styles.debugStack}>
                      {this.state.error.stack}
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={colors.text} 
                  style={styles.retryIcon}
                />
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: typography.fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.fontSizes.md,
    marginBottom: spacing.xxxl,
  },
  debugContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxxl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.error,
  },
  debugTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  debugText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  debugStack: {
    fontSize: typography.fontSizes.xs,
    color: colors.muted,
    fontFamily: 'monospace',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryIcon: {
    marginRight: spacing.sm,
  },
  retryText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
});
