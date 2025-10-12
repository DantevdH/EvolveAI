import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { CoolSlider } from '../../components/onboarding/CoolSlider';
import { PersonalInfo, PersonalInfoStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

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
  
  const [localInfo, setLocalInfo] = useState<PersonalInfo>(
    personalInfo || {
      username: `user_${Date.now()}`, // Generate unique username
      age: 25,
      weight: 70,
      height: 175,
      weight_unit: 'kg',
      height_unit: 'cm',
      measurement_system: 'metric',
      gender: 'male',
      goal_description: '',
    }
  );

  const handleFieldChange = (field: keyof PersonalInfo, value: any) => {
    const updatedInfo = { ...localInfo, [field]: value };
    setLocalInfo(updatedInfo);
    onPersonalInfoChange(updatedInfo);
  };

  const handleMetricsSystemChange = (system: 'european' | 'us') => {
    setMetricsSystem(system);
    
    let updatedInfo = { ...localInfo };
    
    if (system === 'us') {
      // Convert to US units
      updatedInfo.weight_unit = 'lbs';
      updatedInfo.height_unit = 'in';
      updatedInfo.measurement_system = 'imperial';
      updatedInfo.weight = Math.round(localInfo.weight * 2.20462); // kg to lbs
      updatedInfo.height = Math.round(localInfo.height * 0.393701); // cm to inches
    } else {
      // Convert to European units
      updatedInfo.weight_unit = 'kg';
      updatedInfo.height_unit = 'cm';
      updatedInfo.measurement_system = 'metric';
      updatedInfo.weight = Math.round(localInfo.weight / 2.20462); // lbs to kg
      updatedInfo.height = Math.round(localInfo.height / 0.393701); // inches to cm
    }
    
    setLocalInfo(updatedInfo);
    onPersonalInfoChange(updatedInfo);
  };

  // Trigger initial validation when component mounts with default values
  useEffect(() => {
    onPersonalInfoChange(localInfo);
  }, []); // Empty dependency array means this runs once on mount

  const handleNext = () => {
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    onNext();
  };

  return (
    <OnboardingCard
      title="Tell us about yourself"
      subtitle="We need some basic information to create your personalized plan"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.contentArea}>
          {/* Gender Section - Compact horizontal layout */}
          <View style={[styles.section, { marginBottom: 16 }]}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  localInfo.gender === 'male' && styles.genderOptionActive
                ]}
                onPress={() => handleFieldChange('gender', 'male')}
              >
                <IconSymbol name="person.fill" size={16} color={localInfo.gender === 'male' ? colors.text : colors.muted} />
                <Text style={[
                  styles.genderOptionText,
                  localInfo.gender === 'male' && styles.genderOptionTextActive
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  localInfo.gender === 'female' && styles.genderOptionActive
                ]}
                onPress={() => handleFieldChange('gender', 'female')}
              >
                <IconSymbol name="person.fill" size={16} color={localInfo.gender === 'female' ? colors.text : colors.muted} />
                <Text style={[
                  styles.genderOptionText,
                  localInfo.gender === 'female' && styles.genderOptionTextActive
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  localInfo.gender === 'other' && styles.genderOptionActive
                ]}
                onPress={() => handleFieldChange('gender', 'other')}
              >
                <IconSymbol name="person.2.fill" size={16} color={localInfo.gender === 'other' ? colors.text : colors.muted} />
                <Text style={[
                  styles.genderOptionText,
                  localInfo.gender === 'other' && styles.genderOptionTextActive
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Age, Weight, Height in a clean layout */}
          <View style={styles.metricsContainer}>
            {/* Age */}
            <View style={styles.metricSection}>
              <Text style={styles.metricLabel}>Age</Text>
              <CoolSlider
                value={localInfo.age}
                onValueChange={(value) => handleFieldChange('age', value)}
                min={13}
                max={100}
                step={1}
                unit="years"
                title=""
                style={styles.sliderStyle}
              />
            </View>

            {/* Weight */}
            <View style={styles.metricSection}>
              <Text style={styles.metricLabel}>Weight</Text>
              <CoolSlider
                value={localInfo.weight}
                onValueChange={(value) => handleFieldChange('weight', value)}
                min={metricsSystem === 'european' ? 30 : 66}
                max={metricsSystem === 'european' ? 200 : 440}
                step={1}
                unit={localInfo.weight_unit}
                title=""
                style={styles.sliderStyle}
              />
            </View>

            {/* Height */}
            <View style={styles.metricSection}>
              <Text style={styles.metricLabel}>Height</Text>
              <CoolSlider
                value={localInfo.height}
                onValueChange={(value) => handleFieldChange('height', value)}
                min={metricsSystem === 'european' ? 100 : 39}
                max={metricsSystem === 'european' ? 250 : 98}
                step={1}
                unit={localInfo.height_unit}
                title=""
                style={styles.sliderStyle}
              />
            </View>

            {/* Metrics System Toggle - Moved to bottom for better space usage */}
            <View style={styles.metricsToggleSection}>
              <Text style={styles.metricsToggleLabel}>Measurement System</Text>
              <View style={styles.metricsToggle}>
                <TouchableOpacity
                  style={[
                    styles.metricsToggleButton,
                    metricsSystem === 'european' && styles.metricsToggleButtonActive
                  ]}
                  onPress={() => handleMetricsSystemChange('european')}
                >
                  <Text style={[
                    styles.metricsToggleButtonText,
                    metricsSystem === 'european' && styles.metricsToggleButtonTextActive
                  ]}>
                    Metric
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.metricsToggleButton,
                    metricsSystem === 'us' && styles.metricsToggleButtonActive
                  ]}
                  onPress={() => handleMetricsSystemChange('us')}
                >
                  <Text style={[
                    styles.metricsToggleButtonText,
                    metricsSystem === 'us' && styles.metricsToggleButtonTextActive
                  ]}>
                    Imperial
                  </Text>
                </TouchableOpacity>
              </View>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0, // Remove since OnboardingCard already has padding
    paddingVertical: 0,
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1, // Allow content to take available space
    paddingBottom: 10,
  },
  // Section Layout
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'left',
  },
  // Gender Section
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  genderOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  genderOptionTextActive: {
    color: colors.text,
  },
  // Clean Metrics Layout
  metricsContainer: {
    gap: 6,
  },
  metricSection: {
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 0,
    textAlign: 'left',
  },
  // Metrics Toggle
  metricsToggleSection: {
    marginBottom: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  metricsToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  metricsToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    height: 28,
    minWidth: 160,
  },
  metricsToggleButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  metricsToggleButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  metricsToggleButtonTextActive: {
    color: colors.text,
  },
  // CoolSlider Style
  sliderStyle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 4,
    flex: 0,
    marginTop: 0,
  },
  // Error Section
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground || `${colors.error}15`,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginLeft: 4,
    flex: 1,
  },
});
