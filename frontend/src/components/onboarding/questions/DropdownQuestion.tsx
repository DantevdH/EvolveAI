import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AIQuestion } from '../../../types/onboarding';
import { colors } from '../../../constants/designSystem';
import { createColorWithOpacity, goldenGradient } from '../../../constants/colors';

const gradientConfig = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

interface DropdownQuestionProps {
  question: AIQuestion;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

export const DropdownQuestion: React.FC<DropdownQuestionProps> = ({
  question,
  value,
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

  const isMultiselect = question.multiselect === true;
  const defaultValue = isMultiselect ? [] : '';
  const currentValue = value ?? defaultValue;

  const getSelectedOptions = () => {
    if (!question.options) return [];
    
    if (isMultiselect) {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];
      return question.options.filter(option => selectedValues.includes(option.value));
    } else {
      const selectedValue = typeof currentValue === 'string' ? currentValue : '';
      const option = question.options.find(opt => opt.value === selectedValue);
      return option ? [option] : [];
    }
  };

  const selectedOptions = getSelectedOptions();
  const displayText = isMultiselect
    ? selectedOptions.length > 0
      ? `${selectedOptions.length} selected`
      : 'Select options...'
    : selectedOptions.length > 0
    ? selectedOptions[0].text
    : 'Select an option...';

  const handleOptionSelect = (optionValue: string) => {
    if (isMultiselect) {
      const currentValues = Array.isArray(currentValue) ? currentValue : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

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
          selectedOptions.length === 0 && styles.dropdownButtonTextPlaceholder,
          disabled && styles.dropdownButtonTextDisabled,
        ]}>
          {displayText}
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
              {question.options.map((option) => {
                const isSelected = isMultiselect
                  ? Array.isArray(currentValue) && currentValue.includes(option.value)
                  : (typeof currentValue === 'string' && currentValue === option.value);

                const optionBody = (
                  <>
                    {isMultiselect && (
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && (
                          <IconSymbol
                            name="checkmark"
                            size={12}
                            color={colors.primary}
                          />
                        )}
                      </View>
                    )}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.text}
                    </Text>
                    {!isMultiselect && isSelected && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </>
                );

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => handleOptionSelect(option.value)}
                    activeOpacity={0.82}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={goldenGradient}
                        {...gradientConfig}
                        style={[styles.optionItemInner, styles.optionItemInnerSelected]}
                      >
                        {optionBody}
                      </LinearGradient>
                    ) : (
                      <View style={styles.optionItemInner}>
                        {optionBody}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selectionIndicatorText: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 6,
    fontStyle: 'italic',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.inputBackground,
  },
  optionItemSelected: {
    borderColor: createColorWithOpacity(colors.secondary, 0.6),
    shadowColor: colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  optionItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  optionItemInnerSelected: {
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxSelected: {
    borderColor: createColorWithOpacity(colors.secondary, 0.75),
    backgroundColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginRight: 8,
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
