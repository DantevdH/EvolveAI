// Week Navigation and Overview Component - Combined like Swift
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../constants/colors';
import { WeekNavigationAndOverviewProps } from '../../types/training';

const WeekNavigationAndOverview: React.FC<WeekNavigationAndOverviewProps> = ({
  dayIndicators,
  onDaySelect,
  currentWeek,
}) => {
  return (
    <View style={styles.container}>
      {/* Weekly Overview Section */}
      <View style={styles.weeklyOverview}>
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>Week {currentWeek}</Text>
        </View>
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
              <View
                style={[
                  styles.dayCircle,
                  day.isSelected && styles.dayCircleSelected,
                  day.isCompleted && styles.dayCircleCompleted,
                  day.isRestDay && styles.dayCircleRest
                ]}
              >
                {day.isRestDay ? (
                  <Ionicons
                    name="moon"
                    size={14}
                    color={colors.primary}
                  />
                ) : day.isCompleted ? (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={colors.primary}
                  />
                ) : (
                  <View style={styles.dayDot} />
                )}
              </View>
              <Text
                style={[
                  styles.dayText,
                  day.isSelected && styles.dayTextSelected
                ]}
              >
                {dayName}
              </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
    gap: 18,
  },
  weeklyOverview: {
    gap: 12,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: createColorWithOpacity(colors.primary, 0.08),
    borderRadius: 12,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayButton: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: createColorWithOpacity(colors.text, 0.55),
    letterSpacing: 0.3,
  },
  dayTextSelected: {
    color: colors.primary,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: createColorWithOpacity(colors.primary, 0.55),
  },
  dayCircleCompleted: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.75),
    borderColor: createColorWithOpacity(colors.primary, 0.5),
  },
  dayCircleRest: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.18),
    borderColor: createColorWithOpacity(colors.secondary, 0.28),
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  }
});

export default WeekNavigationAndOverview;
