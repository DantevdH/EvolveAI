import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AIQuestion } from '../../../types/onboarding';
import { colors } from '../../../constants/designSystem';
import { createColorWithOpacity, goldenGradient } from '../../../constants/colors';
import { TextInput } from '../inputs/TextInput';

interface ConditionalBooleanQuestionProps {
  question: AIQuestion;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

const gradientConfig = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const ConditionalBooleanQuestion: React.FC<ConditionalBooleanQuestionProps> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  const [booleanValue, setBooleanValue] = useState<boolean | null>(value?.boolean || null);
  const [textValue, setTextValue] = useState<string>(value?.text || '');

  // Initialize value structure
  useEffect(() => {
    if (value === undefined || value === null) {
      onChange({ boolean: null, text: '' });
    }
  }, []);

  const handleBooleanChange = (boolValue: boolean) => {
    const newValue = { boolean: boolValue, text: boolValue ? textValue : '' };
    setBooleanValue(boolValue);
    onChange(newValue);
  };

  const handleTextChange = (text: string) => {
    const newValue = { boolean: booleanValue, text };
    setTextValue(text);
    onChange(newValue);
  };

  const isTextRequired = booleanValue === true;
  const minLength = question.min_length ?? 10;
  const isTextValid = !isTextRequired || textValue.trim().length >= minLength;

  const renderBooleanButton = (label: string, targetValue: boolean) => {
    const isActive = booleanValue === targetValue;
    const textStyle = [
      styles.buttonText,
      isActive && styles.buttonTextActive,
      disabled && styles.buttonTextDisabled,
    ];

    return (
      <TouchableOpacity
        style={[
          styles.button,
          isActive && styles.buttonActive,
          disabled && styles.buttonDisabled,
        ]}
        onPress={() => handleBooleanChange(targetValue)}
        disabled={disabled}
        activeOpacity={0.82}
      >
        {isActive ? (
          <LinearGradient
            colors={goldenGradient}
            {...gradientConfig}
            style={[styles.buttonInner, styles.buttonInnerActive]}
          >
            <Text style={textStyle}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.buttonInner}>
            <Text style={textStyle}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, noBackground && styles.noBackground]}>
      {/* Boolean Buttons */}
      <View style={styles.buttonContainer}>
        {renderBooleanButton('Yes', true)}
        {renderBooleanButton('No', false)}
      </View>

      {/* Conditional Text Input */}
      {booleanValue === true && (
        <View style={styles.textInputContainer}>
          <TextInput
            value={textValue}
            onChangeText={handleTextChange}
            placeholder={question.placeholder || 'Please provide more details...'}
            maxLength={question.max_length || 500}
            minLength={minLength}
            disabled={disabled}
            noBackground={false} // Always show background for text input
            showCharacterCount={!!question.max_length}
            showMinLengthWarning={true}
          />
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  noBackground: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
  },
  buttonActive: {
    borderColor: createColorWithOpacity(colors.secondary, 0.6),
    shadowColor: colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInnerActive: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextActive: {
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
  textInputContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
