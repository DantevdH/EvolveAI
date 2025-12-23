/**
 * usePermissions Hook - React hook for managing Health and Location permissions
 *
 * Provides a simple interface for:
 * - Checking current permission status
 * - Requesting Health and Location permissions
 * - Opening device settings
 * - Loading/saving permission status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsService, PermissionResult } from '../services/PermissionsService';
import { PermissionsStatus, defaultPermissionsStatus } from '../types/onboarding';

interface UsePermissionsReturn {
  // Current status
  status: PermissionsStatus;
  isLoading: boolean; // General loading (for refreshStatus)
  isHealthLoading: boolean; // Health-specific loading
  isLocationLoading: boolean; // Location-specific loading
  error: string | null;

  // Permission states (convenience getters)
  isHealthGranted: boolean;
  isLocationGranted: boolean;
  isBackgroundLocationGranted: boolean;
  isHealthAvailable: boolean;

  // Actions
  requestHealth: () => Promise<PermissionResult>;
  requestLocation: () => Promise<PermissionResult>;
  requestBackgroundLocation: () => Promise<PermissionResult>;
  openSettings: () => Promise<void>;
  openHealthSettings: () => Promise<void>;
  openLocationSettings: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  skipPermissions: () => void;

  // For saving
  saveStatus: () => Promise<void>;
}

export function usePermissions(
  initialStatus?: PermissionsStatus | null
): UsePermissionsReturn {
  const [status, setStatus] = useState<PermissionsStatus>(
    initialStatus ?? { ...defaultPermissionsStatus }
  );
  // Use ref to access current status in callbacks without dependency issues
  const statusRef = useRef<PermissionsStatus>(initialStatus ?? { ...defaultPermissionsStatus });
  
  // Keep ref in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [isLoading, setIsLoading] = useState(false); // General loading (for refreshStatus)
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthAvailable, setIsHealthAvailable] = useState(true);

  // Check health availability on mount
  useEffect(() => {
    console.log('[usePermissions] Checking Health availability on mount...');
    PermissionsService.isHealthAvailable()
      .then((available) => {
        console.log('[usePermissions] Health availability check result:', available);
        setIsHealthAvailable(available);
      })
      .catch((error) => {
        console.log('[usePermissions] Error checking Health availability:', error);
        setIsHealthAvailable(false);
      });
  }, []);

  // Always refresh from system on mount to get real permission status
  // This ensures we show actual system state, not cached state
  useEffect(() => {
    const refresh = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await PermissionsService.buildPermissionsStatus(statusRef.current);
        setStatus(updated);
      } catch (err) {
        console.error('Error refreshing permission status:', err);
        setError('Failed to check permission status');
      } finally {
        setIsLoading(false);
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  /**
   * Refresh permission status from system (always checks real state)
   * This is the source of truth - always reflects actual system permissions
   */
  const refreshStatusFromSystem = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Always check system state - use ref to get current status
      const updated = await PermissionsService.buildPermissionsStatus(statusRef.current);
      setStatus(updated);
    } catch (err) {
      console.error('Error refreshing permission status:', err);
      setError('Failed to check permission status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh permission status by checking current system state
   * Public method for manual refresh
   */
  const refreshStatus = useCallback(async () => {
    await refreshStatusFromSystem();
  }, [refreshStatusFromSystem]);

  /**
   * Request Health permissions
   * Best practice: Check current status first, only request if undetermined
   */
  const requestHealth = useCallback(async (): Promise<PermissionResult> => {
    setIsHealthLoading(true);
    setError(null);

    try {
      // Check current system status first (best practice)
      // Use ref to get current status without dependency issues
      const currentSystemStatus = await PermissionsService.buildPermissionsStatus(statusRef.current);

      // If already denied (deniedAt exists and not granted), open Settings directly
      if (currentSystemStatus.health.deniedAt && !currentSystemStatus.health.granted) {
        await PermissionsService.openSettings();
        setIsHealthLoading(false);
        return {
          success: false,
          status: 'denied',
        };
      }

      // If already granted, update status and return success
      if (currentSystemStatus.health.granted) {
        setStatus(currentSystemStatus);
        setIsHealthLoading(false);
        return {
          success: true,
          status: 'granted',
        };
      }

      // Only request if not previously denied (will show dialog)
      const result = await PermissionsService.requestHealthPermissions();

      // After requesting, refresh from system to get actual status
      // Bypass cache to force fresh check after permission grant
      setIsLoading(true);
      try {
        const updated = await PermissionsService.buildPermissionsStatus(statusRef.current, true);
        setStatus(updated);
      } catch (err) {
        console.error('Error refreshing permission status after grant:', err);
      } finally {
        setIsLoading(false);
      }

      // If denied after request, automatically open Settings (best practice)
      if (result.status === 'denied') {
        await PermissionsService.openSettings();
        // Don't set error - opening Settings is the expected behavior
      } else if (!result.success && result.error) {
        // Only show error for non-denial errors
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to request Health permissions';
      setError(errorMsg);
      return { success: false, status: 'error', error: errorMsg };
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  /**
   * Request foreground Location permission
   * Best practice: Check current status first, only request if undetermined
   */
  const requestLocation = useCallback(async (): Promise<PermissionResult> => {
    setIsLocationLoading(true);
    setError(null);

    try {
      // Check current status first (best practice)
      const currentStatus = await PermissionsService.checkLocationPermissions();

      // If already denied, open Settings directly (don't request again)
      if (currentStatus.foreground === 'denied') {
        await PermissionsService.openSettings();
        setIsLocationLoading(false);
        return {
          success: false,
          status: 'denied',
        };
      }

      // If already granted, return success
      if (currentStatus.foreground === 'granted') {
        await refreshStatusFromSystem();
        setIsLocationLoading(false);
        return {
          success: true,
          status: 'granted',
        };
      }

      // Only request if status is undetermined (will show dialog)
      const result = await PermissionsService.requestForegroundLocation();

      // After requesting, refresh from system to get actual status
      await refreshStatusFromSystem();

      // If denied after request, automatically open Settings (best practice)
      if (result.status === 'denied') {
        await PermissionsService.openSettings();
        // Don't set error - opening Settings is the expected behavior
      } else if (!result.success && result.error) {
        // Only show error for non-denial errors
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to request Location permission';
      setError(errorMsg);
      return { success: false, status: 'error', error: errorMsg };
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  /**
   * Request background Location permission
   * Note: Background location is optional and may fail on simulators.
   * Failures are not treated as critical errors.
   */
  const requestBackgroundLocation = useCallback(async (): Promise<PermissionResult> => {
    // Use location loading state for background location too
    setIsLocationLoading(true);
    // Don't clear existing errors - background location failure is not critical

    try {
      const result = await PermissionsService.requestBackgroundLocation();

      // After requesting background, refresh from system to get actual status
      await refreshStatusFromSystem();

      // Don't set error for background location failures - it's optional
      // Background location often doesn't work on simulators, which is expected
      // Users can enable it later in Settings if needed

      return result;
    } catch (err) {
      // Silently handle background location errors - it's optional
      const errorMsg = err instanceof Error ? err.message : 'Failed to request background location';
      // Don't set error - background location is optional
      return { success: false, status: 'error', error: errorMsg };
    } finally {
      setIsLocationLoading(false);
    }
  }, []);


  /**
   * Open device settings
   */
  const openSettings = useCallback(async () => {
    await PermissionsService.openSettings();
  }, []);

  /**
   * Open Health app/settings directly
   */
  const openHealthSettings = useCallback(async () => {
    await PermissionsService.openHealthSettings();
  }, []);

  /**
   * Open Location settings directly
   */
  const openLocationSettings = useCallback(async () => {
    await PermissionsService.openLocationSettings();
  }, []);

  /**
   * Mark permissions as skipped
   */
  const skipPermissions = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      skipped: true,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  /**
   * Save current status to local storage
   */
  const saveStatus = useCallback(async () => {
    try {
      await PermissionsService.savePermissionsToLocal(status);
    } catch (err) {
      console.error('Error saving permission status:', err);
    }
  }, [status]);

  return {
    status,
    isLoading,
    isHealthLoading,
    isLocationLoading,
    error,

    // Convenience getters - these reflect actual system status (refreshed on mount)
    isHealthGranted: status.health.granted,
    isLocationGranted: status.location.foreground,
    isBackgroundLocationGranted: status.location.background,
    isHealthAvailable,

    // Actions
    requestHealth,
    requestLocation,
    requestBackgroundLocation,
    openSettings,
    openHealthSettings,
    openLocationSettings,
    refreshStatus,
    skipPermissions,
    saveStatus,
  };
}
