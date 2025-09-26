import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface TextInputQuestionProps {
  question: AIQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const TextInputQuestion: React.FC<TextInputQuestionProps> = ({
  question,
  value = '',
  onChange,
  error,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (text: string) => {
    if (question.max_length && text.length > question.max_length) {
      return; // Don't update if exceeding max length
    }
    onChange(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {question.help_text && (
        <Text style={styles.helpText}>{question.help_text}</Text>
      )}
      
      <TextInput
        style={[
          styles.textInput,
          isFocused && styles.textInputFocused,
          error && styles.textInputError,
          disabled && styles.textInputDisabled,
        ]}
        value={value}
        onChangeText={handleTextChange}
        placeholder={question.placeholder}
        placeholderTextColor={colors.muted}
        multiline={true}
        numberOfLines={4}
        maxLength={question.max_length}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      
      {question.max_length && (
        <Text style={styles.characterCount}>
          {value.length}/{question.max_length}
        </Text>
      )}
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  helpText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
    lineHeight: 20,
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
    borderColor: colors.primary,
    borderWidth: 2,
  },
  textInputError: {
    borderColor: colors.error,
  },
  textInputDisabled: {
    backgroundColor: colors.inputDisabled,
    color: colors.muted,
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
