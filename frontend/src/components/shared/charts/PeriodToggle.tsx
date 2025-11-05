import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { TimePeriod } from './types';

interface PeriodToggleProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  periods?: TimePeriod[];
}

export const PeriodToggle: React.FC<PeriodToggleProps> = ({
  selectedPeriod,
  onPeriodChange,
  periods = ['1M', '3M', '6M', '1Y', 'ALL'],
}) => {
  return (
    <View style={styles.container}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.button,
            selectedPeriod === period && styles.buttonActive
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text style={[
            styles.buttonText,
            selectedPeriod === period && styles.buttonTextActive
          ]}>
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  buttonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
});

