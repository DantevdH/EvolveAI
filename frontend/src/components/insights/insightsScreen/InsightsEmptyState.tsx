/**
 * Insights Empty State Component - Matching homepage style
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';

export const InsightsEmptyState: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.emptyCard}>
        <Ionicons name="analytics" size={64} color={colors.secondary} />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptyText}>
          Complete trainings to unlock your insights dashboard.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

