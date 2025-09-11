/**
 * useNotifications Hook - Manages notification state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import { WorkoutPlan } from '../types/training';

interface UseNotificationsReturn {
  notificationsEnabled: boolean;
  reminderTime: number;
  nextScheduledNotification: Date | null;
  isLoading: boolean;
  error: string | null;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  setReminderTime: (hour: number) => void;
  scheduleWorkoutReminder: (workoutPlan: WorkoutPlan | null) => Promise<boolean>;
  cancelWorkoutReminder: () => Promise<void>;
  refreshScheduledNotification: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTimeState] = useState(18); // Default 6 PM
  const [nextScheduledNotification, setNextScheduledNotification] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check notification permissions on mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const enabled = await NotificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
      
      if (enabled) {
        await refreshScheduledNotification();
      }
    } catch (err) {
      setError('Failed to check notification status');
      console.error('Error checking notification status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enableNotifications = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const granted = await NotificationService.requestPermissions();
      setNotificationsEnabled(granted);
      
      if (!granted) {
        setError('Notification permissions were denied');
      }
      
      return granted;
    } catch (err) {
      setError('Failed to enable notifications');
      console.error('Error enabling notifications:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disableNotifications = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await NotificationService.cancelWorkoutReminder();
      setNotificationsEnabled(false);
      setNextScheduledNotification(null);
    } catch (err) {
      setError('Failed to disable notifications');
      console.error('Error disabling notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setReminderTime = useCallback((hour: number) => {
    if (hour >= 0 && hour <= 23) {
      setReminderTimeState(hour);
    }
  }, []);

  const scheduleWorkoutReminder = async (workoutPlan: WorkoutPlan | null): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!notificationsEnabled) {
        setError('Notifications are not enabled');
        return false;
      }
      
      const success = await NotificationService.scheduleWorkoutReminder(workoutPlan, reminderTime);
      
      if (success) {
        await refreshScheduledNotification();
        setError(null); // Clear any previous errors
      } else {
        // Only show error if there's no workout plan, not if there's no workout today
        if (!workoutPlan) {
          setError('No workout plan available');
        } else {
          // No workout today is normal, don't show error
          setError(null);
        }
      }
      
      return success;
    } catch (err) {
      setError('Failed to schedule workout reminder');
      console.error('Error scheduling workout reminder:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelWorkoutReminder = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await NotificationService.cancelWorkoutReminder();
      setNextScheduledNotification(null);
    } catch (err) {
      setError('Failed to cancel workout reminder');
      console.error('Error cancelling workout reminder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshScheduledNotification = async (): Promise<void> => {
    try {
      const scheduled = await NotificationService.getNextScheduledNotification();
      if (scheduled && scheduled.trigger && 'date' in scheduled.trigger) {
        setNextScheduledNotification(new Date(scheduled.trigger.date));
      } else {
        setNextScheduledNotification(null);
      }
    } catch (err) {
      console.error('Error refreshing scheduled notification:', err);
    }
  };

  return {
    notificationsEnabled,
    reminderTime,
    nextScheduledNotification,
    isLoading,
    error,
    enableNotifications,
    disableNotifications,
    setReminderTime,
    scheduleWorkoutReminder,
    cancelWorkoutReminder,
    refreshScheduledNotification,
  };
};
