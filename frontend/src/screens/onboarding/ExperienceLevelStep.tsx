/**
 * Experience Level screen - Fifth step of onboarding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { ExperienceLevelStepProps, experienceLevels } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

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

  const renderCompactOption = (level: any) => {
    const isSelected = localLevel === level.value;
    const iconName = getLevelIcon(level.value);
    
    return (
      <TouchableOpacity
        key={level.value}
        style={[
          styles.compactOption,
          isSelected && styles.compactOptionSelected
        ]}
        onPress={() => handleLevelChange([level.value])}
        activeOpacity={0.8}
      >
        <View style={styles.compactOptionContent}>
          <IconSymbol
            name={iconName}
            size={20}
            color={isSelected ? colors.text : colors.primary}
            style={styles.compactOptionIcon}
          />
          <View style={styles.compactOptionText}>
            <Text style={[
              styles.compactOptionTitle,
              isSelected && styles.compactOptionTitleSelected
            ]}>
              {level.title}
            </Text>
            <Text style={[
              styles.compactOptionDescription,
              isSelected && styles.compactOptionDescriptionSelected
            ]} numberOfLines={2}>
              {level.description}
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <IconSymbol
            name="checkmark.circle.fill"
            size={20}
            color={colors.text}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <OnboardingCard
      title="Experience Level"
      subtitle="How would you describe your training experience?"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.contentArea}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <IconSymbol name="chart.bar.fill" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>How experienced are you?</Text>
            <Text style={styles.heroSubtitle}>Understanding your experience level helps us create the perfect plan for your journey</Text>
          </View>

          {/* Experience Level Options */}
          <View style={styles.optionsContainer}>
            <View style={styles.compactOptionsList}>
              {experienceLevels.map(renderCompactOption)}
            </View>
          </View>

        
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
  // Options Section
  optionsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  optionsList: {
    flex: 1,
  },
  compactOptionsList: {
    flex: 1,
    gap: 8,
  },
  compactOption: {
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
    maxHeight: 70,
  },
  compactOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  compactOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactOptionIcon: {
    marginRight: 12,
  },
  compactOptionText: {
    flex: 1,
  },
  compactOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  compactOptionTitleSelected: {
    color: colors.text,
  },
  compactOptionDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 14,
  },
  compactOptionDescriptionSelected: {
    color: colors.text,
  },
  // Info Section
  infoSection: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
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
