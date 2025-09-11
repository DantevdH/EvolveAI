/**
 * Welcome Header Component - Time-based greeting with AI icon
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';

interface WelcomeHeaderProps {
  username?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ username }) => {
  const { timeOfDay, timeOfDayIcon } = getTimeOfDay();
  const router = useRouter();

  const handleSettingsPress = () => {
    router.push('/settings' as any);
  };

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
      
      {/* Settings button */}
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={handleSettingsPress}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
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
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
});
