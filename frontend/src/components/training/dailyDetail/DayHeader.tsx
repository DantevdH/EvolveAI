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
  isEditable,
  dayStatus,
  isRestDay,
  hideDayName = false,
}) => {
  // If hiding day name, return null to remove the entire header
  if (hideDayName) {
    return null;
  }
  
  const getStatusLabel = () => {
    switch (dayStatus) {
      case 'past':
        return 'Past';
      case 'today':
        return 'Today';
      case 'future':
        return 'Future';
      default:
        return null;
    }
  };
  
  const statusLabel = getStatusLabel();
  // Don't show lock icon on rest days
  const showLockIcon = !isRestDay && !isEditable && dayStatus !== 'unknown';
  
  return (
    <View style={styles.dayHeaderContainer}>
      <View style={styles.dayHeaderCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayNameBadge}>
            <Text style={[styles.dayName, !isEditable && !isRestDay && styles.lockedDayName]}>
              {dayOfWeek.toUpperCase()}
            </Text>
          </View>

          {showLockIcon && (
            <View style={styles.statusIndicator}>
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
              {statusLabel && (
                <Text style={styles.statusText}>{statusLabel}</Text>
              )}
            </View>
          )}
          
          {isEditable && dayStatus === 'today' && !isRestDay && (
            <View style={styles.todayIndicator}>
              <Text style={styles.todayText}>Today</Text>
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
  lockedDayName: {
    opacity: 0.6,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.muted + '20',
    borderRadius: 8
  },
  statusText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500'
  },
  todayIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primary + '20',
    borderRadius: 8
  },
  todayText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600'
  },
});

export default DayHeader;

