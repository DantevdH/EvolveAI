import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface BooleanQuestionProps {
  question: AIQuestion;
  value?: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export const BooleanQuestion: React.FC<BooleanQuestionProps> = ({
  question,
  value = false,
  onChange,
  error,
  disabled = false,
}) => {
  const handleYesPress = () => {
    if (!disabled) {
      onChange(true);
    }
  };

  const handleNoPress = () => {
    if (!disabled) {
      onChange(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {question.help_text && (
        <Text style={styles.helpText}>{question.help_text}</Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.yesButton,
            value === true && styles.buttonSelected,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleYesPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <IconSymbol
            name="checkmark.circle.fill"
            size={24}
            color={value === true ? colors.text : colors.primary}
          />
          <Text style={[
            styles.buttonText,
            value === true && styles.buttonTextSelected,
            disabled && styles.buttonTextDisabled,
          ]}>
            Yes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            styles.noButton,
            value === false && styles.buttonSelected,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleNoPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <IconSymbol
            name="xmark.circle.fill"
            size={24}
            color={value === false ? colors.text : colors.error}
          />
          <Text style={[
            styles.buttonText,
            value === false && styles.buttonTextSelected,
            disabled && styles.buttonTextDisabled,
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
      
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  yesButton: {
    borderColor: colors.primary,
  },
  noButton: {
    borderColor: colors.error,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  buttonTextSelected: {
    color: colors.text,
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
