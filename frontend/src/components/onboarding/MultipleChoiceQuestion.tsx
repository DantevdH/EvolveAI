import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OptionSelector } from './OptionSelector';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface MultipleChoiceQuestionProps {
  question: AIQuestion;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  if (!question.options) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No options available for this question</Text>
      </View>
    );
  }

  const isMultiselect = question.multiselect === true;
  const defaultValue = isMultiselect ? [] : '';
  const currentValue = value ?? defaultValue;

  const options = question.options.map(option => ({
    value: option.value,
    title: option.text,
    description: undefined,
    icon: undefined,
  }));

  return (
    <View style={styles.container}>
      {/* Selection mode indicator */}
      <View style={styles.selectionIndicator}>
        <IconSymbol
          name={isMultiselect ? 'checkmark.circle.fill' : 'circle.fill'}
          size={14}
          color={colors.muted}
        />
        <Text style={styles.selectionIndicatorText}>
          {isMultiselect ? 'Select multiple options' : 'Select one option'}
        </Text>
      </View>
      
      <OptionSelector
        options={options}
        selectedValues={isMultiselect ? (Array.isArray(currentValue) ? currentValue : []) : (typeof currentValue === 'string' ? [currentValue] : [])}
        onSelectionChange={(selected) => {
          if (isMultiselect) {
            onChange(selected);
          } else {
            onChange(selected.length > 0 ? selected[0] : '');
          }
        }}
        multiple={isMultiselect}
        columns={1}
        style={[styles.selector, noBackground && styles.selectorNoBackground]}
      />
      
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
    marginBottom: 8,
    lineHeight: 20,
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectionIndicatorText: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  selector: {
    flex: 1,
  },
  selectorNoBackground: {
    backgroundColor: 'transparent',
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
