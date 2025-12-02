/**
 * Week Detail Modal Component
 * Shows detailed information about a selected week
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { WeekModalData } from './types';
import { getWeekButtonText, isWeekButtonDisabled } from './utils';
import {
  canNavigateToWeek,
  canGenerateWeek,
  calculateGenerationProgress,
  getProgressBarDuration,
  isValidProgressDuration,
} from './weekDetailModalLogic';

interface WeekDetailModalProps {
  data: WeekModalData | null;
  visible: boolean;
  onClose: () => void;
  onViewWeek: () => void;
  onGenerateWeek?: () => Promise<void>;
}

const STATUS_CONFIG: Record<string, {
  icon: 'checkmark-circle' | 'flash' | 'lock-closed' | 'time-outline';
  background: string;
  color: string;
  label: string;
}> = {
  completed: {
    icon: 'checkmark-circle',
    background: createColorWithOpacity(colors.secondary, 0.18),
    color: colors.secondary,
    label: 'Completed',
  },
  current: {
    icon: 'flash',
    background: createColorWithOpacity(colors.primary, 0.12),
    color: colors.primary,
    label: "Current Week",
  },
  generated: {
    icon: 'flash',
    background: createColorWithOpacity(colors.primary, 0.12),
    color: colors.primary,
    label: "Current Week",
  },
  locked: {
    icon: 'lock-closed',
    background: createColorWithOpacity(colors.text, 0.06),
    color: colors.muted,
    label: 'Locked',
  },
  'unlocked-not-generated': {
    icon: 'time-outline',
    background: createColorWithOpacity(colors.secondary, 0.12),
    color: colors.secondary,
    label: 'Ready to Generate',
  },
  'past-not-generated': {
    icon: 'lock-closed',
    background: createColorWithOpacity(colors.text, 0.06),
    color: colors.muted,
    label: 'Week Locked',
  },
  'future-locked': {
    icon: 'lock-closed',
    background: createColorWithOpacity(colors.text, 0.06),
    color: colors.muted,
    label: 'Locked',
  },
};

const WeekDetailModal: React.FC<WeekDetailModalProps> = ({
  data,
  visible,
  onClose,
  onViewWeek,
  onGenerateWeek,
}) => {
  // ALL HOOKS MUST BE CALLED FIRST - Rules of Hooks
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const backendRespondedRef = useRef<boolean>(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Reset progress and state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      // Modal is closing - reset everything
      setProgress(0);
      setIsGenerating(false);
      backendRespondedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Modal is opening - ensure clean state
      setProgress(0);
      setIsGenerating(false);
      backendRespondedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [visible]);

  // NOW we can check for null data AFTER all hooks are called
  // Early return is safe here because all hooks have been called
  if (!data) return null;

  // Defensive checks for data properties
  const weekStatus = data.status || 'locked';
  const statusConfig = STATUS_CONFIG[weekStatus] || STATUS_CONFIG.locked;
  
  // Determine button state and action using extracted logic
  const canNavigate = canNavigateToWeek(data);
  const canGenerate = canGenerateWeek(data, !!onGenerateWeek, isGenerating);

  const buttonText = getWeekButtonText(weekStatus, isGenerating);
  const isButtonDisabled = isWeekButtonDisabled(buttonText);

  const handleButtonPress = async () => {
    if (canGenerate && onGenerateWeek) {
      setIsGenerating(true);
      setProgress(0);
      
      const totalDuration = getProgressBarDuration();
      
      if (!isValidProgressDuration(totalDuration)) {
        console.error('Invalid totalDuration for progress bar:', totalDuration);
        setIsGenerating(false);
        return;
      }
      
      startTimeRef.current = Date.now();
      backendRespondedRef.current = false;

      // Start progress animation - animates from 0 to 99%
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      intervalRef.current = setInterval(() => {
        if (backendRespondedRef.current) {
          // Backend already responded, stop updating
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        
        // Use extracted logic for progress calculation
        const newProgress = calculateGenerationProgress(
          startTimeRef.current,
          totalDuration,
          backendRespondedRef.current
        );
        setProgress(newProgress);
      }, 80);

      try {
        // Wait for backend response
        await onGenerateWeek();
        
        // Backend responded - mark as responded and complete to 100%
        backendRespondedRef.current = true;
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Jump to 100% immediately
        setProgress(100);
        
        // Wait a moment to show 100%, then the parent will refresh the training plan
        // and the modal will receive updated data with status 'current'
        // The button will then show "Start Today's Training"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // The training plan should now be updated, so the status will change
        // The parent component will refresh and pass new data, button text will update
        setIsGenerating(false);
      } catch (error) {
        console.error('Error generating week:', error);
        backendRespondedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setProgress(0);
        setIsGenerating(false);
        // Error handling can be added here (e.g., show error banner)
      }
    } else if (canNavigate) {
      onViewWeek();
    }
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header with Golden Gradient */}
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>WEEK {data?.weekNumber ?? 0}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >

          {weekStatus === 'completed' && (
            <View style={styles.stars}>
              {[...Array(3)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < (data?.stars ?? 0) ? 'star' : 'star-outline'}
                  size={32}
                  color={colors.warning}
                />
              ))}
            </View>
          )}

          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              {data?.completedWorkouts ?? 0} / {data?.totalWorkouts ?? 0} workouts completed
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(0, Math.min(100, data?.completionPercentage ?? 0))}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {data?.completionPercentage ?? 0}%
            </Text>
          </View>

          {/* Week Metadata Section */}
          <View style={styles.metadataSection}>
            <View style={[styles.metadataItem, styles.metadataItemWithBorder]}>
              <Text style={styles.metadataLabel}>Focus Theme</Text>
              <Text style={[styles.metadataValue, (!data.focusTheme || data.focusTheme?.trim() === '') && styles.metadataPlaceholder]}>
                {data.focusTheme && data.focusTheme.trim() !== '' ? data.focusTheme : 'Not yet generated'}
              </Text>
            </View>
            <View style={[styles.metadataItem, styles.metadataItemWithBorder]}>
              <Text style={styles.metadataLabel}>Primary Goal</Text>
              <Text style={[styles.metadataValue, (!data.primaryGoal || data.primaryGoal?.trim() === '') && styles.metadataPlaceholder]}>
                {data.primaryGoal && data.primaryGoal.trim() !== '' ? data.primaryGoal : 'Not yet generated'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Progression Lever</Text>
              <Text style={[styles.metadataValue, (!data.progressionLever || data.progressionLever?.trim() === '') && styles.metadataPlaceholder]}>
                {data.progressionLever && data.progressionLever.trim() !== '' ? data.progressionLever : 'Not yet generated'}
              </Text>
            </View>
          </View>

          {weekStatus === 'current' && (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusConfig.background,
                },
              ]}
            >
              <Ionicons
                name={statusConfig.icon}
                size={20}
                color={statusConfig.color}
              />
              <Text
                style={[styles.statusText, { color: statusConfig.color }]}
              >
                {statusConfig.label}
              </Text>
            </View>
          )}

          </ScrollView>

          {/* Action Button or Progress Bar */}
          <View style={styles.buttonContainer}>
            {isGenerating ? (
              <View style={styles.generationProgressContainer}>
                <View style={styles.generationProgressBarBackground}>
                  <View
                    style={[
                      styles.generationProgressBarFill,
                      {
                        width: `${Math.max(0, Math.min(100, progress || 0))}%`,
                      },
                    ]}
                  />
                </View>
                <Text testID="generation-progress-text" style={styles.generationProgressText}>
                  {Math.round(Math.max(0, Math.min(100, progress || 0)))}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isButtonDisabled && styles.actionButtonDisabled,
                ]}
                onPress={handleButtonPress}
                disabled={isButtonDisabled}
              >
                <Text style={styles.actionButtonText}>
                  {buttonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    borderBottomWidth: 0,
    flexDirection: 'column',
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  closeButton: {
    padding: 4,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: createColorWithOpacity(colors.text, 0.08),
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  metadataSection: {
    marginBottom: 24,
    gap: 16,
  },
  metadataItem: {
    marginBottom: 12,
    paddingBottom: 12,
  },
  metadataItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: createColorWithOpacity(colors.secondary, 0.8),
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metadataValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  metadataPlaceholder: {
    fontStyle: 'italic',
    color: colors.muted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  actionButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: createColorWithOpacity(colors.secondary, 0.3),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
    letterSpacing: 0.5,
  },
  generationProgressContainer: {
    width: '100%',
  },
  generationProgressBarBackground: {
    height: 8,
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  generationProgressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  generationProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default WeekDetailModal;

