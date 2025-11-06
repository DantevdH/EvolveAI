import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { CoolSlider } from '../../components/onboarding/CoolSlider';
import { PersonalInfo, PersonalInfoStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
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
    // Only convert if switching to a different system
    if ((system === 'us' && localInfo.measurement_system === 'imperial') ||
        (system === 'european' && localInfo.measurement_system === 'metric')) {
      return; // Already in this system
    }

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
        title="Personalize your plan"
        subtitle="Tell us about yourself"
        scrollable={false}
      >
        <View style={styles.container}>
          <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 100 }]}>
          {/* Age, Weight, Height in a clean layout */}
          <View style={styles.metricsContainer}>
            {/* Age - Primary Color */}
            <View style={styles.metricSection}>
              <View style={styles.metricHeader}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.metricHeaderBadge}
                >
                  <Ionicons name="calendar" size={14} color={colors.text} />
                  <Text style={styles.metricLabel}>Age</Text>
                </LinearGradient>
              </View>
              <CoolSlider
                value={localInfo.age}
                onValueChange={(value) => handleFieldChange('age', value)}
                min={13}
                max={100}
                step={1}
                unit="years"
                title=""
                style={styles.sliderStyle}
                color={colors.primary}
              />
            </View>

            {/* Metrics System Toggle - Gamified - Positioned between Age and Weight */}
            <View style={styles.metricsToggleSection}>
              {/* <Text style={styles.metricsToggleLabel}>Measurement System</Text> */}
              <View style={styles.metricsToggle}>
                <TouchableOpacity
                  style={styles.metricsToggleButtonContainer}
                  onPress={() => handleMetricsSystemChange('european')}
                  activeOpacity={0.7}
                >
                  {metricsSystem === 'european' ? (
                    <LinearGradient
                      colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.metricsToggleButtonGradient}
                    >
                      <Text style={styles.metricsToggleButtonTextActive} numberOfLines={1}>Metric</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.metricsToggleButton}>
                      <Text style={styles.metricsToggleButtonText} numberOfLines={1}>Metric</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.metricsToggleButtonContainer}
                  onPress={() => handleMetricsSystemChange('us')}
                  activeOpacity={0.7}
                >
                  {metricsSystem === 'us' ? (
                    <LinearGradient
                      colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.metricsToggleButtonGradient}
                    >
                      <Text style={styles.metricsToggleButtonTextActive} numberOfLines={1}>Imperial</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.metricsToggleButton}>
                      <Text style={styles.metricsToggleButtonText} numberOfLines={1}>Imperial</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight - Secondary Color */}
            <View style={styles.metricSection}>
              <View style={styles.metricHeader}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.secondary, 0.3), createColorWithOpacity(colors.secondary, 0.2)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.metricHeaderBadge}
                >
                  <Ionicons name="scale" size={14} color={colors.text} />
                  <Text style={styles.metricLabel}>Weight</Text>
                </LinearGradient>
              </View>
              <CoolSlider
                value={localInfo.weight}
                onValueChange={(value) => handleFieldChange('weight', value)}
                min={metricsSystem === 'european' ? 30 : 66}
                max={metricsSystem === 'european' ? 200 : 440}
                step={1}
                unit={localInfo.weight_unit}
                title=""
                style={styles.sliderStyle}
                color={colors.secondary}
              />
            </View>

            {/* Height - Tertiary Color */}
            <View style={styles.metricSection}>
              <View style={styles.metricHeader}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.tertiary, 0.3), createColorWithOpacity(colors.tertiary, 0.2)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.metricHeaderBadge}
                >
                  <Ionicons name="resize" size={14} color={colors.text} />
                  <Text style={styles.metricLabel}>Height</Text>
                </LinearGradient>
              </View>
              <CoolSlider
                value={localInfo.height}
                onValueChange={(value) => handleFieldChange('height', value)}
                min={metricsSystem === 'european' ? 100 : 39}
                max={metricsSystem === 'european' ? 250 : 98}
                step={1}
                unit={localInfo.height_unit}
                title=""
                style={styles.sliderStyle}
                color={colors.tertiary}
              />
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
    minHeight: 0, // Important for flex children to shrink
    justifyContent: 'space-between', // Space between content and navigation
  },
  contentArea: {
    flex: 1,
    paddingVertical: 8, // Reduced from 12
    justifyContent: 'flex-start',
    minHeight: 0, // Allows flex shrinking
  },
  // Section Layout
  section: {
    marginBottom: 0, // Will be set dynamically
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  // Gender Section - Gamified with consistent sizing
  genderOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOptionContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 70, // Fixed minimum height for consistency
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 70, // Match container height
  },
  genderOptionGradient: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 70, // Match container height
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text, // Changed from muted to text for better visibility
  },
  genderOptionTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  // Clean Metrics Layout - Compact and fixed
  metricsContainer: {
    gap: 8, // Reduced from 10
    marginTop: 0, // Reduced from 4
  },
  metricSection: {
    marginBottom: 0, // Removed - gap handles spacing
  },
  metricHeader: {
    marginBottom: 6, // Reduced from 12 - less space between label and value
  },
  metricHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  // Metrics Toggle - Gamified with visible text - Compact
  metricsToggleSection: {
    marginBottom: 6, // Reduced from 8
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2, // Reduced from 6
    width: '100%',
    paddingHorizontal: 0, // Remove any horizontal padding that might offset
  },
  metricsToggleLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    width: '100%',
    alignSelf: 'center',
  },
  metricsToggle: {
    flexDirection: 'row',
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderRadius: 10, // Reduced from 12
    padding: 1.5, // Reduced from 2
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    width: 220, // Reduced from 280
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsToggleButtonContainer: {
    flex: 1,
    borderRadius: 8, // Reduced from 10
    overflow: 'hidden',
  },
  metricsToggleButton: {
    paddingVertical: 4, // Reduced from 6
    paddingHorizontal: 2, // Reduced from 4
    borderRadius: 8, // Reduced from 10
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  metricsToggleButtonGradient: {
    paddingVertical: 4, // Reduced from 6
    paddingHorizontal: 2, // Reduced from 4
    borderRadius: 8, // Reduced from 10
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsToggleButtonText: {
    fontSize: 12, // Reduced from 14
    fontWeight: '700',
    color: '#FFFFFF', // Explicit white color for visibility
    textAlign: 'center',
    includeFontPadding: false, // Remove extra padding
    textAlignVertical: 'center',
    lineHeight: 16, // Reduced from 18
  },
  metricsToggleButtonTextActive: {
    fontSize: 12, // Reduced from 14
    fontWeight: '800',
    color: '#FFFFFF', // Explicit white color for visibility
    textAlign: 'center',
    includeFontPadding: false, // Remove extra padding
    textAlignVertical: 'center',
    lineHeight: 16, // Reduced from 18
  },
  // CoolSlider Style - No background
  sliderStyle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    padding: 4,
    flex: 0,
    marginTop: 0,
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
