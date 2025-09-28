import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { TextInput } from './TextInput';

interface TextInputQuestionProps {
  question: AIQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

export const TextInputQuestion: React.FC<TextInputQuestionProps> = ({
  question,
  value = '',
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={question.placeholder}
        maxLength={question.max_length}
        minLength={20}
        disabled={disabled}
        error={error}
        noBackground={false} // Always show background for text questions
        showCharacterCount={!!question.max_length}
        showMinLengthWarning={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No flex to prevent expansion
  },
});
