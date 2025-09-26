import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { OnboardingCard } from './OnboardingCard';
import { OnboardingNavigation } from './OnboardingNavigation';
import { PersonalInfo, PersonalInfoStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth - 80;

// Simple Slider Component
const SimpleSlider: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}> = ({ value, onValueChange, min, max, step }) => {
  const thumbPosition = useRef(new Animated.Value(0)).current;

  const getPositionFromValue = (val: number) => {
    const percentage = (val - min) / (max - min);
    return percentage * (SLIDER_WIDTH - 20);
  };

  const getValueFromPosition = (position: number) => {
    const percentage = position / (SLIDER_WIDTH - 20);
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  };

  useEffect(() => {
    const position = getPositionFromValue(value);
    thumbPosition.setValue(position);
  }, [value]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const currentPosition = getPositionFromValue(value);
      const newPosition = Math.max(0, Math.min(SLIDER_WIDTH - 20, currentPosition + gestureState.dx));
      const newValue = getValueFromPosition(newPosition);
      onValueChange(newValue);
      thumbPosition.setValue(newPosition);
    },
  });

  const progressPercentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${progressPercentage}%` }]} />
      </View>
      <Animated.View 
        style={[styles.thumb, { transform: [{ translateX: thumbPosition }] }]}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  personalInfo,
  onPersonalInfoChange,
  isValid,
  onNext,
  onBack,
  isLoading,
  error,
}) => {
  const [localInfo, setLocalInfo] = useState<PersonalInfo>(
    personalInfo || {
      username: '',
      age: 25,
      weight: 70,
      height: 175,
      weight_unit: 'kg',
      height_unit: 'cm',
      gender: 'male',
      goal_description: '',
    }
  );

  const handleFieldChange = (field: keyof PersonalInfo, value: any) => {
    const updatedInfo = { ...localInfo, [field]: value };
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
          <View style={styles.section}>
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
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Age</Text>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{localInfo.age}</Text>
                  <Text style={styles.valueUnit}>years</Text>
                </View>
                <View style={styles.unitTogglePlaceholder} />
              </View>
              <SimpleSlider
                value={localInfo.age}
                onValueChange={(value) => handleFieldChange('age', value)}
                min={13}
                max={100}
                step={1}
              />
            </View>

            {/* Weight */}
            <View style={styles.metricSection}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Weight</Text>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{localInfo.weight}</Text>
                  <Text style={styles.valueUnit}>{localInfo.weight_unit}</Text>
                </View>
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      localInfo.weight_unit === 'kg' && styles.unitButtonActive
                    ]}
                    onPress={() => handleFieldChange('weight_unit', 'kg')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      localInfo.weight_unit === 'kg' && styles.unitButtonTextActive
                    ]}>
                      kg
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      localInfo.weight_unit === 'lbs' && styles.unitButtonActive
                    ]}
                    onPress={() => handleFieldChange('weight_unit', 'lbs')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      localInfo.weight_unit === 'lbs' && styles.unitButtonTextActive
                    ]}>
                      lbs
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <SimpleSlider
                value={localInfo.weight}
                onValueChange={(value) => handleFieldChange('weight', value)}
                min={30}
                max={200}
                step={1}
              />
            </View>

            {/* Height */}
            <View style={styles.metricSection}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Height</Text>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{localInfo.height}</Text>
                  <Text style={styles.valueUnit}>{localInfo.height_unit}</Text>
                </View>
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      localInfo.height_unit === 'cm' && styles.unitButtonActive
                    ]}
                    onPress={() => handleFieldChange('height_unit', 'cm')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      localInfo.height_unit === 'cm' && styles.unitButtonTextActive
                    ]}>
                      cm
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      localInfo.height_unit === 'in' && styles.unitButtonActive
                    ]}
                    onPress={() => handleFieldChange('height_unit', 'in')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      localInfo.height_unit === 'in' && styles.unitButtonTextActive
                    ]}>
                      in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <SimpleSlider
                value={localInfo.height}
                onValueChange={(value) => handleFieldChange('height', value)}
                min={100}
                max={250}
                step={1}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentArea: {
    flex: 1,
  },
  // Section Layout
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
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
    gap: 28,
  },
  metricSection: {
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 60,
    textAlign: 'left',
  },
  // Value Display
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
  },
  valueUnit: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  // Unit Toggle
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    height: 32,
    minWidth: 70,
  },
  unitTogglePlaceholder: {
    height: 32,
    minWidth: 70,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
  },
  unitButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  unitButtonTextActive: {
    color: colors.text,
  },
  // Slider Styles
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: 16,
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  track: {
    height: 3,
    backgroundColor: colors.inputBorder,
    borderRadius: 2,
    position: 'relative',
  },
  progress: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
