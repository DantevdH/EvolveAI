/**
 * Weekday Button Component
 * Individual weekday button with status indicators
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { WeekdayButtonProps } from './types';

const WeekdayButton: React.FC<WeekdayButtonProps> = ({ day, index, onPress }) => {
  const dayName = day.dayOfWeek.substring(0, 3);
  const isSelected = day.isSelected;
  const isCompleted = day.isCompleted;
  const isRestDay = day.isRestDay;
  const isToday = day.isToday;

  const buttonSize = isSelected ? 44 : 38;
  const innerPadding = 4;

  const baseGradient: [string, string] = [
    createColorWithOpacity(colors.secondary, 0.24),
    createColorWithOpacity(colors.secondary, 0.12),
  ];
  const selectedGradient: [string, string] = [
    createColorWithOpacity(colors.primary, 0.9),
    createColorWithOpacity(colors.primary, 0.7),
  ];
  const completedGradient: [string, string] = [
    createColorWithOpacity(colors.primary, 0.85),
    createColorWithOpacity(colors.primary, 0.6),
  ];
  const restGradient: [string, string] = [
    createColorWithOpacity(colors.purple, 0.5),
    createColorWithOpacity(colors.purple, 0.3),
  ];

  let ringGradient: [string, string] = baseGradient;
  let innerBackground = colors.card;
  let iconColor = colors.primary;

  if (isSelected) {
    ringGradient = selectedGradient;
    innerBackground = createColorWithOpacity(colors.primary, 0.12);
    iconColor = '#FFFFFF';
  }

  if (isCompleted && !isRestDay) {
    ringGradient = completedGradient;
    innerBackground = createColorWithOpacity(colors.primary, 0.15);
    iconColor = '#FFFFFF';
  }

  if (isRestDay) {
    ringGradient = restGradient;
    innerBackground = createColorWithOpacity(colors.purple, 0.15);
    iconColor = '#FFFFFF';
  }

  return (
    <View style={styles.weekdayButtonWrapper}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <LinearGradient
          colors={ringGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.weekdayButton,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
            isSelected && styles.weekdayButtonSelected,
          ]}
        >
          <View
            style={[
              styles.innerCircle,
              {
                width: buttonSize - innerPadding * 2,
                height: buttonSize - innerPadding * 2,
                borderRadius: (buttonSize - innerPadding * 2) / 2,
                backgroundColor: innerBackground,
              },
            ]}
          >
            {isRestDay ? (
              <Ionicons name="moon" size={isSelected ? 16 : 14} color={iconColor} />
            ) : isCompleted ? (
              <Ionicons name="checkmark" size={isSelected ? 18 : 16} color={'#FFFFFF'} />
            ) : (
              <Ionicons name="radio-button-on" size={isSelected ? 18 : 16} color={iconColor} />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {isToday && !isCompleted && (
        <View style={styles.todayBadge}>
          <Ionicons name="flame" size={10} color={colors.warning} />
        </View>
      )}

      <Text
        style={[
          styles.dayLabel,
          isSelected && styles.dayLabelSelected
        ]}
      >
        {dayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  weekdayButtonWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  weekdayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: createColorWithOpacity(colors.text, 0.12),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  weekdayButtonSelected: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 9,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: createColorWithOpacity(colors.text, 0.55),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default WeekdayButton;

