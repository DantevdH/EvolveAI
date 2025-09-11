// Weekly Overview Component - Day indicators with completion status
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { WeeklyOverviewProps } from '../../types/training';

const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({
  dayIndicators,
  onDaySelect
}) => {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={styles.container}>
      <View style={styles.daysContainer}>
        {dayIndicators.map((day, index) => {
          const dayName = dayNames[index] || day.dayOfWeek.substring(0, 3);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                day.isSelected && styles.dayButtonSelected,
                day.isCompleted && styles.dayButtonCompleted,
                day.isRestDay && styles.dayButtonRest
              ]}
              onPress={() => onDaySelect(index)}
            >
              <Text style={[
                styles.dayText,
                day.isSelected && styles.dayTextSelected,
                day.isCompleted && styles.dayTextCompleted,
                day.isRestDay && styles.dayTextRest
              ]}>
                {dayName}
              </Text>
              
              {day.isCompleted && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={colors.primary} 
                  style={styles.checkIcon}
                />
              )}
              
              {day.isRestDay && (
                <Ionicons 
                  name="bed-outline" 
                  size={14} 
                  color={colors.muted} 
                  style={styles.restIcon}
                />
              )}
              
              {day.isToday && !day.isPastWeek && (
                <View style={styles.todayIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.buttonSecondary,
    position: 'relative'
  },
  dayButtonSelected: {
    backgroundColor: colors.primary
  },
  dayButtonCompleted: {
    backgroundColor: colors.primary + '20'
  },
  dayButtonRest: {
    backgroundColor: colors.buttonDisabled
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted
  },
  dayTextSelected: {
    color: colors.text
  },
  dayTextCompleted: {
    color: colors.primary
  },
  dayTextRest: {
    color: colors.muted
  },
  checkIcon: {
    position: 'absolute',
    top: 2,
    right: 2
  },
  restIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2
  },
  todayIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  }
});

export default WeeklyOverview;
