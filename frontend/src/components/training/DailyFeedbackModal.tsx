/**
 * Daily Feedback Modal Component
 * 
 * Collects post-workout feedback for the ACE pattern daily learning loop.
 * Features:
 * - Skip functionality with visual prominence
 * - Quick ratings (1-5 stars for multiple metrics)
 * - Optional text feedback
 * - Injury reporting
 * - Modification detection
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/designSystem';

interface DailyFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: DailyFeedbackData) => Promise<void>;
  onSkip: () => void;
  dayOfWeek: string;
  trainingType: string;
  modificationsDetected: number;
}

export interface DailyFeedbackData {
  feedback_provided: boolean;
  user_rating?: number;
  user_feedback?: string;
  energy_level?: number;
  difficulty?: number;
  enjoyment?: number;
  soreness_level?: number;
  injury_reported: boolean;
  injury_description?: string;
  pain_location?: string;
}

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
      const feedbackData: DailyFeedbackData = {
        feedback_provided: true,
        user_feedback: feedback.trim() || undefined,
        energy_level: energy,
        difficulty: difficulty,
        enjoyment: enjoyment,
        soreness_level: soreness,
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
          {modificationsDetected > 0 && (
            <View style={styles.modificationsNotice}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.modificationsText}>
                {modificationsDetected} modification{modificationsDetected > 1 ? 's' : ''} detected - ACE will learn from this!
              </Text>
            </View>
          )}

          <View style={styles.contentWrapper}>
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Quick Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Energy After</Text>
                <View style={styles.miniStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEnergy(star)}
                      style={styles.miniStarButton}
                    >
                      <Ionicons
                        name={energy && energy >= star ? 'star' : 'star-outline'}
                        size={22}
                        color={energy && energy >= star ? colors.primary : colors.inputBorder}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.metricHint}>
                  {energy === 1 ? 'Exhausted' : energy === 5 ? 'Energized' : ''}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Difficulty</Text>
                <View style={styles.miniStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setDifficulty(star)}
                      style={styles.miniStarButton}
                    >
                      <Ionicons
                        name={difficulty && difficulty >= star ? 'star' : 'star-outline'}
                        size={22}
                        color={difficulty && difficulty >= star ? colors.primary : colors.inputBorder}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.metricHint}>
                  {difficulty === 1 ? 'Too Easy' : difficulty === 5 ? 'Too Hard' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Enjoyment</Text>
                <View style={styles.miniStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEnjoyment(star)}
                      style={styles.miniStarButton}
                    >
                      <Ionicons
                        name={enjoyment && enjoyment >= star ? 'star' : 'star-outline'}
                        size={22}
                        color={enjoyment && enjoyment >= star ? colors.primary : colors.inputBorder}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.metricHint}>
                  {enjoyment === 1 ? 'Hated it' : enjoyment === 5 ? 'Loved it' : ''}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Soreness</Text>
                <View style={styles.miniStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSoreness(star)}
                      style={styles.miniStarButton}
                    >
                      <Ionicons
                        name={soreness && soreness >= star ? 'star' : 'star-outline'}
                        size={22}
                        color={soreness && soreness >= star ? colors.primary : colors.inputBorder}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.metricHint}>
                  {soreness === 1 ? 'None' : soreness === 5 ? 'Severe' : ''}
                </Text>
              </View>
            </View>

            {/* Text Feedback */}
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionLabel}>Comments (Optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="How did the workout feel? Any notes or injuries to report?"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                value={feedback}
                onChangeText={setFeedback}
                maxLength={500}
              />
              <Text style={styles.charCount}>{feedback.length}/500</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* Skip Button */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={isSubmitting}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.muted} />
                <Text style={styles.skipButtonText}>Skip Feedback</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  modificationsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}10`,
    padding: 14,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modificationsText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    opacity: 0.9,
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
  metricCard: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  miniStars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
    justifyContent: 'center',
  },
  miniStarButton: {
    padding: 2,
  },
  metricHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
    minHeight: 14,
    textAlign: 'center',
  },
  feedbackSection: {
    marginTop: 8,
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 8,
  },
  injuryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 14,
    gap: 12,
  },
  injuryToggleActive: {
    backgroundColor: colors.errorBackground || `${colors.error}08`,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  injuryToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
  injuryToggleTextActive: {
    color: colors.error,
    fontWeight: '600',
  },
  injuryDetails: {
    marginBottom: 24,
    gap: 12,
  },
  injuryInput: {
    backgroundColor: colors.errorBackground || `${colors.error}08`,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.error,
  },
  injuryDescriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


