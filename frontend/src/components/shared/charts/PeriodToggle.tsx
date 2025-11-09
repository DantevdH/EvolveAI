import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';
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
          style={styles.buttonContainer}
          onPress={() => onPeriodChange(period)}
          activeOpacity={0.7}
        >
          {selectedPeriod === period ? (
            <LinearGradient
              colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonActive}
            >
              <Text style={styles.buttonTextActive}>{period}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.button}>
              <Text style={styles.buttonText}>{period}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
  },
  buttonActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  buttonTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
});

