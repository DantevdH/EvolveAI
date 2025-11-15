/**
 * Insights Header Component - Clean header without gradient badge
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';

interface InsightsHeaderProps {
  username?: string;
}

export const InsightsHeader: React.FC<InsightsHeaderProps> = ({ username }) => {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Insights Dashboard</Text>
        {username && (
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>Welcome back, </Text>
            <Text style={styles.usernameHighlight}>{username}!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
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
});

