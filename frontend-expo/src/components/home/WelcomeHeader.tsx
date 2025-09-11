/**
 * Welcome Header Component - Time-based greeting with AI icon
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface WelcomeHeaderProps {
  username?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ username }) => {
  const { timeOfDay, timeOfDayIcon } = getTimeOfDay();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>Good {timeOfDay}</Text>
          <Ionicons name={timeOfDayIcon} size={24} color={colors.primary} />
        </View>
        {username && (
          <Text style={styles.username}>Welcome back, {username}!</Text>
        )}
      </View>
    </View>
  );
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      timeOfDay: 'Morning',
      timeOfDayIcon: 'sunny' as keyof typeof Ionicons.glyphMap,
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      timeOfDay: 'Afternoon',
      timeOfDayIcon: 'partly-sunny' as keyof typeof Ionicons.glyphMap,
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      timeOfDay: 'Evening',
      timeOfDayIcon: 'moon' as keyof typeof Ionicons.glyphMap,
    };
  } else {
    return {
      timeOfDay: 'Night',
      timeOfDayIcon: 'moon' as keyof typeof Ionicons.glyphMap,
    };
  }
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    width: '100%',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  username: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
});
