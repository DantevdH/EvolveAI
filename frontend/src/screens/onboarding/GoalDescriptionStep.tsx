import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { GoalDescriptionStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

export const GoalDescriptionStep: React.FC<GoalDescriptionStepProps> = ({
  goalDescription,
  onGoalDescriptionChange,
  isValid,
  onNext,
  onBack,
  isLoading,
  error,
}) => {
  const [localGoal, setLocalGoal] = useState(goalDescription || '');

  const handleGoalChange = (text: string) => {
    setLocalGoal(text);
    onGoalDescriptionChange(text);
  };

  const handleNext = () => {
    if (!isValid) {
      Alert.alert('Error', 'Please describe your fitness goal');
      return;
    }
    onNext();
  };

  const isGoalValid = localGoal.trim().length >= 10;

  return (
    <OnboardingCard
      title="What's your fitness goal?"
      subtitle="Tell us what you want to achieve so we can create the perfect plan for you"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.contentArea}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <IconSymbol name="target" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>What drives you?</Text>
            <Text style={styles.heroSubtitle}>Share your fitness aspirations and we'll create a plan that gets you there</Text>
          </View>

          {/* Goal Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <IconSymbol name="pencil.and.outline" size={16} color={colors.primary} />
              <Text style={styles.inputLabel}>Your fitness goal</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  localGoal.length > 0 && localGoal.length < 10 && styles.textInputError,
                  localGoal.length >= 10 && styles.textInputSuccess
                ]}
                value={localGoal}
                onChangeText={handleGoalChange}
                placeholder="Tell us about your fitness journey... What do you want to achieve?"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {localGoal.length >= 10 && (
                <View style={styles.successIcon}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success || colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.inputFooter}>
              <Text style={styles.characterCount}>
                {localGoal.length}/500 characters
              </Text>
              {localGoal.length > 0 && localGoal.length < 10 && (
                <Text style={styles.validationText}>
                  Please provide more details (at least 10 characters)
                </Text>
              )}
            </View>
          </View>

          {/* Quick Goal Suggestions */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Popular goals</Text>
            <View style={styles.suggestionsGrid}>
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleGoalChange("I want to lose weight and get in better shape")}
              >
                <IconSymbol name="figure.walk" size={14} color={colors.primary} />
                <Text style={styles.suggestionText}>Weight Loss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleGoalChange("I want to build muscle and get stronger")}
              >
                <IconSymbol name="dumbbell" size={14} color={colors.primary} />
                <Text style={styles.suggestionText}>Build Muscle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleGoalChange("I want to improve my cardiovascular fitness and endurance")}
              >
                <IconSymbol name="heart.fill" size={14} color={colors.primary} />
                <Text style={styles.suggestionText}>Cardio Fitness</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleGoalChange("I want to run a 5K")}
              >
                <IconSymbol name="figure.run" size={14} color={colors.primary} />
                <Text style={styles.suggestionText}>Running</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <OnboardingNavigation
          onNext={handleNext}
          onBack={onBack}
          nextTitle="Continue"
          backTitle="Back"
          nextDisabled={!isGoalValid}
          showBack={!!onBack}
          variant="dual"
        />
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contentArea: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  // Input Section
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    padding: 20,
    paddingRight: 50,
    fontSize: 16,
    color: colors.text,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: colors.error,
  },
  textInputSuccess: {
    borderColor: colors.success || colors.primary,
  },
  successIcon: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  inputFooter: {
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  validationText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  // Suggestions Section
  suggestionsSection: {
    marginBottom: 40,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  // Error Section
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground || `${colors.error}15`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 6,
    flex: 1,
  },
});
