/**
 * Quick Actions Card Component - Quick workout actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsCardProps {
  onStartWorkout?: () => void;
  onLogFood?: () => void;
  onAskAI?: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onStartWorkout,
  onLogFood,
  onAskAI,
}) => {
  const actions: QuickAction[] = [
    {
      id: 'start-workout',
      icon: 'flash',
      label: 'Start Workout',
      color: colors.primary,
      onPress: onStartWorkout || (() => console.log('Start Workout')),
    },
    {
      id: 'log-food',
      icon: 'leaf',
      label: 'Log Food',
      color: colors.tertiary,
      onPress: onLogFood || (() => console.log('Log Food')),
    },
    {
      id: 'ask-ai',
      icon: 'chatbubble',
      label: 'Ask AI',
      color: colors.secondary,
      onPress: onAskAI || (() => console.log('Ask AI')),
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          color={action.color}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
};

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  color,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
