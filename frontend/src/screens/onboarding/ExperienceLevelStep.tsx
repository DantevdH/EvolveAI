/**
 * Experience Level screen - Fifth step of onboarding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding/ui';
import { ExperienceLevelStepProps, experienceLevels } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

export const ExperienceLevelStep: React.FC<ExperienceLevelStepProps> = ({
  experienceLevel,
  onExperienceLevelChange,
  isValid,
  onNext,
  onBack,
  isLoading,
  error,
}) => {
  const [localLevel, setLocalLevel] = useState(experienceLevel || 'novice');

  // Notify parent component of default selection on mount
  useEffect(() => {
    if (!experienceLevel || experienceLevel.trim() === '') {
      onExperienceLevelChange('novice');
    }
  }, []); // Empty dependency array to run only once on mount

  const handleLevelChange = (values: string[]) => {
    if (values.length > 0) {
      const selectedLevel = values[0];
      setLocalLevel(selectedLevel);
      onExperienceLevelChange(selectedLevel);
    }
  };

  const handleNext = () => {
    // Ensure we have a valid experience level before proceeding
    const finalLevel = experienceLevel || localLevel || 'novice';
    
    // Make sure the parent has the latest value
    if (finalLevel !== experienceLevel) {
      onExperienceLevelChange(finalLevel);
    }
    
    onNext();
  };

  // Dynamic spacing and sizing based on screen size
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 650;
  const sectionSpacing = isVerySmallScreen ? 8 : isSmallScreen ? 10 : 12;
  const cardPadding = screenWidth < 375 ? 16 : 20;

  const getLevelIcon = (levelValue: string) => {
    switch (levelValue) {
      case 'novice':
        return 'circle.fill'; // Simple circle - starting point
      case 'beginner':
        return 'triangle.fill'; // Triangle - building up
      case 'intermediate':
        return 'diamond.fill'; // Diamond - more refined
      case 'advanced':
        return 'crown.fill'; // Crown - mastery
      default:
        return 'dumbbell.fill';
    }
  };

  const getLevelColor = (levelValue: string) => {
    switch (levelValue) {
      case 'novice':
        return colors.primary;
      case 'beginner':
        return colors.secondary;
      case 'intermediate':
        return colors.tertiary;
      case 'advanced':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  const renderCompactOption = (level: any) => {
    const isSelected = localLevel === level.value;
    const iconName = getLevelIcon(level.value);
    const levelColor = getLevelColor(level.value);
    
    return (
      <TouchableOpacity
        key={level.value}
        style={styles.compactOptionContainer}
        onPress={() => handleLevelChange([level.value])}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <View style={[styles.compactOption, styles.compactOptionSelected, { borderColor: createColorWithOpacity(colors.secondary, 0.45) }]}>
            <View style={styles.compactOptionContent}>
              <View style={[styles.compactOptionIconWrapper, styles.compactOptionIconWrapperSelected]}>
                <IconSymbol
                  name={iconName}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.compactOptionText}>
                <Text style={styles.compactOptionTitleSelected}>
                  {level.title}
                </Text>
                <Text style={styles.compactOptionDescriptionSelected} numberOfLines={2}>
                  {level.description}
                </Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        ) : (
          <View style={styles.compactOption}>
            <View style={styles.compactOptionContent}>
              <View style={styles.compactOptionIconWrapper}>
                <IconSymbol
                  name={iconName}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.compactOptionText}>
                <Text style={styles.compactOptionTitle}>
                  {level.title}
                </Text>
                <Text style={styles.compactOptionDescription} numberOfLines={2}>
                  {level.description}
                </Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingCard
        title="Experience Level"
        subtitle="How would you describe your training experience?"
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 100 }]}>
            {/* Experience Level Options - Gamified */}
            <View style={[styles.optionsContainer, { marginBottom: sectionSpacing }]}>
              <View style={styles.experienceHeader}>
                <View style={styles.experienceHeaderBadge}>
                  <Ionicons name="trophy" size={14} color={colors.primary} />
                  <Text style={styles.experienceLabel}>Experience Level</Text>
                </View>
              </View>
              <View style={styles.compactOptionsList}>
                {experienceLevels.map(renderCompactOption)}
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
            nextDisabled={!isValid}
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
  // Options Section - Gamified
  optionsContainer: {
    marginBottom: 0, // Will be set dynamically
  },
  experienceHeader: {
    marginBottom: 12,
  },
  experienceHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  experienceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  compactOptionsList: {
    gap: 10,
  },
  compactOptionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  compactOption: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 70,
  },
  compactOptionSelected: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.18),
  },
  compactOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactOptionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  compactOptionIconWrapperSelected: {
    backgroundColor: createColorWithOpacity(colors.card, 1),
    borderColor: createColorWithOpacity(colors.secondary, 0.4),
  },
  compactOptionText: {
    flex: 1,
  },
  compactOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  compactOptionTitleSelected: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  compactOptionDescription: {
    fontSize: 12,
    color: createColorWithOpacity(colors.primary, 0.65),
    lineHeight: 16,
    fontWeight: '400',
  },
  compactOptionDescriptionSelected: {
    fontSize: 12,
    color: createColorWithOpacity(colors.primary, 0.75),
    lineHeight: 16,
    fontWeight: '500',
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
