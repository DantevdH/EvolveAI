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
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [enjoyment, setEnjoyment] = useState<number | undefined>(undefined);
  const [soreness, setSoreness] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState('');
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryDescription, setInjuryDescription] = useState('');
  const [painLocation, setPainLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setRating(undefined);
    setEnergy(undefined);
    setDifficulty(undefined);
    setEnjoyment(undefined);
    setSoreness(undefined);
    setFeedback('');
    setHasInjury(false);
    setInjuryDescription('');
    setPainLocation('');
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
        user_rating: rating,
        user_feedback: feedback.trim() || undefined,
        energy_level: energy,
        difficulty: difficulty,
        enjoyment: enjoyment,
        soreness_level: soreness,
        injury_reported: hasInjury,
        injury_description: hasInjury ? injuryDescription.trim() : undefined,
        pain_location: hasInjury ? painLocation.trim() : undefined,
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

  const renderStars = (value: number | undefined, setValue: (v: number) => void, label: string) => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setValue(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={value && value >= star ? 'star' : 'star-outline'}
                size={32}
                color={value && value >= star ? '#FFB800' : '#C7C7CC'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Modification Notice */}
          {modificationsDetected > 0 && (
            <View style={styles.modificationsNotice}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.modificationsText}>
                {modificationsDetected} modification{modificationsDetected > 1 ? 's' : ''} detected - ACE will learn from this!
              </Text>
            </View>
          )}

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Overall Rating */}
            {renderStars(rating, setRating, "Overall Session Rating")}

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
                        size={20}
                        color={energy && energy >= star ? '#FFB800' : '#C7C7CC'}
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
                        size={20}
                        color={difficulty && difficulty >= star ? '#FFB800' : '#C7C7CC'}
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
                        size={20}
                        color={enjoyment && enjoyment >= star ? '#FFB800' : '#C7C7CC'}
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
                        size={20}
                        color={soreness && soreness >= star ? '#FFB800' : '#C7C7CC'}
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
              <Text style={styles.sectionLabel}>Additional Comments (Optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="How did the workout feel? Any notes?"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={feedback}
                onChangeText={setFeedback}
                maxLength={500}
              />
              <Text style={styles.charCount}>{feedback.length}/500</Text>
            </View>

            {/* Injury Reporting */}
            <TouchableOpacity
              style={[styles.injuryToggle, hasInjury && styles.injuryToggleActive]}
              onPress={() => setHasInjury(!hasInjury)}
            >
              <Ionicons
                name={hasInjury ? 'checkbox' : 'square-outline'}
                size={24}
                color={hasInjury ? '#FF3B30' : '#8E8E93'}
              />
              <Text style={[styles.injuryToggleText, hasInjury && styles.injuryToggleTextActive]}>
                Report pain or injury
              </Text>
            </TouchableOpacity>

            {hasInjury && (
              <View style={styles.injuryDetails}>
                <TextInput
                  style={styles.injuryInput}
                  placeholder="Where does it hurt? (e.g., right knee, lower back)"
                  placeholderTextColor="#8E8E93"
                  value={painLocation}
                  onChangeText={setPainLocation}
                />
                <TextInput
                  style={[styles.injuryInput, styles.injuryDescriptionInput]}
                  placeholder="Describe the pain/injury..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                  value={injuryDescription}
                  onChangeText={setInjuryDescription}
                />
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Skip Button - Prominent */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Ionicons name="close-circle-outline" size={20} color="#8E8E93" />
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
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modificationsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 8,
    gap: 8,
  },
  modificationsText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  ratingContainer: {
    marginBottom: 25,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  miniStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  miniStarButton: {
    padding: 2,
  },
  metricHint: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    minHeight: 14,
  },
  feedbackSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },
  feedbackInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 6,
  },
  injuryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  injuryToggleActive: {
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  injuryToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  injuryToggleTextActive: {
    color: '#FF3B30',
  },
  injuryDetails: {
    marginBottom: 20,
    gap: 12,
  },
  injuryInput: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#FFD1D1',
  },
  injuryDescriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


