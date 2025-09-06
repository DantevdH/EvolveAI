/**
 * Personal Information screen - Second step of onboarding
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';;
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OnboardingBackground } from '../../components/onboarding';
import { validateAge, validateWeight, validateHeight } from '../../utils/onboardingValidation';
import { convertWeight, convertHeight } from '../../utils/onboardingUtils';
import { colors } from '../../constants/designSystem';

export const PersonalInfoScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleAgeChange = (age: string) => {
    const ageNum = parseInt(age) || 0;
    updateData({ age: ageNum });
    
    // Validate age
    const validation = validateAge(ageNum);
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, age: validation.error! }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.age;
        return newErrors;
      });
    }
  };

  const handleWeightChange = (weight: string) => {
    const weightNum = parseFloat(weight) || 0;
    updateData({ weight: weightNum });
    
    // Validate weight
    const validation = validateWeight(weightNum, state.data.weightUnit);
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, weight: validation.error! }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.weight;
        return newErrors;
      });
    }
  };

  const handleHeightChange = (height: string) => {
    const heightNum = parseFloat(height) || 0;
    updateData({ height: heightNum });
    
    // Validate height
    const validation = validateHeight(heightNum, state.data.heightUnit);
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, height: validation.error! }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.height;
        return newErrors;
      });
    }
  };

  const handleWeightUnitChange = (unit: string) => {
    const currentWeight = state.data.weight;
    const convertedWeight = convertWeight(currentWeight, state.data.weightUnit, unit as 'kg' | 'lbs');
    updateData({ 
      weightUnit: unit as 'kg' | 'lbs',
      weight: convertedWeight
    });
  };

  const handleHeightUnitChange = (unit: string) => {
    const currentHeight = state.data.height;
    const convertedHeight = convertHeight(currentHeight, state.data.heightUnit, unit as 'cm' | 'in');
    updateData({ 
      heightUnit: unit as 'cm' | 'in',
      height: convertedHeight
    });
  };

  const handleGenderChange = (gender: 'Male' | 'Female' | 'Other') => {
    updateData({ gender });
  };

  const UnitToggle: React.FC<{ 
    value: string; 
    options: string[]; 
    onValueChange: (value: string) => void;
  }> = ({ value, options, onValueChange }) => (
    <View style={styles.unitToggle}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.unitButton,
            value === option && styles.unitButtonSelected
          ]}
          onPress={() => onValueChange(option)}
          testID={`unit-${option}`}
        >
          <Text style={[
            styles.unitButtonText,
            value === option && styles.unitButtonTextSelected
          ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <OnboardingBackground />
        
        <OnboardingCard
          title="Personal Information"
          subtitle="Tell us about yourself"
          scrollable={true}
        >
          <View style={styles.content}>
            {/* Age Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.age && styles.textInputError
                ]}
                value={state.data.age.toString()}
                onChangeText={handleAgeChange}
                placeholder="Enter your age"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                keyboardType="numeric"
                maxLength={3}
                testID="age-input"
              />
              {validationErrors.age && (
                <Text style={styles.errorText}>{validationErrors.age}</Text>
              )}
            </View>

            {/* Weight Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight</Text>
              <View style={styles.measurementContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.measurementInput,
                    validationErrors.weight && styles.textInputError
                  ]}
                  value={state.data.weight.toString()}
                  onChangeText={handleWeightChange}
                  placeholder="0"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="decimal-pad"
                  testID="weight-input"
                />
                <UnitToggle
                  value={state.data.weightUnit}
                  options={['kg', 'lbs']}
                  onValueChange={handleWeightUnitChange}
                />
              </View>
              {validationErrors.weight && (
                <Text style={styles.errorText}>{validationErrors.weight}</Text>
              )}
            </View>

            {/* Height Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height</Text>
              <View style={styles.measurementContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.measurementInput,
                    validationErrors.height && styles.textInputError
                  ]}
                  value={state.data.height.toString()}
                  onChangeText={handleHeightChange}
                  placeholder="0"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="decimal-pad"
                  testID="height-input"
                />
                <UnitToggle
                  value={state.data.heightUnit}
                  options={['cm', 'in']}
                  onValueChange={handleHeightUnitChange}
                />
              </View>
              {validationErrors.height && (
                <Text style={styles.errorText}>{validationErrors.height}</Text>
              )}
            </View>

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {(['Male', 'Female', 'Other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      state.data.gender === gender && styles.genderButtonSelected
                    ]}
                    onPress={() => handleGenderChange(gender)}
                    testID={`gender-${gender.toLowerCase()}`}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      state.data.gender === gender && styles.genderButtonTextSelected
                    ]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <OnboardingNavigation />
        </OnboardingCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  textInputError: {
    borderColor: colors.error,
    backgroundColor: colors.primaryTransparentLight,
  },
  measurementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  measurementInput: {
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unitButtonSelected: {
    backgroundColor: colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  unitButtonTextSelected: {
    color: colors.text,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  genderButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  genderButtonTextSelected: {
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
});
