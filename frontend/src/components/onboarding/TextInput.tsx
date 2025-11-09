import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { colors } from '../../constants/designSystem';

interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  noBackground?: boolean;
  showCharacterCount?: boolean;
  showMinLengthWarning?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  maxLength,
  minLength = 20,
  disabled = false,
  error,
  multiline = true,
  numberOfLines = 4,
  noBackground = false,
  showCharacterCount = true,
  showMinLengthWarning = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (text: string) => {
    if (maxLength && text.length > maxLength) {
      return; // Don't update if exceeding max length
    }
    onChangeText(text);
  };

  const stringValue = typeof value === 'string' ? value : (value ? String(value) : '');
  const isMinLengthValid = !minLength || stringValue.trim().length >= minLength;
  const hasError = !!error; // Only show error border for actual errors, not min length warnings

  return (
    <View style={styles.container}>
      <RNTextInput
        style={[
          styles.textInput,
          isFocused && styles.textInputFocused,
          hasError && styles.textInputError,
          disabled && styles.textInputDisabled,
          noBackground && styles.textInputNoBackground,
        ]}
        value={stringValue}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        textAlignVertical="top"
      />
      
      <View style={styles.footerContainer}>
        {!isMinLengthValid && showMinLengthWarning && (
          <Text style={styles.minLengthText}>
            Please provide at least {minLength} characters
          </Text>
        )}
        {showCharacterCount && maxLength && (
          <Text style={styles.characterCount}>
            {stringValue.length}/{maxLength}
          </Text>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No flex to prevent expansion
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  textInputFocused: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  textInputError: {
    borderColor: colors.error,
  },
  textInputDisabled: {
    backgroundColor: colors.inputDisabled || colors.inputBackground,
    color: colors.muted,
  },
  textInputNoBackground: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    borderRadius: 0,
    paddingHorizontal: 0,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  minLengthText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
