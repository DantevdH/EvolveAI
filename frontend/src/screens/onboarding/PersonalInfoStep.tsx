'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding/ui';
import { CoolSlider } from '../../components/onboarding/inputs';
import { PersonalInfo, PersonalInfoStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  personalInfo,
  onPersonalInfoChange,
  isValid,
  onNext,
  onBack,
  isLoading,
  error,
}) => {
  const [metricsSystem, setMetricsSystem] = useState<'european' | 'us'>(
    personalInfo?.measurement_system === 'imperial' ? 'us' : 'european'
  );
  
  // Ensure default values are used if personalInfo is missing or has invalid values
  const getDefaultPersonalInfo = (): PersonalInfo => ({
      username: `user_${Date.now()}`, // Generate unique username
      age: 25,
      weight: 70,
      height: 175,
      weight_unit: 'kg',
      height_unit: 'cm',
      measurement_system: 'metric',
      gender: 'male',
      goal_description: '',
  });

  const [localInfo, setLocalInfo] = useState<PersonalInfo>(() => {
    if (!personalInfo) {
      return getDefaultPersonalInfo();
    }
    // Validate and use defaults for invalid values
    return {
      username: personalInfo.username || `user_${Date.now()}`,
      age: (personalInfo.age && !isNaN(personalInfo.age) && personalInfo.age > 0) ? personalInfo.age : 25,
      weight: (personalInfo.weight && !isNaN(personalInfo.weight) && personalInfo.weight > 0) ? personalInfo.weight : 70,
      height: (personalInfo.height && !isNaN(personalInfo.height) && personalInfo.height > 0) ? personalInfo.height : 175,
      weight_unit: personalInfo.weight_unit || 'kg',
      height_unit: personalInfo.height_unit || 'cm',
      measurement_system: personalInfo.measurement_system || 'metric',
      gender: personalInfo.gender || 'male',
      goal_description: personalInfo.goal_description || '',
    };
  });

  const handleFieldChange = (field: keyof PersonalInfo, value: any) => {
    const updatedInfo = { ...localInfo, [field]: value };
    setLocalInfo(updatedInfo);
    onPersonalInfoChange(updatedInfo);
  };

  const handleMetricsSystemChange = (system: 'european' | 'us') => {
    if (system === 'us' && metricsSystem === 'us') return;
    if (system === 'european' && metricsSystem === 'european') return;

    setMetricsSystem(system);
    let updatedInfo = { ...localInfo };

    if (system === 'us') {
      updatedInfo.weight_unit = 'lbs';
      updatedInfo.height_unit = 'in';
      updatedInfo.measurement_system = 'imperial';
      updatedInfo.weight = Math.round(localInfo.weight * 2.20462);
      updatedInfo.height = Math.round(localInfo.height * 0.393701);
    } else {
      updatedInfo.weight_unit = 'kg';
      updatedInfo.height_unit = 'cm';
      updatedInfo.measurement_system = 'metric';
      updatedInfo.weight = Math.round(localInfo.weight / 2.20462);
      updatedInfo.height = Math.round(localInfo.height / 0.393701);
    }

    setLocalInfo(updatedInfo);
    onPersonalInfoChange(updatedInfo);
  };

  useEffect(() => {
    onPersonalInfoChange(localInfo);
  }, []);

  const handleNext = () => {
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    onNext();
  };

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 650;
  const sectionSpacing = isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16;
  const cardPadding = screenWidth < 375 ? 16 : 20;

  const renderMetricCard = (
    label: string,
    icon: string,
    slider: React.ReactNode,
    helper?: React.ReactNode,
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeaderRow}>
        <View style={styles.metricHeaderBadge}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={colors.primary} />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        {helper}
      </View>
      <View style={styles.metricSliderBody}>{slider}</View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingCard
        title="Personalize your plan"
        subtitle="Tell us about yourself"
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 96 }] }>
            <View style={[styles.metricsContainer, { gap: sectionSpacing }] }>
              {renderMetricCard(
                'Age',
                'calendar',
                (
                  <CoolSlider
                    value={localInfo.age}
                    onValueChange={(value) => handleFieldChange('age', value)}
                    min={13}
                    max={100}
                    step={1}
                    unit="years"
                    title=""
                    color={colors.secondary}
                  />
                )
              )}

              {renderMetricCard(
                'Weight',
                'scale',
                (
                  <CoolSlider
                    value={localInfo.weight}
                    onValueChange={(value) => handleFieldChange('weight', value)}
                    min={metricsSystem === 'european' ? 30 : 66}
                    max={metricsSystem === 'european' ? 200 : 440}
                    step={1}
                    unit={localInfo.weight_unit}
                    title=""
                    color={colors.secondary}
                  />
                ),
                (
                  <View style={styles.toggleGroup}>
                    {(['european', 'us'] as const).map(system => (
                      <TouchableOpacity
                        key={system}
                        style={[
                          styles.toggleChip,
                          metricsSystem === system && styles.toggleChipActive,
                        ]}
                        onPress={() => handleMetricsSystemChange(system)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.toggleChipText,
                            metricsSystem === system && styles.toggleChipTextActive,
                          ]}
                        >
                          {system === 'european' ? 'Metric' : 'Imperial'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}

              {renderMetricCard(
                'Height',
                'move',
                (
                  <CoolSlider
                    value={localInfo.height}
                    onValueChange={(value) => handleFieldChange('height', value)}
                    min={metricsSystem === 'european' ? 100 : 39}
                    max={metricsSystem === 'european' ? 250 : 98}
                    step={1}
                    unit={localInfo.height_unit}
                    title=""
                    color={colors.secondary}
                  />
                )
              )}
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
  metricsContainer: {
    flexDirection: 'column',
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricSliderBody: {
    marginTop: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    backgroundColor: colors.card,
  },
  toggleChipActive: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.18),
    borderColor: createColorWithOpacity(colors.secondary, 0.55),
  },
  toggleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  toggleChipTextActive: {
    color: colors.primary,
  },
  sliderStyle: {
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.error, 0.2),
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
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
