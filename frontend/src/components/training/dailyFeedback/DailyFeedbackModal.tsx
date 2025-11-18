/**
 * Daily Feedback Modal Component
 * 
 * Collects post-workout feedback for the ACE pattern daily learning loop.
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../../constants/designSystem';
import { DailyFeedbackModalProps, DailyFeedbackData } from './types';
import { validateDailyFeedback } from '../../../utils/validation';
import { logger } from '../../../utils/logger';
import { ModificationNotice } from './ModificationNotice';
import { StarRating } from './StarRating';
import { FeedbackInput } from './FeedbackInput';
import { ActionButtons } from './ActionButtons';

export const DailyFeedbackModal: React.FC<DailyFeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
  onSkip,
  dayOfWeek,
  trainingType,
  modificationsDetected,
}) => {
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [enjoyment, setEnjoyment] = useState<number | undefined>(undefined);
  const [soreness, setSoreness] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEnergy(undefined);
    setDifficulty(undefined);
    setEnjoyment(undefined);
    setSoreness(undefined);
    setFeedback('');
  };

  const handleSkip = () => {
    resetForm();
    onSkip();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Validate feedback data (strict mode - block invalid user input)
      const validationResult = validateDailyFeedback({
        energy_level: energy,
        difficulty: difficulty,
        enjoyment: enjoyment,
        soreness_level: soreness,
        user_feedback: feedback
      }, { allowReplacement: false });

      // If validation fails, show error and block the operation
      if (!validationResult.isValid) {
        Alert.alert('Validation Error', validationResult.errorMessage || 'Please check your feedback data');
        logger.error('Invalid feedback data from user input', {
          originalValues: { energy, difficulty, enjoyment, soreness },
          error: validationResult.errorMessage
        });
        setIsSubmitting(false);
        return;
      }

      const feedbackData: DailyFeedbackData = {
        feedback_provided: true,
        user_feedback: validationResult.feedback?.user_feedback,
        energy_level: validationResult.feedback!.energy_level,
        difficulty: validationResult.feedback!.difficulty,
        enjoyment: validationResult.feedback!.enjoyment,
        soreness_level: validationResult.feedback!.soreness_level,
        injury_reported: false,
      };

      await onSubmit(feedbackData);
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>How was your workout?</Text>
              <Text style={styles.headerSubtitle}>
                {dayOfWeek} • {trainingType}
              </Text>
            </View>
          </View>

          {/* Modification Notice */}
          <ModificationNotice count={modificationsDetected} />

          <View style={styles.contentWrapper}>
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Quick Metrics */}
              <View style={styles.metricsGrid}>
                <StarRating
                  label="Energy After"
                  value={energy}
                  onValueChange={setEnergy}
                  hints={{
                    1: 'Exhausted',
                    5: 'Energized'
                  }}
                />

                <StarRating
                  label="Difficulty"
                  value={difficulty}
                  onValueChange={setDifficulty}
                  hints={{
                    1: 'Too Easy',
                    5: 'Too Hard'
                  }}
                />
              </View>

              <View style={styles.metricsGrid}>
                <StarRating
                  label="Enjoyment"
                  value={enjoyment}
                  onValueChange={setEnjoyment}
                  hints={{
                    1: 'Hated it',
                    5: 'Loved it'
                  }}
                />

                <StarRating
                  label="Soreness"
                  value={soreness}
                  onValueChange={setSoreness}
                  hints={{
                    1: 'None',
                    5: 'Severe'
                  }}
                />
              </View>

              {/* Text Feedback */}
              <FeedbackInput
                value={feedback}
                onChangeText={setFeedback}
                maxLength={500}
              />

              {/* Action Buttons */}
              <ActionButtons
                onSkip={handleSkip}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 24,
    flex: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
});

export type { DailyFeedbackData };

