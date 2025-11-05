/**
 * Welcome Header Component - Time-based greeting with AI icon
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, createColorWithOpacity } from '../../constants/colors';

interface WelcomeHeaderProps {
  username?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ username }) => {
  const { timeOfDay, timeOfDayIcon, gradientColors } = getTimeOfDay();
  const router = useRouter();

  const handleSettingsPress = () => {
    router.push('/settings' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.greetingRow}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.greetingBadge}
          >
            <Ionicons name={timeOfDayIcon} size={20} color={colors.text} />
            <Text style={styles.greeting}>Good {timeOfDay}</Text>
          </LinearGradient>
        </View>
        {username && (
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>Welcome back, </Text>
            <Text style={styles.usernameHighlight}>{username}!</Text>
          </View>
        )}
      </View>
      
      {/* Settings button - Gamified */}
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={handleSettingsPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[createColorWithOpacity(colors.primary, 0.8), createColorWithOpacity(colors.primary, 0.6)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.settingsGradient}
        >
          <Ionicons name="settings" size={18} color={colors.text} />
        </LinearGradient>
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
      gradientColors: [createColorWithOpacity('#FFD700', 0.3), createColorWithOpacity('#FFA500', 0.25)], // Softer golden
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      timeOfDay: 'Afternoon',
      timeOfDayIcon: 'partly-sunny' as keyof typeof Ionicons.glyphMap,
      gradientColors: [createColorWithOpacity('#4DD0E1', 0.3), createColorWithOpacity('#00897B', 0.25)], // Softer teal
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      timeOfDay: 'Evening',
      timeOfDayIcon: 'moon' as keyof typeof Ionicons.glyphMap,
      gradientColors: [createColorWithOpacity('#A78BFA', 0.3), createColorWithOpacity('#805AD5', 0.25)], // Softer purple
    };
  } else {
    return {
      timeOfDay: 'Night',
      timeOfDayIcon: 'moon' as keyof typeof Ionicons.glyphMap,
      gradientColors: [createColorWithOpacity('#6B7280', 0.3), createColorWithOpacity('#4B5563', 0.25)], // Softer grey
    };
  }
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  greetingRow: {
    marginBottom: 6,
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: colors.card, // Base background for gradient overlay
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  username: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  usernameHighlight: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  settingsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsGradient: {
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
