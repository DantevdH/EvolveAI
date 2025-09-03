/**
 * Multiple choice selector component for onboarding
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { colors } from '../../constants/colors';

export interface Option {
  value: string;
  title: string;
  description?: string;
  icon?: string;
}

interface OptionSelectorProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  multiple?: boolean;
  columns?: number;
  style?: any;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  multiple = false,
  columns = 2,
  style
}) => {
  const handleOptionPress = (optionValue: string) => {
    if (multiple) {
      const newSelection = selectedValues.includes(optionValue)
        ? selectedValues.filter(value => value !== optionValue)
        : [...selectedValues, optionValue];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([optionValue]);
    }
  };

  const isSelected = (optionValue: string) => {
    return selectedValues.includes(optionValue);
  };

  const renderOption = (option: Option) => {
    const selected = isSelected(option.value);
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.optionCard,
          selected && styles.optionCardSelected,
          { width: `${100 / columns - 4}%` }
        ]}
        onPress={() => handleOptionPress(option.value)}
        activeOpacity={0.8}
      >
        {option.icon && (
          <IconSymbol
            name={option.icon as any}
            size={32}
            color={selected ? colors.text : colors.primary}
            style={styles.optionIcon}
          />
        )}
        
        <Text style={[
          styles.optionTitle,
          selected && styles.optionTitleSelected
        ]}>
          {option.title}
        </Text>
        
        {option.description && (
          <Text style={[
            styles.optionDescription,
            selected && styles.optionDescriptionSelected
          ]}>
            {option.description}
          </Text>
        )}
        
        {selected && (
          <View style={styles.selectedIndicator}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={20}
              color={colors.text}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.optionsGrid}>
        {options.map(renderOption)}
      </View>
    </View>
  );
};

// Single selection variant
interface SingleOptionSelectorProps {
  options: Option[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  columns?: number;
  style?: any;
}

export const SingleOptionSelector: React.FC<SingleOptionSelectorProps> = ({
  options,
  selectedValue,
  onSelectionChange,
  columns = 2,
  style
}) => {
  return (
    <OptionSelector
      options={options}
      selectedValues={selectedValue ? [selectedValue] : []}
      onSelectionChange={(values) => onSelectionChange(values[0] || '')}
      multiple={false}
      columns={columns}
      style={style}
    />
  );
};

// List variant for single column
interface OptionListProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  multiple?: boolean;
  style?: any;
}

export const OptionList: React.FC<OptionListProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  multiple = false,
  style
}) => {
  const handleOptionPress = (optionValue: string) => {
    if (multiple) {
      const newSelection = selectedValues.includes(optionValue)
        ? selectedValues.filter(value => value !== optionValue)
        : [...selectedValues, optionValue];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([optionValue]);
    }
  };

  const isSelected = (optionValue: string) => {
    return selectedValues.includes(optionValue);
  };

  return (
    <View style={[styles.listContainer, style]}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.listOption,
              selected && styles.listOptionSelected
            ]}
            onPress={() => handleOptionPress(option.value)}
            activeOpacity={0.8}
          >
            <View style={styles.listOptionContent}>
              {option.icon && (
                <IconSymbol
                  name={option.icon as any}
                  size={24}
                  color={selected ? colors.text : colors.primary}
                  style={styles.listOptionIcon}
                />
              )}
              
              <View style={styles.listOptionText}>
                <Text style={[
                  styles.listOptionTitle,
                  selected && styles.listOptionTitleSelected
                ]}>
                  {option.title}
                </Text>
                
                {option.description && (
                  <Text style={[
                    styles.listOptionDescription,
                    selected && styles.listOptionDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                )}
              </View>
            </View>
            
            {selected && (
              <IconSymbol
                name="checkmark.circle.fill"
                size={24}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    position: 'relative',
  },
  optionCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: colors.text,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  optionDescriptionSelected: {
    color: colors.text,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  listContainer: {
    flex: 1,
  },
  listOption: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listOptionIcon: {
    marginRight: 12,
  },
  listOptionText: {
    flex: 1,
  },
  listOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  listOptionTitleSelected: {
    color: colors.text,
  },
  listOptionDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 18,
  },
  listOptionDescriptionSelected: {
    color: colors.text,
  },
});
