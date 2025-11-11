/**
 * Slider input component for numeric values in onboarding
 */

import React, { useState, memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors } from '../../../constants/designSystem';

interface SliderInputProps {
  title: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  style?: any;
}

export const SliderInput: React.FC<SliderInputProps> = memo(({
  title,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
  style
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
  };

  const formatDisplayValue = (val: number) => {
    if (formatValue) {
      return formatValue(val);
    }
    return unit ? `${val} ${unit}` : val.toString();
  };

  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.sliderContainer}>
        {/* Decrease Button */}
        <TouchableOpacity
          style={[
            styles.button,
            !canDecrease && styles.buttonDisabled
          ]}
          onPress={handleDecrease}
          disabled={!canDecrease}
          activeOpacity={0.8}
          testID="slider-decrease-button"
        >
          <IconSymbol
            name="minus"
            size={20}
            color={canDecrease ? colors.text : colors.muted}
          />
        </TouchableOpacity>
        
        {/* Value Display */}
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>
            {formatDisplayValue(value)}
          </Text>
        </View>
        
        {/* Increase Button */}
        <TouchableOpacity
          style={[
            styles.button,
            !canIncrease && styles.buttonDisabled
          ]}
          onPress={handleIncrease}
          disabled={!canIncrease}
          activeOpacity={0.8}
          testID="slider-increase-button"
        >
          <IconSymbol
            name="plus"
            size={20}
            color={canIncrease ? colors.text : colors.muted}
          />
        </TouchableOpacity>
      </View>
      
      {/* Range Indicator */}
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeText}>
          {formatDisplayValue(min)}
        </Text>
        <Text style={styles.rangeText}>
          {formatDisplayValue(max)}
        </Text>
      </View>
    </View>
  );
});

// Specialized components for common use cases
interface DaysPerWeekSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  style?: any;
}

export const DaysPerWeekSlider: React.FC<DaysPerWeekSliderProps> = memo(({
  value,
  onValueChange,
  style
}) => {
  return (
    <SliderInput
      title="Days per week"
      value={value}
      onValueChange={onValueChange}
      min={1}
      max={7}
      step={1}
      unit="days"
      style={style}
    />
  );
});

interface MinutesPerSessionSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  style?: any;
}

export const MinutesPerSessionSlider: React.FC<MinutesPerSessionSliderProps> = memo(({
  value,
  onValueChange,
  style
}) => {
  return (
    <SliderInput
      title="Minutes per session"
      value={value}
      onValueChange={onValueChange}
      min={15}
      max={180}
      step={5}
      unit="min"
      style={style}
    />
  );
});

interface MotivationLevelSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  style?: any;
}

export const MotivationLevelSlider: React.FC<MotivationLevelSliderProps> = memo(({
  value,
  onValueChange,
  style
}) => {
  const formatMotivationLevel = (val: number) => {
    const descriptions = {
      1: 'Very Low',
      2: 'Low',
      3: 'Low',
      4: 'Below Average',
      5: 'Average',
      6: 'Above Average',
      7: 'High',
      8: 'High',
      9: 'Very High',
      10: 'Extremely High'
    };
    
    return `${val}/10 - ${descriptions[val as keyof typeof descriptions] || 'Unknown'}`;
  };

  return (
    <SliderInput
      title="Motivation Level"
      value={value}
      onValueChange={onValueChange}
      min={1}
      max={10}
      step={1}
      formatValue={formatMotivationLevel}
      style={style}
    />
  );
});

interface AgeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  style?: any;
}

export const AgeSlider: React.FC<AgeSliderProps> = memo(({
  value,
  onValueChange,
  style
}) => {
  return (
    <SliderInput
      title="Age"
      value={value}
      onValueChange={onValueChange}
      min={13}
      max={100}
      step={1}
      unit="years"
      style={style}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  buttonDisabled: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.borderLight,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  valueText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  rangeText: {
    fontSize: 14,
    color: colors.muted,
  },
});
