import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding/ui';
import { GoalDescriptionStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

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
      Alert.alert('Error', 'Please describe your training goal');
      return;
    }
    onNext();
  };

  const isGoalValid = localGoal.trim().length >= 10;

  // Dynamic spacing and sizing based on screen size
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 650;
  const sectionSpacing = isVerySmallScreen ? 8 : isSmallScreen ? 10 : 12;
  const cardPadding = screenWidth < 375 ? 16 : 20;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingCard
        title="Your training goal"
        subtitle="Tell us what you want to achieve so we can create the perfect plan for you"
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 100 }]}>
            {/* Goal Input Section - Gamified */}
            <View style={[styles.inputSection, { marginBottom: sectionSpacing }]}>
              <View style={styles.inputHeader}>
                <View style={styles.inputHeaderBadge}>
                  <Ionicons name="flag" size={14} color={colors.primary} />
                  <Text style={styles.inputLabel}>YOUR TRAINING GOAL</Text>
                </View>
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
                  placeholder="Tell us about your training journey... What do you want to achieve?"
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                {/* No success icon, only validation text */}
              </View>
              <View style={styles.inputFooter}>
                <View style={styles.footerRow}>
                  <Text style={styles.characterCount}>
                    {localGoal.length}/500 characters
                  </Text>
                </View>
                {/* Validation container with fixed height to prevent layout shift */}
                <View style={styles.validationWrapper}>
                  {localGoal.length > 0 && localGoal.length < 10 && (
                    <View style={styles.validationContainer}>
                      <Ionicons name="alert-circle" size={10} color={colors.primary} />
                      <Text style={styles.validationText}>
                        Please provide more details (at least 10 characters)
                      </Text>
                    </View>
                  )}
                  {localGoal.length >= 10 && (
                    <View style={styles.validationContainer}>
                      <Text style={styles.validationTextSuccess}>
                        Goal description is valid
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Goal Suggestions - Gamified */}
            <View style={[styles.suggestionsSection, { marginBottom: sectionSpacing }]}>
              <Text style={styles.suggestionsTitle}>Popular goals</Text>
              <View style={styles.suggestionsGrid}>
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleGoalChange("I want to lose weight and get in better shape")}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionChipGradient}>
                    <IconSymbol name="figure.walk" size={14} color={colors.primary} />
                    <Text style={styles.suggestionText}>Weight Loss</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleGoalChange("I want to build muscle mass and strength")}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionChipGradient}>
                    <IconSymbol name="bolt.fill" size={14} color={colors.primary} />
                    <Text style={styles.suggestionText}>Build Muscle</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleGoalChange("I want to improve my endurance and cardiovascular health")}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionChipGradient}>
                    <IconSymbol name="figure.run" size={14} color={colors.primary} />
                    <Text style={styles.suggestionText}>Endurance</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleGoalChange("I want to stay active and live a healthier lifestyle")}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionChipGradient}>
                    <IconSymbol name="heart.fill" size={14} color={colors.primary} />
                    <Text style={styles.suggestionText}>Stay Active</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.suggestionChip, styles.suggestionChipSingle]}
                  onPress={() => handleGoalChange("I want to improve my perfomance in football")}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionChipGradient}>
                    <IconSymbol name="flame.fill" size={14} color={colors.primary} />
                    <Text style={styles.suggestionText}>Football</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <IconSymbol name="exclamationmark.triangle.fill" size={12} color={colors.error} />
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  // Input Section - Gamified
  inputSection: {
    marginBottom: 0, // Will be set dynamically
  },
  inputHeader: {
    marginBottom: 12,
  },
  inputHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    padding: 16,
    paddingRight: 48,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    minHeight: 140,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInputError: {
    borderColor: colors.primary,
    backgroundColor: createColorWithOpacity(colors.primary, 0.2),
  },
  textInputSuccess: {
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  successIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputFooter: {
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  validationWrapper: {
    minHeight: 20,
    marginTop: 4,
    justifyContent: 'center',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  validationTextSuccess: {
    fontSize: 11,
    color: colors.tertiary,
    fontWeight: '600',
  },
  // Suggestions Section - Gamified
  suggestionsSection: {
    marginBottom: 0, // Will be set dynamically
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  suggestionChip: {
    flexBasis: '48%',
    flexGrow: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionChipSingle: {
    alignSelf: 'center',
  },
  suggestionChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Error Section - Gamified
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.error, 0.2),
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.error, 0.3),
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 6,
    flex: 1,
    fontWeight: '600',
  },
});
