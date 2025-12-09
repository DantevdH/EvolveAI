/**
 * Multiple choice selector component for onboarding
 */

import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors } from '../../../constants/designSystem';
import { createColorWithOpacity, goldenGradient } from '../../../constants/colors';

export interface Option {
  value: string;
  title: string;
  description?: string;
  icon?: string;
}

interface OptionSelectorProps {
  options: Option[];
  selectedValues?: string[];
  onSelectionChange: (values: string[]) => void;
  multiple?: boolean;
  columns?: number;
  style?: any;
}

const gradientConfig = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const OptionSelector: React.FC<OptionSelectorProps> = memo(({
  options,
  selectedValues = [],
  onSelectionChange,
  multiple = false,
  columns = 2,
  style,
}) => {
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  const handleOptionPress = (optionValue: string) => {
    if (multiple) {
      const newSelection = safeSelectedValues.includes(optionValue)
        ? safeSelectedValues.filter(value => value !== optionValue)
        : [...safeSelectedValues, optionValue];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([optionValue]);
    }
  };

  const isSelected = (optionValue: string) => safeSelectedValues.includes(optionValue);

  const renderOption = (option: Option) => {
    const selected = isSelected(option.value);

    const content = (
      <>
        {option.icon && (
          <IconSymbol
            name={option.icon as any}
            size={32}
            color={selected ? colors.primary : colors.text}
            style={styles.optionIcon}
          />
        )}

        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
          {option.title}
        </Text>

        {option.description && (
          <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
            {option.description}
          </Text>
        )}

        {selected && (
          <View style={styles.selectedIndicator}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
          </View>
        )}
      </>
    );

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.optionCard,
          { width: `${100 / columns - 4}%` },
          selected && styles.optionCardSelected,
        ]}
        onPress={() => handleOptionPress(option.value)}
        activeOpacity={0.82}
      >
        {selected ? (
          <LinearGradient
            colors={goldenGradient}
            {...gradientConfig}
            style={[styles.optionInner, styles.optionInnerSelected]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={styles.optionInner}>
            {content}
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
});

interface SingleOptionSelectorProps {
  options: Option[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  columns?: number;
  style?: any;
}

export const SingleOptionSelector: React.FC<SingleOptionSelectorProps> = memo(({
  options,
  selectedValue,
  onSelectionChange,
  columns = 2,
  style,
}) => (
  <OptionSelector
    options={options}
    selectedValues={selectedValue ? [selectedValue] : []}
    onSelectionChange={(values) => onSelectionChange(values[0] || '')}
    multiple={false}
    columns={columns}
    style={style}
  />
));

interface OptionListProps {
  options: Option[];
  selectedValues?: string[];
  onSelectionChange: (values: string[]) => void;
  multiple?: boolean;
  style?: any;
}

export const OptionList: React.FC<OptionListProps> = ({
  options,
  selectedValues = [],
  onSelectionChange,
  multiple = false,
  style,
}) => {
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  const handleOptionPress = (optionValue: string) => {
    if (multiple) {
      const newSelection = safeSelectedValues.includes(optionValue)
        ? safeSelectedValues.filter(value => value !== optionValue)
        : [...safeSelectedValues, optionValue];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([optionValue]);
    }
  };

  const isSelected = (optionValue: string) => safeSelectedValues.includes(optionValue);

  return (
    <View style={[styles.listContainer, style]}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        const content = (
          <>
            <View style={styles.listOptionContent}>
              {option.icon && (
                <IconSymbol
                  name={option.icon as any}
                  size={24}
                  color={selected ? colors.primary : colors.text}
                  style={styles.listOptionIcon}
                />
              )}

              <View style={styles.listOptionText}>
                <Text style={[styles.listOptionTitle, selected && styles.listOptionTitleSelected]}>
                  {option.title}
                </Text>

                {option.description && (
                  <Text style={[styles.listOptionDescription, selected && styles.listOptionDescriptionSelected]}>
                    {option.description}
                  </Text>
                )}
              </View>
            </View>

            {selected && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            )}
          </>
        );

        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.listOption, selected && styles.listOptionSelected]}
            onPress={() => handleOptionPress(option.value)}
            activeOpacity={0.82}
          >
            {selected ? (
              <LinearGradient
                colors={goldenGradient}
                {...gradientConfig}
                style={[styles.listOptionInner, styles.listOptionInnerSelected]}
              >
                {content}
              </LinearGradient>
            ) : (
              <View style={styles.listOptionInner}>
                {content}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Removed flex: 1 to prevent unbounded expansion
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.inputBackground,
  },
  optionCardSelected: {
    borderColor: createColorWithOpacity(colors.secondary, 0.6),
    shadowColor: colors.secondary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  optionInner: {
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  optionInnerSelected: {
    backgroundColor: 'transparent',
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
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  optionDescriptionSelected: {
    color: colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  listContainer: {
    flex: 1,
  },
  listOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.inputBackground,
  },
  listOptionSelected: {
    borderColor: createColorWithOpacity(colors.secondary, 0.6),
    shadowColor: colors.secondary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  listOptionInner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listOptionInnerSelected: {
    backgroundColor: 'transparent',
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
    color: colors.primary,
  },
  listOptionDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 18,
  },
  listOptionDescriptionSelected: {
    color: colors.primary,
  },
});
