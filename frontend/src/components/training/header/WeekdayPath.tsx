/**
 * Weekday Path Component
 * Connected weekday path with buttons
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import WeekdayButton from './WeekdayButton';
import { WeekdayPathProps } from './types';

const WeekdayPath: React.FC<WeekdayPathProps> = ({ dayIndicators, onDaySelect }) => {
  return (
    <View style={styles.weekdayPathContainer}>
      <View style={styles.weekdayButtons}>
        {dayIndicators.map((day, index) => (
          <WeekdayButton
            key={index}
            day={day}
            index={index}
            onPress={() => onDaySelect(index)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  weekdayPathContainer: {
    position: 'relative',
    marginTop: 12,
    paddingVertical: 4,
  },
  weekdayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    position: 'relative',
    zIndex: 1,
  },
});

export default WeekdayPath;

