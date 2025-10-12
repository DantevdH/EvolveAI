import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface DropdownQuestionProps {
  question: AIQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

export const DropdownQuestion: React.FC<DropdownQuestionProps> = ({
  question,
  value = '',
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!question.options) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No options available for this question</Text>
      </View>
    );
  }

  const selectedOption = question.options.find(option => option.value === value);

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
          error && styles.dropdownButtonError,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.dropdownButtonText,
          !selectedOption && styles.dropdownButtonTextPlaceholder,
          disabled && styles.dropdownButtonTextDisabled,
        ]}>
          {selectedOption ? selectedOption.text : 'Select an option...'}
        </Text>
        <IconSymbol
          name={isOpen ? 'chevron.up' : 'chevron.down'}
          size={16}
          color={disabled ? colors.muted : colors.text}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {question.options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    value === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleOptionSelect(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    value === option.value && styles.optionTextSelected,
                  ]}>
                    {option.text}
                  </Text>
                  {value === option.value && (
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      
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
  dropdownButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  dropdownButtonDisabled: {
    backgroundColor: colors.inputDisabled,
    borderColor: colors.inputBorder,
  },
  dropdownButtonError: {
    borderColor: colors.error,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  dropdownButtonTextPlaceholder: {
    color: colors.muted,
  },
  dropdownButtonTextDisabled: {
    color: colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    maxHeight: '70%',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  optionItemSelected: {
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}10`,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
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
