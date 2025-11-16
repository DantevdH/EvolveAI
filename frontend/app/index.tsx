import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAppRouting } from '@/src/hooks/useAppRouting';
import { useEffect, useRef } from 'react';
import { LoadingScreen } from '@/src/components/shared/LoadingScreen';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SimpleSpinner } from '@/src/components/ui/SimpleSpinner';
import { colors, createColorWithOpacity, goldenGradient } from '@/src/constants/colors';
import { logNavigation, logWarn } from '@/src/utils/logger';

export default function Index() {
  const { state } = useAuth();
  const router = useRouter();
  const routingState = useAppRouting();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationRef = useRef<string | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // Use useEffect to handle navigation based on routing state
  useEffect(() => {
    // Clear any existing timeout and reset navigation state
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    
    // Reset navigation state to prevent race conditions
    isNavigatingRef.current = false;

    // Use centralized routing logic
    const { targetRoute, routingReason, skipLoaders } = routingState;

    // Only navigate if we have a target route and it's different from the last navigation
    if (targetRoute && targetRoute !== lastNavigationRef.current) {
      // Prevent duplicate navigation if already navigating
      if (isNavigatingRef.current) {
        logWarn('Navigation blocked - already in progress');
        return;
      }
      
      // Log the navigation
      const fromRoute = lastNavigationRef.current || 'Root';
      logNavigation(fromRoute, targetRoute, routingReason);
      
      lastNavigationRef.current = targetRoute;
      isNavigatingRef.current = true;
      
      // Add a small delay to prevent rapid navigation calls and allow state to stabilize
      navigationTimeoutRef.current = setTimeout(() => {
        try {
          // Pass skipLoaders flag when available
          if (skipLoaders && targetRoute === '/onboarding') {
            router.push({ pathname: targetRoute, params: { resume: 'true' } } as any);
          } else {
          router.push(targetRoute as any);
          }
        } catch (error) {
          logWarn('Navigation failed, trying replace', error);
          try {
            if (skipLoaders && targetRoute === '/onboarding') {
              router.replace({ pathname: targetRoute, params: { resume: 'true' } } as any);
            } else {
            router.replace(targetRoute as any);
            }
          } catch (replaceError) {
            logWarn('Replace navigation also failed', replaceError);
          }
        } finally {
          // Reset navigation state after a delay to prevent rapid re-navigation
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 300);
        }
      }, 50);
    }
  }, [state.isLoading, state.trainingPlanLoading, state.user, state.userProfile, state.trainingPlan, state.error, router, routingState]);

  // Cleanup timeout on unmount and state changes
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup timeout when state changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [state.isLoading, state.trainingPlanLoading, state.user, state.userProfile, state.trainingPlan, state.error]);

  // Show loading screen when auth is loading
  if (routingState.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <LinearGradient
            colors={goldenGradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Loading your profile...</Text>
          </LinearGradient>
          <View style={styles.content}>
            <Text style={styles.subtitle}>Please hold on while we prepare your setup.</Text>
            <View style={styles.spinnerWrap}>
              <SimpleSpinner size={56} color={colors.secondary} strokeWidth={4} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Return null while navigation is being handled by useEffect
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  card: {
    width: '80%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    overflow: 'hidden',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  spinnerWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
});
