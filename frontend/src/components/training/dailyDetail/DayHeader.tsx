/**
 * Day Header Component
 * Gamified day header with icon and name
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { DayHeaderProps } from './types';

const DayHeader: React.FC<DayHeaderProps> = ({
  dayOfWeek,
  isTodaysWorkout,
  isPastWeek,
  isRestDay,
  hideDayName = false,
}) => {
  // If hiding day name, return null to remove the entire header
  if (hideDayName) {
    return null;
  }
  
  return (
    <View style={styles.dayHeaderContainer}>
      <LinearGradient
        colors={[
          colors.card,
          createColorWithOpacity(colors.card, 0.95),
          colors.card
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dayHeaderGradient}
      >
        <View style={styles.dayHeader}>
          {/* Day Icon */}
          <View style={styles.dayIconContainer}>
            {isTodaysWorkout && !isPastWeek ? (
              <Ionicons name="flame" size={18} color={colors.warning} />
            ) : isRestDay ? (
              <Ionicons name="moon" size={18} color={colors.purple} />
            ) : (
              <Ionicons name="fitness" size={18} color={colors.primary} />
            )}
          </View>
          
          {/* Day Name Badge */}
          <View style={styles.dayNameBadge}>
            <Text style={styles.dayName}>{dayOfWeek}</Text>
          </View>
          
          {/* Past Week Indicator */}
          {isPastWeek && (
            <View style={styles.pastWeekIndicator}>
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
              <Text style={styles.pastWeekText}>Past Week</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  dayHeaderContainer: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 8,
  },
  dayHeaderGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: createColorWithOpacity(colors.primary, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNameBadge: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  pastWeekIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.muted + '20',
    borderRadius: 8
  },
  pastWeekText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500'
  },
});

export default DayHeader;

