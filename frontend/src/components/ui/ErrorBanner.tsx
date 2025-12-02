/**
 * Error Banner Component
 * Non-blocking inline error display for API/DB call failures
 * Provides retry functionality and auto-dismiss
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { logger } from '../../utils/logger';

export interface ErrorBannerProps {
  error: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  autoDismiss?: boolean;
  dismissAfter?: number; // milliseconds
  retryable?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'error',
  autoDismiss = false,
  dismissAfter = 5000,
  retryable = true,
}) => {
  const [visible, setVisible] = useState(!!error);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (error) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, dismissAfter);
        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [error, autoDismiss, dismissAfter]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  const handleRetry = () => {
    if (onRetry) {
      logger.info('User retrying failed operation', { error: error instanceof Error ? error.message : error });
      onRetry();
    }
  };

  if (!visible || !error) return null;

  const errorMessage = error instanceof Error ? error.message : error;
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                         errorMessage.toLowerCase().includes('connection') ||
                         errorMessage.toLowerCase().includes('timeout');

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return { bg: colors.warning || '#FFA500', icon: 'warning' as const };
      case 'info':
        return { bg: colors.info || '#2196F3', icon: 'information-circle' as const };
      case 'error':
      default:
        return { bg: colors.error || '#FF3B30', icon: isNetworkError ? 'cloud-offline' as const : 'alert-circle' as const };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: variantStyles.bg },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={variantStyles.icon} size={20} color={colors.background} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {errorMessage}
        </Text>
        <View style={styles.actions}>
          {retryable && onRetry && (
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Ionicons name="refresh" size={16} color={colors.background} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
              <Ionicons name="close" size={18} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
  },
  retryText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dismissButton: {
    padding: 4,
  },
});

