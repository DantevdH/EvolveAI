/**
 * Lazy loading wrapper for screens to improve performance
 * Only loads the screen component when it's actually needed
 */

import React, { Suspense, ComponentType, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../constants/designSystem';

interface LazyScreenProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultFallback = () => (
  <View style={styles.fallbackContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const LazyScreen: React.FC<LazyScreenProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component for lazy loading screens
 */
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  fallback?: ReactNode
) {
  const LazyComponent = React.lazy(() => 
    Promise.resolve({ default: Component })
  );

  return function LazyWrappedComponent(props: T) {
    return (
      <LazyScreen fallback={fallback}>
        <LazyComponent {...props} />
      </LazyScreen>
    );
  };
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
});
