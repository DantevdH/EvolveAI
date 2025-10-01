import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { TrainingPlanOutline, DailyTraining } from '../../types/onboarding';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { AILoadingScreen } from '../../components/shared/AILoadingScreen';

interface TrainingPlanOutlineStepProps {
  outline: TrainingPlanOutline | null;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
  error?: string;
  username?: string;
}

export const TrainingPlanOutlineStep: React.FC<TrainingPlanOutlineStepProps> = ({
  outline,
  feedback,
  onFeedbackChange,
  onNext,
  onPrevious,
  isLoading,
  error,
  username,
}) => {
  const [viewMode, setViewMode] = useState<'overview' | 'week'>('overview');
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [showAIIntro, setShowAIIntro] = useState(true);

  // Reset AI intro when outline loads
  React.useEffect(() => {
    if (outline) {
      setShowAIIntro(true);
    }
  }, [outline]);

  if (isLoading) {
    return (
      <AILoadingScreen 
        username={username}
        analysisPhase="outline"
      />
    );
  }

  if (!outline) {
    return (
      <OnboardingCard
        title="No Outline Available"
        subtitle="No training plan outline was generated"
        scrollable={true}
      >
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>📋</ThemedText>
          <ThemedText style={styles.errorTitle}>No outline available</ThemedText>
          <ThemedText style={styles.errorMessage}>
            No training plan outline was generated. Please try again.
          </ThemedText>
        </View>
      </OnboardingCard>
    );
  }

  // Show AI intro after outline is generated
  if (showAIIntro && outline) {
    return (
      <AILoadingScreen 
        username={username}
        analysisPhase="outline"
        showContinueButton={true}
        onContinue={() => setShowAIIntro(false)}
      />
    );
  }

  const currentWeek = outline.training_periods[currentWeekIndex];

  const goToWeek = (weekIndex: number) => {
    setCurrentWeekIndex(weekIndex);
    setViewMode('week');
  };

  const goBackToOverview = () => {
    setViewMode('overview');
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < outline.training_periods.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const renderDayCard = (day: DailyTraining) => (
    <View key={day.day} style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.trainingName}>{day.training_name}</Text>
      </View>
      
      <Text style={styles.dayDescription}>{day.description}</Text>

      {day.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.tagsSectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {day.tags.map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderOverview = () => (
    <>
      <OnboardingCard
        title={outline.title}
        subtitle={`${outline.duration_weeks} weeks of personalized training`}
        scrollable={true}
      >
        <View style={styles.container}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <IconSymbol name="figure.strengthtraining.traditional" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroSubtitle}>{outline.explanation}</Text>
          </View>

                {/* Training Periods Grid */}
                <View style={styles.weeksSection}>
                  <Text style={styles.sectionTitle}>Training Periods</Text>
                  <View style={styles.weeksGrid}>
                    {outline.training_periods.map((period: any, index: number) => (
                      <TouchableOpacity
                        key={period.period_name}
                        style={styles.weekCard}
                        onPress={() => goToWeek(index)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.weekCardContent}>
                          <View style={styles.weekCardHeader}>
                            <Text style={styles.weekNumber}>{period.period_name}</Text>
                            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
                          </View>
                          <Text style={styles.weekFocus}>{period.duration_weeks} weeks</Text>
                          <Text style={styles.weekSessionsCount}>
                            {period.daily_trainings.length} sessions
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

          {/* Feedback Section */}
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackHeader}>
              <IconSymbol name="bubble.left" size={16} color={colors.muted} />
              <Text style={styles.feedbackTitle}>Your Feedback (Optional)</Text>
            </View>
            <Text style={styles.feedbackSubtitle}>
              Let us know if you'd like any adjustments to your training plan
            </Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              placeholder="e.g., 'Can we add more focus on core strength?' or 'Looks great!'"
              value={feedback}
              onChangeText={onFeedbackChange}
              editable={!isLoading}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>
      </OnboardingCard>

      {/* Finalize Plan Button */}
      <View style={styles.finalizeButtonContainer}>
        <TouchableOpacity
          style={[
            styles.finalizeButton,
            (!outline || isLoading) && styles.finalizeButtonDisabled
          ]}
          onPress={onNext}
          disabled={!outline || isLoading}
        >
          <View style={styles.finalizeButtonContent}>
            <Text style={styles.finalizeButtonText}>Finalize Plan</Text>
            <IconSymbol 
              name="checkmark.circle.fill" 
              size={16} 
              color={(!outline || isLoading) ? colors.muted : colors.text} 
            />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderWeekView = () => (
    <>
      <OnboardingCard
        title={currentWeek.period_name}
        subtitle={`${currentWeek.duration_weeks} weeks`}
        scrollable={true}
      >
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={goBackToOverview}>
            <IconSymbol name="chevron.left" size={16} color={colors.primary} />
            <Text style={styles.backButtonText}>Back to Overview</Text>
          </TouchableOpacity>

          {/* Period Header */}
          <View style={styles.weekHeaderSection}>
            <View style={styles.weekHeaderIcon}>
              <IconSymbol name="calendar" size={24} color={colors.primary} />
            </View>
            <Text style={styles.weekHeaderTitle}>{currentWeek.period_name}</Text>
            <Text style={styles.weekHeaderSubtitle}>
              {currentWeek.daily_trainings.length} training sessions
            </Text>
            <Text style={styles.periodExplanation}>{currentWeek.explanation}</Text>
          </View>

          {/* Daily Trainings */}
          <View style={styles.daysSection}>
            {currentWeek.daily_trainings.map((day: any) => renderDayCard(day))}
          </View>

          {/* Period Navigation */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              style={[styles.navButton, currentWeekIndex === 0 && styles.navButtonDisabled]}
              onPress={goToPreviousWeek}
              disabled={currentWeekIndex === 0}
            >
              <IconSymbol name="chevron.left" size={16} color={currentWeekIndex === 0 ? colors.muted : colors.primary} />
              <Text style={[styles.navButtonText, currentWeekIndex === 0 && styles.navButtonTextDisabled]}>
                Previous Period
              </Text>
            </TouchableOpacity>

            <View style={styles.weekDots}>
              {outline.training_periods.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.weekDot,
                    index === currentWeekIndex && styles.weekDotActive
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentWeekIndex === outline.training_periods.length - 1 && styles.navButtonDisabled
              ]}
              onPress={goToNextWeek}
              disabled={currentWeekIndex === outline.training_periods.length - 1}
            >
              <Text style={[
                styles.navButtonText,
                currentWeekIndex === outline.training_periods.length - 1 && styles.navButtonTextDisabled
              ]}>
                Next Period
              </Text>
              <IconSymbol name="chevron.right" size={16} color={currentWeekIndex === outline.training_periods.length - 1 ? colors.muted : colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </OnboardingCard>

      {/* No OnboardingNavigation on week view - user must go back to overview to continue */}
    </>
  );

  return (
    <View style={styles.fullContainer}>
      {viewMode === 'overview' ? renderOverview() : renderWeekView()}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  // Finalize Button
  finalizeButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  finalizeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finalizeButtonDisabled: {
    opacity: 0.5,
  },
  finalizeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  // Hero Section (matching ExperienceLevelStep)
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  // Weeks Section
  weeksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  weeksGrid: {
    gap: 8,
  },
  weekCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 70,
  },
  weekCardContent: {
    flex: 1,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  weekFocus: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 14,
    marginBottom: 4,
  },
  weekSessionsCount: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  // Feedback Section
  feedbackSection: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  feedbackSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 16,
  },
  feedbackInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Week Header Section
  weekHeaderSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weekHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  weekHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  weekHeaderSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  periodExplanation: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Days Section
  daysSection: {
    gap: 12,
    marginBottom: 24,
  },
  dayCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  trainingName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  tagsSection: {
    marginTop: 8,
  },
  tagsSectionTitle: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  // Week Navigation
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  navButtonDisabled: {
    backgroundColor: colors.background,
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  navButtonTextDisabled: {
    color: colors.muted,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inputBorder,
  },
  weekDotActive: {
    backgroundColor: colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});