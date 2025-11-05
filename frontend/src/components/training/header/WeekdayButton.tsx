/**
 * Weekday Button Component
 * Individual weekday button with status indicators
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { WeekdayButtonProps } from './types';

const WeekdayButton: React.FC<WeekdayButtonProps> = ({ day, index, onPress }) => {
  const dayName = day.dayOfWeek.substring(0, 3);
  const isSelected = day.isSelected;
  const isCompleted = day.isCompleted;
  const isRestDay = day.isRestDay;
  const isToday = day.isToday;

  // Determine button size and style
  const buttonSize = isSelected ? 42 : 36;
  
  // Determine colors
  let buttonColor: string = createColorWithOpacity(colors.primary, 0.3);
  let borderColor: string = colors.border;
  let iconColor = colors.text;
  
  if (isCompleted && !isRestDay) {
    buttonColor = colors.tertiary;
    borderColor = colors.tertiary;
  } else if (isSelected) {
    buttonColor = colors.primary;
    borderColor = colors.primary;
  } else if (isRestDay) {
    buttonColor = createColorWithOpacity(colors.purple, 0.6);
    borderColor = createColorWithOpacity(colors.purple, 0.8);
  }

  return (
    <View style={styles.weekdayButtonWrapper}>
      <TouchableOpacity
        style={[
          styles.weekdayButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: buttonColor,
            borderColor: borderColor,
            borderWidth: isSelected ? 3 : 2,
          },
          isSelected && styles.weekdayButtonSelected,
        ]}
        onPress={onPress}
      >
        {isRestDay ? (
          <Ionicons name="moon" size={isSelected ? 16 : 14} color={iconColor} />
        ) : isCompleted ? (
          <Ionicons name="checkmark" size={isSelected ? 18 : 16} color={colors.text} />
        ) : (
          <Ionicons name="radio-button-on" size={isSelected ? 18 : 16} color={iconColor} />
        )}
      </TouchableOpacity>
      
      {/* Today Indicator */}
      {isToday && !isCompleted && (
        <View style={styles.todayBadge}>
          <Ionicons name="flame" size={10} color={colors.warning} />
        </View>
      )}
      
      {/* Day Label */}
      <Text style={[
        styles.dayLabel,
        isSelected && styles.dayLabelSelected
      ]}>
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
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  weekdayButtonSelected: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
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
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: colors.text,
    fontWeight: '600',
  },
});

export default WeekdayButton;

