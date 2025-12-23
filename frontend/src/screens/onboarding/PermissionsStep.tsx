/**
 * PermissionsStep - Step of onboarding to request Health and Location permissions
 *
 * Requests permissions upfront to enable:
 * - Live workout tracking with GPS
 * - Health data import (HR, workouts, etc.)
 * - Background location for continuous tracking
 *
 * Users can skip this step and enable permissions later in Settings.
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, AppState, AppStateStatus, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding/ui';
import { PermissionCard, PermissionStatus } from '../../components/onboarding/ui/PermissionCard';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionsStepProps, PermissionsStatus } from '../../types/onboarding';
import { colors, spacing, borderRadius } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

const EVOLVE_LOGO = require('../../../assets/images/evolve-logo.png');

export const PermissionsStep: React.FC<PermissionsStepProps> = ({
  permissionsStatus,
  onPermissionsChange,
  onNext,
  onBack,
  onSkip,
  isLoading: externalLoading,
  error: externalError,
}) => {
  const {
    status,
    isLoading,
    isHealthLoading,
    isLocationLoading,
    error,
    isHealthGranted,
    isLocationGranted,
    isHealthAvailable,
    requestHealth,
    requestLocation,
    requestBackgroundLocation,
    openHealthSettings,
    openLocationSettings,
    saveStatus,
    refreshStatus,
  } = usePermissions(permissionsStatus);

  // Sync status changes back to parent
  useEffect(() => {
    onPermissionsChange(status);
  }, [status, onPermissionsChange]);

  // Refresh permission status when app comes back from Settings
  // This ensures we show the actual system state after user changes permissions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh permissions to get latest system state
        refreshStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshStatus]);

  // Get health permission card status
  const getHealthStatus = useCallback((): PermissionStatus => {
    const healthStatus = !isHealthAvailable 
      ? 'unavailable' 
      : isHealthLoading 
        ? 'loading' 
        : isHealthGranted 
          ? 'granted' 
          : status.health.deniedAt 
            ? 'requires_settings' 
            : 'not_requested';
    
    console.log('[PermissionsStep] Health status calculation:', {
      isHealthAvailable,
      isHealthLoading,
      isHealthGranted,
      deniedAt: status.health.deniedAt,
      result: healthStatus,
    });
    
    return healthStatus;
  }, [isHealthAvailable, isHealthLoading, isHealthGranted, status.health.deniedAt]);

  // Get location permission card status
  const getLocationStatus = useCallback((): PermissionStatus => {
    if (isLocationLoading) return 'loading';
    if (isLocationGranted) return 'granted';
    if (status.location.deniedAt) return 'requires_settings';
    return 'not_requested';
  }, [isLocationLoading, isLocationGranted, status.location.deniedAt]);

  // Handle health permission request
  const handleHealthRequest = useCallback(async () => {
    const result = await requestHealth();
    // Health permissions flow handled in hook
  }, [requestHealth]);

  // Handle location permission request
  const handleLocationRequest = useCallback(async () => {
    const result = await requestLocation();
    if (result.success) {
      // If foreground granted, also request background
      // Note: Background location may fail on simulators - that's okay
      try {
        await requestBackgroundLocation();
        // Background location is optional - failures are expected on simulators
      } catch (err) {
        // Silently handle background location errors - it's optional
        console.log('Background location not available (this is normal on simulators)');
      }
    }
  }, [requestLocation, requestBackgroundLocation]);

  // Filter out background location errors - they're optional and often fail on simulators
  // Also filter out technical developer errors that shouldn't be shown to users
  const shouldShowError = useCallback((errorMsg: string | null | undefined): boolean => {
    if (!errorMsg) return false;
    const lowerError = errorMsg.toLowerCase();
    
    // Don't show errors about background location - it's optional
    // Check for common background location error patterns
    if (lowerError.includes('background location') || 
        (lowerError.includes('always') && lowerError.includes('access')) ||
        (lowerError.includes('always') && lowerError.includes('settings'))) {
      return false;
    }
    
    // Filter out technical developer errors that have been sanitized
    // These should already be converted to user-friendly messages by PermissionsService,
    // but we add an extra check here as a safety net
    const technicalErrorPatterns = [
      'com.apple.developer',
      'error domain=',
      'code=4',
      'missing',
      'entitlement',
      'inithealthkit failed: error with healthkit authorization',
    ];
    
    // If error contains technical patterns but hasn't been sanitized, don't show it
    // (it means sanitization failed, so better to hide it than show technical details)
    const hasTechnicalPattern = technicalErrorPatterns.some(pattern => 
      lowerError.includes(pattern)
    );
    
    // Only show if it doesn't have technical patterns (meaning it's user-friendly)
    // OR if it's a user-friendly message that mentions the technical issue in a friendly way
    return !hasTechnicalPattern || 
           lowerError.includes('not available on this device') ||
           lowerError.includes('please try again after updating');
  }, []);

  // Handle continue
  const handleContinue = useCallback(async () => {
    await saveStatus();
    onNext();
  }, [saveStatus, onNext]);

  // Dynamic padding based on screen width (matching other onboarding steps)
  const { width: screenWidth } = useWindowDimensions();
  const cardPadding = screenWidth < 375 ? 16 : 20;

  return (
    <OnboardingCard title="" scrollable={false}>
      <View style={styles.container}>
        <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 96 }]}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Image
                source={EVOLVE_LOGO}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Track Your Workouts</Text>
            <Text style={styles.heroSubtitle}>
              Enable permissions to unlock live workout tracking and automatic data import
            </Text>
          </View>

          {/* Permission Cards */}
          <View style={styles.cardsContainer}>
            {/* Health Permission */}
            <PermissionCard
              title="Health Data"
              description="Import workouts, heart rate, and activity data from your watch or fitness apps"
              icon="heart"
              iconColor={colors.primary}
              status={getHealthStatus()}
              onRequest={handleHealthRequest}
              onOpenSettings={openHealthSettings}
              disabled={isHealthLoading}
            />

            {/* Location Permission */}
            <PermissionCard
              title="Location Tracking"
              description="Track your runs, rides, and hikes with accurate GPS distance and route mapping"
              icon="location"
              iconColor={colors.tertiary}
              status={getLocationStatus()}
              onRequest={handleLocationRequest}
              onOpenSettings={openLocationSettings}
              disabled={isLocationLoading}
            />
          </View>

          {/* Info Message */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>
              You can enable these permissions later in Settings. Some features require these permissions to work.
            </Text>
          </View>

          {/* Error Display */}
          {/* Don't show errors related to background location - it's optional and often fails on simulators */}
          {shouldShowError(error || externalError) && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error || externalError}</Text>
            </View>
          )}
        </View>

        <OnboardingNavigation
          onNext={handleContinue}
          onBack={onBack}
          nextTitle="Continue"
          backTitle="Back"
          nextDisabled={isLoading || externalLoading}
          showBack={!!onBack}
          variant="dual"
        />
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroLogo: {
    width: 100,
    height: 100,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsContainer: {
    marginBottom: spacing.lg,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: createColorWithOpacity(colors.info, 0.1),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.error, 0.1),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },
  skipContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
