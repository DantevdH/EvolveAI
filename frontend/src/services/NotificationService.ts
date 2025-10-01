/**
 * Notification Service - Handles training reminders and notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TrainingPlan, DailyTraining } from '../types/training';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static readonly WORKOUT_REMINDER_ID = 'training-reminder';
  private static readonly DEFAULT_REMINDER_TIME = 18; // 6 PM

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule training reminder for today if training exists
   */
  static async scheduleTrainingReminder(
    trainingPlan: TrainingPlan | null,
    reminderTime: number = this.DEFAULT_REMINDER_TIME
  ): Promise<boolean> {
    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Cancel any existing training reminders
      await this.cancelTrainingReminder();

      // Check if there's a training today
      const todayTraining = this.getTodayTraining(trainingPlan);
      if (!todayTraining) {
        console.log('No training scheduled for today - checking training plan structure...');
        console.log('Training plan:', trainingPlan ? 'exists' : 'null');
        if (trainingPlan) {
          console.log('Weekly schedules:', trainingPlan.weeklySchedules?.length || 0);
          if (trainingPlan.weeklySchedules) {
            trainingPlan.weeklySchedules.forEach((week, index) => {
              console.log(`Week ${index + 1}:`, week.dailyTrainings?.length || 0, 'daily trainings');
            });
          }
        }
        return false;
      }

      // Calculate notification time
      const now = new Date();
      const reminderDate = new Date();
      reminderDate.setHours(reminderTime, 0, 0, 0);

      // If reminder time has passed today, schedule for tomorrow
      if (reminderDate <= now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        identifier: this.WORKOUT_REMINDER_ID,
        content: {
          title: 'Training Time! 💪',
          body: `You have a training scheduled for today`,
          data: {
            type: 'training_reminder',
            trainingId: todayTraining.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      console.log(`Training reminder scheduled for ${reminderDate.toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling training reminder:', error);
      return false;
    }
  }

  /**
   * Cancel existing training reminder
   */
  static async cancelTrainingReminder(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(this.WORKOUT_REMINDER_ID);
      console.log('Training reminder cancelled');
    } catch (error) {
      console.error('Error cancelling training reminder:', error);
    }
  }

  /**
   * Get today's training from the training plan
   * Uses the same logic as the training hook to find today's training
   */
  private static getTodayTraining(trainingPlan: TrainingPlan | null): DailyTraining | null {
    if (!trainingPlan || !trainingPlan.weeklySchedules) {
      return null;
    }

    // Get the current training week
    const currentWeek = trainingPlan.currentWeek || 1;
    const currentWeekSchedule = trainingPlan.weeklySchedules.find(week => week.weekNumber === currentWeek);
    
    if (!currentWeekSchedule || !currentWeekSchedule.dailyTrainings) {
      console.log(`No training schedule found for week ${currentWeek}`);
      return null;
    }

    // Use the same logic as the training hook to find today's training
    const today = new Date();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayName = dayNames[today.getDay() === 0 ? 6 : today.getDay() - 1]; // Convert Sunday=0 to Sunday=6
    
    console.log(`Looking for today's training: ${todayName} in week ${currentWeek}`);
    
    // Find today's training in the current week
    const todayTraining = currentWeekSchedule.dailyTrainings.find(training => training.dayOfWeek === todayName);
    
    if (todayTraining) {
      console.log(`Found today's training: ${todayTraining.dayOfWeek}, isRestDay: ${todayTraining.isRestDay}`);
      return todayTraining;
    }

    console.log(`No training found for ${todayName} in week ${currentWeek}`);
    return null;
  }

  /**
   * Get next scheduled notification
   */
  static async getNextScheduledNotification(): Promise<Notifications.NotificationRequest | null> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      return scheduledNotifications.find(notification => 
        notification.identifier === this.WORKOUT_REMINDER_ID
      ) || null;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return null;
    }
  }

  /**
   * Format notification time for display
   */
  static formatNotificationTime(date: Date): string {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Check if notification time is valid (not in the past)
   */
  static isNotificationTimeValid(hour: number): boolean {
    const now = new Date();
    const today = new Date();
    today.setHours(hour, 0, 0, 0);
    
    return today > now;
  }
}
