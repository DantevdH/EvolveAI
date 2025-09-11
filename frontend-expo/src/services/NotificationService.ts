/**
 * Notification Service - Handles workout reminders and notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WorkoutPlan, DailyWorkout } from '../types/training';

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
  private static readonly WORKOUT_REMINDER_ID = 'workout-reminder';
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
   * Schedule workout reminder for today if workout exists
   */
  static async scheduleWorkoutReminder(
    workoutPlan: WorkoutPlan | null,
    reminderTime: number = this.DEFAULT_REMINDER_TIME
  ): Promise<boolean> {
    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Cancel any existing workout reminders
      await this.cancelWorkoutReminder();

      // Check if there's a workout today
      const todayWorkout = this.getTodayWorkout(workoutPlan);
      if (!todayWorkout) {
        console.log('No workout scheduled for today - checking workout plan structure...');
        console.log('Workout plan:', workoutPlan ? 'exists' : 'null');
        if (workoutPlan) {
          console.log('Weekly schedules:', workoutPlan.weeklySchedules?.length || 0);
          if (workoutPlan.weeklySchedules) {
            workoutPlan.weeklySchedules.forEach((week, index) => {
              console.log(`Week ${index + 1}:`, week.dailyWorkouts?.length || 0, 'daily workouts');
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
          title: 'Workout Time! 💪',
          body: `You have a workout scheduled for today`,
          data: {
            type: 'workout_reminder',
            workoutId: todayWorkout.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      console.log(`Workout reminder scheduled for ${reminderDate.toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling workout reminder:', error);
      return false;
    }
  }

  /**
   * Cancel existing workout reminder
   */
  static async cancelWorkoutReminder(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(this.WORKOUT_REMINDER_ID);
      console.log('Workout reminder cancelled');
    } catch (error) {
      console.error('Error cancelling workout reminder:', error);
    }
  }

  /**
   * Get today's workout from the workout plan
   * Uses the same logic as the training hook to find today's workout
   */
  private static getTodayWorkout(workoutPlan: WorkoutPlan | null): DailyWorkout | null {
    if (!workoutPlan || !workoutPlan.weeklySchedules) {
      return null;
    }

    // Get the current workout week
    const currentWeek = workoutPlan.currentWeek || 1;
    const currentWeekSchedule = workoutPlan.weeklySchedules.find(week => week.weekNumber === currentWeek);
    
    if (!currentWeekSchedule || !currentWeekSchedule.dailyWorkouts) {
      console.log(`No workout schedule found for week ${currentWeek}`);
      return null;
    }

    // Use the same logic as the training hook to find today's workout
    const today = new Date();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayName = dayNames[today.getDay() === 0 ? 6 : today.getDay() - 1]; // Convert Sunday=0 to Sunday=6
    
    console.log(`Looking for today's workout: ${todayName} in week ${currentWeek}`);
    
    // Find today's workout in the current week
    const todayWorkout = currentWeekSchedule.dailyWorkouts.find(workout => workout.dayOfWeek === todayName);
    
    if (todayWorkout) {
      console.log(`Found today's workout: ${todayWorkout.dayOfWeek}, isRestDay: ${todayWorkout.isRestDay}`);
      return todayWorkout;
    }

    console.log(`No workout found for ${todayName} in week ${currentWeek}`);
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
