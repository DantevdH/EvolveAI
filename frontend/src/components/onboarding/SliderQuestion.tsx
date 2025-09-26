import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SliderInput } from './SliderInput';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface SliderQuestionProps {
  question: AIQuestion;
  value?: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export const SliderQuestion: React.FC<SliderQuestionProps> = ({
  question,
  value = question.min_value || 0,
  onChange,
  error,
  disabled = false,
}) => {
  const minValue = question.min_value || 0;
  const maxValue = question.max_value || 100;
  const step = question.step || 1;

  const formatValue = (val: number) => {
    // Add unit formatting based on question context
    if (question.id.includes('age')) {
      return `${val} years`;
    } else if (question.id.includes('weight')) {
      return `${val} kg`;
    } else if (question.id.includes('height')) {
      return `${val} cm`;
    } else if (question.id.includes('hours')) {
      return `${val} hours`;
    } else if (question.id.includes('minutes')) {
      return `${val} minutes`;
    } else if (question.id.includes('days')) {
      return `${val} days`;
    }
    return val.toString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {question.help_text && (
        <Text style={styles.helpText}>{question.help_text}</Text>
      )}
      
      <SliderInput
        title=""
        value={value}
        onValueChange={onChange}
        min={minValue}
        max={maxValue}
        step={step}
        formatValue={formatValue}
        style={styles.slider}
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
  slider: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
