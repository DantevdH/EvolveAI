/**
 * useDailyFeedback Hook
 * 
 * Manages the daily feedback flow for completed training sessions.
 * Handles:
 * - Tracking original training state (before modifications)
 * - Comparing original vs actual training
 * - Submitting feedback to backend ACE pattern
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { TrainingService } from '../services/trainingService';
import { DailyTraining } from '../types/training';
import { DailyFeedbackData } from '../components/training/dailyFeedback';

export interface UseDailyFeedbackReturn {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  captureOriginalTraining: (training: DailyTraining) => void;
  submitFeedback: (feedbackData: DailyFeedbackData, actualTraining: DailyTraining) => Promise<void>;
  skipFeedback: (actualTraining: DailyTraining) => Promise<void>;
  modificationsDetected: number;
  isSubmitting: boolean;
}

export const useDailyFeedback = (
  userId: string,
  planId: string,
  weekNumber: number,
  personalInfo: any
): UseDailyFeedbackReturn => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [modificationsDetected, setModificationsDetected] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store original training state when user starts the workout
  const originalTrainingRef = useRef<DailyTraining | null>(null);

  /**
   * Capture the original training state before user makes any modifications
   */
  const captureOriginalTraining = useCallback((training: DailyTraining) => {
    originalTrainingRef.current = JSON.parse(JSON.stringify(training)); // Deep clone
  }, []);

  /**
   * Submit feedback with full ACE pattern integration
   */
  const submitFeedback = useCallback(async (
    feedbackData: DailyFeedbackData,
    actualTraining: DailyTraining
  ) => {
    if (!originalTrainingRef.current) {
      console.error('❌ No original training captured - cannot detect modifications');
      Alert.alert('Error', 'Unable to submit feedback. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Detect modifications by comparing original vs actual
      const originalTrainingData = TrainingService.detectTrainingModifications(
        originalTrainingRef.current,
        originalTrainingRef.current
      );
      
      const actualTrainingData = TrainingService.detectTrainingModifications(
        originalTrainingRef.current,
        actualTraining
      );

      // Calculate completion percentage
      const totalExercises = actualTraining.exercises.filter(ex => !actualTraining.isRestDay).length;
      const completedExercises = actualTraining.exercises.filter(ex => ex.completed).length;
      const completionPercentage = totalExercises > 0 ? completedExercises / totalExercises : 1.0;

      // Count modifications
      const strengthMods = actualTrainingData.strength_exercises.length - originalTrainingData.strength_exercises.length;
      const enduranceMods = actualTrainingData.endurance_sessions.length - originalTrainingData.endurance_sessions.length;
      const totalMods = Math.abs(strengthMods) + Math.abs(enduranceMods);
      
      setModificationsDetected(totalMods);

      // Submit to backend
      const result = await TrainingService.submitDailyFeedback({
        daily_training_id: parseInt(actualTraining.id),
        user_id: userId,
        plan_id: planId,
        week_number: weekNumber,
        day_of_week: actualTraining.dayOfWeek,
        training_date: new Date().toISOString().split('T')[0],
        training_type: actualTraining.isRestDay ? 'rest' : 'mixed', // Determine from exercises
        original_training: originalTrainingData,
        actual_training: actualTrainingData,
        session_completed: actualTraining.completed || false,
        completion_percentage: completionPercentage,
        feedback_provided: feedbackData.feedback_provided,
        user_rating: feedbackData.user_rating,
        user_feedback: feedbackData.user_feedback,
        energy_level: feedbackData.energy_level,
        difficulty: feedbackData.difficulty,
        enjoyment: feedbackData.enjoyment,
        soreness_level: feedbackData.soreness_level,
        injury_reported: feedbackData.injury_reported,
        injury_description: feedbackData.injury_description,
        pain_location: feedbackData.pain_location,
        personal_info: personalInfo,
      });

      if (result.success && result.data) {
        console.log('✅ Daily feedback submitted successfully!');
        console.log(`   📚 Lessons generated: ${result.data.lessons_generated}`);
        console.log(`   ➕ Lessons added: ${result.data.lessons_added}`);
        console.log(`   🔄 Lessons updated: ${result.data.lessons_updated}`);
        console.log(`   🎯 Total lessons in playbook: ${result.data.total_lessons}`);

        // Show success message to user
        if (result.data.lessons_generated > 0) {
          Alert.alert(
            'Feedback Received! 🎉',
            `Your AI coach learned ${result.data.lessons_generated} new lesson${result.data.lessons_generated > 1 ? 's' : ''} from this session!`,
            [{ text: 'Great!', style: 'default' }]
          );
        } else {
          Alert.alert(
            'Feedback Received!',
            'Thanks for sharing! Your progress is being tracked.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      // Reset
      originalTrainingRef.current = null;
      setModificationsDetected(0);
      
    } catch (error) {
      console.error('❌ Error submitting daily feedback:', error);
      Alert.alert(
        'Submission Failed',
        'Could not submit your feedback. Please check your connection and try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, planId, weekNumber, personalInfo]);

  /**
   * Skip feedback (still submit basic completion data for ACE pattern)
   */
  const skipFeedback = useCallback(async (actualTraining: DailyTraining) => {
    if (!originalTrainingRef.current) {
      console.error('❌ No original training captured');
      return;
    }

    setIsSubmitting(true);

    try {
      // Even when skipping, we still send completion data and modifications
      const originalTrainingData = TrainingService.detectTrainingModifications(
        originalTrainingRef.current,
        originalTrainingRef.current
      );
      
      const actualTrainingData = TrainingService.detectTrainingModifications(
        originalTrainingRef.current,
        actualTraining
      );

      const totalExercises = actualTraining.exercises.filter(ex => !actualTraining.isRestDay).length;
      const completedExercises = actualTraining.exercises.filter(ex => ex.completed).length;
      const completionPercentage = totalExercises > 0 ? completedExercises / totalExercises : 1.0;

      // Submit with feedback_provided = false
      const result = await TrainingService.submitDailyFeedback({
        daily_training_id: parseInt(actualTraining.id),
        user_id: userId,
        plan_id: planId,
        week_number: weekNumber,
        day_of_week: actualTraining.dayOfWeek,
        training_date: new Date().toISOString().split('T')[0],
        training_type: actualTraining.isRestDay ? 'rest' : 'mixed',
        original_training: originalTrainingData,
        actual_training: actualTrainingData,
        session_completed: actualTraining.completed || false,
        completion_percentage: completionPercentage,
        feedback_provided: false, // KEY: User skipped feedback
        injury_reported: false,
        personal_info: personalInfo,
      });

      if (result.success) {
        console.log('✅ Feedback skipped - completion data saved');
        if (result.data && result.data.lessons_generated > 0) {
          console.log(`   📚 ${result.data.lessons_generated} lesson(s) learned from modifications alone`);
        }
      }

      // Reset
      originalTrainingRef.current = null;
      setModificationsDetected(0);
      
    } catch (error) {
      console.error('❌ Error skipping feedback:', error);
      // Don't show error to user when skipping
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, planId, weekNumber, personalInfo]);

  return {
    showFeedbackModal,
    setShowFeedbackModal,
    captureOriginalTraining,
    submitFeedback,
    skipFeedback,
    modificationsDetected,
    isSubmitting,
  };
};

