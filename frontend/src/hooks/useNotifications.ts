/**
 * useNotifications Hook - Manages notification state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import { TrainingPlan } from '../types/training';

interface UseNotificationsReturn {
  notificationsEnabled: boolean;
  reminderTime: number;
  nextScheduledNotification: Date | null;
  isLoading: boolean;
  error: string | null;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  setReminderTime: (hour: number) => void;
  scheduleTrainingReminder: (trainingPlan: TrainingPlan | null) => Promise<boolean>;
  cancelTrainingReminder: () => Promise<void>;
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
      
      await NotificationService.cancelTrainingReminder();
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

  const scheduleTrainingReminder = async (trainingPlan: TrainingPlan | null): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!notificationsEnabled) {
        setError('Notifications are not enabled');
        return false;
      }
      
      const success = await NotificationService.scheduleTrainingReminder(trainingPlan, reminderTime);
      
      if (success) {
        await refreshScheduledNotification();
        setError(null); // Clear any previous errors
      } else {
        // Only show error if there's no training plan, not if there's no training today
        if (!trainingPlan) {
          setError('No training plan available');
        } else {
          // No training today is normal, don't show error
          setError(null);
        }
      }
      
      return success;
    } catch (err) {
      setError('Failed to schedule training reminder');
      console.error('Error scheduling training reminder:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelTrainingReminder = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await NotificationService.cancelTrainingReminder();
      setNextScheduledNotification(null);
    } catch (err) {
      setError('Failed to cancel training reminder');
      console.error('Error cancelling training reminder:', err);
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
    scheduleTrainingReminder,
    cancelTrainingReminder,
    refreshScheduledNotification,
  };
};
