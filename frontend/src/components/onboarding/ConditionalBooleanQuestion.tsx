import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { TextInput } from './TextInput';

interface ConditionalBooleanQuestionProps {
  question: AIQuestion;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

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
  const minLength = 20;
  const isTextValid = !isTextRequired || textValue.trim().length >= minLength;

  return (
    <View style={[styles.container, noBackground && styles.noBackground]}>
      {/* Boolean Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            booleanValue === true && styles.buttonActive,
            disabled && styles.buttonDisabled
          ]}
          onPress={() => handleBooleanChange(true)}
          disabled={disabled}
        >
          <Text style={[
            styles.buttonText,
            booleanValue === true && styles.buttonTextActive,
            disabled && styles.buttonTextDisabled
          ]}>
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            booleanValue === false && styles.buttonActive,
            disabled && styles.buttonDisabled
          ]}
          onPress={() => handleBooleanChange(false)}
          disabled={disabled}
        >
          <Text style={[
            styles.buttonText,
            booleanValue === false && styles.buttonTextActive,
            disabled && styles.buttonTextDisabled
          ]}>
            No
          </Text>
        </TouchableOpacity>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
  },
  buttonTextActive: {
    color: colors.text,
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
