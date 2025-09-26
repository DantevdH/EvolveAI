import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OptionSelector } from './OptionSelector';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface MultipleChoiceQuestionProps {
  question: AIQuestion;
  value?: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  value = [],
  onChange,
  error,
  disabled = false,
}) => {
  if (!question.options) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No options available for this question</Text>
      </View>
    );
  }

  const options = question.options.map(option => ({
    value: option.value,
    title: option.text,
    description: undefined,
    icon: undefined,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {question.help_text && (
        <Text style={styles.helpText}>{question.help_text}</Text>
      )}
      
      <OptionSelector
        options={options}
        selectedValues={value}
        onSelectionChange={onChange}
        multiple={true}
        columns={1}
        style={styles.selector}
      />
      
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
  selector: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
});
