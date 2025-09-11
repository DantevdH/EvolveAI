// Week Navigation and Overview Component - Combined like Swift
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { WeekNavigationAndOverviewProps } from '../../types/training';

const WeekNavigationAndOverview: React.FC<WeekNavigationAndOverviewProps> = ({
  weekNavigation,
  dayIndicators,
  onWeekChange,
  onDaySelect
}) => {
  const { currentWeek, totalWeeks, canGoBack, canGoForward } = weekNavigation;

  return (
    <View style={styles.container}>
      {/* Week Navigation Section */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={() => canGoBack && onWeekChange(currentWeek - 1)}
          disabled={!canGoBack}
        >
          <Ionicons 
            name="chevron-back" 
            size={20} 
            color={canGoBack ? colors.primary : colors.muted} 
          />
        </TouchableOpacity>

        <Text style={styles.weekText}>Week {currentWeek}</Text>

        <TouchableOpacity
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={() => canGoForward && onWeekChange(currentWeek + 1)}
          disabled={!canGoForward}
        >
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={canGoForward ? colors.primary : colors.muted} 
          />
        </TouchableOpacity>
      </View>

      {/* Weekly Overview Section */}
      <View style={styles.weeklyOverview}>
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>This Week</Text>
        </View>
        
        <View style={styles.daysContainer}>
          {dayIndicators.map((day, index) => {
            const dayName = day.dayOfWeek.substring(0, 3);
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.dayButton}
                onPress={() => onDaySelect(index)}
              >
                <Text style={[
                  styles.dayText,
                  day.isSelected && styles.dayTextSelected
                ]}>
                  {dayName}
                </Text>
                
                <View style={[
                  styles.dayCircle,
                  day.isSelected && styles.dayCircleSelected,
                  day.isCompleted && styles.dayCircleCompleted,
                  day.isRestDay && styles.dayCircleRest
                ]}>
                  {day.isRestDay ? (
                    <Ionicons 
                      name="moon" 
                      size={12} 
                      color={colors.text} 
                    />
                  ) : day.isCompleted ? (
                    <Ionicons 
                      name="checkmark" 
                      size={12} 
                      color={colors.text} 
                    />
                  ) : (
                    <View style={styles.dayDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
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
    gap: 16
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonDisabled: {
    backgroundColor: colors.buttonDisabled
  },
  weekText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  weeklyOverview: {
    gap: 12
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dayButton: {
    alignItems: 'center',
    gap: 4
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text
  },
  dayTextSelected: {
    color: colors.text
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCircleSelected: {
    backgroundColor: colors.primary
  },
  dayCircleCompleted: {
    backgroundColor: colors.primary
  },
  dayCircleRest: {
    backgroundColor: colors.purple + '60' // Dimmed purple color for rest days (60% opacity)
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text
  }
});

export default WeekNavigationAndOverview;
