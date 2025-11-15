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
      <View style={styles.dayHeaderCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayNameBadge}>
            <Text style={styles.dayName}>{dayOfWeek.toUpperCase()}</Text>
          </View>

          {isPastWeek && (
            <View style={styles.pastWeekIndicator}>
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
              <Text style={styles.pastWeekText}>Past Week</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayHeaderContainer: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 8,
  },
  dayHeaderCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.25), // Increased opacity for better visibility
    backgroundColor: colors.card,
    borderTopLeftRadius: 20, // Increased from 12 to match card radius
    borderTopRightRadius: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayNameBadge: {
    flex: 1,
  },
  dayName: {
    fontSize: 17, // Increased for better hierarchy
    fontWeight: '600',
    color: colors.muted, // Changed to grey color
    letterSpacing: 0.5,
    textTransform: 'uppercase', // Ensure all uppercase
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

